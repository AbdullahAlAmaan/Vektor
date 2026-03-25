import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { scoreContributorIssue } from '@vektor/recommendation/src/scorer';
import { computeMetrics } from './metrics';
import { EvaluationResult, ContributorFeatureProfile, IssueFeatureProfile } from '@vektor/shared';

export async function runEvaluation(
  prisma: PrismaClient,
  repoId?: string,
): Promise<Omit<EvaluationResult, 'id' | 'runAt'>> {
  // Allow targeting a specific repo; default to the largest one with closed issues
  const whereBase = {
    state: 'closed',
    assigneeId: { not: null },
    featureProfile: { isNot: null },
    ...(repoId ? { repoId } : {}),
  };

  const closedIssues = await prisma.issue.findMany({
    where: whereBase,
    include: { featureProfile: true },
    take: 500,
  });

  if (closedIssues.length === 0) {
    throw new Error('No closed issues with assignees found for evaluation.');
  }

  const targetRepoId = repoId ?? closedIssues[0].repoId;
  const runId = uuidv4();

  console.log(`[Eval] Scoring ${closedIssues.length} closed issues against all contributors...`);

  const contributorProfiles = await prisma.contributorFeatureProfile.findMany({
    where: { repoId: targetRepoId },
  });

  if (contributorProfiles.length === 0) {
    throw new Error('No contributor feature profiles found for this repo.');
  }

  console.log(`[Eval] ${contributorProfiles.length} contributor profiles loaded.`);

  // Pre-fetch workload (open issue count per contributor) — same signal used in live ranker
  const workloadRows = await prisma.issue.groupBy({
    by: ['assigneeId'],
    where: { repoId: targetRepoId, state: 'open', assigneeId: { not: null } },
    _count: { assigneeId: true },
  });
  const workloadMap = new Map<string, number>(
    workloadRows.map((w) => [w.assigneeId!, w._count.assigneeId]),
  );

  // Check whether pgvector embeddings are populated
  const embeddingCountResult = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) as cnt FROM "ContributorFeatureProfile"
    WHERE "repoId" = ${targetRepoId} AND embedding IS NOT NULL
  `;
  const hasEmbeddings = Number(embeddingCountResult[0]?.cnt ?? 0) > 0;
  console.log(`[Eval] Using ${hasEmbeddings ? 'pgvector embeddings' : 'no text similarity (embeddings not available)'} for text signal.`);

  const contributorIds = contributorProfiles.map((cp) => cp.contributorId);
  const rankings: Array<{ actualAssigneeId: string; rank: number | null }> = [];

  for (const issue of closedIssues) {
    const assigneeId = issue.assigneeId!;
    const issueProfile = issue.featureProfile as unknown as IssueFeatureProfile;

    // Get text similarities via pgvector for all contributors at once (one query per issue)
    let textSimMap = new Map<string, number>();
    if (hasEmbeddings) {
      try {
        const simRows = await prisma.$queryRaw<Array<{ contributor_id: string; sim: number }>>`
          WITH ie AS (
            SELECT embedding FROM "IssueFeatureProfile" WHERE "issueId" = ${issue.id}
          )
          SELECT cfp."contributorId" as contributor_id,
                 CASE WHEN ie.embedding IS NOT NULL AND cfp.embedding IS NOT NULL
                      THEN 1 - (cfp.embedding <=> ie.embedding)
                      ELSE 0 END as sim
          FROM "ContributorFeatureProfile" cfp, ie
          WHERE cfp."contributorId" = ANY(${contributorIds}::text[])
            AND cfp."repoId" = ${targetRepoId}
        `;
        textSimMap = new Map(simRows.map((r) => [r.contributor_id, r.sim]));
      } catch {
        // pgvector unavailable — fall through to 0
      }
    }

    const scored = contributorProfiles.map((cp) => {
      const profile = cp as unknown as ContributorFeatureProfile;
      const textSim = textSimMap.get(cp.contributorId) ?? 0;
      const openIssueCount = workloadMap.get(cp.contributorId) ?? 0;
      const breakdown = scoreContributorIssue(profile, issueProfile, issue.githubCreatedAt, textSim, openIssueCount);
      return { contributorId: cp.contributorId, score: breakdown.total };
    });

    scored.sort((a, b) => b.score - a.score);

    const idx = scored.findIndex((s) => s.contributorId === assigneeId);
    rankings.push({ actualAssigneeId: assigneeId, rank: idx >= 0 ? idx + 1 : null });
  }

  const metrics = computeMetrics(rankings);

  await prisma.evaluationResult.create({
    data: {
      repoId: targetRepoId,
      runId,
      ...metrics,
      sampleSize: closedIssues.length,
      modelVersion: 'v3',
    },
  });

  return { repoId: targetRepoId, runId, ...metrics, sampleSize: closedIssues.length, modelVersion: 'v3' };
}

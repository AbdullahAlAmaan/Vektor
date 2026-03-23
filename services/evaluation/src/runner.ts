import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { scoreContributorIssue } from '@vektor/recommendation/src/scorer';
import { computeMetrics } from './metrics';
import { EvaluationResult, ContributorFeatureProfile, IssueFeatureProfile } from '@vektor/shared';

export async function runEvaluation(
  prisma: PrismaClient,
): Promise<Omit<EvaluationResult, 'id' | 'runAt'>> {
  // Find closed issues with known assignees and feature profiles
  const closedIssues = await prisma.issue.findMany({
    where: {
      state: 'closed',
      assigneeId: { not: null },
      featureProfile: { isNot: null },
    },
    include: { featureProfile: true },
    take: 500,
  });

  if (closedIssues.length === 0) {
    throw new Error('No closed issues with assignees found for evaluation.');
  }

  const repoId = closedIssues[0].repoId;
  const runId = uuidv4();

  console.log(`[Eval] Scoring ${closedIssues.length} closed issues against all contributors...`);

  // Load all contributor profiles for this repo once (avoid N+1)
  const contributorProfiles = await prisma.contributorFeatureProfile.findMany({
    where: { repoId },
  });

  if (contributorProfiles.length === 0) {
    throw new Error('No contributor feature profiles found for this repo.');
  }

  console.log(`[Eval] ${contributorProfiles.length} contributor profiles loaded.`);

  const rankings: Array<{ actualAssigneeId: string; rank: number | null }> = [];

  for (const issue of closedIssues) {
    const assigneeId = issue.assigneeId!;
    const issueProfile = issue.featureProfile as unknown as IssueFeatureProfile;

    // Score every contributor against this closed issue directly (no open/closed filter)
    const scored = contributorProfiles.map((cp) => {
      const profile = cp as unknown as ContributorFeatureProfile;
      const breakdown = scoreContributorIssue(profile, issueProfile, issue.githubCreatedAt);
      return { contributorId: cp.contributorId, score: breakdown.total };
    });

    scored.sort((a, b) => b.score - a.score);

    const idx = scored.findIndex((s) => s.contributorId === assigneeId);
    const rank = idx >= 0 ? idx + 1 : null;

    rankings.push({ actualAssigneeId: assigneeId, rank });
  }

  const metrics = computeMetrics(rankings);

  // Persist result
  await prisma.evaluationResult.create({
    data: {
      repoId,
      runId,
      ...metrics,
      sampleSize: closedIssues.length,
      modelVersion: 'v1',
    },
  });

  return { repoId, runId, ...metrics, sampleSize: closedIssues.length, modelVersion: 'v1' };
}

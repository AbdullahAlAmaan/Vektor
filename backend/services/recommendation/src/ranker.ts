import { PrismaClient } from '@prisma/client';
import {
  RankedIssue,
  RankedContributor,
  ContributorFeatureProfile,
  IssueFeatureProfile,
  env,
} from '@vektor/shared';
import { scoreContributorIssue } from './scorer';
import { batchTfidfSimilarity, buildContributorText, buildIssueText } from './ml-client';
import { batchEmbeddings, vectorSimilarity } from './embed-client';

export type Difficulty = 'easy' | 'medium' | 'hard';

export function getRanker(prisma: PrismaClient) {
  return {
    /**
     * Given a contributor, rank open issues they are best qualified to work on.
     * Optional difficulty filter limits issues to a given complexity level.
     */
    async getRecommendations(
      contributorId: string,
      repoId: string,
      topN = env.RECOMMENDATION_TOP_N,
      difficulty?: Difficulty,
    ): Promise<RankedIssue[]> {
      const contributorProfile = await prisma.contributorFeatureProfile.findUnique({
        where: { contributorId_repoId: { contributorId, repoId } },
      });
      if (!contributorProfile) return [];

      const whereClause = {
        repoId,
        state: 'open' as const,
        featureProfile: {
          isNot: null,
          ...(difficulty ? { is: { complexityHint: difficulty } } : {}),
        },
      };

      const issues = await prisma.issue.findMany({
        where: whereClause,
        include: { featureProfile: true },
      });

      const scorableIssues = issues.filter((i) => i.featureProfile !== null);
      if (scorableIssues.length === 0) return [];

      // --- Text similarity: try vector embeddings first, fall back to TF-IDF ---
      const textSimilarities = await resolveTextSimilarities(
        prisma,
        contributorProfile.contributorId,
        repoId,
        scorableIssues.map((i) => ({ id: i.id, title: i.title, body: i.body })),
      );

      // Workload: count open issues currently assigned to this contributor
      const openIssueCount = await prisma.issue.count({
        where: { repoId, state: 'open', assigneeId: contributorId },
      });

      const profile = contributorProfile as unknown as ContributorFeatureProfile;

      const scored: RankedIssue[] = scorableIssues.map((issue, i) => {
        const featureProfile = issue.featureProfile as unknown as IssueFeatureProfile;
        const breakdown = scoreContributorIssue(
          profile,
          featureProfile,
          issue.githubCreatedAt,
          textSimilarities[i] ?? 0,
          openIssueCount,
        );
        return {
          issueId: issue.id,
          complexityHint: issue.featureProfile?.complexityHint ?? null,
          score: breakdown.total,
          breakdown: {
            domainMatch: breakdown.domainMatch,
            labelAffinityMatch: breakdown.labelAffinityMatch,
            textSimilarity: breakdown.textSimilarity,
            recencyAlignment: breakdown.recencyAlignment,
            freshnessBonous: breakdown.freshnessBonous,
            workloadPenalty: breakdown.workloadPenalty,
          },
        };
      });

      return scored.sort((a, b) => b.score - a.score).slice(0, topN);
    },

    /**
     * Given an open issue, rank contributors most qualified to work on it.
     */
    async getIssueContributors(
      issueId: string,
      repoId: string,
      topN = env.RECOMMENDATION_TOP_N,
    ): Promise<RankedContributor[]> {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        include: { featureProfile: true },
      });
      if (!issue || !issue.featureProfile) return [];

      const contributorProfiles = await prisma.contributorFeatureProfile.findMany({
        where: { repoId },
      });
      if (contributorProfiles.length === 0) return [];

      // --- Text similarity: try vector embeddings first, fall back to TF-IDF ---
      const textSimilarities = await resolveIssueSideSimilarities(
        prisma,
        issue,
        repoId,
        contributorProfiles.map((cp) => cp.contributorId),
      );

      // Workload per contributor
      const workloadCounts = await prisma.issue.groupBy({
        by: ['assigneeId'],
        where: { repoId, state: 'open', assigneeId: { not: null } },
        _count: { assigneeId: true },
      });
      const workloadMap = new Map<string, number>(
        workloadCounts.map((w) => [w.assigneeId!, w._count.assigneeId]),
      );

      const issueProfile = issue.featureProfile as unknown as IssueFeatureProfile;

      const scored: RankedContributor[] = contributorProfiles.map((cp, i) => {
        const profile = cp as unknown as ContributorFeatureProfile;
        const openIssueCount = workloadMap.get(cp.contributorId) ?? 0;
        const breakdown = scoreContributorIssue(
          profile,
          issueProfile,
          issue.githubCreatedAt,
          textSimilarities[i] ?? 0,
          openIssueCount,
        );
        return {
          contributorId: cp.contributorId,
          score: breakdown.total,
          breakdown: {
            domainMatch: breakdown.domainMatch,
            labelAffinityMatch: breakdown.labelAffinityMatch,
            textSimilarity: breakdown.textSimilarity,
            recencyAlignment: breakdown.recencyAlignment,
            freshnessBonous: breakdown.freshnessBonous,
            workloadPenalty: breakdown.workloadPenalty,
          },
        };
      });

      return scored.sort((a, b) => b.score - a.score).slice(0, topN);
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers — resolve text similarities using pgvector if available, else TF-IDF
// ---------------------------------------------------------------------------

/**
 * Contributor → Issues direction.
 * Returns similarity[i] for scorableIssues[i].
 */
async function resolveTextSimilarities(
  prisma: PrismaClient,
  contributorId: string,
  repoId: string,
  issues: Array<{ id: string; title: string; body: string | null }>,
): Promise<number[]> {
  // Try pgvector path: fetch contributor embedding
  const contributorProfile = await prisma.contributorFeatureProfile.findUnique({
    where: { contributorId_repoId: { contributorId, repoId } },
    select: { id: true },
  });

  if (contributorProfile) {
    const result = await prisma.$queryRaw<Array<{ has_embedding: boolean }>>`
      SELECT (embedding IS NOT NULL) as has_embedding
      FROM "ContributorFeatureProfile"
      WHERE "contributorId" = ${contributorId} AND "repoId" = ${repoId}
    `;
    const hasEmbedding = result[0]?.has_embedding ?? false;

    if (hasEmbedding) {
      // Use pgvector cosine similarity for all issues at once
      const issueIds = issues.map((i) => i.id);
      const similarities = await getVectorSimilarities(prisma, contributorId, repoId, issueIds);
      if (similarities !== null) return similarities;
    }
  }

  // Fall back to TF-IDF batch call
  const commits = await prisma.commit.findMany({
    where: { contributorId, repoId },
    select: { message: true },
    orderBy: { committedAt: 'desc' },
    take: 200,
  });
  const contributorText = buildContributorText(commits.map((c) => c.message));
  const issueTexts = issues.map((i) => buildIssueText(i.title, i.body));
  return batchTfidfSimilarity(contributorText, issueTexts);
}

/**
 * Issue → Contributors direction.
 * Uses cosine symmetry: sim(contributor, issue) == sim(issue, contributor).
 */
async function resolveIssueSideSimilarities(
  prisma: PrismaClient,
  issue: { id: string; title: string; body: string | null },
  repoId: string,
  contributorIds: string[],
): Promise<number[]> {
  // Check if any contributor in this repo has embeddings
  const countResult = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) as cnt FROM "ContributorFeatureProfile"
    WHERE "repoId" = ${repoId} AND embedding IS NOT NULL
  `;
  const embeddingCount = Number(countResult[0]?.cnt ?? 0);

  if (embeddingCount > 0) {
    const sims = await getIssueSideVectorSimilarities(prisma, issue.id, repoId, contributorIds);
    if (sims !== null) return sims;
  }

  // Fall back to TF-IDF batch (issue text as "contributor", contributor corpora as "issues")
  const allCommits = await prisma.commit.findMany({
    where: { repoId },
    select: { contributorId: true, message: true },
    orderBy: { committedAt: 'desc' },
  });
  const corpusMap = new Map<string, string[]>();
  for (const c of allCommits) {
    const msgs = corpusMap.get(c.contributorId) ?? [];
    if (msgs.length < 200) { msgs.push(c.message); corpusMap.set(c.contributorId, msgs); }
  }
  const issueText = buildIssueText(issue.title, issue.body);
  const contributorTexts = contributorIds.map((id) =>
    buildContributorText(corpusMap.get(id) ?? []),
  );
  return batchTfidfSimilarity(issueText, contributorTexts);
}

/** pgvector: for a contributor embedding, get cosine similarity against all issue embeddings. */
async function getVectorSimilarities(
  prisma: PrismaClient,
  contributorId: string,
  repoId: string,
  issueIds: string[],
): Promise<number[] | null> {
  if (issueIds.length === 0) return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ issue_id: string; similarity: number }>>`
      WITH contrib_emb AS (
        SELECT embedding FROM "ContributorFeatureProfile"
        WHERE "contributorId" = ${contributorId} AND "repoId" = ${repoId}
        LIMIT 1
      )
      SELECT ifp."issueId" as issue_id,
             1 - (ifp.embedding <=> (SELECT embedding FROM contrib_emb)) AS similarity
      FROM "IssueFeatureProfile" ifp
      WHERE ifp."issueId" = ANY(${issueIds}::text[])
        AND ifp.embedding IS NOT NULL
    `;
    if (rows.length === 0) return null;

    const simMap = new Map(rows.map((r) => [r.issue_id, r.similarity]));
    return issueIds.map((id) => simMap.get(id) ?? 0);
  } catch {
    return null; // pgvector not set up yet — fall through to TF-IDF
  }
}

/** pgvector: for an issue embedding, get cosine similarity against all contributor embeddings. */
async function getIssueSideVectorSimilarities(
  prisma: PrismaClient,
  issueId: string,
  repoId: string,
  contributorIds: string[],
): Promise<number[] | null> {
  if (contributorIds.length === 0) return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ contributor_id: string; similarity: number }>>`
      WITH issue_emb AS (
        SELECT embedding FROM "IssueFeatureProfile"
        WHERE "issueId" = ${issueId}
        LIMIT 1
      )
      SELECT cfp."contributorId" as contributor_id,
             1 - (cfp.embedding <=> (SELECT embedding FROM issue_emb)) AS similarity
      FROM "ContributorFeatureProfile" cfp
      WHERE cfp."contributorId" = ANY(${contributorIds}::text[])
        AND cfp."repoId" = ${repoId}
        AND cfp.embedding IS NOT NULL
    `;
    if (rows.length === 0) return null;

    const simMap = new Map(rows.map((r) => [r.contributor_id, r.similarity]));
    return contributorIds.map((id) => simMap.get(id) ?? 0);
  } catch {
    return null;
  }
}

// Placeholder for vectorSimilarity export used by embed-client
export { vectorSimilarity };

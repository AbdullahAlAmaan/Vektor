import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getRanker } from '@vektor/recommendation/src/ranker';
import { computeMetrics } from './metrics';
import { EvaluationResult } from '@vektor/shared';

export async function runEvaluation(prisma: PrismaClient): Promise<Omit<EvaluationResult, 'id' | 'runAt'>> {
  const ranker = getRanker(prisma);

  // Find closed issues with known assignees
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

  // For each issue, hide the assignee and ask the ranker who should be assigned
  const rankings: Array<{ actualAssigneeId: string; rank: number | null }> = [];

  for (const issue of closedIssues) {
    const assigneeId = issue.assigneeId!;

    // Get all contributors who have profiles in this repo
    const contributors = await prisma.contributorFeatureProfile.findMany({
      where: { repoId },
      select: { contributorId: true },
    });

    let rank: number | null = null;
    let position = 1;

    // Score all contributors for this issue using the ranker's scorer
    const scored: Array<{ contributorId: string; score: number }> = [];
    for (const { contributorId } of contributors) {
      const recs = await ranker.getRecommendations(contributorId, repoId, contributors.length);
      const match = recs.find((r) => r.issueId === issue.id);
      if (match) {
        scored.push({ contributorId, score: match.score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const idx = scored.findIndex((s) => s.contributorId === assigneeId);
    rank = idx >= 0 ? idx + 1 : null;

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

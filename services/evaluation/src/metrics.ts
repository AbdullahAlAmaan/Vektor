interface RankingResult {
  actualAssigneeId: string;
  rank: number | null;
}

interface Metrics {
  top1Accuracy: number;
  top3Accuracy: number;
  top5HitRate: number;
  mrr: number;
}

export function computeMetrics(rankings: RankingResult[]): Metrics {
  const n = rankings.length;
  if (n === 0) {
    return { top1Accuracy: 0, top3Accuracy: 0, top5HitRate: 0, mrr: 0 };
  }

  let top1 = 0;
  let top3 = 0;
  let top5 = 0;
  let reciprocalRankSum = 0;

  for (const { rank } of rankings) {
    if (rank === null) continue;
    if (rank === 1) top1++;
    if (rank <= 3) top3++;
    if (rank <= 5) top5++;
    reciprocalRankSum += 1 / rank;
  }

  return {
    top1Accuracy: top1 / n,
    top3Accuracy: top3 / n,
    top5HitRate: top5 / n,
    mrr: reciprocalRankSum / n,
  };
}

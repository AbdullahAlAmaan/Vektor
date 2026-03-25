import {
  ContributorFeatureProfile,
  IssueFeatureProfile,
  RankedIssue,
  cosineSimilarity,
  dotProduct,
  recencyAlignment,
  freshnessBonus,
} from '@vektor/shared';

// Scoring weights (v3 — full 1.00 with TF-IDF + workload penalty)
const WEIGHTS = {
  DOMAIN_MATCH: 0.35,
  LABEL_AFFINITY: 0.25,
  TEXT_SIMILARITY: 0.20,
  RECENCY_ALIGNMENT: 0.15,
  FRESHNESS_BONUS: 0.05,
} as const;

// Workload: penalise contributors with many open assigned issues.
// 5 open issues → 20% score reduction; 10+ → 40% (hard cap).
const MAX_WORKLOAD = 10;
const WORKLOAD_PENALTY_PER_ISSUE = 0.04; // 4% per open issue
const MAX_WORKLOAD_PENALTY = 0.40;       // cap at 40%

export function scoreContributorIssue(
  contributor: ContributorFeatureProfile,
  issue: IssueFeatureProfile,
  issueCreatedAt: Date,
  textSimilarity = 0,
  openIssueCount = 0,
): RankedIssue['breakdown'] & { total: number } {
  const domainMatch = cosineSimilarity(contributor.domainScores, issue.domainTags as Record<string, number>);
  const labelAffinityMatch = dotProduct(contributor.labelAffinity, issue.labelVector as Record<string, number>);
  const recency = recencyAlignment(contributor.recencyScore, issueCreatedAt);
  const freshness = freshnessBonus(issueCreatedAt);

  const rawScore =
    WEIGHTS.DOMAIN_MATCH * domainMatch +
    WEIGHTS.LABEL_AFFINITY * Math.min(labelAffinityMatch, 1) +
    WEIGHTS.TEXT_SIMILARITY * Math.max(0, textSimilarity) +
    WEIGHTS.RECENCY_ALIGNMENT * recency +
    WEIGHTS.FRESHNESS_BONUS * freshness;

  // Workload penalty: applied multiplicatively so it never inverts rankings among similar contributors
  const workloadPenalty = Math.min(
    openIssueCount * WORKLOAD_PENALTY_PER_ISSUE,
    MAX_WORKLOAD_PENALTY,
  );
  const total = rawScore * (1 - workloadPenalty);

  return {
    domainMatch,
    labelAffinityMatch,
    textSimilarity,
    recencyAlignment: recency,
    freshnessBonous: freshness,
    workloadPenalty,
    total,
  };
}

import {
  ContributorFeatureProfile,
  IssueFeatureProfile,
  RankedIssue,
  cosineSimilarity,
  dotProduct,
  recencyAlignment,
  freshnessBonus,
} from '@vektor/shared';

// Scoring weights (v1)
const WEIGHTS = {
  DOMAIN_MATCH: 0.35,
  LABEL_AFFINITY: 0.25,
  // text_similarity: 0.20 — deferred to Phase 2
  RECENCY_ALIGNMENT: 0.15,
  FRESHNESS_BONUS: 0.05,
} as const;

export function scoreContributorIssue(
  contributor: ContributorFeatureProfile,
  issue: IssueFeatureProfile,
  issueCreatedAt: Date,
): RankedIssue['breakdown'] & { total: number } {
  const domainMatch = cosineSimilarity(contributor.domainScores, issue.domainTags as Record<string, number>);
  const labelAffinityMatch = dotProduct(contributor.labelAffinity, issue.labelVector as Record<string, number>);
  const recency = recencyAlignment(contributor.recencyScore, issueCreatedAt);
  const freshness = freshnessBonus(issueCreatedAt);

  const total =
    WEIGHTS.DOMAIN_MATCH * domainMatch +
    WEIGHTS.LABEL_AFFINITY * Math.min(labelAffinityMatch, 1) +
    WEIGHTS.RECENCY_ALIGNMENT * recency +
    WEIGHTS.FRESHNESS_BONUS * freshness;

  return {
    domainMatch,
    labelAffinityMatch,
    recencyAlignment: recency,
    freshnessBonous: freshness,
    total,
  };
}

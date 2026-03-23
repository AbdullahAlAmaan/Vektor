import { PrismaClient } from '@prisma/client';
import { RankedIssue, ContributorFeatureProfile, IssueFeatureProfile, env } from '@vektor/shared';
import { scoreContributorIssue } from './scorer';

export function getRanker(prisma: PrismaClient) {
  return {
    async getRecommendations(
      contributorId: string,
      repoId: string,
      topN = env.RECOMMENDATION_TOP_N,
    ): Promise<RankedIssue[]> {
      // Fetch contributor feature profile
      const contributorProfile = await prisma.contributorFeatureProfile.findUnique({
        where: { contributorId_repoId: { contributorId, repoId } },
      });

      if (!contributorProfile) {
        return [];
      }

      // Fetch open issues with feature profiles
      const issues = await prisma.issue.findMany({
        where: { repoId, state: 'open' },
        include: { featureProfile: true },
      });

      const profile = contributorProfile as unknown as ContributorFeatureProfile;

      // Score each issue
      const scored: RankedIssue[] = issues
        .filter((issue) => issue.featureProfile !== null)
        .map((issue) => {
          const featureProfile = issue.featureProfile as unknown as IssueFeatureProfile;
          const breakdown = scoreContributorIssue(profile, featureProfile, issue.githubCreatedAt);

          return {
            issueId: issue.id,
            score: breakdown.total,
            breakdown: {
              domainMatch: breakdown.domainMatch,
              labelAffinityMatch: breakdown.labelAffinityMatch,
              recencyAlignment: breakdown.recencyAlignment,
              freshnessBonous: breakdown.freshnessBonous,
            },
          };
        });

      // Sort descending by score, return top N
      return scored.sort((a, b) => b.score - a.score).slice(0, topN);
    },
  };
}

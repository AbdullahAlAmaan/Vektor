import { getRedisClient, CACHE_KEYS, CACHE_TTL } from '@vektor/shared';
import { RankedIssue, RankedContributor } from '@vektor/shared';

// --- Contributor → Issue recommendations ---

export async function getCachedRecommendations(
  contributorId: string,
  repoId: string,
): Promise<RankedIssue[] | null> {
  const redis = getRedisClient();
  try {
    const key = CACHE_KEYS.recommendations(contributorId, repoId);
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as RankedIssue[];
  } catch (err) {
    console.error('[Cache] Redis GET error:', err);
    return null;
  }
}

export async function setCachedRecommendations(
  contributorId: string,
  repoId: string,
  recommendations: RankedIssue[],
): Promise<void> {
  const redis = getRedisClient();
  try {
    const key = CACHE_KEYS.recommendations(contributorId, repoId);
    await redis.setex(key, CACHE_TTL.RECOMMENDATIONS, JSON.stringify(recommendations));
  } catch (err) {
    console.error('[Cache] Redis SETEX error:', err);
  }
}

export async function invalidateCache(contributorId: string, repoId: string): Promise<void> {
  const redis = getRedisClient();
  try {
    const key = CACHE_KEYS.recommendations(contributorId, repoId);
    await redis.del(key);
  } catch (err) {
    console.error('[Cache] Redis DEL error:', err);
  }
}

// --- Issue → Contributor recommendations (Phase 3) ---

export async function getCachedIssueRecommendations(
  issueId: string,
): Promise<RankedContributor[] | null> {
  const redis = getRedisClient();
  try {
    const key = CACHE_KEYS.issueRecommendations(issueId);
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as RankedContributor[];
  } catch (err) {
    console.error('[Cache] Redis GET error:', err);
    return null;
  }
}

export async function setCachedIssueRecommendations(
  issueId: string,
  contributors: RankedContributor[],
): Promise<void> {
  const redis = getRedisClient();
  try {
    const key = CACHE_KEYS.issueRecommendations(issueId);
    await redis.setex(key, CACHE_TTL.ISSUE_RECOMMENDATIONS, JSON.stringify(contributors));
  } catch (err) {
    console.error('[Cache] Redis SETEX error:', err);
  }
}

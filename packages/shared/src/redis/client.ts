import Redis from 'ioredis';
import { env } from '../config/env';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redisInstance.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
  }
  return redisInstance;
}

export const CACHE_KEYS = {
  recommendations: (contributorId: string, repoId: string) =>
    `recommendations:${contributorId}:${repoId}`,
  contributorProfile: (contributorId: string) =>
    `contributor-profile:${contributorId}`,
} as const;

export const CACHE_TTL = {
  RECOMMENDATIONS: 3600,  // 1 hour
  CONTRIBUTOR_PROFILE: 900, // 15 minutes
} as const;

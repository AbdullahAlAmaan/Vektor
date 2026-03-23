import { v4 as uuidv4 } from 'uuid';
import { ContributorEvent } from '@vektor/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeContributor(raw: any, repoId: string): ContributorEvent {
  return {
    eventId: uuidv4(),
    repoId,
    eventType: 'contributor.upserted',
    timestamp: new Date().toISOString(),
    version: 'v1',
    githubUserId: raw.id,
    username: raw.login,
    displayName: raw.name ?? null,
    avatarUrl: raw.avatar_url ?? null,
  };
}

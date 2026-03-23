import { v4 as uuidv4 } from 'uuid';
import { CommitEvent } from '@vektor/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeCommit(raw: any, repoId: string): CommitEvent {
  return {
    eventId: uuidv4(),
    repoId,
    eventType: 'commit.created',
    timestamp: new Date().toISOString(),
    version: 'v1',
    sha: raw.sha,
    contributorId: raw.author?.login ?? raw.commit?.author?.email ?? 'unknown',
    filesChanged: raw.files?.map((f: { filename: string }) => f.filename) ?? [],
    message: raw.commit?.message ?? '',
    additions: raw.stats?.additions ?? 0,
    deletions: raw.stats?.deletions ?? 0,
    committedAt: raw.commit?.author?.date ?? new Date().toISOString(),
  };
}

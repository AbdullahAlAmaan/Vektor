import { v4 as uuidv4 } from 'uuid';
import { PullRequestEvent } from '@vektor/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePullRequest(raw: any, repoId: string): PullRequestEvent {
  const state = raw.merged_at ? 'merged' : raw.state === 'open' ? 'open' : 'closed';
  return {
    eventId: uuidv4(),
    repoId,
    eventType: 'pr.upserted',
    timestamp: new Date().toISOString(),
    version: 'v1',
    githubId: raw.id,
    contributorId: raw.user?.login ?? 'unknown',
    title: raw.title,
    body: raw.body ?? null,
    state,
    labels: raw.labels?.map((l: { name: string }) => l.name) ?? [],
    filesChanged: raw.files?.map((f: { filename: string }) => f.filename) ?? [],
    mergedAt: raw.merged_at ?? null,
    createdAt: raw.created_at,
  };
}

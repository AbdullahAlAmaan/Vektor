import { v4 as uuidv4 } from 'uuid';
import { IssueEvent } from '@vektor/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeIssue(raw: any, repoId: string): IssueEvent {
  return {
    eventId: uuidv4(),
    repoId,
    eventType: 'issue.upserted',
    timestamp: new Date().toISOString(),
    version: 'v1',
    githubId: raw.id,
    title: raw.title,
    body: raw.body ?? null,
    state: raw.state === 'open' ? 'open' : 'closed',
    labels: raw.labels?.map((l: { name: string }) => l.name) ?? [],
    assigneeId: raw.assignee?.login ?? null,
    number: raw.number,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

import { z } from 'zod';
import { BaseEventSchema } from './base-event.schema';

export const PullRequestEventSchema = BaseEventSchema.extend({
  eventType: z.literal('pr.upserted'),
  githubId: z.number().int(),
  contributorId: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed', 'merged']),
  labels: z.array(z.string()),
  filesChanged: z.array(z.string()),
  mergedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type PullRequestEvent = z.infer<typeof PullRequestEventSchema>;

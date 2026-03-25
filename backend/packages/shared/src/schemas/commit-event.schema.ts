import { z } from 'zod';
import { BaseEventSchema } from './base-event.schema';

export const CommitEventSchema = BaseEventSchema.extend({
  eventType: z.literal('commit.created'),
  sha: z.string(),
  contributorId: z.string(),
  filesChanged: z.array(z.string()),
  message: z.string(),
  additions: z.number().int(),
  deletions: z.number().int(),
  committedAt: z.string().datetime(),
});

export type CommitEvent = z.infer<typeof CommitEventSchema>;

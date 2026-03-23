import { z } from 'zod';
import { BaseEventSchema } from './base-event.schema';

export const IssueEventSchema = BaseEventSchema.extend({
  eventType: z.literal('issue.upserted'),
  githubId: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  labels: z.array(z.string()),
  assigneeId: z.string().nullable(),
  number: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IssueEvent = z.infer<typeof IssueEventSchema>;

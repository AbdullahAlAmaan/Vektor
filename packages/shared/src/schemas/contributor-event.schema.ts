import { z } from 'zod';
import { BaseEventSchema } from './base-event.schema';

export const ContributorEventSchema = BaseEventSchema.extend({
  eventType: z.literal('contributor.upserted'),
  githubUserId: z.number().int(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export type ContributorEvent = z.infer<typeof ContributorEventSchema>;

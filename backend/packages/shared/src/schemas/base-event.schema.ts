import { z } from 'zod';

export const BaseEventSchema = z.object({
  eventId: z.string().uuid(),
  repoId: z.string(),
  eventType: z.string(),
  timestamp: z.string().datetime(),
  version: z.literal('v1'),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

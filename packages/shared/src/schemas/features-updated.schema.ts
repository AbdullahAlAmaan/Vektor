import { z } from 'zod';
import { BaseEventSchema } from './base-event.schema';

export const FeaturesUpdatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('features.updated'),
  contributorId: z.string(),
  profileType: z.enum(['contributor', 'issue']),
  entityId: z.string(),
});

export type FeaturesUpdatedEvent = z.infer<typeof FeaturesUpdatedEventSchema>;

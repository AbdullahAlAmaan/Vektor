import { PrismaClient } from '@prisma/client';
import { getKafkaClient, TOPICS } from '@vektor/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Publishes a features.updated event after a profile is updated.
 */
export async function publishFeaturesUpdated(
  contributorId: string,
  repoId: string,
  entityId: string,
  profileType: 'contributor' | 'issue',
): Promise<void> {
  const kafka = getKafkaClient();
  const producer = kafka.producer();
  await producer.connect();

  const event = {
    eventId: uuidv4(),
    repoId,
    eventType: 'features.updated',
    timestamp: new Date().toISOString(),
    version: 'v1',
    contributorId,
    profileType,
    entityId,
  };

  await producer.send({
    topic: TOPICS.FEATURES_UPDATED,
    acks: -1,
    messages: [{ key: contributorId, value: JSON.stringify(event) }],
  });

  await producer.disconnect();
}

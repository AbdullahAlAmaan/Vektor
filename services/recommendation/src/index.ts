import { getKafkaClient, TOPICS, env } from '@vektor/shared';
import { FeaturesUpdatedEventSchema } from '@vektor/shared';
import { PrismaClient } from '@prisma/client';
import { getRanker } from './ranker';
import { invalidateCache } from './cache';

const prisma = new PrismaClient();

async function main() {
  console.log('[Recommendation] Starting...');
  const kafka = getKafkaClient();
  const consumer = kafka.consumer({ groupId: env.KAFKA_GROUP_ID_RECOMMEND });

  await consumer.connect();
  await consumer.subscribe({ topics: [TOPICS.FEATURES_UPDATED], fromBeginning: false });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const raw = message.value?.toString();
      if (!raw) return;

      try {
        const event = FeaturesUpdatedEventSchema.parse(JSON.parse(raw) as unknown);

        if (event.profileType === 'contributor') {
          // Invalidate stale cache so next API request recomputes
          await invalidateCache(event.contributorId, event.repoId);
        }

        await consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      } catch (err) {
        console.error('[Recommendation] Failed to process features.updated event:', err);
      }
    },
  });
}

main().catch((err) => {
  console.error('[Recommendation] Fatal error:', err);
  process.exit(1);
});

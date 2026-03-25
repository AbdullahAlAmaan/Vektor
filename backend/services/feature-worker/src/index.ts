import { getKafkaClient, TOPICS, env } from '@vektor/shared';
import { PrismaClient } from '@prisma/client';
import { handleCommitEvent } from './handlers/commit.handler';
import { handleIssueEvent } from './handlers/issue.handler';
import { handlePullRequestEvent } from './handlers/pr.handler';
import { handleContributorEvent } from './handlers/contributor.handler';
import { CommitEventSchema, IssueEventSchema, PullRequestEventSchema, ContributorEventSchema } from '@vektor/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('[FeatureWorker] Starting...');
  const kafka = getKafkaClient();
  const consumer = kafka.consumer({ groupId: env.KAFKA_GROUP_ID_FEATURE });

  await consumer.connect();
  await consumer.subscribe({
    topics: [TOPICS.COMMITS, TOPICS.ISSUES, TOPICS.PULL_REQUESTS, TOPICS.CONTRIBUTORS],
    fromBeginning: true,
  });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message, heartbeat }) => {
      const raw = message.value?.toString();
      if (!raw) return;

      try {
        const payload = JSON.parse(raw) as unknown;

        if (topic === TOPICS.CONTRIBUTORS) {
          const event = ContributorEventSchema.parse(payload);
          await handleContributorEvent(prisma, event);
        } else if (topic === TOPICS.COMMITS) {
          const event = CommitEventSchema.parse(payload);
          await handleCommitEvent(prisma, event);
        } else if (topic === TOPICS.ISSUES) {
          const event = IssueEventSchema.parse(payload);
          await handleIssueEvent(prisma, event);
        } else if (topic === TOPICS.PULL_REQUESTS) {
          const event = PullRequestEventSchema.parse(payload);
          await handlePullRequestEvent(prisma, event);
        }

        await consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      } catch (err) {
        // A bad message must not kill the consumer — log and continue
        console.error(`[FeatureWorker] Failed to process message from ${topic}:`, err);
      }

      await heartbeat();
    },
  });
}

main().catch((err) => {
  console.error('[FeatureWorker] Fatal error:', err);
  process.exit(1);
});

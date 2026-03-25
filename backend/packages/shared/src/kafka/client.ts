import { Kafka, KafkaConfig } from 'kafkajs';
import { env } from '../config/env';

let kafkaInstance: Kafka | null = null;

export function getKafkaClient(): Kafka {
  if (!kafkaInstance) {
    const config: KafkaConfig = {
      clientId: env.KAFKA_CLIENT_ID,
      brokers: env.KAFKA_BROKERS.split(','),
    };
    kafkaInstance = new Kafka(config);
  }
  return kafkaInstance;
}

export const TOPICS = {
  COMMITS: 'github.commits',
  ISSUES: 'github.issues',
  PULL_REQUESTS: 'github.pull_requests',
  CONTRIBUTORS: 'github.contributors',
  FEATURES_UPDATED: 'features.updated',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

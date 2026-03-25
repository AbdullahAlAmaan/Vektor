import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { getKafkaClient, TopicName } from '@vektor/shared';
import { z } from 'zod';

export interface Publisher {
  publish(topic: TopicName, event: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
}

export async function createPublisher(): Promise<Publisher> {
  const kafka: Kafka = getKafkaClient();
  const producer: Producer = kafka.producer({
    allowAutoTopicCreation: false,
  });

  await producer.connect();

  return {
    async publish(topic: TopicName, event: Record<string, unknown>): Promise<void> {
      await producer.send({
        topic,
        acks: -1, // acks: 'all'
        compression: CompressionTypes.GZIP,
        messages: [
          {
            key: event['repoId'] as string,
            value: JSON.stringify(event),
          },
        ],
      });
    },

    async disconnect(): Promise<void> {
      await producer.disconnect();
    },
  };
}

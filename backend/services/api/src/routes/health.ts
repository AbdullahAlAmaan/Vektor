import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getRedisClient, getKafkaClient } from '@vektor/shared';

interface HealthPluginOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function healthRoutes(
  app: FastifyInstance,
  opts: HealthPluginOptions,
): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const checks: Record<string, string> = {};

    // Check DB
    try {
      await opts.prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch {
      checks.db = 'error';
    }

    // Check Redis
    try {
      const redis = getRedisClient();
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    // Check Kafka
    try {
      const kafka = getKafkaClient();
      const admin = kafka.admin();
      await admin.connect();
      await admin.disconnect();
      checks.kafka = 'ok';
    } catch {
      checks.kafka = 'error';
    }

    const status = Object.values(checks).every((v) => v === 'ok') ? 'ok' : 'degraded';
    return reply.status(status === 'ok' ? 200 : 503).send({ status, checks });
  });
}

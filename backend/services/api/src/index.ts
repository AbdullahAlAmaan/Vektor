import Fastify from 'fastify';
import { env } from '@vektor/shared';
import { PrismaClient } from '@prisma/client';
import { contributorsRoutes } from './routes/contributors';
import { reposRoutes } from './routes/repos';
import { healthRoutes } from './routes/health';
import { evaluationRoutes } from './routes/evaluation';
import { issuesRoutes } from './routes/issues';
import { errorHandler } from './middleware/error-handler';

const prisma = new PrismaClient();

// Teach JSON to serialize BigInt as number
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

async function buildServer() {
  const app = Fastify({ logger: true });

  // CORS — allow all origins (dashboard on different port)
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
  });
  app.options('*', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    return reply.status(204).send();
  });

  app.setErrorHandler(errorHandler);

  await app.register(contributorsRoutes, { prisma, prefix: '/contributors' });
  await app.register(reposRoutes, { prisma, prefix: '/repos' });
  await app.register(healthRoutes, { prisma });
  await app.register(evaluationRoutes, { prisma, prefix: '/evaluation' });
  await app.register(issuesRoutes, { prisma, prefix: '/issues' });

  return app;
}

async function main() {
  const app = await buildServer();
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  console.log(`[API] Listening on ${env.API_HOST}:${env.API_PORT}`);
}

main().catch((err) => {
  console.error('[API] Fatal error:', err);
  process.exit(1);
});

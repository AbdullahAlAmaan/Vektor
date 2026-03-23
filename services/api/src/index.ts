import Fastify from 'fastify';
import { env } from '@vektor/shared';
import { PrismaClient } from '@prisma/client';
import { contributorsRoutes } from './routes/contributors';
import { reposRoutes } from './routes/repos';
import { healthRoutes } from './routes/health';
import { errorHandler } from './middleware/error-handler';

const prisma = new PrismaClient();

async function buildServer() {
  const app = Fastify({ logger: true });

  app.setErrorHandler(errorHandler);

  await app.register(contributorsRoutes, { prisma, prefix: '/contributors' });
  await app.register(reposRoutes, { prisma, prefix: '/repos' });
  await app.register(healthRoutes, { prisma });

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

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

interface EvaluationRouteOptions {
  prisma: PrismaClient;
}

export async function evaluationRoutes(
  app: FastifyInstance,
  opts: EvaluationRouteOptions
) {
  const { prisma } = opts;

  // GET /evaluation/results — return all eval runs, newest first
  app.get('/results', async (request, reply) => {
    const results = await prisma.evaluationResult.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    reply.header('Access-Control-Allow-Origin', '*');
    return results;
  });
}

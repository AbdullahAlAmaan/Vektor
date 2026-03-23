import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getRanker } from '@vektor/recommendation/src/ranker';
import { getCachedRecommendations, setCachedRecommendations } from '@vektor/recommendation/src/cache';
import { CACHE_KEYS, CACHE_TTL, getRedisClient } from '@vektor/shared';

interface ContributorsPluginOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function contributorsRoutes(
  app: FastifyInstance,
  opts: ContributorsPluginOptions,
): Promise<void> {
  const ranker = getRanker(opts.prisma);

  // GET /contributors/:id/profile
  app.get<{ Params: { id: string } }>('/:id/profile', async (req, reply) => {
    const { id } = req.params;

    const contributor = await opts.prisma.contributor.findUnique({
      where: { id },
      include: { featureProfiles: true },
    });

    if (!contributor) {
      return reply.status(404).send({ error: 'Contributor not found', code: 'NOT_FOUND', statusCode: 404 });
    }

    return reply.send(contributor);
  });

  // GET /contributors/:id/recommendations?repoId=&limit=
  app.get<{
    Params: { id: string };
    Querystring: { repoId: string; limit?: number };
  }>('/:id/recommendations', async (req, reply) => {
    const { id } = req.params;
    const { repoId, limit = 10 } = req.query;

    if (!repoId) {
      return reply.status(400).send({ error: 'repoId is required', code: 'VALIDATION_ERROR', statusCode: 400 });
    }

    // Check cache
    const cached = await getCachedRecommendations(id, repoId);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return reply.send(cached.slice(0, limit));
    }

    // Compute
    const recommendations = await ranker.getRecommendations(id, repoId, Number(limit));

    // Store in cache
    await setCachedRecommendations(id, repoId, recommendations);

    reply.header('X-Cache', 'MISS');
    return reply.send(recommendations);
  });
}

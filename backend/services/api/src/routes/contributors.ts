import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getRanker, Difficulty } from '@vektor/recommendation/src/ranker';
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

  // GET /contributors/:id/recommendations?repoId=&limit=&difficulty=easy|medium|hard
  app.get<{
    Params: { id: string };
    Querystring: { repoId: string; limit?: number; difficulty?: string };
  }>('/:id/recommendations', async (req, reply) => {
    const { id } = req.params;
    const { repoId, limit = 10, difficulty } = req.query;

    if (!repoId) {
      return reply.status(400).send({ error: 'repoId is required', code: 'VALIDATION_ERROR', statusCode: 400 });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return reply.status(400).send({
        error: `difficulty must be one of: ${validDifficulties.join(', ')}`,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    // Difficulty filter bypasses cache (filtered results are a subset)
    if (!difficulty) {
      const cached = await getCachedRecommendations(id, repoId);
      if (cached) {
        const slice = cached.slice(0, Number(limit));
        // Enrich cached results with issue details
        const issueIds = slice.map((r) => r.issueId);
        const issueDetails = await opts.prisma.issue.findMany({
          where: { id: { in: issueIds } },
          select: { id: true, title: true, number: true, labels: true },
        });
        const detailsMap = new Map(issueDetails.map((i) => [i.id, i]));
        const enriched = slice.map((r) => ({
          ...r,
          issueTitle: detailsMap.get(r.issueId)?.title ?? null,
          issueNumber: detailsMap.get(r.issueId)?.number ?? null,
          issueLabels: detailsMap.get(r.issueId)?.labels ?? [],
        }));
        reply.header('X-Cache', 'HIT');
        return reply.send(enriched);
      }
    }

    const recommendations = await ranker.getRecommendations(
      id,
      repoId,
      Number(limit),
      difficulty as Difficulty | undefined,
    );

    if (!difficulty) {
      await setCachedRecommendations(id, repoId, recommendations);
    }

    // Enrich with issue details for display purposes
    const issueIds = recommendations.map((r) => r.issueId);
    const issueDetails = await opts.prisma.issue.findMany({
      where: { id: { in: issueIds } },
      select: { id: true, title: true, number: true, labels: true },
    });
    const detailsMap = new Map(issueDetails.map((i) => [i.id, i]));
    const enriched = recommendations.map((r) => ({
      ...r,
      issueTitle: detailsMap.get(r.issueId)?.title ?? null,
      issueNumber: detailsMap.get(r.issueId)?.number ?? null,
      issueLabels: detailsMap.get(r.issueId)?.labels ?? [],
    }));

    reply.header('X-Cache', 'MISS');
    return reply.send(enriched);
  });
}

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getRanker } from '@vektor/recommendation/src/ranker';
import {
  getCachedIssueRecommendations,
  setCachedIssueRecommendations,
} from '@vektor/recommendation/src/cache';

interface IssuesPluginOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function issuesRoutes(
  app: FastifyInstance,
  opts: IssuesPluginOptions,
): Promise<void> {
  const ranker = getRanker(opts.prisma);

  /**
   * GET /issues/:id/recommendations?limit=10
   *
   * Returns the top-N contributors best qualified to work on this issue,
   * ranked by the same scoring formula used in the contributor → issue direction.
   */
  app.get<{
    Params: { id: string };
    Querystring: { limit?: number };
  }>('/:id/recommendations', async (req, reply) => {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    // Verify issue exists
    const issue = await opts.prisma.issue.findUnique({
      where: { id },
      select: { id: true, repoId: true, featureProfile: { select: { id: true } } },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found', code: 'NOT_FOUND', statusCode: 404 });
    }

    if (!issue.featureProfile) {
      return reply.status(422).send({
        error: 'Issue has no feature profile — run the feature worker first',
        code: 'NO_FEATURE_PROFILE',
        statusCode: 422,
      });
    }

    // Check cache
    const cached = await getCachedIssueRecommendations(id);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return reply.send(cached.slice(0, Number(limit)));
    }

    // Compute
    const contributors = await ranker.getIssueContributors(id, issue.repoId, Number(limit));

    await setCachedIssueRecommendations(id, contributors);

    reply.header('X-Cache', 'MISS');
    return reply.send(contributors);
  });
}

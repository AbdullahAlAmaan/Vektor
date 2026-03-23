import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface ReposPluginOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function reposRoutes(
  app: FastifyInstance,
  opts: ReposPluginOptions,
): Promise<void> {
  // GET /repos/:id/contributors
  app.get<{ Params: { id: string } }>('/:id/contributors', async (req, reply) => {
    const { id } = req.params;

    const repo = await opts.prisma.repository.findUnique({
      where: { id },
    });

    if (!repo) {
      return reply.status(404).send({ error: 'Repository not found', code: 'NOT_FOUND', statusCode: 404 });
    }

    const contributors = await opts.prisma.contributor.findMany({
      where: { repos: { some: { id } } },
      include: {
        featureProfiles: {
          where: { repoId: id },
        },
      },
    });

    return reply.send(contributors);
  });
}

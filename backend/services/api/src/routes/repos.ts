import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import { getRedisClient } from '@vektor/shared';

interface ReposPluginOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

export async function reposRoutes(
  app: FastifyInstance,
  opts: ReposPluginOptions,
): Promise<void> {
  // GET /repos — list all tracked repositories
  app.get('/', async (_req, reply) => {
    const repos = await opts.prisma.repository.findMany({
      orderBy: { lastIngestedAt: 'desc' },
      select: { id: true, owner: true, name: true, fullName: true, language: true, lastIngestedAt: true },
    });
    return reply.send(repos);
  });

  // POST /repos/ingest — trigger ingestion for a new or existing repo
  app.post<{ Body: { url?: string; owner?: string; name?: string } }>('/ingest', async (req, reply) => {
    const { url, owner: rawOwner, name: rawName } = req.body ?? {};

    let owner: string | undefined;
    let name: string | undefined;

    if (url) {
      const clean = url.replace('https://github.com/', '').replace(/\/$/, '');
      [owner, name] = clean.split('/');
    } else {
      owner = rawOwner;
      name = rawName;
    }

    if (!owner || !name) {
      return reply.status(400).send({ error: 'Provide url or owner+name', code: 'BAD_REQUEST', statusCode: 400 });
    }

    const jobId = `job-${Date.now()}`;
    const scriptPath = path.resolve(process.cwd(), 'backend', 'scripts', 'full-pipeline.ts');

    const child = spawn('npx', ['tsx', scriptPath, owner, name, jobId], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    child.unref();

    return reply.status(202).send({ jobId, owner, name, message: 'Ingestion started' });
  });

  // GET /repos/jobs/:jobId — read ingestion job status from Redis
  app.get<{ Params: { jobId: string } }>('/jobs/:jobId', async (req, reply) => {
    const { jobId } = req.params;
    try {
      const redis = getRedisClient();
      const raw = await redis.get(`ingest-job:${jobId}`);
      if (!raw) {
        return reply.status(404).send({ error: 'Job not found', code: 'NOT_FOUND', statusCode: 404 });
      }
      return reply.send(JSON.parse(raw));
    } catch {
      return reply.status(500).send({ error: 'Redis unavailable', code: 'INTERNAL', statusCode: 500 });
    }
  });

  // GET /repos/:id/contributors
  app.get<{ Params: { id: string } }>('/:id/contributors', async (req, reply) => {
    const { id } = req.params;

    const repo = await opts.prisma.repository.findUnique({ where: { id } });
    if (!repo) {
      return reply.status(404).send({ error: 'Repository not found', code: 'NOT_FOUND', statusCode: 404 });
    }

    const contributors = await opts.prisma.contributor.findMany({
      where: { repos: { some: { id } } },
      include: { featureProfiles: { where: { repoId: id } } },
    });

    return reply.send(contributors);
  });
}

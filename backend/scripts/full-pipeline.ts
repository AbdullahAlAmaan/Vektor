/**
 * full-pipeline.ts
 *
 * Self-contained ingestion + feature processing + complexity + embeddings pipeline.
 * Bypasses Kafka — writes directly to DB so no separate services need to be running.
 *
 * Usage (from project root):
 *   npx tsx scripts/full-pipeline.ts <owner> <name> [jobId]
 *   npx tsx scripts/full-pipeline.ts https://github.com/expressjs/express [jobId]
 *
 * Writes progress to Redis key: ingest-job:<jobId>
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '@vektor/shared';
import { createGitHubClient } from '../services/ingestion/src/github-client';
import { normalizeCommit } from '../services/ingestion/src/normalizers/commit.normalizer';
import { normalizeIssue } from '../services/ingestion/src/normalizers/issue.normalizer';
import { normalizePullRequest } from '../services/ingestion/src/normalizers/pr.normalizer';
import { normalizeContributor } from '../services/ingestion/src/normalizers/contributor.normalizer';
import { handleContributorEvent } from '../services/feature-worker/src/handlers/contributor.handler';
import { handleCommitEvent } from '../services/feature-worker/src/handlers/commit.handler';
import { handleIssueEvent } from '../services/feature-worker/src/handlers/issue.handler';
import { handlePullRequestEvent } from '../services/feature-worker/src/handlers/pr.handler';

const prisma = new PrismaClient();
const ML_URL = process.env.ML_SCORER_URL ?? 'http://localhost:8000';
const BATCH = 64;

// ---------- parse CLI args ----------

function parseArgs(): { owner: string; name: string; jobId: string } {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  let owner: string, name: string, jobId: string;

  if (args[0]?.startsWith('https://github.com/') || args[0]?.includes('/')) {
    const url = args[0].replace('https://github.com/', '');
    [owner, name] = url.split('/');
    jobId = args[1] ?? `job-${Date.now()}`;
  } else {
    [owner, name, jobId] = args;
    if (!jobId) jobId = `job-${Date.now()}`;
  }

  if (!owner || !name) {
    console.error('Usage: npx tsx scripts/full-pipeline.ts <owner> <name> [jobId]');
    process.exit(1);
  }
  return { owner, name, jobId };
}

// ---------- Redis status helpers ----------

async function setStatus(jobId: string, update: Record<string, unknown>) {
  const redis = getRedisClient();
  const existing = await redis.get(`ingest-job:${jobId}`).catch(() => null);
  const current = existing ? JSON.parse(existing) : {};
  await redis.setex(`ingest-job:${jobId}`, 3600, JSON.stringify({ ...current, ...update }));
}

// ---------- complexity hint ----------

const EASY_PATTERNS = ['good first issue', 'good-first-issue', 'beginner', 'easy', 'starter', 'first-timers-only', 'trivial'];
const HARD_PATTERNS = ['hard', 'complex', 'advanced', 'performance', 'security', 'breaking', 'refactor', 'regression'];

function computeComplexityHint(labels: string[], body: string | null): string {
  const lower = labels.map((l) => l.toLowerCase());
  if (lower.some((l) => EASY_PATTERNS.some((p) => l.includes(p)))) return 'easy';
  if (lower.some((l) => HARD_PATTERNS.some((p) => l.includes(p)))) return 'hard';
  const len = body?.length ?? 0;
  if (len < 300) return 'easy';
  if (len > 1200) return 'hard';
  return 'medium';
}

// ---------- embeddings ----------

async function generateEmbeddingsForRepo(repoId: string) {
  const health = await fetch(`${ML_URL}/health`).catch(() => null);
  if (!health?.ok) {
    console.warn('[Pipeline] ML scorer unavailable — skipping embeddings.');
    return;
  }

  // Issue embeddings
  const issueProfiles = await prisma.$queryRaw<Array<{ id: string; issue_id: string }>>`
    SELECT id, "issueId" as issue_id FROM "IssueFeatureProfile"
    WHERE "repoId" = ${repoId} AND embedding IS NULL
  `;
  if (issueProfiles.length > 0) {
    const issues = await prisma.issue.findMany({
      where: { id: { in: issueProfiles.map((p) => p.issue_id) } },
      select: { id: true, title: true, body: true },
    });
    const textMap = new Map(issues.map((i) => [i.id, `${i.title} ${i.body ?? ''}`]));
    for (let i = 0; i < issueProfiles.length; i += BATCH) {
      const chunk = issueProfiles.slice(i, i + BATCH);
      const texts = chunk.map((p) => textMap.get(p.issue_id) ?? '');
      const res = await fetch(`${ML_URL}/embed/batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }), signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) continue;
      const { embeddings } = await res.json() as { embeddings: number[][] };
      for (let j = 0; j < chunk.length; j++) {
        await prisma.$executeRawUnsafe(
          `UPDATE "IssueFeatureProfile" SET embedding = $1::vector WHERE id = $2`,
          `[${embeddings[j].join(',')}]`, chunk[j].id,
        );
      }
    }
  }

  // Contributor embeddings
  const contribProfiles = await prisma.$queryRaw<Array<{ id: string; contributor_id: string }>>`
    SELECT id, "contributorId" as contributor_id FROM "ContributorFeatureProfile"
    WHERE "repoId" = ${repoId} AND embedding IS NULL
  `;
  for (let i = 0; i < contribProfiles.length; i += BATCH) {
    const chunk = contribProfiles.slice(i, i + BATCH);
    const texts = await Promise.all(chunk.map(async (p) => {
      const commits = await prisma.commit.findMany({
        where: { contributorId: p.contributor_id, repoId },
        select: { message: true }, orderBy: { committedAt: 'desc' }, take: 100,
      });
      return commits.map((c) => c.message).join(' ');
    }));
    const res = await fetch(`${ML_URL}/embed/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }), signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) continue;
    const { embeddings } = await res.json() as { embeddings: number[][] };
    for (let j = 0; j < chunk.length; j++) {
      await prisma.$executeRawUnsafe(
        `UPDATE "ContributorFeatureProfile" SET embedding = $1::vector WHERE id = $2`,
        `[${embeddings[j].join(',')}]`, chunk[j].id,
      );
    }
  }
}

// ---------- main ----------

async function main() {
  const { owner, name, jobId } = parseArgs();

  await setStatus(jobId, { status: 'running', owner, name, startedAt: new Date().toISOString(), step: 'fetching' });
  console.log(`[Pipeline] Starting: ${owner}/${name} (job: ${jobId})`);

  const github = createGitHubClient();

  // 1. Upsert repo
  const { data: repoData } = await github.rest.repos.get({ owner, repo: name });
  const dbRepo = await prisma.repository.upsert({
    where: { githubRepoId: repoData.id },
    update: { lastIngestedAt: new Date() },
    create: {
      githubRepoId: repoData.id, owner: repoData.owner.login, name: repoData.name,
      fullName: repoData.full_name, defaultBranch: repoData.default_branch,
      language: repoData.language ?? null, lastIngestedAt: new Date(),
    },
  });
  const repoId = dbRepo.id;
  await setStatus(jobId, { repoId, step: 'contributors' });

  // 2. Contributors
  const contributors = await github.paginate(github.rest.repos.listContributors, { owner, repo: name, per_page: 100 });
  for (const c of contributors) {
    if (!c.login) continue;
    const event = normalizeContributor(c, repoId);
    await handleContributorEvent(prisma, event as Parameters<typeof handleContributorEvent>[1]).catch(console.error);
  }
  await setStatus(jobId, { step: 'commits', contributors: contributors.length });

  // 3. Commits
  const commits = await github.paginate(github.rest.repos.listCommits, { owner, repo: name, per_page: 100 });
  for (const c of commits) {
    const event = normalizeCommit(c, repoId);
    await handleCommitEvent(prisma, event as Parameters<typeof handleCommitEvent>[1]).catch(console.error);
  }
  await setStatus(jobId, { step: 'issues', commits: commits.length });

  // 4. Issues
  const allItems = await github.paginate(github.rest.issues.listForRepo, { owner, repo: name, state: 'all', per_page: 100 });
  const issues = allItems.filter((i) => !i.pull_request);
  for (const i of issues) {
    const event = normalizeIssue(i, repoId);
    await handleIssueEvent(prisma, event as Parameters<typeof handleIssueEvent>[1]).catch(console.error);
  }
  await setStatus(jobId, { step: 'prs', issues: issues.length });

  // 5. PRs
  const prs = await github.paginate(github.rest.pulls.list, { owner, repo: name, state: 'all', per_page: 100 });
  for (const pr of prs) {
    const event = normalizePullRequest(pr, repoId);
    await handlePullRequestEvent(prisma, event as Parameters<typeof handlePullRequestEvent>[1]).catch(console.error);
  }
  await setStatus(jobId, { step: 'complexity', prs: prs.length });

  // 6. Backfill complexity for all issues in this repo
  const repoIssues = await prisma.issue.findMany({
    where: { repoId, featureProfile: { isNot: null } },
    select: { id: true, labels: true, body: true },
  });
  for (const issue of repoIssues) {
    const hint = computeComplexityHint(issue.labels, issue.body);
    await prisma.issueFeatureProfile.update({ where: { issueId: issue.id }, data: { complexityHint: hint } });
  }
  await setStatus(jobId, { step: 'embeddings' });

  // 7. Embeddings
  await generateEmbeddingsForRepo(repoId);

  await setStatus(jobId, { status: 'done', step: 'done', completedAt: new Date().toISOString() });
  console.log(`[Pipeline] Done: ${owner}/${name}`);
}

main()
  .catch(async (err) => {
    const { jobId } = parseArgs();
    await setStatus(jobId, { status: 'error', error: String(err), completedAt: new Date().toISOString() }).catch(() => {});
    console.error('[Pipeline] Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

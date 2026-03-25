/**
 * generate-embeddings.ts
 *
 * Populates `embedding vector(384)` for all IssueFeatureProfile and
 * ContributorFeatureProfile rows that don't have one yet.
 *
 * Calls the Python ML service in batches of 64 to avoid memory spikes.
 * Safe to re-run — skips rows that already have embeddings.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 */

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();
const ML_URL = process.env.ML_SCORER_URL ?? 'http://localhost:8000';
const BATCH = 64;

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${ML_URL}/embed/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`ML scorer returned ${res.status}`);
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings;
}

function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

async function embedIssues() {
  console.log('[embed] Fetching issue profiles without embeddings...');
  const profiles = await prisma.$queryRaw<Array<{ id: string; issue_id: string }>>`
    SELECT id, "issueId" as issue_id FROM "IssueFeatureProfile" WHERE embedding IS NULL
  `;
  console.log(`[embed] ${profiles.length} issue profiles to embed.`);

  // Fetch issue title+body for text
  const issueIds = profiles.map((p) => p.issue_id);
  const issues = await prisma.issue.findMany({
    where: { id: { in: issueIds } },
    select: { id: true, title: true, body: true },
  });
  const issueTextMap = new Map(issues.map((i) => [i.id, `${i.title} ${i.body ?? ''}`]));

  for (let i = 0; i < profiles.length; i += BATCH) {
    const chunk = profiles.slice(i, i + BATCH);
    const texts = chunk.map((p) => issueTextMap.get(p.issue_id) ?? p.issue_id);
    const embeddings = await embedBatch(texts);
    for (let j = 0; j < chunk.length; j++) {
      const literal = toVectorLiteral(embeddings[j]);
      await prisma.$executeRawUnsafe(
        `UPDATE "IssueFeatureProfile" SET embedding = $1::vector WHERE id = $2`,
        literal,
        chunk[j].id,
      );
    }
    console.log(`[embed] Issues: ${Math.min(i + BATCH, profiles.length)}/${profiles.length}`);
  }
}

async function embedContributors() {
  console.log('[embed] Fetching contributor profiles without embeddings...');
  const profiles = await prisma.$queryRaw<Array<{ id: string; contributor_id: string; repo_id: string }>>`
    SELECT id, "contributorId" as contributor_id, "repoId" as repo_id
    FROM "ContributorFeatureProfile" WHERE embedding IS NULL
  `;
  console.log(`[embed] ${profiles.length} contributor profiles to embed.`);

  // For each contributor, build a text corpus from their last 100 commit messages
  for (let i = 0; i < profiles.length; i += BATCH) {
    const chunk = profiles.slice(i, i + BATCH);
    const texts = await Promise.all(
      chunk.map(async (p) => {
        const commits = await prisma.commit.findMany({
          where: { contributorId: p.contributor_id, repoId: p.repo_id },
          select: { message: true },
          orderBy: { committedAt: 'desc' },
          take: 100,
        });
        return commits.map((c) => c.message).join(' ');
      }),
    );

    const embeddings = await embedBatch(texts);
    for (let j = 0; j < chunk.length; j++) {
      const literal = toVectorLiteral(embeddings[j]);
      await prisma.$executeRawUnsafe(
        `UPDATE "ContributorFeatureProfile" SET embedding = $1::vector WHERE id = $2`,
        literal,
        chunk[j].id,
      );
    }
    console.log(`[embed] Contributors: ${Math.min(i + BATCH, profiles.length)}/${profiles.length}`);
  }
}

async function main() {
  console.log('[embed] Starting embedding generation...');
  // Verify ML service is up
  const health = await fetch(`${ML_URL}/health`).catch(() => null);
  if (!health?.ok) {
    console.error('[embed] ML scorer is not reachable. Run: docker compose up -d ml-scorer');
    process.exit(1);
  }

  await embedIssues();
  await embedContributors();
  console.log('[embed] Done. ✅');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

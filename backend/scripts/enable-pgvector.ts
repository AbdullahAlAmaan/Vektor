/**
 * enable-pgvector.ts
 *
 * One-time setup script — run after switching the Postgres image to pgvector/pgvector:pg16.
 * Enables the vector extension and adds `embedding vector(384)` columns to the two
 * feature profile tables, plus an IVFFlat index for ANN search.
 *
 * Usage:
 *   npx tsx scripts/enable-pgvector.ts
 */

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('[pgvector] Enabling vector extension...');
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log('[pgvector] Extension enabled.');

  console.log('[pgvector] Adding embedding column to IssueFeatureProfile...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "IssueFeatureProfile"
    ADD COLUMN IF NOT EXISTS embedding vector(384);
  `);

  console.log('[pgvector] Adding embedding column to ContributorFeatureProfile...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ContributorFeatureProfile"
    ADD COLUMN IF NOT EXISTS embedding vector(384);
  `);

  // IVFFlat indexes for ANN cosine search (lists = sqrt(N) is a common starting point)
  console.log('[pgvector] Creating IVFFlat indexes...');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_issue_embedding
    ON "IssueFeatureProfile" USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 64);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_contributor_embedding
    ON "ContributorFeatureProfile" USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 16);
  `);

  console.log('[pgvector] Setup complete. ✅');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

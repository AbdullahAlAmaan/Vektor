import { PrismaClient } from '@prisma/client';
import { runEvaluation } from './runner';

const prisma = new PrismaClient();

async function main() {
  console.log('[Evaluation] Starting evaluation run...');
  const result = await runEvaluation(prisma);
  console.log('[Evaluation] Results:', result);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[Evaluation] Fatal error:', err);
  process.exit(1);
});

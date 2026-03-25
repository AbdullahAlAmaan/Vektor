import { PrismaClient } from '@prisma/client';
import { runEvaluation } from '../services/evaluation/src/runner';

const prisma = new PrismaClient();

async function main() {
  console.log('[RunEval] Running offline evaluation...');
  const result = await runEvaluation(prisma);

  console.log('\n=== Evaluation Results ===');
  console.log(`Top-1 Accuracy : ${(result.top1Accuracy * 100).toFixed(1)}%`);
  console.log(`Top-3 Accuracy : ${(result.top3Accuracy * 100).toFixed(1)}%`);
  console.log(`Top-5 Hit Rate : ${(result.top5HitRate * 100).toFixed(1)}%`);
  console.log(`MRR            : ${result.mrr.toFixed(4)}`);
  console.log(`Sample Size    : ${result.sampleSize}`);
  console.log('==========================\n');

  await prisma.$disconnect();
}

main().catch(console.error);

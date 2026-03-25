import { env } from '@vektor/shared';
import { createScheduler } from './scheduler';

async function main() {
  console.log('[Ingestion] Starting ingestion service...');
  const scheduler = await createScheduler();
  await scheduler.start();
  console.log('[Ingestion] Scheduler running.');
}

main().catch((err) => {
  console.error('[Ingestion] Fatal error:', err);
  process.exit(1);
});

import { env } from '@vektor/shared';
import { createGitHubClient } from './github-client';
import { createPublisher } from './publisher';
import { ingestRepo } from './ingest';

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function createScheduler() {
  const github = createGitHubClient();
  const publisher = await createPublisher();

  async function run() {
    try {
      console.log('[Scheduler] Starting ingestion run...');
      await ingestRepo(github, publisher, env.GITHUB_REPO_OWNER, env.GITHUB_REPO_NAME);
      console.log('[Scheduler] Ingestion run complete.');
    } catch (err) {
      console.error('[Scheduler] Ingestion run failed:', err);
    }
  }

  return {
    start: async () => {
      await run();
      setInterval(run, INTERVAL_MS);
    },
  };
}

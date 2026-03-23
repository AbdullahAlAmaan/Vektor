import { createGitHubClient } from '../services/ingestion/src/github-client';
import { createPublisher } from '../services/ingestion/src/publisher';
import { ingestRepo } from '../services/ingestion/src/ingest';
import { env } from '@vektor/shared';

async function main() {
  console.log('[IngestOnce] Starting manual ingestion...');
  const github = createGitHubClient();
  const publisher = await createPublisher();

  await ingestRepo(github, publisher, env.GITHUB_REPO_OWNER, env.GITHUB_REPO_NAME);

  await publisher.disconnect();
  console.log('[IngestOnce] Done.');
}

main().catch(console.error);

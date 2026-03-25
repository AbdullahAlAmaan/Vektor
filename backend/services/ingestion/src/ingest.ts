import { PrismaClient } from '@prisma/client';
import { GitHubClient } from './github-client';
import { Publisher } from './publisher';
import { normalizeCommit } from './normalizers/commit.normalizer';
import { normalizeIssue } from './normalizers/issue.normalizer';
import { normalizePullRequest } from './normalizers/pr.normalizer';
import { normalizeContributor } from './normalizers/contributor.normalizer';
import { TOPICS } from '@vektor/shared';

const prisma = new PrismaClient();

export async function ingestRepo(
  github: GitHubClient,
  publisher: Publisher,
  owner: string,
  repo: string,
): Promise<void> {
  // 1. Fetch repo metadata from GitHub and upsert into Postgres to get the internal ID
  const { data: repoData } = await github.rest.repos.get({ owner, repo });

  const dbRepo = await prisma.repository.upsert({
    where: { githubRepoId: repoData.id },
    update: { lastIngestedAt: new Date() },
    create: {
      githubRepoId: repoData.id,
      owner: repoData.owner.login,
      name: repoData.name,
      fullName: repoData.full_name,
      defaultBranch: repoData.default_branch,
      language: repoData.language ?? null,
      lastIngestedAt: new Date(),
    },
  });

  const repoId = dbRepo.id;
  console.log(`[Ingest] Repository: ${dbRepo.fullName} (internal ID: ${repoId})`);

  // 2. Ingest contributors
  console.log('[Ingest] Fetching contributors...');
  const contributors = await github.paginate(github.rest.repos.listContributors, {
    owner,
    repo,
    per_page: 100,
  });

  for (const contributor of contributors) {
    if (!contributor.login) continue;
    const event = normalizeContributor(contributor, repoId);
    await publisher.publish(TOPICS.CONTRIBUTORS, event as unknown as Record<string, unknown>);
  }
  console.log(`[Ingest] Published ${contributors.length} contributors.`);

  // 3. Ingest commits
  console.log('[Ingest] Fetching commits...');
  const commits = await github.paginate(github.rest.repos.listCommits, {
    owner,
    repo,
    per_page: 100,
  });

  for (const commit of commits) {
    const event = normalizeCommit(commit, repoId);
    await publisher.publish(TOPICS.COMMITS, event as unknown as Record<string, unknown>);
  }
  console.log(`[Ingest] Published ${commits.length} commits.`);

  // 4. Ingest issues (exclude PRs)
  console.log('[Ingest] Fetching issues...');
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'all',
    per_page: 100,
  });

  const pureIssues = issues.filter((i) => !i.pull_request);
  for (const issue of pureIssues) {
    const event = normalizeIssue(issue, repoId);
    await publisher.publish(TOPICS.ISSUES, event as unknown as Record<string, unknown>);
  }
  console.log(`[Ingest] Published ${pureIssues.length} issues.`);

  // 5. Ingest PRs
  console.log('[Ingest] Fetching pull requests...');
  const prs = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'all',
    per_page: 100,
  });

  for (const pr of prs) {
    const event = normalizePullRequest(pr, repoId);
    await publisher.publish(TOPICS.PULL_REQUESTS, event as unknown as Record<string, unknown>);
  }
  console.log(`[Ingest] Published ${prs.length} pull requests.`);

  await prisma.repository.update({
    where: { id: repoId },
    data: { lastIngestedAt: new Date() },
  });
}

import { PrismaClient } from '@prisma/client';
import { ContributorEvent } from '@vektor/shared';

export async function handleContributorEvent(
  prisma: PrismaClient,
  event: ContributorEvent,
): Promise<void> {
  const { repoId, githubUserId, username, displayName, avatarUrl } = event;

  // Skip events with invalid repoId (e.g. from failed ingestion runs)
  if (!repoId) return;

  // Verify repo exists before connecting
  const repo = await prisma.repository.findUnique({ where: { id: repoId } });
  if (!repo) {
    console.warn(`[ContributorHandler] Repo ${repoId} not found, skipping contributor ${username}`);
    return;
  }

  // Upsert contributor (without repo connect first to avoid race)
  await prisma.contributor.upsert({
    where: { githubUserId },
    update: {
      displayName,
      avatarUrl,
      repos: { connect: { id: repoId } },
    },
    create: {
      githubUserId,
      username,
      displayName,
      avatarUrl,
      repos: { connect: { id: repoId } },
    },
  });
}

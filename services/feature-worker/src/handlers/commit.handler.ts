import { PrismaClient } from '@prisma/client';
import { CommitEvent, buildDomainVector, emaUpdate } from '@vektor/shared';

export async function handleCommitEvent(
  prisma: PrismaClient,
  event: CommitEvent,
): Promise<void> {
  const { repoId, filesChanged, committedAt } = event;

  // event.contributorId is the GitHub username — resolve to Vektor internal ID
  const contributor = await prisma.contributor.findUnique({
    where: { username: event.contributorId },
  });

  // Skip commit if contributor hasn't been ingested yet
  if (!contributor) {
    console.warn(`[CommitHandler] Unknown contributor "${event.contributorId}", skipping commit ${event.sha}`);
    return;
  }

  const contributorId = contributor.id;

  // Upsert commit record
  await prisma.commit.upsert({
    where: { sha: event.sha },
    update: {},
    create: {
      sha: event.sha,
      repoId,
      contributorId,
      message: event.message,
      filesChanged,
      additions: event.additions,
      deletions: event.deletions,
      committedAt: new Date(committedAt),
    },
  });

  // Build domain vector from changed files
  const newDomains = buildDomainVector(filesChanged);

  // Update contributor feature profile
  const existing = await prisma.contributorFeatureProfile.findUnique({
    where: { contributorId_repoId: { contributorId, repoId } },
  });

  const prevExpertise = (existing?.expertiseVector as Record<string, number>) ?? {};
  const updatedExpertise: Record<string, number> = { ...prevExpertise };

  // Signal = 1.0 for direct commit
  for (const [domain, signal] of Object.entries(newDomains)) {
    updatedExpertise[domain] = emaUpdate(prevExpertise[domain] ?? 0, signal, 0.3);
  }

  const recencyScore = emaUpdate(existing?.recencyScore ?? 0, 1.0, 0.3);

  await prisma.contributorFeatureProfile.upsert({
    where: { contributorId_repoId: { contributorId, repoId } },
    update: {
      expertiseVector: updatedExpertise,
      domainScores: updatedExpertise,
      recencyScore,
      contributionVolume: { increment: 1 },
    },
    create: {
      contributorId,
      repoId,
      expertiseVector: updatedExpertise,
      labelAffinity: {},
      domainScores: updatedExpertise,
      recencyScore,
      contributionVolume: 1,
    },
  });
}

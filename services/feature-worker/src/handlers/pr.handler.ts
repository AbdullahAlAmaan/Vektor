import { PrismaClient } from '@prisma/client';
import { PullRequestEvent, buildDomainVector, emaUpdate } from '@vektor/shared';

export async function handlePullRequestEvent(
  prisma: PrismaClient,
  event: PullRequestEvent,
): Promise<void> {
  const { repoId, contributorId, filesChanged, labels } = event;

  // Upsert pull request record
  await prisma.pullRequest.upsert({
    where: { githubPrId_repoId: { githubPrId: event.githubId, repoId } },
    update: {
      state: event.state,
      labels,
      mergedAt: event.mergedAt ? new Date(event.mergedAt) : undefined,
    },
    create: {
      githubPrId: event.githubId,
      repoId,
      contributorId,
      title: event.title,
      body: event.body,
      state: event.state,
      labels,
      filesChanged,
      mergedAt: event.mergedAt ? new Date(event.mergedAt) : undefined,
      githubCreatedAt: new Date(event.createdAt),
    },
  });

  const isMerged = event.state === 'merged';
  // Signal = 1.0 for merged PR, 0.5 for unmerged
  const signal = isMerged ? 1.0 : 0.5;

  const newDomains = buildDomainVector(filesChanged);

  const existing = await prisma.contributorFeatureProfile.findUnique({
    where: { contributorId_repoId: { contributorId, repoId } },
  });

  const prevExpertise = (existing?.expertiseVector as Record<string, number>) ?? {};
  const updatedExpertise: Record<string, number> = { ...prevExpertise };

  for (const [domain, domainSignal] of Object.entries(newDomains)) {
    updatedExpertise[domain] = emaUpdate(prevExpertise[domain] ?? 0, domainSignal * signal, 0.3);
  }

  // Update label affinity
  const prevAffinity = (existing?.labelAffinity as Record<string, number>) ?? {};
  const updatedAffinity: Record<string, number> = { ...prevAffinity };
  for (const label of labels) {
    updatedAffinity[label] = emaUpdate(prevAffinity[label] ?? 0, signal, 0.3);
  }

  const recencyScore = emaUpdate(existing?.recencyScore ?? 0, signal, 0.3);

  await prisma.contributorFeatureProfile.upsert({
    where: { contributorId_repoId: { contributorId, repoId } },
    update: {
      expertiseVector: updatedExpertise,
      domainScores: updatedExpertise,
      labelAffinity: updatedAffinity,
      recencyScore,
      contributionVolume: { increment: 1 },
    },
    create: {
      contributorId,
      repoId,
      expertiseVector: updatedExpertise,
      labelAffinity: updatedAffinity,
      domainScores: updatedExpertise,
      recencyScore,
      contributionVolume: 1,
    },
  });
}

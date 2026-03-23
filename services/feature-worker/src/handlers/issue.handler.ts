import { PrismaClient } from '@prisma/client';
import { IssueEvent } from '@vektor/shared';

export async function handleIssueEvent(
  prisma: PrismaClient,
  event: IssueEvent,
): Promise<void> {
  const { repoId, githubId } = event;

  // Upsert issue record
  const issue = await prisma.issue.upsert({
    where: { githubIssueId_repoId: { githubIssueId: githubId, repoId } },
    update: {
      title: event.title,
      body: event.body,
      state: event.state,
      labels: event.labels,
      githubUpdatedAt: new Date(event.updatedAt),
    },
    create: {
      githubIssueId: githubId,
      repoId,
      title: event.title,
      body: event.body,
      state: event.state,
      labels: event.labels,
      assigneeId: event.assigneeId ?? undefined,
      number: event.number,
      githubCreatedAt: new Date(event.createdAt),
      githubUpdatedAt: new Date(event.updatedAt),
    },
  });

  // Build label vector
  const labelVector: Record<string, number> = {};
  for (const label of event.labels) {
    labelVector[label] = 1;
  }

  // Upsert issue feature profile
  await prisma.issueFeatureProfile.upsert({
    where: { issueId: issue.id },
    update: {
      labelVector,
      domainTags: {},
    },
    create: {
      issueId: issue.id,
      repoId,
      labelVector,
      domainTags: {},
    },
  });
}

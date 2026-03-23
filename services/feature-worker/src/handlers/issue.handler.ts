import { PrismaClient } from '@prisma/client';
import { IssueEvent } from '@vektor/shared';

export async function handleIssueEvent(
  prisma: PrismaClient,
  event: IssueEvent,
): Promise<void> {
  const { repoId, githubId } = event;

  // Resolve assignee GitHub username → Vektor internal ID
  let resolvedAssigneeId: string | undefined;
  if (event.assigneeId) {
    const assignee = await prisma.contributor.findUnique({
      where: { username: event.assigneeId },
    });
    resolvedAssigneeId = assignee?.id;
  }

  // Upsert issue record
  const issue = await prisma.issue.upsert({
    where: { githubIssueId_repoId: { githubIssueId: githubId, repoId } },
    update: {
      title: event.title,
      body: event.body,
      state: event.state,
      labels: event.labels,
      assigneeId: resolvedAssigneeId,
      githubUpdatedAt: new Date(event.updatedAt),
    },
    create: {
      githubIssueId: githubId,
      repoId,
      title: event.title,
      body: event.body,
      state: event.state,
      labels: event.labels,
      assigneeId: resolvedAssigneeId,
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
    update: { labelVector, domainTags: {} },
    create: { issueId: issue.id, repoId, labelVector, domainTags: {} },
  });
}

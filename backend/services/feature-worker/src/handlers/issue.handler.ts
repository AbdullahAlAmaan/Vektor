import { PrismaClient } from '@prisma/client';
import { IssueEvent } from '@vektor/shared';

// Label patterns that signal issue difficulty
const EASY_PATTERNS = [
  'good first issue', 'good-first-issue', 'beginner', 'easy', 'starter',
  'first-timers-only', 'first-timer', 'low-hanging-fruit', 'trivial',
];
const HARD_PATTERNS = [
  'hard', 'complex', 'advanced', 'performance', 'security', 'breaking',
  'breaking-change', 'architecture', 'refactor', 'regression',
];

function computeComplexityHint(labels: string[], body: string | null): string {
  const lowerLabels = labels.map((l) => l.toLowerCase());

  const isEasyLabel = lowerLabels.some((l) => EASY_PATTERNS.some((p) => l.includes(p)));
  if (isEasyLabel) return 'easy';

  const isHardLabel = lowerLabels.some((l) => HARD_PATTERNS.some((p) => l.includes(p)));
  if (isHardLabel) return 'hard';

  // Fall back to body length as a proxy for specification complexity
  const bodyLen = body?.length ?? 0;
  if (bodyLen < 300) return 'easy';
  if (bodyLen > 1200) return 'hard';
  return 'medium';
}

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

  const complexityHint = computeComplexityHint(event.labels, event.body ?? null);

  // Upsert issue feature profile
  await prisma.issueFeatureProfile.upsert({
    where: { issueId: issue.id },
    update: { labelVector, domainTags: {}, complexityHint },
    create: { issueId: issue.id, repoId, labelVector, domainTags: {}, complexityHint },
  });
}

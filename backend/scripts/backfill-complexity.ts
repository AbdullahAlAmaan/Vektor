/**
 * backfill-complexity.ts
 * Retroactively compute and store complexityHint for all existing IssueFeatureProfiles.
 * Safe to re-run — uses UPDATE, not INSERT.
 */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const EASY_PATTERNS = [
  'good first issue', 'good-first-issue', 'beginner', 'easy', 'starter',
  'first-timers-only', 'first-timer', 'low-hanging-fruit', 'trivial',
];
const HARD_PATTERNS = [
  'hard', 'complex', 'advanced', 'performance', 'security', 'breaking',
  'breaking-change', 'architecture', 'refactor', 'regression',
];

function computeComplexityHint(labels: string[], body: string | null): string {
  const lower = labels.map((l) => l.toLowerCase());
  if (lower.some((l) => EASY_PATTERNS.some((p) => l.includes(p)))) return 'easy';
  if (lower.some((l) => HARD_PATTERNS.some((p) => l.includes(p)))) return 'hard';
  const len = body?.length ?? 0;
  if (len < 300) return 'easy';
  if (len > 1200) return 'hard';
  return 'medium';
}

async function main() {
  const issues = await prisma.issue.findMany({
    where: { featureProfile: { isNot: null } },
    select: { id: true, labels: true, body: true },
  });

  console.log(`[backfill] Computing complexity for ${issues.length} issues...`);
  const counts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

  for (const issue of issues) {
    const hint = computeComplexityHint(issue.labels, issue.body);
    counts[hint]++;
    await prisma.issueFeatureProfile.update({
      where: { issueId: issue.id },
      data: { complexityHint: hint },
    });
  }

  console.log(`[backfill] Done. Distribution: easy=${counts.easy}, medium=${counts.medium}, hard=${counts.hard}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

// Recency decay helpers

const MS_PER_DAY = 86_400_000;

/**
 * Recency alignment: contributor's recency score vs issue age.
 * Uses 30-day exponential decay half-life.
 */
export function recencyAlignment(
  contributorRecency: number,
  issueCreatedAt: Date,
): number {
  const ageDays = (Date.now() - issueCreatedAt.getTime()) / MS_PER_DAY;
  return contributorRecency * Math.exp(-ageDays / 30);
}

/**
 * Returns 1 if issue is less than 7 days old, else 0.
 */
export function freshnessBonus(issueCreatedAt: Date): number {
  const ageDays = (Date.now() - issueCreatedAt.getTime()) / MS_PER_DAY;
  return ageDays < 7 ? 1 : 0;
}

/**
 * Exponential moving average update.
 * alpha = 0.3 (recency weight)
 */
export function emaUpdate(
  oldScore: number,
  signal: number,
  alpha = 0.3,
): number {
  return oldScore * (1 - alpha) + signal * alpha;
}

// Canonical domain mapping — used by feature-worker and evaluation pipeline.
// Never duplicate this logic elsewhere.

export const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  backend:  [/src\/api/, /src\/server/, /routes?\//],
  frontend: [/src\/ui/, /src\/components/, /src\/pages/],
  auth:     [/auth/, /login/, /oauth/, /jwt/],
  database: [/migrations?/, /prisma/, /schema\.sql/],
  testing:  [/\.test\.ts$/, /\.spec\.ts$/, /__tests__/],
  ci:       [/\.github\//, /Dockerfile/, /docker-compose/],
  docs:     [/README/, /docs\//],
};

export function mapFilesToDomains(files: string[]): string[] {
  return Object.entries(DOMAIN_PATTERNS)
    .filter(([, patterns]) => files.some((f) => patterns.some((p) => p.test(f))))
    .map(([domain]) => domain);
}

export function buildDomainVector(files: string[]): Record<string, number> {
  const domains = mapFilesToDomains(files);
  const vector: Record<string, number> = {};
  for (const domain of domains) {
    vector[domain] = (vector[domain] ?? 0) + 1;
  }
  // Normalize to 0-1
  const max = Math.max(...Object.values(vector), 1);
  for (const key of Object.keys(vector)) {
    vector[key] = vector[key] / max;
  }
  return vector;
}

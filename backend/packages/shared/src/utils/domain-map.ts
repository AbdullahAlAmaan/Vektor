// Canonical domain mapping — used by feature-worker and evaluation pipeline.
// Never duplicate this logic elsewhere.

export const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  backend: [
    /src\/api/, /src\/server/, /routes?\//, /lib\/router/,
    /lib\/middleware/, /middleware\//, /lib\/express/, /lib\/application/,
    /lib\/request/, /lib\/response/, /lib\/utils/, /^lib\//, /^src\/lib\//,
    /controller/, /handler/, /service\//, /^app\.(js|ts)$/, /^server\.(js|ts)$/,
    /^index\.(js|ts)$/, /^src\/index/, /express/, /fastify/, /koa/, /hapi/,
  ],
  frontend: [
    /src\/ui/, /src\/components/, /src\/pages/, /src\/views/, /src\/app\//,
    /components\//, /pages\//, /views\//, /\.vue$/, /\.jsx$/, /\.tsx$/,
    /styles\//, /css\//, /scss\//, /tailwind/, /webpack/, /vite\.config/,
    /public\//, /assets\//,
  ],
  auth: [/auth/, /login/, /oauth/, /jwt/, /session/, /passport/, /token/, /credentials/, /permission/, /rbac/],
  database: [/migrations?/, /prisma/, /schema\.sql/, /knex/, /sequelize/, /mongoose/, /typeorm/, /^models\//, /^src\/models\//],
  testing: [
    /\.test\.ts$/, /\.spec\.ts$/, /__tests__/, /\.test\.js$/, /\.spec\.js$/,
    /^test\//, /^tests\//, /^spec\//, /test\.(js|ts)$/, /\.test\.(js|ts)x?$/,
    /mocha/, /jest\.config/, /vitest\.config/,
  ],
  ci: [/\.github\//, /Dockerfile/, /docker-compose/, /\.travis\.yml/, /\.circleci/, /Makefile/, /\.gitlab-ci/, /workflow/],
  docs: [/README/, /docs\//, /CHANGELOG/, /HISTORY/, /examples\//, /\.md$/, /CONTRIBUTING/],
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

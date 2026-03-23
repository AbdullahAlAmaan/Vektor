# CLAUDE.md — Vektor Project Context

> This file is the single source of truth for Claude Code working on this project.
> Read it fully before writing any code, creating any file, or running any command.

---

## What Is Vektor

Vektor is an **event-driven distributed intelligence platform** that ingests GitHub repository activity, builds contributor expertise profiles, and serves ranked issue recommendations through a low-latency REST API.

**One-sentence pitch:** Vektor answers "which open issues should I work on?" and "who should we assign this issue to?" — automatically, using real GitHub activity data.

**Primary use case (MVP):** Given a contributor ID, return a ranked list of open issues they are most qualified to work on, based on their past commits, PRs, and label history.

---

## MVP Scope — Hard Boundaries

### ✅ In scope
- GitHub data ingestion (commits, PRs, issues, contributors)
- Contributor expertise profiling
- Contributor → Issue recommendation (ranked top-N)
- Offline evaluation pipeline (Top-1, Top-3, Top-5, MRR)
- Read-only REST API (3 endpoints)
- Redis-backed caching

### ❌ Out of scope (do not build, do not suggest)
- Issue → Contributor recommendation (Phase 2)
- Workload balancing / workload penalty in scorer (Phase 2)
- Issue difficulty estimation (Phase 2)
- Real-time websocket updates (Phase 2)
- UI dashboard (Phase 2)
- Multi-tenant / enterprise support (Phase 3)
- pgvector embeddings (Phase 2)
- Write-back into GitHub API (never in MVP)

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | ^5.3.0 (strict mode) |
| API Framework | Fastify | ^4.26.0 |
| ML Workers | Python + FastAPI | 3.11 |
| Event Bus | Redpanda (Kafka-compatible) | v23.3.x |
| Kafka Client | kafkajs | ^2.2.4 |
| Primary DB | PostgreSQL | 16 |
| ORM | Prisma | ^5.9.0 |
| Cache | Redis + ioredis | 7 / ^5.3.2 |
| GitHub Client | @octokit/rest | ^20.0.2 |
| Validation | zod | ^3.22.4 |
| Testing | Vitest + Supertest | ^1.3.0 |
| Containerization | Docker + Compose | v2 |
| Linting | ESLint + Prettier | latest |

**Do not introduce new dependencies without a clear reason. Prefer extending existing ones.**

---

## Repository Structure

```
vektor/
├── .env.example
├── .nvmrc                          # "20"
├── .eslintrc.cjs
├── .prettierrc
├── .cursorrules
├── CLAUDE.md                       # this file
├── docker-compose.yml
├── docker-compose.test.yml
├── package.json                    # root npm workspace
├── tsconfig.base.json
│
├── packages/
│   └── shared/                     # shared types, schemas, utils — imported by all services
│       ├── src/
│       │   ├── types/              # TypeScript domain types mirroring Prisma models
│       │   ├── schemas/            # Zod schemas for all Kafka events
│       │   ├── utils/
│       │   │   ├── domain-map.ts   # file path → domain mapping (canonical)
│       │   │   ├── math.ts         # cosine similarity, dot product, etc.
│       │   │   └── recency.ts      # recency decay helpers
│       │   ├── kafka/
│       │   │   └── client.ts       # shared Kafka singleton
│       │   ├── redis/
│       │   │   └── client.ts       # shared Redis singleton
│       │   └── config/
│       │       └── env.ts          # zod-validated env config
│       └── package.json
│
├── services/
│   ├── ingestion/                  # GitHub API → Kafka
│   │   └── src/
│   │       ├── index.ts
│   │       ├── github-client.ts
│   │       ├── scheduler.ts
│   │       ├── publisher.ts
│   │       └── normalizers/
│   │           ├── commit.normalizer.ts
│   │           ├── issue.normalizer.ts
│   │           ├── pr.normalizer.ts
│   │           └── contributor.normalizer.ts
│   │
│   ├── feature-worker/             # Kafka → Postgres feature profiles
│   │   └── src/
│   │       ├── index.ts
│   │       ├── handlers/
│   │       │   ├── commit.handler.ts
│   │       │   ├── issue.handler.ts
│   │       │   └── pr.handler.ts
│   │       └── profile-updater.ts
│   │
│   ├── recommendation/             # scoring engine
│   │   └── src/
│   │       ├── index.ts
│   │       ├── scorer.ts           # core scoring logic
│   │       ├── ranker.ts           # candidate generation + ranking
│   │       └── cache.ts            # Redis cache layer
│   │
│   ├── api/                        # Fastify HTTP server
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── contributors.ts
│   │       │   ├── repos.ts
│   │       │   └── health.ts
│   │       └── middleware/
│   │           └── error-handler.ts
│   │
│   └── evaluation/                 # offline evaluation pipeline
│       └── src/
│           ├── index.ts
│           ├── runner.ts
│           └── metrics.ts
│
├── ml/                             # Python scoring workers (Phase 2 TF-IDF)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── src/
│       ├── scorer.py
│       ├── tfidf.py
│       └── eval.py
│
├── prisma/
│   ├── schema.prisma               # single source of truth for DB
│   └── migrations/
│
└── scripts/
    ├── seed.ts                     # load test data
    ├── ingest-once.ts              # manual ingestion trigger
    └── run-eval.ts                 # evaluation runner
```

---

## Database Schema

The canonical schema lives in `prisma/schema.prisma`. Never modify the DB without updating this file.

### Tables

**Core entities:**
- `Repository` — a GitHub repo being tracked
- `Contributor` — a GitHub user who has contributed to a tracked repo
- `Commit` — a single commit, linked to contributor + repo, stores `filesChanged: String[]`
- `Issue` — a GitHub issue, stores `labels: String[]`, optional `assigneeId`
- `PullRequest` — a GitHub PR, stores `labels: String[]`, `filesChanged: String[]`, optional `mergedAt`

**Derived / feature entities:**
- `ContributorFeatureProfile` — expertise vector, label affinity, domain scores, recency score. Unique on `(contributorId, repoId)`. All vector fields are `Json` (JSONB).
- `IssueFeatureProfile` — label vector, domain tags, optional TF-IDF vector. Unique on `issueId`.
- `RecommendationSnapshot` — persisted top-N recommendation output per contributor+repo. Stores `recommendedIssueIds: String[]` and `scores: Json`.
- `EvaluationResult` — stores metrics from each evaluation run.

### Key field conventions
- All IDs are `String @id @default(cuid())`
- GitHub IDs stored as `Int` prefixed with `github` (e.g., `githubIssueId`, `githubUserId`)
- All vector/map fields are `Json` (Postgres JSONB)
- Arrays use Postgres native arrays: `String[]`
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`

---

## Kafka Topics

| Topic | Partitions | Retention | Direction |
|---|---|---|---|
| `github.commits` | 4 | 7d | ingestion → feature-worker |
| `github.issues` | 4 | 7d | ingestion → feature-worker |
| `github.pull_requests` | 4 | 7d | ingestion → feature-worker |
| `github.contributors` | 2 | 14d | ingestion → feature-worker |
| `features.updated` | 2 | 3d | feature-worker → recommendation |

### Event Schema Pattern

All events share a base envelope:
```typescript
{
  eventId:   string;   // uuid
  repoId:    string;   // Vektor internal repo ID
  eventType: string;   // e.g. 'commit.created'
  timestamp: string;   // ISO 8601
  version:   'v1';
}
```

All events are defined as Zod schemas in `packages/shared/src/schemas/`. Validate on both produce and consume. Never publish a raw object to Kafka.

---

## Environment Variables

All env vars live in `.env` (local) and `.env.example` (committed). Access them exclusively through `packages/shared/src/config/env.ts` which validates them with Zod at startup. If a required var is missing, the process must crash with a clear error.

```
DATABASE_URL=postgresql://vektor:vektor_dev@localhost:5432/vektor
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=vektor
KAFKA_GROUP_ID_FEATURE=vektor-feature-worker
KAFKA_GROUP_ID_RECOMMEND=vektor-recommendation-worker
GITHUB_TOKEN=ghp_xxxx
GITHUB_REPO_OWNER=facebook
GITHUB_REPO_NAME=react
API_PORT=3000
API_HOST=0.0.0.0
RECOMMENDATION_CACHE_TTL=3600
RECOMMENDATION_TOP_N=10
```

---

## Core Algorithm

### Domain Mapping

File paths are mapped to domains using regex patterns defined in `packages/shared/src/utils/domain-map.ts`. This is the canonical mapping used by both the feature worker and evaluation pipeline.

```typescript
const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  backend:   [/src\/api/, /src\/server/, /routes?\//],
  frontend:  [/src\/ui/, /src\/components/, /src\/pages/],
  auth:      [/auth/, /login/, /oauth/, /jwt/],
  database:  [/migrations?/, /prisma/, /schema\.sql/],
  testing:   [/\.test\.ts$/, /\.spec\.ts$/, /__tests__/],
  ci:        [/\.github\//, /Dockerfile/, /docker-compose/],
  docs:      [/README/, /docs\//],
};
```

Never hardcode domain logic outside this file.

### Expertise Vector Updates

When a commit or PR is processed, the contributor's domain scores are updated using exponential moving average:

```
newScore = (oldScore × (1 - α)) + (signal × α)
α = 0.3
signal = 1.0 for direct commit, 0.5 for PR without merge
```

### Recommendation Scoring Formula (v1)

```
score(contributor, issue) =
  0.35 × domain_match          // cosine similarity of domain vectors
+ 0.25 × label_affinity_match  // dot product of label affinity vs issue labels
+ 0.15 × recency_alignment     // exponential decay on issue age vs contributor recency
+ 0.05 × freshness_bonus       // 1 if issue < 7 days old, else 0
// NOTE: text_similarity (0.20 weight) is deferred to Phase 2
// NOTE: workload_penalty is deferred to Phase 2 — do not add it now
```

### Cosine Similarity

Used for `domain_match`. Both vectors are sparse `Record<string, number>` with values 0–1.

```typescript
function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const av = a[k] ?? 0, bv = b[k] ?? 0;
    dot += av * bv; normA += av * av; normB += bv * bv;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}
```

### Recency Alignment

```typescript
function recencyAlignment(contributorRecency: number, issueCreatedAt: Date): number {
  const ageDays = (Date.now() - issueCreatedAt.getTime()) / 86_400_000;
  return contributorRecency * Math.exp(-ageDays / 30); // 30-day half-life
}
```

---

## Redis Cache

### Key Schema
```
recommendations:{contributorId}:{repoId}   → JSON RankedIssue[]
contributor-profile:{contributorId}         → JSON ContributorFeatureProfile
```

### TTLs
- Recommendations: 3600s (1 hour)
- Profiles: 900s (15 minutes)

### Invalidation
When `features.updated` event fires for a contributor, delete:
```
redis.del(`recommendations:${contributorId}:${repoId}`)
```

Never store any data in Redis that isn't also in Postgres. Redis is the speed layer, not the source of truth.

---

## API Endpoints (MVP — Read Only)

### `GET /contributors/:id/profile`
Returns contributor metadata + expertise vector + label affinity + contribution summary.

### `GET /contributors/:id/recommendations`
Query params: `?limit=5&repoId=<id>`
Returns ranked issues array with scores.
Check Redis first. On miss: compute, cache, return.
Always set `X-Cache: HIT|MISS` header.

### `GET /repos/:id/contributors`
Returns all contributors in repo with basic expertise summaries.

### `GET /health`
Returns `{ status: 'ok', checks: { db: 'ok', redis: 'ok', kafka: 'ok' } }`
Used by Docker healthcheck.

**There are no POST/PUT/DELETE endpoints in MVP.**

---

## Coding Conventions

### TypeScript
- Strict mode always on. No `any`. No `!` non-null assertions without a comment explaining why.
- All environment variables accessed via `env.ts`, never `process.env` directly.
- All Kafka events validated with their Zod schema before publish and after consume.
- Errors must be typed. Create domain-specific error classes (e.g., `NotFoundError`, `ValidationError`).
- No raw SQL. All DB access via Prisma client.

### Kafka
- Producers always use `acks: 'all'`
- Consumers always commit offsets explicitly (autoCommit: false)
- Consumer group IDs come from env vars, never hardcoded
- All message payloads are JSON strings

### Prisma
- All upserts use `@@unique` constraints — never manually check existence then insert
- Never call `prisma.$queryRaw` in MVP
- Run `prisma generate` after every schema change
- Migrations go through `prisma migrate dev`, never `db push` in production

### Redis
- Always use `setex` (with TTL), never `set` without expiry
- Catch Redis errors and fall through to Postgres — cache failure must not crash the API
- Use the shared `redis` singleton from `packages/shared/src/redis/client.ts`

### Error Handling
- API returns structured JSON errors: `{ error: string, code: string, statusCode: number }`
- Workers log errors and continue processing — a single bad message must not kill the consumer
- Use retry logic with exponential backoff on GitHub API calls

---

## Evaluation Pipeline

The evaluation pipeline is non-negotiable. It is what makes Vektor a measurable system.

**Method:** Take closed issues with a known `assigneeId`. Hide the assignee. Ask the recommendation engine to rank contributors for that issue. Check what rank the actual assignee landed at.

**Metrics to compute and persist:**
- `top1Accuracy` — actual assignee was rank 1
- `top3Accuracy` — actual assignee was in top 3
- `top5HitRate` — actual assignee was in top 5
- `mrr` — mean reciprocal rank

**Store results in `EvaluationResult` table after every run.**

Target baselines (first run, not requirements):
- Top-3 Accuracy > 0.30
- MRR > 0.20

---

## Local Development

### Start infrastructure
```bash
docker compose up -d postgres redis redpanda
docker compose ps    # all should show 'healthy'
```

### Open tools
```bash
npx prisma studio                  # database GUI → localhost:5555
open http://localhost:8080         # Redpanda Console (Kafka UI)
```

### Run services
```bash
npm run dev:api                    # Fastify API → localhost:3000
npm run dev:ingestion              # GitHub ingestion worker
npm run dev:feature-worker         # Kafka → Postgres feature worker
```

### Database
```bash
npx prisma migrate dev --name <name>   # create new migration
npx prisma generate                    # regenerate client after schema change
npx prisma migrate reset               # wipe and replay all migrations (destructive)
```

### Kafka
```bash
# List topics
docker compose exec redpanda rpk topic list

# Create topics (run once on fresh setup)
docker compose exec redpanda rpk topic create github.commits --partitions 4
docker compose exec redpanda rpk topic create github.issues --partitions 4
docker compose exec redpanda rpk topic create github.pull_requests --partitions 4
docker compose exec redpanda rpk topic create github.contributors --partitions 2
docker compose exec redpanda rpk topic create features.updated --partitions 2

# Consume a topic (debug)
docker compose exec redpanda rpk topic consume github.commits --num 5
```

### Scripts
```bash
npx tsx scripts/ingest-once.ts     # manually trigger one full ingestion run
npx tsx scripts/seed.ts            # load test data into DB
npx tsx scripts/run-eval.ts        # run offline evaluation, print + persist metrics
```

### Redis
```bash
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli KEYS "*"
docker compose exec redis redis-cli FLUSHALL    # clear all cache (safe in dev)
```

---

## Build Phases

Work in this order. Do not skip phases. Each phase has a verification gate.

### Phase 1 — Infrastructure + Schema
**Goal:** Postgres, Redis, Redpanda running. Prisma schema migrated. Kafka topics created.
**Verify:** `docker compose ps` shows all healthy. `npx prisma studio` shows all tables.

### Phase 2 — Shared Package + Service Scaffolding
**Goal:** `packages/shared` built with all types, schemas, Zod validators, Kafka client, Redis client, env config. All service folders scaffolded with package.json.
**Verify:** `tsc --noEmit` in `packages/shared` passes with zero errors.

### Phase 3 — Ingestion Service
**Goal:** GitHub API → Kafka working. Commits, issues, PRs, contributors ingested and published.
**Verify:** `npx tsx scripts/ingest-once.ts` → rows appear in `Commit`, `Issue`, `PullRequest` tables. `rpk topic consume github.commits --num 1` returns valid JSON.

### Phase 4 — Feature Processing Worker
**Goal:** Kafka events → `ContributorFeatureProfile` and `IssueFeatureProfile` rows in Postgres.
**Verify:** Feature profile tables have rows. `expertiseVector` contains domain keys with float values.

### Phase 5 — Recommendation Service
**Goal:** Scoring engine working. `getRecommendations(contributorId, repoId)` returns ranked issues. Redis caching active.
**Verify:** `curl localhost:3000/contributors/ID/recommendations?repoId=ID` returns JSON array. Second request has `X-Cache: HIT`.

### Phase 6 — API Service
**Goal:** All 3 endpoints returning data. Health check passing. Rate limiting active.
**Verify:** `curl localhost:3000/health` → `{ status: 'ok' }`. All endpoints return 200 with correct shape.

### Phase 7 — Evaluation Pipeline
**Goal:** `run-eval.ts` prints Top-1/3/5 and MRR metrics. Results saved to `EvaluationResult` table.
**Verify:** Metrics print to console. Row appears in `EvaluationResult` table.

---

## Common Mistakes to Avoid

- **Do not use `db push` for schema changes in anything resembling production.** Always use `migrate dev`.
- **Do not call `process.env` directly.** Always use the validated `env` object from `config/env.ts`.
- **Do not add workload penalty to the scorer.** It's Phase 2 and requires a workload model that doesn't exist yet.
- **Do not insert without upsert.** GitHub events can be reprocessed. All DB writes must be idempotent.
- **Do not cache without TTL.** Every `redis.set` must be `redis.setex`.
- **Do not let a bad Kafka message crash the consumer.** Catch, log, and continue.
- **Do not put domain mapping logic anywhere except `domain-map.ts`.** One place, used everywhere.
- **Do not add new Kafka topics without updating this file and the docker-compose topic creation commands.**

---

## Phase 2 Preview (Do Not Build Yet)

When MVP is working and evaluated:

1. **Issue → Contributor recommendation** — reverse the scorer, rank contributors per issue
2. **TF-IDF text similarity** — Python worker, scikit-learn, adds 0.20 weight to scorer
3. **Workload analyzer** — track open issues per contributor, add workload_penalty
4. **Issue difficulty estimation** — label heuristics + body length signals
5. **pgvector embeddings** — replace TF-IDF with dense vectors, requires pgvector extension

---

## Project Metadata

- **Project name:** Vektor
- **Type:** Distributed event-driven platform
- **Stack type:** TypeScript monorepo, npm workspaces
- **Primary language:** TypeScript (Node.js), Python (ML workers)
- **Minimum Node version:** 20 LTS
- **Docker required:** Yes, for local Postgres / Redis / Redpanda
- **GitHub PAT required:** Yes, with `repo` and `read:user` scopes

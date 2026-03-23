# Vektor — Build Progress Summary

> Read this file at the start of every session. It is the single source of truth for what has been built, what works, and what is next.

---

## Current Status: Phases 1–7 Complete ✅ — MVP DONE + Dashboard Built

---

## What Has Been Built

### Session 1 — 2026-03-23

#### Phase 1 — Infrastructure ✅
- Docker Compose running with 3 healthy containers:
  - **Postgres 16** → `localhost:5433` ⚠️ remapped (local Postgres occupies 5432)
  - **Redis 7** → `localhost:6379`
  - **Redpanda (Kafka)** → `localhost:19092` (external), `localhost:9092` (internal Docker only)
- Prisma migration applied: `20260323191053_init` — all 9 tables in `vektor` DB
- All 5 Kafka topics created with correct partition counts

#### Phase 2 — Shared Package + Scaffolding ✅
- `packages/shared` — types, Zod schemas, math utils, domain-map, Kafka/Redis clients, env config
- All 5 services scaffolded with full skeleton implementations
- `tsc --noEmit` on shared passes with 0 errors

#### Phase 3 — Ingestion Service ✅
- `npx tsx scripts/ingest-once.ts` runs successfully
- Upserts Repository in Postgres first to get internal cuid, then uses it in all Kafka events
- Tested against `AbdullahAlAmaan/wataihacks`: ingested 1 repo, 3 contributors, 18 commits
- Published to all Kafka topics correctly

#### Phase 4 — Feature Worker ✅
- Kafka consumer processes all 4 topics (`contributors`, `commits`, `issues`, `pull_requests`)
- Contributor handler: upserts Contributor rows, validates repoId before connecting
- Commit handler: resolves GitHub username → Vektor internal contributorId before writing
- EMA domain score updates working; `recencyScore` correctly updating (e.g. 0.9996)
- DB after full run: 1 repo, 3 contributors, 18 commits, 6 ContributorFeatureProfiles
- Note: `expertiseVector` is `{}` for test repo because file paths don't match domain patterns — expected for a hackathon repo

#### Phase 5 — API + Recommendations ✅
- Fastify API starts and serves all 3 endpoints
- `GET /health` → `{ status: "ok", checks: { db: "ok", redis: "ok", kafka: "ok" } }`
- `GET /contributors/:id/profile` → 200, returns contributor + featureProfiles
- `GET /contributors/:id/recommendations?repoId=` → 200, `X-Cache: HIT` on 2nd request ✅
- `GET /repos/:id/contributors` → 200, returns contributors with profiles
- Recommendations return `[]` for test repo — correct, no issues exist to rank against
- Redis caching confirmed: 16ms → 1.8ms on 2nd request, `X-Cache: HIT` header present

---

## Live Data (test repo: AbdullahAlAmaan/wataihacks)

| Table | Count |
|---|---|
| Repository | 1 |
| Contributor | 3 (AbdullahAlAmaan, maxVeremchuk, hr729) |
| Commit | 18 |
| ContributorFeatureProfile | 6 (3 contributors × 2 runs — duplicates from retry) |
| Issue | 0 — test repo has no issues |
| PullRequest | 0 — test repo has no PRs |

Key IDs (needed for API calls):
- Repo ID: `cmn3l7awv0000w7ui7xqxxynt`
- AbdullahAlAmaan contributor ID: `cmn3l9y5p0003cfrf7sn042lx`

---

## File Structure

```
vektor/
├── package.json              # npm workspaces root
├── tsconfig.base.json
├── .nvmrc                    # Node 20
├── .env                      # local config — NOT committed (.gitignore ✅)
├── .env.example              # template (DATABASE_URL uses port 5433)
├── .gitignore                # .env, node_modules, dist, etc.
├── .eslintrc.cjs
├── .prettierrc
├── docker-compose.yml        # postgres:5433, redis:6379, redpanda:19092
├── docker-compose.test.yml
├── SUMMARY.md                # this file
├── prisma/
│   ├── schema.prisma         # 9 models
│   └── migrations/20260323191053_init/
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts                    # barrel — exports everything incl. kafka + redis
│           ├── types/index.ts
│           ├── schemas/                    # 6 Zod event schemas
│           ├── utils/domain-map.ts         # CANONICAL domain mapping
│           ├── utils/math.ts               # cosine similarity, dot product
│           ├── utils/recency.ts            # EMA, recency alignment, freshness bonus
│           ├── kafka/client.ts             # singleton + TOPICS
│           ├── redis/client.ts             # singleton + CACHE_KEYS + TTLs
│           └── config/env.ts              # dotenv + Zod validation (crashes on missing vars)
├── services/
│   ├── ingestion/
│   │   └── src/
│   │       ├── ingest.ts                   # upserts repo first, then fetches + publishes
│   │       ├── github-client.ts            # Octokit with rate-limit retry
│   │       ├── scheduler.ts               # hourly runner
│   │       ├── publisher.ts               # Kafka producer (acks: all)
│   │       └── normalizers/               # commit / issue / pr / contributor
│   ├── feature-worker/
│   │   └── src/
│   │       ├── index.ts                   # consumer: contributors → commits → issues → PRs
│   │       ├── handlers/contributor.handler.ts  # upserts Contributor, validates repoId
│   │       ├── handlers/commit.handler.ts       # resolves username→id, EMA update
│   │       ├── handlers/issue.handler.ts        # label vector upsert
│   │       └── handlers/pr.handler.ts           # EMA with signal 0.5/1.0
│   ├── recommendation/
│   │   └── src/
│   │       ├── scorer.ts                  # weighted formula v1
│   │       ├── ranker.ts                  # scores all open issues, top-N
│   │       └── cache.ts                   # Redis get/set/invalidate
│   ├── api/
│   │   └── src/
│   │       ├── index.ts                   # Fastify server on API_PORT
│   │       ├── routes/health.ts           # GET /health
│   │       ├── routes/contributors.ts     # GET /:id/profile, GET /:id/recommendations
│   │       └── routes/repos.ts            # GET /:id/contributors
│   └── evaluation/
│       └── src/
│           ├── runner.ts                  # leave-one-out over closed issues
│           └── metrics.ts                 # Top-1/3/5 + MRR
├── ml/                        # Python TF-IDF workers (Phase 2 — NOT built yet)
└── scripts/
    ├── seed.ts
    ├── ingest-once.ts
    └── run-eval.ts
```

---

## Known Issues / TODOs

- [ ] **Duplicate ContributorFeatureProfile rows** — 6 profiles for 3 contributors because ingestion ran twice (once with empty repoId, once with real ID). The `@@unique([contributorId, repoId])` constraint should prevent dupes going forward; the extras can be cleaned with `prisma studio` or a migration.
- [ ] **`services/api` imports recommendation service directly** — `import { getRanker } from '@vektor/recommendation/src/ranker'` works with `tsx` but will need tsconfig path aliases if compiled to CJS.
- [ ] **`TimeoutNegativeWarning`** — harmless; caused by `RECOMMENDATION_CACHE_TTL` env var being read before dotenv populates it in some code paths. Suppress with `NODE_OPTIONS=--no-warnings` or fix import order.
- [ ] **`version` field in docker-compose.yml** — obsolete in Compose v2, causes harmless warning. Remove when convenient.
- [ ] **Evaluation needs a richer dataset** — test repo has no issues/PRs, so `run-eval.ts` will throw "No closed issues with assignees found". Need to point at a real OSS repo (e.g. `facebook/react`) for meaningful eval.
- [ ] **Domain vectors are empty** — `wataihacks` file paths don't match any regex in `domain-map.ts`. Normal for a hackathon repo. Will populate correctly on a real OSS repo.

---

## Environment Notes

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://vektor:vektor_dev@localhost:5433/vektor` | Port 5433 (5432 taken) |
| `REDIS_URL` | `redis://localhost:6379` | |
| `KAFKA_BROKERS` | `localhost:19092` | External Redpanda port |
| `GITHUB_REPO_OWNER` | `AbdullahAlAmaan` | Change to target OSS repo |
| `GITHUB_REPO_NAME` | `wataihacks` | Change to target OSS repo |

---

## Scoring Formula (v1)

```
score = 0.35 × domain_match          (cosine similarity — domainScores vs issue domainTags)
      + 0.25 × label_affinity_match  (dot product — labelAffinity vs issue labelVector)
      + 0.15 × recency_alignment     (exp decay — contributorRecency × e^(-ageDays/30))
      + 0.05 × freshness_bonus       (1 if issue < 7 days old, else 0)
// text_similarity weight (0.20) → Phase 2 (Python TF-IDF worker)
// workload_penalty → Phase 2, DO NOT add now
```

---

#### Phase 6 & 7 — Evaluation Pipeline ✅
- Fixed evaluation runner to score contributors directly against closed issues (not via ranker which only sees open issues)
- Fixed `issue.handler.ts` to resolve GitHub username → Vektor internal ID for `assigneeId`
- Fixed `pr.handler.ts` to resolve GitHub username → Vektor internal ID for `contributorId`
- Re-pointed at `expressjs/express` (real OSS repo with issue assignment history)
- Ingested: 322 contributors, 6135 commits, 4030 issues, 2414 PRs
- After feature worker: 396 closed issues with assignees, 616 PRs, 328 contributor profiles, 3794 issue profiles

**Evaluation results on expressjs/express (sample: 396 closed issues):**

| Metric | Result | Target | Status |
|---|---|---|---|
| Top-1 Accuracy | **41.2%** | — | |
| Top-3 Accuracy | **80.6%** | > 30% | ✅ 2.7× target |
| Top-5 Hit Rate | **86.4%** | — | |
| MRR | **0.5670** | > 0.20 | ✅ 2.8× target |

Results persisted to `EvaluationResult` table.

---

## Current Dataset (expressjs/express)

| Table | Count |
|---|---|
| Repository | 2 (wataihacks + express) |
| Contributor | 325 |
| Commit | 6001 |
| Issue | 4030 |
| PullRequest | 616 |
| ContributorFeatureProfile | 328 |
| IssueFeatureProfile | 3794 |
| EvaluationResult | 1 |

---

#### Session 2 — 2026-03-23 — Dashboard + Evaluation API ✅

**New: `services/dashboard/` — Next.js 14 App Router (port 3001)**

A read-only monitoring dashboard built on top of the existing API. Pages:

- `/` — Overview: system health checks (Postgres, Redis, Kafka), KPI cards (Top-3 Accuracy, MRR, contributors, issues), contributor leaderboard, animated metric counters
- `/contributors` — Contributor list with expertise summaries
- `/contributors/[id]` — Individual contributor profile: expertise radar chart, label affinities, recommendation feed
- `/evaluation` — Evaluation history: table of all `EvaluationResult` runs with Top-1/3/5 and MRR metrics

**New: `services/api/src/routes/evaluation.ts`**
- `GET /evaluation/results` — returns last 50 eval runs from `EvaluationResult` table, newest first
- Registered in `services/api/src/index.ts` at prefix `/evaluation`

**Dashboard tech:**
- Next.js 14 App Router (server + client components)
- Tailwind CSS, Recharts (charts), Framer Motion (animations), Lucide React (icons)
- Fetches from API at `localhost:3000`
- Key RSC lesson: pass rendered JSX elements as props to client components, not component functions (RSC serialization constraint)

**How to run the full stack:**
```bash
# Terminal 1 — infrastructure (already running if docker compose up was run)
docker compose up -d postgres redis redpanda redpanda-console

# Terminal 2 — API
npm run dev:api          # localhost:3000

# Terminal 3 — Dashboard
cd services/dashboard && npm run dev   # localhost:3001

# Optional — Kafka UI
open http://localhost:8080

# Optional — Prisma Studio (DB browser)
npx prisma studio        # localhost:5555
```

---

## Phase 2+ (Not Built — Do Not Start Yet)
- TF-IDF text similarity (Python ML worker, adds 0.20 weight)
- Issue → Contributor recommendation (reverse scorer)
- Workload penalty
- pgvector embeddings

---

## Restart Checklist (after reboot)
```bash
cd /Users/abdullahalamaan/Documents/GitHub/Vektor
docker compose up -d postgres redis redpanda redpanda-console
docker compose ps   # wait for all 'healthy'

# Terminal 1
npm run dev:api                          # API → localhost:3000

# Terminal 2
cd services/dashboard && npm run dev     # Dashboard → localhost:3001
```
No migration needed — data persists in Docker volume `vektor_postgres_data`.

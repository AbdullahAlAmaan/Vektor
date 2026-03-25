# Vektor — Build Progress Summary

> Read this file at the start of every session. It is the single source of truth for what has been built, what works, and what is next.

---

## Current Status: Phases 2–6 Complete ✅ — Full Post-MVP Feature Stack

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

#### Session 3 — 2026-03-25 — Phase 2: TF-IDF Text Similarity ✅

**TF-IDF ML Worker — wired into recommendation pipeline**

- Added `compute_tfidf_batch()` to `ml/src/tfidf.py` — fits one vectorizer over full corpus (contributor + all issues), returns all similarities in a single call (O(1) network trips vs O(N) for pairwise)
- Added `POST /score/tfidf/batch` endpoint to `ml/src/scorer.py`
- Added `ml-scorer` Docker service to `docker-compose.yml` (port 8000, builds from `ml/`)
- Added `ML_SCORER_URL` env var (default `http://localhost:8000`) to `env.ts` + `.env.example`
- Created `services/recommendation/src/ml-client.ts`:
  - `batchTfidfSimilarity(contributorText, issueTexts)` — HTTP client with 5s timeout + graceful fallback to 0 on failure
  - `buildContributorText(commitMessages)` — concatenates last 200 commit messages
  - `buildIssueText(title, body)` — joins issue title + body
- Updated `scorer.ts` (v2): added `TEXT_SIMILARITY: 0.20` weight — scoring formula now sums to 1.00
  - `textSimilarity` param defaults to 0 (backward-compatible — eval runner uses 0 without ML service)
- Updated `ranker.ts`: fetches contributor's last 200 commit messages, builds issue texts, calls ML batch endpoint, passes similarities to scorer
- Updated `RankedIssue.breakdown` type to include `textSimilarity: number` (shared types + dashboard API types)
- Updated dashboard `/contributors/[id]` page to display `text` column in recommendation breakdown

**Scoring formula (v2):**
```
score = 0.35 × domain_match          (cosine similarity)
      + 0.25 × label_affinity_match  (dot product)
      + 0.20 × text_similarity       (TF-IDF cosine — NEW)
      + 0.15 × recency_alignment     (exp decay)
      + 0.05 × freshness_bonus
```

**How to start the ML scorer:**
```bash
# Option 1 — Docker (recommended)
docker compose up -d ml-scorer
# Verify: curl http://localhost:8000/health

# Option 2 — local Python
cd ml && pip install -r requirements.txt
uvicorn src.scorer:app --port 8000
```

#### Phase 3 — Issue → Contributor Recommendation ✅

- Added `RankedContributor` type to `packages/shared/src/types/index.ts`
- Added `issueRecommendations` cache key + `ISSUE_RECOMMENDATIONS` TTL to shared Redis client
- Added `getIssueContributors(issueId, repoId, topN)` to `services/recommendation/src/ranker.ts`:
  - Fetches issue feature profile and all contributor profiles for the repo
  - Builds each contributor's commit corpus (last 200 messages) in one query via `corpusMap`
  - One batch TF-IDF call: issue text as "contributor", all contributor corpora as "issues" (cosine symmetry)
  - Applies workload penalty per contributor from a single `groupBy` query
- Added `getCachedIssueRecommendations` / `setCachedIssueRecommendations` to `cache.ts`
- Created `services/api/src/routes/issues.ts` — `GET /issues/:id/recommendations?limit=10`
- Registered at prefix `/issues` in `services/api/src/index.ts`
- Fixed pre-existing bug: `evaluation.ts` was ordering by `createdAt` (wrong) → corrected to `runAt`

**Verified:**
- `GET /issues/:id/recommendations` returns ranked contributors with full breakdown
- `X-Cache: HIT` on second request confirmed
- Workload penalty visible: contributor with 1 open issue shows `workloadPenalty: 0.04`

#### Phase 4 — Workload Penalty ✅

- Updated `services/recommendation/src/scorer.ts` (v3):
  - Added `openIssueCount` param (default 0 — backward-compatible)
  - `workloadPenalty = min(openIssues × 0.04, 0.40)` — 4% reduction per open issue, capped at 40%
  - Applied multiplicatively: `total = rawScore × (1 - workloadPenalty)` — preserves ranking stability
  - Added `workloadPenalty` field to the returned breakdown
- Updated `RankedIssue.breakdown` and `RankedContributor.breakdown` to include `workloadPenalty: number`
- Both ranker methods (`getRecommendations` + `getIssueContributors`) query open issue counts and pass to scorer
- Dashboard `RankedIssue` type updated

**Scoring formula (v3 — final):**
```
rawScore = 0.35 × domain_match
         + 0.25 × label_affinity_match
         + 0.20 × text_similarity        (TF-IDF)
         + 0.15 × recency_alignment
         + 0.05 × freshness_bonus
finalScore = rawScore × (1 − workloadPenalty)
workloadPenalty = min(openIssues × 0.04, 0.40)
```

**New API endpoint:**
```
GET /issues/:id/recommendations?limit=10
→ Returns RankedContributor[] — who should be assigned this issue
```

#### Phase 5 — Issue Difficulty Estimation ✅

- Added `computeComplexityHint(labels, body)` to `services/feature-worker/src/handlers/issue.handler.ts`
  - Label heuristics: "good first issue", "beginner", "trivial" → `easy`; "breaking", "security", "performance" → `hard`
  - Body length fallback: < 300 chars → easy, > 1200 → hard, else medium
  - Stored in `IssueFeatureProfile.complexityHint` (column already existed in schema)
- Added `complexityHint: string | null` to `RankedIssue` type — returned with every recommendation
- Updated `getRecommendations()` to accept optional `difficulty?: 'easy'|'medium'|'hard'` filter
  - Passes filter into the Prisma `where` clause — no extra query, zero perf cost
  - Difficulty-filtered responses bypass Redis cache (they're a subset, not the full result)
- Updated `GET /contributors/:id/recommendations` to accept `?difficulty=easy|medium|hard`
- Created `scripts/backfill-complexity.ts` — populated all 3794 existing issue profiles
  - Distribution: **easy=1374, medium=1798, hard=622**

**Verified:** `?difficulty=easy` returns only issues with `complexityHint: "easy"` ✅

#### Phase 6 — pgvector Dense Embeddings ✅

**Infrastructure:**
- Updated `docker-compose.yml` postgres to `pgvector/pgvector:pg16` (drop-in, data volume preserved)
- Added `sentence-transformers==2.6.1` to `ml/requirements.txt` (model: `all-MiniLM-L6-v2`, 384 dims)
- Created `ml/src/embedder.py` — singleton model loader + `embed_text` / `embed_texts` functions
- Added `POST /embed` and `POST /embed/batch` endpoints to `ml/src/scorer.py`
- Created `scripts/enable-pgvector.ts` — enables `vector` extension, adds `embedding vector(384)` columns, creates IVFFlat indexes
- Created `scripts/generate-embeddings.ts` — batches 64 texts per ML call, stores via `$executeRawUnsafe`

**TypeScript integration:**
- Created `services/recommendation/src/embed-client.ts` — `getEmbedding`, `batchEmbeddings`, `vectorSimilarity`, `toVectorLiteral`
- Updated `services/recommendation/src/ranker.ts`:
  - `getRecommendations`: checks if contributor has embedding → uses pgvector cosine (`<=>`) → falls back to TF-IDF
  - `getIssueContributors`: checks if any contributor has embedding → uses pgvector → falls back to TF-IDF
  - Fallback is automatic and silent — old data always works

**Embedding generation results:**
- 3794 issue profiles embedded ✅
- 328 contributor profiles embedded ✅

**Verified:** pgvector ANN query returns top-3 contributors with cosine similarities (0.51, 0.47, 0.43) ✅

**How to run for a fresh dataset:**
```bash
npx tsx scripts/enable-pgvector.ts     # once per DB
npx tsx scripts/generate-embeddings.ts  # after each ingestion run
```

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

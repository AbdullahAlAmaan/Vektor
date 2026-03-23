# Vektor — Build Progress Summary

> Read this file at the start of every session. It is the single source of truth for what has been built, what works, and what is next.

---

## Current Status: Phase 1 Complete ✅

---

## What Has Been Built

### Session 1 — 2026-03-23

#### Infrastructure (Phase 1) ✅
- Docker Compose running with 3 healthy containers:
  - **Postgres 16** → `localhost:5433` (remapped from 5432 — local Postgres already occupied that port)
  - **Redis 7** → `localhost:6379`
  - **Redpanda (Kafka)** → `localhost:9092`, console at `localhost:8080`
- Prisma migration applied: `20260323191053_init` — all 9 tables created in `vektor` DB
- All 5 Kafka topics created:
  - `github.commits` (4 partitions)
  - `github.issues` (4 partitions)
  - `github.pull_requests` (4 partitions)
  - `github.contributors` (2 partitions)
  - `features.updated` (2 partitions)

#### Full Project Skeleton (Phase 2 scaffold) ✅
62 files written across the monorepo. Structure:

```
vektor/
├── package.json              # npm workspaces root
├── tsconfig.base.json
├── .nvmrc                    # Node 20
├── .env                      # local config (not committed)
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── docker-compose.yml
├── docker-compose.test.yml
├── prisma/
│   ├── schema.prisma         # 9 models — fully defined
│   └── migrations/
│       └── 20260323191053_init/migration.sql
├── packages/
│   └── shared/               # ✅ tsc --noEmit passes (0 errors)
│       └── src/
│           ├── index.ts
│           ├── types/index.ts          # all domain types
│           ├── schemas/                # 5 Zod event schemas
│           │   ├── base-event.schema.ts
│           │   ├── commit-event.schema.ts
│           │   ├── issue-event.schema.ts
│           │   ├── pr-event.schema.ts
│           │   ├── contributor-event.schema.ts
│           │   └── features-updated.schema.ts
│           ├── utils/
│           │   ├── domain-map.ts       # canonical file→domain mapping
│           │   ├── math.ts             # cosine similarity, dot product
│           │   └── recency.ts          # EMA update, recency alignment, freshness bonus
│           ├── kafka/client.ts         # Kafka singleton + TOPICS constants
│           ├── redis/client.ts         # Redis singleton + CACHE_KEYS + TTLs
│           └── config/env.ts           # Zod-validated env (crashes on bad config)
├── services/
│   ├── ingestion/            # GitHub API → Kafka (skeleton done)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── github-client.ts        # Octokit with rate-limit retry
│   │       ├── scheduler.ts            # hourly interval runner
│   │       ├── ingest.ts               # orchestrates full repo ingestion
│   │       ├── publisher.ts            # Kafka producer (acks: all)
│   │       └── normalizers/            # 4 normalizers (commit/issue/PR/contributor)
│   ├── feature-worker/       # Kafka → Postgres feature profiles (skeleton done)
│   │   └── src/
│   │       ├── index.ts                # Kafka consumer, routes by topic
│   │       ├── handlers/
│   │       │   ├── commit.handler.ts   # EMA domain score update
│   │       │   ├── issue.handler.ts    # label vector upsert
│   │       │   └── pr.handler.ts       # EMA update with signal=0.5/1.0
│   │       └── profile-updater.ts      # publishes features.updated event
│   ├── recommendation/       # Scoring engine (skeleton done)
│   │   └── src/
│   │       ├── index.ts                # listens to features.updated, invalidates cache
│   │       ├── scorer.ts               # weighted formula v1 (domain+label+recency+freshness)
│   │       ├── ranker.ts               # fetches profiles, scores all open issues, top-N
│   │       └── cache.ts                # Redis get/set/invalidate
│   ├── api/                  # Fastify HTTP server (skeleton done)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── health.ts           # GET /health
│   │       │   ├── contributors.ts     # GET /:id/profile, GET /:id/recommendations
│   │       │   └── repos.ts            # GET /:id/contributors
│   │       └── middleware/error-handler.ts
│   └── evaluation/           # Offline eval pipeline (skeleton done)
│       └── src/
│           ├── index.ts
│           ├── runner.ts               # leave-one-out over closed issues
│           └── metrics.ts              # Top-1/3/5 accuracy + MRR
├── ml/                       # Python TF-IDF workers (Phase 2, skeleton done)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       ├── scorer.py                   # FastAPI /score/tfidf endpoint
│       ├── tfidf.py                    # sklearn TF-IDF cosine similarity
│       └── eval.py                     # MRR + Top-K utilities
└── scripts/
    ├── seed.ts               # loads test repo + contributor into DB
    ├── ingest-once.ts        # manually triggers one full GitHub ingestion
    └── run-eval.ts           # runs evaluation, prints + persists metrics
```

---

## Known Issues / TODOs

- [ ] `services/api/src/routes/contributors.ts` imports `@vektor/recommendation/src/ranker` and `@vektor/recommendation/src/cache` directly — this works with `tsx` but will need path aliasing or barrel exports if compiled. Fine for now.
- [ ] `.env` has a placeholder `GITHUB_TOKEN=ghp_xxxx` — **must be replaced with a real PAT** before `ingest-once.ts` will work.
- [ ] `docker-compose.yml` `version` field is obsolete (harmless warning from Docker Compose v2 — can be removed).
- [ ] npm audit shows 5 vulnerabilities (4 moderate, 1 high) — all in dev deps, not blocking.

---

## Environment Notes

- **Postgres port is 5433** (not the default 5432) — local Postgres was already on 5432.
- `DATABASE_URL` in `.env` reflects this: `postgresql://vektor:vektor_dev@localhost:5433/vektor`
- Docker containers: `vektor-postgres-1`, `vektor-redis-1`, `vektor-redpanda-1`

---

## Next Steps (in order)

### Immediate
1. **Add real GitHub token** — edit `.env`, set `GITHUB_TOKEN=ghp_your_real_token`
   - Also set `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` to the target repo

2. **Phase 3 — Test ingestion**
   ```bash
   npx tsx scripts/ingest-once.ts
   ```
   Verify: rows appear in `Commit`, `Issue`, `PullRequest` tables (check via `npx prisma studio`)

3. **Phase 4 — Test feature worker**
   ```bash
   npm run dev:feature-worker
   ```
   Verify: `ContributorFeatureProfile` and `IssueFeatureProfile` rows appear with populated vectors

4. **Phase 5 — Test recommendation service + API**
   ```bash
   npm run dev:api
   curl localhost:3000/health
   curl "localhost:3000/contributors/<id>/recommendations?repoId=<id>"
   # Second request should return X-Cache: HIT
   ```

5. **Phase 6 — Run evaluation**
   ```bash
   npx tsx scripts/run-eval.ts
   ```
   Target: Top-3 Accuracy > 0.30, MRR > 0.20

---

## Scoring Formula Reference (v1)

```
score = 0.35 × domain_match          (cosine similarity of domain vectors)
      + 0.25 × label_affinity_match  (dot product of label affinity vs issue labels)
      + 0.15 × recency_alignment     (exp decay on issue age vs contributor recency)
      + 0.05 × freshness_bonus       (1 if issue < 7 days old, else 0)
// text_similarity (0.20) → Phase 2
// workload_penalty → Phase 2, do NOT add
```

---

## How to Restart Infrastructure (after reboot)

```bash
cd /Users/abdullahalamaan/Documents/GitHub/Vektor
docker compose up -d postgres redis redpanda
docker compose ps   # all should show 'healthy'
```
No migration needed — data persists in the `vektor_postgres_data` Docker volume.

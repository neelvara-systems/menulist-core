# Knowledge Base Embedding 2 Migration Validation

> **Date:** 2026-07-13
> **Scope:** Answerlattice RAG embedding-space migration
> **Status:** Source gates passed; Firebase deployment and live corpus evidence are recorded below

## Required invariants

1. `gemini-embedding-001` and `gemini-embedding-2` vectors never share a query/index path.
2. Active query and document vectors use `gemini-embedding-2`, 768 dimensions, `embeddingV2`, and cache version `gemini-embedding-2:768:v2` together.
3. Embedding 2 query content is `task: question answering | query: ...`; document content is `title: ... | text: ...`; v2 requests omit legacy `taskType`.
4. New/changed articles require v2. A valid same-source legacy vector is preserved; missing/stale rollback coverage is best-effort dual-written without making legacy failure fatal.
5. The backfill is cursor-based, idempotent, published/active-only, limited to 100 articles per scheduler run, and uses provider concurrency 3.
6. Query traffic switches only with an app deployment containing both the v2 query formatter and the `embeddingV2` Firestore vector field. Rollback uses the preceding app deployment plus retained v1 vectors/index.

## Source evidence

| Boundary | Source |
| --- | --- |
| Versioned registry and provider request format | `src/data/shared/answerlatticeEmbedding.ts` and byte-identical Functions mirrors |
| Root query generation and metadata | `src/lib/vectorEmbeddings/index.ts` |
| Active vector search field and versioned cache key | `src/lib/search/searchCore.ts` |
| Root article persistence and dual-write | `src/lib/answerlattice/articleEmbeddingServer.ts` |
| Dedicated Functions persistence and dual-write | `functions-answerlattice/src/logic/articleEmbedding.ts`, `functions-answerlattice/src/logic/startGeneration.ts` |
| Bounded backfill and durable state | `functions-answerlattice/src/answerlattice/embeddingV2Migration.ts` |
| Existing scheduler ownership | `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` |
| v1/v2 vector indexes | `firestore-answerlattice.indexes.json` |

## Local verification

| Gate | Result |
| --- | --- |
| `npm run test:answerlattice-embedding-vector-boundary` | Passed |
| `npm run test:answerlattice-retrieval-contracts` | Passed |
| `node scripts/verification/verify-answerlattice-runtime-truth.js` | Passed |
| `npm --prefix functions-answerlattice run build` | Passed |
| `npm --prefix functions run build` | Passed |
| `npx tsc --noEmit --incremental false --pretty false` | Passed |
| `npm run verify:answerlattice-runtime-truth` | Passed, including Firestore/Storage rule suites and all child runtime contracts |
| `npm run verify:dependency-freeze` | Passed; all Functions packages remain on the frozen dependency set and Node.js 22 runtime declarations |
| `npm run verify:ai-accounting` | Passed, including provider usage and image accounting/cache boundaries |
| `npm run docs:check-links` | Passed with zero broken links and zero naming violations |
| `git diff --check` | Passed |

## Firebase rollout evidence

| Step | Target | Result |
| --- | --- | --- |
| Deploy v2 index | `answerlattice-qa` | Blocked before upload: Firebaserules `projects/answerlattice-qa:test` returned HTTP 403 for the active CLI account |
| Deploy v2 index | `answerlattice` | Blocked before upload: Firebaserules `projects/answerlattice:test` returned HTTP 403 for the active CLI account |
| Deploy dedicated Functions | `answerlattice-qa` | Not attempted after the same project-access blocker was confirmed |
| Deploy dedicated Functions | `answerlattice` | Not attempted after the same project-access blocker was confirmed |
| Run/observe `embedding_v2_migration` | production | Blocked until index and Functions deploy succeed |
| Confirm state document `status=completed` and current cache version | production | Blocked until migration can run |

Blocked commands:

```bash
firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:indexes --non-interactive
firebase deploy --project answerlattice --config firebase-answerlattice.json --only firestore:indexes --non-interactive
```

## Cutover and rollback stop rules

- Do not deploy the app-side v2 query cutover until the production v2 vector index is ready and the migration state is complete.
- Do not retire `embedding`, its vector index, or v1 metadata in this migration session.
- If live v2 retrieval cannot be compared against approved Answer Test cases or known support queries, keep the app deployment pending.
- If the active app is deployed and retrieval quality regresses, roll back the app deployment; the retained v1 vectors/index remain the rollback surface.
- Vercel deployment is not implied by Firebase deployment and requires explicit user authorization in the active session.

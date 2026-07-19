# Knowledge Base Pre-Launch Embedding Validation

> **Date:** 2026-07-18
> **Scope:** Answerlattice Knowledge Base Feature 5 lifecycle and embedding contract
> **Status:** Local source gates passed; authenticated QA deployment remains externally blocked

## Required invariants

1. Query and article vectors use only `gemini-embedding-2`, 768 dimensions, Firestore field `embedding`, and cache key `gemini-embedding-2:768:v1`.
2. Document content is `title: ... | text: ...`; query content is `task: question answering | query: ...`; requests do not send `taskType`.
3. New and changed articles write one canonical vector with model, dimension, cache, and source-hash metadata.
4. Search uses one scoped `embedding` vector index. The response projection rejects vector fields and allowlists reference data.
5. The source tree contains no retired embedding model, alternate vector field, dual-write helper, migration task, migration-state document, or corpus backfill.
6. Because Answerlattice has no live client corpus, launch uses the normal publish/re-embed lifecycle and requires no one-time data operation.
7. Live article writes and navigation metadata commit atomically; generated-review edits cannot mutate live navigation.
8. Live truth edits remove the old vector before regeneration; search-ready UI requires both embedded status and the active vector.
9. Non-empty categories and sections cannot cascade-delete articles.
10. Article feedback is accepted only for active published content and its audit rows expire after 365 days.

## Source evidence

| Boundary | Source |
| --- | --- |
| Canonical registry and provider request format | `src/data/shared/answerlatticeEmbedding.ts` and byte-identical Functions mirrors |
| Root query generation and metadata | `src/lib/vectorEmbeddings/index.ts` |
| Active vector search field and versioned cache key | `src/lib/search/searchCore.ts` |
| Root article persistence | `src/lib/answerlattice/articleEmbeddingServer.ts` |
| Dedicated/shared Functions persistence | `functions-answerlattice/src/logic/articleEmbedding.ts`, `functions-answerlattice/src/logic/startGeneration.ts`, and shared mirrors |
| Master scheduler without an embedding migration task | `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` |
| Single scoped vector index | `firestore-answerlattice.indexes.json` |
| Reference projection and vector rejection | `src/lib/answerlattice/faqRetrieval.ts` and `src/lib/search/searchCore.ts` |

## Local verification

| Gate | Result |
| --- | --- |
| `npm run test:answerlattice-embedding-vector-boundary` | Passed |
| `npm run test:answerlattice-retrieval-contracts` | Passed |
| `node scripts/verification/verify-answerlattice-runtime-truth.js` | Passed |
| `npm --prefix functions-answerlattice run build` | Passed |
| `npm --prefix functions run build` | Passed |
| `npm run verify:answerlattice-runtime-truth` | Passed, including dedicated/shared Firestore and Storage rule emulators |
| `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-kb-publishing:emulator` | Passed |
| `npm run verify:answerlattice-final-readiness` | Passed |
| `npm run verify:dependency-freeze` | Passed |
| `npm run verify:ai-accounting` | Passed |
| `npm run verify:data-flow-audit-tools` | Passed after canonical manifest/catalog regeneration |
| `npx tsc --noEmit --incremental false --pretty false` | Passed |
| `npx eslint <touched source and verifier files>` | Passed |
| `npm run docs:check-links` | Answerlattice links passed; global scan remains red only for an unrelated missing Owner Ease v1.16 MP4 |
| `git diff --check` | Passed |

## Feature 5 focused verification

| Gate | Result |
| --- | --- |
| `npm run test:answerlattice-kb-category-mutations` | Passed |
| `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-content-feedback:emulator` | Passed, including unpublished rejection and expired-feedback cleanup |
| `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-feedback:rules` | Passed |
| `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-feedback:shared-rules` | Passed |
| `npm run typecheck:answerlattice` | Passed |
| `npm --prefix functions-answerlattice run build` | Passed |
| `npm --prefix functions run build` | Passed |

## Firebase release boundary

Feature 5 changes dedicated Firestore rules, shared compatibility rules, and the existing dedicated nightly retention function. Narrow QA deploys were attempted after local verification:

```bash
firebase deploy --only firestore:rules,functions:answerlattice:answerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive
```

Both commands stopped before upload with `Error: Failed to authenticate, have you run firebase login?`. After Firebase authentication is restored, rerun those exact QA targets, read back the deployed rules/function revision, smoke the hosted article/category lifecycle, and verify one expired feedback row is removed by the existing nightly retention path. Production remains gated on successful QA evidence. No embedding migration or backfill is required.

## Stop rules

- Do not claim the Firebase contract is live without authorized QA deploy and a provider-backed publish/search smoke.
- Do not add a backfill or migration task while no legacy corpus exists.
- Vercel deployment is not implied by Firebase deployment and requires explicit authorization in the active session.

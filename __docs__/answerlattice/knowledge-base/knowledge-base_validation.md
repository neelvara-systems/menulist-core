# Knowledge Base Pre-Launch Embedding Validation

> **Date:** 2026-07-17
> **Scope:** Answerlattice RAG embedding contract
> **Status:** Source gates passed; Firebase deployment is pending a clean source archive and project access

## Required invariants

1. Query and article vectors use only `gemini-embedding-2`, 768 dimensions, Firestore field `embedding`, and cache key `gemini-embedding-2:768:v1`.
2. Document content is `title: ... | text: ...`; query content is `task: question answering | query: ...`; requests do not send `taskType`.
3. New and changed articles write one canonical vector with model, dimension, cache, and source-hash metadata.
4. Search uses one scoped `embedding` vector index. The response projection rejects vector fields and allowlists reference data.
5. The source tree contains no retired embedding model, alternate vector field, dual-write helper, migration task, migration-state document, or corpus backfill.
6. Because Answerlattice has no live client corpus, launch uses the normal publish/re-embed lifecycle and requires no one-time data operation.

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

## Firebase release boundary

No Firebase mutation was attempted from this worktree:

- the current `functions-answerlattice` source archive and Answerlattice index/rule manifests contain unrelated in-progress changes;
- a filtered Functions deploy still uploads and builds the current package archive and its top-level imports;
- the active Firebase CLI account does not expose `answerlattice-qa` or `answerlattice`.

After the embedding patch is isolated in a clean worktree and project access is restored, deploy and smoke QA before production. No migration or backfill command follows deployment.

```bash
firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:indexes --non-interactive
firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only functions:answerlattice:startGeneration,functions:answerlattice:retryGeneration,functions:answerlattice:embedArticleWorker,functions:answerlattice:regenerateEmbedding,functions:answerlattice:answerlatticeNightly,functions:answerlattice:triggerAnswerlatticeNightly --non-interactive
```

Production uses the same targets with `--project answerlattice` only after QA succeeds.

## Stop rules

- Do not deploy from a source archive containing unrelated Answerlattice Functions changes.
- Do not claim the Firebase contract is live without authorized QA deploy and a provider-backed publish/search smoke.
- Do not add a backfill or migration task while no legacy corpus exists.
- Vercel deployment is not implied by Firebase deployment and requires explicit authorization in the active session.

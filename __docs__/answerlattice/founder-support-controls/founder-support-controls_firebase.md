# Founder Support Controls - Firebase And Cost

> **Status:** Binding cost contract

## Storage Model

## Answerlattice Answer Tests Runtime Boundary

The live source contract uses one scoped `platformSummary/answerTests_{tId}_{sId}` document, exact persisted scope checks, normalized release IDs, cheap-first route limiting, and SAFE_MODE for full-runtime runs. The same summary holds at most five 15-minute run reservations so duplicate/in-flight requests cannot repeat provider work; successful runs remove their reservation, failed runs attempt a cleanup transaction, and expired reservations are pruned on the next claim. Summary writes are measured and rejected above 480 KiB. No Answer Tests listener, scheduled run, per-case document, search-history write, signal write, or instant-cache write is added.

| Data | Location | Growth control |
| --- | --- | --- |
| Test cases and last runs | `platformSummary/answerTests_{tId}_{sId}` | 100 cases, 10 compact runs, document-size guard |
| Known issues | Existing `answerlattice_predictiveTriggers` | Existing 500-trigger tenant cap; notices share that cap |
| Known-issue runtime | Existing `platformSummary/predictiveTriggers_{tId}_{sId}` and compiled bundle | Source-hash skip when unchanged |
| Verified-context public key | Existing scoped store document | One active public key; rotation replaces the prior key |
| Evidence links | Existing private widget-search history records | Maximum 3 links; no fetched content |
| Export | HTTP response only | No Firestore export job or Storage artifact |
| Owner assistant | Existing summaries only | No assistant transcript or collection |

## Per-Action Cost

### Load Answer Tests

- 1 read: answer-test summary document.
- No listener.

### Save Test Cases

- 1 transaction read + 1 write on the summary document.
- No per-case documents.

### Canonical-Only Test Run

- 1 answer-test summary read.
- Entity search index reads at most 500 documents once per run; there is no cross-request process cache.
- Latest active release reads 0 or 1 document once per run; there is no cross-request process cache.
- KB source-version lookup uses the existing compact cache-version read once per run.
- Active canonical answers are cached per matched entity for the duration of the run; each unique matched entity uses one bounded query of at most 200 answers.
- 1 transaction read + 1 write to reserve the request ID before execution.
- 1 transaction read + 1 write to save the retained run and remove its reservation.
- A failed run may add 1 transaction read + 1 write to release its reservation.
- No AI operation, search history, signal, feedback, conversation, or friction write.

### Full-Runtime Test Run

- Same retrieval reads as the normal runtime, capped at 10 full-runtime cases within a 25-case run.
- SAFE_MODE is checked before the suite/preload read and provider-capable search path.
- Existing provider and support-credit costs apply only to cases that reach RAG.
- Each provider-backed case uses one stable request/case-definition accounting key. First settlement uses 2 transaction reads and 3 writes to atomically debit the subscription, update the store balance projection, and record operation evidence. A duplicate settlement uses 1 operation read and 0 writes, with no second credit debit.
- Same reservation/finalization writes as canonical-only mode.
- If execution completes but retained-run persistence fails, the 15-minute reservation is preserved to block immediate provider repetition.
- No production analytics or signal writes.

### Release Check

- 1 scoped release read.
- 1 answer-test summary read.
- Runs only matching cases, maximum 25.
- Same reservation/finalization writes as a normal run.

### Rollback Proposal

- 1 canonical-answer read.
- 1 exact audit-history document read for the selected normalized version ID.
- 1 mutation-proposal write.
- 1 audit-log write.

### Known Issue

- Create/update: existing trigger DAL write behavior plus one capped predictive-summary rebuild and existing predictive source-version freshness writes.
- Runtime: no additional Firestore read when the trigger summary or compiled bundle is cached.
- Scheduler: existing predictive maintenance task only; no new scheduled function.

### Verified Context

## Answerlattice Widget Security Runtime Boundary

- Load: dashboard read limiter, permission/store scope read, no write.
- Create/rotate: shared signing-key mutation budget of 3/hour, then 1 exact-scoped store read + 1 merge write.
- Disable: the same 3/hour signing-key mutation budget, then 1 exact-scoped store read + 1 merge write/delete sentinel.
- Evidence hosts: 20 changes/minute, then 1 exact-scoped store read + 1 merge write; maximum 10 exact HTTPS hosts.
- Private key: response only, private/no-store, one-time client modal state, never Firestore/Storage/log state.
- Widget request: no extra Firestore read after widget-key authentication because the public key and host allowlist come from the already-loaded store record. Tenant/store scope is exact-normalized before signed claims are considered.

- Key creation/rotation: 1 scoped store read + 1 write.
- Runtime verification: cryptographic verification in memory after widget-key authentication; the public key comes from the store data already loaded for that request.

### Evidence Links

- No additional document. Links are embedded in an existing private widget-search history write.
- Zero network fetches by Answerlattice.

### Support Truth Export

- Owner-triggered reads only.
- Maximum 2 attempts per user/workspace per hour; the limiter runs before the Firestore-backed permission read.
- Per collection caps: entities 500, canonical answers 1000, surfaces 500, articles 1000, FAQs 1000, 10 changelog page documents / 1000 entries, and releases 500.
- The API fails if a cap is reached, avoiding silent truncation.
- No write, no Storage upload, no scheduler.

### Owner Support Assistant

- A cache miss reads exactly five compact summary documents with one `getAll()` call.
- A 60-second in-process cache makes repeated brief/questions for the same workspace zero-read while warm.
- No detail reads, realtime listener, provider call, background loop, transcript, or assistant analytics collection.

## Scale Rules

- No test case subcollection or per-result write.
- No nightly execution of every test suite.
- Release checks operate on supplied affected entity IDs.
- No per-widget known-issue collection query.
- No external evidence URL fetch.
- Export remains explicit and rate limited.

## Costing Verdict

Normal end-user widget traffic gains no mandatory Firestore operation. Owner costs occur only on explicit tests, known-issue mutations, key rotation, and export. The only variable provider cost is full-runtime testing, which is capped and settled through existing Answerlattice accounting.

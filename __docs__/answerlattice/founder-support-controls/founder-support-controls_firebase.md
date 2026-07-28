# Founder Support Controls - Firebase And Cost

> **Status:** Binding cost contract

## Storage Model

## Answerlattice Answer Tests Runtime Boundary

The live source contract uses one scoped `platformSummary/answerTests_{tId}_{sId}` document with exact ID, product, numeric scope, supported schema, suite revision, valid-case, and unique-case admission. Stored releases use the strict release schema. The same summary holds at most five 15-minute run reservations whose SHA-256 request fingerprints bind run kind, mode, suite revision, selected case IDs, and release ID; successful runs remove their reservation, failed pre-execution runs attempt cleanup, and expired reservations are pruned on the next claim. Summary writes are measured and rejected above 480 KiB. Version 4 retains bounded risk, evidence policy, reference IDs, proof status, governed-source versions, request fingerprint, and suite revision. No Answer Tests listener, scheduled run, per-case document, search-history write, signal write, or instant-cache write is added.

The admitted critical-RAG hardening is evaluator/UI logic over this existing summary. It requires no schema version, migration scan, new document, index, listener, scheduled function, Storage object, source read, or write. Legacy critical-RAG cases stay in the bounded summary and produce blocked evidence on their next owner-triggered run.

| Data | Location | Growth control |
| --- | --- | --- |
| Test cases and last runs | `platformSummary/answerTests_{tId}_{sId}` | 100 cases, 10 compact runs, document-size guard |
| Proposal impact preview | Existing proposal, answer-test summary, retrieval sources | Response only; no preview document or retained run |
| Known issues | Existing `answerlattice_predictiveTriggers` | Existing 500-trigger tenant cap; notices share that cap |
| Known-issue runtime | Existing `platformSummary/predictiveTriggers_{tId}_{sId}` and compiled bundle | Source-hash skip when unchanged |
| Verified-context public key | Existing scoped store document | One active public key; rotation replaces the prior key |
| Evidence links | Existing private widget-search history records | Maximum 3 links; no fetched content |
| Export | HTTP response only | No Firestore export job or Storage artifact |
| Owner assistant | Existing summaries only | No assistant transcript or collection |

## Per-Action Cost

### Load Answer Tests

- Standard regression suite: 1 answer-test summary read.
- First 10 launch screen: 2 compact reads in parallel, answer-test summary plus current source-version summary.
- No listener.

### Save Test Cases

- 1 transaction read + 1 write on the summary document.
- First 10 launch screen only: 1 compact current source-version read after the transaction to return authoritative current proof.
- Standard regression-suite saves skip the proof read.
- No per-case documents.

### Canonical-Only Test Run

- 1 answer-test summary read.
- Entity search index reads at most 500 documents once per run; there is no cross-request process cache.
- Latest active release reads 0 or 1 document once per run; there is no cross-request process cache.
- KB source-version lookup uses the existing compact cache-version read once per run.
- Governed source freshness uses one compact `platformSummary/sourceVersions_{tId}_{sId}` read before execution. The retained run stores only six numeric counters: canonical answers, KB/FAQ truth, documentation navigation, entities, entity relations, and releases.
- After run persistence, a First 10 launch request reads that compact source-version summary once more to return current proof and detect a source change that occurred during execution. Standard regression-suite runs skip this post-run read.
- Active canonical answers are cached per matched entity for the duration of the run; each unique matched entity uses one bounded query of at most 200 answers.
- 1 transaction read + 1 write to reserve the request ID before execution.
- 1 transaction read + 1 write to save the retained run and remove its reservation.
- Retaining a run does not increment the suite revision; only the existing case-save transaction changes it.
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
- 1 compact source-version read for the retained pre-execution snapshot; First 10 launch requests add 1 post-execution current-proof read.
- Runs only matching cases, maximum 25.
- Same reservation/finalization writes as a normal run.

### Rollback Proposal

- One transaction reads the current canonical answer, exact selected audit-history document, deterministic mutation proposal, and deterministic paired audit row: 4 reads per transaction attempt.
- New pair: up to 2 writes. Valid existing pair: 0 writes. Valid partial pair: 1 repair write. Conflicting product, scope, target answer, mutation type, source audit, or audit identity fails closed.
- The answer/audit ownership, current entity bindings, restorable content, strict saved procedure, and existing pair are evaluated from the same transaction snapshot.

### Proposal Impact Preview

- Owner-triggered only; no listener or scheduled execution. The 5-per-minute workspace-user limiter fails closed before Firestore work when its provider is unavailable.
- 1 exact mutation-proposal read.
- 1 exact current canonical-answer lookup only when the proposal targets an existing answer; the lookup may return no document.
- 1 bounded latest-active-release query with `limit(1)` to build the same version binding used by approval; the query may return no document.
- 1 compact answer-test summary read.
- If no active test is explicitly linked, processing stops here.
- When linked tests exist, at most 10 are checked, with critical tests selected first.
- 1 capped entity search-index preload of at most 500 documents and 1 compact KB cache-version read.
- Canonical-answer lookups reuse the request-local matched-entity cache. Each checked case can issue at most one uncached entity-set query; with the 10-case preview cap this is at most 10 queries. Each query asks for at most 101 documents so the runtime can reject a result above the 100-document admission boundary. The conservative attempted-result ceiling is therefore 1,010 documents, while successful execution admits at most 100 documents per query and normally reuses entity-cache entries across related cases.
- When knowledge-graph traversal is enabled, its existing graph-index loader may add 1 compact summary read on a cold workspace/process; the existing 60-second process cache is reused.
- FAQ retrieval reuses the existing bounded published-FAQ cache/query.
- 0 writes, 0 provider calls, 0 support-credit operations, 0 retained test runs, 0 run reservations, 0 audit rows, and 0 invalidation writes.
- The preview deliberately does not perform the approval transaction's up-to-500 active-answer overlap scan or per-entity existence reads. Those authoritative checks remain on approval, avoiding duplicate Firebase cost while preventing preview from being presented as approval.

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
- Limiter-provider failure blocks the export rather than bypassing the bulk-read control.
- Per collection caps: entities 500, canonical answers 1000, surfaces 500, articles 1000, FAQs 1000, 10 changelog page documents / 1000 entries, and releases 500.
- The API fails if a cap is reached, avoiding silent truncation.
- A successful package build creates 1 existing `answerlattice_auditLogs` document containing generation metadata only. Audit-write failure prevents file delivery.
- Dedicated and shared Firestore rules reserve `support_truth_export_generated` for server authority; client-created copies are denied.
- No new collection, Storage upload, listener, scheduler, Function, or model call.

### Owner Support Assistant

- A cache miss reads exactly six compact summary documents with one `getAll()` call, including the activation snapshot used for factual launch verification.
- A 60-second in-process cache makes repeated brief/questions for the same workspace zero-read while warm.
- No detail reads, realtime listener, provider call, background loop, transcript, or assistant analytics collection.

## Scale Rules

- No separate `answerTestSuites`, `answerTestRuns`, scenario, variant, assertion, manifest, or artifact collection.
- No Cloud Storage run artifact or scheduled nightly/weekly test runner.
- Save, run, release-check, rollback, and proposal-impact admission fails closed when distributed limiter capacity cannot be established.
- No test case subcollection or per-result write.
- No nightly execution of every test suite.
- No nightly proposal simulation or proposal-impact summary.
- Activation compares retained proof with the current compact source-version summary and case timestamps. A changed First 10 question, canonical answer, FAQ/KB source, documentation map, entity/relation, or release invalidates old proof until the owner reruns it.
- Legacy runs without source-version evidence remain visible but cannot satisfy current launch proof.
- Release checks operate on supplied affected entity IDs.
- No per-widget known-issue collection query.
- Evidence checking reuses references already returned by FAQ or full-runtime retrieval; it adds no Firestore query or provider call.
- No external evidence URL fetch.
- Export remains explicit and rate limited.

## Costing Verdict

Normal end-user widget traffic gains no mandatory Firestore operation. Owner costs occur only on explicit tests, previews, known-issue mutations, key rotation, and export. Standard Answer Tests keep one summary read on load and one governed source-version snapshot read per new run. Current-proof freshness is opt-in for the First 10 launch screen: two compact reads on load, one compact source-version read after a launch-screen case save, and a second compact source-version read after a newly executed launch run. Activation adds one compact source-version read. Proposal impact is an explicit, rate-limited, read-only comparison that stops after compact/exact reads when no linked test exists and never duplicates the expensive approval overlap scan. When linked tests exist, its variable canonical reads remain bounded by the 10-case and 100-admitted-document-per-query guards described above. These checks add no listener, provider call, or write. The retained numeric snapshot slightly increases the existing bounded summary payload and remains protected by the 480 KiB write guard. The only variable provider cost is full-runtime testing, which is capped and settled through existing Answerlattice accounting. Critical-RAG blocking adds zero Firebase cost because it evaluates the already-resolved route in memory.

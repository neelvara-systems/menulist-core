# First Trusted Answers Firebase Contract

## Read/Write Model

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Open launch workflow | 2 compact reads | 0 | Existing Answer Tests summary plus current source-version summary, read in parallel |
| Load intake choices | Up to 20 bounded job reads | 0 | Owner-triggered launch screen only; no listener |
| Generate a new product pack | 1 job + up to 30 ready sources + 10 exact draft-ID checks + existing subscription/accounting reads | Up to 10 review drafts + job/summary/usage-ledger/AI-accounting writes | One model call and one support credit; output is draft-only |
| Reopen unchanged product pack | Same bounded cache-check reads | 0 | Reuses review items for the current generation-input hash; no provider call or credit charge |
| Add starter set | transaction read already used by save + 1 compact current source-version read | 1 | Replaces the existing bounded summary document with revision check and returns current proof |
| Canonical-only run | Existing bounded retrieval + 2 compact current source-version reads | Existing reservation/finalization summary transactions | Pre-run snapshot plus post-run current proof; no provider call and no search-history write |
| Full-runtime run | Existing bounded retrieval + 2 compact current source-version reads + provider when needed | Existing reservation/finalization summary transactions plus existing AI ledger | Pre-run snapshot plus post-run current proof; capped at ten cases |
| Load Activation proof | 8 compact reads total | 0-1 existing activation snapshot write | Includes Answer Tests and current source-version summaries; no source collection scan |
| Submit widget outcome | 1 transaction read | 1 merge write | Existing search-history document only |
| Nightly outcome metrics | 0 additional reads | 0 additional writes | Reuses the existing newest-first, product/tenant/store-scoped, capped 24-hour search-history read and Trust Metrics write |
| Prepare Daily Brief card | 0 | 0 | URL-prefilled existing form only |
| Confirm Support Board card | Existing transaction/write path | Existing card write | No new action log collection |

## Cost Invariants

- No new Firestore collection.
- No realtime listener.
- No per-outcome event document.
- No new scheduler or scheduler query.
- No unbounded scan.
- Product-pack source text is compacted to at most 32,000 characters before the provider call.
- The pack is exactly ten candidates and writes at most ten review documents.
- Generation uses the maintained job counter for the 120-item cap and checks only the ten deterministic draft IDs; it does not scan the review collection.
- The generation-input hash is computed from the exact prompt-bounded source packet, including the intake audience/product context, included excerpts, source metadata, and source identifiers. Unchanged retries are provider-free and write-free; changes outside the prompt budget do not create a needless paid refresh.
- Answer Test cases store only the source hash and draft review-item ID needed to preserve owner edits on cached reuse; source text and proposed answers are not duplicated into the summary.
- Each new Answer Test run stores six bounded numeric source-version counters from one pre-execution compact read. A second post-execution compact read derives the browser's current-proof response and detects source changes during execution. Activation uses one exact compact source-version read to reject stale retained proof without scanning canonical, KB, entity, relation, or release collections.
- Internal source-version counters are used server-side only and are not returned in the Activation response.
- The existing 120 review-item cap prevents repeated changed-source generations from growing a job without bound.
- Existing 500-row nightly search-history cap remains unchanged.
- Explicit ordering does not increase the read cap; it prevents high-volume tenants from receiving an arbitrary 500-row sample.
- Static public launch and tool-package pages perform no Firebase work.
- Proof registry is source-controlled static data.

## Indexes And Rules

The additive `resolutionOutcome` field is read from documents already returned by the existing scoped, bounded query. The query now explicitly filters `pId = AL`, `tId`, and `sId`, then orders `createdOn` descending. The matching `pId + tId + sId + createdOn DESC` composite index is mirrored in `firestore-answerlattice.indexes.json` and `firestore.indexes.json`. No Firestore rule change is required.

The product-pack path uses the existing scoped Intake source and review-item queries, server-only usage ledger, and existing indexes. It requires no additional Firestore rule or index.

Cost impact of the index: one additional composite-index entry is maintained for each retained `aiSearchHistory` document and removed with that document's TTL lifecycle. The scheduler still reads at most 500 documents and writes the same coverage/trust summaries, so request read/write shape does not increase.

## Failure Behavior

- Duplicate widget feedback remains idempotent.
- Legacy feedback without `resolutionOutcome` does not count as confirmed resolution.
- Empty explicit-outcome samples display as unavailable rather than 0%.
- Only observed same-session recontacts are counted. The bounded 24-hour sample does not claim that no observed recontact proves durable resolution, avoiding another query or cohort store.
- A failed Support Board prefill creates no record.
- Concurrent Answer Test edits continue to fail with revision conflict.
- A First 10 edit or governed source-version change invalidates the old launch proof until the owner reruns it; legacy runs without version evidence also require one rerun.
- Concurrent product-pack generation fails with a lease conflict.
- Provider, parsing, or settlement failure marks the run failed and refunds the reserved support credit.
- New usage reservations retain the exact charged subscription ID so a refund does not depend on that subscription still being active after provider work; legacy ledger rows retain the existing active-subscription fallback.
- Unknown source IDs, entity IDs, and route paths returned by the model are discarded before persistence.
- Missing-evidence and contradictory safe-fallback answer text are discarded before answer/body persistence. This validation adds no Firestore operation or provider call.
- Generated drafts cannot bypass the existing entity, answer-content, Intake acceptance, mutation-proposal, or canonical-answer approval gates.

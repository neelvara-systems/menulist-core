# Repeated Reply Import — Firebase Cost and Operations

> **Status:** IMPLEMENTED  
> **Created:** 2026-06-06  
> **Priority:** Firebase cost must remain bounded and owner-triggered.

---

## Storage Model

No new collection is added.

Repeated reply import uses existing Knowledge Intake collections:

- `answerlattice_knowledgeIntakeJobs`
- `answerlattice_knowledgeSources`
- `answerlattice_intakeReviewItems`
- `answerlattice_mutationProposals` only when an accepted canonical proposal is published
- existing FAQ collection only when an accepted FAQ draft is published
- existing summary documents touched by Knowledge Intake

No Firebase Storage path is added.

Entity autocomplete uses the existing ontology search-index collection:

- `answerlattice_entitySearchIndex`
- `answerlattice_entities` for matched entity detail/filter reads only

No separate autocomplete collection is added.

---

## Add Source Cost

Action: owner submits one repeated question and one answer.

Existing API path: `POST /api/answerlattice/knowledge-intake/jobs/[jobId]/sources`

Expected operations:

| Operation | Cost |
| --- | --- |
| Transaction read job doc | 1 read |
| Transaction read source doc for duplicate hash | 1 read |
| Write source doc when new | 1 write |
| Merge job counters when new | 1 write |
| Merge intake summary when new | 1 write |

Malformed path:

- same protected route and rate limit
- stops before the Knowledge Intake job read
- no duplicate-source transaction
- no source/job/summary writes when the repeated reply does not contain one parseable Q/A pair

Duplicate path:

- same 2 reads
- no source/job/summary writes when duplicate is detected

---

## Generate Drafts Cost

Action: owner clicks Generate review drafts.

Existing API path: `POST /api/answerlattice/knowledge-intake/jobs/[jobId]/analyze`

Expected operations:

| Operation | Cost |
| --- | --- |
| Read job doc through existing scope check | 1 read |
| Query ready sources capped by `MAX_SOURCES_TO_ANALYZE` | up to 30 reads |
| Write FAQ draft for repeated reply | 1 write |
| Write canonical proposal draft for repeated reply | 1 write |
| Merge job status/counters | 1 write |
| Merge intake summary | 1 write |
| Refresh counters | existing bounded review-item count reads |

Repeated reply sources create at most two review item writes, which is lower than generic Q/A pasted text that can create multiple FAQ/canonical pairs plus an article draft.

---

## Accept/Edit Draft Cost

Action: owner edits, accepts, or rejects a review item.

Expected operations:

| Operation | Cost |
| --- | --- |
| Read review item | 1 read |
| Write review item patch | 1 write |
| Refresh job counters | existing bounded count reads |

The existing canonical proposal guard requires at least one entity before an item can be accepted as canonical.

---

## Publish Cost

Action: owner publishes accepted items.

For FAQ:

- writes existing FAQ document
- marks review item published
- bumps existing cache/source-version paths
- revalidates existing public cache segments

For canonical proposal:

- writes one existing mutation proposal
- marks review item published
- does not publish the canonical answer directly
- does not trigger a new public cache segment

Existing Knowledge Intake publish also rebuilds the compact product-surface content summary after publish. This feature does not add another rebuild.

---

## No-Cost Additions

This feature adds no:

- realtime listener
- Storage upload
- new Cloud Function
- scheduled function
- native connector
- provider/AI call
- embedding call for the repeated-reply canonical proposal path
- public widget runtime read
- public API route
- Firebase rules change

Entity autocomplete adds one Firestore composite index for bounded prefix-token lookup on `answerlattice_entitySearchIndex`. It does not add rules, new functions, Storage, AI usage, scheduled work, or realtime listeners. The existing onboarding-bootstrap function now includes `prefixTokens` when it writes future entity search-index rows.

---

## Entity Autocomplete Cost

Action: owner searches for a product entity while adding a repeated reply.

Existing API path: `GET /api/answerlattice/knowledge-intake/entities?q=...`

Cost controls:

| Control | Contract |
| --- | --- |
| Page load | 0 entity/index reads. |
| Minimum query | Search does not run until the owner types a useful query. |
| Client debounce | Queries are debounced and cached per normalized query during the session. |
| API rate limit | Search route uses the shared authenticated `DATA_READ` gate per user, Answerlattice workspace, and route key before entity reads. |
| Search-index reads | Prefix-token query is capped to matched index rows only. |
| Entity detail reads | Only top matched entity docs are read for active/beta filtering and labels. |
| Legacy fallback | Older search-index rows without `prefixTokens` use a capped tenant/store index read only when prefix search has no result. |

Expected operations per searched query:

| Operation | Cost |
| --- | --- |
| Query `answerlattice_entitySearchIndex` by `tId`, `sId`, and `prefixTokens` | up to the capped match limit |
| Read matched `answerlattice_entities` docs | up to the returned option limit |
| Legacy fallback when no prefix-token rows exist | up to the capped fallback limit |

Future entity search-index writes include an additive `prefixTokens` array derived from canonical name, normalized tokens, and synonyms. This increases index storage/write fanout only on rare ontology-index writes; it avoids repeated broad reads during owner form search.

---

## Cost Verdict

This is a low-cost, bounded owner-triggered feature. It uses existing Knowledge Intake writes, reduces review-item fanout for repeated reply sources by avoiding the default KB article draft, and keeps entity linking search-gated instead of loading the ontology list on dashboard open.

---

## Deployment Status

Local validation passed on 2026-06-06, but Firebase deploy is blocked for the active account:

| Target | Required command | Status |
| --- | --- | --- |
| QA Firestore index | `firebase deploy --only firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` | Blocked by Firebase Rules API `403 The caller does not have permission`. |
| QA direct index create | `gcloud firestore indexes composite create --project=answerlattice-qa --database='(default)' --collection-group=answerlattice_entitySearchIndex --query-scope=COLLECTION --field-config=field-path=tId,order=ascending --field-config=field-path=sId,order=ascending --field-config=field-path=prefixTokens,array-config=contains --quiet` | Blocked by `PERMISSION_DENIED` for active account `tech.ecomsai@gmail.com`. |
| QA functions | `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` | Blocked by Cloud Resource Manager `403 The caller does not have permission`. |

The app-side change should not be enabled in a deployed environment until the prefix-token composite index exists. Legacy fallback handles older rows after the route can run, but the prefix-token query itself still requires the Firestore composite index.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Recorded QA deploy blockers for entity autocomplete index and Answerlattice functions. |
| 2026-06-06 | Added entity autocomplete read budget and prefix-token index contract. |
| 2026-06-06 | Implemented repeated reply import with no new Firebase collection, Storage path, Cloud Function, scheduler, or AI call. |

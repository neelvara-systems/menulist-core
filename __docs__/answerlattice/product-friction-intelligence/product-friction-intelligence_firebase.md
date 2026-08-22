# Product Friction Evidence Firebase Notes

## Collections

### `answerlattice_frictionDailyStats`

One deterministic per-entity, per-UTC-day row containing exact scope, schema version, entity identity, evidence counts, weighted load, and timestamps. Nightly writes exactly replace the row. The cleanup task removes exact-`AL` workspace rows older than 90 days and reports deletion only after its bounded batch commits.

### `platformSummary/frictionSnapshot_{tId}_{sId}`

One deterministic server-owned snapshot for the latest complete UTC seven-day comparison.

The current additive projection includes bounded top-entity component counts
already aggregated from the same daily rows. Legacy snapshots remain readable.
This is not a new snapshot family.

### `platformSummary/friction_{tId}_{sId}`

One optional server-owned advisory summary linked to a strictly normalized deterministic snapshot. The write is an exact replacement inside a transaction that re-reads and fingerprints current source truth.

## Reads and Writes

- Nightly: bounded signal, canonical-miss, entity, and product-partitioned history reads.
- Nightly: bounded exact daily-stat writes and one exact snapshot replacement after complete success.
- Nightly cleanup: one exact `pId: AL + tId + sId + date` query, at most 100 deletes, and a fixed-run-clock UTC cutoff; invalid rows or failed commit fail the task instead of returning a success count.
- Weekly: one snapshot read, one provider operation, one accounting write attempt for every completed provider response (including rejected output), and one source-read/advisory-write transaction only for valid output. Firestore may retry the transaction under contention; a changed source produces no advisory write.
- Owner surface: one deterministic snapshot read and one optional advisory read.
- A fresh active workspace may not have either summary until the scheduled
  aggregations run. Exact point reads of the current workspace's missing
  `frictionSnapshot_{tId}_{sId}` and `friction_{tId}_{sId}` documents return
  the normal non-existent result. This exception requires authentication,
  current tenant/store claims, an active `AL` workspace, readiness permission,
  an allowlisted client-readable summary ID, and document absence. It does not
  permit collection queries, cross-workspace reads, writes, or private
  integration-config reads.
- Daily Brief focus and Knowledge Map links: zero operations until the owner
  opens the destination; no friction listener or navigation write.
- Evidence brief preparation, review-path changes, copy, and Markdown download:
  zero Firebase reads, writes, deletes, listeners, Storage objects, Functions,
  scheduler tasks, provider calls, or integration calls. The browser reuses the
  already-loaded compact snapshot.
- Review-path resolution, helper text, close actions, and client navigation:
  zero Firebase operations. The Knowledge Map or trusted-answer page performs
  only its existing bounded reads after explicit owner navigation.
- Post-change review: zero operations on mount; explicit candidate loading
  reads at most 8 active releases plus 8 implemented corrections; an eligible
  exact review reads one change plus at most 201 retained signal rows per
  complete window. It writes nothing and creates no summary document.

The component-breakdown hardening changes neither owner read count nor nightly
query count. It adds bounded numeric fields to the existing compact snapshot
payload and remains within the existing ten-entity cap.

The post-change route reuses maintained release, mutation-proposal, and
signal-event indexes. It does not change the nightly aggregation, deployable
Functions, Firestore rules, index manifests, or retention jobs.

The path-aware next action is resolved entirely in memory. Internal
continuation carries only the validated entity ID into an existing route.
Product review remains a local clipboard/download handoff. Watch and no-action
create no reminder, decision, event, summary, audit row, or delivery state.
Freezing the brief input by workspace scope and failing closed when Knowledge
Map is disabled or lacks the requested topic also add zero Firebase operations.

Actual cost must be measured from Firebase and AI-operation accounting. Static cost promises are not maintained.

## Rules

- client writes to daily stats and platform summaries are denied;
- client reads require exact tenant/store membership and readiness permission;
- missing friction summaries are readable only as exact current-workspace
  point gets under the same readiness permission and active-workspace boundary;
- platform summary document IDs must match stored scope;
- both dedicated Answerlattice and shared Firestore rules carry the same read boundary.

## Indexes

The maintained dedicated and shared index files include the friction history/cleanup shape `pId + tId + sId + date desc` and the `aiSearchHistory` canonical-miss shape `pId + tId + sId + canonical + createdOn desc`. Product identity is constrained before both bounded windows, preventing another product with colliding numeric scope from consuming the cap or entering retention deletion. Any query-shape change must update and test both index contracts before deployment.

The owner snapshot is retrieved only by exact document ID, so automatic
indexing is disabled for `topFrictionEntities` and `emergingTopics` in both
maintained manifests. The scalar scope, window, health, and count fields remain
unchanged. This reduces index-entry storage and snapshot-write amplification;
it does not change the two-read owner surface or any history query.

## Deployment

Function changes require a narrow QA deployment of `answerlatticeNightly`; this exact product-aware daily-stat query also requires both maintained index manifests to be deployed to the matching environment. Rules deployment is required only when rules source changes.

### August 22, 2026 empty-summary publication

Hosted QA exposed the legitimate pre-aggregation state: both friction summary
documents were absent, but the client received a permission error instead of a
non-existent result. Dedicated and shared rules now admit only the bounded
missing-document point gets described above. Focused positive and adversarial
emulator tests and the complete Answerlattice runtime-truth matrix passed.
The dedicated rules were then compiled and released to
`neelvara-answerlattice-qa` and `neelvara-answerlattice-prod`. Hosted QA
retesting changed the Friction surface from a load failure to the intended
empty state. No index, Storage, Function, credential, or Vercel deployment was
changed.

### July 29, 2026 QA attempt

The narrow deployment of `answerlatticeNightly` and the related live Support
Board summary function stopped before upload because the local Firebase CLI was
not authenticated: `Failed to authenticate, have you run firebase login?`.
Source, contract, emulator, rules, typecheck, lint, and Functions-build gates
passed. No QA Function revision changed.

### July 30, 2026 authentication recheck

`firebase projects:list --json` still stops with `Failed to authenticate, have
you run firebase login?`. No deploy command was run after that preflight. The
feature's source and local emulator contracts can be completed without a live
write, but QA deployment and hosted summary readback remain operator evidence,
not unfinished Product Friction Evidence code.

## Rejected Firebase Expansion

Do not add:

- per-workflow tree snapshots;
- per-release friction documents;
- per-classification or per-root-cause documents;
- evidence-brief, owner-review-path, product-problem, or delivery-state
  documents for this local handoff;
- reminders or watch-state documents implied only by selecting a review path;
- raw product-event, abandonment, session-replay, or mouse-event collections;
- owner-page collection scans or listeners;
- one document per displayed evidence item.

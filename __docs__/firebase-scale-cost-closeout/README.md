# Firebase Scale And Cost Closeout

**Scope:** MenuList and repository Firebase boundaries
**Status:** Local source complete; scoped QA Functions/index deployments pending
**Last verified:** August 1, 2026
**Source gate:** `npm run verify:firebase-scale-cost-closeout`

## Outcome

The current usage-map scanner found 516 runtime files with Firebase, Storage,
API, callable, query, listener, or write signals. The scanner classifies 9
listener-risk files, 2 public-read-risk files, 2 query-scope-risk files,
and 52 write-volume-risk files. These are review bands, not automatic defects.
The owning feature audits already justify or bound the active listeners, public
routes, queries, and write-heavy mutation flows.

Two material cross-system cost defects remained:

1. The hourly store-EOD scheduler also ran platform-wide nightly tasks on every
   invocation that had any due store. A globally distributed store base could
   therefore run the same platform scans up to 24 times per UTC day.
2. The maintained index manifests repeated six exact MenuList composite
   definitions and one exact Answerlattice composite definition. Each duplicate
   increased manifest/deploy noise without adding a query capability.

The scheduler now uses a transactional daily lease for:

- authority maturation;
- menu drift metrics;
- Guest Feedback retention;
- lifecycle messaging;
- extraction learning;
- Store Truth Confidence; and
- staleness detection.

Store-local analytics settlement, Decision Blocks, Menu Intelligence, and owner
Business Health still run at the correct store-local business-day boundary.
Special Menu marker recovery also remains attached to each due-store cohort;
its precise transition path remains the two-minute maintenance task.
Operational maintenance retains its independent per-task cadence and leases.
One copy of every duplicated composite remains, so all existing query support
is preserved. No schema migration was introduced.

## What Was Not Changed

- No new collection, listener, composite index, Storage path, provider, API,
  owner setting, dependency, or public behavior.
- No canonical identity or authorization read was replaced with a denormalized
  summary.
- No realtime listener was converted to polling.
- No product's Firebase data was moved into another product project.
- No speculative sharding or external cache was added.
- No unique query-supporting composite index was removed. Only exact duplicate
  manifest definitions were deleted.

## Current Infrastructure Snapshot

| Manifest | Composite indexes | Field overrides | TTL policies |
| --- | ---: | ---: | ---: |
| MenuList/shared `firestore.indexes.json` | 154 | 50 | 15 |
| Answerlattice | 94 | 17 | 13 |
| CampaignCue | 0 | 0 | 0 |
| SignalDesk | 72 | 0 | 0 |

The aggregate verifier rejects duplicate composites/overrides, indexed TTL
fields, loss of known high-cardinality map exemptions, and silent growth in the
current scanner risk bands.

## Accepted Cost

- Canonical store/project reads remain where identity, scope, or public truth
  requires them.
- Digital Screen and active-job listeners remain realtime because freshness is
  functional, and each is a bounded document/query shape.
- Mutation, billing, AI accounting, notification, and publish flows retain
  transactional/audit writes required for correctness.
- Product-specific query coverage remains intact because the closeout removes
  exact duplicates only; static-scan guesses are not used to delete unique
  composites.

## Documents

| Document | Purpose |
| --- | --- |
| [Specification](./firebase-scale-cost-closeout_spec.md) | System invariants and acceptance criteria |
| [Implementation](./firebase-scale-cost-closeout_impl.md) | Daily lease and unchanged boundaries |
| [Firebase](./firebase-scale-cost-closeout_firebase.md) | Operation, index, retention, and deploy effects |
| [Mobile](./firebase-scale-cost-closeout_mobile-support.md) | Owner mobile impact |
| [Marketing](./firebase-scale-cost-closeout_marketing.md) | Internal-only positioning boundary |
| [Website](./firebase-scale-cost-closeout_website.md) | Public-copy boundary |
| [Helpdoc](./firebase-scale-cost-closeout_helpdoc.md) | Support boundary |
| [Tests](./firebase-scale-cost-closeout_test-cases.md) | Source/emulator matrix |
| [Verification](./firebase-scale-cost-closeout_verification.md) | Audit evidence and residual work |

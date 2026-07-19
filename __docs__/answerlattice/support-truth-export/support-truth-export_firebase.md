# Support Truth Export - Firebase And Cost

## Reads Per Successful Export

- rate-limit provider check;
- Answerlattice access resolution, including store/user permission reads as applicable;
- seven bounded Firestore queries for governed truth sections.

There is no listener, scheduler, model call, connector call, or per-record follow-up read.

## Writes

One document is appended to the existing `answerlattice_auditLogs` collection after a complete package is built and before it is delivered. The audit stores only scope, actor, schema/type, generated time, counts, completeness, and byte size. Exported content is not duplicated.

## Rules

Both `firestore-answerlattice.rules` and shared `firestore.rules` reserve `support_truth_export_generated` for server authority. Authorized clients cannot forge this sensitive-download evidence.

## Indexes

No new composite index is introduced. The export uses equality filters and existing collection/index behavior. Any QA missing-index response is a deployment blocker and must be resolved from the exact generated query, not guessed.

## Storage And Retention

- No generated file is persisted by Answerlattice.
- The browser owns the downloaded file after delivery.
- Audit evidence follows the existing durable audit-log retention policy.
- Source collections keep their existing retention/deletion rules.

## Deployment

Because Firestore rules changed, deploy/read back the dedicated Answerlattice QA rules using `firebase-answerlattice.json`. Shared-rule parity is emulator-verified; shared-project deployment is required only if that compatibility mode is actually operated.

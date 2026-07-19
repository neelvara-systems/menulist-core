# Drift Governance Firebase Contract

## Reads

Manual and nightly Class B/C/D evaluation uses three bounded exact-workspace queries:

1. active canonical answers, capped at 500 plus one overflow row;
2. product entities, capped at 1,000 plus one overflow row;
3. recent signal events in the 14-day window, capped at 1,000 plus one overflow row.

Only `ticket` and `chat_negative` events participate after stored scope, identifier, and timestamp validation. Release activation uses the existing release and changed-entity answer reads for Class A.

## Writes

For each newly drifted answer:

- update canonical `governance.driftFlag`, `governance.driftReason`, `governance.reviewRequired`, and modification metadata;
- create one deterministic append-only automated-drift audit event;
- invalidate canonical cache version, compiled canonical source version, and compiled bundle freshness once per committed batch or transaction.

Human validation updates the answer's validation state, clears the reviewed drift state, and appends a validation audit event through the governance server.

## Cost and scale controls

- No new collection, listener, index, Storage path, or scheduler was added.
- Manual evaluation is explicit, not run on every dashboard render.
- The dashboard loads canonical answers once and derives the drifted subset locally.
- Nightly writes are limited to 200 changed answers per batch.
- Manual server transactions are limited to 150 changed answers per chunk.
- Cap-plus-one reads detect overflow instead of publishing a truncated result.
- Cache/source/bundle invalidation is compact and batched rather than fanned out to every delivery surface.

## Retention

Canonical drift state remains on the canonical answer until human validation. Audit retention follows the existing Answerlattice audit policy. Signal retention is owned by the signal/retention features; this feature reads only the bounded recent window.

## Deployment status

The dedicated `answerlatticeNightly` Function changed and requires this scoped QA deploy after authentication:

```bash
firebase deploy --only functions:answerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json
```

No Firestore rule, index, or Storage rule changed for Feature 10.

The July 18 attempt stopped before upload with `Error: Failed to authenticate, have you run firebase login?`. No remote Function revision changed during this audit.

# Ownership And Dormant Lifecycle Firebase

## Current data boundaries

- Operational owners: existing `users` mappings plus per-store access-state
  guard documents.
- Business contacts: existing tenant/store fields.
- Notification recipients: store `notificationSettings` with contact fallbacks.
- Billing identity: existing subscription `userId`, email, tenant, and store.
- Dormancy: one nightly compact `storeTruthConfidence` summary plus bounded
  staleness checkpoint/owner-notification work.

## Cost

This pass adds no Firestore read/write/delete, listener, collection, index,
Storage object, Function, scheduler, provider call, or setting. It preserves
the existing bounded staleness cost and avoids a premature transfer ledger or
workflow collection.

No Firebase deployment is required.

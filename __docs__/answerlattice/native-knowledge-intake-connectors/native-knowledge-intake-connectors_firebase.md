# Native Knowledge Intake Connectors - Firebase

> **Status:** No runtime
> **Last Updated:** 2026-08-05

## Current Firebase Operations

Current Firebase operations: zero.

The reserved flag adds no:

- Firestore read, write, delete, collection, rule, index, or TTL;
- Storage object or rule;
- Cloud Function, scheduler task, queue, webhook, or listener;
- Secret Manager value, OAuth credential, or provider call.

The manual release-evidence handoff remains outside this feature boundary and adds no connector Firebase operation. It reuses an owner-triggered Knowledge Intake source write and stores only an expiring draft in same-tab browser storage before the existing Changelog flow.

## Future Requirements

Before one connector is implemented, document:

- server-only encrypted credential ownership and rotation;
- exact workspace and provider-account binding;
- selected external container IDs and source permissions;
- token expiry, revocation, reconnect, and account-transfer behavior;
- cursor/webhook identity, replay protection, bounded pagination, and retry policy;
- normalized source records, source versions, and deletion/tombstone handling;
- source-to-answer dependency review;
- retention, privacy request, legal hold, backup, and restore behavior;
- per-import and per-sync read/write/provider cost.

Do not create speculative connector collections or indexes while the feature remains unimplemented.

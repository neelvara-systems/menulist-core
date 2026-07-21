# Native Helpdesk and Jira Connectors - Firebase

> **Status:** No runtime
> **Last Updated:** 2026-07-20

## Current Operations

Current Firestore, Storage, Functions, Secret Manager, scheduler, webhook, and provider operation count: zero.

No collection, document, rule, index, TTL, Storage object, credential, cursor, delivery log, or cleanup obligation exists for this feature.

## Future Requirements

Before one provider is implemented, document:

- server-only credential encryption, rotation, revocation, and account transfer;
- exact Answerlattice workspace and provider-resource binding;
- bounded initial and incremental import operations;
- cursor, event identity, replay protection, retry, and dead-letter recovery;
- normalized source versions and tombstones;
- ticket/issue PII redaction and private citation rules;
- default exclusion of attachments, internal notes, requester/customer profiles, provider tokens, and unrelated conversation history;
- disconnect, source deletion, dependent-answer review, retention, privacy request, backup, and restore;
- per-workspace provider, Firestore, Storage, model, and scheduler costs.

Do not create speculative collections or indexes while the feature remains absent.

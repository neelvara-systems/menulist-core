# Autonomous Browser and Account-Changing Actions - Firebase

> **Status:** No runtime
> **Last Updated:** 2026-07-20

## Current Operations

Autonomous-action Firestore reads, writes, deletes, Storage operations, Functions calls, scheduler tasks, model tool calls, and provider operations: zero.

Guided Resolution continues to use its existing bounded search-history proof and optional terminal signal. Those operations record guidance outcomes; they do not execute product actions.

## Future Requirements

Any separately approved reversible assist action must define:

- server-derived `pId`, `tId`, `sId`, user, role, permission, and action scope;
- one closed action ID and strict arguments;
- confirmation and expiry;
- deterministic idempotency and concurrency control;
- before/after state fingerprints;
- result verification;
- immutable audit without sensitive payloads;
- timeout, retry, cancellation, rollback, and human recovery;
- retention, deletion, backup, restore, and per-action cost.

Do not create speculative action collections, rules, indexes, secrets, or queues.

# Answerlattice Staff Access Control Firebase Notes

> Status: Implemented
> Last updated: 2026-05-26

## Firestore Writes

| Path | Trigger | Cost |
| --- | --- | --- |
| `stores/{sId}.answerlatticeRoles` | First access backfill, role create/update/delete | 1 store write |
| `users/{uId}` in Answerlattice Firestore | Staff create/update/remove/reset/sign-out | 1 user write per mutation |
| default Firebase `users/{uId}.productAccounts.AL` | Staff create/update/remove | 1 bridge write per mutation |

## Firestore Reads

| Path | Trigger | Cost |
| --- | --- | --- |
| `stores/{sId}` | Access context and role resolution | 1 store read |
| Answerlattice `users` query by email | Access context, create dedupe | bounded query with `limit(1)` |
| Answerlattice `users` query by tenant | Team list and last-owner checks | one tenant-scoped query |

## Rules

`firestore-answerlattice.rules` now enforces Answerlattice permission claims for direct client reads/writes. Same-tenant membership alone is not enough for managed collections.

Permission claims are emitted by `/api/auth/set-claims` using Answerlattice roles stored on `stores/{sId}.answerlatticeRoles`. Rules also keep default Owner, Manager, and Support Staff fallbacks for existing role tokens.

Owner-triggered reset/sign-out operations revoke default Firebase refresh tokens and Answerlattice Firebase refresh tokens. Existing ID tokens can remain usable until their normal expiry window, so Answerlattice also records `sessionRevokedAt`, `authTokensRevokedAt`, and a revocation reason for server-side checks and audit trails.

## Deploy

QA rules deploy target:

```bash
firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
```

Production deploy target remains separate and opt-in:

```bash
firebase deploy --only firestore:rules --project answerlattice --config firebase-answerlattice.json --non-interactive
```

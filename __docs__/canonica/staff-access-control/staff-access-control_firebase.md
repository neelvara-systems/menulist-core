# Canonica Staff Access Control Firebase Notes

> Status: Implemented
> Last updated: 2026-05-26

## Firestore Writes

| Path | Trigger | Cost |
| --- | --- | --- |
| `stores/{sId}.canonicaRoles` | First access backfill, role create/update/delete | 1 store write |
| `users/{uId}` in Canonica Firestore | Staff create/update/remove/reset/sign-out | 1 user write per mutation |
| default Firebase `users/{uId}.productAccounts.CN` | Staff create/update/remove | 1 bridge write per mutation |

## Firestore Reads

| Path | Trigger | Cost |
| --- | --- | --- |
| `stores/{sId}` | Access context and role resolution | 1 store read |
| Canonica `users` query by email | Access context, create dedupe | bounded query with `limit(1)` |
| Canonica `users` query by tenant | Team list and last-owner checks | one tenant-scoped query |

## Rules

`firestore-canonica.rules` now enforces Canonica permission claims for direct client reads/writes. Same-tenant membership alone is not enough for managed collections.

Permission claims are emitted by `/api/auth/set-claims` using Canonica roles stored on `stores/{sId}.canonicaRoles`. Rules also keep default Owner, Manager, and Support Staff fallbacks for existing role tokens.

Owner-triggered reset/sign-out operations revoke default Firebase refresh tokens and Canonica Firebase refresh tokens. Existing ID tokens can remain usable until their normal expiry window, so Canonica also records `sessionRevokedAt`, `authTokensRevokedAt`, and a revocation reason for server-side checks and audit trails.

## Deploy

QA rules deploy target:

```bash
firebase deploy --only firestore:rules --project canonica-qa --config firebase-canonica.json --non-interactive
```

Production deploy target remains separate and opt-in:

```bash
firebase deploy --only firestore:rules --project canonica --config firebase-canonica.json --non-interactive
```

# Answerlattice Staff Access Control Firebase Notes

> Status: Implemented
> Last updated: 2026-07-05

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

Staff client request/response validation adds no Firestore reads, writes, deletes, rules, indexes, Auth operations, or Cloud Function work. The browser caller uses no-store cache, same-origin credentials, and manual redirect handling before rejecting malformed, oversized, rejected, or wrong-shape responses before Team Access treats staff or role actions as loaded/saved. The shared Answerlattice access provider now applies the same browser request policy and a 64 KB bounded response guard to `/api/answerlattice/access`; this changes no access-context Firestore reads or role backfill writes beyond the existing route behavior.

Staff setup email provider hardening adds no Firestore reads, writes, deletes, rules, indexes, Auth operations beyond the existing valid Firebase Auth setup-email request, Cloud Function work, or browser API calls. The provider call now has a timeout and bounded provider diagnostics, and failures continue to return the existing `password_reset_email_failed` marker while staff creation remains acknowledged.

Answerlattice staff user ID boundary: staff update/remove/reset/sign-out now reject malformed, reserved, or path-shaped `userId` values before `users/{userId}` reads. Staff create and default-auth bridge writes also validate the derived user document IDs before writing. This is an admission guard only; valid staff mutations keep the same Firestore read/write shape.

## Deploy

QA rules deploy target:

```bash
firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
```

Production deploy target remains separate and opt-in:

```bash
firebase deploy --only firestore:rules --project answerlattice --config firebase-answerlattice.json --non-interactive
```

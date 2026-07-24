# Answerlattice Staff Access Control Firebase Notes

> Status: Implemented
> Last updated: 2026-07-19
> Feature audit: Feature 31 of 44

## Firestore Writes

| Path | Trigger | Cost |
| --- | --- | --- |
| `stores/{sId}.answerlatticeRoles` | Transaction-backed custom-role create/update/delete only | 1 transaction read + 1 store write; only custom roles persist and access reads never backfill |
| `users/{uId}` in Answerlattice Firestore | Staff create/update/remove/reset/sign-out | 1 user write per mutation; access writes are transactional |
| default Firebase `users/{uId}.productAccounts.AL` | Staff create/update/remove/reset | 1 transaction read; 0 writes when the revision and state already match, otherwise 1 bridge write |

## Firestore Reads

| Path | Trigger | Cost |
| --- | --- | --- |
| `stores/{sId}` | Access context and role resolution | 1 store read |
| Answerlattice `users` query by email | Access context, create dedupe | bounded uniqueness query with `limit(2)`; duplicate identity fails closed |
| Answerlattice `users` query by tenant + workspace | Team list, last-owner, role-in-use, and custom-role claim refresh discovery | one bounded composite query; list reads a 501st overflow sentinel and safety scans accept at most 500 documents |
| `stores/{sId}` inside staff access transaction | Create/update/remove role and workspace admission | 1 transaction read for access mutations |
| Answerlattice `users/{uId}` + selected `stores/{sId}` after Auth claim write | Claim convergence check | 1 user point read plus 1 selected-store point read per claim-writing attempt; at most 3 attempts before explicit failure |

The dedicated and shared index files include `users: tenantId ASC + storeIds ARRAY_CONTAINS`. Tenant filtering happens in Firestore before the cap.

Owner-passcode creation normally performs the existing Auth/user/bridge writes. Its request ID adds no operation document and no scheduler work: the deterministic managed email makes retries reuse the same Firebase Auth and Firestore identity. A completed replay performs bounded point/query reads and merge-safe writes to repair interrupted bridge/claim synchronization; it does not create another member, return a false passcode, resend setup email, or restore a membership removed after the original request. A rejected membership transaction compensates a newly created unadopted default Auth identity without deleting an identity adopted by a concurrent successful transaction.

New email-backed invitations no longer perform the two default/Answerlattice user queries that were used only to reserve an alternate staff ID. Email is the login identity for that path. The two bounded uniqueness queries run only if an explicit later Login reset needs to create a missing staff ID.

Custom role writes add one store transaction read compared with the prior blind array update. That read prevents lost updates between concurrent owners. Existing-role edits also read the bounded tenant/workspace member query in the same transaction so every retained assignee, active or inactive, is known before commit. The 25-custom-role cap and custom-only persisted array bound document growth. Built-in roles are projected from constants with stable system provenance and are never written through owner role APIs.

Staff access hardening adds no collection, operation document, scheduler, queue, or Storage object. Create/update/remove reuse the existing user and store documents. Last-owner and role-member queries remain bounded at 500 and run only for an Owner removal/demotion, role deactivation, or existing custom-role edit. `accessRevision` is stored on the existing user/account maps; the bridge compares nested and legacy-root revisions so delayed writes cannot replace newer membership state without a ledger document. An exact equal bridge replay costs one point read and no write; profile/login or canonical-alias repair at the same revision writes once.

Platform-only account-wide deactivation may run one bounded last-owner query for each Owner membership on that identity. This is an exceptional recovery cost and prevents a global account action from orphaning another workspace.

The Answerlattice user write is the durable authority. Default-auth and Auth-claim synchronization happen afterward and are replay-safe. Independent projection tasks use bounded `Promise.allSettled` execution so one provider failure does not prevent the others from being attempted. Claim synchronization retries when `accessRevision` or the selected store's complete role/permission signature changes during provider work; exhausting the three-attempt window or losing valid persisted state fails visibly instead of certifying stale claims. The extra selected-store reread occurs only after a claim write. Repeating the same create/access update repairs missed projections; a committed removal has its own durable replay marker so retry repairs bridge, claim, and final revocation state without duplicating or restoring membership. Authentication provider work does not run inside a Firestore transaction.

## Rules

`firestore-answerlattice.rules` and shared `firestore.rules` enforce the same Answerlattice permission claims for direct client reads/writes. Same-tenant membership alone is not enough for managed collections.

Permission claims are emitted by `/api/auth/set-claims`. Selected workspace, current role, and access revision come from the active duplicate-free `stores[]` runtime contract, so inconsistent top-level `storeIds` cannot widen a token. Each Answerlattice token carries a singleton selected-workspace list; complete memberships remain in the user/account records and a workspace switch requests a fresh scoped token. This least-privilege projection remains safely below Firebase's 1,000-byte custom-claim limit under the existing 120-character role and 160-character user-ID bounds. Locked Owner, Manager, and Support Staff use the same constants as the compatibility fallbacks in both rulesets; raw store data cannot override those defaults. Custom roles come from the canonical `stores/{sId}` snapshot already read and authorized by the route, so custom-role claim minting adds no duplicate store read. Unknown, inactive, malformed, or duplicate custom roles grant no permission. Disabled accounts emit an inactive zero-access projection. Saving a custom role refreshes and revokes claims for retained assignees in groups of five; retrying the same save repairs an interrupted provider sync without another data model.

Owner-triggered reset/sign-out operations revoke default Firebase refresh tokens and Answerlattice Firebase refresh tokens. Firebase documents an approximately one-hour ID-token lifetime, so already-issued tokens can remain usable until normal expiry. Answerlattice records `sessionRevokedAt`, `authTokensRevokedAt`, and a revocation reason for audit/recovery, but these fields are not read by every direct Firestore/Storage request. Instant invalidation is not claimed.

Staff client request/response validation adds no Firestore reads, writes, deletes, rules, indexes, Auth operations, or Cloud Function work. The browser caller uses no-store cache, same-origin credentials, manual redirect handling, and a 1 MiB team-response cap before rejecting malformed, oversized, rejected, or wrong-shape responses. The shared Answerlattice access provider retains its 64 KB bounded response guard for the smaller `/api/answerlattice/access` payload. Access-context role normalization is now read-only, removing the former first-access backfill write and its lost-update risk.

Access-provider latest-request settlement adds no Firestore operation or cache. It prevents an already-started older access read from becoming browser authority after a workspace/session/path transition; the newer request keeps the existing one-store plus bounded-user-query cost. No Firebase rule, index, Storage, Auth, or Function deployment is required for this browser-only correction.

The permission-dependency and response-header hardening add no Firestore read, write, delete, index, Storage, Auth, or Function operation. Existing custom roles that contain `canAssignRoles: true` without `canManageTeam: true` normalize to no role-assignment authority; no migration write is required. Access and staff routes now explicitly return private no-store plus `nosniff` headers, including one-time login-detail responses and failures.

Staff setup email provider hardening adds no Firestore reads, writes, deletes, rules, indexes, Auth operations beyond the existing valid Firebase Auth setup-email request, Cloud Function work, or browser API calls. The provider call now has a timeout and bounded provider diagnostics, and failures continue to return the existing `password_reset_email_failed` marker while staff creation remains acknowledged.

Answerlattice staff user ID boundary: staff update/remove/reset/sign-out now reject malformed, reserved, or path-shaped `userId` values before `users/{userId}` reads. Staff create and default-auth bridge writes also validate the derived user document IDs before writing. This is an admission guard only; valid staff mutations keep the same Firestore read/write shape.

Answerlattice management access scope boundary: the shared management access context still performs one `stores/{sId}` read and a bounded user lookup, but persisted store/user/role scope fields now pass the exact Answerlattice Firestore document-ID normalizer before permission context. Malformed persisted scope returns no access context; role normalization is read-only and valid access keeps the same read/write count.

## Deploy

QA rules deploy target:

```bash
firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
```

Production deploy target remains separate and opt-in:

```bash
firebase deploy --only firestore:rules --project answerlattice --config firebase-answerlattice.json --non-interactive
```

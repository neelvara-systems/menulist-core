# Answerlattice Staff Access Control

> Status: Implemented
> Last updated: 2026-07-19
> Product: Answerlattice
> Feature audit: Feature 31 of 44

Answerlattice staff access control gives each Answerlattice workspace its own team member list, default roles, custom roles, and permission-aware dashboard/API access. It is separate from MenuList staff management and does not reuse MenuList restaurant permissions.

## Scope

- Routes: `/answerlattice/team`, `/answerlattice/team/members`, `/answerlattice/team/roles`
- Feature flag: `ENABLE_ANSWERLATTICE_STAFF_ACCESS`
- Role storage: custom definitions only in `stores/{sId}.answerlatticeRoles`; immutable built-ins are projected from shared constants with stable system provenance
- Staff profile storage: `users/{uId}` in Answerlattice Firestore
- Membership contract: one tenant-scoped user can retain multiple workspace mappings; every management route mutates only its authorized workspace mapping
- Login bridge: default Firebase `users/{uId}.productAccounts.AL`
- Permission claims: minted through `/api/auth/set-claims` for Answerlattice Firebase Auth
- Claim input contract: selected workspace and current role derive from the same active, duplicate-free `stores[]` membership used by dashboard authorization; each Auth token carries only that selected workspace, while the durable user record retains the complete membership list
- Built-in role contract: Owner, Manager, and Support Staff are immutable because dedicated and shared Firestore rules enforce the same compatibility defaults; owners use custom roles for different permissions
- Permission dependency: `canAssignRoles` is effective only when the same custom role also has `canManageTeam`; persisted legacy or malformed combinations fail closed, and the editor keeps both toggles coherent
- Staff login model: same MenuList pattern with email/password setup or owner-managed staff ID + temporary passcode, phone metadata, one-time login-detail share, reset, and force sign-out
- Replay contract: a consumed create request cannot restore a workspace membership after removal; re-adding the member requires a new request ID
- Scope integrity: every supplied product, tenant, store, membership, and Firestore document-ID alias must agree; contradictory aliases fail closed
- Projection recovery: a committed removal can be replayed to repair default-account, Answerlattice-claim, and final token-revocation side effects without restoring membership
- Claim convergence: post-commit repair preserves a still-valid selected workspace and rechecks the complete role/permission projection after Auth writes so an older concurrent role save cannot remain authoritative
- Session limit: reset/sign-out revokes refresh tokens, but an already-issued Firebase ID token can remain valid until its normal expiry; public copy must not promise instant invalidation
- Response privacy: access, member, role, and one-time login-detail responses emit private no-store cache control with `nosniff`; browser callers also retain same-origin, no-store, bounded-response admission

## Default Roles

| Role | Purpose |
| --- | --- |
| Owner | Full workspace, team, billing, knowledge, widget, governance, support, integrations, export, and rebuild access |
| Manager | Daily setup, knowledge, widget, support, governance, and readiness work; no billing or role design |
| Support Staff | Support signals only; no workspace, billing, knowledge, governance, or widget controls |

Built-in roles are locked. Custom roles are the only owner-editable permission definitions.

## Permission Groups

- Workspace: readiness, product details, team access, role assignment.
- Knowledge Control: knowledge content, governance, context rebuilds.
- Runtime Surfaces: widget, support signals, workflow notifications.
- Commercial: billing and export.

## Files

- Spec: `staff-access-control_spec.md`
- Implementation: `staff-access-control_impl.md`
- Firebase: `staff-access-control_firebase.md`
- Mobile support: `staff-access-control_mobile-support.md`
- Test cases: `staff-access-control_test-cases.md`
- Owner help: `staff-access-control_helpdoc.md`
- Marketing boundary: `staff-access-control_marketing.md`
- Website boundary: `staff-access-control_website.md`

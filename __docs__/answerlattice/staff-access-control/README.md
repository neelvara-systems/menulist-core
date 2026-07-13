# Answerlattice Staff Access Control

> Status: Implemented
> Last updated: 2026-07-13
> Product: Answerlattice

Answerlattice staff access control gives each Answerlattice workspace its own team member list, default roles, custom roles, and permission-aware dashboard/API access. It is separate from MenuList staff management and does not reuse MenuList restaurant permissions.

## Scope

- Routes: `/answerlattice/team`, `/answerlattice/team/members`, `/answerlattice/team/roles`
- Feature flag: `ENABLE_ANSWERLATTICE_STAFF_ACCESS`
- Role storage: custom definitions only in `stores/{sId}.answerlatticeRoles`; immutable built-ins are projected from shared constants with stable system provenance
- Staff profile storage: `users/{uId}` in Answerlattice Firestore
- Membership contract: one tenant-scoped user can retain multiple workspace mappings; every management route mutates only its authorized workspace mapping
- Login bridge: default Firebase `users/{uId}.productAccounts.AL`
- Permission claims: minted through `/api/auth/set-claims` for Answerlattice Firebase Auth
- Claim input contract: workspace IDs and current role derive from the same active, duplicate-free `stores[]` membership used by dashboard authorization; custom-role claims reuse the already-authorized store snapshot and require an exact, active, unambiguous role
- Built-in role contract: Owner, Manager, and Support Staff are immutable because dedicated and shared Firestore rules enforce the same compatibility defaults; owners use custom roles for different permissions
- Staff login model: same MenuList pattern with email/password setup or owner-managed staff ID + temporary passcode, phone metadata, one-time login-detail share, reset, and force sign-out
- Replay contract: a consumed create request cannot restore a workspace membership after removal; re-adding the member requires a new request ID
- Scope integrity: every supplied product, tenant, store, membership, and Firestore document-ID alias must agree; contradictory aliases fail closed
- Projection recovery: a committed removal can be replayed to repair default-account, Answerlattice-claim, and final token-revocation side effects without restoring membership

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

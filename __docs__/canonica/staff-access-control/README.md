# Canonica Staff Access Control

> Status: Implemented
> Last updated: 2026-05-26
> Product: Canonica

Canonica staff access control gives each Canonica workspace its own team member list, default roles, custom roles, and permission-aware dashboard/API access. It is separate from MenuList staff management and does not reuse MenuList restaurant permissions.

## Scope

- Routes: `/canonica/team`, `/canonica/team/members`, `/canonica/team/roles`
- Feature flag: `ENABLE_CANONICA_STAFF_ACCESS`
- Role storage: `stores/{sId}.canonicaRoles` in Canonica Firestore
- Staff profile storage: `users/{uId}` in Canonica Firestore
- Login bridge: default Firebase `users/{uId}.productAccounts.CN`
- Permission claims: minted through `/api/auth/set-claims` for Canonica Firebase Auth
- Staff login model: same MenuList pattern with email/password setup or owner-managed staff ID + temporary passcode, phone metadata, one-time login-detail share, reset, and force sign-out

## Default Roles

| Role | Purpose |
| --- | --- |
| Owner | Full workspace, team, billing, knowledge, widget, governance, support, integrations, export, and rebuild access |
| Manager | Daily setup, knowledge, widget, support, governance, and readiness work; no billing or role design |
| Support Staff | Support signals only; no workspace, billing, knowledge, governance, or widget controls |

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

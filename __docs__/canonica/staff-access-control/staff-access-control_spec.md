# Canonica Staff Access Control Spec

> Status: Implemented
> Last updated: 2026-05-26

## Owner Outcome

A Canonica workspace owner can add team members, assign roles, create custom roles, deactivate/remove access, and reset login details without exposing MenuList staff controls or restaurant-specific permissions.

## Product Rules

- Canonica remains a separate product using `pId: CN`, `tId`, and `sId`.
- MenuList staff management, mobile screens, and owner dashboard are not modified.
- Support staff can only see and use support-signal surfaces by default.
- Owner role cannot be deleted or stripped of full permissions.
- The last active Owner for a workspace cannot be removed or demoted.
- Users cannot deactivate or remove their own access.

## Permission Requirements

| Area | Permission |
| --- | --- |
| Activation, readiness, weekly digest | `canViewReadiness` |
| Product details | `canManageWorkspace` |
| Team member CRUD | `canManageTeam` |
| Role creation and role assignment | `canAssignRoles` |
| Billing and transactions | `canManageBilling` |
| KB, FAQs, changelog, product surfaces | `canManageKnowledge` |
| Governance and signal queue | `canManageGovernance` |
| Widget and hosted help settings | `canManageWidget` |
| Tickets and conversations | `canManageSupport` |
| Slack/email workflow notifications | `canManageIntegrations` |
| Compiled context rebuilds | `canRebuildContext` |

## Non-Goals

- No cross-product MenuList role reuse.
- No workspace switcher UI in this iteration.
- No public website claims.
- No owner-facing role templates beyond Owner, Manager, and Support Staff.


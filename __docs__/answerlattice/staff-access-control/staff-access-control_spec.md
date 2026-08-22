# Answerlattice Staff Access Control Spec

> Status: Implemented
> Last updated: 2026-07-19
> Feature audit: Feature 31 of 44

## Owner Outcome

An Answerlattice workspace owner can add team members, assign roles, create custom roles, deactivate/remove access, and reset login details without exposing MenuList staff controls or restaurant-specific permissions.

## Product Rules

- Answerlattice remains a separate product using `pId: AL`, `tId`, and `sId`.
- MenuList staff management, mobile screens, and owner dashboard are not modified.
- Support staff can only see and use support-signal surfaces by default.
- Role assignment is a dependent authority, not a standalone route capability. A custom role receives `canAssignRoles` only when it also receives `canManageTeam`; stored combinations that omit team access lose role-assignment authority on normalization.
- Owner, Manager, and Support Staff are immutable. This keeps server authorization, custom claims, and both Firestore rulesets on one permission contract. Different permissions require a custom role.
- The last active Owner for a workspace cannot be removed or demoted.
- Account-wide deactivation checks every Owner membership on the identity, not only the workspace open in the platform administrator's session.
- Users cannot deactivate or remove their own access.
- Self-protection matches both canonical user ID and normalized email identity so different Firebase-project document IDs cannot bypass it.
- Delegated team managers cannot grant, edit, remove, reset, or sign out an Owner. Owner membership and credentials require a current workspace Owner or platform administrator.
- A user record has one Answerlattice tenant and may contain multiple workspace memberships in `stores[]`; an owner or manager can change only the membership for the workspace in their authorized session.
- Removing a member removes the current workspace mapping and preserves every other mapping. Root `storeId`, `sId`, `role`, and bridge state move together to the retained primary membership.
- Account activation is global in the current schema. A workspace-scoped actor therefore cannot activate or deactivate a member who belongs to multiple workspaces; the owner removes that workspace mapping instead. Platform administrators carry an explicit transaction flag for account-wide recovery.
- Password/passcode reset and force sign-out are also account-global. A workspace-scoped actor cannot run them for a multi-workspace identity; a platform administrator must perform that account-wide action.
- Adding a workspace never reactivates an identity that is inactive while another workspace mapping remains.
- Persisted tenant IDs, workspace IDs, role IDs, nested membership objects, and duplicate workspace mappings fail closed before authorization or mutation.
- A present `pId` or `productId` must be `AL`; legacy omission remains readable, but a conflicting product identity is never treated as Answerlattice staff access.
- Answerlattice custom tokens derive selected workspace, selected role, and access revision from that same validated active membership state. Conflicting top-level `storeIds` cannot widen claims.
- A token authorizes only its selected workspace. Complete multi-workspace membership remains in the governed user record and default-auth account projection; switching workspace requires a fresh scoped token.
- Claim repair retains the Auth user's current workspace when it is still a valid membership, otherwise prefers the affected workspace and then the canonical primary membership.
- Public email input cannot use reserved internal login domains; leaving email blank is the supported owner-passcode path.
- A deterministic managed-login identity already owned by another create request is an identity conflict, never a reason to merge two intended people.
- Staff create, access update, removal, last-owner checks, and role-in-use checks are transaction-backed. A concurrent pair of mutations cannot remove every Owner or leave an active member assigned to a disabled role.
- `accessRevision` orders default-auth bridge and Answerlattice Auth claim synchronization. A delayed mutation cannot overwrite newer workspace membership state.
- Bridge ordering uses the maximum nested-account and legacy Answerlattice-root revision. Equal revisions may repair profile/login aliases, but an exact equal-state replay writes nothing.
- Access-context reads normalize role definitions in memory and never backfill the store document. Unknown, inactive, and malformed custom roles grant no fallback permission.
- Duplicate custom role IDs are ambiguous authority and therefore become inactive with no permissions. They cannot be assigned until the owner saves one valid definition.
- A delayed replay of a create request that was already removed fails with `IDEMPOTENCY_CONFLICT`; only a new owner action with a new request ID can restore membership.
- An explicit re-add clears `deleted` and `deletedAt` together so lifecycle state cannot remain half-reactivated.
- Team list overflow is explicit. The server reads one sentinel row beyond the 500-member safety cap and rejects the response instead of silently hiding a member.
- Initial password-setup email is a one-time create side effect. An exact create replay does not resend it; the owner uses the explicit **Reset login** action when recovery is needed.
- The current member row must not present self sign-out, deactivate, or remove controls. Server-side self-mutation guards remain mandatory.
- Saving a custom role transactionally captures every retained assignment, including inactive accounts, then refreshes and revokes Answerlattice Auth claims. A role cannot be disabled or removed while any membership still references it.
- After writing Auth claims, repair rereads the selected store and user and compares the complete account, workspace, role, and permission projection. A concurrent role edit that changes that projection retries instead of certifying stale permissions.
- Product, tenant, store, and membership aliases are compatibility inputs only when they agree exactly. Contradictory aliases, duplicate workspace mappings, malformed IDs, and a Firestore document ID that disagrees with embedded scope all fail closed.
- Disabled accounts project an `inactive` role, an empty claim workspace list, no admin claim, and no role permissions. Reactivation increments the access revision and restores current membership claims.
- Post-commit bridge, claim, and token-revocation work is attempted independently. A failed removal projection returns a retryable error, and replay repairs those projections without recreating the removed membership.
- Firebase refresh-token revocation prevents future token refresh, but an already-issued ID token may remain valid until its normal expiry window. Answerlattice therefore does not claim instant session invalidation and does not add a billed Firestore lookup to every request solely to simulate it.
- Authenticated access, member, role, and temporary-login-detail responses are explicitly private, non-cacheable, and `nosniff`; route failures use the same response policy.

## Permission Requirements

| Area | Permission |
| --- | --- |
| Activation, readiness, weekly digest | `canViewReadiness` |
| Product details | `canManageWorkspace` |
| Team member CRUD | `canManageTeam` |
| Role creation and role assignment | `canAssignRoles` plus its required `canManageTeam` prerequisite |
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

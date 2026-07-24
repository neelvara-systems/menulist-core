# Answerlattice Staff Access Control Test Cases

> Status: Implemented
> Last updated: 2026-07-19
> Feature audit: Feature 31 of 44

## Contract Tests

- Reject null, non-object, duplicate, whitespace-padded, leading-zero, missing-role, and malformed workspace mappings.
- Duplicate custom role IDs are quarantined as inactive with zero permissions; unknown and implicitly inactive custom roles fail closed.
- Built-in role projection is byte-stable across different readers and times, with fixed system provenance.
- `canAssignRoles` without `canManageTeam` normalizes to false, while the valid paired permission remains enabled.
- Self-target detection succeeds across different project-local IDs when normalized email identity matches.
- Setup-email admission is true only for a new email-backed create and false for every replay or owner-passcode path.
- Accept canonical numeric workspace IDs and preserve membership order and primary-workspace selection.
- Reject tenant or workspace mismatches even when another tenant uses the same numeric workspace ID.
- Reject explicit non-Answerlattice or contradictory `pId`/`productId` values while retaining the documented legacy-missing-field reader.
- Claim projection ignores conflicting top-level `storeIds`, rejects duplicate `stores[]`, rejects inactive accounts, and returns only the exact current-workspace role.
- Claim selection keeps a still-valid current workspace, otherwise uses the affected workspace and then the canonical primary membership.
- Unsupported or malformed Answerlattice platform roles normalize to `USER`.
- A maximum bounded Answerlattice singleton-workspace claim projection remains below Firebase Auth's 1,000-byte custom-claim limit.
- Canonical removal with no memberships writes empty `storeIds/stores`, null root workspace IDs, inactive state, and incremented `accessRevision`.

## Emulator Tests

- Two concurrent Owner removals leave exactly one active Owner; the other transaction returns `LAST_OWNER`.
- Updating one workspace role preserves every other workspace mapping and primary root scope.
- A workspace actor cannot toggle the account-global active state for a multi-workspace member.
- The same multi-workspace active-state transaction succeeds only when the server supplies the platform-administrator recovery flag, and can deactivate/reactivate without changing memberships.
- Platform global deactivation still returns `LAST_OWNER` when the identity is the sole active Owner in any other membership workspace.
- Adding another workspace to an inactive identity with retained memberships fails instead of reactivating every workspace.
- Removing one workspace from a legacy `authDisabled` identity preserves the inactive state for retained memberships.
- Workspace actors cannot reset credentials or force-sign-out a multi-workspace identity; platform administrators retain the account-wide path.
- A Manager or custom delegated team role cannot grant, edit, remove, reset, or sign out an Owner.
- Reserved internal authentication email domains are rejected on public staff creation input.
- A managed owner-passcode login collision with a different creation request fails as `IDENTITY_CONFLICT` instead of merging identities.
- Removing the primary workspace promotes the retained membership and updates root `storeId`, `sId`, and `role` together.
- Cross-tenant removal fails before mutation.
- Concurrent create replay produces one membership and one access revision; changed payload with the same request ID returns `IDEMPOTENCY_CONFLICT`.
- Removing a just-created membership and then replaying its original create request cannot restore it; a new request ID can explicitly re-add it.
- Explicit re-add restores membership while clearing both `deleted` and stale `deletedAt`.
- Adding another workspace retains the original mapping.
- Role assignment racing role deactivation permits only one operation; a disabled role is never left assigned to a retained membership. Inactive assignees also block role deactivation/deletion.
- A delayed default-auth bridge revision cannot replace a newer workspace list.
- A legacy Answerlattice root revision also blocks a stale nested bridge write, and equal-revision profile/login or numeric-alias drift is repaired once.
- Writing `productAccounts.AL` preserves a MenuList root account.
- Legacy MenuList roots using `tId`/`sId` are also preserved, and a removed Answerlattice bridge clears stale AL workspace pointers.
- Access reads do not write role backfills, and unknown/inactive roles receive no fallback permission.
- Owner, Manager, and Support Staff role mutations are rejected; custom-role edits refresh and revoke claims for affected members.
- Conflicting product/tenant/store aliases and embedded store IDs that disagree with the Firestore document ID fail closed across session, access, staff, widget, billing, and role-mutation boundaries.
- Inactive staff claim projection emits role `inactive`, an empty workspace list, no admin claim, and no permissions.
- Removal projection failure is retryable; replay finishes bridge, claim, and token-revocation work without recreating membership.
- Create and login-reset projection work uses the same all-settled runner, so a failed default-account bridge cannot prevent the independent Answerlattice claim/revocation attempt.
- Claim synchronization fails visibly when current user state disappears/becomes malformed or when access revisions or selected-store role/permission state keep changing through the bounded retry window; it must not return a false success with stale claims.
- A stale custom-role provider write is detected by the post-write full claim-state signature and retried against current store truth.
- Answerlattice token `storeIds` contains only the selected canonical workspace; durable multi-workspace membership remains unchanged and switching requests a fresh token.
- Supplied set-claims UID is verified against the session email before any Answerlattice Auth write, and concurrent Auth identity creation converges on the email winner.
- Replaying custom-role creation with the same request and payload returns the existing role; changed content with that request ID returns `IDEMPOTENCY_CONFLICT`.

## Browser Contract Tests

- Staff responses reject duplicate or misaligned workspace arrays, malformed nested members, and wrong-typed optional mutation fields.
- Staff responses reject a projected role that disagrees with the current workspace membership, cross-scope user/role objects, and mutation `userId` disagreement.
- A completed owner-passcode create replay never returns a newly generated but invalid replacement passcode.
- The role editor enables team access when role assignment is selected and clears role assignment when team access is removed.
- Access, staff success, staff failure, role, and one-time login-detail responses use the shared private no-store and `nosniff` policy.
- A newer workspace/session access request invalidates every older response, and effect cleanup prevents an in-flight response from settling after a route/session transition.

## Commands

```bash
npm run test:answerlattice-staff-access-contracts
npm run test:answerlattice-staff-client-contracts
npm run test:latest-request-guard
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-staff-concurrency:emulator
node scripts/verification/verify-answerlattice-runtime-truth.js
```

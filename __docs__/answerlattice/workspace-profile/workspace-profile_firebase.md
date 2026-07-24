# Workspace Profile Firebase and Cost

## Collections

No new collection is introduced.

| Document | Purpose |
|---|---|
| `stores/{sId}` | Profile truth and `answerlatticeWorkspaceProfileRevision` |
| `platformSummary/answerlatticeTenantsSummaryShard_*` | Cost-bounded scheduler registry entry |
| `platformSummary/sourceVersions_{tId}_{sId}` | Compiled-context source version |
| `platformSummary/bundleManifest_{tId}_{sId}` | Stale marker for rebuild |

## Operation Cost

The table separates permission admission from profile-owned data work. A non-platform user permission check reads the scoped store and performs the bounded scoped staff-user lookup. A platform-admin session reads the store but skips the staff-user lookup.

| Operation | Permission admission | Profile-owned reads | Writes |
|---|---|---:|---:|
| GET | 1 store read plus non-platform staff lookup | 1 store read | 0 |
| PUT unchanged | 1 store read plus non-platform staff lookup | 1 transaction read | 0 |
| PUT stale conflict | 1 store read plus non-platform staff lookup | 1 transaction read | 0 |
| PUT changed | 1 store read plus non-platform staff lookup | 3 transaction reads | 4 |

Changed saves read the store, source-version document, and bundle manifest so existing control-plane ownership/shape is validated and a missing manifest can be initialized safely. Firestore may retry a contended transaction, increasing reads before one final commit. The changed-save path deliberately spends four writes so the profile cannot be acknowledged while scheduler or retrieval context remains stale.

## Stored Shape

The store retains flat compatibility fields and:

- `answerlatticeWorkspaceProfileRevision`;
- `answerlatticeLaunchProfile` with the normalized profile, preserved original `createdAt`, revision, and `updatedAt`;
- `pId: 'AL'` and `productId: 'AL'`;
- `modifiedOn`.

New onboarding initializes revision `0`. Existing workspaces without the field normalize to revision `0` and move to revision `1` on their first changed save. A missing compiled source-version or manifest document is initialized as a complete scope-valid control-plane record by that changed save; malformed existing control-plane ownership or shape is rejected.

Compiled-context builders treat the owned store document as untrusted persisted input. Only the exact projected product name, safe URL, valid support email, admitted billing model, valid timezone, and valid support-day time may enter immutable bundle objects. Undeclared fields and malformed nested/scalar values are omitted or replaced by the maintained non-sensitive defaults before public Storage upload.

## Security

The route is server-admin only after authenticated permission and exact stored product/scope checks. No direct client Firestore write is added. No security-rule, index, Storage-rule, or Cloud Function change is required, so no Firebase deploy is part of this feature closeout.

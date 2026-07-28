# Workspace Lifecycle Test Cases

## Contract tests

- Exact `AL:{tId}:{sId}:CLOSE` and `AL:{tId}:{sId}:ERASE` confirmations.
- Invalid, cross-product, non-positive, string-confused, or changed scope is rejected.
- Recovery is allowed only before `eraseAfter`.
- Legal hold blocks erasure.
- Export decision and billing review are mandatory.
- Active subscription blocks erasure.
- A subscription activation attempted after the workspace enters `erasing` rejects transactionally and leaves the retained subscription status unchanged.
- Shared-collection rows without exact `AL` identity are classified ambiguous and not deleted.
- The deletion manifest excludes subscriptions, payment transactions, and unrelated product collections.

## Firestore rule tests

- Active workspace member can read an in-scope Answerlattice document.
- The same still-valid token cannot read after `active=false`, `deleted=true`, or `authDisabled=true`.
- Another tenant remains denied.
- Platform operator access remains available for recovery/erasure.
- Dedicated and shared rules produce the same Answerlattice result.

## Storage rule tests

- Active owner/support roles can access allowed support media.
- The same claims fail after workspace closure.
- Platform client access to closed customer media fails; Admin SDK erasure remains server-only.
- Dedicated and shared Storage rules produce the same result.

## Emulator lifecycle tests

- Closure marks store and summaries inactive and removes credential fields.
- Closure denies access before hosted-help and compiled-object cleanup is reported complete.
- Seed 51 private and 51 public compiled objects. The first close attempt deletes one bounded batch, returns `COMPILED_BUNDLE_CLEANUP_INCOMPLETE`, and leaves the workspace denied in `closing`; the retry empties both prefixes and reaches `closed`.
- Public compiled cleanup accepts only the deterministic ID for exact tenant/workspace plus the configured server salt; a merely valid `pb_` value for another workspace requires operator review and is never deleted.
- A partial-build public object is removed from the deterministic prefix even after its manifest and saved lifecycle pointer are absent.
- Public bundle source verification requires rate limiting and an exact Storage existence check before any process-cache response, mandatory-revalidation response/object metadata, and rejects the former one-year immutable transport policy.
- Dedicated and shared Storage-rule emulators seed the exact compiled public path and prove anonymous, tenant-owner, and platform client reads fail; Admin lifecycle/build access remains server-only.
- Recovery restores only active state and does not recreate secrets.
- A new closure after recovery starts a fresh 30-day recovery window.
- Erasure deletes only exact-scope rows.
- Bounded erasure returns continuation when rows remain.
- Foreign-product rows sharing numeric aliases remain untouched.
- Subscriptions, payment transactions, and bounded scheduler evidence remain retained.
- Finalization leaves a scrubbed tombstone and declared retained records.

The local Auth/Firestore/Storage service emulator proves that closure discovers a legacy `tId`/`sId`-only staff record, removes its active workspace claim, disables and later recovers its Auth identity, and deletes that identity after terminal erasure. It also proves that a multi-workspace identity remains enabled, moves claims to its active sibling workspace, and retains only that membership after erasure. Production-provider Auth deletion remains QA rehearsal evidence.

## Release evidence

- QA Firestore/Storage rule deployment and readback.
- Cross-service Storage-rule Firestore permission.
- QA close/recover rehearsal.
- QA erasure rehearsal on a seeded disposable workspace.
- Auth, Storage, Firestore, billing, and tombstone evidence captured.

# Workspace Lifecycle Implementation

## Architecture

The implementation uses:

- `src/lib/answerlattice/workspaceLifecycleContracts.ts` for pure lifecycle validation, confirmations, scope checks, and the deletion manifest;
- `src/lib/answerlattice/workspaceLifecycleServer.ts` for platform-only inspection, closure, recovery, and bounded erasure;
- `src/app/api/answerlattice/platform/workspace-lifecycle/route.ts` for authenticated operator access;
- `src/lib/answerlattice/staffAccessTransactions.ts` and `staffAccessServer.ts` for safe removal of only the erased workspace membership and projection repair;
- Firestore and Storage rules for live active-workspace checks;
- `scripts/verification/test-answerlattice-workspace-lifecycle-contracts.ts` and emulator tests for destructive boundaries.

## Operator API

### `POST`

Actions:

- `close`
- `recover`
- `set_legal_hold`
- `start_erasure`
- `continue_erasure`

Every mutation has a bounded body, fail-closed rate limit, platform-only identity check, exact scope validation, private no-store response, and exact confirmation for close, recovery, and erasure. There is no customer-readable lifecycle endpoint.

## Bounded erasure

Each erasure call:

1. re-reads the scrub-resistant store lifecycle tombstone;
2. rechecks legal hold, billing, export decision, scope, and state;
3. deletes at most the configured document budget;
4. validates every candidate document before deletion;
5. rejects ambiguous shared-collection rows instead of deleting them;
6. advances only after a complete empty pass;
7. removes workspace memberships without deleting unrelated memberships;
8. deletes dedicated Answerlattice Auth users only when no Answerlattice memberships remain;
9. removes the Answerlattice product-account bridge from the shared default identity while preserving the identity;
10. scrubs tenant/store records and writes final evidence.

No scheduler is added. An operator explicitly invokes each continuation.

The deletion-side billing check is paired with a writer-side lifecycle fence. Answerlattice initial subscription creation, active updates, captured payments, active lifecycle/webhook transitions and upgrade carry-forward read the exact store inside their billing transaction and reject inactive, closing, closed, erasing, erased or malformed lifecycle state. Direct onboarding persistence applies the same gate to its transaction-current store. A provider callback therefore cannot activate billing between the erasure check and irreversible deletion.

## Failure behavior

- Closure failure after access denial leaves the workspace in `closing`; retry continues public/runtime cleanup without restoring access.
- Compiled cleanup first derives the one valid public prefix from exact scope plus `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`; it uses that prefix even when a partial build has no manifest or a legacy manifest has an empty pointer. A missing salt or non-empty mismatched manifest stops for operator review instead of selecting a syntactically valid foreign prefix. Cleanup then lists at most 51 objects per private/public prefix, deletes at most 50, and returns `COMPILED_BUNDLE_CLEANUP_INCOMPLETE` when another retry is required. Public bundle responses and object metadata require revalidation, and the proxy checks object existence before serving its process cache, so completed deletion revokes the origin.
- Erasure failure leaves `erasing`; retry continues from remaining data.
- A non-terminal bounded call returns `complete: false` with persisted progress.
- Scope ambiguity, active billing, legal hold, missing export decision, or missing confirmation returns a hard rejection.
- Erasure never rolls back deleted data.

## Release boundary

Closure and erasure use the same bounded tenant-wide staff discovery across canonical `tenantId` and legacy `tId` projections. Exact target membership is derived through the strict staff-access contract. Any over-limit tenant set or malformed record that still references the target workspace requires manual review instead of silently advancing. Claim repair selects another active workspace for multi-workspace staff; otherwise it emits no active store membership and disables the dedicated Auth identity.

The local Auth/Firestore/Storage service emulator proves legacy staff claim revocation, recovery, single-workspace Auth deletion, and preservation of another active membership. Source evidence still does not prove deployed Firebase rules, production billing state, production-provider Auth behavior, or a production deletion certificate. Those remain operator evidence.

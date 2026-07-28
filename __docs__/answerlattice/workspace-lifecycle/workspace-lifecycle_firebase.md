# Workspace Lifecycle Firebase and Cost

## Firestore operations

| Operation | Reads | Writes/deletes | Notes |
| --- | --- | --- | --- |
| Inspect | Store, tenant summary shard, store summary, subscription, capped manifest counts | 0 | Platform-only and rate-limited. |
| Close | Store, manifest, hosted-help matches, staff memberships, and compact summaries | Access-denial transaction, hosted-help deletes, compiled-object deletes, final closed-state/audit transaction, and claim refresh | No subscription mutation. Access is denied before public cleanup. |
| Recover | Store and summaries | Store + two summary writes | Does not restore secrets or bundles. |
| Erasure continuation | Capped single-field queries and exact-scope validation | At most the configured batch budget | Repeated explicit calls; no scheduler. |
| Finalize | Store, tenant, remaining stores, membership users | User membership updates/deletes, tenant delete/scrub, store tombstone | Financial rows retained. |

## Security-rule cost

Customer Firestore and private Storage access performs one active-workspace document lookup against `stores/{sId}`. This adds a billed rule read where Firebase bills cross-document rule evaluation. The read is required so a stale ID token cannot continue accessing a closed workspace.

This is an intentional security cost. Anonymous public compiled-bundle reads do not perform the Firestore rule lookup, but the proxy performs one exact Storage existence check on every admitted request before serving a bounded process payload cache. Public object and proxy responses use `public, max-age=0, must-revalidate`; closure deletes at most 50 compiled objects per prefix per attempt and remains in denied `closing` state until exact retries empty the prefixes.

## Deletion manifest

The manifest covers:

- governed-answer collections;
- knowledge, FAQ, surface, release, changelog, and intake records;
- support tickets, chats, feedback, signals, analytics, and retained caches;
- platform-summary documents owned by the exact workspace;
- nested changelog, AI-operation, and weekly-insight paths;
- hosted-help registry rows;
- support and intake Storage prefixes;
- public/private compiled context prefixes;
- Answerlattice staff memberships and dedicated Auth identities.

Staff discovery is tenant-wide and bounded across both `tenantId` and legacy `tId`. Strict membership normalization selects only exact Answerlattice workspace identities; ambiguous target references or an over-limit result stop closure claim completion and stop erasure progression. Closed workspaces are removed from custom-claim `storeIds`. A single-workspace identity is disabled, while a multi-workspace identity is reassigned to another active membership.

Shared collections require exact `AL` product identity. Ambiguous rows stop finalization and require operator review.

## Retention

Financial rows and compact erasure evidence are not deleted by the workspace content manifest. Existing TTL policies continue to own short-lived operational logs. Legal hold blocks erasure but not access denial.

Billing activation is fenced in the owning mutation transaction. Answerlattice provider billing adds the exact `stores/{sId}` read and requires exact scope plus operational lifecycle state before an initial subscription, payment activation, reactivation, active webhook update or upgrade can commit. Direct onboarding uses the store already read by its provisioning transaction. This adds one transactional document read to provider billing mutations and prevents activation from racing irreversible erasure.

The lifecycle is disabled by default and has no idle cost. There is no lifecycle listener, scheduler, polling job, or background scan. Operators pay only for an explicitly invoked close, recover, legal-hold, or capped erasure continuation.

## Firebase deployment

Any change to `firestore-answerlattice.rules`, `firestore.rules`, `storage-answerlattice.rules`, or `storage.rules` requires:

1. dedicated and shared emulator tests;
2. Answerlattice source/type gates;
3. QA deploy and rule readback;
4. cross-service Firestore access permission verification for Storage rules.

# Answerlattice Workspace Lifecycle

**Status:** Implemented behind a disabled rollout flag; QA deployment and operator rehearsal pending
**Scope:** Answerlattice only
**Owner surface:** Platform operations
**Last updated:** 2026-07-26

## Purpose

This feature provides the reviewed path from an active Answerlattice workspace to:

1. reversible closure;
2. immediate denial of customer data access;
3. export, billing, legal-hold, and retention review;
4. bounded, resumable erasure;
5. a compact non-content erasure certificate.

It closes the C3 account-lifecycle gap without adding a self-service destructive button, a generic workflow engine, automatic billing actions, or cross-product deletion.

## Frozen decisions

- Closure is platform-only and requires an exact `AL:{tId}:{sId}:CLOSE` confirmation.
- Closure is reversible for 30 days unless an operator starts erasure.
- Closed workspaces fail the active-workspace check in app scope, Firestore rules, and Storage rules.
- Public API and widget credentials are revoked at closure and are not restored by recovery.
- Compiled public/private context objects and hosted-help registry rows are removed before closure is reported complete.
- Erasure is platform-only, explicitly confirmed, and blocked by an active legal hold, an unresolved active subscription, an undecided Support Truth Export, or an unexpired recovery window.
- Erasure runs in bounded calls. A retry continues from remaining documents instead of replaying deleted data.
- Financial records and compact security/deletion evidence are retained only as declared exceptions. The workflow does not silently refund, cancel, or alter a subscription.
- MenuList, CampaignCue, SignalDesk, default-auth identities, and unrelated workspace memberships are never deleted by this lifecycle.

## Documents

- [Specification](./workspace-lifecycle_spec.md)
- [Implementation](./workspace-lifecycle_impl.md)
- [Firebase and cost](./workspace-lifecycle_firebase.md)
- [Help and operations](./workspace-lifecycle_helpdoc.md)
- [Mobile relevance](./workspace-lifecycle_mobile-support.md)
- [Test cases](./workspace-lifecycle_test-cases.md)
- [Internal marketing boundary](./workspace-lifecycle_marketing.md)
- [Website boundary](./workspace-lifecycle_website.md)

## Global references

- [Authentication security](../../security/authentication/complete-guide.md)
- [Answerlattice backup and recovery](../deployment/answerlattice-backup-recovery-runbook.md)
- [Support Truth Export](../support-truth-export/README.md)
- [Answerlattice data inventory](../data-inventory/answerlattice-data-inventory_data-map.md)

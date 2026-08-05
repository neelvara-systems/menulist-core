# Native Knowledge Intake Connectors - Implementation

> **Status:** No runtime implementation exists
> **Last Updated:** 2026-08-05

## Current Source Boundary

- `src/config/features.ts` contains one reserved false flag.
- No runtime reads the flag.
- `functions-answerlattice/src/constants/features.ts` intentionally has no matching flag.
- No connector route, OAuth callback, credential store, provider adapter, sync worker, webhook, poller, UI, or scheduler task exists.
- Existing workflow-notification adapters are outbound governance-event delivery and are not intake connectors.

## Working Alternative

Knowledge Intake already accepts owner-selected sources through existing bounded contracts. Repeated replies and helpdesk exports can create review items without native inbox/helpdesk access. Selected URL discovery is public and SSRF-guarded; it is not credentialed crawling.

Release evidence can also prefill the existing Changelog editor through a scope-bound, expiring browser envelope after the normal intake source write. That utility contains no credential, provider client, callback, webhook, poller, or sync cursor and must not be expanded into one.

## Future Implementation Order

If the reconsideration gate passes:

1. Create the provider-specific doc/RFC and threat model.
2. Add exact server-only credential storage and revocation.
3. Add selected-container permission and source metadata contracts.
4. Add one owner-triggered initial import with bounded pagination.
5. Add source deletion/disconnect and dependent-answer review.
6. Prove manual refresh and failure recovery.
7. Add background sync only if measured customer use requires it.
8. Keep all imported material as evidence until human approval.

Do not add shared connector abstractions before a first provider proves real duplication.

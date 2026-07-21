# Answerlattice - Native Helpdesk and Jira Connectors

> **Status:** DO NOT BUILD NOW
> **Feature:** 43 of 44
> **Version:** 1.1.0
> **Last Updated:** 2026-07-20
> **Runtime:** Not implemented

## Current Product Truth

Answerlattice has no native Zendesk, Intercom, Freshdesk, Help Scout, or Jira source connector. There is no provider flag, OAuth route, credential store, webhook, poller, sync worker, provider adapter, connector UI, rule, index, or public availability claim.

The current founder workflow is:

```text
selected helpdesk export, macros, canned replies, resolved examples, or Jira export
-> bounded Knowledge Intake or Repeated Reply Import
-> evidence and source metadata
-> human review
-> existing KB, FAQ, product-surface, or canonical-answer proposal workflow
```

Imported tickets and issues remain evidence. They are not approved product truth.

## Decision

Do not build five connectors to increase connector count. A solo founder benefits only if one connector removes measured recurring export or maintenance work and still preserves selected-resource permissions, privacy, deletion, and governed approval.

## Reconsideration Gate

Implement one provider only when all are true:

1. At least three paying workspaces request the same provider.
2. Export/import prevents activation or causes repeated maintenance for those workspaces.
3. The provider materially improves the first trusted-answer workflow, not generic ticket operations.
4. Exact resources and minimum read-only scopes can be selected and preserved.
5. Revocation, reconnect, deletion, retention, replay, rate-limit, and partial-sync behavior are designed.
6. Provider setup and support cost fit expected revenue.
7. A manual concierge import proves the expected approved-answer or knowledge-gap outcome first.
8. The provider can exclude attachments, internal notes, requester profiles, private URLs, and unrelated conversation history by default.

## Smallest Future Scope

If admitted later, the first connector is read-only and imports an owner-selected bounded window of support text and minimal source metadata. Attachments, internal notes, requester profiles, and unrestricted conversation history stay excluded. It has manual refresh before background sync, never writes back to the provider, never exposes private provider URLs as public citations, never publishes answers automatically, and sends changed or deleted evidence into review.

## Verification

- `npm run verify:answerlattice-native-helpdesk-connectors`
- `npm run verify:answerlattice-runtime-truth`
- `npm run docs:check-links`

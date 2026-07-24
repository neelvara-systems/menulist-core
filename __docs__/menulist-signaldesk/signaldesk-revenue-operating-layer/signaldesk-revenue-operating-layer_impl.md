# SignalDesk Revenue Operating Layer - Implementation

**Status:** Runtime implemented and locally verified
**Created:** July 10, 2026
**Last verified:** July 21, 2026

## Feature Flag

`ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER`

The flag enables private records/UI only. It does not change `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND`.

## File Structure

Create or update only:

```txt
__docs__/menulist-signaldesk/signaldesk-revenue-operating-layer/*
__docs__/menulist-signaldesk/README.md
__docs__/menulist-signaldesk/menulist-signaldesk_{spec,impl,firebase,validation,feature-map,action-register,decision-log}.md
src/config/features.ts
src/constants/signaldesk/database.ts
src/constants/signaldesk/routes.ts
src/types/signaldesk/index.ts
src/database/signaldesk/index.ts
src/lib/signaldesk/workflowServer.ts
src/app/api/signaldesk/actions/route.ts
src/app/api/signaldesk/workspace/route.ts
src/app/(signaldesk)/signaldesk/revenue/page.tsx
src/components/signaldesk/SignalDeskWorkspace.tsx
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
scripts/verification/verify-signaldesk-runtime.js
scripts/verification/e2e-signaldesk-local.js
package.json
```

## Collections

```txt
signaldeskRevenueAccounts
signaldeskCommercialOpportunities
signaldeskCommercialOffers
signaldeskOperatingEnvelopes
signaldeskActivationWatches
signaldeskRevenueControlSummaries
```

## Server Actions

| Action | Permission | Behavior |
| --- | --- | --- |
| `qualify-revenue-account` | `target.review` | Deterministically creates/updates an account and creates an opportunity only when qualification passes. |
| `upsert-commercial-opportunity` | `target.review` | Transactionally revalidates current target/source/contact authority and updates non-won stage, status, offer-derived currency, value, probability, next action, SLA, reasons, founder attention, and compact forecast deltas. |
| `upsert-commercial-offer` | `signaldesk.configure` | Founder-admin control creates an immutable deterministic offer version with price and discount authority. |
| `upsert-operating-envelope` | `signaldesk.configure` plus founder-role server check | Requires an active pod, validates compatible referenced controls, preserves immutable versions/approval history, and stores only held/shadow/approval-only policy. |
| `refresh-activation-watch` | `target.review` | Transactionally derives activation from SignalDesk outcomes and closes the linked opportunity on two-surface activation. |
| `review-market-pod` | `signaldesk.configure` + founder role | Records explicit approve/hold/reject evidence; recommendation and research paths cannot activate pods. |

All actions reuse the protected SignalDesk action API, Zod validation, existing SignalDesk access checks, rate limiting, bounded body parsing, audit, and generic error handling. Exact successful replays are no-ops after validation. Duplicate commercial terms/references fail before persistence.

Existing protected actions also complete the event-driven loop:

- `capture-reply` invokes deterministic revenue qualification only for `interested` replies and records a bounded sync status;
- `record-outcome` automatically invokes transactional activation derivation when the target already has a revenue account;
- `qualify-revenue-account` reconciles prior target outcomes after account creation when the outcome arrived first;
- qualification treats only `two_surface_activation` as won/customer authority; legacy `converted` or published-only state remains commercially open;
- both preserve the durable reply/outcome when a derived commercial projection needs recovery and log only bounded diagnostics;
- the explicit `refresh-activation-watch` action remains available as a recovery recheck, not a required operating step.

## UI

`/signaldesk/revenue` shows:

- revenue-control summary;
- target qualification control;
- revenue accounts;
- commercial opportunity pipeline;
- standard commercial offers;
- explicit active-offer selection for opportunity and envelope work;
- operating envelopes and current execution boundary;
- activation watches;
- read-time seven-day stall state and stalled-activation count;
- founder-attention totals.

Daily Growth Mission includes open opportunities, overdue next actions, stalled activations, founder-attention minutes, and estimated AI/provider spend. It remains a deterministic founder decision brief, not an autonomous executor.

Market-pod recommendation and research writes preserve founder-reviewed scope and approval history. New or unreviewed pods remain held with zero pod budget until the founder uses `review-market-pod`. Operating-envelope validation requires the pod's active status, `reviewDecision: approved`, and `approvedBy` evidence. Only `founder-admin` can store an approved envelope, and its transaction rereads every referenced source policy, offer, pod, optional budget, sender, and template before any write so a concurrent control change cannot slip through the approval boundary.

The Bengaluru first-pod seed is create-only except for one exact legacy migration from the old unapproved held Mumbai default. Once a pod is founder-controlled or no longer matches that legacy shape, later default-seed runs do not rewrite its status, budget, approver, location, or scope.

Mobile does not load the Revenue section. SignalDesk's mobile workspace contract is dashboard-only, and the server returns `403` for a mobile Revenue request. Revenue remains a desktop commercial-governance surface rather than a second mobile DAL or UI.

## Summary Writes

Each account/opportunity/watch mutation transactionally updates a compact `signaldeskRevenueControlSummaries/current` document with bounded field increments. The summary records its pipeline currency so unlike minor-unit values cannot be combined. The revenue screen never scans raw event/message collections.

## Execution Boundary

No scheduler, provider call, send, social publish, proposal provider, calendar provider, payment provider, or MenuList truth write is introduced. Seven-day stall state uses the target's canonical owner-qualified time, latest bounded outcome context, and a terminal activation lookup; event-driven projection updates reuse existing server actions. Dashboard activation presentation falls back to the strict server-authored target activation projection when the global outcome window is saturated, while targeted settlement continues to require coupled summary/event authority. This establishes the governed commercial state needed before connectors can be justified by operating evidence.

## Local Verification

- `npm run verify:signaldesk` passes the route, action, collection, boundary, UI, rules/index, docs, and E2E-fixture assertions.
- `SIGNALDESK_E2E_FOCUS=revenue npm run test:signaldesk:e2e:local` passes the isolated Revenue lifecycle, exact-replay, authority-withdrawal, and activation tests.
- The current complete aggregate run clears business assertions but can stop late with the documented Firestore emulator-only `Transaction is invalid or closed` lock behavior. Affected focused stages pass independently; production validation and concurrency assertions remain unchanged.
- `npm run test:signaldesk:rules` passes public/member/admin Firestore and Storage semantics, including client-write denial for every revenue collection.
- `npm run typecheck` passes.

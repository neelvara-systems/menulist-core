# SignalDesk Outcome Bridge - Implementation Plan

**Status:** Initial implementation blueprint
**Created:** June 23, 2026

## Suggested Future Modules

```txt
signaldesk/
  outcomeBridge/
    outcomeTypes.ts
    routeTokenService.ts
    outcomeEventIngest.ts
    attributionEngine.ts
    outcomeSummaries.ts
    menuListBridgePolicy.ts
    OutcomeTimeline.tsx
    AttributionPanel.tsx
```

## Data Flow

```txt
approved action
  -> create scoped route token
  -> prospect uses MenuList-controlled route
  -> MenuList or operator emits outcome event
  -> outcome bridge validates scope
  -> append outcome event
  -> update attribution touches
  -> update outcome summaries
```

## Route Token Contract

Route tokens should be:

- opaque,
- scoped to one target/action/channel,
- expiring,
- revocable,
- non-sensitive,
- safe to include in links.

## MenuList Boundary

SignalDesk can:

- generate route metadata,
- receive outcome events,
- link to MenuList records,
- show attribution summaries.

SignalDesk cannot:

- create or edit MenuList stores,
- publish menus,
- approve owner content,
- change billing,
- write customer-facing public output.

## Implementation Order

1. Define route token and outcome event schemas.
2. Implement token creation for approved actions.
3. Implement manual outcome event recording.
4. Add dedupe and idempotency rules.
5. Add attribution touch calculations.
6. Add outcome summary updater.
7. Add bridge audit events.
8. Integrate with demand signal capture only after event schema stabilizes.

## Failure Handling

| Failure | Handling |
| --- | --- |
| Expired token used | Record rejected bridge audit event. |
| Duplicate outcome event | Ignore duplicate and preserve first event. |
| Unknown MenuList record | Hold event in review state. |
| Suppressed target converts | Record outcome, but do not allow further outreach without admin review. |

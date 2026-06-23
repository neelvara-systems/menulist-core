# SignalDesk Demand Signals - Implementation Plan

**Status:** Initial implementation blueprint
**Created:** June 23, 2026

## Suggested Future Modules

```txt
signaldesk/
  demandSignals/
    demandSignalTypes.ts
    demandSignalIngest.ts
    surfaceHookPolicy.ts
    demandSignalSummaries.ts
    referralSignals.ts
    viralRouteAttribution.ts
    DemandSignalPanel.tsx
```

## Data Flow

```txt
MenuList-controlled surface or operator referral
  -> validate allowed payload
  -> normalize compact signal
  -> apply suppression/source policy
  -> append demand signal
  -> update summaries
  -> optionally create target review item
  -> optionally connect route attribution
```

## Capture Sources

| Source | First-build handling |
| --- | --- |
| QR/menu link | Aggregate by surface, market, route token, and time bucket. |
| Claim/setup CTA | Create business-facing review item when enough business context exists. |
| Customer request | Store compact event only; do not identify customer. |
| Partner referral | Operator-entered or verified referral item. |
| Shared route | Connect to outcome bridge route token when present. |

## Implementation Order

1. Define allowed signal payloads.
2. Define blocked fields and validation.
3. Implement manual referral signal entry.
4. Implement route-token signal ingest.
5. Implement aggregate QR/link signal ingest.
6. Implement summary updater.
7. Add target review-item creation for business-facing signals only.
8. Add control-room demand health metrics.

## Integration Points

| Feature | Integration |
| --- | --- |
| Target registry | Demand signals can prioritize or create review targets when business-facing. |
| Outcome bridge | Route-token and outcome-linked signals share attribution references. |
| Source policy | Signal payloads must include allowed source and purpose. |
| Control room | Demand volume, stale hooks, and rejected payloads feed health summaries. |

## Guardrails

- No raw customer identity from anonymous public usage.
- No automatic outreach from demand signal alone.
- No bypass of source policy or suppression.
- No full event-stream dashboard reads.

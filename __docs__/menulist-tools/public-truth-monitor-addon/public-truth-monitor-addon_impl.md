# Public Truth Monitor Add-On - Implementation

**Last Updated:** July 4, 2026
**Status:** Runtime implemented

---

## Implementation Decision

The first V2 runtime slice is implemented as a paid owner add-on inside Business Health.

It stores capped saved history from the existing V1 owner readiness report and renders a downloadable text report for owner, partner, or agency handoff. It does not crawl, inspect, or mutate external sources.

## Runtime Shape

Implemented:

1. Entitlement reader for the paid add-on.
2. Capped report-history data model.
3. Read-only report builder that reuses `buildOwnerPublicTruthReadinessReport`.
4. Manual owner refresh endpoint.
5. Monthly/partner text report renderer from saved latest/history.
6. Desktop Business Health panel.
7. Mobile Business Health card inside the existing mobile shell.
8. Source gate: `scripts/verification/verify-public-truth-monitor-addon.js`.

Not implemented in this slice:

1. Background monthly scheduler task.
2. Multi-location comparison runtime.
3. Email delivery.
4. Managed repair workflow.
5. External adapters or AI/search sampling.

## Files

| File | Role |
| --- | --- |
| `src/constants/publicTruthMonitor.ts` | Summary doc id, caps, source boundary, and owner label |
| `src/types/publicTruthMonitor.ts` | Entitlement, summary, history, and export contracts |
| `src/lib/public-truth-tools/publicTruthMonitorEntitlements.ts` | Paid access decision |
| `src/lib/public-truth-tools/serverPublicTruthMonitorEntitlements.ts` | Server-side subscription-backed entitlement |
| `src/lib/public-truth-tools/publicTruthMonitorReport.ts` | Capped monitor report builder |
| `src/database/publicTruthMonitor/server.ts` | Server store/project/summary read-write helpers |
| `src/database/publicTruthMonitor/index.ts` | Browser API client and report download text helper |
| `src/hooks/publicTruthTools/usePublicTruthMonitor.ts` | Shared owner hook |
| `src/app/api/public-truth-monitor/summary/route.ts` | Entitled summary read API |
| `src/app/api/public-truth-monitor/refresh/route.ts` | Entitled manual refresh/write API |
| `src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx` | Desktop owner/agency surface |
| `src/components/mobile/components/MobilePublicTruthMonitorCard.tsx` | Mobile read-only card and refresh action |
| `scripts/verification/verify-public-truth-monitor-addon.js` | Source gate |

## Data Contract

Preferred document shape:

```txt
platformSummary/publicTruthMonitor_{storeId}
```

Use a capped latest document plus small bounded history. Do not create one document per check per tool per location.

Retention cap:

```txt
maximum 6 reports per store by default
```

## Runtime Rules

- Read owner truth through authenticated server helpers.
- Verify tenant/store access before any owner data read.
- Require the existing Business Health `VIEW_ANALYTICS` store permission before summary reads or refresh writes.
- Keep history in one capped summary document.
- Keep reports read-only unless owner-approved repair work has its own workflow.
- Do not fetch external profiles.
- Do not send report emails without a separate notification approval.
- Do not add a public V2 route.
- Do not mutate canonical MenuList truth from monitor output.

## Remaining Runtime Boundary

Background recurrence must use the existing MenuList maintenance scheduler with a per-task lease. It is not enabled while `PUBLIC_TRUTH_MONITOR_SCHEDULER_MODE` is `manual`.

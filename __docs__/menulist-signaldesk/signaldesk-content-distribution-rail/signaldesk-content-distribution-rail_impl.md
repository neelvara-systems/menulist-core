# SignalDesk Content Distribution Rail - Implementation

**Status:** Implemented for internal testing
**Date:** June 24, 2026

## Runtime Files

| File | Role |
| --- | --- |
| `src/app/(signaldesk)/signaldesk/content/page.tsx` | Content route entry. |
| `src/components/signaldesk/SignalDeskWorkspace.tsx` | Content UI panels and action handlers. |
| `src/app/api/signaldesk/actions/route.ts` | Protected action validation and dispatch. |
| `src/lib/signaldesk/workflowServer.ts` | Server-side content rail workflow. |
| `src/types/signaldesk/index.ts` | Content source, asset, draft, calendar, and performance contracts. |
| `src/constants/signaldesk/database.ts` | Content collection names. |
| `src/database/signaldesk/index.ts` | Client action union. |
| `firestore-signaldesk.rules` | Read-only client access. |
| `firestore-signaldesk.indexes.json` | Composite indexes. |
| `scripts/verification/verify-signaldesk-runtime.js` | Drift verifier. |

## Action Flow

```txt
upsert-content-source
  -> signaldeskContentSources
create-content-asset
  -> signaldeskContentAssets
generate-content-distribution-drafts
  -> signaldeskContentDistributionDrafts
review-content-distribution-draft
  -> approval/status update
schedule-content-distribution-draft
  -> signaldeskContentCalendarItems
record-content-performance
  -> signaldeskContentPerformanceSummaries
  -> optional signaldeskDemandSignalSummaries
```

## Safety Gates

- `ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL` must be true.
- `content-distribution` kill switch blocks content writes that advance the rail.
- Draft scheduling requires `approvalStatus = approved`.
- Client writes remain denied in Firestore rules; mutations go through the protected action API.
- Performance capture is manual and compact.

## Distribution.ai Adaptation

Adopted:

- Source asset to channel-ready drafts.
- Content calendar queue.
- Brand/proof-aware repurposing.
- Performance feedback.

Rejected:

- Auto-publishing as the default.
- Broad social manager scope.
- Public productization.

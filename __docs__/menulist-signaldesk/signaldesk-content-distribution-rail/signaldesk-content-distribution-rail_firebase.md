# SignalDesk Content Distribution Rail - Firebase

**Status:** Implemented for internal testing
**Date:** June 24, 2026

## Collections

| Collection | Purpose | Client access |
| --- | --- | --- |
| `signaldeskContentSources` | Source registry for content inputs. | Read only for SignalDesk members/admins. |
| `signaldeskContentAssets` | Canonical asset and proof message records. | Read only for SignalDesk members/admins. |
| `signaldeskContentDistributionDrafts` | Platform-ready drafts and approval status. | Read only for SignalDesk members/admins. |
| `signaldeskContentCalendarItems` | Queued manual distribution schedule. | Read only for SignalDesk members/admins. |
| `signaldeskContentPerformanceSummaries` | Compact performance records. | Read only for SignalDesk members/admins. |

All writes are server/admin writes through `src/app/api/signaldesk/actions/route.ts`.

## Indexes

- `signaldeskContentSources`: status plus updatedAt.
- `signaldeskContentAssets`: status plus updatedAt; sourceType plus updatedAt.
- `signaldeskContentDistributionDrafts`: status plus updatedAt; channel/status/updatedAt; contentAssetId/updatedAt.
- `signaldeskContentCalendarItems`: status plus scheduledFor.
- `signaldeskContentPerformanceSummaries`: contentAssetId/capturedAt; channel/capturedAt.

## Cost Posture

- Workspace reads are capped by the shared `LIST_LIMIT`.
- Draft generation writes one draft per selected channel plus audit, timeline, cost, and queue summary.
- Scheduling writes one draft update, one calendar item, audit, timeline, and cost.
- Performance capture writes one compact performance doc; it writes one demand summary only when owner-quality signals exist.

## Deploy

No Firebase deploy was run in this pass. Validate with:

```bash
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```

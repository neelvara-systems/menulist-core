# SignalDesk Control Room - Firebase Plan

**Status:** Initial Firebase design
**Created:** June 23, 2026

## Collections

| Collection | Purpose | Read Pattern |
| --- | --- | --- |
| `signaldeskControlRoomSummaries` | Overall health snapshot for dashboard. | Default dashboard read. |
| `signaldeskChannelHealthSummaries` | Sender/channel health by day/channel. | Dashboard and channel detail. |
| `signaldeskCostDailySummaries` | AI, Firestore, and provider cost posture. | Daily dashboard and alerts. |
| `signaldeskIncidents` | Open/resolved operational incidents. | Incident queue. |
| `signaldeskKillSwitches` | Global and scoped pause controls. | Read by write/action paths. |
| `signaldeskAiEvalSummaries` | AI quality and override metrics. | Dashboard and eval review. |
| `signaldeskSourceHealthSummaries` | Source quality and policy health. | Dashboard and source review. |
| `signaldeskQueueSummaries` | Approval, inbox, and work-item backlog. | Dashboard. |

## Required Fields

| Object | Required fields |
| --- | --- |
| Kill switch | `switchId`, `scope`, `status`, `reason`, `setBy`, `setAt`, `expiresAt`, `clearedAt` |
| Incident | `incidentId`, `type`, `severity`, `status`, `ownerId`, `openedAt`, `resolvedAt`, `resolutionNote` |
| Cost summary | `summaryId`, `day`, `aiCostEstimate`, `firestoreReadEstimate`, `firestoreWriteEstimate`, `providerCostEstimate`, `updatedAt` |
| Health summary | `summaryId`, `scope`, `status`, `metrics`, `staleAfter`, `updatedAt` |

## Indexes

| Query | Index |
| --- | --- |
| Open incidents | `status`, `severity`, `openedAt desc` |
| Active kill switches | `status`, `scope`, `setAt desc` |
| Daily costs | `day desc` |
| Channel health | `channel`, `day desc` |
| Queue summaries | `scope`, `updatedAt desc` |

## Cost Rules

- Control room default load must read one overall summary plus bounded section summaries.
- Kill-switch checks must be cheap and cacheable where safe.
- Incident lists must paginate.
- Cost summaries should be updated by bounded jobs or feature write paths.
- Raw event drill-down requires explicit admin action.

## Retention

| Data | Default |
| --- | --- |
| Kill switches | Retain historical records for audit. |
| Incidents | Retain resolved incident history. |
| Daily cost summaries | Retain for trend analysis and budget review. |
| Health summaries | Retain rolling history; archive older records later. |

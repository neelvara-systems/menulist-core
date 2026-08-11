# Analytics Learning - Implementation

## Runtime Contract

Analytics Learning stores observed action events separately from the compact dashboard summary. Provider metric snapshots are not active. Reporting reads the precomputed summary to control Firebase cost.

## Flow

1. Campaign output is downloaded, exported, scheduled as a manual task, marked used, sent for approval, or recorded with an owner-reported result.
2. Current server mutations record observed workspace events.
3. Bounded mutation-time updates write dashboard summaries.
4. Reports display source and confidence of each metric.
5. Provider-imported metrics and learning signals stay inactive until a separate future provider layer is configured.

## Data Objects

| Object | Purpose |
| --- | --- |
| `events` | Existing workspace-scoped observed CampaignCue actions such as campaign creation, download, pack export, schedule, approval, manual use, trust-gate export blocking, asset registration, source input, and location draft. |
| `metricSnapshots` | Imported channel metric snapshots; not active in the current runtime. |
| `analyticsSummaries/dashboard.campaignMemory` | Bounded owner-reported recipe/channel evidence used by the deterministic Decision Engine. |
| `campaigns/{campaignId}.resultMemory` | Latest bounded receipt and per-campaign result counters. |
| `clientReports` | Agency/client reporting snapshots. |

## Current Runtime

- `GET /api/campaigncue/analytics` reads one workspace document, one dashboard summary document, provider posture, and the cost model. It does not load the full workspace overview.
- Campaign creation and campaign actions write observed workspace events.
- Ordinary action counters use atomic increments. Outcome recording conditionally reads and replaces the current dashboard summary inside the existing idempotent transaction so bounded Campaign Memory cannot lose concurrent updates.
- Successful owner mutations merge API responses into the workspace UI locally, so analytics and lists do not trigger a full overview reload after each action.
- Owner-reported outcomes are stored on the campaign, reflected in bounded Campaign Memory, and represented by a minimized event that does not duplicate the raw owner note. Provider-imported metrics, credit ledger events, send/delivery/reply callbacks, social account connection, and direct publish status are not active until a separate future provider layer is configured.

## Event Contract

Every important campaign action should emit a scoped event with `workspaceId`, `campaignId`, optional `agencyClientId`, optional `locationId`, actor, channel, source, and timestamp.

| Event | Purpose |
| --- | --- |
| `campaign_pack_generated` | Campaign pack was created. |
| `campaign_download` | Pack output was downloaded. |
| `campaign_export` | Pack output was exported. |
| `campaign_schedule` | Manual task schedule was created. |
| `campaign_request_approval` | Approval request was created. |
| `export_action_blocked` | A blocked or needs-fix trust gate stopped a public-use action such as download, ZIP export, schedule, or mark-used. |
| `manual_export_used` | Owner marked an exported or manually posted/shared pack as used. |
| `owner_outcome_recorded` | Owner recorded replies, bookings, walk-ins, orders, or useful comments manually. |
| `asset_registered` | Asset metadata was registered. |
| `source_input_added` | Owner added a source input. |
| `location_draft_added` | Owner added a location record. |

The broader events for provider sends, provider publish status, replies, clicks, imported metrics, provider setup requests, approval completion, and credit lifecycle remain future contracts and are not emitted by the current export/download-first runtime.

## Metric Confidence

- `observed`: system directly observed the event.
- `imported`: provider API returned the metric.
- `manual`: owner or agency entered the value.
- `estimated`: derived from available signals and clearly labeled.

## Acceptance

- Reports show metric source.
- Summaries load without scanning raw events.
- Next-cue generation can be disabled without breaking reporting.

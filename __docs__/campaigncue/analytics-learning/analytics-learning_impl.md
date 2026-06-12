# Analytics Learning - Implementation

## Runtime Contract

Analytics Learning must store channel events and compact metric snapshots separately. Reporting should read precomputed summaries where possible to control Firebase cost.

## Flow

1. Campaign output is downloaded, exported, scheduled as a manual task, marked used, sent for approval, or recorded with an owner-reported result.
2. Current server mutations record observed workspace events.
3. Bounded mutation-time updates write dashboard summaries.
4. Reports display source and confidence of each metric.
5. Provider-imported metrics and learning signals stay inactive until a separate future provider layer is configured.

## Data Objects

| Object | Purpose |
| --- | --- |
| `campaignEvents` | Observed CampaignCue actions such as campaign creation, download, pack export, schedule, approval, manual use, trust-gate export blocking, asset registration, source input, and location draft. |
| `metricSnapshots` | Imported channel metric snapshots; not active in the current runtime. |
| `campaignSummaries` | Precomputed campaign result summaries. |
| `learningSignals` | Signals used by Opportunity Engine. |
| `clientReports` | Agency/client reporting snapshots. |

## Current Runtime

- `GET /api/campaigncue/analytics` reads one workspace document, one dashboard summary document, provider posture, and the cost model. It does not load the full workspace overview.
- Campaign creation and campaign actions write observed workspace events.
- The dashboard summary is updated with atomic Firestore increments during mutations so reporting does not scan raw events and concurrent owner actions do not lose counts.
- Successful owner mutations merge API responses into the workspace UI locally, so analytics and lists do not trigger a full overview reload after each action.
- Owner-reported outcomes are stored as manual-confidence events and dashboard counters. Provider-imported metrics, credit ledger events, send/delivery/reply callbacks, social account connection, and direct publish status are not active until a separate future provider layer is configured.

## Event Contract

Every important campaign action should emit a scoped event with `workspaceId`, `campaignId`, optional `agencyClientId`, optional `locationId`, actor, channel, source, and timestamp.

| Event | Purpose |
| --- | --- |
| `campaign_pack_generated` | Campaign pack was created. |
| `campaign_download` | Pack output was downloaded. |
| `campaign_download` | Pack output was downloaded. |
| `campaign_export` | Pack output was exported. |
| `campaign_schedule` | Manual task schedule was created. |
| `campaign_request_approval` | Approval request was created. |
| `export_action_blocked` | Trust gate blocked an export/download/manual-use action. |
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

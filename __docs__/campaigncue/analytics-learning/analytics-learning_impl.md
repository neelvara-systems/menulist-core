# Analytics Learning - Implementation

## Runtime Contract

Analytics Learning must store channel events and compact metric snapshots separately. Reporting should read precomputed summaries where possible to control Firebase cost.

## Flow

1. Campaign output is copied, downloaded, exported, scheduled as a manual task, marked used, or sent for approval.
2. Current server mutations record observed workspace events.
3. Bounded mutation-time updates write dashboard summaries.
4. Reports display source and confidence of each metric.
5. Provider-imported metrics and learning signals stay inactive until direct integrations are configured.

## Data Objects

| Object | Purpose |
| --- | --- |
| `campaignEvents` | Observed CampaignCue actions such as campaign creation, copy, download, export, schedule, approval, manual fallback, asset registration, source input, integration setup request, and location draft. |
| `metricSnapshots` | Imported channel metric snapshots; not active in the current runtime. |
| `campaignSummaries` | Precomputed campaign result summaries. |
| `learningSignals` | Signals used by Opportunity Engine. |
| `clientReports` | Agency/client reporting snapshots. |

## Current Runtime

- `GET /api/campaigncue/analytics` reads one workspace document, one dashboard summary document, provider posture, and the cost model. It does not load the full workspace overview.
- Campaign creation and campaign actions write observed workspace events.
- The dashboard summary is updated with atomic Firestore increments during mutations so reporting does not scan raw events and concurrent owner actions do not lose counts.
- Successful owner mutations merge API responses into the workspace UI locally, so analytics and lists do not trigger a full overview reload after each action.
- Provider-imported metrics, credit ledger events, send/delivery/reply callbacks, and direct publish status are not active until direct integrations are configured.

## Event Contract

Every important campaign action should emit a scoped event with `workspaceId`, `campaignId`, optional `agencyClientId`, optional `locationId`, actor, channel, source, and timestamp.

| Event | Purpose |
| --- | --- |
| `campaign_pack_generated` | Campaign pack was created. |
| `campaign_copy` | Pack output was copied. |
| `campaign_download` | Pack output was downloaded. |
| `campaign_export` | Pack output was exported. |
| `campaign_schedule` | Manual task schedule was created. |
| `campaign_request_approval` | Approval request was created. |
| `manual_fallback_shown` | User was shown a manual path because API/channel action was unavailable or failed. |
| `manual_fallback_completed` | User marked manual action complete. |
| `asset_registered` | Asset metadata was registered. |
| `source_input_added` | Owner added a source input. |
| `integration_setup_requested` | Owner requested provider setup. |
| `integration_manual_confirmed` | Owner kept a provider in manual mode. |
| `location_draft_added` | Owner added a location record. |

The broader events for provider sends, provider publish status, replies, clicks, imported metrics, approval completion, and credit lifecycle remain planned contracts and are not emitted by the current manual/export-first runtime.

## Metric Confidence

- `observed`: system directly observed the event.
- `imported`: provider API returned the metric.
- `manual`: owner or agency entered the value.
- `estimated`: derived from available signals and clearly labeled.

## Acceptance

- Reports show metric source.
- Summaries load without scanning raw events.
- Next-cue generation can be disabled without breaking reporting.

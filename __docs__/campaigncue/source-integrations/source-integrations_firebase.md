# Source Integrations — Firebase Cost Tracking

## Collections

Current runtime:

| Collection | Reads | Writes | Guard |
| --- | --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}/sourceSnapshots/current` | Workspace overview, campaign creation, trust checks | Workspace bootstrap and Business Brain updates | Content hash prevents unnecessary source churn. |

Logical expansion:

| Collection | Reads | Writes | Guard |
| --- | --- | --- | --- |
| `campaigncueSourceConnections` | Integrations hub and source checks | Connect, sync state, disconnect | One doc per connection. |
| `campaigncueSourceSnapshots` | Campaign generation and trust checks | Snapshot on changed source data | Hash content to avoid duplicate snapshots. |
| `campaigncueSourceConflicts` | Review screens and trust checks | Conflict detected/resolved | Summaries for home screen. |
| `campaigncueWebhookEvents` | Internal processing only | Provider events | Deduplicate by provider event id. |

## Storage

Uploaded menus, service files, source photos, and raw import files must use signed upload URLs and retention policy.

## Cost Controls

- Use async ingestion jobs.
- Do not resync source data on every campaign screen load.
- Cache integration directory and health summaries.
- Keep raw webhook payload metadata limited and protected.

## Current Pass

Current runtime creates a default source snapshot from signed-in store profile context:

- Workspace bootstrap uses one read from the signed-in MenuList `stores/{sId}` source document.
- No OAuth tokens, provider sync jobs, webhook events, or background source polling are active.
- `sourceSnapshots/current` is written during workspace bootstrap and when Business Brain fields change.
- `GET /api/campaigncue/sources` uses a workspace-only guard read plus a bounded source input query instead of loading the full CampaignCue overview.
- Provider posture is returned as static manual-only metadata, so no provider read or quota cost is incurred.
- No MenuList source write-back is performed.

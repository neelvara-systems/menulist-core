# Source Integrations — Firebase Cost Tracking

## Collections

Current runtime:

| Collection | Reads | Writes | Guard |
| --- | --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}/sourceSnapshots/current` | Workspace overview, campaign creation, trust checks, Business Brain/profile save merge, source input save merge | Workspace bootstrap, Business Brain updates, and source input saves | Compact read model avoids rescanning source input rows when adding one owner input or changing profile facts. |

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
- Business Brain/profile saves read `sourceSnapshots/current`, rebuild source facts from the updated profile plus saved snapshot facts, and batch workspace/business/snapshot writes without listing source input rows.
- `GET /api/campaigncue/sources` uses a workspace-only guard read plus a bounded source input query instead of loading the full CampaignCue overview.
- `POST /api/campaigncue/sources` reads `sourceSnapshots/current` and merges the new owner input into that compact read model before one batched write; it does not list existing source input documents on every save.
- Provider posture is returned as static manual-only metadata, so no provider read or quota cost is incurred.
- Meta Ads MCP remains posture-only. No MCP session, provider connection, provider metric summary, activity row, signal-health result, or provider token is stored.
- No MenuList source write-back is performed.

If a Meta read-first connector is activated later, its compact summary must remain lazy-loaded outside the default overview, hash-deduplicated, capped, and written once per changed normalized refresh. Raw provider rows and one-document-per-metric designs are rejected.

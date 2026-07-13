# Business Brain — Firebase Cost Tracking

## Collections

Current runtime:

| Collection | Reads | Writes | Cost guard |
| --- | --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}/businessBrains/default` | Workspace overview and campaign creation | Owner profile, Brand Playbook, Owner Pulse, commercial policy, presence, and language updates through `PATCH /api/campaigncue/workspace` | One compact default Business Brain per workspace. |
| `campaigncueWorkspaces/{workspaceId}/sourceSnapshots/current` | Existing overview/campaign truth pointer | Refreshed in the same owner-save batch | Compact canonical facts and order-independent source hash; no fact subcollection. |

Not approved for the current runtime:

| Candidate collection | Decision |
| --- | --- |
| `campaigncueBusinesses` | Do not add while the workspace-scoped default Business Brain is sufficient. |
| `campaigncueBusinessFacts` | Do not split compact facts into per-fact reads. Keep canonical facts in the current source snapshot. |
| `campaigncueCatalogItems` | Do not add until catalog growth proves the bounded embedded catalog cannot fit safely. |
| `campaigncueReadinessSummaries` | Do not add while readiness is derived from the already-loaded Business Brain and source snapshot. |

## Storage

Logos and profile images use signed uploads to CampaignCue asset storage and then reference asset IDs from Business Brain.

## Cost Impact Of This Doc Pass

Current runtime adds CampaignCue Business Brain writes through the dedicated CampaignCue Firebase project:

- First authenticated workspace load may read one MenuList `stores/{sId}` source doc, then create one CampaignCue workspace doc, one default Business Brain doc, one source snapshot doc, and one dashboard summary doc.
- Later workspace loads read the Business Brain through `GET /api/campaigncue/workspace`; no realtime listener is used.
- `PATCH /api/campaigncue/workspace` reuses one three-document batch: workspace settings, default Business Brain, and current source snapshot. Owner Pulse/commercial/presence/language state adds fields, not operations.
- Brand Playbook fields live inside `brandKit.playbook`; they add no collection, listener, Storage path, Cloud Function, provider call, or model call.
- CampaignCue does not write back to MenuList source collections in the current runtime.

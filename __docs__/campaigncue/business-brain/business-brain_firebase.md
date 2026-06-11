# Business Brain — Firebase Cost Tracking

## Collections

Current runtime:

| Collection | Reads | Writes | Cost guard |
| --- | --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}/businessBrains/default` | Workspace overview and campaign creation | Owner profile updates through `PATCH /api/campaigncue/workspace` | One compact default Business Brain per workspace. |

Logical expansion:

| Collection | Reads | Writes | Cost guard |
| --- | --- | --- | --- |
| `campaigncueBusinesses` | Load profile and readiness | Create/update profile and brand kit | One document per business brain summary. |
| `campaigncueBusinessFacts` | Source detail on review/trust | Field-level facts and source links | Paginate or load by needed fields only. |
| `campaigncueCatalogItems` | Campaign selection/search | Menu/service item updates | Query by `workspaceId` and `businessBrainId`. |
| `campaigncueReadinessSummaries` | Home and setup screens | Updated after source/catalog changes | Use summary doc to avoid scans. |

## Storage

Logos and profile images use signed uploads to CampaignCue asset storage and then reference asset IDs from Business Brain.

## Cost Impact Of This Doc Pass

Current runtime adds CampaignCue Business Brain writes through the dedicated CampaignCue Firebase project:

- First authenticated workspace load may read one MenuList `stores/{sId}` source doc, then create one CampaignCue workspace doc, one default Business Brain doc, one source snapshot doc, and one dashboard summary doc.
- Later workspace loads read the Business Brain through `GET /api/campaigncue/workspace`; no realtime listener is used.
- `PATCH /api/campaigncue/workspace` updates the default Business Brain and source snapshot only after owner action.
- CampaignCue does not write back to MenuList source collections in the current runtime.

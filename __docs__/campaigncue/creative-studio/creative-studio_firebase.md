# Creative Studio - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/creativeAssets` | Asset records and status. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/creativeVariants` | Channel variants and generated copy. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/assetTrustReports` | Trust checks per asset version. |
| `campaigncueWorkspaces/{workspaceId}/usageEvents` | Credit and provider usage events. |

## Storage

Generated static images should live under a CampaignCue-only Storage prefix:

`campaigncue/{workspaceId}/campaigns/{campaignId}/creative/{assetId}/`

## Cost Guardrails

- Store compact metadata in Firestore; put large image files in Storage.
- Paginate asset history.
- Do not run trust checks repeatedly for unchanged asset versions.
- Write one usage event per provider attempt.
- Avoid real-time listeners for large asset libraries unless the visible page needs them.

## Security

- Workspace membership is required for reads and writes.
- Asset export URLs must not expose private source files.
- Storage rules must enforce the same workspace boundary as Firestore.


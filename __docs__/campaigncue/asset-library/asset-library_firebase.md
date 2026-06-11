# Asset Library - Firebase Notes

## Collections

Current runtime:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/assets/{assetId}` | Asset metadata, rights status, optional file refs, and usage refs. |

Logical expansion:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/assetRecords` | Asset metadata and state. |
| `campaigncueWorkspaces/{workspaceId}/assetFiles` | Storage refs and file metadata. |
| `campaigncueWorkspaces/{workspaceId}/assetRights` | Permission and restriction metadata. |
| `campaigncueWorkspaces/{workspaceId}/assetUsageRefs` | Campaign and export references. |

## Storage

Assets should use:

`campaigncue/assets/{workspaceId}/...`

## Cost Guardrails

- Store thumbnails separately from originals.
- Do not embed base64 media in Firestore.
- Deduplicate files using checksum where practical.
- Paginate asset grids.
- `GET /api/campaigncue/assets` uses a workspace-only guard read plus a bounded asset query instead of loading the full CampaignCue overview.
- Asset registration uses a workspace-only guard read and writes only the asset metadata record plus one event; it does not invoke provider generation, Storage upload, or overview reload cost.
- Apply retention rules for failed drafts and temporary renders.

## Security

- Private assets require workspace role checks.
- Public export links must be explicit and revocable where possible.
- Rights notes are internal by default.

# Asset Library - Firebase Notes

## Collections

Current runtime:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/assets/{assetId}` | Asset metadata, rights status, optional file refs, and usage refs. |

Do not split file, rights, or usage metadata into extra collections. These bounded fields belong in the existing asset document and cost one document read together.

## Storage

Assets should use:

`campaigncue/assets/{workspaceId}/...`

## Cost Guardrails

- Do not create thumbnail objects until a measured owner-grid need justifies their Storage and lifecycle cost.
- Do not embed base64 media in Firestore.
- Deduplicate files using checksum where practical.
- Paginate asset grids.
- `GET /api/campaigncue/assets` uses a workspace-only guard read plus a bounded asset query instead of loading the full CampaignCue overview.
- Metadata-only registration uses one workspace guard read and writes one asset plus one event in one batch.
- A local Video Studio export uses the same metadata-only registration path after download; it adds no Storage write and does not make the local binary remotely retrievable.
- Registration with a campaign usage reference adds one direct campaign read; it does not scan campaigns.
- Registration with a Storage path adds one Storage metadata lookup so persisted size/type come from the object rather than the browser. It does not upload or duplicate the object.
- `GET /api/campaigncue/assets` and overview/decision reads use the same one bounded asset query and strict in-memory projection; malformed rows add no repair write.
- Download uses one workspace guard read, one direct asset read, and one runtime signed-URL operation. Signed or external URLs are never persisted.
- Apply retention rules for failed drafts and temporary renders.

## Security

- Private assets require workspace role checks.
- Private downloads use short-lived runtime signed URLs generated only from a path owned by the current workspace.
- Rights notes are internal by default.
- The owner registration schema is strict and does not accept `downloadUrl`; campaign/output/channel references are server-verified before write.

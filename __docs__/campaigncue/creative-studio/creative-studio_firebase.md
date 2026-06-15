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
- The active editor AI Tools drawer is deterministic and client-side. It reuses the already-loaded workspace overview, performs no provider call, performs no additional Firestore read, and performs no write until the owner explicitly exports/registers an asset through the existing Asset Library path.
- The shared editor contextual toolbar, floating selected-layer toolbar, Active Layers reorder, drawer search, recent insertions, ready-made text templates, Brand Kit quick picks, text placeholders, and page controls are client-side only. Selection, edit, color, style, position, duplicate, delete, group, distribute, layer reorder, template insertion, page add/switch/duplicate/lock, and placeholder insertion actions do not read or write Firestore until the owner explicitly exports/registers an asset through the existing Asset Library path.
- Design Cue commands keep the same default posture: local deterministic patch previews with zero Firebase reads/writes, and model-backed turns only through the guarded fail-closed contract in `__docs__/campaigncue/design-cue/design-cue_firebase.md`.

## Security

- Workspace membership is required for reads and writes.
- Asset export URLs must not expose private source files.
- Storage rules must enforce the same workspace boundary as Firestore.
- AI Tools must not accept owner/store authority from the editor. CampaignCue supplies the overview from the authenticated workspace load, and the shared editor receives only product-scoped actions plus the current `CreativeEditorDocument`.
- Design Cue model assistance must not trust workspace, owner, source, layer, or export authority from the browser payload. Server-side model routes must re-check CampaignCue session scope, apply rate limits, and return only structured candidates for local patch validation.

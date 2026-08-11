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

- Each uploaded media source gets one browser-generated preview object. Do not create additional thumbnail sizes until measured grid evidence justifies the Storage and lifecycle cost.
- Do not embed base64 media in Firestore.
- Deduplicate files using checksum where practical.
- Paginate asset grids.
- `GET /api/campaigncue/assets` uses a workspace-only guard read plus a bounded asset query instead of loading the full CampaignCue overview.
- Metadata-only registration uses one workspace guard read and writes one asset plus one event in one transaction.
- Private media capture uploads one source and one preview, then uses the same registration path. It creates no mission document, listener, or post-upload overview read.
- Image, audio, video, and document/export objects are capped at 12 MiB, 50 MiB, 250 MiB, and 25 MiB respectively in client/schema, server verification, and Storage rules where applicable.
- A local Video Studio export uses the same metadata-only registration path after download; it adds no Storage write and does not make the local binary remotely retrievable.
- A Campaign Pack cloud copy is the bounded exception: it writes one checksum-verified private ZIP into one of two rotating `campaigncue/reports/**` slots and upserts one deterministic existing `assets` document. It adds no archive collection, list query, listener, or version document.
- Registration with a campaign usage reference adds one direct campaign read; it does not scan campaigns.
- Registration with a Storage path verifies source metadata and header bytes; an optional preview receives the same bounded verification. It does not duplicate either object.
- `GET /api/campaigncue/assets` and overview/decision reads use the same one bounded asset query and strict in-memory projection; malformed rows add no repair write.
- Local-manager branch filtering reuses that bounded asset result plus the workspace membership already loaded by the access guard. It adds zero Firestore reads, indexes, listeners, or per-location queries.
- Download uses one workspace guard read, one direct asset read, and one runtime signed-URL operation. Signed or external URLs are never persisted.
- Apply retention rules for failed drafts and temporary renders.

## Security

- Private assets require workspace role checks.
- Campaign-linked assets persist the campaign's current `locationId`. Local-manager list, preview, and download paths enforce assigned-location scope; older linked rows without location identity fail closed for local managers.
- Private downloads use short-lived runtime signed URLs generated only from a path owned by the current workspace.
- `campaigncue/reports/**` denies every direct Firebase client operation; Campaign Pack upload/download access is server-authorized and signed at runtime.
- Rights notes are internal by default.
- The owner registration schema is strict and does not accept `downloadUrl`; campaign/output/channel references are server-verified before write.
- A temporary in-memory Firebase client session uses a `media_upload` purpose plus exact upload id/source filename and is signed out after each upload group; NextAuth owner authentication remains separate. The session runs in CampaignCue's named browser Firebase app, so its lifecycle cannot replace the primary MenuList Firebase Auth session when local/QA projects are shared. The same token cannot read uploaded objects, browse Firestore, open templates, or authorize another upload folder.

# Asset Library - Implementation

## Runtime Contract

Asset Library is the cross-feature media and output registry for CampaignCue. Feature modules should reference assets by id instead of embedding large payloads in their own documents.

## Flow

1. Upload, generate, or import asset.
2. Create asset record with type, owner, source, rights, and workspace/location scope.
3. Store media in CampaignCue Storage prefix.
4. Generate lightweight thumbnails/previews where needed.
5. Link asset to campaign outputs.
6. Track approval, export, reuse, archive, or block state changes.

## Data Objects

| Object | Purpose |
| --- | --- |
| `assetRecords` | Canonical metadata and state. |
| `assetFiles` | Storage refs, mime type, size, dimensions, checksum. |
| `assetRights` | Permission, source, expiry, restriction notes. |
| `assetUsageRefs` | Campaign, channel, export, and reuse references. |

## Current Runtime

- `GET /api/campaigncue/assets` lists bounded asset metadata.
- `POST /api/campaigncue/assets` registers metadata, source, rights status, consent type, rights note, tags, optional storage/download refs, and usage refs.
- Shared Creative Editor exports register metadata through `POST /api/campaigncue/assets` after explicit owner export/save. The editor itself remains product-neutral, owns only browser-local document/canvas state, and does not write CampaignCue Firebase directly.
- Planned CueLayers jobs will let owners reuse uploaded or generated flat images by converting safe parts into shared-editor layers. CueLayers source packages, reconstruction artifacts, and validation reports are documented separately in `__docs__/campaigncue/cue-layers/README.md`; Asset Library remains the registry for final reusable/exported assets.
- `storage-campaigncue.rules` scopes `campaigncue/assets/{workspaceId}/...` by CampaignCue workspace id and enforces type/size limits.
- Render and report storage prefixes are read-only to clients and server-owned.

## Acceptance

- Asset cards can render from metadata without downloading full media.
- An exported asset is traceable to source and campaign.
- CueLayers-generated reusable assets remain traceable to the original source package, reconstruction result, and final export record.
- Blocked assets cannot be reused in new campaign packs.
- Salon and UGC assets can record customer/creator/owner consent posture before use.
- Deleting/archiving an asset does not break historical campaign records.

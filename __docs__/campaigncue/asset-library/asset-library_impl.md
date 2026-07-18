# Asset Library - Implementation

## Runtime Contract

Asset Library is the cross-feature media and output registry for CampaignCue. Feature modules should reference assets by id instead of embedding large payloads in their own documents.

## Flow

1. An owner records metadata, or a server-owned export path stores a file in CampaignCue Storage.
2. `POST /api/campaigncue/assets` validates metadata and optional campaign/output/channel linkage in the current workspace.
3. Optional file identity must use an allowed workspace Storage prefix; the server reads object metadata and stores authoritative size/type.
4. Asset plus one audit event are committed in one Firestore batch.
5. Bounded list reads project every document through the strict persisted-record boundary before returning it.
6. Download reads one scoped asset, rejects blocked/malformed/external-URL records, and creates a 15-minute signed URL from the private Storage path only.

## Data Objects

| Object | Purpose |
| --- | --- |
| `assets/{assetId}` | One compact canonical record containing metadata, state, rights, optional file metadata, and bounded usage refs. |
| Storage object | Binary source/export owned by an allowed `campaigncue/.../{workspaceId}/...` path. |

## Current Runtime

- `GET /api/campaigncue/assets` lists bounded asset metadata.
- `POST /api/campaigncue/assets` strictly registers metadata, source, rights status, consent type, rights note, deduplicated tags, optional workspace Storage path, and validated usage refs. It rejects unknown fields and external/download URLs.
- When a Storage path is supplied, registration verifies object metadata through CampaignCue Storage and never trusts client size or MIME values as file truth.
- Shared Creative Editor exports register metadata through `POST /api/campaigncue/assets` after explicit owner export/save. The editor itself remains product-neutral, owns only browser-local document/canvas state, and does not write CampaignCue Firebase directly.
- CueLayers lets owners reuse uploaded flat images through the separate conservative reconstruction flow documented in `__docs__/campaigncue/cue-layers/README.md`; Asset Library remains the final reusable/export registry.
- `storage-campaigncue.rules` scopes `campaigncue/assets/{workspaceId}/...` by CampaignCue workspace id and enforces type/size limits.
- Render and report storage prefixes are read-only to clients and server-owned.
- `src/lib/campaigncue/assetBoundary.ts` rejects cross-workspace paths, persisted download URLs, malformed enums/rights/tags/usage refs, oversized values, and document/payload identity mismatch. Invalid rows are omitted from bounded lists and cannot be downloaded.

## Acceptance

- Asset cards render from strict metadata without downloading full media.
- An exported asset is traceable to source and campaign.
- CueLayers-generated reusable assets remain traceable to the original source package, reconstruction result, and final export record.
- Blocked assets cannot be reused in new campaign packs.
- Salon and UGC assets can record customer/creator/owner consent posture before use.
- Historical campaign references remain bounded metadata; active runtime does not yet expose archive/delete mutations.

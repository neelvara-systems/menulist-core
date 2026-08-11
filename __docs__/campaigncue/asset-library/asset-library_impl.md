# Asset Library - Implementation

## Runtime Contract

Asset Library is the cross-feature media and output registry for CampaignCue. Feature modules should reference assets by id instead of embedding large payloads in their own documents.

## Flow

1. A recipe can expose a Photo/Clip Mission, or the owner can open private media capture directly in Asset Library.
2. The browser validates media type/size, creates one bounded WebP preview, obtains a scoped custom token, and uploads source plus preview directly to private CampaignCue Storage.
3. `POST /api/campaigncue/assets` validates metadata and optional campaign/output/channel linkage in the current workspace.
4. File identity must use an allowed workspace Storage prefix; the server reads authoritative object metadata, generation, MIME, size, and signature.
5. Campaign-linked assets copy the current campaign `locationId`; the write transaction rechecks that campaign and the member's current location access.
6. Asset plus one audit event are committed in the same Firestore transaction; failure triggers best-effort source/preview cleanup.
7. Bounded list reads project every document through the strict persisted-record boundary, then filter local-manager results from the already-loaded membership and asset metadata.
8. Preview/download reads enforce the same location filter before creating a 15-minute signed URL from the exact private Storage generation only.

## Data Objects

| Object | Purpose |
| --- | --- |
| `assets/{assetId}` | One compact canonical record containing metadata, state, rights, optional file metadata, and bounded usage refs. |
| Storage object | Binary source/export owned by an allowed `campaigncue/.../{workspaceId}/...` path. |

## Current Runtime

- `GET /api/campaigncue/assets` lists bounded asset metadata.
- `POST /api/campaigncue/assets` strictly registers metadata, source, rights status, consent type, rights note, deduplicated tags, optional workspace Storage path, and validated usage refs. It rejects unknown fields and external/download URLs.
- `src/lib/campaigncue/assetUploadClient.ts` is the shared resumable upload path for Asset Library Photo/Clip Missions and Video Reel Studio media. It enforces per-type limits, bounded preview decode, runtime-only authentication, and cleanup.
- Photo/Clip Missions reuse recipe `photoTasks`; they add no mission collection or completion write.
- When a Storage path is supplied, registration verifies object metadata through CampaignCue Storage and never trusts client size or MIME values as file truth.
- Shared Creative Editor exports register metadata through `POST /api/campaigncue/assets` after explicit owner export/save. The editor itself remains product-neutral, owns only browser-local document/canvas state, and does not write CampaignCue Firebase directly.
- Video Reel Studio may register a compact `local-export` receipt after a successful device download. Because the render binary remains on the owner's device, that receipt must not show a remote Download action or claim durable media reuse without a verified Storage path.
- CueLayers lets owners reuse uploaded flat images through the separate conservative reconstruction flow documented in `__docs__/campaigncue/cue-layers/README.md`; Asset Library remains the final reusable/export registry.
- `storage-campaigncue.rules` scopes `campaigncue/assets/{workspaceId}/...` by CampaignCue workspace id and enforces type/size limits.
- Render and report storage prefixes are read-only to clients and server-owned.
- `src/lib/campaigncue/assetBoundary.ts` rejects cross-workspace paths, persisted download URLs, malformed enums/rights/tags/usage refs, oversized values, and document/payload identity mismatch. Invalid rows are omitted from bounded lists and cannot be downloaded.
- `src/lib/campaigncue/assetVisibility.ts` is the shared list, preview, and download boundary. Owners and workspace-wide roles retain workspace access. Local managers receive assigned-branch assets and unlinked shared assets; campaign-linked legacy rows without `locationId` are hidden until registered again.

## Acceptance

- Asset cards render from strict metadata without downloading full media.
- Metadata-only rows remain visibly separate from uploaded files and cannot satisfy photo readiness.
- An exported asset is traceable to source and campaign.
- CueLayers-generated reusable assets remain traceable to the original source package, reconstruction result, and final export record.
- Blocked assets cannot be reused in new campaign packs.
- Salon and UGC assets can record customer/creator/owner consent posture before use.
- Historical campaign references remain bounded metadata; active runtime does not yet expose archive/delete mutations.
- Durable Campaign Pack cloud copies use one deterministic export asset ID per workspace/campaign. Replacing a copy updates that record to the verified current Storage generation; signed URLs remain response-only.
- Branch Campaign Pack cloud copies and ordinary campaign-linked assets retain branch scope through `locationId`; an unassigned local manager cannot discover, preview, or download them.

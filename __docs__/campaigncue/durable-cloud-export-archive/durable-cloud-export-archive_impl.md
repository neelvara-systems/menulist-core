# Durable Cloud Export Archive Implementation

## Runtime Flow

```text
CampaignCueWorkspaceApp
-> build deterministic Campaign Pack ZIP
-> hash ZIP once in browser (SHA-256 + CRC32C)
-> POST /api/campaigncue/campaigns/[campaignId]/export-archive
-> one transaction validates workspace/campaign and creates or reuses owner lease
-> server returns a 10-minute signed PUT with exact headers and generation precondition
-> browser uploads directly to Cloud Storage with app credentials omitted
-> existing campaign action route finalizes archive_export
-> server verifies object metadata + first 32 bytes + lease
-> one deterministic Asset Library record and compact campaign pointer are committed
-> existing asset download route creates a generation-pinned 15-minute signed read URL
```

## Implemented Files

| File | Responsibility |
| --- | --- |
| `src/constants/campaigncue/exportArchive.ts` | Size, TTL, retention, slot, and path constants. |
| `src/constants/campaigncue/routes.ts` | Prepare-route constant and route builder. |
| `src/constants/campaigncue/delivery.ts` | Adds the bounded `archive_export` action. |
| `src/config/features.ts` | Explicit archive feature gate. |
| `src/types/campaigncue.ts` | Durable pointer and temporary lease types. |
| `src/lib/validation/campaigncueSchemas.ts` | Strict prepare/finalize validation and action coupling. |
| `src/lib/campaigncue/recordBoundary.ts` | Persisted shape and exact path reconstruction checks. |
| `src/lib/campaigncue/exportArchiveClient.ts` | Browser hashing, strict prepare response, signed PUT, and finalize payload. |
| `src/lib/campaigncue/server.ts` | Role/trust checks, lease, signing, verification, idempotent registration, and signed read. |
| `src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts` | Protected, rate-limited prepare endpoint. |
| `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` | Save, replace, current-state update, and re-download owner UX. |
| `storage-campaigncue.rules` | Denies all direct Firebase client access to report objects. |
| `scripts/verification/test-campaigncue-export-archive.ts` | Deterministic archive contract verifier. |
| `scripts/verification/test-campaigncue-storage-rules.ts` | Emulator proof for direct-access denial. |

## Deterministic ZIP

The browser uses the existing Campaign Pack bundle builder. Every ZIP entry uses `1980-01-01T00:00:00Z`, paths are de-duplicated, content is sourced from the selected Campaign Pack, and DEFLATE level 6 is fixed. The filename builder bounds names to 120 characters and uses `campaign` when a non-Latin title has no safe ASCII slug. Stable bytes allow matching hashes to avoid duplicate writes.

The ZIP is an export artifact. `CreativeEditorDocument` remains editor truth; the archive does not introduce Fabric JSON or another editor document model.

The deterministic Asset Library record carries the campaign `locationId`. Local managers receive only assets for assigned locations; legacy campaign-linked assets without location metadata fail closed for that role. The prepare and finalize paths both recheck current membership, role, and location access.

## Prepare and Lease

The normal prepare path performs one Firestore transaction that:

1. reads and validates the current workspace;
2. reads and validates the current campaign;
3. checks role, location, trust, freshness, and approval gates;
4. returns a matching current pointer without writing, or creates/reuses one member-owned 15-minute lease.

If a matching pointer references a missing Storage generation, a second transaction creates a replacement lease. This is a recovery path, not the normal cost path.

An active lease owned by another member is never returned, even when their file metadata matches.

## Signed Upload

The server signs an exact `PUT` request for one derived slot. Required request headers are allowlisted by the client:

- `Content-Type`
- `Cache-Control`
- `x-goog-hash` with CRC32C
- bounded `x-goog-meta-*` workspace, campaign, slot, retention, SHA-256, and token-hash fields

`ifGenerationMatch` is embedded in the signed URL. A stale URL therefore cannot overwrite a newer object generation. Browser cookies and authorization headers are omitted from the Storage request.

## Finalization

Finalization reuses the existing idempotent campaign action route. Metadata is read first and the ZIP header read is pinned to that exact Storage generation. Before its transaction, the server checks:

- exact workspace/campaign slot path;
- ZIP MIME type and 25 MB size cap;
- Storage CRC32C equals the browser checksum already validated by Storage;
- ZIP magic bytes;
- required custom metadata;
- valid Storage generation.

The transaction re-reads the campaign and lease, re-applies public-use gates, writes one deterministic export asset, writes the current archive pointer, deletes the lease, and records the existing bounded event/summary/idempotency state.

## Compatibility

Both archive fields are optional. Existing campaign records remain valid. No migration or backfill is required. Schema version `1` is explicit for future readers.

## Security References

- [File upload security](../../security/file-upload/file-upload-security.md)
- [CampaignCue API boundaries](../api-boundaries/README.md)
- [CampaignCue delivery boundary](../campaigncue-delivery-boundary.md)

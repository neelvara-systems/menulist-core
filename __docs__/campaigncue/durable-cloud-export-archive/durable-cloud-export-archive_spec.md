# Durable Cloud Export Archive Specification

## Product Problem

An SMB owner may prepare a complete Campaign Pack on one device and need the same reviewed ZIP later. Rebuilding a pack from memory or keeping many unmanaged downloads creates friction. CampaignCue should retain one current copy without becoming a generic cloud drive or an unlimited campaign-version store.

## Owner Promise

> Save the current Campaign Pack in CampaignCue and download that checked copy again later.

This is not a backup guarantee, legal records system, team file drive, or delivery integration.

## Functional Requirements

1. `Save cloud copy` creates the same deterministic ZIP used by local `Download campaign pack ZIP`.
2. A second save replaces the current pointer only after the new object is uploaded and verified.
3. The previous current object is not overwritten during the new upload.
4. The app exposes one current saved copy through `Download saved copy`.
5. Upload and download access use short-lived signed HTTPS URLs generated only after auth, workspace, role, location, approval, freshness, and trust checks.
6. The ZIP is non-empty, named with a safe `.zip` filename no longer than 120 characters, and no larger than 25 MB. Non-Latin-only or empty ASCII slugs use a stable `campaign` fallback.
7. Cloud Storage validates the browser-computed CRC32C during upload.
8. CampaignCue verifies MIME type, object size, ZIP magic bytes, CRC32C, custom metadata, exact path, upload lease, and object generation before persisting the pointer.
9. A matching current SHA-256, CRC32C, and size returns `already_stored` only when the generation still exists.
10. The feature remains optional and guarded by `ENABLE_CAMPAIGNCUE_CLOUD_EXPORT_ARCHIVE`.

## Durable Contract

The existing campaign document may contain:

```ts
type CampaignCueExportArchivePointer = {
  schemaVersion: 1;
  assetId: string;
  crc32c: string;
  filename: string;
  mimeType: "application/zip";
  retentionPolicy: "two_slot_current_per_campaign";
  sha256: string;
  sizeBytes: number;
  slot: "a" | "b";
  storageGeneration: string;
  storagePath: string;
  archivedAt: unknown;
};
```

An active upload may temporarily add one `exportArchiveUploadLease`. It expires after 15 minutes and is removed when finalization succeeds. The lease is not an archive version.

## Invariants

- `storagePath` must equal the path derived from the parsed campaign workspace, campaign ID, and slot.
- Only one deterministic Asset Library document represents a campaign archive.
- Only `archive-a.zip` and `archive-b.zip` are valid object names for one campaign.
- A finalize request must belong to the member who created the active lease.
- A signed PUT uses an object-generation precondition so an old URL cannot overwrite a newer object.
- The current pointer is written only after Storage verification.
- Replayed action requests return the same campaign and deterministic asset state.
- A blocked, stale, expired, rejected, or approval-pending campaign cannot save a public-use archive.
- Signed URLs and raw ZIP bytes are never persisted in Firestore.

## Allowed Roles

- owner
- admin
- marketer
- local manager within assigned location scope
- agency member within assigned scope

Reviewer and billing-only roles cannot save cloud copies. Existing Asset Library download authorization governs later retrieval.

## Failure Behavior

- Invalid input: reject before any Storage signing.
- Concurrent different save: keep the current archive and ask the owner to retry later.
- Upload checksum mismatch: Cloud Storage rejects the PUT.
- Expired/replaced lease: do not update the campaign pointer.
- Missing current object: do not claim it is stored; rotate through a new lease.
- Finalize failure: the previous current pointer remains usable. An unreferenced upload may remain in one bounded slot and can be overwritten by a later valid save.
- Missing Firebase/CORS/IAM setup: surface a bounded save failure; local download remains available.

## Non-Goals

- unlimited history or archive browsing;
- public share links;
- automatic scheduled backups;
- cross-workspace asset access;
- social posting, messaging, ad mutation, or provider account connection;
- server-side ZIP generation;
- saving raw editor state as the archive contract.

## Acceptance Criteria

- Focused archive verifier passes.
- CampaignCue runtime and operating-loop verifiers pass.
- CampaignCue Storage emulator proves direct report reads/writes/deletes fail.
- TypeScript and scoped lint pass.
- QA deployment applies `storage-campaigncue.rules`.
- QA bucket CORS allows the exact CampaignCue app origin, `PUT`, and only required signed headers.
- An authenticated QA save, replace, and re-download succeeds with object-generation evidence.

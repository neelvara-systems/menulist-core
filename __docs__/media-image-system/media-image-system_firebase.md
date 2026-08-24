# Media Image System Firebase Cost

## Storage Writes

This implementation does not add a new collection or extra Firestore write by itself.

Existing Firestore write paths remain. Storage writes for media-system images now use profile-aware immutable paths:

| Flow | Storage write | Firestore write |
| --- | --- | --- |
| Menu item image | 1 Blob upload to the selected `media/menuItem/{tId}/{sId}/...` variant (normally `large`) | Existing project save |
| Project image | 1 Blob upload to the selected `media/projectImage/{tId}/{sId}/...` variant (normally `hero`) | Existing project summary/project metadata write |
| Menu background | 1 Blob upload to the selected `media/menuBackground/{tId}/{sId}/...` variant (normally `desktop`) on publish | Existing project publish write |
| Business logo | 1 Blob upload to the selected `media/businessLogo/{tId}/{sId}/...` variant (normally `full`) when logo changes | Existing store update write |
| Official Business Page business cover | 1 Blob upload to the selected `media/businessCover/{tId}/{sId}/...` variant (normally `hero`) when the cover is uploaded, generated, or adjusted | Existing store `publicPresence.businessCover` update |
| Official Business Page gallery image | 1 Blob upload to the selected `media/galleryImage/{tId}/{sId}/...` variant (normally `full`) when a photo is uploaded or adjusted | Existing store `publicPresence.photos` update |
| Digital screen slide | 1 Blob upload to the selected `media/digitalScreenSlide/{tId}/{sId}/...` variant (`full`) when the owner saves the pending slide | Existing `platformSummary/campaigns_{storeId}.screen.pinnedSlides` update |

## Reads

No new Firestore reads are added by the media preparation layer.

Duplicate content-addressed Storage creates are denied by Storage rules and then reuse the existing public object URL. This adds no Firestore read or document. The duplicate path may require the Storage SDK's existing-object URL lookup after the rejected overwrite; the normal first upload remains one Storage write per prepared variant.

Admin SDK batch generation and prompt-cache destination copies use the equivalent create-only generation precondition. A deterministic retry performs one rejected create plus one metadata read, verifies size, cache policy, content type, and checksummed object identity, and returns the existing download token. It does not overwrite bytes or update object metadata.

Auto-generated project-image persistence reuses the existing `updateProjectMetadata()` summary transaction and its existing summary-document read. When transaction-current `projectImage` truth is already non-empty, the transaction omits the generated image field and returns the current owner image. This adds no Firestore read, write, collection, index, rule, or Function beyond the existing metadata operation. A generated immutable Storage object may already have been created before the concurrent owner image is observed; it is not destructively compensated because content-addressed objects can be shared by a concurrent or retried operation without an exclusive reference ledger.

## External Provider Boundary

The dormant Unsplash, Pexels, and Pixabay background-image search helpers have been removed. The active media system does not call those providers, require their credentials, or add provider-related Firestore, Storage, Cloud Function, or cache operations.

## Deletes

Official Business Page cover/gallery replacements and removals queue the previously saved Storage URL and delete the old Storage object after the related store save succeeds. Failed deletes are logged through bounded Storage diagnostics and do not roll back the saved store update.

Batch generation does not delete public `media/menuItem/...` objects from browser review or scheduled job retention. A job/current-project check cannot prove absence from duplicated projects or outlet projections. The existing scheduler remains bounded and prunes job payloads/rows only; physical media cleanup is deferred until global exclusive-reference proof exists.

## Cost Control

The shared preparation layer reduces Storage and public bandwidth by resizing and compressing before save:

- menu item images target 500KB or lower
- backgrounds target 800KB or lower
- logos target 350KB or lower with gentler quality

The prepared object includes named variants, Blob outputs, checksum, dominant color, and focal point metadata. Existing single-URL Firestore fields are preserved to avoid a schema migration, and profile-aware saves upload only the selected persisted variant. Other prepared variants remain local until a real persisted URL-map consumer exists. This removes 1-3 Storage writes per owner image without adding a Firestore read, write, document, rule, or index.

Local `dataUrl` values are preview/form-state only. Profile-aware saves convert to Blob before Firebase upload and do not call `uploadString(data_url)`.

## Privacy Metadata

Prepared public media uploads write Firebase Storage custom metadata for operational inspection:

- `exifNormalized`: `"true"` when the source image was re-rendered through the media preparation canvas.
- `sourceMetadataPolicy`: `"source_metadata_stripped"` for prepared outputs and `"source_metadata_not_normalized"` only for non-prepared fallbacks.
- `retentionPolicy`: `"public_asset_until_replaced_or_deleted"`.

These fields do not add Firestore writes and do not create a new owner setting. They document the existing privacy behavior of profile-aware MenuList uploads: original file metadata is not retained in prepared public media, and public media assets remain until replaced, removed, or deleted by the owning flow.

## Immutable Object Rule

Prepared public media should not overwrite the same object path. New image content must produce a new path or media version so Firebase/CDN caches, PWAs, and Digital Screen devices do not serve stale images.

Current status:

- Project, item, menu background, OBP business cover, OBP gallery, business logo, and digital screen uploads use immutable `media/{profile}/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{extension}` paths.
- Firebase Storage rules allow writes to `media/{profile}/{tId}/{sId}/...` only for the authenticated owner store and only for known media profiles.
- Prepared-media rules admit static JPEG/PNG/WebP only and reject animated GIF bypass uploads.
- Those rules allow object creation and owner deletion but deny overwrite when `resource` already exists. The client helper treats an existing immutable object as reusable instead of uploading duplicate bytes.
- Admin SDK media writers use generation-match create-only writes and reuse the existing object token after an identity-matched conflict.
- Failed downstream persistence and partial multi-variant attempts do not compensate by deleting content-addressed objects; a concurrent/retried successful save may already reference the same path. No Firestore reference ledger is added.
- Batch job retention is metadata-only because job plus one-project truth is not global deletion proof.
- Future media asset documents should use the same canonical path helper.

## Future Media Asset Documents

If MenuList later stores media metadata documents, each image save would add one Firestore write. That migration is not part of this implementation.

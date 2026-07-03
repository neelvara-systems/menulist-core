# Media Image System Firebase Cost

## Storage Writes

This implementation does not add a new collection or extra Firestore write by itself.

Existing Firestore write paths remain. Storage writes for media-system images now use profile-aware immutable paths:

| Flow | Storage write | Firestore write |
| --- | --- | --- |
| Menu item image | 4 Blob uploads to `media/menuItem/{tId}/{sId}/...` for thumb/small/medium/large | Existing project save |
| Project image | 2 Blob uploads to `media/projectImage/{tId}/{sId}/...` for card/hero | Existing project summary/project metadata write |
| Menu background | 2 Blob uploads to `media/menuBackground/{tId}/{sId}/...` for mobile/desktop on publish | Existing project publish write |
| Business logo | 2 Blob uploads to `media/businessLogo/{tId}/{sId}/...` for thumb/full when logo changes | Existing store update write |
| Official Business Page business cover | 2 Blob uploads to `media/businessCover/{tId}/{sId}/...` for card/hero when the cover is uploaded, generated, or adjusted | Existing store `publicPresence.businessCover` update |
| Official Business Page gallery image | 2 Blob uploads to `media/galleryImage/{tId}/{sId}/...` for thumb/full when photo is uploaded or adjusted | Existing store `publicPresence.photos` update |
| Digital screen slide | 2 Blob uploads to `media/digitalScreenSlide/{tId}/{sId}/...` for desktop/full when owner saves the pending slide | Existing `platformSummary/campaigns_{storeId}.screen.pinnedSlides` update |

## Reads

No new Firestore reads are added by the media preparation layer.

## External Provider Diagnostics

Legacy optional background-image provider helpers for Unsplash, Pexels, and Pixabay use `src/lib/imageProviderDiagnostics.ts` for bounded failure diagnostics and `src/lib/imageProviderRequests.ts` for outbound request normalization. Provider search/topic calls encode query params through `URLSearchParams`, clamp page/orientation/search-query inputs, apply a 10s timeout, and pass Pexels credentials through Axios `headers`. Failed provider calls reject with generic owner-safe text and log only provider name, operation, page, bounded query/orientation metadata, and source error name/code/status. Raw provider response bodies, API errors, search queries, image URLs, and credentials are not direct-console logged.

This diagnostic/request hardening adds no Firestore reads/writes, Storage operations, Cloud Function calls, cache invalidations, additional provider calls, or provider/vendor changes.

## Deletes

Official Business Page cover/gallery replacements and removals queue the previously saved Storage URL and delete the old Storage object after the related store save succeeds. Failed deletes are logged through bounded Storage diagnostics and do not roll back the saved store update.

## Cost Control

The shared preparation layer reduces Storage and public bandwidth by resizing and compressing before save:

- menu item images target 500KB or lower
- backgrounds target 800KB or lower
- logos target 350KB or lower with gentler quality

The prepared object includes named variants, Blob outputs, checksum, dominant color, and focal point metadata. Profile-aware saves upload all named variants, while existing single-URL Firestore fields are preserved to avoid a schema migration in this implementation. The primary variant URL is persisted by current DAL paths.

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
- Future media asset documents should use the same canonical path helper.

## Future Media Asset Documents

If MenuList later stores media metadata documents, each image save would add one Firestore write. That migration is not part of this implementation.

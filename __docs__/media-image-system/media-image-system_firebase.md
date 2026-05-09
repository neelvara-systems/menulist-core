# Media Image System Firebase Cost

## Storage Writes

This implementation does not add a new collection or extra Firestore write by itself.

Existing Firestore write paths remain. Storage writes for media-system images now use profile-aware immutable paths:

| Flow | Storage write | Firestore write |
| --- | --- | --- |
| Menu item image | 1 Blob upload to `media/menuItem/{tId}/{sId}/...` | Existing project save |
| Project image | 1 Blob upload to `media/projectImage/{tId}/{sId}/...` | Existing project summary/project metadata write |
| Menu background | 1 Blob upload to `media/menuBackground/{tId}/{sId}/...` on publish | Existing project publish write |
| Business logo | 1 Blob upload to `media/businessLogo/{tId}/{sId}/...` when logo changes | Existing store update write |
| Official Business Page gallery image | 1 Blob upload to `media/galleryImage/{tId}/{sId}/...` when photo is uploaded or adjusted | Existing store `publicPresence.photos` update |
| Digital screen slide | 1 Blob upload to `media/digitalScreenSlide/{tId}/{sId}/...` when owner saves the pending slide | Existing `platformSummary/campaigns_{storeId}.screen.pinnedSlides` update |

## Reads

No new Firestore reads are added by the media preparation layer.

## Deletes

Official Business Page gallery replacements and removals queue the previously saved photo URL and delete the old Storage object after the related store save succeeds. Failed deletes are logged and do not roll back the saved store update.

## Cost Control

The shared preparation layer reduces Storage and public bandwidth by resizing and compressing before save:

- menu item images target 500KB or lower
- backgrounds target 800KB or lower
- logos target 350KB or lower with gentler quality

The prepared object includes named variants, Blob outputs, checksum, dominant color, and focal point metadata. Existing single-URL Firestore fields are preserved to avoid a schema migration in this implementation, so the primary variant URL is persisted by current DAL paths.

Local `dataUrl` values are preview/form-state only. Profile-aware saves convert to Blob before Firebase upload and do not call `uploadString(data_url)`.

## Immutable Object Rule

Prepared public media should not overwrite the same object path. New image content must produce a new path or media version so Firebase/CDN caches, PWAs, and Digital Screen devices do not serve stale images.

Current status:

- Project, item, menu background, OBP gallery, business logo, and digital screen uploads use immutable `media/{profile}/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{extension}` paths.
- Firebase Storage rules allow writes to `media/{profile}/{tId}/{sId}/...` only for the authenticated owner store and only for known media profiles.
- Future media asset documents should use the same canonical path helper.

## Future Media Asset Documents

If MenuList later stores media metadata documents, each image save would add one Firestore write. That migration is not part of this implementation.

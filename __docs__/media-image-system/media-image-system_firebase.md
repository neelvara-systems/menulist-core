# Media Image System Firebase Cost

## Storage Writes

This implementation does not add a new collection or extra Firestore write by itself.

Existing write paths remain:

| Flow | Storage write | Firestore write |
| --- | --- | --- |
| Menu item image | 1 Storage object per saved image | Existing project save |
| Project image | 1 Storage object when saved | Existing project summary/project metadata write |
| Menu background | 1 Storage object on publish | Existing project publish write |
| Business logo | 1 fingerprinted Storage object when logo changes | Existing store update write |
| Official Business Page gallery image | 1 Storage object when photo is uploaded or adjusted | Existing store `publicPresence.photos` update |
| Digital screen slide | 1 Storage object when owner saves the pending slide | Existing `platformSummary/campaigns_{storeId}.screen.pinnedSlides` update |

## Reads

No new Firestore reads are added by the media preparation layer.

## Deletes

Official Business Page gallery replacements and removals queue the previously saved photo URL and delete the old Storage object after the related store save succeeds. Failed deletes are logged and do not roll back the saved store update.

## Cost Control

The shared preparation layer reduces Storage and public bandwidth by resizing and compressing before save:

- menu item images target 500KB or lower
- backgrounds target 800KB or lower
- logos target 350KB or lower with gentler quality

The prepared object includes named variants, Blob outputs, checksum, dominant color, and focal point metadata. Existing single-URL Firestore fields are preserved to avoid a schema migration in this implementation, so only the primary variant is persisted by current DAL paths.

## Immutable Object Rule

Prepared public media should not overwrite the same object path. New image content must produce a new path or media version so Firebase/CDN caches, PWAs, and Digital Screen devices do not serve stale images.

Current status:

- Project, item, menu background, OBP gallery, and digital screen uploads already use unique object paths.
- Business logo upload now uses a prepared-data fingerprint under `stores/logos/{storeId}/{fingerprint}` instead of overwriting `stores/logos/{storeId}`.
- Future media asset documents should use the canonical path helper: `{tenantId}/{profile}/{entityId}/{mediaId}_{variant}.{extension}`.

## Future Media Asset Documents

If MenuList later stores media metadata documents, each image save would add one Firestore write. That migration is not part of this implementation.

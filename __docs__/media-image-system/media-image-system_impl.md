# Media Image System Implementation Plan

## Files

Create:

- `src/lib/media/imageProfiles.ts`
- `src/lib/media/prepareMediaImage.ts`
- `src/lib/media/mediaStorage.ts`
- `src/components/shared/media/MediaAspectRatioSelector.tsx`
- `src/components/shared/media/MediaImageCard.tsx`
- `src/components/shared/media/MediaImageAdjustModal.tsx`
- `src/components/shared/media/PublicImageViewer.tsx`

Modify:

- `src/config/features.ts`
- `storage.rules`
- `src/lib/image/optimizeImage.ts`
- `src/lib/performanceBudget.ts`
- `src/lib/image/projectImageGeneration.ts`
- `src/lib/menu/publicMenuImages.ts`
- `src/database/stores/uploadOBPPhoto.ts`
- `src/components/atoms/imageUploadInput/index.tsx`
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/AspectRatioSelector.tsx`
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx`
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx`
- `src/components/templates/main-app/projects/editorView/AIDefaultsModal.tsx`
- `src/components/mobile/sheets/AIDefaultsSheet.tsx`
- `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`
- `src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx`
- `src/components/mobile/components/MobileProjectSelectorSheet.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/backgroundSettings.tsx`
- `src/components/mobile/screens/MobileDesignEditorScreen.tsx`
- `src/components/mobile/sheets/ItemEditSheet.tsx`
- `src/components/mobile/screens/MobileMenuScreen.tsx`
- `src/components/mobile/screens/MobileBasicSettingsScreen.tsx`
- `src/components/templates/main-app/businessSettings/index.tsx`
- `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx`
- `src/components/mobile/screens/MobileOfficialPageScreen.tsx`
- `src/app/client/obp/OBPResolvedSurface.tsx`
- `src/app/client/obp/BrandOBPContent.tsx`
- `src/app/client/obp/schema.ts`
- `src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx`
- `src/components/mobile/screens/MobileDigitalScreensScreen.tsx`
- `src/database/storage/uploadBlobToStorage.ts`
- `src/database/storage/uploadPreparedMediaImage.ts`
- `__docs__/changelog.md`

## Implementation Steps

1. Add a feature flag: `ENABLE_MEDIA_IMAGE_SYSTEM`.
2. Add media image profiles with purpose-specific ratios, transparency rules, named variants, source limits, output settings, and storage hints.
3. Add a shared preparation function that validates source type/size safety, crops to the selected allowed ratio, resizes, compresses, strips original image metadata through canvas re-encoding, and returns a canonical prepared media object with `mediaId`, `checksum`, `version`, `status`, primary Blob/local-preview data URL output, named variants, focal point, dominant color, and source metadata.
4. Add a shared media image card for placeholder, local file upload, drag/drop, paste, preview, replace, adjust, remove, and reset actions.
5. Add optional manual adjust UI for approved non-item profiles. The owner can drag, use Fit to frame, use slider zoom, pinch with two fingers on touch screens, rotate, and reset framing, but the final resize, format, and compression still come from `prepareMediaImage`.
6. Keep old optimizer exports (`MENU_IMAGE_CONFIG`, `MENU_BACKGROUND_IMAGE_CONFIG`) but derive them from media profiles.
7. Replace per-surface ad hoc upload rules with the shared preparation function.
8. Restrict AI image shape selectors to the menu item media profile and keep system-native ratio order first.
9. Preserve existing Firebase Storage writes and public cache invalidation paths.
10. Keep prepared outputs immutable. Profile-aware public media saves must upload the selected persisted variant through Blob storage to `media/{profile}/{tenantId}/{storeId}/{entityId}/{mediaId}_{variant}.{extension}`.

## Key Decisions

### Client preparation first

The current upload architecture uses client-side DAL and Firebase Storage. This implementation centralizes the client preparation contract. It does not introduce a new API route or dependency.

### Existing public cache behavior stays

Project and menu writes continue through existing `publishProject` and transactional `updateProjectMetadata` paths, which already call public cache invalidation. Generated project covers update only `projectImage`; they never reconstruct a full summary from stale caller data.

### Canonical media identity

Prepared images are no longer only URL-centric. `prepareMediaImage` returns `mediaId`, `checksum`, `version`, `status`, profile id, focal point, dominant color, and named variants. Existing fields that store a single image URL remain valid, but future media asset documents can use the same profile identifiers and media identity without changing UI contracts.

### Variant contract

Profiles expose named variants:

- Menu item: `thumb`, `small`, `medium`, `large`
- Project image and business cover: `card`, `hero`
- Menu background: `mobile`, `desktop`
- Business logo: `thumb`, `full`
- Digital screen slide: `desktop`, `full`
- Gallery image: `thumb`, `full`

`uploadPreparedMediaImage` uploads only the selected allowed variant and returns that URL for the existing single-field save contract. The full variant map remains available in the prepared in-memory object, but unused siblings are not written to Storage. A future multi-variant renderer must add an explicit persisted URL-map/read contract before enabling additional uploads.

### Data URL boundary

The media layer keeps `dataUrl` only for local preview and legacy form state. Profile-aware saves pass the prepared Blob/variant object into `uploadPreparedMediaImage`, which uploads Blob variants to Firebase Storage. If a legacy media caller still passes a prepared data URL into an existing DAL function, the DAL converts it back to a Blob before upload instead of using `uploadString(data_url)`.

The local preview must always be the prepared primary output. Screens that upload immediately, such as Official Business Page cover/gallery, can temporarily render `prepared.dataUrl` in the card while the Blob upload completes, then persist only the returned Firebase URL. This keeps owner preview and public rendering visually aligned without storing base64 public truth.

If an immediate Firebase upload fails after preparation, the screen must keep showing the prepared preview and offer retry from the same prepared Blob. The failed prepared preview is still draft-only; it must not be written into the store field until Firebase Storage returns the public URL.

### Upload privacy and metadata normalization

Profile-aware MenuList public media does not preserve original file metadata. The shared preparation path decodes the accepted source image, renders only the pixels into a canvas, and uploads the resulting Blob variants. That means EXIF fields such as location, camera model, and source-device metadata are stripped by default for prepared public media.

This is required behavior, not an owner-facing toggle. MenuList does not use owner-uploaded media for marketing by default, so no marketing consent checkbox is added to upload surfaces. If a future marketing reuse flow is added, it must use a separate opt-in consent record and an easy withdrawal path instead of being bundled into normal service uploads.

### Public context preview

`MediaPublicContextPreview` renders customer-frame previews for `menuBackground` and `businessCover`. The component is intentionally limited to these profiles because they affect page-level readability and first impression. It does not add editing controls or a new save path.

### Public image display

`PublicImageViewer` owns the customer-facing enlarged image viewer for public image lists. Official Business Page gallery thumbnails and menu item PDP images both pass normalized `{ url, alt }` image lists into this component. Surface-specific thumbnail or hero layouts remain local, but zoom, reset, pan, previous/next navigation, mobile swipe navigation, keyboard handling, and scroll locking are shared.

### Alt text

`src/lib/media/altText.ts` owns derived public image alt text. Public menu and OBP renderers use it for item images, project/menu images, business covers, logos, and gallery photos. Owners are not asked for alt text initially; the contract derives concise text from item, project, and business names already present in the system.

### Manual adjust is intent-only

Manual crop is available for project image, menu background, business logo, Official Business Page business cover, Official Business Page gallery, and Digital Screens custom slides. It is not added to item-image upload/generation flows, because per-item forced editing would slow owners down.

The adjustment UI stores only owner intent for the current draft image. Saving still re-runs `prepareMediaImage`, so owners cannot create arbitrary final sizes or bypass compression.

The crop center becomes the prepared image `focalPoint`. If a future UI adds explicit focal point selection, it should update the same normalized `{ x, y }` contract rather than adding another framing field.

### Shared image card is the presentation entry point

All owner-facing image profile surfaces should use `MediaImageCard` for the visual shell. The card owns placeholder, preview, upload click, drag/drop, paste, replace, adjust, remove, and reset presentation. Individual screens still own their save behavior and profile-specific preparation.

### Rollback behavior

`ENABLE_MEDIA_IMAGE_SYSTEM` is a runtime kill switch for the media preparation layer. When disabled, upload surfaces keep their existing shell, manual adjust is hidden, and `prepareMediaImage` returns validated raw image data without profile crop/resize/compression.

Validation is identical for `File`, `Blob`, and generated/adjusted data-URL
inputs. Every path requires an allowed profile MIME, a positive decoded size
within the profile cap, matching declared and actual size, and matching image
magic bytes. String inputs are data URLs only; arbitrary remote URLs are not a
media-preparation input contract.

The kill switch is an emergency compatibility fallback, not a privacy mode. Production public-media upload paths should keep the media image system enabled so prepared outputs remain compressed, profile-safe, immutable, and metadata-normalized.

### Storage cleanup

Official Business Page cover and gallery images upload immediately because the existing flow needs a preview URL before the store form is saved. Replaced or removed cover/gallery URLs are queued and deleted from Firebase Storage only after the related store save succeeds, so a cancelled desktop edit does not delete a still-saved public asset.

When a replacement upload fails, removing the visible failed draft only discards the draft and reveals the last saved public image. It must not queue deletion for the still-saved public asset.

Prepared-media paths are content-addressed and may be reused by concurrent or retried saves. Firebase Storage rules therefore allow creation but deny overwrite of an existing `media/{profile}/...` object. The upload helper reuses the existing download URL after a create conflict. A failed Firestore save must not delete the shared path because another successful mutation may already reference it. This keeps duplicate retries to one stored object and avoids a Firestore reference ledger; unreferenced content-addressed objects remain eligible for later bounded retention tooling.

Server/Admin media writes follow the same create-once rule. Batch generation and prompt-cache destination copies use a generation-match precondition, compare existing size/cache policy/content type/checksummed custom identity metadata after a create conflict, and reuse the existing Firebase download token. They never overwrite deterministic bytes or rotate a token already persisted in project truth.

Batch review state, one job row, and one project document are not deletion authority. A generated URL may survive an acknowledgement retry, project duplication, or outlet projection. Browser batch actions and the batch-retention scheduler therefore retain public media objects; job metadata is still pruned after seven days and terminal job rows after 30 days. A future physical-media cleanup requires a global reference ledger or equivalent cross-project/outlet proof and measured orphan growth.

### Immutable cache behavior

Prepared media outputs are immutable. Current project, item, menu background, logo, OBP business cover, OBP gallery, and digital screen uploads route through the profile-aware media uploader. Changed content gets a new public Storage object; retrying the same content reuses the existing object without overwriting its bytes or token.

### Static output and transparency

Animated public images are unsupported. GIF is rejected, and accepted formats are prepared into static canvas outputs. Transparency is preserved only for `businessLogo`; all other profiles are flattened against the profile background color before compression so public rendering stays predictable.

The Storage rule mirrors that static contract for direct SDK access: `media/{profile}/...` accepts JPEG, PNG, or WebP and rejects GIF even when an authenticated owner bypasses the normal preparation UI.

### Generated project image authority

Auto-generated project images are default-only. The initial browser check avoids unnecessary generation when the loaded project already has an image, but final authority remains the `updateProjectMetadata()` summary transaction. That transaction removes the generated `projectImage` patch when transaction-current summary truth already has an owner image. The returned authoritative summary is compared with the generated URL before desktop or mobile installs it locally, so an owner upload that completes during provider generation or Storage upload cannot be overwritten by the late generated result.

## Validation

Run:

```bash
npx tsc --noEmit --incremental false
```

Manual checks:

- Upload item image in desktop image modal.
- Upload item image in mobile item sheet.
- Upload project image in desktop project edit modal.
- Adjust project image in desktop project edit modal.
- Upload project image in mobile project selector sheet.
- Adjust project image in mobile project selector sheet.
- Upload menu background in desktop design editor.
- Adjust menu background in desktop design editor.
- Upload menu background in mobile design editor.
- Adjust menu background in mobile design editor.
- Upload business logo in mobile brand settings.
- Adjust business logo in desktop and mobile brand settings.
- Upload, generate, adjust, and save Official Business Page business cover in desktop and mobile settings.
- Upload digital screen slide in desktop settings.
- Review, adjust, then save digital screen slide in desktop settings.
- Upload digital screen slide in mobile settings.
- Review, adjust, then save digital screen slide in mobile settings.
- Upload and adjust Official Business Page gallery photo in desktop and mobile settings.
- Confirm AI image shape selector shows only valid menu item shapes.
- Inspect a prepared public media upload and confirm Firebase Storage custom metadata records `exifNormalized: "true"` and `sourceMetadataPolicy: "source_metadata_stripped"`.

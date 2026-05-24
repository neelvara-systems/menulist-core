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
- `__docs__/CHANGELOG.md`

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
10. Keep prepared outputs immutable. Profile-aware public media saves must upload through Blob storage to `media/{profile}/{tenantId}/{storeId}/{entityId}/{mediaId}_{variant}.{extension}`.

## Key Decisions

### Client preparation first

The current upload architecture uses client-side DAL and Firebase Storage. This implementation centralizes the client preparation contract. It does not introduce a new API route or dependency.

### Existing public cache behavior stays

Project and menu writes continue through existing `publishProject`, `syncProjectToSummary`, and `updateProjectMetadata` paths, which already call public cache invalidation.

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

`uploadPreparedMediaImage` uploads every prepared named variant to deterministic Storage paths and returns the selected primary variant URL for existing single-field save contracts. The variant map is prepared and stored under predictable sibling paths now, so future renderers can stop serving oversized single URLs without changing the media profile contract.

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

The kill switch is an emergency compatibility fallback, not a privacy mode. Production public-media upload paths should keep the media image system enabled so prepared outputs remain compressed, profile-safe, immutable, and metadata-normalized.

### Storage cleanup

Official Business Page cover and gallery images upload immediately because the existing flow needs a preview URL before the store form is saved. Replaced or removed cover/gallery URLs are queued and deleted from Firebase Storage only after the related store save succeeds, so a cancelled desktop edit does not delete a still-saved public asset.

When a replacement upload fails, removing the visible failed draft only discards the draft and reveals the last saved public image. It must not queue deletion for the still-saved public asset.

### Immutable cache behavior

Prepared media outputs should be immutable. Current project, item, menu background, logo, OBP business cover, OBP gallery, and digital screen uploads route through the profile-aware media uploader, so a changed image gets a new public Storage object instead of overwriting an old one.

### Static output and transparency

Animated public images are unsupported. GIF is rejected, and accepted formats are prepared into static canvas outputs. Transparency is preserved only for `businessLogo`; all other profiles are flattened against the profile background color before compression so public rendering stays predictable.

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

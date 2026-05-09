# Media Image System Implementation Plan

## Files

Create:

- `src/lib/media/imageProfiles.ts`
- `src/lib/media/prepareMediaImage.ts`
- `src/components/shared/media/MediaAspectRatioSelector.tsx`
- `src/components/shared/media/MediaImageCard.tsx`
- `src/components/shared/media/MediaImageAdjustModal.tsx`

Modify:

- `src/config/features.ts`
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
- `src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx`
- `src/components/mobile/screens/MobileDigitalScreensScreen.tsx`
- `__docs__/CHANGELOG.md`

## Implementation Steps

1. Add a feature flag: `ENABLE_MEDIA_IMAGE_SYSTEM`.
2. Add media image profiles with purpose-specific ratios, limits, output settings, and storage hints.
3. Add a shared preparation function that validates source type/size/dimensions, crops to the selected allowed ratio, resizes, compresses, and returns a prepared data URL plus metadata.
4. Add a shared media image card for placeholder, local file upload, drag/drop, paste, preview, replace, adjust, remove, and reset actions.
5. Add optional manual adjust UI for approved non-item profiles. The owner can drag, zoom, rotate, and reset framing, but the final resize, format, and compression still come from `prepareMediaImage`.
6. Keep old optimizer exports (`MENU_IMAGE_CONFIG`, `MENU_BACKGROUND_IMAGE_CONFIG`) but derive them from media profiles.
7. Replace per-surface ad hoc upload rules with the shared preparation function.
8. Restrict AI image shape selectors to the menu item media profile.
9. Preserve existing Firebase Storage writes and public cache invalidation paths.

## Key Decisions

### Client preparation first

The current upload architecture uses client-side DAL and Firebase Storage. This implementation centralizes the client preparation contract. It does not introduce a new API route or dependency.

### Existing public cache behavior stays

Project and menu writes continue through existing `publishProject`, `syncProjectToSummary`, and `updateProjectMetadata` paths, which already call public cache invalidation.

### Metadata-compatible, not schema-forcing

The profiles define variant and metadata contracts, but existing fields that store a single image URL remain valid. Future media asset documents can use the same profile identifiers without changing UI contracts.

### Manual adjust is intent-only

Manual crop is available for project image, menu background, business logo, Official Business Page gallery, and Digital Screens custom slides. It is not added to item-image upload/generation flows, because per-item forced editing would slow owners down.

The adjustment UI stores only owner intent for the current draft image. Saving still re-runs `prepareMediaImage`, so owners cannot create arbitrary final sizes or bypass compression.

### Shared image card is the presentation entry point

All owner-facing image profile surfaces should use `MediaImageCard` for the visual shell. The card owns placeholder, preview, upload click, drag/drop, paste, replace, adjust, remove, and reset presentation. Individual screens still own their save behavior and profile-specific preparation.

### Rollback behavior

`ENABLE_MEDIA_IMAGE_SYSTEM` is a runtime kill switch for the media preparation layer. When disabled, upload surfaces keep their existing shell, manual adjust is hidden, and `prepareMediaImage` returns validated raw image data without profile crop/resize/compression.

### Storage cleanup

Official Business Page gallery images upload immediately because the existing flow needs a preview URL before the store form is saved. Replaced or removed gallery URLs are queued and deleted from Firebase Storage only after the related store save succeeds, so a cancelled desktop edit does not delete a still-saved public photo.

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
- Upload digital screen slide in desktop settings.
- Review, adjust, then save digital screen slide in desktop settings.
- Upload digital screen slide in mobile settings.
- Review, adjust, then save digital screen slide in mobile settings.
- Upload and adjust Official Business Page gallery photo in desktop and mobile settings.
- Confirm AI image shape selector shows only valid menu item shapes.

# Item Photo Capture Assist Implementation

**Status:** Implemented June 25, 2026  
**Source of truth:** `item-photo-capture-assist_spec.md`

## File Structure

Create:

- `src/lib/media/itemPhotoCaptureAssist.ts`
- `src/components/shared/media/ItemPhotoCaptureAssist.tsx`

Modify:

- `src/config/features.ts`
- `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`
- `src/components/mobile/sheets/ItemEditSheet.tsx`
- `__docs__/changelog.md`
- `__docs__/item-photo-capture-assist/item-photo-capture-assist_validation.md`

## Existing Code Reuse

| Existing path | Use |
| --- | --- |
| `src/lib/media/prepareMediaImage.ts` | Prepare every captured image as `menuItem`. |
| `src/lib/media/imageProfiles.ts` | Keep accepted file types and menu item ratios. |
| `src/types/common.d.ts` | Reuse `UserUploadedFileType`. |
| `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx` | Host capture assist in the existing upload tab. |
| `src/components/templates/main-app/projects/editorView/utils/associateItemImages.ts` | Preserve final image-to-item association. |
| `src/database/projects/index.ts` | Preserve profile-aware immutable Storage upload. |

## Implementation Decisions

### Capture assist, not media schema

The new component creates a local image input. It does not write Firestore, create media documents, or modify item image schema.

### Local readiness feedback only

`itemPhotoCaptureAssist.ts` computes brightness, sharpness, and framing from the prepared local image. It returns owner-safe feedback:

- `ready`
- `needsLight`
- `needsSteady`
- `needsFrame`

The result is display-only and is not persisted.

If browser-local image sampling fails, the helper keeps the existing ready-to-save fallback and logs bounded `item_photo_readiness_stats_failed` diagnostics with prepared-image dimensions, size, image type, MIME type presence/length, and data URL presence only. If browser camera startup fails, the shared capture component keeps the existing upload fallback and logs bounded `item_photo_camera_start_failed` diagnostics with capture-mode/item-name presence-length metadata, camera API availability, and video element presence only. It does not log camera frames, raw image data, filenames, checksums, media IDs, raw item text, or browser exception text.

### Browser camera fallback

`ItemPhotoCaptureAssist.tsx` uses `navigator.mediaDevices.getUserMedia` only when available and when the feature flag is enabled. The existing `Upload.Dragger` stays available below the camera panel.

### Capture output

Captured canvas output becomes a `File` named from the selected item and capture mode. `ImageUploadModal` passes it through the same preparation helper used by file uploads.

## Phases

### Phase 1 - Support Library

- Add capture mode constants.
- Add browser-local readiness assessment.
- Keep implementation dependency-free.
- Return calm labels only.

### Phase 2 - Shared Component

- Add camera start/stop lifecycle.
- Add top-down/closer segmented buttons.
- Draw guide overlay with CSS only.
- Capture to canvas.
- Stop stream on unmount.
- Expose captured `File` through `onCapture`.

### Phase 3 - Modal Integration

- Add feature flag.
- Render capture assist above existing `Upload.Dragger`.
- Reuse the current preparation path.
- Keep selected image list behavior unchanged.
- Keep existing single/batch image generation behavior unchanged.

### Phase 4 - Mobile Inline Fallback

- Add `capture="environment"` to the inline mobile add-item file input.
- Keep the existing direct `prepareMediaImage` flow.

### Phase 5 - Validation

- Run TypeScript.
- Run focused lint if available.
- Run `git diff --check`.
- Create validation report.

## Security

No API route is added.

| Concern | Handling |
| --- | --- |
| Camera permission | Browser permission prompt only. |
| Sensitive logs | No camera frames, photo bytes, filenames, raw item text, or browser exception text logged; startup, capture, and readiness failures use bounded diagnostics only. |
| File validation | Captured file still enters `prepareMediaImage`; selected files still pass magic-byte validation. |
| Tenant isolation | Existing upload/save path keeps current project and tenant checks. |
| Public data | No public route change. |

## Firebase Cost

No cost is added by camera preview, local canvas capture, or readiness checks.

Accepted captured images cost the same as a normal uploaded item image: current profile-aware Storage variants plus the existing project save write.

## Public Cache

No new cache invalidation path is needed. The captured image is saved through the existing project update path that already handles public menu cache behavior.

## Testing Guide

1. Open a project menu item.
2. Open image upload for that item.
3. Confirm the upload tab still shows file upload.
4. Start camera.
5. Switch between `Top-down` and `Closer`.
6. Capture a photo.
7. Confirm a prepared image appears in the selected images list.
8. Click upload.
9. Confirm the item receives the uploaded image.
10. Repeat with camera blocked and confirm file upload still works.

## Non-Goals To Preserve

- Do not add a second image store.
- Do not add a new item image field.
- Do not add owner-facing photo scores.
- Do not add AI detection.
- Do not make two captures mandatory.

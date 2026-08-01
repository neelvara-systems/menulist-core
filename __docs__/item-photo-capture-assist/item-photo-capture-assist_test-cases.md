# Item Photo Capture Assist Test Cases

## Automated

| Case | Expected |
| --- | --- |
| TypeScript compile | New component and helper compile without DOM/type errors. |
| Diff whitespace check | No trailing whitespace or patch formatting issues. |

## Manual

| Case | Steps | Expected |
| --- | --- | --- |
| Camera supported | Open image modal, start camera, capture photo | Captured photo appears in selected upload list. |
| Camera blocked | Deny permission | Existing file upload remains usable. |
| Mode switch | Toggle top-down and closer | Overlay and helper text change without resetting selected uploads. |
| Retake | Capture, then retake | Preview clears and live camera returns. |
| Upload accepted photo | Capture, click upload | Existing item image save path writes the uploaded image to the item. |
| Existing upload | Drag/drop or choose file | Behavior matches previous upload flow. |
| Switch item during preparation | Start preparing a camera or device photo for item A, switch to item B before preparation finishes | The stale photo is not added to item B and item A's preview does not remain visible. |
| Switch away and back during preparation | Start preparing a photo for item A, switch to item B, then return to item A before preparation finishes | The old completion is still rejected by its obsolete selection revision. |
| Duplicate item ID across files | Attempt to open without a file identity, then target the second file explicitly | Ambiguous selection fails closed; an exact selection updates only that file/item pair. |
| Browser-only prepared state | Complete an upload created from a local `Blob` | Project data contains the Storage URL and public-safe metadata, never the `Blob`, prepared canvas payload, media fingerprint, capture-source label, or selection flag. |
| Item image ceiling | Add an image to an item already holding 20 images | The operation rejects before starting a Storage upload. |
| Exact image removal | Delete a photo from the second of two files that reuse an item ID | Only the exact file/item image is removed; the source project and first file remain unchanged. |
| Rapid duplicate delete | Trigger delete twice before the first confirmation/persistence flow settles | Only one confirmation/write flow is admitted. |
| Existing-photo edit context | Open edit from an item sheet backed by the second of two files with a repeated item ID | The edit request receives the exact file's localized item, category, description, and attributes. |
| Edited-photo save rejects | Select an edited preview and make project persistence reject | No success state appears, the modal/previews remain available, fixed retry copy appears, and a bounded failure is logged. |
| Rapid edited-photo save | Tap upload twice before persistence settles | One project-save request runs; success and delayed close occur only after its resolution. |
| Mobile inline add item | Add new item, tap image button | Native camera/file chooser opens and existing local preparation still works. |
| Linked outlet image blocked | Open inherited item without image override | Existing blocked-state behavior remains unchanged. |

## Regression Boundaries

- Batch image generation still starts from the generate tab.
- AI generation still accepts uploaded reference images.
- Existing uploaded images list still renders.
- No new public menu rendering behavior.

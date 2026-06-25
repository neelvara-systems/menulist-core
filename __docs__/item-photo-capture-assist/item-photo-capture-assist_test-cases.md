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
| Mobile inline add item | Add new item, tap image button | Native camera/file chooser opens and existing local preparation still works. |
| Linked outlet image blocked | Open inherited item without image override | Existing blocked-state behavior remains unchanged. |

## Regression Boundaries

- Batch image generation still starts from the generate tab.
- AI generation still accepts uploaded reference images.
- Existing uploaded images list still renders.
- No new public menu rendering behavior.


# Print Assets Firebase Cost

**Status:** Implemented
**Last Updated:** June 17, 2026

Print Assets adds no Firestore collection, Storage path, Cloud Function, API route, rule, or index.

## Cost Table

| Operation | Firebase Cost | Notes |
| --- | --- | --- |
| Open desktop Assets route | Existing dashboard context + project summary read | Uses the existing summary document and does not create a default project. |
| Open mobile Assets screen | Existing mobile project provider data | Same pattern as mobile Share. |
| Download table/counter/entrance/campaign files | 0 reads/writes | Client-side renderer downloads the requested file in the browser; editor-backed assets render from `CreativeEditorDocument` without storing output. |
| Preview table/counter/entrance/campaign files | 0 reads/writes | Client-side renderer opens a temporary browser blob URL; no generated preview is uploaded. |
| Copy print-shop handoff | 0 reads/writes | Uses already-loaded store/project context and clipboard only. |
| Download Feedback QR | 0 reads/writes | Client-side QR generation from existing selected project/store context. |
| Preview/download Print Menu | 0-1 selected-project reads per session | Reuses cached full project data when available; otherwise loads the selected project once because the summary document does not contain menu item rows. |
| Download Menu Kit ZIP | 0 reads/writes | Client-side JSZip. |

## Storage Policy

Generated print assets are not uploaded to Firebase Storage. Temporary browser blobs live only in the owner browser session and disappear when the browser releases them.

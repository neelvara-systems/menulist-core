# Menu PDF Cleanup Check - Firebase and Cost

**Status:** V0 static/browser-local report path; V1 owner module uses existing owner data context.
**Last Updated:** July 4, 2026

## V0 Cost Table

| Operation | Count |
| --- | ---: |
| Firestore reads during report generation | 0 |
| Firestore writes during report generation | 0 |
| Storage uploads | 0 |
| Cloud Functions | 0 |
| External fetches | 0 |
| PDF uploads | 0 |
| PDF parsing | 0 |
| OCR calls | 0 |
| AI/provider calls | 0 |

The optional follow-up form uses the existing `/api/public/contact` enquiry path after consent. Menu PDF Cleanup Check does not add a new collection, index, Storage path, Cloud Function, report API, file upload path, OCR pipeline, or PDF parser.

## V1 Owner Cost Posture

The owner module reuses existing Business Health / Public Discovery owner context and selected/default MenuList project data. It writes no report state and does not inspect external PDFs.

If the selected/default project is already loaded by the owner screen, this module adds no new read. If a surrounding owner surface chooses to load a project for deeper readiness, that read belongs to the existing owner readiness pattern, not to a new PDF cleanup collection.

## V2 Cost Rule

Recurring checks, saved history, monthly reports, multi-location reports, agency exports, file upload, OCR, PDF parsing, or managed repair require a separate paid add-on spec with explicit read/write/storage/provider caps.

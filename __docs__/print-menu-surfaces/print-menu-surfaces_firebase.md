# Print Menu Surfaces Firebase Cost

**Status:** Implemented
**Last Updated:** June 4, 2026

## Cost Summary

Print Menu Surfaces adds **no Firebase reads, writes, deletes, Storage uploads, or Cloud Functions**.

## Runtime Operations

| Operation | Firebase Cost | Notes |
| --- | --- | --- |
| Generate table tent PDF | 0 | Browser Canvas + jsPDF only. |
| Generate single table/counter card PDF | 0 | Browser Canvas + jsPDF only. |
| Generate QR | 0 | `qrcode` runs locally in browser. |
| Apply logo | 0 database cost | Browser may fetch existing logo URL if not cached. |
| Apply Premium attribution rule | 0 | Uses already-loaded `activePlanType`. |
| Download file | 0 | Browser Blob download. |
| Menu Kit bundle includes print-surface PDFs | 0 | JSZip runs locally. |

## No New Infrastructure

- No Firestore collection.
- No Storage artifact path.
- No API route.
- No Firebase Function.
- No Firestore index.
- No security-rule change.

## Cost Guardrail

Generated files must stay local unless a future feature explicitly documents server storage, retention, deletion, and pricing impact.

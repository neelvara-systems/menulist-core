# Upload & File Processing — Product Specification

**Feature:** File Upload & PDF Processing  
**Parent Feature:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026

---

## Executive Summary

Upload & File Processing is the entry point for digitizing physical menus. Restaurant owners upload photos or PDFs of their existing menus, which are automatically converted and prepared for AI extraction.

### What It Does

- **PDF Upload** → Converts each page to high-quality images automatically
- **Image Upload** → Accepts JPG, PNG, WebP directly
- **Multi-File Support** → Batch processing of multiple files
- **Smart Validation** → Blocks malicious files, enforces size limits
- **Duplicate Detection** → Prevents wasting AI credits on re-uploads

### What It Does NOT Do

- ❌ Does not extract menu data (that's AI Data Extraction)
- ❌ Does not compress images (preserves quality for AI OCR)
- ❌ Does not auto-upload to server (user must click "Upload & Continue")

---

## Goals

| Goal                    | Success Metric                            |
| ----------------------- | ----------------------------------------- |
| **Easy onboarding**     | < 2 minutes from signup to first upload   |
| **Reliable processing** | > 95% upload success rate                 |
| **Cost control**        | Predictable storage costs via size limits |
| **Security**            | Zero malicious file uploads               |
| **Mobile support**      | Works on iOS/Android without crashes      |

---

## User Stories

### Restaurant Owner

> "As a restaurant owner, I want to upload my menu PDF so that I can create a digital menu without retyping everything."

**Acceptance Criteria:**

- Can drag-and-drop or browse for files
- PDF automatically splits into page images
- See preview before processing
- Clear progress indication
- Works on phone camera roll

### Multi-Location Owner

> "As a multi-location owner, I want to upload menus for different locations so each has its own digital menu."

**Acceptance Criteria:**

- Can upload multiple files in one session
- Each file tracked separately
- Can remove individual files before processing
- Total session limit is reasonable (200MB)

---

## User Flow

```
┌─────────────────────────────────────────────────────────┐
│ User lands on Projects page (View 1: Upload)            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Upload files via:                                        │
│   • Drag & Drop onto upload zone                        │
│   • Click to browse files                               │
│   • Mobile: Camera roll selection                       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ VALIDATION (automatic, instant)                          │
│   1. File type check (JPG/PNG/WebP/PDF only)            │
│   2. File size check (10MB images, 50MB PDFs)           │
│   3. Magic bytes verification (detects fake extensions) │
│   4. Duplicate detection (warns if already uploaded)    │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐
│ PDF Files           │   │ Image Files         │
│ → Convert to images │   │ → Add to preview    │
│ → 50 page max       │   │                     │
└─────────┬───────────┘   └─────────┬───────────┘
          │                         │
          └───────────┬─────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ PREVIEW (FileList component)                             │
│   • Grid of uploaded files                              │
│   • Delete individual files                             │
│   • See file size, page count                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Click "Upload & Continue"                                │
│   → Files upload to Firebase Storage                    │
│   → Each file sent to AI for data extraction            │
│   → Progress shown per file                             │
│   → Navigate to Editor (View 2) when complete           │
└─────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                              | Priority | Status |
| ----- | ---------------------------------------- | -------- | ------ |
| FR-01 | Accept JPG, PNG, WebP, PDF files         | P0       | ✅     |
| FR-02 | Convert PDF pages to JPEG images         | P0       | ✅     |
| FR-03 | Preview uploaded files before processing | P0       | ✅     |
| FR-04 | Delete individual files from preview     | P0       | ✅     |
| FR-05 | Show processing progress per file        | P1       | ✅     |
| FR-06 | Handle multiple files in one session     | P1       | ✅     |
| FR-07 | Detect and warn about duplicate files    | P1       | ✅     |
| FR-08 | Mobile camera roll upload                | P1       | ✅     |

### Non-Functional Requirements

| ID     | Requirement                 | Target      | Status |
| ------ | --------------------------- | ----------- | ------ |
| NFR-01 | Individual image size limit | 10MB        | ✅     |
| NFR-02 | Individual PDF size limit   | 50MB        | ✅     |
| NFR-03 | Total session upload limit  | 200MB       | ✅     |
| NFR-04 | Maximum PDF pages           | 50          | ✅     |
| NFR-05 | PDF conversion quality      | 80% JPEG    | ✅     |
| NFR-06 | PDF conversion scale        | 1.5x        | ✅     |
| NFR-07 | Memory leak prevention      | 0 leaks     | ✅     |
| NFR-08 | Mobile browser support      | iOS/Android | ✅     |

### Security Requirements

| ID    | Requirement               | Implementation               | Status |
| ----- | ------------------------- | ---------------------------- | ------ |
| SR-01 | Block executable files    | MIME + extension check       | ✅     |
| SR-02 | Detect spoofed file types | Magic bytes validation       | ✅     |
| SR-03 | Prevent XSS via SVG       | SVG blocked entirely         | ✅     |
| SR-04 | Multi-tenant isolation    | {tId}/{sId} in storage paths | ✅     |

---

## File Limits Rationale

| Limit                 | Value         | Reasoning                                                       |
| --------------------- | ------------- | --------------------------------------------------------------- |
| **Image max**         | 10MB          | Typical menu photo is 2-5MB. 10MB covers high-res scans.        |
| **PDF max**           | 50MB          | 30-page compressed PDF ≈ 15-30MB. 50MB handles large menus.     |
| **Session max**       | 200MB         | Allows 4x 50MB PDFs or 20x 10MB images per upload session.      |
| **PDF pages**         | 50 max        | Prevents browser crashes. Split large menus into multiple PDFs. |
| **Warning threshold** | 30MB/30 pages | Warns user about processing time/cost without blocking.         |

---

## Error Messages

| Scenario             | Message                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Image too large      | `"{filename}" is too large. Maximum size for images: 10MB`                                                                 |
| PDF too large        | `"{filename}" is too large. Maximum size for PDFs: 50MB`                                                                   |
| Total limit exceeded | `Total upload size ({x}MB) exceeds the 200MB limit. Please upload files in smaller batches.`                               |
| Invalid file type    | `"{filename}" has an invalid file type. Please upload only: JPG, PNG, WebP, or PDF files.`                                 |
| Corrupted PDF        | `"{filename}" is corrupted or invalid. Please try a different PDF file.`                                                   |
| Too many pages       | `"{filename}" has {x} pages. Maximum allowed is 50 pages per PDF. Please split the PDF into smaller files.`                |
| Duplicate detected   | `"{filename}" already exists in this project. Uploading it again will use additional AI credits. Do you want to continue?` |

---

## Out of Scope

| Feature                    | Reason                         | Alternative                |
| -------------------------- | ------------------------------ | -------------------------- |
| Image compression          | Reduces AI OCR quality         | Accept full quality only   |
| Parallel batch processing  | User preference for sequential | Process one-by-one         |
| Resume interrupted uploads | Complexity vs. value           | Re-upload on failure       |
| Cloud storage integration  | Phase 2                        | Manual file selection only |

---

## Related Documents

| Document                      | Purpose                               |
| ----------------------------- | ------------------------------------- |
| `_impl.md`                    | Technical implementation details      |
| `_marketing.md`               | Sales and marketing collateral        |
| `../02-AI-DATA-EXTRACTION.md` | What happens after upload             |
| `../04-DATA-EDITOR.md`        | Editor where extracted data is edited |

---

## Version History

| Version | Date     | Changes                                           |
| ------- | -------- | ------------------------------------------------- |
| 1.0     | Nov 2025 | Initial implementation                            |
| 1.1     | Nov 2025 | Added magic bytes validation, duplicate detection |
| 1.2     | Dec 2025 | Lazy PDF worker loading, memory leak fixes        |

---

_Document Status: ✅ PRODUCTION READY_

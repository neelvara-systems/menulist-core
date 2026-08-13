# Upload & File Processing — Implementation

**Feature:** File Upload & PDF Processing  
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** August 13, 2026

**Launch boundary:** This implementation note documents upload/PDF processing architecture. Current release approval still requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, target deploy evidence, browser/mobile upload QA, Storage quota/rules evidence, and extraction-job evidence for the release.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Client-Side)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  index.tsx (View 1)                                              │
│       │                                                          │
│       ├── Ant Design <Dragger> / <Upload>                       │
│       │                                                          │
│       ▼                                                          │
│  validation.ts ──────────────────────────────────────────────    │
│       │  • validateFileType() - MIME + extension                │
│       │  • validateFileSize() - per-file + total limits         │
│       │  • validateFileMagicBytes() - true file type check      │
│       │  • detectDuplicateFile() - warn on re-uploads           │
│       │                                                          │
│       ▼                                                          │
│  utils/pdfUtils.ts (lazy loaded)                                 │
│       │  • convertPdfToImages() - PDF → JPEG pages              │
│       │  • Memory management (canvas cleanup)                   │
│       │                                                          │
│       ▼                                                          │
│  FileList.tsx (Preview Component)                                │
│       │  • Grid display with hover actions                      │
│       │  • Delete confirmation for processed files              │
│       │                                                          │
└───────┼─────────────────────────────────────────────────────────┘
        │
        │ "Upload & Continue" clicked
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  database/projects/index.ts                                      │
│       │  • uploadFile() - base64 → Firebase Storage             │
│       │                                                          │
│       ▼                                                          │
│  Firebase Storage                                                │
│       │  Path: projects/files/{tId}/{sId}/{fileId}              │
│       │                                                          │
│       ▼                                                          │
│  /api/menu-extraction/jobs (Next.js API Route)                  │
│       │  • Auth, tenant, URL, MIME, dedupe, and size gates      │
│       │  • Rejects projected oversized project appends before AI│
│       │  • Creates the extraction job for the worker            │
│       │                                                          │
│       ▼                                                          │
│  processMenuImagesJob / saveFilesToProject                      │
│       │  • AI OCR via Gemini 2.5 Flash                          │
│       │  • Final 900KB transaction save guard                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/components/templates/main-app/projects/
├── index.tsx                    # Main component (View 1 = Upload)
├── constants.ts                 # File limits, allowed types
├── validation.ts                # All validation functions (270 LOC)
├── types.ts                     # TypeScript interfaces
├── FileList.tsx                 # Preview grid component
├── getProcessedFile.ts          # API call to image-processor
│
└── utils/
    ├── index.ts                 # Re-exports
    ├── pdfUtils.ts              # PDF → image conversion (198 LOC)
    ├── excelUtils.ts            # Excel export (lazy loaded)
    └── styleUtils.ts            # Styling utilities
```

---

## Key Files & Functions

### Functions Storage Bucket Resolution

Menu extraction workers accept only objects from the configured Firebase
Storage bucket. The shared Functions resolver in
`functions/src/utils/storageBucket.ts` uses this order:

1. explicit `FIREBASE_STORAGE_BUCKET`;
2. explicit `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`;
3. `storageBucket` from the injected `FIREBASE_CONFIG` JSON;
4. a project-derived `*.appspot.com` compatibility fallback.

`processMenuImages`, `processMenuImagesJob`, and messaging asset intelligence
must import this shared resolver. They must not independently synthesize a
bucket from `GCLOUD_PROJECT`, because newer Firebase buckets can use the
`*.firebasestorage.app` hostname and a synthesized legacy name rejects a valid
same-project upload before provider work.

### constants.ts

```typescript
// File size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image
export const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB per PDF
export const MAX_TOTAL_UPLOAD_SIZE = 200 * 1024 * 1024; // 200MB session
export const WARN_FILE_SIZE = 30 * 1024 * 1024; // 30MB warning

// Extraction/PDF limits
export const MAX_MENU_EXTRACTION_FILES = MENU_EXTRACTION_JOB_LIMITS.MAX_FILES; // 15
export const MAX_PDF_PAGES = MAX_MENU_EXTRACTION_FILES; // Hard limit
export const WARN_PDF_PAGES = Math.max(10, MAX_PDF_PAGES - 3); // Warning threshold

// Allowed types
export const ALLOWED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};
```

### validation.ts — Key Functions

| Function                                 | Purpose                        | Returns                           |
| ---------------------------------------- | ------------------------------ | --------------------------------- |
| `validateFileType(file)`                 | MIME + extension check         | `false` or `Upload.LIST_IGNORE`   |
| `validateFileSize(file, fileList)`       | Size limits + warnings         | `false` or `Upload.LIST_IGNORE`   |
| `validateFileMagicBytes(file)`           | True file type via first bytes | `Promise<boolean>`                |
| `detectDuplicateFile(file, existing)`    | Modal if duplicate found       | `Promise<boolean>`                |
| `validateFile(file, fileList, existing)` | Master function (runs all)     | `Promise<boolean \| LIST_IGNORE>` |

### utils/pdfUtils.ts — PDF Conversion

```typescript
export const convertPdfToImages = async (
  pdfFile: File[],
  tenantId: string,
  storeId: string
): Promise<ConvertedImage[]>
```

**Features:**

- Lazy loads `pdfjs-dist` (only when PDF uploaded)
- Canvas cleanup after each page (prevents memory leaks)
- 15-page/job hard limit, near-limit warning
- Corrupted PDF detection with friendly error
- Progress logging every 10 pages
- JPEG output at 80% quality, 1.5x scale

---

## Database Schema

### Firebase Storage Path

```
projects/files/{tId}/{sId}/{fileId}
```

Example: `projects/files/14/22/1699876543210-ABC123`

Legacy files may still exist under `MenuListAi/project/files/` from older deployments. New project upload flows use `generateStoragePath()` so active writes include tenant/store path segments. Because legacy paths contain no tenant/store identity, `storage.rules` denies direct client reads, writes, and deletes; required authenticated legacy access must be server-mediated.

### ProjectFileType Interface

```typescript
interface ProjectFileType {
  uid: string; // Unique ID: {tId}{random}{sId}
  name: string; // Original filename
  size: number; // File size in bytes
  type: string; // MIME type
  url: string; // Storage URL (after upload)
  fileId?: string; // Parent PDF UID (for converted pages)
  extractedData?: ExtractedData; // AI-extracted menu data
  processingTime?: number; // Time taken in ms
  active: boolean; // Soft delete flag
  deleted: boolean; // Soft delete flag
  index: number; // Order in file list
}
```

---

## Security Implementation

### Triple-Layer File Validation

```
Layer 1: MIME Type Check
  └── file.type === 'image/jpeg' ✓

Layer 2: Extension Check
  └── .jpg, .jpeg, .png, .webp, .pdf only ✓

Layer 3: Magic Bytes Check
  └── First 8 bytes match known signatures ✓
      JPEG: FF D8 FF
      PNG:  89 50 4E 47
      PDF:  25 50 44 46 ("%PDF")
```

### Magic Bytes (File Signatures)

```typescript
// From @lib/security/fileSignatures.ts
const FILE_SIGNATURES = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  ],
};
```

### Multi-Tenant Isolation

- File UIDs include `{tId}` and `{sId}` prefixes
- Storage paths scoped to project
- No cross-tenant data access possible

---

## Memory Management (PDF Processing)

### Problem Solved

Large PDFs previously caused browser crashes due to canvas memory leaks and could exceed the backend extraction job file cap.

### Solution

```typescript
const canvases: HTMLCanvasElement[] = [];

for (let i = 1; i <= totalPages; i++) {
  const canvas = document.createElement('canvas');
  canvases.push(canvas);

  // ... render page ...

  // ✅ Cleanup immediately after each page
  canvas.width = 0;
  canvas.height = 0;
  context.clearRect(0, 0, canvas.width, canvas.height);
  page.cleanup();
}

// ✅ Final cleanup in finally block
finally {
  canvases.forEach(canvas => {
    canvas.width = 0;
    canvas.height = 0;
  });
  pdf.cleanup();
}
```

### Memory Profile

| Scenario      | Before Fix         | After Fix                |
| ------------- | ------------------ | ------------------------ |
| 12-page PDF   | 60MB → stays high | Memory returns after canvas cleanup |
| 20-page PDF   | Browser work then API rejection risk | Blocked before Storage upload |
| Multiple PDFs | Could exceed job cap after conversion | Combined pending files capped at 15 |

---

## API Integration

### Upload to Storage

```typescript
// database/projects/index.ts
export const uploadFile = async (data: UserUploadedFileType) => {
  const docId = `${new Date().getTime()}-${data.uid}`;

  if (data.url?.includes("base64")) {
    const session = await getActiveSession();
    const fileUrl = await uploadBase64ToStorage({
      fileId: docId,
      url: data.url,
      path: generateStoragePath({
        collection: DATA_COLLECTION,
        fileType: "files",
        session,
        fileId: docId,
      }),
      type: data.type,
    });
    return fileUrl;
  }
  return "";
};
```

### AI Processing Call

```typescript
// getProcessedFile.ts
const response = await fetch("/api/image-processor", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    files, // Array of {url, type, uid}
    targetLanguages, // Languages to extract
    projectId,
    fileId,
    action: "IMAGE_PROCESSING",
  }),
});
```

---

## Validation Checklist

| Requirement            | Implementation               | File                | Status |
| ---------------------- | ---------------------------- | ------------------- | ------ |
| 10MB image limit       | `MAX_IMAGE_SIZE` constant    | constants.ts:6      | ✅     |
| 50MB PDF limit         | `MAX_PDF_SIZE` constant      | constants.ts:7      | ✅     |
| 200MB session limit    | `MAX_TOTAL_UPLOAD_SIZE`      | constants.ts:10     | ✅     |
| MIME type validation   | `validateFileType()`         | validation.ts:75    | ✅     |
| Extension validation   | Part of `validateFileType()` | validation.ts:80    | ✅     |
| Magic bytes validation | `validateFileMagicBytes()`   | validation.ts:107   | ✅     |
| Duplicate detection    | `detectDuplicateFile()`      | validation.ts:163   | ✅     |
| 15-page PDF/job limit  | Shared extraction cap        | constants.ts        | ✅     |
| Canvas memory cleanup  | In `convertPdfToImages()`    | pdfUtils.ts:139-143 | ✅     |
| Lazy PDF worker load   | `ensurePdfLibLoaded()`       | pdfUtils.ts:14      | ✅     |
| Corrupted PDF handling | try/catch in conversion      | pdfUtils.ts:66-77   | ✅     |

---

## Testing Guide

### Manual Tests

| Test               | Steps                              | Expected Result               |
| ------------------ | ---------------------------------- | ----------------------------- |
| **Large image**    | Upload 15MB JPG                    | Error: "too large. Max 10MB"  |
| **Large PDF**      | Upload 60MB PDF                    | Error: "too large. Max 50MB"  |
| **Fake extension** | Rename .exe to .pdf, upload        | Error: "corrupted or invalid" |
| **Many pages**     | Upload 20-page PDF                 | Error: "Maximum 15 pages"     |
| **Duplicate**      | Upload same file twice             | Modal: "already exists"       |
| **Memory**         | Upload 12-page PDF, check DevTools | Memory returns to baseline    |

### Smoke Test (5 minutes)

1. ✅ Upload 5MB JPG → Works
2. ❌ Upload 100MB file → Blocked
3. ❌ Upload .exe file → Blocked
4. ✅ Upload 10-page PDF → Converts
5. ❌ Upload 60-page PDF → Blocked

---

## Troubleshooting

| Issue                             | Cause              | Solution                       |
| --------------------------------- | ------------------ | ------------------------------ |
| PDF won't convert                 | Worker not loaded  | Check console for pdfjs errors |
| Memory keeps growing              | Canvas not cleaned | Verify finally block runs      |
| "Invalid file type" on valid file | Extension mismatch | Check file.name matches type   |
| Upload stuck                      | API timeout        | Check network tab, retry       |
| Mobile crash                      | Memory limit       | Use smaller files or split PDF |

---

## Performance Benchmarks

| Operation               | Target  | Actual |
| ----------------------- | ------- | ------ |
| 5MB image upload        | < 2s    | ~1.5s  |
| 10-page PDF conversion  | < 10s   | ~8s    |
| 12-page PDF conversion  | < 15s   | ~12s   |
| Memory per PDF page     | < 2MB   | ~1.5MB |
| Validation (all checks) | < 500ms | ~200ms |

---

## Related Documents

| Document                                                  | Purpose                |
| --------------------------------------------------------- | ---------------------- |
| `_spec.md`                                                | Product specification  |
| `_marketing.md`                                           | Sales collateral       |
| `../assessments/assessment-01-upload.md`                  | Original assessment    |
| `../development_done/1-implementation-upload-complete.md` | Implementation details |
| `../development_done/1-testing-guide-upload.md`           | Full testing guide     |

---

## Recommendations & Future Improvements

### Code Quality Observations

| Finding            | Current State                             | Recommendation                       | Priority |
| ------------------ | ----------------------------------------- | ------------------------------------ | -------- |
| **SWR Caching**    | Uses `REFRESH_INTERVALS.SWR_DEDUPE` (60s) | ✅ Correct pattern, well implemented | -        |
| **Lazy Loading**   | pdfjs-dist loaded dynamically             | ✅ Good for bundle size              | -        |
| **Memory Cleanup** | Canvas cleanup after PDF conversion       | ✅ Prevents memory leaks             | -        |
| **Job Queue**      | Uses `useMenuProcessingJob` hook          | ✅ Proper async processing           | -        |

### Suggested Improvements

1. **Add Retry Logic for Failed Uploads**

   - **Current**: Failed uploads require manual retry
   - **Suggested**: Add automatic retry with exponential backoff (3 attempts)
   - **File**: `index.tsx`
   - **Priority**: P2

2. **Progress Indicator Enhancement**

   - **Current**: Basic progress shown during PDF conversion
   - **Suggested**: Add file-level progress (e.g., "Converting page 3 of 10...")
   - **File**: `utils/pdfUtils.ts`
   - **Priority**: P2

3. **Batch Upload Optimization**

   - **Current**: Files processed sequentially
   - **Suggested**: Consider parallel processing for images (not PDFs) with concurrency limit of 3
   - **File**: `index.tsx`
   - **Priority**: P3

4. **Upload Resume Capability**
   - **Current**: Upload failure requires restart
   - **Suggested**: Track upload progress in localStorage, allow resume
   - **Priority**: P3 (Phase 2)

### Technical Debt

| Item             | Description                                         | Effort |
| ---------------- | --------------------------------------------------- | ------ |
| Console logs     | Remove `console.log` statements in production       | Low    |
| Type safety      | Some `any` types in `pdfUtils.ts` could be stronger | Medium |
| Error boundaries | Add React error boundary for upload failures        | Medium |

---

_Document Status: Historical upload-processing implementation evidence - not current launch certification_

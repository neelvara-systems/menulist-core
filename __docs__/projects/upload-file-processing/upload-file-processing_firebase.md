# Upload & File Processing — Firebase Cost Tracking

**Feature:** File Upload & PDF Processing  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** HIGH — Entry point for every new menu. Every user triggers this.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData), `platformSummary` (projectsSummary)
- **Storage Buckets:** `MenuListAi/project/files/{timestamp}-{uid}`
- **Cloud Functions:** None (client-side processing)
- **Estimated Monthly Cost:** **Low** — Storage-dominated

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Load project for upload | `projects/{tId}/{sId}/{projectId}` | User opens upload view | Per project open | 1 | Direct doc | Reads current project state to check existing files. File: `src/database/projects/index.ts` |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Save uploaded file URLs | `projects/{tId}/{sId}/{projectId}` | After upload to Storage | Per upload batch | 1 | files[] array merge | `updateProject()` with file URLs. Uses `requestBodyComposer` for timestamps. File: `src/database/projects/index.ts:382` |
| Sync to summary | `platformSummary/projects_{sId}` | With project update | Per upload | 1 | merge update | `syncProjectToSummary()` lightweight metadata. File: `src/database/projects/index.ts:230` |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| None | — | — | — | — | — | Files are never deleted from uploads. Replaced only. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload menu images | `MenuListAi/project/files/{timestamp}-{uid}` | User upload | 1-5MB per file | JPEG 80% quality. PDF pages converted client-side at 1.5x scale before upload. |
| Upload PDF-converted pages | Same pattern | After client-side conversion | 0.5-2MB per page | Each PDF page → JPEG image, then uploaded individually. |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| None | — | — | — | — | All file processing is client-side (PDF→image conversion via pdfjs-dist). No Cloud Functions for upload. |

---

## Security Rules Impact

- Storage upload: requires auth + path must match `MenuListAi/project/files/*`
- File type validation: client-side (JPG, PNG, WebP, PDF only)
- Size limit: enforced client-side (max 10MB per file)
- Tenant isolation: files stored under project path which includes `{tId}/{sId}`

---

## Cost Optimization Notes

### Current Optimizations
- **Client-side PDF conversion**: No Cloud Function cost for PDF→image
- **JPEG compression**: 80% quality reduces storage size by ~40%
- **Scale factor 1.5x**: Balances quality for OCR vs file size
- **Duplicate detection**: Prevents re-uploading same files

### Potential Optimizations
- **WebP format**: 25-30% smaller than JPEG at same quality
- **Lazy cleanup**: Delete orphaned files if project is deleted

### Warnings: Expensive Patterns
- **Large PDFs**: 20-page PDF = 20 images × 2MB = 40MB storage per project
- **No cleanup on re-upload**: Old files remain in Storage even when replaced

---

## Cost Estimate (per 1000 uploads/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads | 1,000 | $0.06/100K | $0.00 |
| Firestore Writes | 2,000 | $0.18/100K | $0.00 |
| Storage (new files) | 5GB (avg 5MB × 1000) | $0.026/GB | $0.13 |
| Storage (cumulative) | Growing monthly | $0.026/GB | Grows |
| **Total (new)** | | | **~$0.13/month** |

> **Note:** Storage cost is cumulative — it grows every month as files accumulate. Consider cleanup policy for deleted projects.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateProject` | `src/database/projects/index.ts:382` | Write (setDoc merge) |
| `syncProjectToSummary` | `src/database/projects/index.ts:230` | Write (setDoc merge) |
| `uploadProjectFile` | `src/database/projects/index.ts:274` | Storage upload |

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes |
|-------|--------|-------------|---------------|-------|
| N/A (client-side upload) | — | 0R + 1W + Storage | No (standard upload) | Direct Firebase SDK upload from client |

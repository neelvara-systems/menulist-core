# Upload & File Processing — Firebase Cost Tracking

**Feature:** File Upload & PDF Processing  
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** August 13, 2026
**Priority:** HIGH — Entry point for every new menu. Every user triggers this.

> **Launch Boundary:** This file records Firebase cost evidence for upload flows, not current production-launch approval. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, `npm run verify:menu-extraction-pipeline`, browser/mobile upload QA, Storage quota/rules evidence, provider/extraction smoke, target deploy evidence, and production-host smoke.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData), `platformSummary` (projectsSummary)
- **Storage Buckets:** Active uploads use `projects/files/{tId}/{sId}/{stable-file-prefix}-{attemptId}`. Legacy files may still exist under `MenuListAi/project/files/{timestamp}-{uid}`, but that unscoped namespace denies all direct client access.
- **Cloud Functions:** Client-side upload is followed by
  `processMenuImagesJob` for queued AI extraction when an extraction job is
  created.
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
| Save uploaded file URLs | `projects/{tId}/{sId}/{projectId}` | After upload to Storage | Per upload batch | 1 | files[] array merge | `updateProject()` first transactionally re-reads the exact scoped project, then persists a partial merge so deleted, cross-scope, or newly linked state cannot be overwritten. |
| Summary write | — | Normal file/content upload | Per upload | 0 | — | Uploading files changes the full project only; summary metadata is updated separately only when an owner-facing metadata field changes. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| None | — | — | — | — | — | Files are never deleted from uploads. Replaced only. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload menu images/documents | `projects/files/{tId}/{sId}/{stable-file-prefix}-{attemptId}` | User publish/upload | Up to 10MB image or 50MB PDF | Every persistence attempt uses a new immutable path. Project admission accepts JPEG/PNG/WebP/PDF only and verifies MIME agreement, decoded size, base64 and signature before upload. |
| Upload PDF-converted pages | Same pattern | After client-side conversion | 0.5-2MB per page | Each PDF page → JPEG image, then uploaded individually. |
| Upload image-only project media | `projects/{assets|itemImages|project-images|custom|generated|edited}/{tId}/{sId}/{fileId}` | Project media flow | Images up to 10MB | Storage rules reject PDFs and non-image payloads from image-only project namespaces. |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| `processMenuImagesJob` | Firestore document created at `menuImageProcessingJobs/{jobId}` | Per admitted extraction job | Up to 540 seconds | 2 GiB | PDF-to-image conversion remains client-side. The worker validates the configured Storage bucket, calls the extraction provider, and saves bounded results. The bucket resolver reads the deployed `FIREBASE_CONFIG.storageBucket` before using a project-derived compatibility fallback. |

---

## Security Rules Impact

- Storage upload: active writes require auth, tenant/store path shape, and `belongsToStore(tId, sId)` on `projects/files/{tId}/{sId}/{fileId}`
- File type validation: client UX, DAL, and Storage rules admit JPG, PNG, WebP, or PDF in `projects/files`; image-only project namespaces reject PDFs and SVG remains blocked.
- Size limit: DAL and Storage rules both enforce 10MB for images and 50MB for PDFs in `projects/files`; image-only namespaces remain capped at 10MB.
- Tenant isolation: files stored under project path which includes `{tId}/{sId}`
- Legacy compatibility: older `MenuListAi/project/files/*` objects remain retained, but active rules deny direct client reads, writes, and deletes because ownership cannot be derived from the path. Existing tokenized URLs are independently revocable; new writes use tenant/store-scoped paths.

---

## Cost Optimization Notes

### Current Optimizations
- **Client-side PDF conversion**: No Cloud Function cost for PDF→image
- **JPEG compression**: 80% quality reduces storage size by ~40%
- **Scale factor 1.5x**: Balances quality for OCR vs file size
- **Duplicate detection**: Prevents re-uploading same files
- **Immutable attempt paths**: A failed retry cannot overwrite or delete the object still referenced by the persisted project.

### Potential Optimizations
- **WebP format**: 25-30% smaller than JPEG at same quality
- **Lazy cleanup**: Delete orphaned files if project is deleted

### Warnings: Expensive Patterns
- **Large PDFs**: 20-page PDF = 20 images × 2MB = 40MB storage per project
- **Reference-aware cleanup remains required**: Replaced and ambiguous linked-attempt files may remain in Storage. Immediate deletion is unsafe because duplicated projects can share old URLs and an ambiguous server response may already have committed the new URL.

---

## Cost Estimate (per 1000 uploads/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads | 2,000 | $0.06/100K | $0.00 |
| Firestore Writes | 1,000 | $0.18/100K | $0.00 |
| Storage (new files) | 5GB (avg 5MB × 1000) | $0.026/GB | $0.13 |
| Storage (cumulative) | Growing monthly | $0.026/GB | Grows |
| **Total (new)** | | | **~$0.13/month** |

> **Note:** Storage cost is cumulative — it grows every month as files accumulate. Consider cleanup policy for deleted projects.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateProject` | `src/database/projects/index.ts` | Current-project transaction read plus partial merge write |
| `updateProjectMetadata` | `src/database/projects/index.ts` | Transactional summary metadata merge when metadata actually changes |
| `uploadProjectFile` | `src/database/projects/index.ts:274` | Storage upload |

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes |
|-------|--------|-------------|---------------|-------|
| N/A (client-side upload) | — | 1R + 1W + Storage after the project is open | No (standard upload) | Direct Firebase SDK Storage upload followed by transaction-current project persistence. The initial screen project read is separate. |

# KB Generation Pipeline — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-03-02
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The KB Generation Pipeline is Canonica's article and FAQ generation system — product owners upload raw source files (PDFs, documents, videos, images, websites, copied text), and the system generates structured knowledge base articles with optional source-backed FAQ suggestions. Generated articles and FAQs go through review → reconciliation → publish → embed workflow before becoming searchable and visible in the Help Center.

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `kb-generation-pipeline_spec.md` | CEO/PM | Business requirements, pipeline stages |
| 3 | `kb-generation-pipeline_impl.md` | Developers | Technical blueprint, every file |
| 4 | `kb-generation-pipeline_firebase.md` | Developers/Ops | Firestore operations, cost |
| 5 | `kb-generation-pipeline_marketing.md` | Sales/Marketing | Pitch points |
| 6 | `kb-generation-pipeline_website.md` | Public | Landing page content |
| 7 | `kb-generation-pipeline_helpdoc.md` | End users | N/A (platform-admin only feature) |
| 8 | `kb-generation-pipeline_mobile-support.md` | Mobile team | Mobile assessment |

---

## Key Files

### UI Components (21 files)
- `src/components/templates/platform/KBGeneration/index.tsx` — Main dashboard (155 lines)
- `src/components/templates/platform/KBGeneration/UploadModal.tsx` — File upload (170 lines)
- `src/components/templates/platform/KBGeneration/ReviewModal.tsx` — Article review
- `src/components/templates/platform/KBGeneration/jobCard/` — Job status cards (4 files)
- `src/components/templates/platform/KBGeneration/jobHistory/` — Job history (6 files)
- `src/components/templates/platform/KBGeneration/reconciliation/` — Article reconciliation (4 files)

### Database Layer
- `src/database/kb-generation/jobs.ts` — 5 DAL functions (151 lines)

### Cloud Functions
- `functions/src/logic/embedArticleWorker.ts` — Article embedding worker
- `functions/src/logic/regenerateEmbedding.ts` — Single article re-embedding
- Cloud Function triggers for job processing (Firestore onCreate/onUpdate)

### Types
- `src/types/knowledgeBase.ts` — IngestionJob, IngestionJobCategory, IngestionJobArticle, etc.

### Hooks
- `src/hooks/useIngestionJobsListener.ts` — Real-time job status listener

---

## Pipeline Flow

```
Upload Files → Create Job (pending)
  → Cloud Function processes files → generates categories/sections/articles and optional FAQs
  → Job status: processing → needs_review
  → Platform admin reviews generated content
  → Reconciliation: handle duplicate articles (replace/discard/keep_both)
  → Publish: articles written to kb_articles, FAQs written to canonica_faqs, embeddings generated
  → Job status: publishing → published
```

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 21 UI files, 5 DAL functions, 2 Cloud Functions |

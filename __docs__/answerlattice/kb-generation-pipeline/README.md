# KB Generation Pipeline — Feature Documentation

> **Status:** IMPLEMENTED — internal platform compatibility runtime
> **Last Updated:** 2026-07-18
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The KB Generation Pipeline is Answerlattice's internal platform article/FAQ import runtime. Platform administrators upload bounded source files, pasted text, or pasted URL text, and the system generates structured knowledge-base article drafts with optional FAQ suggestions. Generated content goes through review, reconciliation, embedding, and one atomic final publication transaction before articles, FAQs, navigation, and replacement cleanup become live.

## Successor Architecture Note

This folder documents the **current internal compatibility runtime**. The implemented owner-facing intake route is documented in [`../knowledge-intake-command-center/README.md`](../knowledge-intake-command-center/README.md).

The key distinction:

- **Current KB Generation Pipeline:** internal platform compatibility tool and persisted generation/publish runtime for bounded file-first imports.
- **Knowledge Intake Command Center:** canonical owner-facing intake route for selected public URLs, bounded files/media/text, review drafts, and governed publishing into existing Answerlattice knowledge surfaces.

Do not add owner onboarding scope to this upload modal. `/answerlattice/kb-generation` redirects to Knowledge Intake; the remaining `/platform/kb-generation` surface is internal.

Knowledge Intake has its own implemented publishing path. This legacy pipeline remains a separate compatibility runtime. Shared article, FAQ, retrieval, cache, and embedding contracts still need parity; do not create a second public retrieval system.

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

### UI Components
- `src/components/templates/platform/KBGeneration/index.tsx` — Main dashboard
- `src/components/templates/platform/KBGeneration/UploadModal.tsx` — File upload
- `src/components/templates/platform/KBGeneration/ReviewModal.tsx` — Article review
- `src/components/templates/platform/KBGeneration/jobCard/` — Job status cards (4 files)
- `src/components/templates/platform/KBGeneration/jobHistory/` — Job history (6 files)
- `src/components/templates/platform/KBGeneration/reconciliation/` — Article reconciliation (4 files)

### Database Layer
- `src/database/kb-generation/jobs.ts` — scoped job reads, review writes, retry/cancel, and recoverable deletion

### Cloud Functions
- `functions-answerlattice/src/logic/` — active dedicated generation, publish, embedding, task, and finalization runtime
- `functions/src/logic/` — shared emulator/legacy compatibility mirror
- `embeddingSourceBoundary.ts` — canonical embedding input and source hash
- `src/data/shared/answerlatticeEmbedding.ts` plus both Functions mirrors — version-locked model, field, dimensions, cache version, and provider request format
- `functions-answerlattice/src/answerlattice/kbGenerationWatchdog.ts` — bounded transaction-safe timeout recovery in the dedicated project
- `kbPublishingLifecycle.ts` — deterministic task dispatch and durable set-based finalization

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
  → Publish staging: articles and FAQs remain inactive; changed articles are embedded
  → Atomic finalization: activate articles/FAQs, switch navigation, delete approved replacements, bump freshness versions
  → Job status: publishing → published
```

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-18 | 1.6.0 | Reclaims only workspace-unreferenced source objects on explicit job deletion and makes final publication atomic across articles, generated FAQs, navigation, approved replacements, job state, and freshness invalidation. |
| 2026-07-17 | 1.5.0 | Kept the pre-launch corpus on one `gemini-embedding-2`/`embedding` contract, removing the temporary dual-vector migration, its scheduled scans, duplicate index, and possible duplicate provider/write cost. |
| 2026-07-13 | 1.4.0 | Introduced the Embedding 2 direction; its temporary dual-vector migration design was superseded before launch by the single canonical contract above. |
| 2026-07-12 | 1.3.0 | Aligned dedicated/shared publish and embedding lifecycle, strict durable sets, source-hash reuse, deterministic task identity, and recoverable cleanup docs to runtime truth. |
| 2026-05-31 | 1.2.0 | Clarified that Knowledge Intake must publish through existing KB/FAQ/search/cache/embedding runtime paths rather than a parallel intake runtime. |
| 2026-05-31 | 1.1.0 | Added successor architecture note pointing to Knowledge Intake Command Center docs |
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 21 UI files, 5 DAL functions, 2 Cloud Functions |

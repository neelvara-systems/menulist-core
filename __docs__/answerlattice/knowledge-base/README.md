# Knowledge Base — Feature Documentation

> **Status:** FEATURE 5 LOCAL SOURCE COMPLETE
> **Last Updated:** 2026-07-18
> **Parent Feature:** Help Center
> **Feature audit:** Feature 5 of 44

---

## What Is This

The Answerlattice Knowledge Base is a tenant/store-scoped article system and governed retrieval source. A bounded category document provides the browse/navigation read model; full article documents hold approved content, provenance, feedback counters, entity/surface links, and the active search vector. Authorized knowledge managers maintain it, while customer and support surfaces consume only applicable published content.

## Current invariants

- Article create, live update, delete, and bulk publish/archive atomically update the article document, navigation metadata, and cache/source/bundle invalidation markers.
- A live truth edit clears the old active vector and marks the article `pending` until the server re-embeds the current stored content.
- KB Generation review edits use `mode: 'generation_review'` and cannot mutate live navigation before approved publication.
- Article moves remove every prior navigation reference before inserting one authoritative target reference.
- Non-empty categories and sections cannot be deleted. The operator must move or delete their articles explicitly.
- Category and section title edits propagate denormalized article display titles in a bounded transaction.
- Article feedback is server-owned, idempotent, accepted only for active published content, permission-scoped for readers, and retained for 365 days.
- Platform sessions with a selected workspace read that workspace rather than silently mixing global tenant results.

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `knowledge-base_spec.md` | CEO/PM | Business requirements, content hierarchy |
| 3 | `knowledge-base_impl.md` | Developers | Technical blueprint, every file/function |
| 4 | `knowledge-base_firebase.md` | Developers/Ops | Firestore operations, cost estimates |
| 5 | `knowledge-base_marketing.md` | Sales/Marketing | Pitch points |
| 6 | `knowledge-base_website.md` | Public | Landing page content |
| 7 | `knowledge-base_helpdoc.md` | End users | Customer help article |
| 8 | `knowledge-base_mobile-support.md` | Mobile team | Mobile assessment |

---

## Key Files

### Owner-Side (KB Explorer)
- `src/components/organisms/KnowledgeBaseExplorer/index.tsx` — Main explorer (3-panel: sidebar + content + on-this-page)
- `src/components/organisms/KnowledgeBaseExplorer/Categories.tsx` — Category grid
- `src/components/organisms/KnowledgeBaseExplorer/Sections.tsx` — Section list within category
- `src/components/organisms/KnowledgeBaseExplorer/Articles.tsx` — Article list
- `src/components/organisms/KnowledgeBaseExplorer/HelpSidebar.tsx` — Navigation sidebar
- `src/components/organisms/KnowledgeBaseExplorer/OnThisPage.tsx` — Article section anchors
- `src/components/organisms/ArticleView/index.tsx` — Full article renderer
- `src/components/organisms/ArticleViewModal/index.tsx` — Article modal wrapper

### Platform Admin (KB Management)
- `src/components/templates/platform/knowledgeBase/index.tsx` — 3-pane CRUD management (369 lines)
- `src/components/templates/platform/knowledgeBase/CategoryPane.tsx` — Category list + management
- `src/components/templates/platform/knowledgeBase/SectionPane.tsx` — Section list + management
- `src/components/templates/platform/knowledgeBase/ArticlePane.tsx` — Article list + management
- `src/components/templates/platform/knowledgeBase/CategoryModal.tsx` — Add/edit category
- `src/components/templates/platform/knowledgeBase/SectionModal.tsx` — Add/edit section
- `src/components/templates/platform/knowledgeBase/ArticleModal.tsx` — Add/edit article (TipTap editor)
- `src/components/templates/platform/knowledgeBase/KnowledgeBaseModal.tsx` — KB preview modal
- `src/components/templates/platform/knowledgeBase/PaneHeader.tsx` — Pane header
- `src/components/templates/platform/knowledgeBase/PaneContent.tsx` — Pane content
- `src/components/templates/platform/knowledgeBase/CategoryCardPreview.tsx` — Category card
- `src/components/templates/platform/knowledgeBase/SectionCardPreview.tsx` — Section card

### Database Layer
- `src/database/knowledgeBase/articles.ts` — scoped article lifecycle and atomic navigation ownership
- `src/database/knowledgeBase/categories.ts` — scoped transactional category, section, and article-navigation mutations
- `src/lib/answerlattice/knowledgeBaseCategoryMutations.ts` — deterministic navigation validation and lost-update-safe map operations

### Types
- `src/types/knowledgeBase.ts` — All KB types (231 lines)

---

## Architecture: Single-Document Categories

**Critical design:** Each workspace stores categories in `kb_categories/categories_{tId}_{sId}` as a bounded nested map. Sections are arrays within categories. Article metadata references are arrays within sections/categories. Full article content lives in separate `kb_articles` documents.

This means:
- **1 read** loads the entire KB navigation structure
- Article lifecycle transactions keep navigation metadata synchronized with full article documents
- Category/section mutations apply to transaction-current state and enforce the 900 KiB navigation boundary
- Full articles are fetched individually on demand (lazy loading)

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-18 | 2.0.0 | Feature 5 audit: atomic article/navigation lifecycle, safe deletion, vector invalidation, title propagation, scoped feedback permissions, and feedback retention |
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 20 component files, 15 DAL functions |

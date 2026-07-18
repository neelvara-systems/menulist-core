# Knowledge Base — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-03-02
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The Knowledge Base (KB) is MenuList's **hierarchical documentation system** — a three-level content structure (Categories → Sections → Articles) that serves as the data source for the AI QnA Chatbot's RAG pipeline. It has two interfaces: an **owner-side explorer** for browsing and reading articles, and a **platform admin management panel** for full CRUD operations on categories, sections, and articles with TipTap rich text editing.

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
- `src/database/knowledgeBase/articles.ts` — 9 DAL functions (183 lines)
- `src/database/knowledgeBase/categories.ts` — scoped transactional category, section, and article-navigation mutations
- `src/lib/answerlattice/knowledgeBaseCategoryMutations.ts` — deterministic navigation validation and lost-update-safe map operations

### Types
- `src/types/knowledgeBase.ts` — All KB types (231 lines)

---

## Architecture: Single-Document Categories

**Critical design:** All categories are stored in a **single Firestore document** (`kb_categories/categories`) as a nested map. Sections are arrays within categories. Article metadata references are arrays within sections/categories. Full article content lives in separate `kb_articles` documents.

This means:
- **1 read** loads the entire KB navigation structure
- Categories, sections, and article metadata are always in sync
- Category/section mutations are field-path updates on a single document
- Full articles are fetched individually on demand (lazy loading)

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 20 component files, 15 DAL functions |

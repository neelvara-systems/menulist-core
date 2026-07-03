# Knowledge Base — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-06-30
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Knowledge Base is a **client-side DAL feature** with no dedicated API routes (embedding generation uses the shared `/api/helpCenter/article-embedding` route). All CRUD operations use Firestore client SDK via standard DAL pattern.

**Key architectural decision:** All categories stored in a **single Firestore document** (`kb_categories/categories`). Articles stored separately in `kb_articles` collection with embeddings.

---

## 2. Complete File Map

### 2.1 Owner-Side Components (KB Explorer)

**Root:** `src/components/organisms/KnowledgeBaseExplorer/`

| File | Lines | Purpose |
|------|:-----:|---------|
| `index.tsx` | 143 | Main explorer — Fetches categories (with context caching), manages selection state (category → section → article), renders 3-column layout (sidebar 25% + content flex + on-this-page 20.83%). Uses articles embedded in category/section structure (no separate fetch). Responsive: sidebar/on-this-page hidden below `lg` breakpoint. Supports `from="modal"` prop for different positioning. |
| `Categories.tsx` | — | Category grid display |
| `Sections.tsx` | — | Section list within selected category |
| `Articles.tsx` | — | Article metadata list within section/category |
| `HelpSidebar.tsx` | — | Full KB tree navigation sidebar |
| `OnThisPage.tsx` | — | Article section anchors for long articles |

**Article Display:**
- `src/components/organisms/ArticleView/index.tsx` — Full article content renderer (TipTap JSON → HTML)
- `src/components/organisms/ArticleViewModal/index.tsx` — Modal wrapper for article view

### 2.2 Platform Admin Components (KB Management)

**Root:** `src/components/templates/platform/knowledgeBase/`

| File | Lines | Purpose |
|------|:-----:|---------|
| `index.tsx` | 369 | Main management panel — 3-pane `Splitter` layout (33% each, min 300px). Manages: categoriesData, selectedCategory/Section/Article, all CRUD modals. Delete cascade: category→sections+articles, section→articles. Floating action buttons for KB preview + AI search test. Sorts categories/sections by index. Fetches full article by ID on select (lazy loading). |
| `CategoryPane.tsx` | — | Category list with add/edit/delete actions |
| `SectionPane.tsx` | — | Section list with add/edit/delete actions |
| `ArticlePane.tsx` | — | Article list with add/edit/delete actions, loading state |
| `CategoryModal.tsx` | — | Add/edit category form |
| `SectionModal.tsx` | — | Add/edit section form |
| `ArticleModal.tsx` | — | Full article editor with TipTap, category/section assignment |
| `KnowledgeBaseModal.tsx` | — | Full KB preview in modal (reuses KnowledgeBaseExplorer with `from="modal"`) |
| `PaneHeader.tsx` | — | Reusable pane header (title + action buttons) |
| `PaneContent.tsx` | — | Reusable pane content wrapper |
| `CategoryCardPreview.tsx` | — | Category preview card for pane list |
| `SectionCardPreview.tsx` | — | Section preview card for pane list |

`ArticleModal.tsx` keeps FAQ suggestion refresh and article embedding failures on fixed owner-safe copy. It does not show raw `/api/answerlattice/faqs/generate-from-article` or `/api/helpCenter/article-embedding` response text, provider text, or browser exception messages when those support actions fail. It sends both support-action POSTs with no-store cache, same-origin credentials, and manual redirect handling, then parses both route responses through a 64 KB bounded response reader and requires the expected FAQ suggestion or embedding acknowledgement shape before updating local FAQ options, linked FAQ IDs, or embedding success copy. Article update/delete FAQ maintenance remains fire-and-forget, but failures now log `answerlattice_article_faq_review_marker_failed` or `answerlattice_article_faq_archive_failed` with bounded tenant/store/article metadata only. The FAQ DAL also logs `answerlattice_faq_article_review_scope_resolve_failed` or `answerlattice_faq_article_archive_scope_resolve_failed` if a legacy maintenance caller omits article scope and session fallback cannot resolve tenant/store.

Article create/update/delete and bulk publish/archive UI paths must require `assertKnowledgeBaseArticleWriteSucceeded()`, `assertKnowledgeBaseArticleDeleteSucceeded()`, or `assertKnowledgeBaseArticleBulkStatusUpdateSucceeded()` before local article, category, selection, or ingestion-job state advances. Category, section, article-parent, and category-delete navigation writes must require `assertKnowledgeBaseCategoryWriteSucceeded()` or `assertKnowledgeBaseCategoriesMutationSucceeded()` before local category/section/navigation state advances. Rejected acknowledgements use `platform_kb_article_create_rejected`, `platform_kb_article_update_rejected`, `platform_kb_article_delete_rejected`, `platform_kb_section_article_delete_rejected`, `platform_kb_category_article_delete_rejected`, `platform_kb_bulk_article_status_update_rejected`, `platform_kb_category_create_rejected`, `platform_kb_category_update_rejected`, `platform_kb_section_create_rejected`, `platform_kb_section_update_rejected`, `platform_kb_article_parent_update_rejected`, `platform_kb_article_parent_delete_rejected`, `platform_kb_section_delete_category_update_rejected`, `platform_kb_category_delete_rejected`, `kb_generation_review_article_update_rejected`, or `kb_generation_reconciliation_article_delete_rejected`.

When Answerlattice product surfaces are enabled, KB article create/update and approved KB-generation publish paths must await `rebuildProductSurfaceContentSummaryWithDiagnostics()` after the confirmed write. Refresh failures log `answerlattice_article_summary_refresh_after_create_failed`, `answerlattice_article_summary_refresh_after_update_failed`, or `answerlattice_kb_generation_summary_refresh_after_publish_failed` with bounded article/job metadata and show fixed contextual-help refresh warning copy. The primary article/job write remains successful; embedding failures are also caught inside `ArticleModal.tsx` so a post-write embedding failure cannot be reported as a failed article save.

### 2.3 Database Layer

**Articles DAL:** `src/database/knowledgeBase/articles.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getArticles()` | All | 0 | Fetches entire collection — **NO tenant filter** |
| `addArticle(data)` | 0 | 1 | Uses `requestBodyComposer` |
| `updateArticle(data)` | 0 | 1 | Merge update, returns acknowledged article |
| `deleteArticle(id)` | 0 | 1 | Hard delete, returns `{ success: true, id }` |
| `bulkUpdateArticleStatus(ids, status)` | 0 | N | Batch publish/archive, returns `{ success: true, ids, updatedCount, status }` |
| `deleteMultipleArticles(ids)` | 0 | N | Batch delete via `writeBatch` |
| `getArticlesByCategoryId(categoryId)` | N | 0 | Query by categoryId |
| `getArticlesBySectionId(sectionId)` | N | 0 | Query by sectionId |
| `getArticlesByIds(ids)` | N | 0 | `__name__ in ids` query |
| `getArticleById(id)` | 1 | 0 | Single doc get |
| `updateArticleFeedback(articleId, type, increment)` | 1 | 1 | Read-then-write (NOT atomic) |

**Categories DAL:** `src/database/knowledgeBase/categories.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getCategories()` | 1 | 0 | Reads scoped doc `categories_{tId}_{sId}` with platform legacy fallback |
| `deleteCategory(data)` | 0 | 1 | Overwrites categories map, returns acknowledged categories mutation |
| `addCategory(category)` | 0 | 1 | `setDoc` merge at `categories.{id}`, returns acknowledged category |
| `updateCategory(category)` | 0 | 1 | `setDoc` merge at `categories.{id}`, returns acknowledged category |
| `updateArticleInParent(categoriesData, categoryId, article, sectionId)` | 0 | 1 | Updates article metadata in parent section/category, returns acknowledged categories mutation |
| `deleteArticleFromParent(categoriesData, categoryId, articleId, sectionId)` | 0 | 1 | Removes article metadata from parent, returns acknowledged categories mutation |

**Key implementation details:**
- `getDocRef()` resolves the scoped categories document ID from the active Answerlattice tenant/store session.
- Category mutations use `setDoc(..., { merge: true })` for field-path-like map updates on the scoped categories doc.
- `_updateSectionArticles()` is a private helper that updates a section's articles array
- `updateList()` utility handles add-or-update logic for article metadata arrays

### 2.4 Types

**File:** `src/types/knowledgeBase.ts` (231 lines)

**Interfaces:**
- `KnowledgeBaseArticleType` — Full article with embedding, content, metadata, sources, feedback
- `KnowledgeBaseCategory` — Category with sections[], articles[], icon, url, active, index
- `KnowledgeBaseSection` — Section with articles[], url, active, index
- `KnowledgeBaseArticleMeta` — Lightweight article reference (id, title, active, index, url)
- `KbCategoriesMap` — `Record<string, KnowledgeBaseCategory>`
- `KnowledgeBaseCategoriesType` — `{ categories: KbCategoriesMap }`
- `KnowledgeBaseArticleSource` — Source provenance (type, url, name, page)
- `KnowledgeBaseArticleEmbeddingPayload` — Embedding generation payload

**Constants:**
- `ARTICLE_STATUS` — 4 states: draft, needs_review, published, archived
- `ARTICLE_RECONCILIATION_STATUS` — 4 states: unresolved, replace, discard, keep_both
- `FILE_TYPE` — 9 file types: pdf, image, video, audio, document, website, youtube, google_drive, copied_text

---

## 3. Data Flow

### 3.1 Owner Browsing KB
```
KnowledgeBaseExplorer mount
  → Check PlatformGlobalDataContext.cachedKBCategories
  → [Cached] Use cached categories
  → [Not cached] getCategories() → 1 Firestore read (single doc)
  → Cache in context for future use
  → Render category grid
  → Owner clicks category → setSelectedCategory → show sections
  → Owner clicks section → setSelectedKnowledgeBaseSection → show article list
  → Articles come from embedded metadata in category/section (NO separate fetch)
  → Owner clicks article → ArticleView renders TipTap JSON content
```

### 3.2 Platform Admin CRUD
```
PlatformKnowledgeBase mount
  → getCategories() → 1 Firestore read
  → Render 3-pane splitter

Add Category:
  → CategoryModal form → addCategory(category) → setDoc merge
  → assertKnowledgeBaseCategoryWriteSucceeded()
  → setCategoriesData with updated categories

Edit Article:
  → ArticlePane → handleArticleSelect → getArticleById(id) → 1 read
  → ArticleModal with TipTap editor → form submit
  → updateArticle(data) → 1 write to kb_articles
  → assertKnowledgeBaseArticleWriteSucceeded()
  → updateArticleInParent() → 1 write to kb_categories (metadata sync)
  → assertKnowledgeBaseCategoriesMutationSucceeded()

Delete Category:
  → Modal.confirm → getArticlesByCategoryId(id) → N reads
  → Promise.all(deleteArticle per article) → N writes
  → deleteCategory(newCategoriesData) → 1 write
  → assertKnowledgeBaseCategoriesMutationSucceeded()
  → Update local state
```

### 3.3 Embedding Generation
```
Article saved/published
  → POST /api/helpCenter/article-embedding
  → Extract plain text from TipTap JSON
  → Build embedding input: "Category: {cat}\nSection: {sec}\nTitle: {title}\nContent: {text}"
  → callGeminiEmbedding() → text-embedding-004 → 768-dim vector
  → firestoreAdmin.collection(KB_ARTICLES).doc(articleId).update({ embedding: vector })
```

---

## 4. Single-Document Categories Pattern

### Why This Pattern
- **1 read** loads entire KB navigation (all categories, sections, article metadata)
- No N+1 queries for navigation rendering
- Field-path updates for mutations (no full document rewrite)
- Categories are relatively small (metadata only, no article content)

### Risks
- Single document has 1MB Firestore limit
- Each category with sections and article metadata is ~500 bytes-2KB
- **Capacity:** ~500-1000 categories before hitting limits (far more than needed)

### Data Shape
```json
{
  "categories": {
    "cat-uuid-1": {
      "id": "cat-uuid-1",
      "title": "Getting Started",
      "description": "...",
      "icon": "rocket",
      "url": "getting-started",
      "active": true,
      "index": 0,
      "sections": [
        {
          "id": "sec-uuid-1",
          "title": "First Steps",
          "description": "...",
          "url": "first-steps",
          "active": true,
          "index": 0,
          "articles": [
            { "id": "art-uuid-1", "title": "Upload Menu", "active": true, "index": 0, "url": "upload-menu" }
          ]
        }
      ],
      "articles": []
    }
  }
}
```

---

## 5. Dependencies

| Dependency | Usage |
|-----------|-------|
| `@database/knowledgeBase/articles` | Article CRUD |
| `@database/knowledgeBase/categories` | Category/section CRUD |
| `@lib/firebase/firebaseClient` | Firestore client |
| `@lib/apiHelper` | `requestBodyComposer` |
| `@lib/apiHelper/apiCallComposer` | Standard DAL wrapper |
| `@providers/platformProviders/platformGlobalDataProvider` | KB categories cache |
| `@hook/useAppDispatch` | Redux loader |
| `@reduxSlices/loader` | `startLoader/stopLoader` |
| `@util/utils` | `updateList()` |
| TipTap Editor Suite | Article content editing (v2.11.0) |
| `antd Splitter` | 3-pane layout in platform admin |

---

## 6. Identified Issues

| # | Issue | Severity | File:Line | Notes |
|---|-------|----------|-----------|-------|
| 1 | `getArticles()` fetches ALL articles — no pagination, no tenant filter | Medium | `articles.ts:19` | Only used in platform admin |
| 2 | `updateArticleFeedback` is read-then-write (not transaction) | Low | `articles.ts:154` | Could drift under concurrent writes |
| 3 | No explicit auth check in KB DAL functions | Medium | All DAL | Relies on component-level access control |
| 4 | `console.log("knowledge base categories", categoriesResult)` in platform | Low | `platform/knowledgeBase/index.tsx:48` | Debug log in production code |
| 5 | KB articles have no tenant scoping | By Design | All DAL | Platform-wide KB — intentional |
| 6 | Categories doc could hit 1MB with very large KB | Very Low | `categories.ts` | Current scale is far below limit |

---

## 7. Reverse Engineering Validation

### 7.1 File Coverage

| Category | Count | Verified |
|----------|:-----:|:--------:|
| Owner explorer components | 8 | ✅ |
| Platform admin components | 12 | ✅ |
| DAL files | 2 (15 functions) | ✅ |
| Types | 1 | ✅ |
| **Total** | **23 files** | **✅ 100%** |

### 7.2 DAL Function Usage

| Function | Used By | Verified |
|----------|---------|:--------:|
| `getCategories` | KnowledgeBaseExplorer, PlatformKnowledgeBase, useChatData | ✅ |
| `addArticle` | ArticleModal | ✅ |
| `updateArticle` | ArticleModal | ✅ |
| `deleteArticle` | PlatformKnowledgeBase (cascade delete) | ✅ |
| `deleteMultipleArticles` | Not directly used from UI | ⚠️ Available |
| `getArticlesByCategoryId` | PlatformKnowledgeBase (cascade delete) | ✅ |
| `getArticlesBySectionId` | PlatformKnowledgeBase (cascade delete) | ✅ |
| `getArticlesByIds` | Not directly used from UI | ⚠️ Available |
| `getArticleById` | PlatformKnowledgeBase (article select) | ✅ |
| `updateArticleFeedback` | ArticleView (likes/dislikes) | ✅ |
| `addCategory` | CategoryModal | ✅ |
| `updateCategory` | CategoryModal, PlatformKnowledgeBase (section delete) | ✅ |
| `deleteCategory` | PlatformKnowledgeBase | ✅ |
| `updateArticleInParent` | PlatformKnowledgeBase (article save) | ✅ |
| `deleteArticleFromParent` | PlatformKnowledgeBase (article delete) | ✅ |

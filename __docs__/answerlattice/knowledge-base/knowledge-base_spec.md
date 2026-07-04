# Knowledge Base — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Provide a hierarchical documentation system where platform administrators create and manage help articles that serve as the data source for the AI QnA Chatbot, and SMB owners browse and read articles for self-service support.

### Scope

- Three-level content hierarchy: Categories → Sections → Articles
- Owner-side KB explorer with navigation, breadcrumbs, and article reading
- Platform admin 3-pane CRUD management (categories, sections, articles)
- TipTap rich text editor for article content (JSON format)
- Vector embeddings stored on each article for semantic search
- Article status lifecycle (draft → needs_review → published → archived)
- Article likes/dislikes feedback
- Source provenance tracking (which file generated the article)
- Integration with AI QnA Chatbot (articles are the RAG data source)

### Out of Scope

- Cross-tenant shared KB; workspace KB articles and categories are tenant/store scoped, with platform-admin administrative access only
- Article versioning / revision history
- Article commenting / discussion threads
- Multi-language articles
- Article scheduling (publish at future date)
- Cross-tenant article visibility; published articles are visible only through the scoped workspace/public content path unless opened by a platform admin

---

## 2. Content Hierarchy

```
Knowledge Base
  └── Category (e.g., "Getting Started", "Menu Management")
       ├── icon, title, description, url, active, index
       ├── Section (e.g., "Upload Your Menu", "Edit Items")
       │    ├── title, description, url, active, index
       │    └── Articles[] (metadata references)
       └── Articles[] (direct category articles, no section)
```

### Category Fields

| Field       | Type          | Required | Description                  |
| ----------- | ------------- | :------: | ---------------------------- |
| id          | string        |    ✅    | Unique identifier            |
| title       | string        |    ✅    | Category name                |
| description | string        |    ✅    | Short description            |
| icon        | string        |    ✅    | Icon identifier              |
| url         | string        |    ✅    | URL-friendly slug            |
| active      | boolean       |    ✅    | Visibility toggle            |
| index       | number        |    ✅    | Sort order                   |
| sections    | Section[]     |    ❌    | Child sections               |
| articles    | ArticleMeta[] |    ❌    | Direct articles (no section) |

### Section Fields

| Field       | Type          | Required | Description       |
| ----------- | ------------- | :------: | ----------------- |
| id          | string        |    ✅    | Unique identifier |
| title       | string        |    ✅    | Section name      |
| description | string        |    ✅    | Short description |
| url         | string        |    ✅    | URL-friendly slug |
| active      | boolean       |    ✅    | Visibility toggle |
| index       | number        |    ✅    | Sort order        |
| articles    | ArticleMeta[] |    ❌    | Child articles    |

### Article Metadata (stored in parent)

| Field  | Type    | Description                  |
| ------ | ------- | ---------------------------- |
| id     | string  | References `kb_articles` doc |
| title  | string  | Article title                |
| active | boolean | Visibility                   |
| index  | number  | Sort order                   |
| url    | string  | URL-friendly slug            |

---

## 3. Article Full Document

Stored in `kb_articles` collection (separate from categories):

| Field           | Type             | Description                                  |
| --------------- | ---------------- | -------------------------------------------- |
| id              | string           | Firestore auto-ID                            |
| title           | string           | Article title                                |
| content         | any (JSON)       | TipTap editor content                        |
| embedding       | Vector (768-dim) | Semantic search vector                       |
| categoryId      | string           | Parent category                              |
| sectionId       | string           | Parent section (optional)                    |
| categoryTitle   | string           | Denormalized for search context              |
| sectionTitle    | string           | Denormalized for search context              |
| url             | string           | URL-friendly slug                            |
| active          | boolean          | Visibility toggle                            |
| index           | number           | Sort order                                   |
| status          | string           | draft / needs_review / published / archived  |
| jobId           | string           | Which ingestion job created this article     |
| sources         | Source[]         | Provenance (file type, URL, name, page)      |
| tags            | string[]         | Content tags                                 |
| likes           | number           | Positive feedback count                      |
| dislikes        | number           | Negative feedback count                      |
| similarityScore | number           | Set during vector search (0-1, runtime only) |

---

## 4. Article Status Lifecycle

```
draft → needs_review → published → archived
```

| Status           | Meaning                                  | Visible to Owners |
| ---------------- | ---------------------------------------- | :---------------: |
| **draft**        | Initial creation, being written          |        ❌         |
| **needs_review** | Generated by AI, awaiting human review   |        ❌         |
| **published**    | Approved, live in KB and searchable      |        ✅         |
| **archived**     | Retired, no longer visible or searchable |        ❌         |

**Only published articles** appear in vector search results (`where('status', '==', 'published')`).

---

## 5. User Roles

### 5.1 SMB Owner (KB Reader)

**Access:** `/help-center` → "Knowledge Base" tab
**Can do:**

- Browse categories in grid layout
- Navigate category → section → articles hierarchy
- Read full article content
- Use sidebar navigation (on large screens)
- Use "On This Page" section anchors
- Like/dislike articles

### 5.2 Platform Administrator (KB Manager)

**Access:** Platform navigation → Knowledge Base
**Can do:**

- Full CRUD on categories (add, edit, delete with confirmation)
- Full CRUD on sections within categories
- Full CRUD on articles with TipTap rich text editor
- View article in preview mode
- Delete cascading (category delete removes all child sections + articles)
- Section delete removes all child articles
- Trigger article embedding regeneration
- Preview full KB in modal
- Open AI search modal to test KB search

---

## 6. Owner-Side Explorer Architecture

### Layout (3-column on large screens)

```
┌─────────────┬──────────────────────┬──────────────┐
│  Help        │   Content            │  On This     │
│  Sidebar     │   (categories/       │  Page        │
│  (25%)       │    sections/articles)│  (20.83%)    │
│              │                      │              │
└─────────────┴──────────────────────┴──────────────┘
```

- **Help Sidebar:** Category tree navigation, collapsible sections, article links
- **Content:** Category grid → Section list → Article content (progressive drill-down)
- **On This Page:** Article section anchors for long articles
- **Breadcrumb:** "Help Center > Category > Section" navigation
- **Responsive:** Sidebar and On This Page hidden on smaller screens (`screens.lg` breakpoint)

### Caching

Categories cached via `PlatformGlobalDataContext.cachedKBCategories` — prevents re-fetch on every KB tab open.

---

## 7. Platform Admin Architecture

### Layout (3-pane Splitter)

```
┌────────────┬────────────┬────────────┐
│ Categories │  Sections  │  Articles  │
│  (33%)     │   (33%)    │   (33%)    │
│            │            │            │
│  List +    │  List +    │  List +    │
│  Add/Edit  │  Add/Edit  │  Full      │
│  Delete    │  Delete    │  Editor    │
└────────────┴────────────┴────────────┘
```

- Uses Ant Design `Splitter` component for resizable panes
- Each pane has `PaneHeader` + `PaneContent` components
- Category select → loads sections. Section select → loads article list
- Article select → fetches full article by ID → opens `ArticleModal` with TipTap editor
- Floating action buttons: Preview KB modal + AI search test

### Delete Cascade Logic

- **Delete article:** Delete from `kb_articles` + remove metadata from parent category/section
- **Delete section:** Delete all child articles from `kb_articles` + remove section from category
- **Delete category:** Delete all child articles from `kb_articles` + remove category from categories doc

All deletes wrapped in `Modal.confirm` for safety.

---

## 8. Article Feedback

### Likes/Dislikes

- Stored directly on article document (`likes`, `dislikes` counters)
- `updateArticleFeedback(articleId, type, increment)` — uses `runTransaction` (atomic)
- Increment: `likes += 1` or `dislikes += 1`
- Decrement: `Math.max(0, likes - 1)` (prevents negative)

**Note:** Uses Firestore transaction — concurrent writes are safe.

---

## 9. Embedding Integration

Each article has an `embedding` field (768-dimension vector from `text-embedding-004`).

**Embedding input format:**

```
Category: {categoryTitle}
Section: {sectionTitle}
Title: {articleTitle}
Content: {plainTextFromTipTapJSON}
```

**When embeddings are generated:**

1. On article creation/publish via KB Generation Pipeline
2. On manual trigger via `/api/helpCenter/article-embedding` route
3. On category/section title change via Cloud Function `embedArticleWorker`
4. On manual re-embed via Cloud Function `regenerateEmbedding`

---

## 10. Data Isolation

| Aspect             | Implementation                                          |
| ------------------ | ------------------------------------------------------- |
| **KB Articles**    | Tenant+store scoped for non-platform callers; platform admins can perform global administrative reads |
| **KB Categories**  | Tenant+store scoped document (`categories_{tId}_{sId}`), with platform-only legacy fallback |
| **Article reads**  | Firestore rules and DAL helpers require readable tenant/store scope unless caller is platform admin |
| **Article writes** | Platform admin only (no explicit auth check in DAL)     |
| **Vector search**  | Tenant/store-aware through Answerlattice retrieval scope |

**Critical:** KB content is Answerlattice-scoped. Non-platform reads must stay tenant/store filtered; platform admin global reads are operational/admin-only.

---

## 11. Risks & Open Questions

| #   | Item                                                                         | Status                                                |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | No tenant scoping on KB articles                                             | ✅ RESOLVED — non-platform reads are tenant/store scoped |
| 2   | Non-atomic article feedback (likes/dislikes)                                 | ✅ RESOLVED — actually uses `runTransaction` (atomic) |
| 3   | Deprecated `getArticles()` compatibility helper could read globally          | ✅ RESOLVED — deprecated helper now scopes non-platform reads |
| 4   | Single categories document could hit 1MB limit with many categories/sections | Low risk — typical KB has <50 categories              |
| 5   | No article revision history                                                  | Not implemented                                       |
| 6   | `console.log` in platform KB component                                       | ✅ RESOLVED — removed in audit                        |
| 7   | No explicit `withAuth()` on KB DAL functions                                 | Relies on component-level access control              |

---

## 12. STEP 9C Audit (2026-03-03)

### Bugs Fixed

- Removed `console.log` from `platform/knowledgeBase/index.tsx`
- Removed `console.error` from `KnowledgeBaseExplorer/Articles.tsx`
- Removed 3x `console.log/error` from `article-embedding/route.ts`
- Fixed doc inaccuracy: `updateArticleFeedback` IS atomic (`runTransaction`)

### Improvements Implemented

1. ✅ **Article search:** Search input in ArticlePane header, client-side title filtering
2. ✅ **Bulk status changes:** Select mode with checkboxes + Publish/Archive bulk actions via `bulkUpdateArticleStatus` DAL
3. ✅ **Content freshness indicators:** Stale warning icon (clock) on articles not reviewed in 90+ days

### Skipped

- Article revision history — skipped per user decision (overhead of storing full history)

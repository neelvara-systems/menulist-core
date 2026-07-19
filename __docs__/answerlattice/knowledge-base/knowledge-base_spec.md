# Knowledge Base — Product Specification

> **Version:** 2.0.0
> **Last Updated:** 2026-07-18
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Provide a tenant/store-scoped support article system where authorized SaaS knowledge managers maintain published guidance used by browsing, retrieval, FAQ, product-context, and support-feedback workflows.

### Scope

- Three-level content hierarchy: Categories → Sections → Articles
- Owner-side KB explorer with navigation, breadcrumbs, and article reading
- Authorized knowledge-manager 3-pane CRUD management (categories, sections, articles)
- TipTap rich text editor for article content (JSON format)
- Vector embeddings stored on each article for semantic search
- Article status lifecycle (draft → needs_review → published → archived)
- Server-owned article likes/dislikes feedback with bounded audit history and retention
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
| embedding       | Vector (768-dim) | Canonical `gemini-embedding-2` search vector |
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
- Delete an empty category or section; non-empty containers require explicit article move/delete first
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

### Safe Delete Logic

- **Delete article:** One exact-scope transaction archives linked active FAQs, removes all navigation references, deletes the article, and advances freshness markers.
- **Delete section:** Allowed only when no article metadata remains in the section and the scoped article query is empty.
- **Delete category:** Allowed only when no direct or section article metadata remains and the scoped article query is empty.

All deletes wrapped in `Modal.confirm` for safety.

---

## 8. Article Feedback

### Likes/Dislikes

- Counters remain on the article document, but mutations go through `/api/answerlattice/content-feedback`.
- The server transaction updates the counter, bounded idempotency state, audit row, and negative-feedback signal together.
- Feedback is accepted only for active published articles in the authenticated workspace.
- Audit rows carry a 365-day expiry and the existing nightly scheduler deletes expired nested feedback documents in bounded tenant-scoped batches.
- Increment: `likes += 1` or `dislikes += 1`
- Decrement: `Math.max(0, likes - 1)` (prevents negative)

**Note:** Uses Firestore transaction — concurrent writes are safe.

---

## 9. Embedding Integration

Each searchable article has one canonical `embedding` field: a 768-dimension vector from `gemini-embedding-2`. Query vectors and document vectors must always use the same registry version, formatting, dimensions, and field.

**Canonical source input:**

```
Category: {categoryTitle}
Section: {sectionTitle}
Title: {articleTitle}
Content: {plainTextFromTipTapJSON}
```

The normalized source is hashed for reuse. The provider request uses the Embedding 2 retrieval format: documents are sent as `title: {title} | text: {canonicalSource}` and queries as `task: question answering | query: {query}`. Requests do not send the retired `taskType` option.

**When embeddings are generated:**

1. On article creation/publish via KB Generation Pipeline
2. On manual trigger via `/api/helpCenter/article-embedding` route
3. After a manual article truth edit clears the old vector and returns `embeddingStatus` to `pending`
4. On manual re-embed through the existing embedding route/worker

Because Answerlattice has not launched with a legacy embedding corpus, article create/update paths write only this canonical vector. No dual-write, migration scheduler, migration-state document, or second vector index is part of the runtime.

---

## 10. Data Isolation

| Aspect             | Implementation                                          |
| ------------------ | ------------------------------------------------------- |
| **KB Articles**    | Tenant+store scoped for non-platform callers; platform admins can perform global administrative reads |
| **KB Categories**  | Tenant+store scoped document (`categories_{tId}_{sId}`), with platform-only legacy fallback |
| **Article reads**  | Firestore rules and DAL helpers require readable tenant/store scope unless caller is platform admin |
| **Article writes** | `canManageKnowledge` permission or platform administration, enforced by Firestore rules and exact workspace scope |
| **Vector search**  | Tenant/store-aware through Answerlattice retrieval scope |

**Critical:** KB content is Answerlattice-scoped. Non-platform reads must stay tenant/store filtered; platform admin global reads are operational/admin-only.

---

## 11. Risks & Open Questions

| #   | Item                                                                         | Status                                                |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | No tenant scoping on KB articles                                             | ✅ RESOLVED — non-platform reads are tenant/store scoped |
| 2   | Split or unaudited article feedback                                           | ✅ RESOLVED — one authenticated server transaction owns counter, audit, idempotency, signal, and retention |
| 3   | Deprecated `getArticles()` compatibility helper could read globally          | ✅ RESOLVED — deprecated helper now scopes non-platform reads |
| 4   | Single categories document could hit 1MB limit with many categories/sections | ✅ BOUNDED — maximum 500 categories and 900 KiB serialized navigation |
| 5   | No article revision history                                                  | Not implemented                                       |
| 6   | `console.log` in platform KB component                                       | ✅ RESOLVED — removed in audit                        |
| 7   | Client DAL requires authoritative authorization                              | ✅ Firestore rules require scoped `canManageKnowledge`; server routes separately authenticate and validate scope |

---

## 12. STEP 9C Audit (2026-03-03)

### Bugs Fixed

- Removed `console.log` from `platform/knowledgeBase/index.tsx`
- Removed `console.error` from `KnowledgeBaseExplorer/Articles.tsx`
- Removed 3x `console.log/error` from `article-embedding/route.ts`
- Historical note: the retired direct `updateArticleFeedback` path was transactional, but Feature 5 superseded it with the authenticated server-owned content-feedback transaction.

### Improvements Implemented

1. ✅ **Article search:** Search input in ArticlePane header, client-side title filtering
2. ✅ **Bulk status changes:** Select mode with checkboxes + Publish/Archive bulk actions via `bulkUpdateArticleStatus` DAL
3. ✅ **Content freshness indicators:** Stale warning icon (clock) on articles not reviewed in 90+ days

### Skipped

- Article revision history — skipped per user decision (overhead of storing full history)

---

## 13. Feature 5 lifecycle contract (2026-07-18)

```text
authorized manager
-> scoped categories document
-> article create/edit/move/status/delete transaction
-> article document + one navigation reference + FAQ transition where applicable
-> cache/source/bundle invalidation in the same commit
-> current-vector generation or explicit pending state
-> published browsing/retrieval
-> authenticated feedback transaction
-> bounded review evidence and 365-day retention cleanup
```

Live article mutations accept only editable article fields. `categoryTitle` and `sectionTitle` are derived from transaction-current navigation; callers cannot declare them as truth. KB Generation review uses an explicit staging mode so review edits cannot update live navigation before publish.

Platform sessions with selected `tId/sId` use those filters. Global platform reads remain available only when no workspace is selected.

The Deprecated `getArticles()` compatibility helper could read globally in older revisions; current non-platform and selected-platform reads are scoped. Answerlattice KB session lookup diagnostics use `answerlattice_kb_articles_session_lookup_failed` and `answerlattice_kb_categories_session_lookup_failed` rather than silent fallback.

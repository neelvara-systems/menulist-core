# Knowledge Base — Firebase Cost & Operations Tracking

> **Version:** 1.3.0
> **Last Updated:** 2026-07-17
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections

### 1.1 kb_articles

| Property                    | Value                                              |
| --------------------------- | -------------------------------------------------- |
| **Collection**              | `kb_articles`                                      |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.KB_ARTICLES`                       |
| **Doc ID**                  | Auto-generated                                     |
| **Scoping**                 | `tId + sId` for current Answerlattice workspaces; legacy global data only via filtered fallback |
| **Avg Doc Size**            | 5-50 KB (content plus one 768-dimension vector)       |
| **Growth Rate**             | Slow (manual creation + AI generation)             |
| **Vector Index**            | Canonical `embedding`, 768 dimensions, COSINE        |

### 1.2 kb_categories

| Property                    | Value                                                       |
| --------------------------- | ----------------------------------------------------------- |
| **Collection**              | `kb_categories`                                             |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.KB_CATEGORIES`                              |
| **Doc ID**                  | `categories_{tId}_{sId}` with legacy `categories` fallback  |
| **Scoping**                 | `tId + sId` document per workspace                          |
| **Avg Doc Size**            | 10-100 KB (grows with categories/sections/article metadata) |
| **Growth Rate**             | Very slow                                                   |

---

## 2. Operations Per Action

### 2.1 Owner: Browse KB

| Step                                    | Reads | Writes | Notes                          |
| --------------------------------------- | :---: | :----: | ------------------------------ |
| Load categories (first time)            |   1   |   0    | Scoped doc read; legacy fallback can add 1 read |
| Load categories (cached)                |   0   |   0    | From shared `useKBCategoriesCache()` |
| Browse categories → sections → articles |   0   |   0    | All from cached categories doc |
| **Total (first load)**                  | **1** | **0**  |                                |
| **Total (cached)**                      | **0** | **0**  |                                |

### 2.2 Owner: Read Full Article (via ArticleView)

| Step                                          |  Reads  | Writes | Notes                      |
| --------------------------------------------- | :-----: | :----: | -------------------------- |
| Article content already in message references |    0    |   0    | Passed from search results |
| OR: ArticleViewModal fetch by ID              |    1    |   0    | `getArticleById()`         |
| **Total**                                     | **0-1** | **0**  |                            |

### 2.3 Owner: Article Feedback (Like/Dislike)

| Step                  | Reads | Writes | Notes                       |
| --------------------- | :---: | :----: | --------------------------- |
| Read current article  |   1   |   0    | Get current likes/dislikes  |
| Update feedback count |   0   |   1    | Merge update                |
| **Total**             | **1** | **1**  | Atomic via `runTransaction` |

### 2.4 Admin: Load KB Management

| Step             | Reads | Writes | Notes      |
| ---------------- | :---: | :----: | ---------- |
| Fetch categories |   1   |   0    | Single doc |
| **Total**        | **1** | **0**  |            |

### 2.5 Admin: Select Article (Full Content)

| Step                 | Reads | Writes | Notes                  |
| -------------------- | :---: | :----: | ---------------------- |
| `getArticleById(id)` |   1   |   0    | Lazy load full article |
| **Total**            | **1** | **0**  |                        |

### 2.6 Admin: Add Category

| Step                                | Reads | Writes | Notes                                         |
| ----------------------------------- | :---: | :----: | --------------------------------------------- |
| `addCategory()` — scoped transaction |   1   |   1    | Rejects duplicate IDs against the current map |
| **Direct categories-doc total**      | **1** | **1**  | Cache/source-version writes are listed below  |

### 2.7 Admin: Add/Edit Article

| Step                   | Reads | Writes |      Gemini Calls      |
| ---------------------- | :---: | :----: | :--------------------: |
| Save article content   |   0   |   1    |           0            |
| Generate active embedding |   0   |   1    | 1 (`gemini-embedding-2`) |
| Update parent metadata |   1   |   1    |           0            |
| **Direct content total** | **1** | **3**  |         **1**          |

The Article Modal FAQ suggestion and embedding browser POSTs use no-store cache, same-origin credentials, and manual redirect handling before the existing 64 KB bounded response reader. This changes no Firestore, Gemini, cache-version, or write count; it only prevents cached or followed-redirect responses from being accepted before the documented acknowledgement shape is validated.

### 2.8 Admin: Delete Category (Cascade)

| Step                         | Reads | Writes  | Notes                                    |
| ---------------------------- | :---: | :-----: | ---------------------------------------- |
| Get all articles in category | up to 500 | 0 | `getArticlesByCategoryId()` scoped by `tId+sId` when session exists |
| Delete each article          | at least `2N` plus linked FAQ reads | `N` deletes plus linked FAQ archive writes | Each delete pre-reads and transaction-rechecks the article; linked FAQs are bounded |
| Delete category from doc     |   1   |    1    | Transaction removes only the current category key |
| **Direct content minimum**   | **3N+1** | **N+1** | Excludes bounded linked FAQ reads/writes and cache/source-version invalidation |

### 2.9 Admin: Delete Section (Cascade)

| Step                             | Reads | Writes  | Notes                         |
| -------------------------------- | :---: | :-----: | ----------------------------- |
| Get all articles in section      | up to 500 | 0 | `getArticlesBySectionId()` scoped by `tId+sId` when session exists |
| Delete each article              | at least `2N` plus linked FAQ reads | `N` deletes plus linked FAQ archive writes | Each delete pre-reads and transaction-rechecks the article; linked FAQs are bounded |
| Remove section from category     |   1   |    1    | `deleteSectionFromCategory()` transaction |
| **Direct content minimum**       | **3N+1** | **N+1** | Excludes bounded linked FAQ reads/writes and cache/source-version invalidation |

Article acknowledgement hardening is cost-neutral. `addArticle()`, `updateArticle()`, and `deleteArticle()` still use the same existing writes and cache revalidation paths, but UI callers now require explicit article write/delete acknowledgements before local article, category, or ingestion-job state advances. This adds no reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

Bulk article status acknowledgement hardening is cost-neutral. `bulkUpdateArticleStatus()` still uses the existing `writeBatch` status update and cache revalidation path, but `ArticlePane` now requires `assertKnowledgeBaseArticleBulkStatusUpdateSucceeded()` before success copy, selected-id clearing, or bulk-mode exit. This adds no reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

July 13 category navigation concurrency hardening adds one scoped categories-document read to each category, section, or article-navigation mutation. The existing one categories-document write remains. The read lets a Firestore transaction apply an operation-specific mutation to the latest map and retry without dropping another editor's category, section, or article-link change. No collection, Storage object, route, rule, index, schema field, Cloud Function, owner setting, Firebase deployment, or Vercel deployment is added.

The same transaction now owns the categories/article content write plus the three established freshness writes: `answerlattice_cacheVersions`, `platformSummary/sourceVersions_*`, and `platformSummary/bundleManifest_*`. Operation counts are unchanged, but the previous separate pre-write invalidation request is removed. A transaction rollback leaves both content and all freshness markers unchanged; a successful commit exposes them together. Article create/update/delete/bulk-status and FAQ save/archive use the same atomic content-plus-invalidation rule, including their bounded linked-FAQ/article writes.

Each successful navigation mutation also performs the existing cache/source-version invalidation: one `answerlattice_cache_versions` write plus two batched `platform_summary` writes. A typical navigation mutation is therefore **1 Firestore read + 4 Firestore writes total**, of which one read and one write belong to `kb_categories`. Public Next.js cache revalidation is an HTTP request, not a Firestore operation. The single-document pattern remains the lower-cost owner read model: browsing the complete bounded hierarchy costs one document read; splitting navigation into category/section/article-reference collections would multiply common browse reads without improving the expected scale posture.

July 5 session lookup diagnostics update: KB article and category session lookup failures now log bounded diagnostics instead of disappearing into anonymous/global fallback behavior. This adds no Firestore reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment. A failed category session lookup stops before the legacy categories doc read, so the degraded path can reduce reads instead of adding cost.

July 6 KB owner content scope hardening is cost-neutral. Category doc IDs, article scope resolution, article read guards, article embedding authorization, FAQ article-maintenance scope, and product-surface explicit/session scope now require exact positive numeric Firestore document IDs before scoped Firestore refs, filters, cache-version writes, public-cache revalidation, or embedding writes. Bulk article delete also revalidates the public KB/context cache with the resolved tenant/store scope instead of an undefined session fallback. Valid reads/writes keep the same Firestore operation counts and query shapes; malformed scope fails before Firestore work or returns the existing empty/not-found model. This adds no Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

July 6 article AI route scope hardening is cost-neutral. FAQ generation, article translation, and article entity extraction now normalize persisted article `tId/sId` through the shared Answerlattice exact positive numeric Firestore document-ID scope helper before comparing to authenticated route scope. Valid provider calls, article mutations, FAQ suggestion writes, translation writes, entity candidate writes, AI accounting, and cache-version behavior keep the same operation counts. Malformed persisted or route scope returns the existing not-found/workspace response before provider work or mutation. This adds no Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

---

## 3. Firestore Indexes Required

| Collection    | Fields                                          | Purpose                          |
| ------------- | ----------------------------------------------- | -------------------------------- |
| `kb_articles` | `pId+tId+sId+status+active` + Vector(`embedding`, 768, COSINE) | **Canonical vector search** |
| `kb_articles` | `categoryId ASC`                                | Get articles by category         |
| `kb_articles` | `sectionId ASC`                                 | Get articles by section          |
| `kb_articles` | `jobId ASC`                                     | Get articles by generation job   |

---

## 4. Cost Estimates

### Scenario: 200 articles, 10 categories, 30 sections

**Monthly operations (10 stores, moderate usage):**

| Operation                            | Frequency        |        Reads/mo        |    Writes/mo    |
| ------------------------------------ | ---------------- | :--------------------: | :-------------: |
| Owner KB browse (cached after first) | ~300 first loads |          300           |        0        |
| Article feedback (likes/dislikes)    | ~50/mo           |           50           |       50        |
| Admin KB load                        | ~30/mo           |           30           |        0        |
| Admin article edits                  | ~20/mo           |           20           | 60 (3 per edit) |
| Admin category/section CRUD          | ~5/mo            |           0            |        5        |
| Vector search (from AI chatbot)      | ~1,500/mo        | 18,000 (12 per search) |        0        |
| **Total**                            |                  |      **~18,400**       |    **~115**     |

### Monthly Cost

| Resource                                    | Usage    | Cost              |
| ------------------------------------------- | -------- | ----------------- |
| Firestore reads                             | ~18,400  | $0.007            |
| Firestore writes                            | ~115     | $0.0001           |
| Firestore storage (200 articles × 20KB avg) | ~4 MB    | ~$0.0004          |
| Gemini embeddings (20 articles/mo)          | 20 calls | Provider list price at execution time; operation accounting records actual model/tokens |
| **Total**                                   |          | **~$0.008/month** |

**At 1,000 stores:** Vector search reads dominate → ~$0.70/month

### Pre-launch embedding cost boundary

The runtime writes one `gemini-embedding-2` vector to `embedding` and maintains one matching vector index. It performs no nightly corpus scan, migration-state write, legacy provider call, or duplicate vector write. Existing vectors are reused only when the canonical cache version, dimensions, source hash, and finite non-zero vector all match.

---

## 5. DAL Function → Collection Mapping

| DAL Function              | Collection      | Operation              |
| ------------------------- | --------------- | ---------------------- |
| `getArticles`             | `kb_articles`   | getDocs (all)          |
| `addArticle`              | `kb_articles`   | addDoc                 |
| `updateArticle`           | `kb_articles`   | setDoc merge           |
| `deleteArticle`           | `kb_articles`   | deleteDoc              |
| `getArticlesByCategoryId` | `kb_articles`   | getDocs (query)        |
| `getArticlesBySectionId`  | `kb_articles`   | getDocs (query)        |
| `getArticlesByIds`        | `kb_articles`   | getDocs (query)        |
| `getArticleById`          | `kb_articles`   | getDoc                 |
| `updateArticleFeedback`   | `kb_articles`   | getDoc + setDoc        |
| `getCategories`           | `kb_categories` | getDoc                 |
| `deleteCategory`          | `kb_categories` | transaction read + update |
| `addCategory`             | `kb_categories` | transaction read + set/update |
| `updateCategory`          | `kb_categories` | transaction read + update |
| `upsertSectionInCategory` | `kb_categories` | transaction read + update |
| `deleteSectionFromCategory` | `kb_categories` | transaction read + update |
| `updateArticleInParent`   | `kb_categories` | transaction read + update |
| `deleteArticleFromParent` | `kb_categories` | transaction read + update |

---

## 6. Document Growth Risk

### kb_categories (Single Document)

| Categories | Sections | Article Refs | Est. Size |     Risk      |
| :--------: | :------: | :----------: | :-------: | :-----------: |
|     10     |    30    |     100      |  ~20 KB   |    ✅ Safe    |
|     50     |   150    |     500      |  ~100 KB  |    ✅ Safe    |
|    100     |   300    |    1,000     |  ~200 KB  |    ✅ Safe    |
|    500     |  1,500   |    5,000     |  ~900 KB  | ⚠️ Near limit |

**Mitigation:** Typical KB has <50 categories. No foreseeable risk.

### kb_articles (Individual Documents)

| Article Content | Embedding |  Total  |     Risk      |
| :-------------: | :-------: | :-----: | :-----------: |
|      5 KB       |   3 KB    |  8 KB   |    ✅ Safe    |
|      40 KB      |   3 KB    |  43 KB  |    ✅ Safe    |
|     200 KB      |   3 KB    | 203 KB  |    ✅ Safe    |
|     900 KB+     |   3 KB    | 903 KB+ | ⚠️ Near limit |

**Mitigation:** Individual articles rarely exceed 50KB. TipTap JSON is compact.

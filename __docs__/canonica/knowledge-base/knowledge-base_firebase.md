# Knowledge Base — Firebase Cost & Operations Tracking

> **Version:** 1.1.0
> **Last Updated:** 2026-05-16
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
| **Scoping**                 | `tId + sId` for current Canonica workspaces; legacy global data only via filtered fallback |
| **Avg Doc Size**            | 5-50 KB (content ~2-40KB + embedding ~3KB)         |
| **Growth Rate**             | Slow (manual creation + AI generation)             |
| **Vector Index**            | `embedding` field, 768 dimensions, COSINE distance |

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
| `addCategory()` — field path update |   0   |   1    | `updateDoc(ref, { 'categories.{id}': data })` |
| **Total**                           | **0** | **1**  |                                               |

### 2.7 Admin: Add/Edit Article

| Step                   | Reads | Writes |      Gemini Calls      |
| ---------------------- | :---: | :----: | :--------------------: |
| Save article content   |   0   |   1    |           0            |
| Generate embedding     |   0   |   1    | 1 (text-embedding-004) |
| Update parent metadata |   0   |   1    |           0            |
| **Total**              | **0** | **3**  |         **1**          |

### 2.8 Admin: Delete Category (Cascade)

| Step                         | Reads | Writes  | Notes                                    |
| ---------------------------- | :---: | :-----: | ---------------------------------------- |
| Get all articles in category | up to 500 | 0 | `getArticlesByCategoryId()` scoped by `tId+sId` when session exists |
| Delete each article          |   0   |    N    | `deleteArticle()` per article            |
| Delete category from doc     |   0   |    1    | `deleteCategory()` overwrites categories |
| **Total**                    | **N** | **N+1** | N = articles in category                 |

### 2.9 Admin: Delete Section (Cascade)

| Step                             | Reads | Writes  | Notes                         |
| -------------------------------- | :---: | :-----: | ----------------------------- |
| Get all articles in section      | up to 500 | 0 | `getArticlesBySectionId()` scoped by `tId+sId` when session exists |
| Delete each article              |   0   |    N    | `deleteArticle()` per article |
| Update category (remove section) |   0   |    1    | `updateCategory()`            |
| **Total**                        | **N** | **N+1** | N = articles in section       |

---

## 3. Firestore Indexes Required

| Collection    | Fields                                          | Purpose                          |
| ------------- | ----------------------------------------------- | -------------------------------- |
| `kb_articles` | `status ASC` + Vector(`embedding`, 768, COSINE) | **Vector search** (RAG pipeline) |
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
| Gemini embeddings (20 articles/mo)          | 20 calls | ~$0.001           |
| **Total**                                   |          | **~$0.008/month** |

**At 1,000 stores:** Vector search reads dominate → ~$0.70/month

---

## 5. DAL Function → Collection Mapping

| DAL Function              | Collection      | Operation              |
| ------------------------- | --------------- | ---------------------- |
| `getArticles`             | `kb_articles`   | getDocs (all)          |
| `addArticle`              | `kb_articles`   | addDoc                 |
| `updateArticle`           | `kb_articles`   | setDoc merge           |
| `deleteArticle`           | `kb_articles`   | deleteDoc              |
| `deleteMultipleArticles`  | `kb_articles`   | writeBatch delete      |
| `getArticlesByCategoryId` | `kb_articles`   | getDocs (query)        |
| `getArticlesBySectionId`  | `kb_articles`   | getDocs (query)        |
| `getArticlesByIds`        | `kb_articles`   | getDocs (query)        |
| `getArticleById`          | `kb_articles`   | getDoc                 |
| `updateArticleFeedback`   | `kb_articles`   | getDoc + setDoc        |
| `getCategories`           | `kb_categories` | getDocs                |
| `deleteCategory`          | `kb_categories` | setDoc (overwrite)     |
| `addCategory`             | `kb_categories` | updateDoc (field path) |
| `updateCategory`          | `kb_categories` | updateDoc (field path) |
| `updateArticleInParent`   | `kb_categories` | updateDoc (field path) |
| `deleteArticleFromParent` | `kb_categories` | updateDoc (field path) |

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

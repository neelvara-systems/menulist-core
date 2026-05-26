# Help Center — Firebase Cost & Operations Tracking

> **Version:** 1.1.0
> **Last Updated:** 2026-05-16
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Firestore Collections Summary

| # | Collection | Doc ID Pattern | Scoping | Avg Doc Size | Growth Rate |
|---|-----------|---------------|---------|-------------|-------------|
| 1 | `kb_articles` | Auto-ID | Global | 5-50 KB (with embedding ~3KB) | Slow (manual + AI gen) |
| 2 | `kb_categories` | `categories` (single doc) | Global | 10-100 KB (nested map) | Very slow |
| 3 | `kb_generation_jobs` | Auto-ID | `tId + sId` fields | 5-50 KB | Per-upload |
| 4 | `kb_staging_sections` | — | Global | Variable | Transient |
| 5 | `kb_staging_chunks` | — | Global | Variable | Transient |
| 6 | `kb_review_tasks` | — | Global | Variable | Transient |
| 7 | `kb_ai_runs` | — | Global | Variable | Per-job |
| 8 | `kb_sections` | — | Global | Variable | Slow |
| 9 | `chatSessions` | Auto-ID | `tId + sId + uId` fields | 2-100 KB (grows with messages) | Per-conversation |
| 10 | `chatAnalytics` | `{tId}_{sId}_{YYYY-MM-DD}` | `tId + sId` fields | 1-5 KB | 1/store/day |
| 11 | `queryEmbeddings` | Cache key string | Global | 3-4 KB (768-dim vector) | Per-unique-query |
| 12 | `aiSearchHistory` | Auto-ID | `tId` field | 2-10 KB | Per-search |
| 13 | `supportTickets` | Auto-ID | `tId + sId` fields | 2-50 KB | Per-ticket |
| 14 | `feedback` | Auto-ID | `tId + sId + uId` fields | 0.5-2 KB | Per-submission |
| 15 | `changelog/{tId}/{sId}` | `page_XXXXXX` | Subcollection | Up to 900 KB/page | Per-entry |
| 16 | `changelog_feedback/{tId}/{sId}` | `doc1_{entryId}` | Subcollection | 0.5-5 KB | Per-feedback |
| 17 | `article_feedback/{tId}/{sId}` | `doc1_{entryId}` | Subcollection | 0.5-5 KB | Per-feedback |

---

## 2. Operations Per Feature

### 2.1 AI QnA Search (Non-Streaming)

**Per search query:**

| Step | Reads | Writes | External API |
|------|-------|--------|-------------|
| Rate limit check | 0 | 0 | 1 Upstash call (4 Redis commands) |
| Session check | 0 | 0 | — |
| Response cache lookup | 1 | 0 | — |
| FAQ/custom-answer lookup | 0 hot / up to 80 cold | 0 | — |
| Embedding cache check | 1 | 0-1 (hitCount) | — |
| Embedding generation (miss) | 0 | 1 | 1 Gemini embedding call |
| Vector search | 12 | 0 | — |
| Answer generation | 0 | 0 | 1 Gemini chat call |
| Save search history | 0 | 1 | — |
| Performance logging | 0 | 1 | — |
| **Cache HIT total** | **1** | **1** | **1 Upstash** |
| **Cache MISS total** | **14** | **3-4** | **1 Upstash + 1-2 Gemini** |

**Owner FAQ/custom-answer hit:** after canonical miss, the search pipeline checks published active FAQs before embeddings and Gemini fallback. If the current product surface already supplied related FAQs, this is in-memory after the surface summary read. Otherwise the server reads a bounded list of up to 80 published FAQs, cached per tenant/store/source-version for 60 seconds. A linked article adds one article read only on FAQ hits so Help Center and widget answers can return the source article link. This avoids embedding generation, vector search, and answer-generation calls for repeated owner-authored questions.

**With image (additional):**
- 1 external fetch (Firebase Storage image)
- 1 Gemini 2.5 Pro call (image → text query)

### 2.2 Article Embedding Generation

**Per article embed (via API route):**

| Operation | Reads | Writes | External API |
|-----------|-------|--------|-------------|
| Rate limit check | 0 | 0 | 1 Upstash |
| Embedding generation | 0 | 1 | 1 Gemini embedding |
| **Total** | **0** | **1** | **1 Upstash + 1 Gemini** |

**Per article embed (via Cloud Function):**

| Operation | Reads | Writes | External API |
|-----------|-------|--------|-------------|
| Read article | 1 | 0 | — |
| Generate embedding | 0 | 0 | 1 Gemini embedding |
| Update article + job counter | 0 | 2 | — |
| **Total** | **1** | **2** | **1 Gemini** |

### 2.3 Support Ticket Operations

**Create ticket:**

| Operation | Reads | Writes | Storage |
|-----------|-------|--------|---------|
| requestBodyComposer | 0 | 0 | — |
| Upload attachments | 0 | 0 | N files |
| addDoc | 0 | 1 | — |
| **Total** | **0** | **1** | **N files** |

**Add message to ticket:**

| Operation | Reads | Writes | Storage |
|-----------|-------|--------|---------|
| Upload attachments | 0 | 0 | N files |
| Update ticket | 0 | 1 | — |
| **Total** | **0** | **1** | **N files** |

**Update ticket status:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Update ticket | 0 | 1 |
| **Total** | **0** | **1** |

**Get store tickets (owner):**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Query by tId + sId | up to 100 | 0 |
| **Total** | **≤100** | **0** |

**Subscribe to tickets (real-time):**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Initial snapshot | up to 100 | 0 |
| Per-change | 1 per change | 0 |

### 2.4 Changelog Operations

**Add entry:**

| Operation | Reads | Writes | Storage |
|-----------|-------|--------|---------|
| Upload files | 0 | 0 | N files |
| Transaction: find latest page | 1 | 0 | — |
| Transaction: append or create page | 0 | 1 | — |
| **Total** | **1** | **1** | **N files** |

**Fetch latest page:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Query latest by pageNumber | 1 | 0 |

**Load older page:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Query previous by pageNumber | 1 | 0 |

**Update feedback:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Transaction: read page + update | 1 | 1 |

### 2.5 Feedback Submission

**Submit feedback:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| addDoc | 0 | 1 |

**Get latest feedback:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Query by uId + tId + sId limit 1 | 1 | 0 |

### 2.6 Content Feedback (Article/Changelog)

**Add feedback:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Transaction: read + append | 1 | 1 |

### 2.7 Chat Analytics Aggregation (Nightly CF)

**Per store per day:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Query day's chat sessions | N (day's sessions) | 0 |
| Write aggregated doc | 0 | 1 |
| **Total** | **N** | **1** |

### 2.8 Chat Monitoring (Admin Dashboard Load)

**Optimized dashboard:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Historical stats (~30 days) | ~30 | 0 |
| Today's live stats | up to 500 (today only) | 0 |
| Top questions | ~30 | 0 |
| Knowledge gaps | ~30 | 0 |
| Volume chart | ~7 | 0 |
| Conversations list (page 1) | 21 | 0 |
| **Total per load** | **~120-150** | **0** |

**Legacy unoptimized (for comparison):**
- Full session scan: ~4,000+ reads for 1,000 sessions

### 2.9 KB Management (Platform Admin)

**Load KB:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Get categories | 1 (single doc) | 0 |
| Get articles by category | N per category | 0 |

**Add/Edit article:**

| Operation | Reads | Writes | External API |
|-----------|-------|--------|-------------|
| Save article | 0 | 1 | — |
| Generate embedding | 0 | 1 | 1 Gemini |
| Update parent category | 0 | 1 | — |
| **Total** | **0** | **3** | **1 Gemini** |

---

## 3. Cost Estimates

### 3.1 Firestore Pricing Reference

| Operation | Cost (per 100K) |
|-----------|----------------|
| Reads | $0.036 |
| Writes | $0.108 |
| Deletes | $0.012 |
| Storage | $0.108/GiB/month |

### 3.2 Monthly Cost Scenarios

**Scenario: 10 stores, 50 searches/day, 5 tickets/week, 2 changelog entries/week**

| Component | Daily Reads | Daily Writes | Monthly Cost |
|-----------|-------------|-------------|-------------|
| AI Search (cache hits ~60%) | 50×2 + 20×14 = 380 | 50×1 + 20×4 = 130 | ~$0.05 |
| Chat Analytics Aggregation | 10×50 = 500 | 10 | ~$0.02 |
| Admin Dashboard (5 loads/day) | 5×150 = 750 | 0 | ~$0.01 |
| Ticket Operations | ~20 | ~10 | ~$0.001 |
| Changelog | ~10 | ~5 | ~$0.001 |
| Feedback | ~5 | ~5 | ~$0.001 |
| KB Management | ~50 | ~10 | ~$0.002 |
| **Total Firestore** | **~1,665/day** | **~170/day** | **~$0.09/month** |

**Gemini API costs:**

| Model | Calls/Day | Cost/1K calls | Monthly |
|-------|-----------|--------------|---------|
| text-embedding-004 | ~20 (cache misses) | ~$0.01 | ~$0.006 |
| gemini-2.5-flash (chat) | ~20 | ~$0.15 | ~$0.09 |
| gemini-2.5-pro (images) | ~2 | ~$0.50 | ~$0.03 |
| **Total Gemini** | | | **~$0.13/month** |

**Total estimated: ~$0.22/month for 10 stores**

### 3.3 Scale Scenario: 1,000 stores

| Component | Monthly Cost |
|-----------|-------------|
| Firestore | ~$9/month |
| Gemini API | ~$13/month |
| **Total** | **~$22/month** |

---

## 4. Firestore Indexes Required

### 4.1 Composite Indexes

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `chatSessions` | `tId ASC, uId ASC, modifiedOn DESC` | User chat history |
| `chatSessions` | `tId ASC, sId ASC, createdOn ASC` | Today's live stats |
| `chatSessions` | `tId ASC, modifiedOn DESC` | Admin conversations |
| `chatSessions` | `tId ASC, sId ASC, modifiedOn DESC` | Paginated conversations |
| `chatAnalytics` | `tId ASC, sId ASC, date ASC` | Aggregated stats queries |
| `chatAnalytics` | `tId ASC, sId ASC, modifiedOn DESC` | Last analytics update |
| `supportTickets` | `tId ASC, sId ASC, deleted ASC, createdOn DESC` | Store tickets |
| `supportTickets` | `deleted ASC, createdOn DESC` | Platform tickets |
| `feedback` | `uId ASC, tId ASC, sId ASC, createdOn DESC` | User feedback history |
| `aiSearchHistory` | `cacheKey ASC, tId ASC` | Cache lookup |
| `kb_generation_jobs` | `tId ASC, sId ASC, status ASC` | Active jobs query |
| `kb_articles` | `status ASC` + Vector index on `embedding` | Vector search |

### 4.2 Vector Index

| Collection | Vector Field | Dimensions | Distance |
|-----------|-------------|-----------|----------|
| `kb_articles` | `embedding` | 768 | COSINE |

---

## 5. Firebase Storage Usage

### 5.1 Storage Paths

| Feature | Path Pattern | Tenant-Scoped |
|---------|-------------|---------------|
| Chat images | `chatSessions/chatimages/{tId}/{sId}/{imageId}` | ✅ |
| Ticket documents | `supportTickets/documents/{tId}/{sId}/{fileId}` | ✅ |
| Ticket messages | `supportTickets/messages/{tId}/{sId}/{fileId}` | ✅ |
| Changelog files | `changelog/files/{tId}/{sId}/{fileId}` | ✅ |
| KB source files | KB generation pipeline storage | By job |

Chat images are capped at 5 MB by `storage-canonica.rules` and app-side validation. Current supported formats are JPEG, PNG, WebP, and GIF.

### 5.2 Storage Cost Estimate

- Average file size: 500KB
- 10 stores × 5 files/week = 50 files/week = 200 files/month
- 200 × 500KB = 100MB/month
- Cost: ~$0.01/month (negligible)

---

## 6. DAL Function Reference

### Collections → DAL Files

| Collection | DAL File | Functions |
|-----------|---------|-----------|
| `kb_articles` | `src/database/knowledgeBase/articles.ts` | 9 functions |
| `kb_categories` | `src/database/knowledgeBase/categories.ts` | 6 functions |
| `chatSessions` | `src/database/chatSessions/index.ts` | 12 functions |
| `chatAnalytics` | `src/database/chatAnalytics/index.ts` | 8 functions |
| `supportTickets` | `src/database/tickets/index.ts` | 10 functions |
| `changelog` | `src/database/changelog/index.ts` | 6 functions |
| `feedback` | `src/database/feedback/index.ts` | 2 functions |
| `changelog_feedback` / `article_feedback` | `src/database/contentFeedback/index.ts` | 1 function |
| `aiSearchHistory` | `src/database/aiSearchHistory/index.ts` | 3 functions |
| `queryEmbeddings` | `src/database/queryEmbeddings/index.ts` | 2 functions |
| `kb_generation_jobs` | `src/database/kb-generation/jobs.ts` | 5 functions |

**Total: 64 DAL functions across 11 files**

---

## 7. Cost Optimization Strategies Already In Place

| Strategy | Savings | Implementation |
|----------|---------|----------------|
| **Response caching** | 60% fewer Gemini calls | `aiSearchHistory.findCachedSearchByCacheKey()` |
| **Embedding caching** | 40-60% fewer embedding calls | `queryEmbeddings.getCachedEmbedding()` |
| **Shared KB category cache** | Prevents duplicate same-mount category reads | `useKBCategoriesCache()` |
| **Aggregated analytics** | 99.95% fewer reads | `chatAnalytics` daily docs vs raw sessions |
| **Hybrid dashboard** | Fresh data + low reads | Today's live + historical aggregate |
| **Pagination** | Bounded reads | `limit(pageSize+1)` on all list queries |
| **Bounded realtime tickets** | Prevents unbounded owner live snapshots | `subscribeStoreTickets(limit 100)` |
| **Client-side filtering** | No extra queries | Search/feedback filters on fetched data |
| **Single-doc categories** | 1 read for all KB nav | All categories in one Firestore doc |
| **Batch operations** | Fewer writes | `writeBatch` for multi-article deletes |
| **Transactional writes** | Atomic operations | Changelog uses `runTransaction` |

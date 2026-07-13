# Help Center — Firebase Cost & Operations Tracking

> **Version:** 1.1.5
> **Last Updated:** 2026-07-06
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

Chat session acknowledgement hardening is cost-neutral. `saveChatSession()` still performs one `chatSessions` create, but HelpChat now requires a persisted session object before selecting the new conversation. `updateChatSession()` still performs one merge write, but returns `{ success, sessionId, updatedFields }`; HelpChat append/retry/rename and platform metadata saves require that acknowledgement or route through the existing bounded failure path. This adds no reads, writes, indexes, rules, Cloud Functions, Storage operations, provider calls, or deployment requirement.

Chat session delete acknowledgement hardening is cost-neutral. `deleteChatSession()` still performs the existing session read, best-effort attached-image cleanup, and one `chatSessions` delete, but HelpChat now requires `{ success, sessionId, deleted, storageFilesDeleted }` before showing delete success. Failed or malformed delete results reload session state and restore the previous active-session/search snapshot. This adds no reads, writes, deletes, Storage operations, indexes, rules, Cloud Functions, routes, schema fields, or deployment requirement beyond the existing delete path.

HelpChat answer-feedback acknowledgement hardening is also cost-neutral. Feedback submission still attempts the existing `aiSearchHistory` feedback merge and `chatSessions` message feedback mirror, but `submitSearchFeedback()` now requires explicit acknowledgements from both writes before local feedback state, thank-you copy, or negative-feedback signal emission advances. This adds no reads, writes, indexes, rules, Cloud Functions, Storage operations, provider calls, routes, schema fields, or deployment requirement.

Chat session scope hardening is cost-neutral. Chat image uploads still perform the same single Storage upload for valid base64 chat images, and chat history/admin/stat reads keep the same `chatSessions` query shapes and read caps, but `src/database/chatSessions/index.ts` now normalizes session `tId/sId` as exact positive numeric Firestore document IDs before composing Storage paths or Firestore filters. Malformed session scope fails before Storage path composition or chat-session reads/scans instead of being trimmed, loosely numeric-coerced, or passed raw to query filters. This adds no Firestore reads/writes/deletes, Storage operations for valid uploads, indexes, rules, Cloud Functions, provider calls, schema fields, Firebase deploy requirement, or Vercel deploy action.

The July 11 single-record hardening makes mutation cost explicit: update, internal-note and delete operations read the target inside a transaction before one optional update or delete; batch metadata reads each capped target before its one batch write; feedback reads the chat session and linked `aiSearchHistory` row and writes both atomically. Delete commits the Firestore delete before best-effort image cleanup so a failed database mutation cannot first remove referenced assets. These reads replace unsafe caller assumptions with transaction-local ownership/schema proof; they add no collection, index, rule, Function, provider call, scheduled work, Firebase deploy target or Vercel action.

Both `firestore-answerlattice.rules` and the shared `firestore.rules` now enforce the same chat-session product, actor, required/allowed top-level keys, title/mode/message-count, timestamp, metadata-list and immutable creator/scope update contract. Scoped collection queries include `pId == 'AL'` so the rules engine can prove product isolation; both index files contain the six product+tenant+store chat query shapes for user history, modified sorting/filtering and ascending/descending creation time. Dedicated and shared emulator suites prove valid create/read/query/update/delete behavior plus public/cross-workspace, forged actor/product/scope, unknown field, invalid timestamp/mode/title and message-bound denial. These source changes require the matching rules/index deployments; they add no runtime document operation for already valid queries.

Chat analytics browser reads are read-only and product/tenant/store scoped. `src/database/chatAnalytics/index.ts` derives the active workspace through the shared Answerlattice resolver; summary rows must pass exact document/date/counter/completeness/list invariants before UI use. Malformed scope or summaries return no trusted read model. The server-owned writer lives in the existing Answerlattice Functions scheduler, not the browser DAL.

Answerlattice Functions workspace scope hardening adds no Firestore operation for valid work. The manual scheduler rejects malformed supplied scope before scheduler work; integration events reject nonnumeric or unsafe persisted scope before reading `platformSummary/integrationConfig_*` or dispatching an adapter; entity fallback discovery skips invalid scope before tenant-summary backfill; graph summaries with coercive metadata use the existing one-merge metadata repair. The shared pure boundary adds no collection, index, rule, schedule, provider call, or valid-path read/write. Because the maintained Functions sources changed, QA requires the scoped Answerlattice Functions deployment before this contract is live.

KB owner content scope hardening is cost-neutral. KB category document IDs, article read/write scope, FAQ article-maintenance scope, product-surface explicit/session scope, and protected article embedding tenant/store checks now normalize through the shared Answerlattice exact positive numeric Firestore document-ID helper before Firestore refs, filters, cache-version writes, public-cache revalidation, or embedding authorization. Valid KB, FAQ, and product-surface reads/writes keep the same query shapes and write counts; malformed scope now fails before Firestore work or returns the existing empty/not-found model. This adds no Firestore reads/writes/deletes for valid requests, Storage operations, indexes, rules, Cloud Functions, provider calls, schema fields, Firebase deploy requirement, or Vercel deploy action.

Article AI route scope hardening is cost-neutral. FAQ generation, article translation, and article entity extraction now use the same shared exact positive numeric Firestore document-ID scope helper before comparing persisted `kb_articles` tenant/store scope with the authenticated Answerlattice route scope. Valid provider calls, article reads/writes, FAQ suggestion writes, entity candidate writes, translation writes, AI accounting, cache-version behavior, and rate-limit placement keep the same operation shape; malformed stored or route scope fails before provider work or article mutation. This adds no Firestore reads/writes/deletes for valid requests, Storage operations, indexes, rules, Cloud Functions, schema fields, Firebase deploy requirement, or Vercel deploy action.

Support ticket session scope hardening is cost-neutral. Owner-side ticket reads and listeners still query `supportTickets` by `tId + sId + deleted`, order by `createdOn`, and keep the same latest-ticket caps, but `src/database/tickets/index.ts` now normalizes session `tId/sId` as exact positive numeric Firestore document IDs before composing those queries. Malformed session scope fails before owner ticket reads/listeners instead of being trimmed, loosely numeric-coerced, or passed raw to Firestore query filters. Platform-wide support-ticket views keep the existing platform query behavior. This adds no Firestore reads/writes/deletes, Storage operations, indexes, rules, Cloud Functions, provider calls, schema fields, Firebase deploy requirement, or Vercel deploy action.

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

### 2.2a Multi-language Article Translation

**Governance Languages tab load:**

| Operation | Reads | Writes | External API |
|-----------|-------|--------|-------------|
| Load scoped KB category index through shared cache | 0 hot / 1 cold | 0 | — |
| Fetch article docs by ID in chunks of 30, capped at 500 IDs | N article reads | 0 | — |
| **Total** | **0 hot or 1 + N cold** | **0** | **0** |

**Translate one article locale:**

| Operation | Reads | Writes | External API |
|-----------|-------|--------|-------------|
| Scope, safe mode, and rate-limit checks before permission/body/provider work | 0 | 0 | 1 Upstash when enabled |
| Read target article and verify `tId+sId` | 1 | 0 | — |
| Gemini translation call, capped at 8,000 source characters | 0 | 0 | 1 Gemini |
| Bump KB cache/context version | 0 | 2 | — |
| Write `kb_articles/{articleId}.translations.{locale}` | 0 | 1 | — |
| UI refreshes only the translated article | 1 | 0 | — |
| **Total** | **2** | **3** | **1 Upstash + 1 Gemini** |

The Languages tab is feature-flagged and does not create a realtime listener. It defaults to the supported Answerlattice locale list when no tenant-level locale setting exists.

Translation route guard changes on 2026-06-28 added no Firestore reads/writes. Unexpected translation and operation-log failures use fixed-code bounded tenant/store/article/locale metadata. The Governance Hub browser caller validates translation responses with a 16 KB bounded reader and the documented article/locale/title response shape before returning to the translation tab. The June 30 provider-output pass caps Gemini translation response text before JSON parsing and fails closed with the existing fixed translation failure response if the provider output exceeds the route ceiling; this adds no reads, writes, cache updates, provider calls, indexes, or Cloud Functions. Article embedding, article entity extraction, FAQ generation, translation, and public-content article reads normalize KB article IDs through the shared Firestore document-ID boundary before any `kb_articles` document access; this adds no reads, writes, provider calls, indexes, or Cloud Functions.

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

Changelog pages and the server-only entry index use exact product/tenant/store/page/entry runtime contracts. Server mutations read the page and index in one transaction, reject malformed or cross-workspace persisted rows before mutation, update the compact page/index and compiled-context invalidation together, then perform cache revalidation. Browser uploads are compensated if the server action fails; removed files are cleaned only after authoritative mutation acknowledgement. The browser action response cap is 64 KB and adds no Firestore operation.

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
| Read compact continuation state | 1 | 0 |
| Scan changed sessions | up to 501 | 0 |
| Recompute yesterday + affected days | up to 7 × 2,001 | 0 |
| Read existing daily summaries | up to 7 | 0 |
| Write changed daily summaries | 0 | up to 7 |
| Advance changed continuation state | 0 | 0-1 |
| **Hard ceiling per workspace run** | **14,516** | **8** |

Normal runs are far below the ceiling because unchanged summaries skip writes and only affected dates are recomputed. `sourceComplete: false` makes a capped date visible rather than presenting a partial day as complete. The existing master scheduler's workspace settlement lease serializes the task; no standalone schedule or per-session analytics document is added.

### 2.8 Chat Monitoring (Admin Dashboard Load)

**Optimized dashboard:**

| Operation | Reads | Writes |
|-----------|-------|--------|
| Combined historical stats/questions/gaps (~30 days) | ~30 | 0 |
| Today's live stats | up to 501 read to expose a 500-row partial boundary | 0 |
| Conversations list (page 1) | 21 | 0 |
| **Hard ceiling per load** | **553** | **0** |

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
| gemini-embedding-2 | ~20 (cache misses) | Provider list price at execution time | Operation accounting records the concrete model and token count |
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
| `chatSessions` | `pId ASC, tId ASC, sId ASC, uId ASC, modifiedOn DESC` | User chat history |
| `chatSessions` | `pId ASC, tId ASC, sId ASC, createdOn ASC/DESC` | Today/day scans and historical owner analytics |
| `chatSessions` | `pId ASC, tId ASC, sId ASC, modifiedOn DESC` | Paginated conversations/change scans |
| `chatSessions` | `pId ASC, tId ASC, sId ASC, mode/userName ASC, modifiedOn DESC` | Optional owner filters |
| `chatAnalytics` | `pId ASC, tId ASC, sId ASC, date DESC` | Aggregated stats queries |
| `chatAnalytics` | `pId ASC, tId ASC, sId ASC, modifiedOn DESC` | Last analytics update |
| `supportTickets` | `tId ASC, sId ASC, deleted ASC, createdOn DESC` | Store tickets |
| `supportTickets` | `deleted ASC, createdOn DESC` | Platform tickets |
| `feedback` | `uId ASC, tId ASC, sId ASC, createdOn DESC` | User feedback history |
| `aiSearchHistory` | `cacheKey ASC, tId ASC` | Cache lookup |
| `kb_generation_jobs` | `tId ASC, sId ASC, status ASC` | Active jobs query |
| `kb_articles` | `pId+tId+sId+status+active` + Vector index on `embeddingV2` | Active v2 vector search |
| `kb_articles` | Same scope fields + Vector index on legacy `embedding` | Rollback only during migration |

### 4.2 Vector Index

| Collection | Vector Field | Dimensions | Distance |
|-----------|-------------|-----------|----------|
| `kb_articles` | `embeddingV2` | 768 | COSINE |
| `kb_articles` | `embedding` | 768 | COSINE rollback index |

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

Chat images are capped at 5 MB by `storage-answerlattice.rules` and app-side validation. Current supported formats are JPEG, PNG, WebP, and GIF.

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
| **Chunked article status reads** | Avoids Firestore `in` query failures and caps translation-tab load | `getArticlesByIds()` chunks IDs in groups of 30 and caps at 500 |
| **Client-side filtering** | No extra queries | Search/feedback filters on fetched data |
| **Single-doc categories** | 1 read for all KB nav | All categories in one Firestore doc |
| **Batch operations** | Fewer writes | `writeBatch` for multi-article deletes |
| **Transactional writes** | Atomic operations | Changelog uses `runTransaction` |

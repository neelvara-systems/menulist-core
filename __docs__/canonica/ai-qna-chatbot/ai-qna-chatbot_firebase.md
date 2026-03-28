# AI QnA Chatbot — Firebase Cost & Operations Tracking

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections

### 1.1 chatSessions

| Property | Value |
|----------|-------|
| **Collection** | `chatSessions` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.CHAT_SESSIONS` |
| **Doc ID** | Auto-generated |
| **Scoping** | `tId` + `uId` fields (tenant + user) |
| **Avg Doc Size** | 2-100 KB (grows with messages) |
| **Growth Rate** | Per-conversation |

### 1.2 chatAnalytics

| Property | Value |
|----------|-------|
| **Collection** | `chatAnalytics` |
| **Doc ID** | `{tId}_{sId}_{YYYY-MM-DD}` |
| **Scoping** | `tId` + `sId` fields |
| **Avg Doc Size** | 1-5 KB |
| **Growth Rate** | 1 doc per store per day (nightly CF) |

### 1.3 aiSearchHistory

| Property | Value |
|----------|-------|
| **Collection** | `aiSearchHistory` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.AI_SEARCH_HISTORY` |
| **Doc ID** | Auto-generated |
| **Scoping** | `tId` field (tenant) |
| **Avg Doc Size** | 2-10 KB |
| **Growth Rate** | Per-unique-search (cache misses only save new docs) |

### 1.4 queryEmbeddings

| Property | Value |
|----------|-------|
| **Collection** | `queryEmbeddings` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.QUERY_EMBEDDINGS` |
| **Doc ID** | Cache key string (normalized query or query+image hash) |
| **Scoping** | Global (no tenant filter) |
| **Avg Doc Size** | 3-4 KB (768-dimension vector as number array) |
| **Growth Rate** | Per-unique-query |
| **Uses Admin SDK** | Yes — `firestoreAdmin` (server-side only) |

---

## 2. Firebase Storage

| Purpose | Path Pattern | Size |
|---------|-------------|------|
| Chat images | `chatSessions/chatimages/{tId}/{sId}/{timestamp}-{userId}` | 0-10 MB per image |

---

## 3. Operations Per Action

### 3.1 Search — Cache HIT

| Step | Reads | Writes | Gemini Calls |
|------|:-----:|:------:|:------------:|
| Rate limit (Upstash) | 0 | 0 | 0 |
| Session check | 0 | 0 | 0 |
| Response cache lookup | 1 | 0 | 0 |
| Performance logging | 0 | 1 | 0 |
| **Total** | **1** | **1** | **0** |

### 3.2 Search — Cache MISS (Text Only)

| Step | Reads | Writes | Gemini Calls |
|------|:-----:|:------:|:------------:|
| Rate limit (Upstash) | 0 | 0 | 0 |
| Session check | 0 | 0 | 0 |
| Response cache lookup | 1 | 0 | 0 |
| Embedding cache check | 1 | 1 (hitCount) | 0 |
| Embedding generation (if miss) | 0 | 1 | 1 (text-embedding-004) |
| Vector search (12 docs) | 12 | 0 | 0 |
| Answer generation | 0 | 0 | 1 (gemini-2.5-flash) |
| Save to search history | 0 | 1 | 0 |
| Performance logging | 0 | 1 | 0 |
| **Total** | **14** | **3-4** | **1-2** |

### 3.3 Search — Cache MISS (With Image)

| Step | Reads | Writes | Gemini Calls |
|------|:-----:|:------:|:------------:|
| All of 3.2 above | 14 | 3-4 | 1-2 |
| Image fetch (Firebase Storage) | 1 storage | 0 | 0 |
| Image → search query | 0 | 0 | 1 (gemini-2.5-pro) |
| **Total** | **14 + 1 storage** | **3-4** | **2-3** |

### 3.4 Save Chat Session (New)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `addDoc` to chatSessions | 0 | 1 |
| **Total** | **0** | **1** |

### 3.5 Update Chat Session (Add Message)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `setDoc` merge | 0 | 1 |
| **Total** | **0** | **1** |

### 3.6 Get User Chat Sessions

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: `tId + uId`, orderBy modifiedOn | N | 0 |
| **Total** | **N** | **0** |

### 3.7 Submit Feedback (Per Message)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Update search history | 0 | 1 |
| Update message in session (read-modify-write) | 1 | 1 |
| **Total** | **1** | **2** |

### 3.8 Nightly Analytics Aggregation (Cloud Function)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query day's sessions per store | N per store | 0 |
| Write aggregated doc | 0 | 1 per store |
| **Total per 10 stores** | **~500** | **10** |

---

## 4. Gemini API Costs

| Model | Cost (per 1M tokens) | Avg Tokens/Call | Calls/Search |
|-------|---------------------|:---------------:|:------------:|
| `text-embedding-004` | $0.00025/1K chars | ~500 chars | 1 (cache miss only) |
| `gemini-2.5-flash` | Input: $0.15, Output: $0.60 | ~2K input, ~500 output | 1 |
| `gemini-2.5-pro` | Input: $1.25, Output: $5.00 | ~1K input, ~200 output | 1 (image only) |

### Per-Search Cost Estimate

| Scenario | Gemini Cost |
|----------|------------|
| Cache hit | $0.00 |
| Text-only (embedding cached) | ~$0.0006 (flash only) |
| Text-only (embedding miss) | ~$0.0007 (embedding + flash) |
| With image (all miss) | ~$0.002 (pro + embedding + flash) |

---

## 5. Monthly Cost Estimates

### Scenario: 10 stores, 50 searches/day

| Component | Daily Reads | Daily Writes | Monthly Cost |
|-----------|:-----------:|:------------:|:------------:|
| Search (60% cache hit) | 20×1 + 20×14 = 300 | 20×1 + 20×4 = 100 | ~$0.02 |
| Session management | ~100 | ~50 | ~$0.01 |
| Feedback submissions | ~10 | ~20 | ~$0.001 |
| Nightly aggregation | 500 | 10 | ~$0.02 |
| **Firestore subtotal** | **~910/day** | **~180/day** | **~$0.05/month** |

| Gemini Model | Calls/Day | Monthly Cost |
|-------------|:---------:|:------------:|
| text-embedding-004 | ~20 | ~$0.006 |
| gemini-2.5-flash | ~20 | ~$0.09 |
| gemini-2.5-pro (images) | ~2 | ~$0.03 |
| **Gemini subtotal** | | **~$0.13/month** |

**Total: ~$0.18/month for 10 stores**

### Scale: 1,000 stores, 500 searches/day

| Component | Monthly Cost |
|-----------|:------------:|
| Firestore | ~$5 |
| Gemini | ~$13 |
| **Total** | **~$18/month** |

---

## 6. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `chatSessions` | `tId ASC, uId ASC, modifiedOn DESC` | User session list |
| `chatSessions` | `tId ASC, sId ASC, createdOn ASC` | Today's live stats |
| `chatSessions` | `tId ASC, modifiedOn DESC` | Admin conversations |
| `chatSessions` | `tId ASC, sId ASC, modifiedOn DESC` | Paginated conversations |
| `chatAnalytics` | `tId ASC, sId ASC, date ASC` | Aggregated stats |
| `chatAnalytics` | `tId ASC, sId ASC, modifiedOn DESC` | Last update check |
| `aiSearchHistory` | `cacheKey ASC, tId ASC` | Cache lookup |
| `kb_articles` | `status ASC` + Vector(`embedding`, 768, COSINE) | Vector search |

---

## 7. Cost Optimization Strategies In Place

| Strategy | Savings | Implementation |
|----------|---------|----------------|
| **Response cache** | ~60% fewer Gemini calls | `findCachedSearchByCacheKey()` |
| **Embedding cache** | 40-60% fewer embedding calls | `getCachedEmbedding()` + hitCount tracking |
| **Aggregated analytics** | 99.95% read reduction | Daily chatAnalytics docs vs raw session scans |
| **Hybrid dashboard** | Fresh + cheap | Today's live + historical aggregate |
| **SWR deduplication** | Prevents redundant fetches | 60s dedupe interval on sessions |
| **Client-side filtering** | No extra queries | Search/feedback filters on fetched data |
| **apiCallComposerClientWithoutLoader** | Better UX | Chat operations don't block global UI |

---

## 8. Document Growth Risk

### chatSessions
Messages stored as array. Each message ~200-1000 bytes (with references, feedback).

| Messages | Est. Doc Size | Risk |
|:--------:|:------------:|:----:|
| 10 | ~10 KB | ✅ Safe |
| 50 | ~50 KB | ✅ Safe |
| 200 | ~200 KB | ⚠️ Watch |
| 500+ | ~500 KB+ | 🔴 Risk (Firestore 1MB limit) |

**Mitigation:** Typical conversations have 5-20 messages. Long assistant-mode conversations could grow large. No current limit enforced.

### queryEmbeddings
Each doc ~3-4 KB (768-dim vector). No TTL/expiry.

| Unique Queries | Collection Size | Risk |
|:--------------:|:--------------:|:----:|
| 1,000 | ~4 MB | ✅ Fine |
| 10,000 | ~40 MB | ✅ Fine |
| 100,000 | ~400 MB | ⚠️ Storage cost |

**Mitigation:** Storage cost is low ($0.108/GiB/month). No cleanup needed at current scale.

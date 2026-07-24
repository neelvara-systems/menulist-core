# AI QnA Chatbot — Firebase Cost & Operations Tracking

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
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
| **Scoping** | Exact `pId + tId + sId`; shared-project readers and cleanup fail closed on product mismatch |
| **Avg Doc Size** | 2-10 KB |
| **Growth Rate** | Per-unique-search (cache misses only save new docs) |

### 1.4 queryEmbeddings

| Property | Value |
|----------|-------|
| **Collection** | `queryEmbeddings` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.QUERY_EMBEDDINGS` |
| **Doc ID** | SHA-256-derived ID from the scoped search cache key |
| **Scoping** | Exact `pId + tId + sId`; mismatched stored scope is rejected |
| **Avg Doc Size** | 3-4 KB (768-dimension vector as number array) |
| **Growth Rate** | Per unique scoped cache key |
| **Uses Admin SDK** | Yes — `firestoreAdmin` (server-side only) |
| **Retention** | Runtime valid-creation/30-day-age/explicit-expiry admission, 30-day `expiresAt`, Firestore TTL override, snapshot-preconditioned stale/invalid cleanup, and optional legacy cleanup by exact `pId: AL + createdAt` |
| **Cleanup Diagnostics** | `answerlattice_query_embedding_stale_delete_failed` with bounded cache-key presence/length and cache age only |

---

## 2. Firebase Storage

| Purpose | Path Pattern | Size |
|---------|-------------|------|
| Chat images | `chatSessions/chatimages/{tId}/{sId}/{timestamp}-{randomId}` | 0-5 MB per image |

---

## 3. Operations Per Action

### 3.1 Search — Response-Cache Segment

| Step | Reads | Writes | Gemini Calls |
|------|:-----:|:------:|:------------:|
| Response cache lookup | 1 | 0 | 0 |
| Configured logging sink | Separate bounded operation | Separate bounded operation | 0 |
| **Segment shown** | **1 response-cache read** | **Logging is separate** | **0** |

### 3.2 Search — Cache MISS (Text Only)

| Step | Reads | Writes | Gemini Calls |
|------|:-----:|:------:|:------------:|
| Rate limit (Upstash) | 0 | 0 | 0 |
| Session check | 0 | 0 | 0 |
| Response cache lookup | 1 | 0 | 0 |
| Embedding cache check | 1 | 0 | 0 |
| Embedding generation (if miss) | 0 | 1 | 1 (`gemini-embedding-2`) |
| Vector search (12 docs) | 12 | 0 | 0 |
| Answer generation | 0 | 0 | 1 (gemini-2.5-flash) |
| Save to search history | 0 | 1 | 0 |
| Configured logging sink | Separate bounded operation | Separate bounded operation | 0 |
| **Fallback segment** | **Up to 14 reads** | **2-3 writes depending on cache miss and logging sink** | **1-2** |

### 3.3 Search — Cache MISS (With Image)

| Step | Reads | Writes | Gemini Calls |
|------|:-----:|:------:|:------------:|
| Text fallback segment | Up to 14 | 2-3 depending on embedding miss and logging sink | 1-2 |
| Image fetch (Firebase Storage) | 1 storage | 0 | 0 |
| Image → visual search context | 0 | 0 | 1 (`gemini-2.5-flash`) |
| **Fallback segment** | **Up to 14 reads + image fetch** | **2-3 writes depending on cache miss and logging sink** | **2-3** |

### 3.4 Gated Hybrid Evidence Lookup

This lookup is disabled by default. On an eligible technical query after canonical and FAQ miss:

| Step | Reads | Writes | Provider calls |
|------|:-----:|:------:|:--------------:|
| Existing vector search | Up to 12 | 0 | 0 |
| Exact entity-linked article query | Up to 12 | 0 | 0 |
| In-memory qualification and rank fusion | 0 | 0 | 0 |
| **Increment over existing fallback** | **0-12** | **0** | **0** |

Eligibility requires both a bounded exact technical literal and one or more normalized resolved entity IDs. The additional query uses only active published articles in the exact `AL + tId + sId` workspace and is capped at 12 documents. Ordinary natural-language questions add zero hybrid-lane reads.

These tables describe the fallback segment, not the complete request total. Canonical retrieval, FAQ retrieval, source-version/cache-state checks, support accounting, escalation, and the configured logging sink have separate bounded operation shapes.

### 3.5 Save Chat Session (New)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `addDoc` to chatSessions | 0 | 1 |
| **Total** | **0** | **1** |

### 3.6 Update Chat Session (Add Message)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `setDoc` merge | 0 | 1 |
| **Total** | **0** | **1** |

### 3.7 Get User Chat Sessions

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: `tId + uId`, orderBy modifiedOn | N | 0 |
| **Total** | **N** | **0** |

### 3.8 Submit Feedback (Per Message)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Update search history | 0 | 1 |
| Update message in session (read-modify-write) | 1 | 1 |
| **Total** | **1** | **2** |

### 3.9 Nightly Analytics Aggregation (Cloud Function)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query day's sessions per store | N per store | 0 |
| Write aggregated doc | 0 | 1 per store |
| **Total per 10 stores** | **~500** | **10** |

---

## 4. Gemini API Costs

| Model | Cost behavior | Avg Payload | Calls/Search |
|-------|---------------|:-----------:|:------------:|
| `gemini-embedding-2` | Charged only on embedding cache miss | ~500 chars | 1 (cache miss only) |
| `gemini-2.5-flash` | Charged on answer generation cache miss | ~2K input, ~500 output | 1 |
| `gemini-2.5-flash` vision | Charged only when an image is attached | One bounded image + prompt | 1 (image only) |

### Per-Search Cost Estimate

| Scenario | Gemini Cost Behavior |
|----------|----------------------|
| Cache hit | $0.00 provider cost |
| Text-only (embedding cached) | One answer-generation call |
| Text-only (embedding miss) | One embedding call + one answer-generation call |
| With image (all miss) | One vision-context call + one embedding call + one answer-generation call. The answer pass receives text visual context, not the raw image, to avoid a second vision upload. |

---

## 5. Cost Measurement

Do not derive a monthly estimate from assumed cache-hit rates or fixed model prices. Measure:

- canonical, FAQ, response-cache, embedding-cache, vector, and empty-result path counts;
- returned documents for each bounded Firestore query;
- eligible hybrid-evidence requests and their returned article count;
- image-context, embedding, and answer-generation provider operations;
- provider-reported or explicitly estimated token usage;
- feedback, session, analytics, and cache-invalidation writes.

Recalculate from current Firebase and provider pricing before changing packaging or publishing a cost claim.

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
| `aiSearchHistory` | `pId ASC, cacheKey ASC, tId ASC, sId ASC, createdOn DESC` | Exact-product cache lookup |
| `aiSearchHistory` | `pId ASC, createdOn ASC` | Exact-product bounded legacy retention cleanup |
| `queryEmbeddings` | `pId ASC, createdAt ASC` | Exact-product bounded legacy retention cleanup |
| `kb_articles` | `pId+tId+sId+status+active` + Vector(`embedding`, 768, COSINE) | Canonical vector search |
| `kb_articles` | `pId+tId+sId+status+active+entityIds ARRAY` | Gated exact/entity article lookup |

---

## 7. Cost Optimization Strategies In Place

| Strategy | Cost behavior | Implementation |
|----------|---------------|----------------|
| **Response cache** | Avoids provider work on a fresh scoped hit | Server-only `findCachedSearchByCacheKeyServer()` lookup using a SHA-256 cache-key digest plus exact `pId + tId + sId` scope |
| **Embedding cache** | Avoids an embedding call on a fresh scoped hit | `getCachedEmbedding()` with exact stored `pId + tId + sId` validation |
| **Aggregated analytics** | Avoids repeated full raw-session scans for historical views | Daily `chatAnalytics` documents |
| **Hybrid dashboard** | Fresh + cheap | Today's live + historical aggregate |
| **SWR deduplication** | Prevents redundant fetches | 60s dedupe interval on sessions |
| **Client-side filtering** | No extra queries | Search/feedback filters on fetched data |
| **apiCallComposerClientWithoutLoader** | Better UX | Chat operations don't block global UI |

HelpChat answer-feedback acknowledgement hardening is cost-neutral. Feedback submission still performs the existing `aiSearchHistory` feedback merge and `chatSessions` message feedback mirror, but `submitSearchFeedback()` now requires explicit acknowledgements from both writes before local feedback state, thank-you copy, or negative-feedback signal emission advances. This adds no Firestore reads/writes/deletes beyond existing feedback writes, no Storage operations, no routes, no Cloud Functions, no indexes, no rules, and no deployment requirement.

Search-history server scope hardening is cost-neutral. `src/database/aiSearchHistory/server.ts` now requires exact positive numeric Firestore document-ID tenant/store scope before composing new `aiSearchHistory` rows or querying the cache by `cacheKey + tId + sId`. Valid cache hits and search-history writes keep the same one-read / one-write operation shape; malformed scope returns no cache row or fails before writing a row with fallback `0` scope. This adds no reads/writes/deletes for valid requests, Storage operations, routes, rules, indexes, Cloud Functions, provider calls, Firebase deployment, or Vercel deployment.

HelpChat session-delete acknowledgement hardening performs one transaction-current session read and one chat-session delete. Persisted chat images are tenant/store-scoped and may be shared by another session, so delete, branch replacement, and message compaction retain them and report `storageFilesDeleted: 0` until a scope-wide reference inventory can authorize cleanup. The UI still requires explicit delete acknowledgement before success copy and restores the previous active-session/search state if acknowledgement fails.

The development-only clear control is a bounded composition of the same operation for the at-most-50 sessions already loaded for the signed-in user: **N session reads + N session deletes**, processed sequentially; persisted images remain retained under the shared-reference policy. It does not scan collections, does not use the MenuList Firebase client, and does not attempt forbidden client deletes against `aiSearchHistory` or `queryEmbeddings`. Failed acknowledgements remain visible in local state, so partial failure cannot be presented as a complete wipe.

HelpChat message copy, AI Search answer copy, and ArticleView link copy acknowledgement hardening is browser-local and cost-neutral. `src/lib/answerlattice/supportClipboard.ts` checks Clipboard API support, falls back to a textarea copy path only when available, and requires `document.execCommand('copy') === true` before copied feedback appears. This adds no Firestore reads/writes/deletes, no Storage operations, no Firebase Auth operations, no API routes, no Cloud Functions, no indexes, no rules, no provider calls, and no deployment requirement.

### Widget explicit support request

An initial explicit widget support request transaction reads the exact `aiSearchHistory` row and deterministic `supportTickets` row, creates the ticket when absent, and merges the ticket linkage/unresolved outcome into search history. After commit, the existing signal emitter may create one deterministic `ESCALATION` signal when signal mutation is enabled. No notification is sent by this path. Replays reuse the existing ticket and signal identity but still perform bounded validation work, so production cost must be measured rather than described as zero.

The route adds no collection, index, rule, Storage path, scheduler, or Cloud Function. Raw widget search history retains the existing 90-day lifecycle; ticket and signal rows use their existing feature lifecycles.

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
Each doc ~3-4 KB (768-dim vector). New rows get 30-day retention fields, stale cache reads skip the row and attempt best-effort cleanup, and cleanup failures log `answerlattice_query_embedding_stale_delete_failed` with bounded metadata.

| Unique Queries | Collection Size | Risk |
|:--------------:|:--------------:|:----:|
| 1,000 | ~4 MB | ✅ Fine |
| 10,000 | ~40 MB | ✅ Fine |
| 100,000 | ~400 MB | ⚠️ Storage cost |

**Mitigation:** Firestore TTL coverage plus stale-read cleanup and explicit exact-Answerlattice legacy cleanup keep the collection bounded without blocking answer retrieval or deleting another product's shared rows.

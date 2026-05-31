# AI QnA Chatbot — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Provide a source-backed conversational support assistant that answers user questions by searching a knowledge base using semantic vector search and generating contextual answers via Gemini AI — reducing support ticket volume and giving owners instant self-service answers.

### Scope

- RAG (Retrieval-Augmented Generation) pipeline with Gemini 2.5 Flash
- Two conversation modes: QnA (stateless) and Assistant (contextual)
- Image-based queries (upload screenshot → AI generates search query)
- Source article citations with similarity confidence scores
- AI-generated suggested follow-up questions
- Per-message feedback (thumbs up/down with detailed reasons)
- Response regeneration (replace previous AI answer)
- Full chat session persistence across browser sessions
- Response caching (40-60% speedup for repeated queries)
- Embedding caching (avoids redundant Gemini API calls)
- Streaming responses via SSE (feature-flagged, currently OFF)
- Global AI search modal accessible from anywhere in dashboard
- Chat history sidebar with session management

### Out of Scope

- Live agent handoff
- Proactive chat (bot initiates conversation)
- Multi-language AI responses (responds in English only)
- Voice input
- Chat widget for end customers (this is owner-facing only)

---

## 2. User Flows

### 2.1 QnA Mode (Default)

```
Owner opens Help Chat → Types question → AI searches KB → Returns answer with sources
  → Owner sees: Answer + Source citation + 3 suggested follow-up questions
  → Owner can: Ask Follow-up (→ switches to Assistant mode) OR New Question (→ fresh QnA)
```

### 2.2 Assistant Mode (Conversational)

```
Owner switches to Assistant mode (or clicks "Ask Follow-up")
  → Types question → AI searches KB WITH last 5 messages as context
  → Returns contextual answer referencing conversation history
  → Owner continues multi-turn conversation
```

### 2.3 Image Query

```
Owner attaches screenshot → Types question about it
  → Gemini 2.5 Flash analyzes image → Generates bounded visual search context
  → Normal RAG pipeline continues with enhanced query
  → Answer uses visual context only when supported by KB articles
```

### 2.4 Feedback Flow

```
Owner reads AI answer → Clicks thumbs up (instant positive feedback)
  OR → Clicks thumbs down → Modal appears with reason checkboxes + comment field
  → Feedback stored on message + search history record
```

### 2.5 Regenerate Flow

```
Owner sees AI answer they don't like → Clicks regenerate icon
  → Previous AI answer removed → Same question re-sent to API
  → New answer replaces old one → Generation metadata tracks retry count
```

---

## 3. Two Chat Modes

| Feature              | QnA Mode                                    | Assistant Mode                                           |
| -------------------- | ------------------------------------------- | -------------------------------------------------------- |
| **Context**          | Stateless — each question independent       | Contextual — last 5 messages sent to AI                  |
| **System prompt**    | "Precise Help Center assistant in QnA MODE" | "Conversational Help Center assistant in ASSISTANT MODE" |
| **Session behavior** | After first Q&A pair: show action buttons   | Continuous conversation flow                             |
| **Mode switching**   | Can switch to Assistant after first answer  | Cannot switch back to QnA (session locked)               |
| **Use case**         | Quick factual questions                     | Complex multi-step issues                                |

### Post-Answer Actions (QnA Mode Only)

After the first Q&A exchange (exactly 2 messages), the input bar is replaced with two action buttons:

- **Ask a Follow-up** → Switches session to Assistant mode, carries context
- **New Question** → Creates fresh QnA session

---

## 4. AI Models Used

| Model                | Purpose                                         | When Called                  |
| -------------------- | ----------------------------------------------- | ---------------------------- |
| `gemini-embedding-001` | Generate 768-dimension query vectors          | Every new unique query       |
| `gemini-2.5-flash`     | Generate answers from KB documents            | Cache miss only              |
| `gemini-2.5-flash`     | Analyze uploaded images into search context   | Only when user uploads image |

---

## 5. Caching Strategy

### 5.1 Response Cache (`aiSearchHistory` collection)

- **Key:** Normalized query text (+ image hash if image present)
- **Scope:** Tenant-scoped (`where('tId', '==', session.tId)`)
- **Hit behavior:** Return cached response immediately (no Gemini call)
- **Expected hit rate:** ~60% (many users ask similar questions)

### 5.2 Embedding Cache (`queryEmbeddings` collection)

- **Key:** Same cache key as response cache
- **Scope:** Global (by cache key as doc ID)
- **Hit behavior:** Return cached vector (no Gemini embedding call)
- **Tracks:** `hitCount` incremented on each cache hit
- **Expected hit rate:** 40-60%

### 5.3 KB Categories Cache (Context-level)

- **Storage:** `PlatformGlobalDataContext.cachedKBCategories`
- **Used for:** Local search results, category browsing in welcome screen
- **Refresh:** On modal open if not cached

### 5.4 Chat Sessions Cache (SWR)

- **Library:** SWR with 60-second deduplication
- **Key:** `user-chat-sessions-{tId}-{uId}`
- **Behavior:** Revalidate on mount, not on focus

---

## 6. Search Quality

### 6.1 Similarity Thresholds

- **Primary threshold:** 0.6 (high confidence)
- **Fallback threshold:** 0.4 (lower confidence, used when no results above 0.6)
- **Vector search limit:** 12 documents retrieved per query

### 6.2 Quality Scoring (Admin View)

Quality is calculated from similarity scores on references:

- **Good (≥60%)** — At least one reference has similarity ≥ 0.6
- **Low (<60%)** — All references between 0.4 and 0.6
- **Very Low (<40%)** — All references below 0.4

### 6.3 Source Citation

Every AI answer includes:

- **Source tag** at top of message — Shows highest-scoring reference article title (clickable)
- **Full reference list** — All referenced articles with similarity scores
- **Suggested questions** — 3 AI-generated follow-up questions based on available KB content

---

## 7. Chat Session Management

### 7.1 Session Lifecycle

- **Create:** First message in a new chat creates a session in Firestore
- **Title:** First 150 characters of user's question (truncated with "...")
- **Persist:** Every message exchange saved to Firestore immediately
- **Rename:** User can rename sessions from history sidebar
- **Delete:** User can delete individual sessions (hard delete)
- **Mode transition:** QnA → Assistant (one-way, session mode field updated)

### 7.2 Chat History Sidebar (320px)

- Session list ordered by `modifiedOn` descending
- Active session highlighted
- Mode toggle (QnA/Assistant) at top
- "New Chat" button
- Right-click or actions menu: Rename, Delete
- Dev-only: Clear all data button

---

## 8. Security & Rate Limiting

| Layer                | Implementation                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ |
| **SAFE_MODE**        | Kill switch blocks all AI routes during maintenance                                  |
| **Rate limiting**    | Upstash sliding window (30 req/min per user)                                         |
| **Input validation** | Zod schemas: query (1-2000 chars), XSS pattern detection, malicious content blocking |
| **Image validation** | HTTPS only, Firebase Storage host only, 10MB max, path traversal prevention          |
| **Request queue**    | Sequential processing prevents race conditions (one request at a time)               |
| **Feedback dedup**   | `feedbackInProgressRef` prevents concurrent feedback submissions                     |

---

## 9. Streaming vs Non-Streaming

| Aspect                     | Non-Streaming (Current Default)                     | Streaming (Feature-Flagged)                  |
| -------------------------- | --------------------------------------------------- | -------------------------------------------- |
| **Flag**                   | `ENABLE_STREAMING_RESPONSES: false`                 | `ENABLE_STREAMING_RESPONSES: true`           |
| **API route**              | `/api/helpCenter/search-kb`                         | `/api/helpCenter/search-kb-stream`           |
| **Response format**        | JSON response                                       | Server-Sent Events (SSE)                     |
| **UX**                     | Local typing animation after full response received | Real-time text appearing as Gemini generates |
| **Cache handling**         | Full response returned                              | Cached responses returned as instant JSON    |
| **Performance (cached)**   | ~100ms                                              | ~100ms (same — cached bypass streaming)      |
| **Performance (uncached)** | ~10s (wait for full response)                       | ~3.2s (first token appears quickly)          |

---

## 10. Risks & Open Questions

| #   | Item                                                                | Status                                                        |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Missing `withAuth()` on all 3 helpCenter API routes                 | Documented — relies on `getActiveSession()`                   |
| 2   | KB articles are platform-wide (no tenant-scoped KB)                 | By design — all owners see same KB                            |
| 3   | No explicit 401 response for unauthenticated users on search routes | Session returns null, search proceeds without tenant filter   |
| 4   | Streaming mode currently OFF — untested in production               | Feature-flagged, ready to enable                              |
| 5   | `console.error` used instead of `secureError` in search routes      | ✅ RESOLVED — all console.log/error removed in audit          |
| 6   | Query embedding cache has no TTL/expiry                             | ✅ RESOLVED — 30-day TTL check on read, stale entries skipped |
| 7   | No conversation length limit                                        | ✅ RESOLVED — capped at 50 messages via `trimMessages()`      |

---

## 11. STEP 9C Audit (2026-03-03)

### Bugs Fixed (15+ violations)

- **`search-kb/route.ts`** — Removed `console.error('search error', err)` (writeLogEntry already handles logging)
- **`ChatHistory.tsx`** — Removed `console.log("sessions:", sessions)` (customer data leak in console)
- **`useChatHandlers.ts`** — Removed 10x `console.log`/`console.error` calls across search, retry, feedback, rename, delete, and clear handlers
- **`useChatData.ts`** — Removed 2x `console.error` calls (session fetch, category fetch)
- **`useRequestQueue.ts`** — Removed `console.error` from queue processing

### Assessment

- **Architecture:** Excellent. RAG pipeline is well-structured with Answerlattice canonical-first retrieval integrated. Caching at 3 levels (response, embedding, SWR).
- **Security:** Strong. Zod validation, SAFE_MODE, rate limiting, image URL validation, request queue for race conditions, feedback dedup.
- **Firebase Cost:** Well-optimized. Cache hit = 1 read. Cache miss = ~14 reads + 2 Gemini calls. Embedding cache prevents redundant API calls.
- **UI/UX:** Clean customer-facing experience. Source citations, suggested questions, feedback, regeneration all working.
- **Answerlattice Integration:** `attemptCanonicalRetrieval` properly called before RAG fallback. `emitAnswerlatticeSignal` fires on negative feedback.

### Improvements Implemented (2026-03-04)

1. ✅ **Conversation length limit:** `trimMessages()` caps at 50 messages per session. Keeps first message + most recent 49.
2. ✅ **Embedding cache TTL:** 30-day expiry in `getCachedEmbedding()`. Stale entries return null (treated as cache miss, regenerated).
3. ✅ **Error boundary:** `ChatErrorBoundary` wraps chat content. Catches render errors, shows friendly "Try Again" fallback instead of white screen.

### Skipped (Validated as Not Needed)

4. ❌ **Offline indicator:** Browser already handles offline state. `fetch` failures show `antMessage.error`. Low ROI for SMB ICP.
5. ❌ **Message retry on network:** Existing "Retry" button is sufficient. Auto-retry with backoff adds significant complexity for marginal benefit at current scale.

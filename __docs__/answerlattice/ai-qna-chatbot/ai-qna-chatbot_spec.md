# AI QnA Chatbot — Product Specification

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Provide a governed support-answer runtime for SaaS users and support teams. Approved canonical answers and FAQs take priority; generated knowledge-base answers must remain workspace-scoped, source-backed, and able to refuse when the evidence is insufficient.

### Scope

- RAG (Retrieval-Augmented Generation) pipeline with Gemini 2.5 Flash
- Two conversation modes: QnA (stateless) and Assistant (contextual)
- Image-based queries (upload screenshot → AI generates search query)
- Valid source references for generated non-refusal knowledge-base answers
- AI-generated suggested follow-up questions
- Per-message feedback (thumbs up/down with detailed reasons)
- Response regeneration (replace previous AI answer)
- Full chat session persistence across browser sessions
- Response caching with source-version-aware invalidation
- Embedding caching (avoids redundant Gemini API calls)
- Streaming responses via SSE (feature-flagged, currently OFF)
- Authenticated Help Center search and embeddable widget surfaces
- Chat history sidebar with session management

### Out of Scope

- Live agent handoff
- Proactive chat (bot initiates conversation)
- Multi-language AI responses (responds in English only)
- Voice input
- Unrestricted account-changing actions
- Treating historical tickets, screenshots, or generated text as approved product truth

---

## 2. User Flows

### 2.1 QnA Mode (Default)

```
User opens Help Chat → Types question → Answerlattice checks canonical answer, FAQ, then KB
  → User sees: governed answer or source-backed fallback, optional sources, and optional follow-ups
  → User can: Ask Follow-up (→ switches to Assistant mode) OR New Question (→ fresh QnA)
```

### 2.2 Assistant Mode (Conversational)

```
User switches to Assistant mode (or clicks "Ask Follow-up")
  → Types question → AI searches KB WITH last 5 messages as context
  → Returns contextual answer referencing conversation history
  → Owner continues multi-turn conversation
```

### 2.3 Image Query

```
User attaches screenshot → Types question about it
  → Gemini 2.5 Flash analyzes image → Generates bounded visual search context
  → Normal RAG pipeline continues with enhanced query
  → Answer uses visual context only when supported by KB articles
```

### 2.4 Feedback Flow

```
User reads AI answer → Clicks thumbs up (instant positive feedback)
  OR → Clicks thumbs down → Modal appears with reason checkboxes + comment field
  → Feedback stored on message + search history record
```

### 2.5 Regenerate Flow

```
User sees AI answer they don't like → Clicks regenerate icon
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
| `gemini-embedding-2`   | Generate canonical 768-dimension query vectors | Every new unique query       |
| `gemini-2.5-flash`     | Generate answers from KB documents            | Cache miss only              |
| `gemini-2.5-flash`     | Analyze uploaded images into search context   | Only when user uploads image |

---

## 5. Caching Strategy

### 5.1 Response Cache (`aiSearchHistory` collection)

- **Key:** Normalized query text (+ image hash if image present)
- **Scope:** Tenant-scoped (`where('tId', '==', session.tId)`)
- **Hit behavior:** Return cached response immediately (no Gemini call)
- **Measurement:** Track actual tenant-scoped hit rate; do not publish an expected percentage.

### 5.2 Embedding Cache (`queryEmbeddings` collection)

- **Key:** Hash of the scoped search cache key
- **Scope:** Exact `pId + tId + sId`; mismatched stored scope is rejected
- **Hit behavior:** Return a valid fixed-dimension vector only when creation time exists, the 30-day window is fresh, and explicit expiry has not passed; otherwise miss and conditionally clean the exact snapshot
- **Measurement:** Track actual scoped reuse and provider-call avoidance.

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

### 6.2 Retrieval Similarity (Admin View)

The existing admin labels group vector-reference similarity. They do not prove factual correctness, completeness, freshness, or resolution:

- **Good (≥60%)** — At least one reference has similarity ≥ 0.6
- **Low (<60%)** — All references between 0.4 and 0.6
- **Very Low (<40%)** — All references below 0.4

### 6.3 Source Citation

Source behavior depends on the answer path:

- Approved canonical answers may be returned directly with governed answer metadata.
- Published FAQs may include their configured article references.
- A generated knowledge-base answer that is not a refusal must resolve at least one model-returned article ID to the exact prompt evidence set.
- Exact-only evidence does not receive a fabricated cosine-similarity score.
- Suggested questions are optional and capped at three.

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
| **Rate limiting**    | Shared AI-operation admission boundary; verify current runtime configuration before publishing a numeric limit |
| **Input validation** | Zod schemas: query (1-2000 chars), XSS pattern detection, malicious content blocking |
| **Image validation** | HTTPS Firebase Storage for authenticated uploads or validated inline widget images; 5 MB maximum |
| **Request queue**    | Sequential processing prevents race conditions (one request at a time)               |
| **Feedback dedup**   | `feedbackInProgressRef` prevents concurrent feedback submissions                     |

---

## 9. Current Delivery Contract

| Aspect | Current behavior |
|---|---|
| **API route** | `/api/helpCenter/search-kb` |
| **Response format** | Bounded JSON response with `Cache-Control: private, no-store` |
| **UX** | The client starts the local typing animation after the full validated response arrives |
| **Cache handling** | Fresh scoped response-cache hits return through the same JSON contract |
| **Streaming** | No maintained streaming route or streaming feature flag exists |
| **Performance** | Measure on representative workspaces before publishing a target |

---

## 10. Bounded Hybrid Evidence Fallback

The governed retrieval order remains:

1. approved canonical answer;
2. approved FAQ/custom answer;
3. knowledge-base fallback.

When `ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL` is enabled, the knowledge-base fallback may add one deterministic evidence lane to vector search. The lane runs only when the query contains a bounded exact technical literal, such as an error code, API path, configuration flag, command option, HTTP failure code, or product version, and canonical retrieval resolved at least one valid product entity.

The lane reads at most 12 active published articles from the exact `pId + tId + sId` workspace whose `entityIds` overlap the resolved entities. An article is eligible only when its title, tags, or body contains an exact query literal. Eligible exact/entity results and similarity-qualified vector results are deduplicated and fused deterministically. No planner, model reranker, broad corpus search, authority override, or autonomous learning is introduced.

The flag must remain off until the required index is deployed and representative Answer Tests show improved technical-question retrieval without citation, unsupported-claim, freshness, or abstention regressions.

## 11. Risks & Open Questions

| # | Item | Status |
|---|---|---|
| 1 | KB article reads must stay tenant/store scoped | Enforced by exact `pId + tId + sId` filters and response guards |
| 2 | Hybrid evidence index is not remotely verified in this worktree | Keep feature default off until deploy and readback succeed |
| 3 | Hybrid evidence quality is not proven with representative customer questions | Run Answer Tests before rollout |
| 4 | Post-save entity extraction is browser-triggered and has no durable retry lease | Treat extraction as best effort and monitor unmapped articles |
| 5 | Streaming behavior remains independently feature-flagged | Do not claim production readiness without surface testing |

---

## 12. STEP 9C Audit (2026-03-03)

### Bugs Fixed (15+ violations)

- **`search-kb/route.ts`** — Removed `console.error('search error', err)` (writeLogEntry already handles logging)
- **`ChatHistory.tsx`** — Removed `console.log("sessions:", sessions)` (customer data leak in console)
- **`useChatHandlers.ts`** — Removed 10x `console.log`/`console.error` calls across search, retry, feedback, rename, delete, and clear handlers
- **`useChatData.ts`** — Removed 2x `console.error` calls (session fetch, category fetch)
- **`useRequestQueue.ts`** — Removed `console.error` from queue processing

### Maintained Assessment

- Canonical and approved FAQ priority is enforced in the shared runtime.
- Generated non-refusal answers require at least one valid reference from the prompt evidence set.
- Firestore, provider, and latency costs are path-dependent and must be measured rather than inferred from document limits.
- Retrieval similarity is not an overall answer-quality score.
- Hybrid evidence retrieval remains default off pending remote index proof and representative Answer Tests.

### Improvements Implemented (2026-03-04)

1. ✅ **Conversation length limit:** `trimMessages()` caps at 50 messages per session. Keeps first message + most recent 49.
2. ✅ **Embedding cache TTL:** `getCachedEmbedding()` enforces valid creation time, the 30-day age window, and explicit expiry without waiting for asynchronous TTL. Invalid/stale entries return null and are regenerated; cleanup cannot delete a concurrent replacement.
3. ✅ **Error boundary:** `ChatErrorBoundary` wraps chat content. Catches render errors, shows friendly "Try Again" fallback instead of white screen.

### Skipped (Validated as Not Needed)

4. ❌ **Offline indicator:** Existing request failures remain the current boundary; a separate offline mode is not part of this feature.
5. ❌ **Message retry on network:** Existing "Retry" button is sufficient. Auto-retry with backoff adds significant complexity for marginal benefit at current scale.

# AI QnA Chatbot — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The AI QnA Chatbot is a **hybrid client-server feature**:

- **Client-side:** Chat UI, session management, feedback, SWR caching (Firestore client SDK via DAL)
- **Server-side:** RAG pipeline (3 API routes using Firestore Admin SDK + Gemini AI)
- **Cloud Functions:** Nightly analytics aggregation, feedback intelligence, weekly narratives

---

## 2. Complete File Map

### 2.1 API Routes (Server-Side)

| Method | Path                                | File                                                | Lines | Purpose                                                  |
| ------ | ----------------------------------- | --------------------------------------------------- | :---: | -------------------------------------------------------- |
| POST   | `/api/helpCenter/search-kb`         | `src/app/api/helpCenter/search-kb/route.ts`         |  129  | Auth wrapper → `coreSearch(mountContext: 'help_center')` |
| POST   | `/api/widget/search`                | `src/app/api/widget/search/route.ts`                |  125  | Auth wrapper → `coreSearch(mountContext: 'widget')`      |
| POST   | `/api/helpCenter/article-embedding` | `src/app/api/helpCenter/article-embedding/route.ts` |  63   | Article embedding generation                             |

**Core search pipeline:** `src/lib/search/searchCore.ts` — single source of truth for all Canonica search surfaces.

### 2.2 Chat UI Components

**Root:** `src/components/templates/main-app/helpChat/`

| File                         | Lines | Purpose                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | :---: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`                  |  199  | Main orchestrator — Modal (92vw, centered), two-panel layout (history 320px + chat flex). Manages: activeSessionId, currentMode, searchQuery, chatState (reducer), feedbackModal. Composes `useChatData` + `useChatHandlers` hooks. Post-answer QnA action buttons logic (show when mode=qna, messages=2, status≠loading/typing). |
| `ChatPanel.tsx`              |   —   | Chat panel layout — messages list + input + footer                                                                                                                                                                                                                                                                                |
| `ChatInput.tsx`              |   —   | Text input with image upload + QnA action buttons (follow-up/new question)                                                                                                                                                                                                                                                        |
| `ChatFooter.tsx`             |   —   | Footer with mode toggle                                                                                                                                                                                                                                                                                                           |
| `ChatHistory.tsx`            |   —   | Session history sidebar (320px) — session list, new chat, mode toggle, rename/delete                                                                                                                                                                                                                                              |
| `ConversationHeader.tsx`     |   —   | Session title + controls                                                                                                                                                                                                                                                                                                          |
| `MessageList.tsx`            |   —   | Scrollable message container                                                                                                                                                                                                                                                                                                      |
| `MessageBubble.tsx`          |   —   | Individual message — user/AI differentiation, source tag (best reference by similarity), typing animation, markdown rendering                                                                                                                                                                                                     |
| `MessageActions.tsx`         |   —   | Copy, regenerate, feedback action buttons                                                                                                                                                                                                                                                                                         |
| `MessageReferences.tsx`      |   —   | KB article references with similarity scores                                                                                                                                                                                                                                                                                      |
| `ModeToggle.tsx`             |   —   | QnA ↔ Assistant toggle                                                                                                                                                                                                                                                                                                            |
| `SuggestedQuestions.tsx`     |   —   | 3 AI-generated follow-up questions (clickable)                                                                                                                                                                                                                                                                                    |
| `WelcomeScreen.tsx`          |   —   | Initial state with KB category browsing                                                                                                                                                                                                                                                                                           |
| `TypingIndicator.tsx`        |   —   | Three-dot typing animation                                                                                                                                                                                                                                                                                                        |
| `ErrorMessage.tsx`           |   —   | Error display with retry option                                                                                                                                                                                                                                                                                                   |
| `FeedbackModal.tsx`          |   —   | Thumbs down detail modal — reason checkboxes + comment                                                                                                                                                                                                                                                                            |
| `LocalSearchResults.tsx`     |   —   | Client-side article search results                                                                                                                                                                                                                                                                                                |
| `SessionCard.tsx`            |   —   | Session card in history list                                                                                                                                                                                                                                                                                                      |
| `DevOnlyClearDataButton.tsx` |   —   | Dev-only: clear all chat data                                                                                                                                                                                                                                                                                                     |

**Hooks:**

| File                       | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | :---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/useChatData.ts`     |  103  | SWR-based data fetching — chat sessions (dedupe 60s, revalidate on mount) + KB categories (context-cached). Returns `chatSessions`, `setChatSessions`, `categoriesData`, `isLoadingSessions`.                                                                                                                                                                                                                                                               |
| `hooks/useChatHandlers.ts` |  650  | All action handlers — `onSendMessage`, `onRetry`, `handleRegenerate`, `handleFeedbackUp/Down/Submit`, `handleNewChat`, `handleSessionClick`, `handleModeChange`, `handleCopy`, `handleRenameSession`, `handleDeleteSession`, `handleStartFollowUp`, `handleClearAllData`. Uses refs for latest state, `useRequestQueue` for race prevention, `feedbackInProgressRef` for feedback dedup. Calls `searchKnowledgeBase()` via unified `coreSearch()` pipeline. |
| `hooks/useRequestQueue.ts` |  73   | Sequential request processing — array queue + boolean flag, `enqueue()` + `isProcessing()`. Prevents duplicate messages, lost messages, wrong session assignment.                                                                                                                                                                                                                                                                                           |

**API Client:**

| File           | Purpose                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `api.ts`       | Search API client — `searchKnowledgeBase()`, `submitSearchFeedback()`                                                                    |
| `apiTypes.ts`  | `SearchAPIResponseType` — { id, craftedAnswer, references[], suggestedQuestions[] }                                                      |
| `chatState.ts` | Chat state reducer — states: idle/loading/typing/success/error. Actions: SEARCH_START/SUCCESS/ERROR, TYPING_COMPLETE, SKIP_TYPING, RESET |
| `chatUtils.ts` | Utilities — `clearDraft()`, `detectSimilarQueries()`                                                                                     |
| `types.ts`     | Component-level types — `ChatMessage`, `ChatMode`                                                                                        |

**Styles & Docs:**

- `MessageBubble.module.scss` — Message bubble styling
- `README.md`, `ACCESSIBILITY.md`, `IMPLEMENTATION_SUMMARY.md`

### 2.3 AI Search Modal (Global)

**Root:** `src/components/organisms/AISearchModal/`

| File                                 | Purpose                      |
| ------------------------------------ | ---------------------------- |
| `index.tsx`                          | Modal orchestrator           |
| `AiSearchBarComponent.tsx`           | Main search bar with results |
| `SearchBar.tsx`                      | Input field                  |
| `SearchResultDisplay.tsx`            | Result rendering             |
| `LocalSearchResults.tsx`             | Client-side article matching |
| `ActionButtons.tsx`                  | Action buttons               |
| `BlinkingCursor.tsx`                 | Cursor animation             |
| `FeedbackModal.tsx`                  | Inline feedback              |
| `TypingIndicator.tsx`                | Typing animation             |
| `state.ts`                           | State management             |
| `types.ts`                           | Type definitions             |
| `AiSearchBarComponent.module.scss`   | Styles                       |
| `AiSearchBarComponentUI.module.scss` | UI styles                    |

### 2.4 Core Libraries

| File                                            | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/vectorEmbeddings/index.ts`             |  290  | **RAG Core** — `callGeminiEmbedding()` (`gemini-embedding-001`), `generateSearchQueryFromImage()` (`gemini-2.5-flash` vision context extraction), `callGeminiChat()` (`gemini-2.5-flash`, JSON output). Builds system instructions per mode (QnA/Assistant/Image). Conversation context from last 5 messages. Temperature=0.0, TopP=0.9, TopK=40. |
| `src/lib/vectorEmbeddings/articleEmbeddings.ts` |  19   | `extractPlainTextFromEditorContent()` — Recursive TipTap JSON → plain text. `extractEditortextForComparison()` — Lowercase + strip non-alphanumeric.                                                                                                                                                                                                    |
| `src/lib/validation/chatSchemas.ts`             |  147  | Zod schemas — `SearchRequestSchema` validates: query (1-2000 chars, XSS patterns), imageUrl (HTTPS, Firebase host), mode (qna/assistant), context (max 5 messages, alternating roles). 7 malicious pattern detections.                                                                                                                                  |

### 2.5 Database Layer

**Chat Sessions:** `src/database/chatSessions/index.ts` (663 lines)

| Function                                                  | Reads |  Writes   | Notes                                                          |
| --------------------------------------------------------- | :---: | :-------: | -------------------------------------------------------------- |
| `uploadChatImage(image, session)`                         |   0   | 1 storage | Tenant-scoped: `chatSessions/chatimages/{tId}/{sId}/{imageId}` |
| `saveChatSession(data)`                                   |   0   |     1     | `apiCallComposerClientWithoutLoader` (no global spinner)       |
| `updateChatSession(sessionId, updates)`                   |   0   |     1     | Merge update                                                   |
| `deleteChatSession(sessionId)`                            |   0   |     1     | Hard delete                                                    |
| `getUserChatSessions(session)`                            |   N   |     0     | `tId + uId`, ordered by modifiedOn desc                        |
| `getChatSessionById(sessionId)`                           |   1   |     0     | Admin use                                                      |
| `updateMessageFeedback(sessionId, messageId, feedback)`   |   1   |     1     | Read-modify-write on messages array                            |
| `updateSessionInternalNote(sessionId, noteJson, session)` |   0   |     1     | Admin TipTap notes                                             |
| `getAllChatSessionsForAdmin(session, filters)`            |  N+1  |     0     | Paginated + client-side search/feedback filter                 |
| `getChatStatistics(session, dateRange)`                   |   N   |     0     | Full scan (EXPENSIVE — use optimized)                          |
| `getTopQuestions(session, limitCount)`                    |   N   |     0     | Full scan                                                      |
| `getKnowledgeGaps(session)`                               |   N   |     0     | Full scan                                                      |
| `getChatVolumeOverTime(session, days)`                    |   N   |     0     | Date-range filtered                                            |

**Chat Analytics:** `src/database/chatAnalytics/index.ts` (683 lines)

| Function                                                |   Reads    | Writes | Notes                                       |
| ------------------------------------------------------- | :--------: | :----: | ------------------------------------------- |
| `getTodayLiveStats(session)`                            | N (today)  |   0    | Real-time today's data                      |
| `getChatStatisticsOptimized(session, days)`             |   ~30+N    |   0    | Hybrid: historical aggregate + today's live |
| `getTopQuestionsOptimized(session, days)`               |    ~30     |   0    | From aggregated docs                        |
| `getKnowledgeGapsOptimized(session, days)`              |    ~30     |   0    | From aggregated docs                        |
| `getChatVolumeOverTimeOptimized(session, days)`         |     ~N     |   0    | From aggregated docs                        |
| `getConversationsPaginated(session, pageSize, filters)` | pageSize+1 |   0    | Cost-controlled pagination                  |
| `aggregateDailyStats(session, date)`                    |  N (day)   |   1    | Daily aggregate doc creation                |
| `getLastAnalyticsUpdate(session)`                       |     1      |   0    | Data freshness check                        |

**AI Search History:** `src/database/aiSearchHistory/index.ts` (76 lines)

| Function                                        | Reads | Writes | Notes                          |
| ----------------------------------------------- | :---: | :----: | ------------------------------ |
| `addAiSearchHistory(data)`                      |   0   |   1    | Save full response for caching |
| `findCachedSearchByCacheKey(cacheKey, session)` |   1   |   0    | Cache lookup by key + tId      |
| `updateAiSearchHistoryWithFeedback(data)`       |   0   |   1    | Add feedback to search record  |

**Query Embeddings:** `src/database/queryEmbeddings/index.ts` (70 lines)

| Function                                       | Reads | Writes | Notes                                             |
| ---------------------------------------------- | :---: | :----: | ------------------------------------------------- |
| `getCachedEmbedding(cacheKey)`                 |   1   |   1    | Read + increment hitCount (uses `firestoreAdmin`) |
| `saveCachedEmbedding(cacheKey, query, vector)` |   0   |   1    | Cache 768-dim vector                              |

---

## 3. RAG Pipeline (Detailed Flow)

### 3.1 Non-Streaming (`/api/helpCenter/search-kb`)

```
1. SAFE_MODE check          → Dynamic import @lib/ops/safeMode
2. Parse + validate body    → SearchRequestSchema (Zod)
3. Rate limit               → checkAIOperationLimit() (Upstash)
4. Get session              → getActiveSession()
5. Image processing (if imageUrl):
   a. Validate URL          → HTTPS, Firebase Storage host, bucket path
   b. Fetch with timeout    → 10s timeout, AbortController
   c. Validate size         → 10MB max
   d. Convert to base64
   e. Generate bounded visual search context → generateSearchQueryFromImage() [Gemini 2.5 Flash]
6. Build cache key          → normalizeQuery(query) + optional ::IMAGE::hash(imageUrl)
7. Response cache check     → findCachedSearchByCacheKey(key, session)
   → HIT: Return cached response immediately
8. Embedding cache check    → getCachedEmbedding(key)
   → HIT: Use cached vector
   → MISS: callGeminiEmbedding(query) + saveCachedEmbedding()
9. Vector search            → firestoreAdmin.collection(KB_ARTICLES)
                               .where('status', '==', 'published')
                               .findNearest({
                                 vectorField: 'embedding',
                                 queryVector: vector,
                                 limit: 12,
                                 distanceMeasure: 'COSINE',
                                 distanceResultField: 'distance'
                               })
10. Similarity filter       → Primary: >0.6, Fallback: >0.4
11. Prepare Gemini payload  → Extract plain text from TipTap JSON per article
12. Answer generation       → callGeminiChat(query, docs, imageContext?, conversationHistory?)
    → Model: gemini-2.5-flash
    → Temperature: 0.0
    → Output: JSON { craftedAnswer, references[], suggestedQuestions[] }
13. Enrich references       → Map referenced doc IDs to full article data with scores
14. Save to history         → addAiSearchHistory({ query, cacheKey, craftedAnswer, references })
15. Log performance         → writeLogEntry with per-step timing
16. Return response         → { ...response, id: savedHistory.id }
```

### 3.2 Streaming (`/api/helpCenter/search-kb-stream`)

Same pipeline steps 1-11, then:

```
12. Create TransformStream + SSE writer
13. Stream answer generation → callGeminiChatStream() with onChunk callback
    → Each text chunk: sendEvent('answer_delta', { text })
    → On complete: sendEvent('answer_complete', { references, suggestedQuestions })
14. Save to history (async, after stream completes)
15. Return ReadableStream with SSE headers
```

### 3.3 Frontend Send Flow

```
useChatHandlers.onSendMessage(content, image?, targetMode?)
  → Check isProcessing() — prevent rapid sends
  → enqueue request to useRequestQueue
  → Upload image if base64 (uploadChatImage with tenant-scoped path)
  → Create user message object (id, role, content, timestamp, image)
  → Optimistic UI update (add user message to session immediately)
  → Create temp session if new chat (id=null, title=first 150 chars)
  → dispatchChatState('SEARCH_START')
  → performSearch() — routes to streaming or non-streaming based on flag:
    → FEATURE_FLAGS.ENABLE_STREAMING_RESPONSES ?
      → searchKnowledgeBaseStream() with SSE event handlers
      → STREAMING_START → STREAMING_UPDATE (per chunk) → STREAMING_COMPLETE
    : searchKnowledgeBase() → returns full response
  → Create AI message (craftedAnswer, references, suggestedQuestions)
  → If existing session: update messages array + persist to Firestore
  → If new session: saveChatSession() to Firestore, set activeSessionId
  → clearDraft()
  → dispatchChatState('SEARCH_SUCCESS', { messageId })
  → Typing animation starts (25ms per character timer)
```

---

## 4. Gemini Configuration

### 4.1 Embedding Model

- **Model:** `gemini-embedding-001`
- **Dimensions:** 768
- **Input format:** Plain text (extracted from TipTap JSON)
- **Article embedding input:** `Category: {cat}\nSection: {sec}\nTitle: {title}\nContent: {text}`

### 4.2 Chat Model

- **Model:** `gemini-2.5-flash`
- **Temperature:** 0.0 (deterministic)
- **Top P:** 0.9
- **Top K:** 40
- **Response MIME:** `application/json`
- **Output schema:** `{ craftedAnswer: string, references: string[], suggestedQuestions: string[] }`

### 4.3 Image Model

- **Model:** `gemini-2.5-flash`
- **Purpose:** Generate bounded keyword-rich visual search context from user question + uploaded image
- **Input:** Text prompt + inline image (base64)

### 4.4 System Instructions (3 variants)

**QnA Mode:**

> "You are a precise Help Center assistant in QnA MODE. Answer ONLY using the provided documents."

**Assistant Mode:**

> "You are a conversational Help Center assistant in ASSISTANT MODE. Use conversation history to provide contextual, personalized answers."

**Image Mode:**

> "A user has provided an image and a question. Answer ONLY using the provided documents, using the image context only to interpret the user's situation."

All variants include:

- Markdown formatting instructions (numbered lists, bold, code blocks)
- Graceful failure rule (acknowledge limitation, suggest alternatives)
- Suggested questions rules (from available documents, not invented topics)

---

## 5. State Management

### 5.1 Chat State Reducer (`chatState.ts`)

| State       | Meaning                                      |
| ----------- | -------------------------------------------- |
| `idle`      | No active operation                          |
| `loading`   | Search in progress                           |
| `typing`    | AI answer received, typing animation playing |
| `streaming` | SSE streaming in progress                    |
| `success`   | Search complete, typing done                 |
| `error`     | Search failed                                |

| Action               | Transition                |
| -------------------- | ------------------------- |
| `SEARCH_START`       | → loading                 |
| `SEARCH_SUCCESS`     | → typing (with messageId) |
| `SEARCH_ERROR`       | → error                   |
| `TYPING_COMPLETE`    | → success                 |
| `SKIP_TYPING`        | → success (immediate)     |
| `STREAMING_START`    | → streaming               |
| `STREAMING_UPDATE`   | streaming (update text)   |
| `STREAMING_COMPLETE` | → success                 |
| `RESET`              | → idle                    |

---

## 6. Identified Issues

| #   | Issue                                                   | Severity | File:Line                                                                       | Notes                          |
| --- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- | ------------------------------ |
| 1   | No `withAuth()` on search API routes                    | Medium   | `search-kb/route.ts`, `search-kb-stream/route.ts`, `article-embedding/route.ts` | Relies on `getActiveSession()` |
| 2   | `console.error` used instead of structured logging      | Resolved | `search-kb/route.ts`, `vectorEmbeddings/index.ts`                               | Image query errors use `writeLogEntry` and degrade gracefully |
| 3   | Query embedding cache has no TTL                        | Low      | `queryEmbeddings/index.ts`                                                      | Grows indefinitely             |
| 4   | No conversation length limit                            | Low      | `useChatHandlers.ts`                                                            | Messages array grows unbounded |
| 5   | `updateMessageFeedback` is read-then-write (not atomic) | Low      | `chatSessions/index.ts:192`                                                     | Concurrent updates could drift |
| 6   | Streaming mode untested in production                   | Medium   | Feature-flagged OFF                                                             | Should test before enabling    |
| 7   | Commented-out vector search code                        | Trivial  | `search-kb/route.ts:252-266`                                                    | Dead code                      |

---

## 7. Reverse Engineering Validation

### 7.1 File Coverage

| Category                   |      Count       |  Verified   |
| -------------------------- | :--------------: | :---------: |
| API routes                 |        3         |     ✅      |
| Chat UI components         |        19        |     ✅      |
| AI Search Modal components |        13        |     ✅      |
| Hooks                      |        3         |     ✅      |
| API client files           |        5         |     ✅      |
| Core libraries             |        3         |     ✅      |
| DAL files                  | 4 (25 functions) |     ✅      |
| Types                      |        2         |     ✅      |
| Cloud Functions            |        3         |     ✅      |
| Styles/docs                |        4         |     ✅      |
| **Total**                  |   **59 files**   | **✅ 100%** |

### 7.2 Data Flow Verification

| Flow                             | Start → End                                                                                                                    | Verified |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | :------: |
| User types question → AI answers | ChatInput → useChatHandlers.onSendMessage → api.ts → search-kb/route.ts → vectorEmbeddings → Gemini → response → MessageBubble |    ✅    |
| Image query                      | ChatInput (image) → uploadChatImage → search-kb (tenant-scoped imageUrl) → generateSearchQueryFromImage → vector search → answer with bounded visual context |    ✅    |
| Feedback up                      | MessageActions → handleFeedbackUp → submitSearchFeedback → updateMessageFeedback                                               |    ✅    |
| Feedback down                    | MessageActions → handleFeedbackDown → FeedbackModal → handleFeedbackSubmit → submitSearchFeedback                              |    ✅    |
| Regenerate                       | MessageActions → handleRegenerate → onRetry (regenerate mode) → search API → replace message                                   |    ✅    |
| Mode switch                      | QnA actions "Ask Follow-up" → handleStartFollowUp → setCurrentMode('assistant')                                                |    ✅    |
| Session persist                  | saveChatSession / updateChatSession → Firestore chatSessions                                                                   |    ✅    |
| Cache hit                        | search-kb → findCachedSearchByCacheKey → return cached response                                                                |    ✅    |
| Embedding cache                  | search-kb → getCachedEmbedding → return cached vector                                                                          |    ✅    |

# AI QnA Chatbot — Technical Implementation Blueprint

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The AI QnA Chatbot is a **hybrid client-server feature**:

- **Client-side:** Chat UI, session management, feedback, and SWR caching through existing DAL boundaries
- **Server-side:** Shared canonical-first search pipeline used by authenticated Help Center and API-key/widget wrappers
- **Cloud Functions:** Nightly analytics aggregation, feedback intelligence, weekly narratives

---

## 2. Complete File Map

### 2.1 API Routes (Server-Side)

| Method | Path                                | File                                                | Lines | Purpose                                                  |
| ------ | ----------------------------------- | --------------------------------------------------- | :---: | -------------------------------------------------------- |
| POST   | `/api/helpCenter/search-kb`         | `src/app/api/helpCenter/search-kb/route.ts`         |  129  | Auth wrapper → `coreSearch(mountContext: 'help_center')` |
| POST   | `/api/widget/search`                | `src/app/api/widget/search/route.ts`                |  125  | Auth wrapper → `coreSearch(mountContext: 'widget')`      |
| POST   | `/api/helpCenter/article-embedding` | `src/app/api/helpCenter/article-embedding/route.ts` |  63   | Article embedding generation                             |

**Core search pipeline:** `src/lib/search/searchCore.ts` — single source of truth for all Answerlattice search surfaces.

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
| `helpChatDiagnostics.ts`     |   —   | Bounded secure diagnostics for draft storage failures, duplicate feedback guards, and feedback submission failures                                                                                                                                                                                                                 |

**Hooks:**

| File                       | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | :---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/useChatData.ts`     |  103  | SWR-based data fetching — chat sessions (dedupe 60s, revalidate on mount) + KB categories (context-cached). Returns `chatSessions`, `setChatSessions`, `categoriesData`, `isLoadingSessions`.                                                                                                                                                                                                                                                               |
| `hooks/useChatHandlers.ts` |  650  | All action handlers — `onSendMessage`, `onRetry`, `handleRegenerate`, `handleFeedbackUp/Down/Submit`, `handleNewChat`, `handleSessionClick`, `handleModeChange`, `handleCopy`, `handleRenameSession`, `handleDeleteSession`, `handleStartFollowUp`, `handleClearAllData`. Uses refs for latest state, `useRequestQueue` for race prevention, `feedbackInProgressRef` for feedback dedup. Calls `searchKnowledgeBase()` via unified `coreSearch()` pipeline. |
| `hooks/useRequestQueue.ts` |  73   | Sequential request processing — array queue + boolean flag, `enqueue()` + `isProcessing()`. Prevents duplicate messages, lost messages, wrong session assignment.                                                                                                                                                                                                                                                                                           |

`handleCopy` uses `src/lib/answerlattice/supportClipboard.ts` through the local `copyHelpChatMessageToClipboard()` wrapper. It checks Clipboard API support, falls back to a textarea copy path only when available, treats the fallback as successful only when `document.execCommand('copy')` returns `true`, and routes unavailable or rejected copy attempts through fixed `help_chat_message_copy_failed` diagnostics with bounded message/session/text metadata plus clipboard/fallback support booleans only.

**API Client:**

| File           | Purpose                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `api.ts`       | Search API client — `searchKnowledgeBase()`, `submitSearchFeedback()`                                                                    |
| `apiTypes.ts`  | `SearchAPIResponseType` — { id, craftedAnswer, references[], suggestedQuestions[] }                                                      |
| `chatState.ts` | Chat state reducer — states: idle/loading/typing/success/error. Actions: SEARCH_START/SUCCESS/ERROR, TYPING_COMPLETE, SKIP_TYPING, RESET |
| `chatUtils.ts` | Utilities — `clearDraft()`, `detectSimilarQueries()`                                                                                     |
| `types.ts`     | Component-level types — `ChatMessage`, `ChatMode`                                                                                        |

### 2.2.1 Client Diagnostic Contract

HelpChat client diagnostics use `src/components/templates/main-app/helpChat/helpChatDiagnostics.ts`.

Guarded failure codes:

- `help_chat_draft_clear_failed`
- `help_chat_draft_load_failed`
- `help_chat_draft_save_failed`
- `help_chat_feedback_duplicate_ignored`
- `help_chat_feedback_up_submit_failed`
- `help_chat_feedback_down_submit_failed`
- `help_chat_message_copy_failed`
- `help_chat_message_copy_clipboard_unavailable`
- `help_chat_message_copy_fallback_failed`
- `help_chat_session_persist_failed`
- `help_chat_related_article_open_failed`
- `help_chat_related_article_open_blocked`

Diagnostics record only bounded session/message/search-history/tenant/store/article/link presence and length metadata, fixed session-persist reason labels, reason counts, comment presence, feedback in-progress counts, related-article counts, message counts, and normalized source error name/code/status. Failed existing-session persistence after send/retry remains non-blocking for the chat UI, but it must emit `help_chat_session_persist_failed` instead of silently swallowing the Firestore merge failure. Diagnostics must not direct-console raw localStorage exceptions, message IDs, session IDs, search history IDs, owner/user text, feedback comments, image base64 data, tenant/store IDs, article URLs, or provider/browser exception objects.

`npm run verify:public-business-truth` enforces the HelpChat diagnostic contract. This changes diagnostics only; the RAG pipeline, canonical-first retrieval doctrine, API contracts, Firestore collections, Storage usage, and Answerlattice tenant shape are unchanged.

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

`ActionButtons.tsx` uses the shared Answerlattice support clipboard helper before showing "Answer copied" feedback. Failed AI Search answer copy records fixed `ai_search_answer_copy_failed` diagnostics with answer length, search-history presence, and clipboard/fallback support booleans only.

`src/components/organisms/ArticleView/index.tsx` uses the same helper for article-link copy. The shared renderer keeps bounded `article_view_link_copy_failed` diagnostics and now records both Clipboard API support and textarea fallback support before showing fixed failure copy.

### 2.4 Core Libraries

| File                                            | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/vectorEmbeddings/index.ts`             |  290  | **RAG Core** — `callGeminiEmbedding()` (`gemini-embedding-2`, canonical 768-dimension vector contract), `generateSearchQueryFromImage()` (`gemini-2.5-flash` vision context extraction), `callGeminiChat()` (`gemini-2.5-flash`, JSON output). Builds system instructions per mode (QnA/Assistant/Image). Conversation context from last 5 messages. Temperature=0.0, TopP=0.9, TopK=40. |
| `src/lib/vectorEmbeddings/articleEmbeddings.ts` |  19   | `extractPlainTextFromEditorContent()` — Recursive TipTap JSON → plain text. `extractEditortextForComparison()` — Lowercase + strip non-alphanumeric.                                                                                                                                                                                                    |
| `src/lib/validation/chatSchemas.ts`             |  147  | Zod schemas — `SearchRequestSchema` validates: query (1-2000 chars, XSS patterns), imageUrl (HTTPS, Firebase host), mode (qna/assistant), context (max 5 messages, alternating roles). 7 malicious pattern detections.                                                                                                                                  |
| `src/lib/answerlattice/supportClipboard.ts`     |   —   | Browser-local copy acknowledgement helper shared by HelpChat message copy, AI Search answer copy, and ArticleView link copy. It waits for Clipboard API success or acknowledged textarea fallback success before the UI shows copied feedback.                                                                                                                   |

### 2.5 Database Layer

**Chat Sessions:** `src/database/chatSessions/index.ts` (663 lines)

| Function                                                  | Reads |  Writes   | Notes                                                          |
| --------------------------------------------------------- | :---: | :-------: | -------------------------------------------------------------- |
| `uploadChatImage(image, session)`                         |   0   | 1 storage | Tenant-scoped: `chatSessions/chatimages/{tId}/{sId}/{imageId}` |
| `saveChatSession(data)`                                   |   0   |     1     | `apiCallComposerClientWithoutLoader` (no global spinner); new-session UI requires a saved session acknowledgement |
| `updateChatSession(sessionId, updates)`                   |   0   |     1     | Merge update with explicit `{ success, sessionId, updatedFields }` acknowledgement |
| `deleteChatSession(sessionId)`                            |   1   |     1     | Transaction-current hard delete with explicit acknowledgement; tenant/store-scoped images are retained because one session cannot prove cross-session non-reference |
| `getUserChatSessions(session)`                            |   N   |     0     | `tId + uId`, ordered by modifiedOn desc                        |
| `getChatSessionById(sessionId)`                           |   1   |     0     | Admin use                                                      |
| `updateMessageFeedback(sessionId, messageId, feedback)`   |   1   |     1     | Read-modify-write on messages array; returns explicit `{ success, sessionId, messageId }` acknowledgement |
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

**AI Search History:** `src/database/aiSearchHistory/server.ts` for server-owned cache persistence and `src/database/aiSearchHistory/index.ts` for authenticated actor feedback

| Function                                              | Reads | Writes | Notes |
| ----------------------------------------------------- | :---: | :----: | ----- |
| `addAiSearchHistoryServer(data)`                      |   0   |   1    | Admin SDK write of the compact cache response; the persisted cache key is SHA-256 hashed |
| `findCachedSearchByCacheKeyServer(cacheKey, session)` |   1   |   0    | Admin SDK lookup by hashed cache key plus exact `pId + tId + sId` scope |
| `updateAiSearchHistoryWithFeedback(data)`             |   1   |   1    | Client transaction verifies the current actor and exact scope before adding feedback; returns explicit `{ success, searchHistoryId, updatedFields }` acknowledgement |

HelpChat answer feedback requires both write acknowledgements before local feedback state or thank-you copy advances. `submitSearchFeedback()` asserts the `aiSearchHistory` feedback update and the chat-session message feedback mirror, then emits the negative-feedback signal only after both writes are acknowledged. Failed or malformed acknowledgement results route through the existing bounded HelpChat feedback failure diagnostics.

HelpChat session deletion is optimistic for responsiveness but requires `assertChatSessionDeleteSucceeded()` before success copy. If the delete acknowledgement is missing or malformed, the handler reloads chat sessions and restores the previously active session/search state instead of leaving an unconfirmed deletion visible.

The development-only bulk-clear control deletes only the current user's loaded sessions. It passes those bounded IDs through `deleteChatSession()` sequentially, preserves partial acknowledgements, removes only acknowledged IDs from local state, and never attempts client deletion of server-owned `aiSearchHistory` or `queryEmbeddings` rows. This keeps local/QA behavior on the same separate-Answerlattice Firebase and tenant/storage boundary as normal chat deletion.

**Query Embeddings:** `src/database/queryEmbeddings/index.ts`

| Function                                       | Reads | Writes | Notes                                             |
| ---------------------------------------------- | :---: | :----: | ------------------------------------------------- |
| `getCachedEmbedding(cacheKey)`                 |   1   |  0-1   | Read exact scoped vector; missing creation time, age over 30 days, or explicit expiry returns null and attempts snapshot-preconditioned cleanup with bounded failure diagnostics |
| `saveCachedEmbedding(cacheKey, query, vector)` |   0   |   1    | Cache 768-dim vector with 30-day retention fields |

---

## 3. RAG Pipeline (Detailed Flow)

### 3.1 Non-Streaming (`/api/helpCenter/search-kb`)

```
1. Auth wrapper             → withAuth()
2. Rate limit               → checkAIOperationLimit()
3. Parse bounded body       → 64 KB maximum
4. Validate request         → SearchRequestSchema (Zod)
5. Resolve AL scope         → exact tId + sId from the authenticated session
6. Start support accounting → settle actual provider operations after the result
7. Core SAFE_MODE check
8. Image processing (if imageUrl):
   a. Validate URL          → HTTPS, Firebase Storage host, bucket path
   b. Fetch with timeout    → 10s timeout, AbortController
   c. Validate size         → 5 MB max
   d. Convert to base64
   e. Generate bounded visual search context → generateSearchQueryFromImage() [Gemini 2.5 Flash]
9. Build scoped cache key   → query + image/context/mode + KB/canonical source versions
10. Response cache check    → findCachedSearchByCacheKeyServer(key, scope)
   → HIT: Return cached response immediately
11. Canonical lookup        → approved canonical answer remains authoritative
12. Approved FAQ lookup     → deterministic fallback before RAG
13. Published-KB check      → skip provider work when no published article exists
14. Embedding cache check   → getCachedEmbedding(key, scope)
   → HIT: Use cached vector
   → MISS: callGeminiEmbeddingWithMetadata(query, { purpose: 'query' })
           + saveCachedEmbedding(key, query, vector, scope)
15. Vector search           → firestoreAdmin.collection(KB_ARTICLES)
                               .where('pId', '==', 'AL')
                               .where('tId', '==', tId)
                               .where('sId', '==', sId)
                               .where('status', '==', 'published')
                               .where('active', '==', true)
                               .findNearest({
                                 vectorField: 'embedding',
                                 queryVector: vector,
                                 limit: 12,
                                 distanceMeasure: 'COSINE',
                                 distanceResultField: 'distance'
                               })
16. Similarity filter       → Primary: >0.6, fallback: >0.4
17. Optional hybrid lane    → Default-off exact literal + resolved entity query;
                               exact scope, active/published only, maximum 12 docs
18. Deterministic fusion    → Weighted reciprocal-rank fusion; no model reranker
19. Prepare Gemini payload  → At most six bounded article contexts
20. Answer generation       → callGeminiChatWithMetadata(...)
    → Model: gemini-2.5-flash
    → Temperature: 0.0
    → Output: JSON { craftedAnswer, references[], suggestedQuestions[] }
21. Reference enforcement   → Non-refusal generated answers require a valid source reference
22. Save to history         → scoped aiSearchHistory cache
23. Log bounded metrics     → timings, route context, provider-operation metadata
24. Settle accounting       → actual provider operations only
25. Return private response → Cache-Control: private, no-store
```

### 3.2 Current Delivery Mode

The current HelpChat client uses `POST /api/helpCenter/search-kb` and receives one bounded JSON response. There is no maintained `search-kb-stream` route, streaming feature flag, or streaming chat reducer state.

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
  → performSearch() → searchKnowledgeBase() → POST /api/helpCenter/search-kb
  → Read and validate the bounded JSON response
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

- **Model:** `gemini-embedding-2`
- **Dimensions:** 768
- **Query format:** `task: question answering | query: {query}`
- **Article embedding input:** `title: {title} | text: Category: {cat}\nSection: {sec}\nTitle: {title}\nContent: {text}`
- **Storage field/cache version:** `embedding` / `gemini-embedding-2:768:v1`

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
| `success`   | Search complete, typing done                 |
| `error`     | Search failed                                |

| Action               | Transition                |
| -------------------- | ------------------------- |
| `SEARCH_START`       | → loading                 |
| `SEARCH_SUCCESS`     | → typing (with messageId) |
| `SEARCH_ERROR`       | → error                   |
| `TYPING_COMPLETE`    | → success                 |
| `SKIP_TYPING`        | → success (immediate)     |
| `RESET`              | → idle                    |

---

## 6. Current Constraints

| Constraint | Current control | Release implication |
|---|---|---|
| Hybrid evidence is not yet rollout-proven | Default-off feature flag plus focused retrieval contracts | Keep disabled until representative Answer Tests pass and both required indexes are deployed and read back |
| Post-save entity extraction has no durable retry lease | Best-effort browser trigger; article save remains authoritative | Failed extraction must remain visible for manual retry or later queue design |
| Exact/entity evidence can increase retrieval recall but also introduce weak context | Exact literal admission, resolved entities, source scope, bounded fusion, and reference enforcement | Block rollout on unsupported-claim, citation, freshness, or abstention regression |
| Provider and Firestore pricing can change | Operation-shape documentation and runtime accounting | Recalculate from measured usage before packaging claims |
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
| Cache hit                        | search-kb → findCachedSearchByCacheKeyServer → return projected cached response                                                 |    ✅    |
| Embedding cache                  | search-kb → getCachedEmbedding → return cached vector                                                                          |    ✅    |

### 7.3 Feature 16 Widget Runtime Addendum

The widget wrapper is not a raw serialization of `coreSearch()`:

- `src/app/api/widget/search/route.ts` positively projects public citations and related-content labels, reports `imageProcessed`, and exposes only a bounded `fallbackSuggested` boolean.
- `src/app/api/widget/feedback/route.ts` returns the authoritative persisted `resolutionOutcome`, `isGood`, and replay/new-write state.
- `src/app/api/widget/escalation/route.ts` accepts only a stored widget search-history ID plus reply email and optional name/details after key, scope, origin/runtime-token, rate-limit, body-size, and schema admission.
- `src/lib/answerlattice/widgetEscalationServer.ts` creates one deterministic support ticket and derives all internal evidence from the persisted history row.
- `src/app/widget/[apiKey]/WidgetClient.tsx` turns related content into follow-up searches, discloses image-processing fallback, and confirms only ticket creation.

This explicit fallback path does not require `ENABLE_ANSWERLATTICE_AI_ESCALATION`. The automatic evaluator and authenticated Help Chat suggestion path remain flag-gated.

---

## 8. Bounded Hybrid Evidence Retrieval

`src/lib/answerlattice/hybridEvidenceRetrieval.ts` owns the pure technical-literal extraction, exact entity-evidence qualification, and reciprocal-rank fusion helpers. `src/lib/search/searchCore.ts` remains the single runtime pipeline.

Runtime contract:

1. Canonical answers and approved FAQs keep priority.
2. Vector search keeps its existing 12-document limit and similarity thresholds.
3. The entity lane runs only when `ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL` is enabled, the effective query contains at least one bounded technical literal, and canonical retrieval produced at least one normalized resolved entity ID.
4. The additional Firestore query is scoped to `pId = AL`, exact `tId`, exact `sId`, `status = published`, `active = true`, and `entityIds array-contains-any` over at most 10 resolved IDs. It reads at most 12 articles.
5. An entity-query result is admitted only when its title, tags, or extracted TipTap body contains an exact technical literal from the query.
6. Similarity-qualified vector ranks and exact/entity ranks are fused deterministically, deduplicated by article ID, and capped before the existing six-document prompt boundary.
7. Exact-only references do not invent a cosine similarity score. Existing vector references retain their real cosine score.
8. Query text and article bodies are not added to logs. Metrics record only lane eligibility, candidate/match counts, and duration.

The feature is default off. Rollout requires the composite index in both maintained manifests, remote deployment/readback, and representative Answer Tests covering exact error codes/API paths plus ordinary-language negative controls. A failed entity query degrades to the existing vector path.

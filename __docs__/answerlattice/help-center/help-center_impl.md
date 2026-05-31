# Help Center — Technical Implementation Blueprint

> **Version:** 1.0.1
> **Last Updated:** 2026-05-25
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Help Center is a **multi-layered feature** spanning frontend components, API routes, database layer (DAL), Cloud Functions, and AI services. It follows MenuList's standard patterns:

- **Frontend:** Next.js 14 App Router + Ant Design + TipTap Editor
- **Backend:** Next.js API routes (for AI operations requiring server-side secrets)
- **Database:** Firestore client SDK via DAL pattern (for CRUD operations)
- **AI:** Gemini 2.5 Flash (chat), Gemini 2.5 Pro (image analysis), text-embedding-004 (embeddings)
- **Cloud Functions:** Nightly aggregation, article embedding, AI intelligence
- **Caching:** Firestore-based embedding cache + response cache

---

## 2. Complete File Map

### 2.1 Pages (Next.js App Router)

| Route                       | File                                                                | Component           |
| --------------------------- | ------------------------------------------------------------------- | ------------------- |
| `/help-center`              | `src/app/(main)/help-center/page.tsx`                               | `HelpCenter`        |
| `/platform/support-tickets` | `src/app/(main)/(platform-pages)/platform/support-tickets/page.tsx` | `SupportTickets`    |
| `/platform/changelog`       | `src/app/(main)/platform/changelog/page.tsx`                        | `ChangelogTemplate` |

**Note:** Chat Management, Knowledge Base, and KB Generation are accessed via platform navigation tabs, not dedicated routes.

### 2.2 Unified Search Core (Shared Infrastructure)

| File                           | Purpose                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `src/lib/search/searchCore.ts` | **Canonical search pipeline** — single source of truth for ALL Answerlattice search surfaces (Help Center + Widget + future) |
| `src/lib/search/types.ts`      | Shared types: `CoreSearchInput`, `CoreSearchResult`, `SearchMountContext`                                               |

Both the Help Center route and Widget route are **thin auth wrappers** that call `coreSearch()`. All retrieval logic (canonical, RAG, entity enrichment, caching, logging) lives in `searchCore.ts`.

### 2.3 API Routes

| Method | Path                                | File                                                | Purpose                                                  |
| ------ | ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| POST   | `/api/helpCenter/search-kb`         | `src/app/api/helpCenter/search-kb/route.ts`         | Auth wrapper → `coreSearch(mountContext: 'help_center')` |
| POST   | `/api/helpCenter/article-embedding` | `src/app/api/helpCenter/article-embedding/route.ts` | Generate & store article embeddings                      |
| POST   | `/api/widget/search`                | `src/app/api/widget/search/route.ts`                | Auth wrapper → `coreSearch(mountContext: 'widget')`      |

### 2.4 Owner-Side Help Center Components

**Root:** `src/components/templates/main-app/helpCenter/`

| File                         | Lines | Purpose                                                                               |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------- |
| `index.tsx`                  | 58    | Main Help Center container with tab routing                                           |
| `tabsConfig.tsx`             | 88    | Tab definitions: KB, Tickets, Feedback, FAQ, Contact, Changelog. Governance tabs are intentionally excluded. |
| `HeroSearchBar.tsx`          | —     | Search bar connecting to AI chat + tab navigation                                     |
| `MainSectionTabs.tsx`        | —     | Tab grid navigation cards                                                             |
| `ChangelogView.tsx`          | —     | Changelog viewer (reads from DAL)                                                     |
| `ContactUsView.tsx`          | —     | Escalation chooser: ticket, assistant, feedback, support email, partnership email      |
| `FaqView.tsx`                | —     | Published Answerlattice FAQ display with article links and feedback; static fallback       |
| `src/lib/answerlattice/faqRetrieval.ts` | — | Deterministic owner FAQ/custom-answer retrieval after canonical miss and before RAG fallback |
| `ShareFeedbackView.tsx`      | 164   | 3-step feedback wizard (general → usage → requests)                                   |
| `GeneralFeedback.tsx`        | 30    | Step 1: Star rating + comment                                                         |
| `FeatureUsage.tsx`           | —     | Step 2: Feature issues checklist                                                      |
| `FeatureRequests.tsx`        | 88    | Step 3: Feature request + popular request voting                                      |
| `TicketView.tsx`             | —     | Ticket submission and history (owner side)                                            |
| `TicketItem.tsx`             | —     | Individual ticket card                                                                |
| `TicketHistoryView.tsx`      | —     | Ticket detail with messages                                                           |
| Governance components        | —     | Not mounted in Help Center. `AnswerlatticeCoverageKPI`, `MutationProposalReview`, `EntityCandidateReview`, and `GovernanceHub` belong to Answerlattice owner/admin routes. |

**Landing subcomponents:** `landing/`

| File                   | Purpose                          |
| ---------------------- | -------------------------------- |
| `index.tsx`            | Landing page layout              |
| `Breadcrumbs.tsx`      | Navigation breadcrumbs           |
| `BrowseCategories.tsx` | Category grid for KB exploration |
| `LandingFooter.tsx`    | Footer section                   |
| `RecentlyViewed.tsx`   | Recently viewed articles         |
| `RunningTickets.tsx`   | Active ticket summary            |
| `TrendingTopics.tsx`   | Popular search topics            |
| `WhatsNew.tsx`         | Recent changelog entries         |

**Onboarding:** `onboarding/GettingStarted.tsx` — Getting started guide (currently commented out in index.tsx)

### 2.5 AI Chat Components

**Root:** `src/components/templates/main-app/helpChat/`

**Search pipeline order:** `coreSearch()` runs safe mode, optional image query generation, context-aware related content, cache lookup, canonical-first retrieval, owner FAQ/custom-answer retrieval, then embedding/vector/RAG fallback. FAQ retrieval only reads `published + active` FAQs scoped to the tenant/store and does not make AI output authoritative.

| File                         | Lines | Purpose                                                               |
| ---------------------------- | ----- | --------------------------------------------------------------------- |
| `index.tsx`                  | —     | Main chat orchestrator (session management, mode switching, handlers) |
| `ChatPanel.tsx`              | —     | Chat panel layout (messages + input + footer)                         |
| `ChatInput.tsx`              | —     | Text input + QnA action buttons (follow-up / new question)            |
| `ChatFooter.tsx`             | —     | Footer with mode toggle                                               |
| `ChatHistory.tsx`            | —     | Session history sidebar                                               |
| `ConversationHeader.tsx`     | —     | Conversation title + controls                                         |
| `MessageList.tsx`            | —     | Scrollable message list                                               |
| `MessageBubble.tsx`          | —     | Individual message rendering (user/AI, source tags, feedback)         |
| `MessageActions.tsx`         | —     | Copy, regenerate, feedback actions                                    |
| `MessageReferences.tsx`      | —     | KB article references with similarity scores                          |
| `ModeToggle.tsx`             | —     | QnA ↔ Assistant mode toggle                                           |
| `SuggestedQuestions.tsx`     | —     | AI-suggested follow-up questions                                      |
| `WelcomeScreen.tsx`          | —     | Initial welcome state                                                 |
| `TypingIndicator.tsx`        | —     | Typing animation                                                      |
| `ErrorMessage.tsx`           | —     | Error display                                                         |
| `FeedbackModal.tsx`          | —     | Thumbs up/down feedback with reasons                                  |
| `LocalSearchResults.tsx`     | —     | Local article search results                                          |
| `DevOnlyClearDataButton.tsx` | —     | Dev-only data clearing utility                                        |
| `SessionCard.tsx`            | —     | Chat session card in history list                                     |

**Hooks:** `hooks/`

| File                 | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `useChatData.ts`     | Data management (sessions, messages, state)               |
| `useChatHandlers.ts` | Action handlers (search, retry, regenerate, feedback)     |
| `useRequestQueue.ts` | Sequential request processing (race condition prevention) |

**API Layer:**

| File           | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `api.ts`       | Search API client (calls /api/helpCenter/search-kb) |
| `apiTypes.ts`  | API request/response types                          |
| `chatState.ts` | Chat state management                               |
| `chatUtils.ts` | Utility functions                                   |
| `types.ts`     | Component-level types                               |

**Styles:** `MessageBubble.module.scss`
**Docs:** `README.md`, `ACCESSIBILITY.md`, `IMPLEMENTATION_SUMMARY.md`

### 2.6 AI Search Modal (Global)

**Root:** `src/components/organisms/AISearchModal/`

| File                       | Purpose                   |
| -------------------------- | ------------------------- |
| `index.tsx`                | Modal orchestrator        |
| `AiSearchBarComponent.tsx` | Main search bar component |
| `SearchBar.tsx`            | Input field               |
| `SearchResultDisplay.tsx`  | Result rendering          |
| `LocalSearchResults.tsx`   | Local article matching    |
| `ActionButtons.tsx`        | Action buttons            |
| `BlinkingCursor.tsx`       | Cursor animation          |
| `FeedbackModal.tsx`        | Inline feedback           |
| `TypingIndicator.tsx`      | Typing animation          |
| `state.ts`                 | State management          |
| `types.ts`                 | Type definitions          |

### 2.7 Knowledge Base Explorer (Owner Side)

**Root:** `src/components/organisms/KnowledgeBaseExplorer/`

| File              | Purpose                             |
| ----------------- | ----------------------------------- |
| `index.tsx`       | Main KB browser with 3-panel layout |
| `Categories.tsx`  | Category list panel                 |
| `Sections.tsx`    | Sections within category            |
| `Articles.tsx`    | Article list within section         |
| `HelpSidebar.tsx` | KB navigation sidebar               |
| `OnThisPage.tsx`  | Article section anchors             |

**Article Display:**

- `src/components/organisms/ArticleView/index.tsx` — Full article renderer
- `src/components/organisms/ArticleViewModal/index.tsx` — Modal wrapper

### 2.8 Knowledge Base Management (Platform Admin)

**Root:** `src/components/templates/platform/knowledgeBase/`

| File                      | Purpose                               |
| ------------------------- | ------------------------------------- |
| `index.tsx`               | Main KB management with 3-pane layout |
| `CategoryPane.tsx`        | Category list + management            |
| `SectionPane.tsx`         | Section list + management             |
| `ArticlePane.tsx`         | Article list + management             |
| `CategoryModal.tsx`       | Add/edit category                     |
| `SectionModal.tsx`        | Add/edit section                      |
| `ArticleModal.tsx`        | Add/edit article (TipTap editor)      |
| `KnowledgeBaseModal.tsx`  | General KB modal wrapper              |
| `PaneHeader.tsx`          | Pane header component                 |
| `PaneContent.tsx`         | Pane content component                |
| `CategoryCardPreview.tsx` | Category preview card                 |
| `SectionCardPreview.tsx`  | Section preview card                  |

### 2.9 KB Generation Pipeline (Platform Admin)

**Root:** `src/components/templates/platform/KBGeneration/`

| File              | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `index.tsx`       | Main generation dashboard                  |
| `UploadModal.tsx` | File upload modal (multi-file, multi-type) |
| `ReviewModal.tsx` | Article review interface                   |

**Job Card:** `jobCard/`

- `index.tsx` — Job card component
- `JobProcessingProgress.tsx` — Processing progress indicator
- `JobPublishingProgress.tsx` — Publishing progress indicator
- `jobStatusTag.tsx` — Status badge

**Job History:** `jobHistory/`

- `index.tsx` — History list
- `JobDetailsDrawer.tsx` — Job details side panel
- `JobDetailItem.tsx` — Detail item row
- `JobDetailsSection.tsx` — Detail section
- `JobPreviewCard.tsx` — Preview card
- `JobActionMenu.tsx` — Actions dropdown
- `GeneratedContentTree.tsx` — Generated content tree view

**Reconciliation:** `reconciliation/`

- `index.tsx` — Reconciliation dashboard
- `ComparisonView.tsx` — Side-by-side comparison
- `ReconciliationArticleCard.tsx` — Article comparison card
- `ArticleMetadata.tsx` — Article metadata display

### 2.10 Support Tickets — Platform Admin

**Root:** `src/components/templates/platform/supportTickets/`

| File                      | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `PlatformTicketsView.tsx` | Main dashboard with real-time updates      |
| `TicketDetailView.tsx`    | Full ticket detail (messages, status, SLA) |
| `TicketActions.tsx`       | Status change, priority, assign actions    |
| `TicketFiltersBar.tsx`    | Filter controls                            |
| `TicketLogsView.tsx`      | Captured browser logs from client          |
| `TicketStatsCards.tsx`    | Summary statistics                         |
| `TicketTableColumns.tsx`  | Table column definitions                   |

**Support Ticket Atoms:**

- `src/components/organisms/SupportTicket/SupportTicketCategory.tsx`
- `src/components/organisms/SupportTicket/SupportTicketPriority.tsx`
- `src/components/organisms/SupportTicket/SupportTicketStatus.tsx`
- `src/components/organisms/addSupportTicket/index.tsx` — Ticket creation form

### 2.11 Changelog — Platform Admin

**Root:** `src/components/templates/platform/changelog/`

| File                       | Purpose                          |
| -------------------------- | -------------------------------- |
| `displayChangelog.tsx`     | Changelog list display           |
| `addEditChangelog.tsx`     | Create/edit changelog entry form |
| `ChangelogPreview.tsx`     | Entry preview renderer           |
| `ChangelogTagRenderer.tsx` | Tag display component            |

**Constants:** `src/constants/changelog.ts` — Tag options, version patterns

### 2.12 Chat Monitoring — Platform Admin

**Root:** `src/components/templates/platform/chatManagement/`

| File                             | Purpose                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `index.tsx`                      | Tab container (Conversations, ROI, Weekly Digest)                                           |
| `ConversationsList.tsx`          | Paginated conversation table with filters                                                   |
| `ConversationDrawer.tsx`         | Conversation detail drawer                                                                  |
| `ConversationCard.tsx`           | Conversation list card                                                                      |
| `ConversationDetail.tsx`         | Full conversation view                                                                      |
| `ConversationFiltersPopover.tsx` | Filter popover (mode, feedback, status, priority, quality, tags, notes, unread, date range) |
| `MessageBubble.tsx`              | Admin message rendering (different from end-user version)                                   |
| `AdminMetadataPopover.tsx`       | Status/priority/tag management                                                              |
| `TeamNoteModal.tsx`              | Internal notes editor                                                                       |
| `ROICalculator.tsx`              | ROI calculation dashboard                                                                   |
| `WeeklyDigest.tsx`               | AI-generated weekly summary                                                                 |
| `ChatInsights.tsx`               | Analytics insights                                                                          |
| `ComprehensiveDashboard.tsx`     | Full analytics dashboard                                                                    |

---

## 3. Database Layer (DAL)

### 3.1 KB Articles (`src/database/knowledgeBase/articles.ts`)

| Function                                            | Reads    | Writes | Notes                                         |
| --------------------------------------------------- | -------- | ------ | --------------------------------------------- |
| `getArticles()`                                     | All docs | 0      | Fetches entire collection (no tenant filter!) |
| `addArticle(data)`                                  | 0        | 1      | Uses `requestBodyComposer`                    |
| `updateArticle(data)`                               | 0        | 1      | Merge update                                  |
| `deleteArticle(id)`                                 | 0        | 1      | Hard delete                                   |
| `deleteMultipleArticles(ids)`                       | 0        | N      | Batch delete                                  |
| `getArticlesByCategoryId(categoryId)`               | N        | 0      | Query by categoryId                           |
| `getArticlesBySectionId(sectionId)`                 | N        | 0      | Query by sectionId                            |
| `getArticlesByIds(ids)`                             | N        | 0      | `__name__ in ids` query                       |
| `getArticleById(id)`                                | 1        | 0      | Single doc get                                |
| `updateArticleFeedback(articleId, type, increment)` | 1        | 1      | Read-then-write (not atomic)                  |

**Critical observation:** `getArticles()` fetches ALL articles with no tenant/store filter. KB articles are platform-wide, not tenant-scoped.

### 3.2 KB Categories (`src/database/knowledgeBase/categories.ts`)

| Function                       | Reads    | Writes | Notes                                               |
| ------------------------------ | -------- | ------ | --------------------------------------------------- |
| `getCategories()`              | All docs | 0      | Returns first doc (single-doc pattern)              |
| `deleteCategory(data)`         | 0        | 1      | Overwrites entire categories doc                    |
| `addCategory(category)`        | 0        | 1      | Field path update `categories.{id}`                 |
| `updateCategory(category)`     | 0        | 1      | Field path update                                   |
| `updateArticleInParent(...)`   | 0        | 1      | Updates article metadata in parent category/section |
| `deleteArticleFromParent(...)` | 0        | 1      | Removes article from parent                         |

**Architecture:** All categories stored in a SINGLE document (`kb_categories/categories`) as a nested map. Sections are arrays within categories. Articles have metadata references in their parent.

### 3.3 Chat Sessions (`src/database/chatSessions/index.ts`)

| Function                                                  | Reads | Writes      | Notes                                         |
| --------------------------------------------------------- | ----- | ----------- | --------------------------------------------- |
| `uploadChatImage(image, session)`                         | 0     | 1 (storage) | Tenant-scoped storage path                    |
| `saveChatSession(data)`                                   | 0     | 1           | `apiCallComposerClientWithoutLoader`          |
| `updateChatSession(sessionId, updates)`                   | 0     | 1           | Merge update                                  |
| `deleteChatSession(sessionId)`                            | 0     | 1           | Hard delete                                   |
| `getUserChatSessions(session)`                            | N     | 0           | `tId + uId` scoped, ordered by modifiedOn     |
| `getChatSessionById(sessionId)`                           | 1     | 0           | Admin use                                     |
| `updateMessageFeedback(sessionId, messageId, feedback)`   | 1     | 1           | Read-modify-write on messages array           |
| `updateSessionInternalNote(sessionId, noteJson, session)` | 0     | 1           | Admin notes                                   |
| `getAllChatSessionsForAdmin(session, filters)`            | N+1   | 0           | Paginated with client-side search             |
| `getChatStatistics(session, dateRange)`                   | N     | 0           | Full scan (EXPENSIVE - use optimized version) |
| `getTopQuestions(session, limitCount)`                    | N     | 0           | Full scan                                     |
| `getKnowledgeGaps(session)`                               | N     | 0           | Full scan                                     |
| `getChatVolumeOverTime(session, days)`                    | N     | 0           | Date-range filtered                           |

### 3.4 Chat Analytics (`src/database/chatAnalytics/index.ts`)

| Function                                                | Reads          | Writes | Notes                       |
| ------------------------------------------------------- | -------------- | ------ | --------------------------- |
| `getTodayLiveStats(session)`                            | N (today only) | 0      | Real-time today's data      |
| `getChatStatisticsOptimized(session, days)`             | ~30+N          | 0      | Historical + today hybrid   |
| `getTopQuestionsOptimized(session, days)`               | ~30            | 0      | From aggregated data        |
| `getKnowledgeGapsOptimized(session, days)`              | ~30            | 0      | From aggregated data        |
| `getChatVolumeOverTimeOptimized(session, days)`         | ~N             | 0      | From aggregated data        |
| `getConversationsPaginated(session, pageSize, filters)` | pageSize+1     | 0      | Cost-controlled pagination  |
| `aggregateDailyStats(session, date)`                    | N (day)        | 1      | Creates daily aggregate doc |
| `getLastAnalyticsUpdate(session)`                       | 1              | 0      | Data freshness check        |

### 3.5 Support Tickets (`src/database/tickets/index.ts`)

| Function                                                                      | Reads    | Writes                | Notes                                      |
| ----------------------------------------------------------------------------- | -------- | --------------------- | ------------------------------------------ |
| `addTicket(data)`                                                             | 0        | 1+N (files)           | Captures browser logs, uploads attachments |
| `updateTicket(data)`                                                          | 0        | 1+N (files)           | Merge update with file uploads             |
| `addTicketMessage(ticketId, currentMessages, message, attachments)`           | 0        | 1+N (files)           | Appends to messages array                  |
| `updateTicketStatus(ticketId, currentStatuses, newStatus, remark, changedBy)` | 0        | 1                     | Appends to statuses audit trail            |
| `deleteTicket(data)`                                                          | 0        | 1+N (storage deletes) | Hard delete + file cleanup                 |
| `restoreTicket(data)`                                                         | 0        | 1                     | Sets deleted=false                         |
| `getTicketById(id)`                                                           | 1        | 0                     | Single doc get                             |
| `getStoresTickets()`                                                          | N        | 0                     | `tId + sId + deleted=false`                |
| `getSupportTickets(includeDeleted)`                                           | N        | 0                     | All tickets (platform admin)               |
| `subscribeSupportTickets(onUpdate, onError)`                                  | Listener | 0                     | Real-time `onSnapshot`                     |
| `subscribeStoreTickets(onUpdate, onError)`                                    | Listener | 0                     | Store-scoped real-time                     |

### 3.6 Changelog (`src/database/changelog/index.ts`)

| Function                                                            | Reads | Writes | Notes                                                |
| ------------------------------------------------------------------- | ----- | ------ | ---------------------------------------------------- |
| `addChangelogEntry(entryPayload)`                                   | 1-2   | 1      | Transaction: find latest page → append or create new |
| `fetchLatestChangelogPage()`                                        | 1     | 0      | Latest page by pageNumber desc                       |
| `loadOlderChangelogPage(currentPageNumber)`                         | 1     | 0      | Previous page                                        |
| `updateChangelogFeedback(pageId, entryId, feedbackType, increment)` | 1     | 1      | Transaction: update likes/dislikes                   |
| `deleteChangelogEntry(entryId)`                                     | N     | 1      | Transaction: find page containing entry              |
| `updateChangelogEntry(entryId, updatedPayload)`                     | N     | 1      | Transaction: find page containing entry              |

**Path:** `changelog/{tId}/{sId}/page_XXXXXX` — Tenant+Store scoped subcollection.

### 3.7 Feedback (`src/database/feedback/index.ts`)

| Function                     | Reads | Writes | Notes                    |
| ---------------------------- | ----- | ------ | ------------------------ |
| `addFeedback(data)`          | 0     | 1      | General/feature feedback |
| `getLatestFeedbackForUser()` | 1     | 0      | `uId + tId + sId` scoped |

### 3.8 Content Feedback (`src/database/contentFeedback/index.ts`)

| Function                                                | Reads | Writes | Notes                       |
| ------------------------------------------------------- | ----- | ------ | --------------------------- |
| `addContentFeedback(type, entryId, comment, sentiment)` | 1     | 1      | Transaction: append to list |

**Path:** `{changelog_feedback|article_feedback}/{tId}/{sId}/doc1_{entryId}`

### 3.9 AI Search History (`src/database/aiSearchHistory/index.ts`)

| Function                                        | Reads | Writes | Notes                            |
| ----------------------------------------------- | ----- | ------ | -------------------------------- |
| `addAiSearchHistory(data)`                      | 0     | 1      | Save search response for caching |
| `findCachedSearchByCacheKey(cacheKey, session)` | 1     | 0      | Cache lookup by key + tId        |
| `updateAiSearchHistoryWithFeedback(data)`       | 0     | 1      | Add feedback to search record    |

### 3.10 Query Embeddings (`src/database/queryEmbeddings/index.ts`)

| Function                                       | Reads | Writes | Notes                     |
| ---------------------------------------------- | ----- | ------ | ------------------------- |
| `getCachedEmbedding(cacheKey)`                 | 1     | 1      | Read + increment hitCount |
| `saveCachedEmbedding(cacheKey, query, vector)` | 0     | 1      | Cache vector for reuse    |

**Note:** Uses `firestoreAdmin` (server-side) — this DAL is called from API routes, not client.

### 3.11 KB Generation Jobs (`src/database/kb-generation/jobs.ts`)

| Function                            | Reads | Writes | Notes                                                           |
| ----------------------------------- | ----- | ------ | --------------------------------------------------------------- |
| `getIngestionJobs()`                | N     | 0      | All jobs (no tenant filter!)                                    |
| `getPreviousIngestionJobs(session)` | N     | 0      | Completed/failed/cancelled for tenant                           |
| `updateJob(jobId, data)`            | 0     | 1      | Merge update                                                    |
| `deleteIngestionJob(jobId)`         | 1+N   | 1+N    | Transaction: delete job + articles + categories + storage files |
| `addIngestionJob(data)`             | 0     | 1      | Creates job, triggers CF in dev                                 |

---

## 4. RAG Pipeline (Detailed)

### 4.1 Search Flow (`/api/helpCenter/search-kb` → `coreSearch()`)

**Core pipeline:** `src/lib/search/searchCore.ts`
**Auth wrapper:** `src/app/api/helpCenter/search-kb/route.ts`

1. **SAFE_MODE check** — Dynamic import `@lib/ops/safeMode`
2. **Input validation** — `SearchRequestSchema` from `@lib/validation/chatSchemas`
3. **Rate limiting** — `checkAIOperationLimit()` from `@lib/rateLimit/helpers`
4. **Session** — `getActiveSession()` from `@lib/auth/getActiveSession`
5. **Image processing** (optional):
   - Validate URL (HTTPS, Firebase Storage host, bucket path)
   - Fetch with 10s timeout, 10MB max
   - Convert to base64
   - `generateSearchQueryFromImage()` → Gemini 2.5 Pro generates search query
6. **Cache key construction** — `normalizeQuery()` + optional image hash
7. **Response cache check** — `findCachedSearchByCacheKey()`
8. **Embedding cache check** — `getCachedEmbedding()`
9. **Embedding generation** — `callGeminiEmbedding()` → `text-embedding-004`
10. **Save embedding to cache** — `saveCachedEmbedding()`
11. **Vector search** — `firestoreAdmin.collection(KB_ARTICLES).where('status','==','published').findNearest({vectorField:'embedding', queryVector, limit:12, distanceMeasure:'COSINE'})`
12. **Similarity filtering** — Primary threshold 0.6, fallback 0.4
13. **Answer generation** — `callGeminiChat()` → Gemini 2.5 Flash
14. **Reference enrichment** — Map referenced doc IDs to full article data
15. **Save to search history** — `addAiSearchHistory()`
16. **Performance logging** — Detailed timing metrics for each stage

### 4.2 Embedding Generation

**Models:**

- `text-embedding-004` — Query and article embeddings (768 dimensions)
- Embedding input format: `Category: {cat}\nSection: {sec}\nTitle: {title}\nContent: {text}`

**Storage:** Embeddings stored directly on article documents as `embedding` field (Firestore Vector type).

### 4.3 Gemini Chat Configuration

**File:** `src/lib/vectorEmbeddings/index.ts`

| Parameter     | Value                                                   |
| ------------- | ------------------------------------------------------- |
| Model         | `gemini-2.5-flash`                                      |
| Temperature   | 0.0                                                     |
| Top P         | 0.9                                                     |
| Top K         | 40                                                      |
| Response MIME | `application/json`                                      |
| Output format | `{ craftedAnswer, references[], suggestedQuestions[] }` |

**System instructions** vary by mode:

- **QnA Mode:** "You are a precise Help Center assistant in QnA MODE"
- **Assistant Mode:** "You are a conversational Help Center assistant in ASSISTANT MODE"
- **Image Mode:** Additional context about using image as context

**Conversation context:** Last 5 messages formatted as numbered Previous Conversation block.

---

## 5. Cloud Functions

### 5.1 Chat Analytics Aggregation

**File:** `functions/src/aggregateDailyChatStats.ts`
**Schedule:** Daily at 1 AM UTC
**Exports:** `aggregateDailyChatStats`, `backfillAggregates`

Aggregates all chat sessions per store per day into `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` documents.

### 5.2 Article Embedding Worker

**File:** `functions/src/logic/embedArticleWorker.ts`
**Trigger:** Task queue (from KB generation pipeline)

Re-embeds articles when category/section titles change. Uses `genrateEmbedding()` from CF utils.

### 5.3 Regenerate Embedding

**File:** `functions/src/logic/regenerateEmbedding.ts`
**Trigger:** HTTPS callable

Re-generates embedding for a single article by ID.

### 5.4 Feedback Intelligence

**File:** `functions/src/analytics/feedbackIntelligence.ts`
**Schedule:** Daily at 2:01 AM UTC (via master scheduler)

Analyzes negative feedback themes using Gemini. Writes to `insights/{tId}/stores/{sId}/ai/feedback`.

### 5.5 KB Quality

**File:** `functions/src/analytics/kbQuality.ts`
**Schedule:** Daily at 2:05 AM UTC (via master scheduler)

Scores KB article quality using Gemini. Writes to `insights/{tId}/stores/{sId}/ai/kbQuality`.

### 5.6 Weekly Narrative

**File:** `functions/src/analytics/weeklyNarrative.ts`
**Schedule:** Sundays at 2:10 AM UTC (via master scheduler)

Generates weekly performance narrative. Writes to `insights/{tId}/stores/{sId}/ai/weekly`.

### 5.7 Negative Feedback Alert

**File:** `functions/src/negativeFeedbackAlert.ts`

Alerts on negative feedback patterns.

---

## 6. Types

### 6.1 Knowledge Base Types (`src/types/knowledgeBase.ts`)

- `KnowledgeBaseArticleType` — Full article with embedding, content, metadata, sources, feedback
- `KnowledgeBaseCategory` — Category with sections array
- `KnowledgeBaseSection` — Section with articles metadata array
- `KnowledgeBaseArticleMeta` — Lightweight article reference (id, title, active, index, url)
- `KbCategoriesMap` — Map of category ID → category
- `KnowledgeBaseCategoriesType` — Root categories container
- `KnowledgeBaseArticleSource` — Source provenance (type, url, name, page)
- `KnowledgeBaseArticleEmbeddingPayload` — Payload for embedding generation
- `IngestionJob` — KB generation job with full lifecycle
- `IngestionJobCategory/Section/Article` — Job-specific content types
- `IngestionJobArticleToReview` — Reconciliation review item
- `IngestionJobSourceFile` — Uploaded source file metadata
- `INGESTION_JOB_STATUS` — Job status enum (7 states)
- `ARTICLE_STATUS` — Article status enum (4 states)
- `ARTICLE_RECONCILIATION_STATUS` — Reconciliation status (4 states)
- `FILE_TYPE` — Supported file types (9 types)

### 6.2 Chat Session Types (`src/types/chatSession.ts`)

- `ChatMessage` — Message with role, content, references, feedback, generation metadata
- `ChatSession` — Session with messages, admin fields (status, priority, tags, notes)
- `ChatMode` — 'qna' | 'assistant'
- `ConversationFilters` — Admin filter interface (mode, feedback, status, priority, quality, tags, notes, unread, dateRange)
- `ADMIN_STATUS_OPTIONS` — 5 status options
- `ADMIN_PRIORITY_OPTIONS` — 3 priority options
- `ADMIN_TAG_OPTIONS` — 8 tag options
- `ADMIN_QUALITY_OPTIONS` — 3 quality tiers

### 6.3 Support Ticket Types (`src/types/supportTicket.ts`)

- `SupportTicketType` — Full ticket with messages, statuses, client details, logs
- `TicketMessage` — Message with sender, attachments, type (user/system)
- `SUPPORT_TICKET_STATUS` — 5 states (Open, In Progress, Resolved, Closed, Re-Opened)
- `SUPPORT_TICKET_PRIORITY` — 3 levels (Low, Normal, High)
- `SUPPORT_TICKET_CATEGORY` — 7 categories
- `SLA_CONFIG` — Per-priority SLA hours (response + resolution)
- `calculateSLAStatus()` — Runtime SLA status calculation

### 6.4 Changelog Types (`src/types/changelog.ts`)

- `ChangelogEntry` — Entry with TipTap content, tags, version, files, KB sources
- `ChangelogPage` — Paginated page container with entries array

### 6.5 Feedback Types (`src/types/feedback.ts`)

- `Feedback` — General/feature usage/feature request with rating, comment, issues, votes

---

## 7. Shared Utilities & Dependencies

### 7.1 Core Libraries Used

| Library                                   | Usage                                                  |
| ----------------------------------------- | ------------------------------------------------------ |
| `@lib/vectorEmbeddings`                   | Gemini embedding + chat functions                      |
| `@lib/vectorEmbeddings/articleEmbeddings` | TipTap JSON → plain text extraction                    |
| `@lib/validation/chatSchemas`             | Zod schemas for search API                             |
| `@lib/rateLimit`                          | Upstash rate limiting                                  |
| `@lib/rateLimit/helpers`                  | `checkAIOperationLimit()`                              |
| `@lib/ops/safeMode`                       | SAFE_MODE kill switch                                  |
| `@lib/auth/getActiveSession`              | NextAuth session retrieval                             |
| `@lib/firebase/firebaseAdmin`             | Server-side Firestore + Vector type                    |
| `@lib/firebase/firebaseClient`            | Client-side Firestore                                  |
| `@lib/firebase/functions`                 | Cloud Functions callable triggers                      |
| `@lib/apiHelper`                          | `requestBodyComposer` (auto timestamps/session fields) |
| `@lib/apiHelper/apiCallComposer`          | Standard DAL wrapper                                   |
| `@lib/storage/pathGenerator`              | Tenant-scoped storage paths                            |
| `@lib/string`                             | `normalizeQuery()`                                     |
| `@lib/sanitization`                       | `sanitizeFeedbackComment()`                            |
| `@lib/localLogs/localLogsTracker`         | Browser log capture for tickets                        |
| `@lib/contentFeedbackStorage`             | Content feedback utilities                             |
| `@util/hash`                              | `hashString()` for cache keys                          |
| `@util/utils`                             | `updateList()` for array operations                    |
| `logs/utils`                              | `writeLogEntry()` for structured logging               |

### 7.2 Feature Flags

| Flag                   | Default | Purpose               |
| ---------------------- | ------- | --------------------- |
| `ENABLE_RATE_LIMITING` | `true`  | Upstash rate limiting |

### 7.3 Hooks

| Hook                | File                             | Purpose                   |
| ------------------- | -------------------------------- | ------------------------- |
| `useTicketCache`    | `src/hooks/useTicketCache.ts`    | SWR cache for tickets     |
| `useChangelogCache` | `src/hooks/useChangelogCache.ts` | SWR cache for changelog   |
| `useFeedback`       | `src/hooks/useFeedback.ts`       | Feedback state management |

---

## 8. Identified Issues & Observations

### 8.1 Missing Tenant Isolation

- `getArticles()` in `src/database/knowledgeBase/articles.ts` fetches ALL articles with no tenant filter. This is by design (platform-wide KB), but means KB content is shared across all tenants.
- `getIngestionJobs()` in `src/database/kb-generation/jobs.ts` also fetches all jobs with no tenant filter.

### 8.2 Non-Atomic Feedback Update

- `updateArticleFeedback()` does read-then-write (not a transaction). Under concurrent updates, feedback counts could drift.

### 8.3 Ticket Session Caching

- `src/database/tickets/index.ts` caches session in module-level variable (`let session: any = null`). This is a common pattern in the codebase but means session is cached for the lifetime of the module import.

### 8.4 Dead Code / Commented Code

- `GettingStarted` component is imported but commented out in `helpCenter/index.tsx:35`
- Commented-out vector search code in `search-kb/route.ts:252-266`

### 8.5 Governance Boundary

- Help Center tab configuration intentionally excludes Answerlattice `GovernanceHub`.
- Help Center landing intentionally excludes Answerlattice Coverage KPI, Signal-to-Knowledge Queue, and Entity Candidates.
- Owner/admin governance review stays in `/answerlattice/governance` and related Answerlattice dashboard routes.

### 8.6 Hardcoded Popular Feature Requests

- `FeatureRequests.tsx` has 5 hardcoded popular requests. These are not configurable or fetched from Firestore.

### 8.7 Missing `withAuth()` on API Routes

- None of the 3 helpCenter API routes use `withAuth()` middleware. They rely on `getActiveSession()` which returns null if not authenticated. The search routes handle this gracefully but there's no explicit 401 response for unauthenticated requests.

---

## 9. Environment Dependencies

| Variable                   | Used By                              | Required                               |
| -------------------------- | ------------------------------------ | -------------------------------------- |
| `GEMINI_AI_KEY`            | `genAIClient` in `@lib/google/genAi` | Yes — all AI operations                |
| `UPSTASH_REDIS_REST_URL`   | Rate limiting                        | Yes (when `ENABLE_RATE_LIMITING=true`) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting                        | Yes (when `ENABLE_RATE_LIMITING=true`) |
| Firebase config vars       | Firestore client/admin               | Yes — all DB operations                |

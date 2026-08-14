# Help Center — Technical Implementation Blueprint

July 28, 2026 persisted-scope correction: article entity extraction, FAQ generation, translation and embedding reconcile every supplied `tId`/`tenantId` and `sId`/`storeId` alias before provider work or mutation. Knowledge DAL session scope and article reads apply the same exact agreement; conflicting aliases fail closed.

> **Version:** 1.2.0
> **Last Updated:** 2026-07-18
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Help Center is a **multi-layered feature** spanning frontend components, API routes, database layer (DAL), Cloud Functions, and AI services. It follows MenuList's standard patterns:

- **Frontend:** Next.js 14 App Router + Ant Design + TipTap Editor
- **Backend:** Next.js API routes (for AI operations requiring server-side secrets)
- **Database:** Firestore client SDK via DAL pattern (for CRUD operations)
- **AI:** Gemini 2.5 Flash (chat), Gemini 2.5 Pro (image analysis), `gemini-embedding-2` (active embeddings)
- **Cloud Functions:** Nightly aggregation, article embedding, AI intelligence
- **Caching:** Firestore-based embedding cache + response cache

### 1.1 MenuList client boundary

The owner route is MenuList UI, but search/content/ticket work uses only an explicit active Answerlattice product-account scope. `getActiveSession()` maps `/help-center/*` to that scope on the browser; the protected search route independently resolves the same scope from the authenticated server session and does not trust `Referer`. Invalid scope fails closed.

The July 16 item-28 pass adds no alternate support backend. Browser search response parsing now normalizes bounded related-content projections and related article buttons build internal `/help-center/kb/articles/{encodedId}` routes. Ticket attachment admission is centralized in `supportTicketAttachmentBoundary.ts`; signed download URLs must match the configured Answerlattice bucket plus selected ticket tenant/store path before opening and are never logged. Firestore rules preserve prior message/status arrays exactly, validate one appended entry, bind the actor to Firebase Auth, and make satisfaction write-once after resolution/closure.

The July 18 feature-flow pass binds every Help Center context cache to an exact `workspace:{tId}:{sId}` key and gives platform ticket lists a separate `platform` audience. Category and changelog request coalescing use per-scope maps rather than process-wide promises. Help Chat draft keys include exact workspace and consistent authenticated user identity; text is stored in a strict 24-hour envelope, legacy/foreign-scope keys are purged, and image drafts are never persisted. Draft clearing and cleanup are failure-contained and emit bounded diagnostics when browser storage is denied, so clearing a parent-controlled input cannot crash Help Chat. Managed FAQ load failure stays visible instead of silently replacing approved data with static copy.

The Help Center home follows the same truth boundary. Failed category, popular-article, changelog, or open-ticket-summary requests render persistent translated error alerts with scoped retry controls; they do not render `No categories available`, `No articles available`, a blank What's New panel, or a hidden ticket summary as if the current approved source loaded successfully. Retry reuses the existing protected public-content/ticket transports and adds no fallback source or alternate support backend.

The changelog viewer treats its device-local last-viewed marker as untrusted: only canonical non-future integer timestamps are admitted, invalid values are evicted, and the marker advances only after an initial changelog page has actually loaded. A failed or empty initial fetch therefore cannot suppress future New badges.

The public-content transport also binds that initiating workspace. Category, article, FAQ and changelog requests send the expected tenant/store only as corroboration; the authenticated route derives authority from the session, rejects a mismatch before cache reads, and acknowledges the exact admitted scope. The browser rejects a missing/mismatched acknowledgement. Category/article caches discard obsolete settlement, while FAQ/changelog/category direct consumers clear or ignore former-scope state through effect ownership or keyed rendering.

The internal changelog Firestore read cache follows the same rule independently: latest and older-page DAL reads receive the initiating tenant/store, compare it with fresh active scope before `getDocs`, and the hook rejects settlement when its current scope key changed. Platform/help-center pagination supplies that same scope.

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
| `FaqView.tsx`                | —     | Published Answerlattice FAQ display with article links and feedback; static copy only when management is disabled, visible recovery on load failure |
| `src/lib/answerlattice/faqRetrieval.ts` | — | Deterministic owner FAQ/custom-answer retrieval after canonical miss and before RAG fallback |
| `ShareFeedbackView.tsx`      | 164   | 3-step feedback wizard (general → usage → requests)                                   |
| `GeneralFeedback.tsx`        | 30    | Step 1: Star rating + comment                                                         |
| `FeatureUsage.tsx`           | —     | Step 2: Feature issues checklist                                                      |
| `FeatureRequests.tsx`        | 88    | Step 3: Feature request + popular request voting                                      |
| `TicketView.tsx`             | —     | Ticket submission and history (owner side)                                            |
| `TicketItem.tsx`             | —     | Individual ticket card                                                                |
| `TicketHistoryView.tsx`      | —     | Ticket detail with messages                                                           |
| Governance components        | —     | Not mounted in Help Center. `AnswerlatticeCoverageKPI`, `MutationProposalReview`, `EntityCandidateReview`, and `GovernanceHub` belong to Answerlattice owner/admin routes. |

Answerlattice FAQ article reference ID boundary: FAQ-linked article references in `src/lib/answerlattice/faqRetrieval.ts` are normalized through the KB article ID boundary before related-article output or full-article Firestore reads. Invalid linked article IDs are skipped rather than becoming article document refs.

Answerlattice support ticket session scope boundary: owner-side ticket reads and listeners in `src/database/tickets/index.ts` now normalize session `tId/sId` as exact positive numeric Firestore document IDs before querying `supportTickets`. Whitespace-mutated, leading-zero, zero, negative, unsafe, nonnumeric, reserved, empty, or path-shaped scope fails before owner ticket reads. Platform ticket views keep the existing platform-wide query behavior, and valid owner ticket history remains capped to the same store-scoped latest tickets.

Answerlattice KB owner content scope boundary: Help Center KB categories, article reads/writes, FAQ article-maintenance, product-surface reads, and protected article embedding now use the shared exact positive numeric Firestore document-ID scope normalizer before tenant/store-scoped Firestore refs, filters, cache-version writes, public-cache revalidation, or article embedding authorization. Malformed tenant/store values no longer reach the scoped KB/FAQ/product-surface paths through loose `Number()` coercion or partial explicit scope overrides; valid owner/admin KB behavior keeps the same read/write shapes.

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
| `helpChatDiagnostics.ts`     | —     | Bounded client diagnostics for draft storage and feedback submission state |

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

The renderer synchronizes its read-only Tiptap document whenever the selected
article changes. The modal fences each asynchronous article load to the
selection that initiated it, clears stale content while the next article is
loading, and records bounded diagnostics when a fetch fails. An older request
must never overwrite a newer article selection.

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
| `getArticles()`                                     | Scoped list | 0      | Deprecated compatibility helper; every path requires exact `pId: AL`; non-platform callers also require tenant/store scope |
| `addArticle(data)`                                  | 0        | 1      | Uses exact active/selected workspace scope                    |
| `updateArticle(data)`                               | 2+N      | 1+N    | Transaction rechecks stored article scope and atomically moves active linked FAQs to review when truth changes |
| `deleteArticle(id)`                                 | 2+N      | 1+N    | Transaction rechecks stored scope, archives linked FAQs and hard-deletes the article atomically |
| `getArticlesByCategoryId(categoryId)`               | N        | 0      | Query by categoryId                           |
| `getArticlesBySectionId(sectionId)`                 | N        | 0      | Query by sectionId                            |
| `getArticlesByIds(ids)`                             | N        | 0      | `__name__ in ids` query                       |
| `getArticleById(id)`                                | 1        | 0      | Single doc get                                |
| `updateArticleFeedback(articleId, type, increment)` | 1        | 1      | Read-then-write (not atomic)                  |

**Scope observation:** `getArticles()` is a deprecated compatibility helper. It now resolves the readable article scope before querying: non-platform sessions require tenant/store scope and platform admins can still perform the global administrative read.

**Scope boundary:** `src/database/knowledgeBase/articles.ts` resolves article/session scope through the shared exact positive numeric document-ID normalizer and requires exact `pId: AL` on queries and final rows. Single mutations derive ownership from the stored article and recheck it in a transaction. Bulk publish/archive accepts at most 100 exact unique IDs, one explicit status, and one stored workspace; it never rewrites scope from a platform session. The unused unscoped `deleteMultipleArticles()` API was removed.

### 3.2 KB Categories (`src/database/knowledgeBase/categories.ts`)

| Function                       | Reads    | Writes | Notes                                               |
| ------------------------------ | -------- | ------ | --------------------------------------------------- |
| `getCategories()`              | 1        | 0      | Reads scoped categories doc with platform legacy fallback |
| `deleteCategory({ categoryId })` | 1      | 1      | Transaction removes only the current category key and returns authoritative navigation |
| `addCategory(category)`        | 1        | 1      | Transaction rejects duplicates and returns authoritative navigation |
| `updateCategory(category)`     | 1        | 1      | Updates metadata while preserving current sections/article links |
| `upsertSectionInCategory(...)` | 1        | 1      | Creates/updates one section while preserving current article links |
| `deleteSectionFromCategory(...)` | 1      | 1      | Removes one section from transaction-current navigation |
| `updateArticleInParent(...)`   | 1        | 1      | Transactionally upserts bounded article metadata in current navigation |
| `deleteArticleFromParent(...)` | 1        | 1      | Transactionally removes an article link from current navigation |

**Architecture:** Categories are stored in a scoped document (`kb_categories/categories_{tId}_{sId}`) as a nested map, with a legacy platform fallback. Sections are arrays within categories. Articles have metadata references in their parent.

### 3.3 Chat Sessions (`src/database/chatSessions/index.ts`)

| Function                                                  | Reads | Writes      | Notes                                         |
| --------------------------------------------------------- | ----- | ----------- | --------------------------------------------- |
| `uploadChatImage(image, session)`                         | 0     | 1 (storage) | Tenant-scoped storage path                    |
| `saveChatSession(data)`                                   | 0     | 1           | `apiCallComposerClientWithoutLoader`; new-session UI requires persisted session acknowledgement before selecting it |
| `updateChatSession(sessionId, updates)`                   | 1     | 0-1         | Transactionally validates current scope/schema before a changed-field update; returns explicit `{ success, sessionId, updatedFields }` acknowledgement |
| `deleteChatSession(sessionId)`                            | 1     | 1 delete | Transactionally validates and deletes authoritative truth; returns `storageFilesDeleted: 0` because tenant/store-scoped images are retained until cross-session non-reference can be proved |
| `getUserChatSessions(session)`                            | N     | 0           | `tId + uId` scoped, ordered by modifiedOn     |
| `getChatSessionById(sessionId)`                           | 1     | 0           | Active workspace scope and persisted runtime shape are required |
| `updateMessageFeedback(sessionId, messageId, searchHistoryId, feedback)` | 2 | 2 transaction | Atomically updates the exactly linked chat message and search-history row; same feedback retries are idempotent |
| `updateSessionInternalNote(sessionId, noteJson, session)` | 1     | 1 transaction | Validates current scope/schema, derives actor from the active session and preserves original creator metadata |
| `batchUpdateSessionMetadata(sessionIds, metadata)`        | N     | N batch     | Reads and validates every scoped row before the batch; returns explicit `{ success, sessionIds, updatedCount, updatedFields }` acknowledgement |
| `getAllChatSessionsForAdmin(session, filters)`            | N+1   | 0           | Paginated with client-side search             |
| `getChatStatistics(session, dateRange)`                   | N     | 0           | Full scan (EXPENSIVE - use optimized version) |
| `getTopQuestions(session, limitCount)`                    | N     | 0           | Full scan                                     |
| `getKnowledgeGaps(session)`                               | N     | 0           | Full scan                                     |
| `getChatVolumeOverTime(session, days)`                    | N     | 0           | Date-range filtered                           |

New-session saves require `assertChatSessionSaveSucceeded()` before HelpChat inserts the saved session or selects its ID. Existing-session send/retry persistence remains a non-blocking UI path, but `updateChatSession()` now returns an explicit acknowledgement and failed or malformed merge results must emit the bounded `help_chat_session_persist_failed` diagnostic with fixed reason labels and presence/length metadata only. Rename and platform metadata saves require `assertChatSessionUpdateSucceeded()` before success copy or parent session state updates. HelpChat deletes require `assertChatSessionDeleteSucceeded()` before success copy; if the acknowledgement fails, the handler reloads sessions and restores the active-session/search snapshot. Platform internal-note and batch-status saves require `assertChatSessionInternalNoteUpdateSucceeded()` or `assertChatSessionBatchMetadataUpdateSucceeded()` before note state, selected conversation state, batch selection state, or success copy advances. This preserves the current Firestore operation count while making failed chat-session writes visible for support-truth monitoring.

HelpChat answer feedback updates the `aiSearchHistory` feedback row and the exactly linked chat-session message in one Firestore transaction before changing local feedback state or showing thank-you copy. The transaction validates exact product/tenant/store ownership for both rows, requires the message's stored `searchHistoryId` to match the requested source row, refuses a conflicting repeat, and treats the same already-persisted feedback as idempotent. `submitSearchFeedback()` requires `assertChatMessageFeedbackUpdateSucceeded()`; malformed or rejected results route through the existing `help_chat_feedback_up_submit_failed` / `help_chat_feedback_down_submit_failed` bounded diagnostics. Negative-feedback signal emission runs only after the coupled transaction is acknowledged.

Answerlattice chat session scope boundary: chat image uploads, user chat history, single-record reads, deletes, message/branch/feedback mutations, internal notes, batch metadata, admin conversation lists, chat statistics, top questions, knowledge gaps, and chat-volume reads use the shared exact Answerlattice session scope. Single-record operations normalize the document ID and revalidate persisted `pId/tId/sId` plus the bounded runtime chat shape before returning or mutating data. Cursor rows and query results re-enter the same contract; malformed timestamps, message IDs, references, feedback, or cross-workspace rows fail closed. Aggregations use `Map` for user-controlled question keys, and quality metrics accept the compact reference contract. Valid sessions keep the existing scoped query caps and storage paths; writes add only the reads required for transaction-local ownership/schema validation.

Persisted chat images use a tenant/store path and may be referenced by more than one session. Append compaction, branch replacement, and hard delete therefore retain removed image objects and emit only a bounded deferred-cleanup diagnostic; a single-session transaction is not deletion authority for the shared scope. Immediate Storage cleanup remains limited to a newly uploaded image that failed before any session persistence. A future retention worker may delete persisted chat images only after a bounded cross-session reference inventory proves they are unreferenced.

### 3.4 Chat Analytics (`src/database/chatAnalytics/index.ts`)

| Function                                                | Reads          | Writes | Notes                       |
| ------------------------------------------------------- | -------------- | ------ | --------------------------- |
| `getTodayLiveStats(session)`                            | N (today only) | 0      | Real-time today's data      |
| `getChatStatisticsOptimized(session, days)`             | ~30+N          | 0      | Historical + today hybrid   |
| `getChatDashboardAggregatesOptimized(session, days)`    | ~30+N          | 0      | One historical query plus today's live rows returns statistics, top questions and gaps |
| `getConversationsPaginated(session, pageSize, filters)` | pageSize+1     | 0      | Cost-controlled pagination  |
| `getLastAnalyticsUpdate(session)`                       | 1              | 0      | Data freshness check        |

The optimized chat analytics DAL uses `src/database/chatAnalytics/diagnostics.ts` for bounded fallback diagnostics. If today's live session read fails, `getChatStatisticsOptimized()` and `getChatDashboardAggregatesOptimized()` continue with historical aggregates and log `answerlattice_chat_analytics_today_live_stats_failed` with bounded tenant/store/day metadata and source error name/code/status only. Raw Firestore/provider errors and session payloads are not direct-console logged.

Answerlattice chat analytics scope boundary: browser reads derive the active workspace through the shared exact Answerlattice session resolver and include `pId/tId/sId` in every `chatAnalytics` / `chatSessions` query. Daily summary documents re-enter an exact runtime contract: document ID must equal `{tId}_{sId}_{YYYY-MM-DD}`, the calendar date must be real, source completeness must be explicit, counters must be safe nonnegative integers and reconcile, and every bounded question/gap row must be valid. Dashboard question/gap aggregation uses `Map` so user-controlled text cannot collide with object prototypes.

Answerlattice Functions workspace scope boundary: manual nightly retry JSON, persisted integration events, entity-scan scheduler discovery, and entity-graph summary metadata now share `functions-answerlattice/src/answerlattice/scopeBoundary.ts`. Runtime scope is admitted only when both IDs are positive safe-integer numbers; numeric strings, exponent/leading-zero strings, decimals, unsafe integers, non-finite numbers, booleans, nulls, and partial pairs fail before workspace reads, adapter dispatch, scheduler selection, or summary writes. A manual request with neither field remains the authorized all-workspace retry; supplying either field requires an exact pair. Existing graph summaries with string/coercive scope are treated as missing metadata and receive the maintained numeric backfill rather than being accepted as current.

The Help Center search wrapper, search core, browser clients, and visual query helper keep failure diagnostics bounded. `src/app/api/helpCenter/search-kb/route.ts` records `answerlattice_search_operation_log_failed` and `answerlattice_help_center_search_failed` with source error name/code/status only. Search request validation returns the shared safe Zod detail payload with issue count, field path, and issue code only; it does not echo raw Zod issue messages. `src/lib/search/searchCore.ts` records image fallback, image fetch HTTP failure, product-surface context, FAQ retrieval, vector search, answer-JSON parse, instant-cache stage, canonical cache-version, instant-cache write invocation/import, and perf-log write failures with stable codes plus bounded metadata; it does not persist exception messages, raw image fetch status text, or AI response previews. Trusted image URL fetches use the shared bounded response reader so oversized image streams are rejected before full buffering. `src/lib/answerlattice/instantCache.ts` logs Redis lookup, stale-delete, and write failures with bounded tenant/store/entity/version/count context while continuing to degrade to the live retrieval pipeline. `src/components/organisms/AISearchModal/AiSearchBarComponent.tsx` and `src/components/templates/main-app/helpChat/api.ts` use fixed client failure copy instead of raw search-route response text. `src/components/organisms/AISearchModal/ActionButtons.tsx`, `src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts`, and platform `chatManagement/MessageBubble.tsx` now check Clipboard API support before answer/message copy, await copy acknowledgement, and log unavailable/rejected copy attempts with bounded metadata before fixed local copy. `src/lib/vectorEmbeddings/index.ts` records `answerlattice_image_query_generation_failed` for failed image-to-search-context generation, throws generic image-query failure text, caps Gemini text extracted for vector/chat helpers before downstream parsing, and logs only prompt/query length plus provider-response length/truncation metadata for image-query success breadcrumbs. These changes do not alter canonical-first retrieval, FAQ fallback, embedding/vector search, RAG fallback, cache behavior, AI operation accounting, or tenant/store scoping.

The article embedding route keeps its failure logs bounded as well. `src/app/api/helpCenter/article-embedding/route.ts` records stable `embedding_operation_log_failed` and `embedding_generation_failed` codes plus source error name/code/status metadata only; it does not persist raw exception text while preserving existing embedding generation, cache writes, and AI operation accounting.

### 3.5 Support Tickets (`src/database/tickets/index.ts`)

| Function                                                                      | Reads    | Writes                | Notes                                      |
| ----------------------------------------------------------------------------- | -------- | --------------------- | ------------------------------------------ |
| `addTicket(data)`                                                             | 0        | 1+N Storage uploads   | Captures bounded browser context, accepts at most four 10 MB supported files, then creates one ticket; returns explicit `{ success, id, displayId }` acknowledgement |
| `updateTicket(data)`                                                          | 0        | 1+N (files)           | Merge update with file uploads. Non-platform callers pass selected ticket `tId/sId`; platform partial updates without explicit ticket scope strip composer-injected `tId/sId` before merge |
| `addTicketMessage(ticketId, currentMessages, message, attachments, scope)`    | 1        | 1+N Storage uploads   | Reads transaction-current truth, preserves the prior message array, appends one validated message, and returns explicit acknowledgement. Current owner reply UI sends text only; the DAL attachment capability stays capped at four files |
| `updateTicketStatus(ticketId, currentStatuses, newStatus, remark, changedBy, scope)` | 1        | 1                     | Reads transaction-current truth and appends one status plus one system message; returns explicit acknowledgement. Owner/client direct callers pass selected ticket `tId/sId` in `scope` |
| `deleteTicket(data)`                                                          | 0        | 1+N (storage deletes) | Hard delete + file cleanup                 |
| `restoreTicket(data)`                                                         | 0        | 1                     | Sets deleted=false                         |
| `getTicketById(id)`                                                           | 1        | 0                     | Single doc get                             |
| `getStoresTickets()`                                                          | N        | 0                     | `tId + sId + deleted=false`                |
| `getSupportTickets(includeDeleted)`                                           | N        | 0                     | All tickets (platform admin)               |
| `subscribeSupportTickets(onUpdate, onError)`                                  | Listener | 0                     | Real-time `onSnapshot`                     |
| `subscribeStoreTickets(onUpdate, onError)`                                    | Listener | 0                     | Store-scoped real-time                     |

Ticket mutation hardening: `src/database/tickets/index.ts` validates selected ticket `tId/sId` for non-platform partial updates before `setDoc(..., { merge: true })`. Platform support sessions can still operate across tenant tickets, but platform partial updates without explicit selected-ticket scope strip composer-injected `tId/sId` so they do not overwrite existing ticket ownership. This preserves the existing one-write/no-read reply and status-update cost profile.

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

Answerlattice changelog runtime boundary: browser page reads require exact `AL` product, numeric tenant/store, page identity/order, entry IDs, Firestore timestamps, counters and fully valid bounded nested file/KB/video/release fields before returning a page. Create/update/delete actions use an authenticated, permissioned, bounded server route and transaction-owned page/index/context invalidation. The server reuses the same page contract before preserving or mutating existing rows. Browser action responses are no-store, same-origin, manual-redirect and capped at 64 KB; numeric strings and timestamp-shaped partial objects fail closed.

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

### 3.9 AI Search History (`src/database/aiSearchHistory/server.ts` and `src/database/aiSearchHistory/index.ts`)

| Function                                              | Reads | Writes | Notes |
| ----------------------------------------------------- | ----- | ------ | ----- |
| `addAiSearchHistoryServer(data)`                      | 0     | 1      | Admin SDK write of a compact search response; persists a SHA-256 digest rather than the raw cache key |
| `findCachedSearchByCacheKeyServer(cacheKey, session)` | 1     | 0      | Admin SDK lookup by hashed cache key plus exact `pId + tId + sId` scope |
| `updateAiSearchHistoryWithFeedback(data)`             | 1     | 1      | Client transaction verifies current actor and exact scope before writing feedback; returns explicit `{ success, searchHistoryId, updatedFields }` acknowledgement |

### 3.10 Query Embeddings (`src/database/queryEmbeddings/index.ts`)

| Function                                       | Reads | Writes | Notes                                                        |
| ---------------------------------------------- | ----- | ------ | ------------------------------------------------------------ |
| `getCachedEmbedding(cacheKey)`                 | 1     | 0-1    | Read exact scope; invalid/stale/explicitly expired rows return null and use snapshot-preconditioned best-effort cleanup |
| `saveCachedEmbedding(cacheKey, query, vector)` | 0     | 1      | Cache vector for reuse with Answerlattice retention fields   |

**Note:** Uses the separate Answerlattice Admin client (server-side) and is called from the search pipeline, not the browser. Stale cleanup failures log `answerlattice_query_embedding_stale_delete_failed` with bounded cache-key presence/length and cache age only. Cleanup carries the read snapshot's update-time precondition, so a concurrent fresh replacement is preserved.

### 3.11 KB Generation Jobs (`src/database/kb-generation/jobs.ts`)

| Function                            | Reads | Writes | Notes                                                           |
| ----------------------------------- | ----- | ------ | --------------------------------------------------------------- |
| `getIngestionJobs()`                | N     | 0      | Deprecated compatibility helper; non-platform callers are tenant/store scoped |
| `getPreviousIngestionJobs(session)` | N     | 0      | Completed/failed/cancelled for tenant                           |
| `updateJob(jobId, data)`            | 1     | 1      | Transactional article-ID/reconciliation update; category snapshots rejected |
| `updateReviewJobNavigation(...)`    | 1     | 1      | Transaction-current category/section/article navigation mutation |
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
   - Fetch with 10s timeout, 5 MB max
   - Convert to base64
   - `generateSearchQueryFromImage()` → Gemini 2.5 Pro generates search query
6. **Cache key construction** — `normalizeQuery()` + optional image hash
7. **Response cache check** — `findCachedSearchByCacheKeyServer()`
8. **Embedding cache check** — `getCachedEmbedding()`
9. **Embedding generation** — `callGeminiEmbeddingWithMetadata()` → version-locked `gemini-embedding-2`
10. **Save embedding to cache** — `saveCachedEmbedding()`
11. **Vector search** — exact `pId+tId+sId+status+active` scope followed by `findNearest({vectorField:'embedding', queryVector, limit:12, distanceMeasure:'COSINE'})`
12. **Similarity filtering** — Primary threshold 0.6, fallback 0.4
13. **Answer generation** — `callGeminiChat()` → Gemini 2.5 Flash
14. **Reference enrichment** — Map referenced doc IDs to full article data
15. **Save to search history** — `addAiSearchHistoryServer()`
16. **Performance logging** — Detailed timing metrics for each stage

### 4.2 Embedding Generation

**Models:**

- `gemini-embedding-2` — Canonical query and article embeddings (768 dimensions)
- Query format: `task: question answering | query: {query}`
- Document format: `title: {title} | text: {normalized category/section/title/content}`

**Storage:** Embeddings are stored on article documents as `embedding` (Firestore Vector type); query-cache keys include `gemini-embedding-2:768:v1`. No legacy field, dual-write, or migration scheduler is present in the pre-launch runtime.

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

**File:** `functions-answerlattice/src/answerlattice/chatAnalyticsAggregation.ts`
**Schedule owner:** the existing hourly `answerlatticeNightly` master scheduler, through the workspace-local EOD settlement lease and `chat_analytics_summary` tenant task
**Export:** `syncChatAnalyticsNightly(tId, sId)`

The task scans at most 501 changed sessions from its compact `platformSummary/chatAnalyticsState_{tId}_{sId}` continuation, then recomputes yesterday plus at most six other affected UTC dates. Each day scan is capped at 2,001 rows and writes `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` only when the deterministic source hash changes. A capped day records `sourceComplete: false`. Scope IDs, persisted session scope, timestamps, messages, continuation-state ownership and cursor document ID are runtime-validated; malformed state fails closed rather than moving the cursor. Browser code has no aggregate writer.

### 5.2 Article Embedding Worker

**File:** `functions/src/logic/embedArticleWorker.ts`
**Trigger:** Task queue (from KB generation pipeline)

Re-embeds articles when category/section titles change. Uses `genrateEmbedding()` from CF utils.

### 5.3 Regenerate Embedding

**File:** `functions/src/logic/regenerateEmbedding.ts` and `functions-answerlattice/src/logic/regenerateEmbedding.ts`
**Trigger:** HTTPS callable

Re-generates embedding for a single article by ID. Failed regeneration logs stable `ANSWERLATTICE_REGENERATE_EMBEDDING_*` codes with article ID length and source error name/code/status metadata only. Callable errors use fixed retry copy and stable details codes rather than raw article IDs or provider/runtime exception text.

### 5.4 Feedback Intelligence

**File:** `functions/src/analytics/feedbackIntelligence.ts`
**Runtime status:** Dormant compatibility source; not scheduled or exported.

This retained MenuList implementation documents historical recovery behavior only. The active MenuList scheduler records it as `moved_to_answerlattice_runtime`; dedicated Answerlattice nightly aggregation and deterministic chat intelligence own current feedback signals without reconnecting this Gemini worker.

### 5.5 KB Quality

**Runtime status:** Retired MenuList compatibility source; no implementation,
provider helper, scheduler export, or health-check consumer remains.

The former MenuList worker scanned the retired nested `knowledgeBase`
namespace and could not safely represent the dedicated Answerlattice product.
Current Answerlattice knowledge and support intelligence remain in
`functions-answerlattice/`; the old source must not be restored or reconnected.

### 5.6 Weekly Narrative

**File:** `functions/src/analytics/weeklyNarrative.ts`
**Runtime status:** Dormant compatibility source; not scheduled or exported.

This retained MenuList Gemini narrative worker is not active. Dedicated Answerlattice nightly aggregation owns current weekly support intelligence.

### 5.7 Negative Feedback Alert

**Runtime status:** Retired MenuList compatibility source; no source file, export, or deployed trigger remains.

The former `functions/src/negativeFeedbackAlert.ts` watched the shared MenuList
`chatSessions` namespace and cannot be reactivated without violating the
dedicated Answerlattice runtime boundary. Current Answerlattice feedback,
review, escalation, and notification flows remain in the dedicated product
implementation. `negativeFeedbackAlerts` stays client-denied only for
historical-row containment; it is not current application truth.

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
| `useTicketCache`    | `src/hooks/useTicketCache.ts`    | Workspace/platform-audience in-memory ticket cache |
| `useChangelogCache` | `src/hooks/useChangelogCache.ts` | Workspace-scoped in-memory changelog cache |
| `useFeedback`       | `src/hooks/useFeedback.ts`       | Feedback state management |

These client hooks and browser storage helpers use `src/hooks/hookDiagnostics.ts` for bounded failure diagnostics. Normal cache hits, misses, clears, realtime updates, LRU evictions, recently-viewed writes, and content-feedback storage paths stay quiet. Failed fetch/update/localStorage paths log normalized `answerlattice_*`, `recently_viewed_*`, or `content_feedback_storage_*` failure codes with bounded content/page/cache counts, user/content length metadata, value lengths, counts, and source error metadata only; they do not log raw article IDs, ticket IDs, feedback comments, localStorage payloads, cache payloads, Firestore documents, or browser/provider error objects.

Recently Viewed is a versioned Answerlattice browser-state envelope scoped by exact tenant, store, and user identity. Runtime admission permits only ten bounded entries and the small presentation metadata required for article/changelog labels; it rejects unknown fields, malformed timestamps, external destinations, and whole article/changelog objects. Identity-less `recentlyViewed:{userId}` state is evicted instead of migrated because its originating workspace cannot be proven. Selecting an admitted row follows its normalized internal `/help-center` route and lets the authoritative content reader load the current DTO.

The shared callable client wrapper in `src/lib/firebase/functions.ts` also uses bounded secure diagnostics for Answerlattice manual re-embed and approved-job publish trigger failures. `regenerateEmbedding` and `publishApprovedJobFn` failures log normalized `answerlattice_*_callable_failed` codes with bounded article/job metadata and source error name/code/status only; they do not direct-console raw callable/provider errors or publish payload contents.

Server-side KB callable, task worker, and publish finalizer implementations in `functions/src/logic/regenerateEmbedding.ts`, `functions/src/logic/publishApprovedJob.ts`, `functions/src/logic/embedArticleWorker.ts`, `functions/src/logic/finalizePublish.ts`, `functions-answerlattice/src/logic/regenerateEmbedding.ts`, `functions-answerlattice/src/logic/publishApprovedJob.ts`, and `functions-answerlattice/src/logic/embedArticleWorker.ts` use stable `ANSWERLATTICE_*` failure codes, bounded article/job ID length metadata, and source error name/code/status only. Failed publish records keep the existing `errorMessage` field but store fixed `Publishing failed` / `Finalize publish failed` text instead of raw provider/runtime exception text.

Those workers also use the byte-identical shared/dedicated Answerlattice persisted-identity boundary. Every supplied `tId`/`tenantId` and `sId`/`storeId` alias must normalize to the same positive safe integer, and every supplied `pId`/`productId` alias must equal `AL`, before an article or job may be embedded, generated, dispatched, finalized, or mutated. Single-alias legacy documents remain readable; contradictory aliases fail closed.

The shared production and dev trigger wrappers in `functions/src/triggers/production.ts` and `functions/src/dev-triggers.ts` also log bounded job/request metadata only for KB generation and publish finalization. They do not log raw job IDs, raw dev request payloads, or caught error objects.

KB source generation and embedding helpers in `functions/src/logic/startGeneration.ts`, `functions/src/utils/aiUtils.ts`, `functions/src/triggers/shared.ts`, `functions-answerlattice/src/utils/aiUtils.ts`, and `functions-answerlattice/src/index.ts` also use fixed failure text and stable `ANSWERLATTICE_*` codes. They do not log generated KB payloads, raw AI response text, raw provider error objects, raw article/job IDs, raw temporary file paths, or raw callable caller IDs.

---

## 8. Current Constraints & Observations

### 8.1 Compatibility reads remain bounded

- `getArticles()` and `getIngestionJobs()` remain deprecated compatibility helpers. Non-platform callers require exact tenant/store scope; platform administrative reads remain explicit.
- `getIngestionJobs()` in `src/database/kb-generation/jobs.ts` is also deprecated but scoped; it is not a customer Help Center source or a global fallback.
- KB article, category and job compatibility reads treat session lookup failures as fail-closed errors, never as platform/global authority.

### 8.2 Client caches are scoped, not authoritative

- `useKBCategoriesCache`, `useArticleCache`, `useChangelogCache` and `useTicketCache` accept cached data only when its exact scope key matches the active workspace or platform audience.
- Category and changelog request coalescing are keyed by workspace. A response from another workspace cannot satisfy the current request.
- Cache mismatches return a miss and use the existing authoritative reader/listener; they add no pre-emptive Firestore read.

### 8.3 Draft storage is bounded browser convenience

- Help Chat stores text only after exact workspace and consistent user identity are available.
- The stored envelope is limited to 2,000 characters and 24 hours. Invalid, expired, legacy, screenshot and foreign-scope values are deleted rather than migrated.
- Browser storage is not support truth and is never sent until the user explicitly submits the question.

### 8.4 Managed FAQ failure is visible

- Static MenuList FAQ copy remains an intentional rollout fallback only when `ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT` is off.
- When the managed FAQ request fails, the screen shows a bounded failure state with Knowledge Base and ticket recovery actions. It does not present static copy as if the current approved FAQ source loaded successfully.

### 8.5 Governance boundary

- Help Center tab configuration intentionally excludes Answerlattice `GovernanceHub`, Coverage KPI, Signal-to-Knowledge Queue and Entity Candidates.
- Owner/admin governance review stays in `/answerlattice/governance` and related Answerlattice dashboard routes.

### 8.6 Product-curated feedback prompts

- `FeatureRequests.tsx` reads its small bounded prompt list from `ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS`. It is a product-curated feedback prompt, not customer truth and not an automatically learned feature list.

### 8.7 Protected APIs

- Help Center search, article embedding and Answerlattice public-content routes use authenticated server boundaries. Search independently resolves the Answerlattice product-account scope and does not trust browser `Referer` as authorization evidence.

---

## 9. Environment Dependencies

| Variable                   | Used By                              | Required                               |
| -------------------------- | ------------------------------------ | -------------------------------------- |
| `GEMINI_AI_KEY`            | `genAIClient` in `@lib/google/genAi` | Yes — all AI operations                |
| `UPSTASH_REDIS_REST_URL`   | Rate limiting                        | Yes (when `ENABLE_RATE_LIMITING=true`) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting                        | Yes (when `ENABLE_RATE_LIMITING=true`) |
| Firebase config vars       | Firestore client/admin               | Yes — all DB operations                |

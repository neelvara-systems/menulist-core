# Chat Monitoring — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-06-30
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Chat Monitoring dashboard is a **hybrid feature**:
- **Client-side:** Conversation list, filters, detail drawer, metadata management, notes, ROI calculator (Firestore client SDK via DAL)
- **Cloud Functions:** Nightly aggregation, AI intelligence (feedback analysis, KB quality, weekly narrative)
- **Read-only from insights:** Weekly digest reads from `insights/{tId}/stores/{sId}/ai/weekly` (written by Cloud Functions)

**Product-boundary note:** although this documentation folder is under the Answerlattice support family, the current Cloud Function runtime is MenuList-hosted. The AI intelligence jobs run from `functions/src/`, use MenuList `DB_COLLECTIONS`, scan MenuList tenant/store chat and KB collections, and are wired through `functions/src/decisionBlocksScoring.ts` plus the manual scheduler. They are not exported from `functions-answerlattice/` and should not be treated as completed Answerlattice separate-runtime migrations.

---

## 2. Complete File Map

### 2.1 Platform Admin Components

**Root:** `src/components/templates/platform/chatManagement/`

| File | Lines | Purpose |
|------|:-----:|---------|
| `index.tsx` | 16 | Entry point — renders `ConversationsList` directly. ROI Calculator and Weekly Digest moved to separate nav items. |
| `ConversationsList.tsx` | — | Paginated conversation table — SWR data fetching (`getConversationsPaginated`), 9 filter types via `ConversationFiltersPopover`, client-side filtering for quality/status/priority/tags/notes/unread/feedback. CSV export. Conversation detail on row click. |
| `ConversationDrawer.tsx` | — | Detail drawer — Full message thread with user/AI distinction, feedback display, regeneration badges, KB references, suggested questions, image display. Internal notes section. Export transcript (Markdown). Conversation metadata (mode, total messages, dates, satisfaction %). |
| `ConversationCard.tsx` | — | Conversation card for list display |
| `ConversationDetail.tsx` | — | Full conversation view |
| `ConversationFiltersPopover.tsx` | — | Filter popover — 9 filter types: mode (Select), feedback (Select), status (Select), priority (Select), quality (Select with 3 tiers), tags (multi-Select), hasNotes (Checkbox), isUnread (Checkbox), dateRange (RangePicker). Active filter count badge. |
| `MessageBubble.tsx` | — | Admin message rendering — Different from end-user version. Shows admin metadata, similarity scores, quality flags. |
| `AdminMetadataPopover.tsx` | — | Status/priority/tag management popover — Dropdowns for status (5 options), priority (3 options), tags (8 multi-select options). Updates saved to chat session. |
| `TeamNoteModal.tsx` | — | Internal notes — TipTap rich text editor. Saves via `updateSessionInternalNote()`. Tracks creator/modifier metadata. |
| `ROICalculator.tsx` | — | ROI dashboard — Statistic cards (hours saved, cost saved, automation rate, satisfied customers). Customizable inputs (hourly rate, ticket value, automation rate, platform cost). Derived metrics (net savings, ROI %, payback period). |
| `WeeklyDigest.tsx` | — | AI weekly summary — Reads directly from Firestore `insights/{tId}/stores/{sId}/ai/weekly`. Displays narrative, highlights, recommendations, key metrics. Manual regeneration button calls `/api/analytics/weekly-narrative/generate-local`. Export as text. Framer Motion animations. |
| `ChatInsights.tsx` | — | Analytics insights display |
| `ComprehensiveDashboard.tsx` | 1 | **Empty file** (deprecated) |

### 2.2 Database Layer (Admin Methods)

**Chat Sessions DAL** (`src/database/chatSessions/index.ts`) — Admin-specific functions:

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getAllChatSessionsForAdmin(session, filters)` | N+1 | 0 | Paginated (limit pageSize+1), Firestore filters (tId, mode, dateRange), client-side filters (feedback, search) |
| `getChatStatistics(session, dateRange)` | N | 0 | **EXPENSIVE** — full session scan. Use optimized version. |
| `getTopQuestions(session, limitCount)` | N | 0 | Full scan — normalizes questions, counts, sorts |
| `getKnowledgeGaps(session)` | N | 0 | Full scan — finds negative feedback patterns |
| `getChatVolumeOverTime(session, days)` | N | 0 | Date-range filtered daily counts |
| `updateSessionInternalNote(sessionId, noteJson, session)` | 0 | 1 | Creates note object with creator/modifier metadata; returns explicit `{ success, sessionId, note }` acknowledgement |
| `batchUpdateSessionMetadata(sessionIds, metadata)` | 0 | N batch | Batch status/priority/tag updates through Firestore writeBatch; returns explicit `{ success, sessionIds, updatedCount, updatedFields }` acknowledgement |

**Chat Analytics DAL** (`src/database/chatAnalytics/index.ts`) — Optimized versions:

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getChatStatisticsOptimized(session, days)` | ~30+N | 0 | Hybrid: historical aggregates + today's live |
| `getTopQuestionsOptimized(session, days)` | ~30 | 0 | From aggregated docs |
| `getKnowledgeGapsOptimized(session, days)` | ~30 | 0 | From aggregated docs |
| `getChatVolumeOverTimeOptimized(session, days)` | ~N | 0 | From aggregated docs |
| `getConversationsPaginated(session, pageSize, filters)` | pageSize+1 | 0 | Cursor-based, cost-controlled |
| `getLastAnalyticsUpdate(session)` | 1 | 0 | Data freshness check |

Today-live-stat fallback diagnostics are bounded through `src/database/chatAnalytics/diagnostics.ts`. If the live `chatSessions` read fails, optimized analytics continue with historical `chatAnalytics` aggregates and emit `answerlattice_chat_analytics_today_live_stats_failed` with bounded tenant/store/day metadata and source error name/code/status only. No raw session payloads, aggregate documents, or provider error objects are direct-console logged.

`ChatInsights.tsx` renders the System Health panel from `src/lib/analytics/dal.ts`. That DAL only emits health metrics derived from current analytics aggregates, such as knowledge coverage and user satisfaction. API response-time, uptime, and infrastructure latency metrics must stay absent until a real monitoring source is connected; the dashboard must not show hard-coded placeholder latency.

`ROICalculator.tsx` loads `/api/analytics/roi-metrics` with no-store cache, same-origin credentials, and manual redirect handling, then parses the response through a 64 KB bounded JSON reader and requires the documented `{ success: true, data }` envelope before replacing local ROI state. The data guard checks all rendered numeric metric fields, params, and date range values, and it accepts `paybackPeriod: null` as the JSON form of no finite payback period so the card renders `N/A` instead of treating `null` as a sub-month payback. ROI share text copy uses `src/lib/answerlattice/supportClipboard.ts`, waits for Clipboard API success or acknowledged textarea fallback success before closing the share modal, and logs `platform_roi_share_copy_failed` with bounded day/count/length/support metadata before fixed operator-facing copy when browser copy is unavailable or rejected.

Period-over-period comparisons use the same DAL wrapper and must stay source-backed. The comparison cards use total conversations, real aggregate `totalMessages`, satisfaction rate, and average messages per chat. Active-user comparison is not shown in this view until an active-user source is connected.

Chat Insights summary cards follow the same source-truth rule. The Overview card may show Knowledge Gaps from the existing aggregate-backed gap list, but it must not show a hard-coded "vs last period" trend unless a prior-period gap source is connected. The Feedback & Satisfaction Response Rate is derived from aggregate `totalFeedback / totalChats` and capped to 0-100%; it must not use fixed demo percentages.

The data-freshness failure banner does not render `stores/{sId}.chatAnalytics.lastError` directly. Stored job state remains available for operators, but the UI copy stays fixed so platform/admin surfaces do not expose raw provider or function error text.

Platform chat mutation acknowledgements are required before local admin state changes. `ConversationDetail.tsx` already requires `assertChatSessionUpdateSucceeded()` for single metadata edits; `ConversationDrawer.tsx` and `TeamNoteModal.tsx` require `assertChatSessionInternalNoteUpdateSucceeded()` before note success copy or parent note state updates; `ConversationsList.tsx` requires `assertChatSessionBatchMetadataUpdateSucceeded()` before batch status updates, selection reset, or success copy. These guards add no Firestore operations and only reject malformed/fallback DAL results.

`MessageBubble.tsx` also requires browser copy acknowledgement before showing copied-state operator feedback. It uses the shared Answerlattice support clipboard helper, falls back to textarea copy only when available, and treats fallback copy as successful only when `document.execCommand('copy')` returns `true`. If browser copy is unavailable or rejected, it logs `platform_chat_message_copy_failed` with bounded role, text-length, message-id length, and clipboard/fallback support metadata before showing fixed failure copy. It does not log message text or raw chat payloads.

Weekly digest manual regeneration response handling is also acknowledged before UI success copy. `WeeklyDigest.tsx` calls `/api/analytics/weekly-narrative/generate-local` with no-store cache, same-origin credentials, and manual redirect handling, then parses responses through a 64 KB bounded JSON reader and accepts only the documented top-level `{ status: "no_data" }` envelope or the successful `{ success: true, data: { weekStart, weekEnd, narrativeLength, highlightsCount } }` envelope. Malformed, oversized, rejected, or wrong-shape responses log bounded `platform_weekly_digest_generate_response_*` diagnostics and stay on fixed operator-facing failure copy; the no-data branch now reads the route's top-level `status` field rather than the stale `data.status` path.

### 2.3 Cloud Functions

| File | Schedule | Purpose | Output |
|------|----------|---------|--------|
| `functions/src/aggregateDailyChatStats.ts` | Daily 1 AM UTC | Aggregate chat sessions into daily analytics docs | `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` |
| `functions/src/analytics/feedbackIntelligence.ts` | Daily 2:01 AM UTC | AI analyzes negative feedback themes | `insights/{tId}/stores/{sId}/ai/feedback` |
| `functions/src/analytics/kbQuality.ts` | Daily 2:05 AM UTC | AI scores KB article quality | `insights/{tId}/stores/{sId}/ai/kbQuality` |
| `functions/src/analytics/weeklyNarrative.ts` | Sundays 2:10 AM UTC | AI generates weekly performance narrative | `insights/{tId}/stores/{sId}/ai/weekly` |

KB Quality uses one bounded store-level Gemini request for the top 10 signal-bearing articles and writes one `ai/kbQuality` document per store. It does not write `ai/kbQuality/{articleId}` documents.

### 2.4 Types

From `src/types/chatSession.ts`:
- `ConversationFilters` — mode, feedback, status, priority, quality, tags[], hasNotes, isUnread, dateRange
- `ADMIN_STATUS_OPTIONS` — 5 options: New, In Progress, Resolved, Follow-up, Closed
- `ADMIN_PRIORITY_OPTIONS` — 3 options: High, Normal, Low
- `ADMIN_TAG_OPTIONS` — 8 tags: Technical Issue, Billing Question, Feature Request, Bug Report, Account Issue, Integration Help, Training Needed, Follow-up Required
- `ADMIN_QUALITY_OPTIONS` — 3 tiers: Good (≥60%), Low (<60%), Very Low (<40%)

---

## 3. Quality Filter Implementation

Quality filtering is **entirely client-side** — calculated from `similarityScore` on message references:

```typescript
// Per-message quality check
const calculateQualityFlags = (references) => {
    if (!references?.length) return null;
    const scores = references.map(r => r.similarityScore || 0);
    const maxScore = Math.max(...scores);
    return {
        veryLowConfidence: maxScore < 0.4,     // ALL refs < 40%
        lowConfidence: maxScore < 0.6,          // ALL refs < 60%
    };
};

// Per-conversation filter
// Conversation matches if ANY AI message matches quality level
sessions.filter(session => {
    return session.messages.some(msg => {
        if (msg.role !== 'assistant') return false;
        const flags = calculateQualityFlags(msg.references);
        switch (filter) {
            case 'very_low': return flags.veryLowConfidence;
            case 'low': return flags.lowConfidence && !flags.veryLowConfidence;
            case 'good': return !flags.lowConfidence;
        }
    });
});
```

---

## 4. Identified Issues

| # | Issue | Severity | File | Notes |
|---|-------|----------|------|-------|
| 1 | `ComprehensiveDashboard.tsx` is empty (1 line) | Low | `chatManagement/ComprehensiveDashboard.tsx` | Dead code — should be deleted |
| 2 | `getChatStatistics()` does full session scan | Medium | `chatSessions/index.ts:395` | EXPENSIVE — use `getChatStatisticsOptimized()` |
| 3 | Client-side filtering loads all conversations before filtering | Medium | `ConversationsList.tsx` | Works for moderate scale, not 10K+ |
| 4 | Weekly digest has no retry on failure | Low | `WeeklyDigest.tsx` | Manual regeneration available |
| 5 | ROI calculator uses static formulas | Low | `ROICalculator.tsx` | Illustrative, not connected to actual cost data |
| 6 | No real-time updates on conversation list | Low | — | List fetched on load, not live |

---

## 5. Reverse Engineering Validation

| Category | Count | Verified |
|----------|:-----:|:--------:|
| UI components | 13 | ✅ |
| DAL functions (admin) | 13 | ✅ |
| Cloud Functions | 4 | ✅ |
| Types (admin-specific) | 5 constants/interfaces | ✅ |
| **Total** | **35 items** | **✅ 100%** |

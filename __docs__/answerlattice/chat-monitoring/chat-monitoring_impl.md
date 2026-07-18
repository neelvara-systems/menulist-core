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

**Product boundary:** chat analytics and derived insight jobs now run only through `functions-answerlattice/` and the dedicated Answerlattice Firestore project. Root MenuList scheduler task names remain visible as migrated/skipped run-log entries, while legacy manual callable names fail closed without datastore or provider work.

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

Conversation CSV spreadsheet formula boundary: `ConversationsList.tsx` uses `escapeCSVValue()` from `src/utils/exportUtils.ts` for both CSV headers and row cells. Do not reintroduce a private `escapeCSV` helper in this component; conversation titles, customer names, emails, and other string cells must share the same spreadsheet-formula neutralization boundary as root CSV/Excel exports.

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

`ROICalculator.tsx` loads `/api/analytics/roi-metrics` with no-store cache, same-origin credentials, and manual redirect handling, then parses the response through a 64 KB bounded JSON reader and requires the documented `{ success: true, data }` envelope before replacing local ROI state. The ROI metrics query-parameter boundary lives on the protected route: it parses `days` with a strict digit guard capped to 1-90 days, ignores malformed money overrides, and clamps valid overrides to finite server caps for hourly support cost, customer lifetime value, and platform monthly cost. This does not change the optimized chat statistics read path. The data guard checks all rendered numeric metric fields, params, and date range values, and it accepts `paybackPeriod: null` as the JSON form of no finite payback period so the card renders `N/A` instead of treating `null` as a sub-month payback. ROI share text copy uses `src/lib/answerlattice/supportClipboard.ts`, waits for Clipboard API success or acknowledged textarea fallback success before closing the share modal, and logs `platform_roi_share_copy_failed` with bounded day/count/length/support metadata before fixed operator-facing copy when browser copy is unavailable or rejected.

Period-over-period comparisons use the same DAL wrapper and must stay source-backed. The comparison cards use total conversations, real aggregate `totalMessages`, satisfaction rate, and average messages per chat. Active-user comparison is not shown in this view until an active-user source is connected.

Chat Insights summary cards follow the same source-truth rule. The Overview card may show Knowledge Gaps from the existing aggregate-backed gap list, but it must not show a hard-coded "vs last period" trend unless a prior-period gap source is connected. The Feedback & Satisfaction Response Rate is derived from aggregate `totalFeedback / totalChats` and capped to 0-100%; it must not use fixed demo percentages.

The data-freshness failure banner does not render `stores/{sId}.chatAnalytics.lastError` directly. Stored job state remains available for operators, but the UI copy stays fixed so platform/admin surfaces do not expose raw provider or function error text.

Platform chat mutation acknowledgements are required before local admin state changes. `ConversationDetail.tsx` already requires `assertChatSessionUpdateSucceeded()` for single metadata edits; `ConversationDrawer.tsx` and `TeamNoteModal.tsx` require `assertChatSessionInternalNoteUpdateSucceeded()` before note success copy or parent note state updates; `ConversationsList.tsx` requires `assertChatSessionBatchMetadataUpdateSucceeded()` before batch status updates, selection reset, or success copy. These guards add no Firestore operations and only reject malformed/fallback DAL results.

`MessageBubble.tsx` also requires browser copy acknowledgement before showing copied-state operator feedback. It uses the shared Answerlattice support clipboard helper, falls back to textarea copy only when available, and treats fallback copy as successful only when `document.execCommand('copy')` returns `true`. If browser copy is unavailable or rejected, it logs `platform_chat_message_copy_failed` with bounded role, text-length, message-id length, and clipboard/fallback support metadata before showing fixed failure copy. It does not log message text or raw chat payloads.

Weekly digest manual regeneration response handling is also acknowledged before UI success copy. `WeeklyDigest.tsx` calls `/api/analytics/weekly-narrative/generate-local` with no-store cache, same-origin credentials, and manual redirect handling, then parses responses through a 64 KB bounded JSON reader and accepts only the documented top-level `{ status: "no_data" }` envelope or the successful `{ success: true, data: { weekStart, weekEnd, narrativeLength, highlightsCount } }` envelope. Malformed, oversized, rejected, or wrong-shape responses log bounded `platform_weekly_digest_generate_response_*` diagnostics and stay on fixed operator-facing failure copy; the no-data branch now reads the route's top-level `status` field rather than the stale `data.status` path.

### 2.3 Cloud Functions

| File | Schedule | Purpose | Output |
|------|----------|---------|--------|
| `functions-answerlattice/src/answerlattice/chatAnalyticsAggregation.ts` | Existing Answerlattice nightly tenant run | Rebuild changed UTC dates from scoped sessions with continuation state | `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` plus one compact state doc |
| `functions-answerlattice/src/index.ts::backfillChatAnalytics` | Explicit platform action | Validate exact Answerlattice store scope, acquire a scoped lease, and rebuild 1-90 UTC days | Bounded response plus the canonical daily documents |
| `functions-answerlattice/src/answerlattice/chatIntelligence.ts` | After changed summaries; weekly projection on Sunday UTC | Build deterministic, source-hash-idempotent feedback and weekly summaries | `insights/{tId}/stores/{sId}/ai/{feedback,weekly}` |
| `src/app/api/analytics/weekly-narrative/generate-local/route.ts` | Explicit operator action only | Read two exact non-overlapping completed UTC weeks and optionally refresh wording with the Answerlattice provider client | `insights/{tId}/stores/{sId}/ai/weekly` |

The old root `functions/src/analytics/{feedbackIntelligence,weeklyNarrative,kbQuality,healthSignalsComputation}` workers are not active scheduler entry points. They must not be reconnected to MenuList Firestore.

The old root `aggregateDailyChatStats`, `backfillAggregates`, and `triggerAggregationManual` paths are compatibility-only. The MenuList maintenance task records `migrated_to_answerlattice_runtime`, both callables return `failed-precondition`, and those files contain no MenuList datastore access. The operator service calls `backfillChatAnalytics` through `answerlatticeFunctions`, validates the full response before updating UI state, and never falls back to the root Firebase client.

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

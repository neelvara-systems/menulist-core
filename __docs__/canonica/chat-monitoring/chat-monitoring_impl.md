# Chat Monitoring — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Chat Monitoring dashboard is a **hybrid feature**:
- **Client-side:** Conversation list, filters, detail drawer, metadata management, notes, ROI calculator (Firestore client SDK via DAL)
- **Cloud Functions:** Nightly aggregation, AI intelligence (feedback analysis, KB quality, weekly narrative)
- **Read-only from insights:** Weekly digest reads from `insights/{tId}/stores/{sId}/ai/weekly` (written by Cloud Functions)

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
| `WeeklyDigest.tsx` | — | AI weekly summary — Reads directly from Firestore `insights/{tId}/stores/{sId}/ai/weekly`. Displays narrative, highlights, recommendations, key metrics. Manual regeneration button (calls `triggerSchedulerManually()`). Export as text. Framer Motion animations. |
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
| `updateSessionInternalNote(sessionId, noteJson, session)` | 0 | 1 | Creates note object with creator/modifier metadata |

**Chat Analytics DAL** (`src/database/chatAnalytics/index.ts`) — Optimized versions:

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getChatStatisticsOptimized(session, days)` | ~30+N | 0 | Hybrid: historical aggregates + today's live |
| `getTopQuestionsOptimized(session, days)` | ~30 | 0 | From aggregated docs |
| `getKnowledgeGapsOptimized(session, days)` | ~30 | 0 | From aggregated docs |
| `getChatVolumeOverTimeOptimized(session, days)` | ~N | 0 | From aggregated docs |
| `getConversationsPaginated(session, pageSize, filters)` | pageSize+1 | 0 | Cursor-based, cost-controlled |
| `getLastAnalyticsUpdate(session)` | 1 | 0 | Data freshness check |

### 2.3 Cloud Functions

| File | Schedule | Purpose | Output |
|------|----------|---------|--------|
| `functions/src/aggregateDailyChatStats.ts` | Daily 1 AM UTC | Aggregate chat sessions into daily analytics docs | `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` |
| `functions/src/analytics/feedbackIntelligence.ts` | Daily 2:01 AM UTC | AI analyzes negative feedback themes | `insights/{tId}/stores/{sId}/ai/feedback` |
| `functions/src/analytics/kbQuality.ts` | Daily 2:05 AM UTC | AI scores KB article quality | `insights/{tId}/stores/{sId}/ai/kbQuality` |
| `functions/src/analytics/weeklyNarrative.ts` | Sundays 2:10 AM UTC | AI generates weekly performance narrative | `insights/{tId}/stores/{sId}/ai/weekly` |

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

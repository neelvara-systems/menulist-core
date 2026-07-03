# Chat Monitoring — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Enable platform administrators to monitor, manage, and analyze AI chatbot conversations — with quality filtering, conversation triage (status/priority/tags), internal team notes, ROI calculation, and AI-generated weekly performance reports.

### Scope

- Paginated conversation list with 9 filter types (mode, feedback, status, priority, quality, tags, notes, unread, date range)
- Conversation detail drawer with full message thread
- Admin metadata management (status, priority, tags per conversation)
- Internal team notes (TipTap rich text, not visible to end users)
- Quality-based filtering (Good ≥60%, Low <60%, Very Low <40% based on similarity scores)
- ROI calculator (hours saved, cost saved, automation rate)
- Weekly AI digest (Gemini-generated narrative, highlights, recommendations)
- CSV export with full conversation data
- Markdown transcript export
- Nightly chat analytics aggregation (Cloud Function)
- AI intelligence layer (feedback analysis, KB quality, weekly narratives)

### Out of Scope

- Real-time chat (admin cannot chat live with users)
- Conversation assignment to specific team members
- Auto-triage rules / automation
- SLA on chat response times
- Custom dashboards / report builder

---

## 2. User Role

**Platform Administrator only** — This feature is not accessible to SMB owners.

---

## 3. Conversation List

### 3.1 Filters (9 Types)

| Filter         | Options                                            | Type                                                   |
| -------------- | -------------------------------------------------- | ------------------------------------------------------ |
| **Mode**       | All, QnA, Assistant                                | Firestore query                                        |
| **Feedback**   | All, Positive, Negative, None                      | Client-side filter                                     |
| **Status**     | All, New, In Progress, Resolved, Follow-up, Closed | Client-side filter                                     |
| **Priority**   | All, High, Normal, Low                             | Client-side filter                                     |
| **Quality**    | All, Good (≥60%), Low (<60%), Very Low (<40%)      | Client-side filter (calculated from similarity scores) |
| **Tags**       | Multi-select from 8 tag options                    | Client-side filter                                     |
| **Has Notes**  | Boolean toggle                                     | Client-side filter                                     |
| **Unread**     | Boolean toggle                                     | Client-side filter                                     |
| **Date Range** | DatePicker range                                   | Firestore query                                        |

### 3.2 Quality Scoring

Quality is calculated in real-time from `similarityScore` on message references:

- **Good (≥60%)** — At least one reference has similarity ≥ 0.6
- **Low (<60%)** — All references between 0.4 and 0.6
- **Very Low (<40%)** — All references below 0.4
- Calculated per AI message, conversation flagged if ANY AI message matches filter

### 3.3 Pagination

- Default page size: 20 conversations
- Cursor-based pagination (Firestore `startAfter`)
- `limit(pageSize + 1)` pattern to detect next page
- Client-side search on title and userName

---

## 4. Conversation Detail Drawer

### 4.1 Full Message Thread

- User messages and AI responses displayed with timestamps
- AI messages show: crafted answer, source citations, similarity scores, suggested questions
- Regeneration badge on retried messages
- Feedback indicators (thumbs up/down with reasons and comments)
- Image display for messages with uploaded images

### 4.2 Admin Metadata (Popover)

- **Status:** New, In Progress, Resolved, Follow-up, Closed
- **Priority:** High, Normal, Low
- **Tags:** Multi-select from 8 options (Technical Issue, Billing Question, Feature Request, Bug Report, Account Issue, Integration Help, Training Needed, Follow-up Required)

### 4.3 Internal Notes

- TipTap rich text editor for team collaboration
- Not visible to end users
- Tracks who created and last modified
- Single note per conversation (array structure allows future multi-note)

### 4.4 Export Options

- **CSV export** — Full conversation data with messages, feedback, metadata
- **Transcript export** — Markdown format with formatted messages, feedback, and references

---

## 5. ROI Calculator

Calculates business value metrics:

- **Total hours saved** — Based on conversations handled × average resolution time
- **Monthly hours saved** — Rolling monthly calculation
- **Total cost saved** — Hours saved × support agent hourly rate
- **Monthly cost saved** — Rolling monthly
- **Conversations handled** — Total AI-resolved conversations
- **Automation rate** — % resolved without human intervention
- **Satisfied customers** — Based on positive feedback
- **Estimated revenue protected** — Based on customer retention value
- **Net savings** — Cost saved minus platform cost
- **ROI percentage** — Net savings / platform cost × 100
- **Payback period** — Time to recoup platform investment

Customizable inputs: hourly rate, average ticket value, automation rate, platform cost.

---

## 6. Weekly AI Digest

**Source:** Cloud Function (`weeklyNarrative.ts`) runs Sundays 2 AM UTC
**Storage:** `insights/{tId}/stores/{sId}/ai/weekly`
**Generated by:** Gemini 2.5 Flash

**Content:**

- Executive narrative (2-3 paragraphs)
- Key highlights (3-5 bullet points)
- Recommendations (3-5 action items)
- Key metrics: volume change %, satisfaction change %, top category
- Manual regeneration button available

Chat Insights summary metrics are aggregate-backed only. Response Rate means feedback received divided by total chats for the selected range, and Knowledge Gaps does not show a period trend unless a real prior-period gap comparison source is connected.

---

## 7. AI Intelligence Layer (Cloud Functions)

Current runtime boundary: the AI intelligence jobs below are MenuList-hosted chat-monitoring jobs. They run from `functions/src/`, are wired through the MenuList Decision Blocks scheduler/manual scheduler path, and write MenuList `insights/{tId}/stores/{sId}/ai/*` documents. They are not active `functions-answerlattice/` scheduler exports.

### 7.1 Daily Chat Aggregation

- **Schedule:** Daily at 1 AM UTC
- **Function:** `aggregateDailyChatStats`
- **Output:** `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` — daily aggregate document

### 7.2 Feedback Intelligence

- **Schedule:** Daily at 2:01 AM UTC (via master scheduler)
- **Function:** `feedbackIntelligence`
- **Output:** `insights/{tId}/stores/{sId}/ai/feedback` — themes, summary, top issues, recommendations

### 7.3 KB Quality

- **Schedule:** Daily at 2:05 AM UTC (via master scheduler)
- **Function:** `kbQuality`
- **Output:** `insights/{tId}/stores/{sId}/ai/kbQuality` — article quality scores, articles needing updates

### 7.4 Weekly Narrative

- **Schedule:** Sundays at 2:10 AM UTC (via master scheduler)
- **Function:** `weeklyNarrative`
- **Output:** `insights/{tId}/stores/{sId}/ai/weekly` — narrative, highlights, recommendations, metrics

---

## 8. Risks & Open Questions

| #   | Item                                                                    | Status                                               |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | `ComprehensiveDashboard.tsx` is empty (deprecated)                      | ✅ RESOLVED — file deleted in audit                  |
| 2   | No real-time updates on conversation list                               | List fetched on load, not live                       |
| 3   | Client-side filtering means all conversations loaded before filtering   | Works for moderate scale, not for 10K+ conversations |
| 4   | Weekly digest depends on Cloud Function running successfully            | No retry if Sunday run fails                         |
| 5   | ROI calculator uses static formulas — not connected to actual cost data | Illustrative, not precise                            |
| 6   | 13x `console.log`/`console.error` across 7 components                   | ✅ RESOLVED — all removed in audit                   |

---

## 9. STEP 9C Audit (2026-03-04)

### Bugs Fixed

- Removed 7x `console.log` debug statements from `ConversationsList.tsx` (session/filter/fetch logging)
- Removed `console.error` from `ConversationsList.tsx` (load more), `AdminMetadataPopover.tsx`, `TeamNoteModal.tsx`, `ConversationDrawer.tsx`, `WeeklyDigest.tsx` (2x), `ROICalculator.tsx`
- Deleted empty `ComprehensiveDashboard.tsx` (dead code, 1 empty line, never imported)

### Assessment

- **Architecture:** Well-structured. Paginated conversations with 9 filter types (3 Firestore, 6 client-side). Cost-optimized via `chatAnalytics` aggregation (99.95% read reduction).
- **Firebase Cost:** Dashboard load = ~120-140 reads. Conversation detail = 0 reads (already loaded). Note save = 1 write. Very efficient.
- **UI/UX:** Comprehensive admin toolset: quality scoring, admin metadata (status/priority/tags), internal notes, ROI calculator, weekly AI digest, CSV + transcript exports.
- **Answerlattice Integration:** Chat sessions feed signal mutation pipeline via `emitAnswerlatticeSignal` on negative feedback.

### Improvements Implemented (2026-03-04)

1. ✅ **Batch metadata update:** Select mode with checkboxes + "Set Status" dropdown on multiple conversations. Uses `batchUpdateSessionMetadata` DAL with `writeBatch`.

### Skipped (Validated as Not Needed)

2. ❌ **Real-time updates:** SWR revalidation sufficient at current scale. `onSnapshot` would create persistent connections per admin — costly and conflicts with paginated SWR architecture.
3. ❌ **Server-side search:** Firestore has no case-insensitive partial text search. Current client-side filter within loaded pages is the correct pattern.
4. ❌ **Weekly digest retry:** Admin can manually regenerate via existing button. Adding auto-retry for a once-per-week event adds complexity for minimal benefit.

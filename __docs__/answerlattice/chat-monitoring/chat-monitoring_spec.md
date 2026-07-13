# Chat Monitoring — Product Specification

> **Version:** 1.2.0
> **Last Updated:** 2026-07-12
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Enable Answerlattice operators to monitor, manage, and analyze support conversations with quality filtering, conversation triage, internal notes, ROI calculation, and source-backed weekly performance reports.

### Scope

- Paginated conversation list with 9 filter types (mode, feedback, status, priority, quality, tags, notes, unread, date range)
- Conversation detail drawer with full message thread
- Admin metadata management (status, priority, tags per conversation)
- Internal team notes (TipTap rich text, not visible to end users)
- Quality-based filtering (Good ≥60%, Low <60%, Very Low <40% based on similarity scores)
- ROI calculator (hours saved, cost saved, automation rate)
- Weekly digest built deterministically from completed scoped analytics, with optional explicit model-assisted wording refresh
- CSV export with full conversation data
- Markdown transcript export
- Nightly chat analytics aggregation (Cloud Function)
- Derived intelligence layer (feedback gaps and weekly summary)

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

## 6. Weekly Digest

**Source:** `syncAnswerlatticeChatIntelligence()` inside the existing Answerlattice nightly tenant run
**Storage:** `insights/{tId}/stores/{sId}/ai/weekly`
**Scheduled generation:** Deterministic from validated daily summaries; no provider call

**Content:**

- Executive narrative (2-3 paragraphs)
- Key highlights (3-5 bullet points)
- Recommendations (3-5 action items)
- Key metrics: volume change %, satisfaction change %, top category
- Manual model-assisted wording refresh is explicit, rate-limited, SAFE_MODE guarded, and owner-authorized

Chat Insights summary metrics are aggregate-backed only. Response Rate means feedback received divided by total chats for the selected range, and Knowledge Gaps does not show a period trend unless a real prior-period gap comparison source is connected.

---

## 7. Derived Intelligence Layer

Current runtime boundary: all active chat analytics and insight writes use the dedicated Answerlattice Firebase project and `functions-answerlattice/`. MenuList no longer invokes the legacy help-center workers.

### 7.1 Daily Chat Aggregation

- **Schedule:** Existing Answerlattice nightly tenant run
- **Function:** `syncChatAnalyticsNightly`
- **Output:** `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` — daily aggregate document

### 7.2 Feedback Intelligence

- **Schedule:** After changed daily summaries
- **Function:** `syncAnswerlatticeChatIntelligence`
- **Output:** `insights/{tId}/stores/{sId}/ai/feedback` — themes, summary, top issues, recommendations

### 7.3 Weekly Narrative

- **Schedule:** Sunday UTC inside the existing Answerlattice nightly tenant run
- **Function:** `syncAnswerlatticeChatIntelligence`
- **Output:** `insights/{tId}/stores/{sId}/ai/weekly` — narrative, highlights, recommendations, metrics

---

## 8. Risks & Open Questions

| #   | Item                                                                    | Status                                               |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | `ComprehensiveDashboard.tsx` is empty (deprecated)                      | ✅ RESOLVED — file deleted in audit                  |
| 2   | No real-time updates on conversation list                               | List fetched on load, not live                       |
| 3   | Client-side filtering means all conversations loaded before filtering   | Works for moderate scale, not for 10K+ conversations |
| 4   | Weekly digest depends on the Answerlattice nightly run                  | Manual refresh remains an explicit fallback          |
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

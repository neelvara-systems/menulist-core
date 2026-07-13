# Chat Monitoring — Firebase Cost & Operations Tracking

> **Version:** 1.2.0
> **Last Updated:** 2026-07-12
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections Used

**Product boundary:** these operations use the dedicated Answerlattice Firebase project. Active server aggregation and insight projection run from `functions-answerlattice/`. The MenuList scheduler and retained legacy callables perform no chat-monitoring datastore or provider work.

### 1.1 chatSessions (Read by Admin)

| Property | Value |
|----------|-------|
| **Collection** | `chatSessions` |
| **Access pattern** | Paginated reads with tenant filter |
| **Admin reads** | `getAllChatSessionsForAdmin`, `getConversationsPaginated` |
| **Admin writes** | `updateSessionInternalNote` (1 write per note save), `updateChatSession` (1 write per single metadata save), `batchUpdateSessionMetadata` (N batched metadata writes) |

### 1.2 chatAnalytics (Aggregated Stats)

| Property | Value |
|----------|-------|
| **Collection** | `chatAnalytics` |
| **Doc ID** | `{tId}_{sId}_{YYYY-MM-DD}` |
| **Written by** | `syncChatAnalyticsNightly` in the existing Answerlattice nightly tenant run |
| **Read by** | Optimized dashboard methods |

### 1.3 insights (Derived Intelligence)

| Property | Value |
|----------|-------|
| **Path** | `insights/{tId}/stores/{sId}/ai/{type}` |
| **Types** | `weekly`, `feedback` |
| **Written by** | `syncAnswerlatticeChatIntelligence` (deterministic) or explicit manual weekly refresh route |
| **Read by** | Analytics DAL and `WeeklyDigest.tsx` through `answerlatticeFirebaseClient` plus strict runtime DTOs |

---

## 2. Operations Per Action

### 2.1 Load Conversation List (Paginated)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `getConversationsPaginated(session, 20, filters)` | 21 | 0 |
| **Total** | **21** | **0** |

### 2.2 Load Full Dashboard (All Widgets)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Historical daily summaries for the selected range | up to 90; 30 by default | 0 |
| Today's live stats, only when today is selected | up to 500 today sessions | 0 |
| Weekly + feedback insight documents | 2 | 0 |
| Last analytics update | 1 | 0 |
| **Default hard ceiling** | **533** | **0** |

ROI Calculator loads call the protected `/api/analytics/roi-metrics` route with no-store cache, same-origin credentials, and manual redirect handling. That route reuses the optimized chat statistics path for the selected date window, performs ROI calculations in memory, and writes nothing. ROI metrics query-parameter boundary: `days`, `hourlyCost`, `clv`, and `platformCost` pass through a bounded numeric parser before calculations; malformed overrides are ignored and valid money overrides are clamped to finite server caps. No additional Firestore read/write/delete or provider call is introduced; no provider call is added by this boundary. The browser request/response acknowledgement in `ROICalculator.tsx` is cost-neutral: it validates the 64 KB capped response envelope, rendered metric fields, params, date range, and nullable payback period before replacing local state, but it does not add Firestore reads, writes, deletes, indexes, Cloud Functions, rules, Storage operations, cache invalidations, or provider calls.

Platform chat message copy and ROI share text copy are browser-local and cost-neutral. `src/lib/answerlattice/supportClipboard.ts` checks Clipboard API support, falls back to a textarea copy path only when available, and requires `document.execCommand('copy') === true` before copied feedback appears. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth operations, routes, Cloud Functions, indexes, rules, provider calls, or deployment requirement.

### 2.3 View Conversation Detail

| Step | Reads | Writes |
|------|:-----:|:------:|
| Conversation already in list (no extra read) | 0 | 0 |
| **Total** | **0** | **0** |

### 2.4 Save Internal Note

| Step | Reads | Writes |
|------|:-----:|:------:|
| `updateSessionInternalNote()` with acknowledged `{ success, sessionId, note }` result | 0 | 1 |
| **Total** | **0** | **1** |

### 2.5 Update Admin Metadata (Status/Priority/Tags)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `updateChatSession()` merge with acknowledged `{ success, sessionId, updatedFields }` result | 0 | 1 |
| **Total** | **0** | **1** |

**Batch status update:**

| Step | Reads | Writes |
|------|:-----:|:------:|
| `batchUpdateSessionMetadata()` writeBatch with acknowledged `{ success, sessionIds, updatedCount, updatedFields }` result | 0 | N selected conversations |
| **Total** | **0** | **N selected conversations** |

Admin chat mutation acknowledgement hardening is cost-neutral. Single metadata, internal-note, and batch status writes still use their existing Firestore write attempts, but platform UI now requires explicit acknowledgement before local note/session/batch-selection state or success copy changes. This adds no reads, no extra writes, no indexes, no rules, no Cloud Functions, and no deployment requirement.

### 2.6 View Weekly Digest

| Step | Reads | Writes |
|------|:-----:|:------:|
| Direct Firestore read of `insights/{tId}/stores/{sId}/ai/weekly` | 1 | 0 |
| **Total** | **1** | **0** |

### 2.7 Regenerate Weekly Digest

| Step | Reads | Writes | Gemini |
|------|:-----:|:------:|:------:|
| Call protected `/api/analytics/weekly-narrative/generate-local` route | current-week `chatAnalytics` query + previous-week comparison query | 1 `insights/{tId}/stores/{sId}/ai/weekly` merge when data exists | 1 Gemini call when data exists |
| **Total** | **varies** | **0-1** | **0 or 1 Gemini** |

The browser request/response acknowledgement for manual weekly-digest regeneration is cost-neutral. `WeeklyDigest.tsx` calls the protected route with no-store cache, same-origin credentials, and manual redirect handling, then validates the API response with a 64 KB bounded reader and documented success/no-data envelopes before warning or success copy. It does not add Firestore reads, writes, indexes, Cloud Functions, or provider calls.

Legacy day-count callers clamp to 1-90 days. Owner-selected date ranges are normalized to exact UTC date keys and reject invalid, future, reversed, or more-than-90-day inclusive windows.

System Health metrics in Chat Insights are display-only projections of the already-read analytics aggregate. The DAL does not create extra reads or writes for API response-time monitoring, and it must not emit hard-coded latency values while no monitoring source is connected.

The comparison view performs one optimized aggregate query for the selected period and one for the prior period. Custom periods are equal-length and non-overlapping; month comparisons use calendar-month shifting with month-end clamping.

Chat Insights overview and feedback summary cards also reuse the same optimized aggregate payload. Knowledge Gaps shows the aggregate-backed gap count without a placeholder prior-period trend, and Response Rate is calculated from `totalFeedback / totalChats` in memory. These cards add no Firestore read, write, delete, index, or Cloud Function dependency.

### 2.8 Nightly Aggregation (Cloud Function)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Discover changed scoped sessions | 0-501 per workspace | 0 |
| Rebuild each affected UTC date | 0-2,001 session reads + 1 existing-summary read | 0-1 per date |
| Persist continuation state | 1 | 0-1 only when cursor/state changes |

### 2.9 Derived Intelligence (Answerlattice Nightly)

| Operation | Reads | Writes | Provider |
|----------|:-----:|:------:|:--------:|
| Changed-session discovery | up to 501 per workspace run | 0 | 0 |
| Rebuild up to 7 affected UTC dates | up to 14,014 including existing-summary checks | up to 7 | 0 |
| Compact continuation state | 1 | 0-1 | 0 |
| Feedback/weekly projection | up to 16 (14 source days + 2 existing insights) | 0-2 only when source hash changes | 0 |
| **Per-workspace hard ceiling** | **14,532** | **10** | **0** |

Typical runs are much smaller: one changed date reads that day's bounded sessions plus one existing summary, then writes only if the source hash changed. Sunday weekly output reuses the same 14-day source query. No scheduled model call remains.

---

## 3. Cost Estimates

### Cost posture

Do not use a fixed monthly-dollar estimate here because actual cost depends on changed sessions, affected dates, dashboard usage, region, and current Firebase pricing. The enforceable controls are the query/write ceilings above, source-hash no-op writes, one compact continuation document, exact owner-selected date queries, SWR deduplication, and zero scheduled provider calls.

---

## 4. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `chatSessions` | `pId ASC, tId ASC, sId ASC, modifiedOn ASC, __name__ ASC` | Changed-session continuation scan |
| `chatSessions` | `pId ASC, tId ASC, sId ASC, createdOn ASC` | Exact UTC-day rebuild |
| `chatAnalytics` | `pId ASC, tId ASC, sId ASC, date ASC` | Exact aggregate and insight-source ranges |
| `chatAnalytics` | `pId ASC, tId ASC, sId ASC, modifiedOn DESC` | Last update check |

---

## 5. Cost Optimization Already In Place

| Strategy | Savings |
|----------|---------|
| **Aggregated analytics** | Historical dashboard ranges read daily summary documents, not raw sessions |
| **Hybrid dashboard** | Today's bounded live scan runs only when today is in the selected range |
| **ROI aggregate path** | ROI metrics use daily aggregates instead of raw session scan |
| **Paginated conversations** | 21 reads per page vs entire collection |
| **Client-side filters** | No extra Firestore queries for quality/status/priority/tags |
| **SWR caching** | Prevents redundant fetches on re-renders |
| **Direct scoped insight reads** | Weekly and feedback insight documents load together through SWR and strict DTOs |
| **Source-hash idempotency** | Unchanged deterministic insight output causes no write |
| **No scheduled model calls** | Feedback and weekly projection use deterministic source-backed wording |

# Chat Monitoring — Firebase Cost & Operations Tracking

> **Version:** 1.1.0
> **Last Updated:** 2026-06-30
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections Used

**Product-boundary note:** these costs apply to the current MenuList-hosted chat-monitoring runtime. The nightly/weekly Functions run from `functions/src/`, use MenuList Firestore collections, and write MenuList `insights/{tId}/stores/{sId}/ai/*` documents. They are not active `functions-answerlattice/` scheduler exports.

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
| **Written by** | Cloud Function `aggregateDailyChatStats` (nightly) |
| **Read by** | Optimized dashboard methods |

### 1.3 insights (AI Intelligence)

| Property | Value |
|----------|-------|
| **Path** | `insights/{tId}/stores/{sId}/ai/{type}` |
| **Types** | `weekly`, `feedback`, `kbQuality` |
| **Written by** | Cloud Functions (nightly/weekly) |
| **Read by** | `WeeklyDigest.tsx` (direct Firestore read) |

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
| Conversations list (page 1) | 21 | 0 |
| Historical stats (~30 days) | ~30 | 0 |
| Today's live stats | up to 500 today sessions | 0 |
| Top questions (30 days) | ~30 | 0 |
| Knowledge gaps (30 days) | ~30 | 0 |
| Volume chart (7 days) | ~7 | 0 |
| Last analytics update | 1 | 0 |
| **Total** | **~120-140** | **0** |

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

Optimized analytics DAL callers clamp date windows to 1-90 days even if a UI or API caller sends a larger value.

System Health metrics in Chat Insights are display-only projections of the already-read analytics aggregate. The DAL does not create extra reads or writes for API response-time monitoring, and it must not emit hard-coded latency values while no monitoring source is connected.

The comparison wrapper also reuses the already-read optimized aggregate payload. It carries `totalMessages` from `statistics.totalMessages` and does not add an active-user read, write, or placeholder value.

Chat Insights overview and feedback summary cards also reuse the same optimized aggregate payload. Knowledge Gaps shows the aggregate-backed gap count without a placeholder prior-period trend, and Response Rate is calculated from `totalFeedback / totalChats` in memory. These cards add no Firestore read, write, delete, index, or Cloud Function dependency.

### 2.8 Nightly Aggregation (Cloud Function)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query day's sessions per store | N per store | 0 |
| Write aggregated doc per store | 0 | 1 per store |
| **Per 10 stores** | **~500** | **10** |

### 2.9 AI Intelligence (Cloud Functions — Nightly/Weekly)

| Function | Reads | Writes | Gemini |
|----------|:-----:|:------:|:------:|
| Feedback Intelligence | ~50 per store | 1 per store | 1 per store |
| KB Quality | N articles + bounded query-signal reads | 1 per store | 1 per store |
| Weekly Narrative | ~7 analytics docs | 1 per store | 1 per store |
| **Per 10 stores (daily)** | **~600** | **20** | **20** |

KB Quality writes a single store insight document at `insights/{tId}/stores/{sId}/ai/kbQuality`. The Gemini request is bounded to the top 10 signal-bearing articles per store, with up to 5 query examples per signal type per article. It does not create per-article insight documents.

---

## 3. Cost Estimates

### Scenario: 10 stores, 5 admin dashboard loads/day

| Component | Daily Reads | Daily Writes | Monthly Cost |
|-----------|:-----------:|:------------:|:------------:|
| Dashboard loads | 5 × 130 = 650 | 0 | ~$0.01 |
| Internal notes | 0 | ~5 | ~$0.0001 |
| Metadata updates | 0 | ~10 | ~$0.0001 |
| Weekly digest views | ~5 | 0 | ~$0.0001 |
| Nightly aggregation (CF) | 500 | 10 | ~$0.02 |
| AI Intelligence (CF) | 600 | 20 | ~$0.02 |
| **Firestore subtotal** | **~1,755/day** | **~45/day** | **~$0.05/month** |

| Gemini Model | Calls/Day | Monthly Cost |
|-------------|:---------:|:------------:|
| Feedback Intelligence | 10 | ~$0.05 |
| KB Quality | 10 | ~$0.05 |
| Weekly Narrative | 1.4 (10/week) | ~$0.01 |
| **Gemini subtotal** | | **~$0.11/month** |

**Total: ~$0.16/month for 10 stores**

### Scale: 1,000 stores

| Component | Monthly Cost |
|-----------|:------------:|
| Firestore | ~$5 |
| Gemini | ~$11 |
| **Total** | **~$16/month** |

---

## 4. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `chatSessions` | `tId ASC, modifiedOn DESC` | Admin conversation list |
| `chatSessions` | `tId ASC, sId ASC, modifiedOn DESC` | Paginated conversations |
| `chatSessions` | `tId ASC, mode ASC, modifiedOn DESC` | Mode-filtered conversations |
| `chatAnalytics` | `tId ASC, sId ASC, date ASC` | Aggregated stats queries |
| `chatAnalytics` | `tId ASC, sId ASC, modifiedOn DESC` | Last update check |

---

## 5. Cost Optimization Already In Place

| Strategy | Savings |
|----------|---------|
| **Aggregated analytics** | 99.95% fewer reads than raw session scanning |
| **Hybrid dashboard** | Today's live + historical aggregates |
| **ROI aggregate path** | ROI metrics use daily aggregates instead of raw session scan |
| **Paginated conversations** | 21 reads per page vs entire collection |
| **Client-side filters** | No extra Firestore queries for quality/status/priority/tags |
| **SWR caching** | Prevents redundant fetches on re-renders |
| **Direct Firestore read** for weekly digest | 1 read (not API route overhead) |

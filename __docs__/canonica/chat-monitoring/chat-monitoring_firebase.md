# Chat Monitoring — Firebase Cost & Operations Tracking

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections Used

### 1.1 chatSessions (Read by Admin)

| Property | Value |
|----------|-------|
| **Collection** | `chatSessions` |
| **Access pattern** | Paginated reads with tenant filter |
| **Admin reads** | `getAllChatSessionsForAdmin`, `getConversationsPaginated` |
| **Admin writes** | `updateSessionInternalNote` (1 write per note save) |

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
| Today's live stats | N (today only, ~5-20) | 0 |
| Top questions (30 days) | ~30 | 0 |
| Knowledge gaps (30 days) | ~30 | 0 |
| Volume chart (7 days) | ~7 | 0 |
| Last analytics update | 1 | 0 |
| **Total** | **~120-140** | **0** |

### 2.3 View Conversation Detail

| Step | Reads | Writes |
|------|:-----:|:------:|
| Conversation already in list (no extra read) | 0 | 0 |
| **Total** | **0** | **0** |

### 2.4 Save Internal Note

| Step | Reads | Writes |
|------|:-----:|:------:|
| `updateSessionInternalNote()` | 0 | 1 |
| **Total** | **0** | **1** |

### 2.5 Update Admin Metadata (Status/Priority/Tags)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `updateChatSession()` merge | 0 | 1 |
| **Total** | **0** | **1** |

### 2.6 View Weekly Digest

| Step | Reads | Writes |
|------|:-----:|:------:|
| Direct Firestore read of `insights/{tId}/stores/{sId}/ai/weekly` | 1 | 0 |
| **Total** | **1** | **0** |

### 2.7 Regenerate Weekly Digest

| Step | Reads | Writes | Gemini |
|------|:-----:|:------:|:------:|
| Call `triggerSchedulerManually()` Cloud Function | varies | varies | 1+ |
| **Total** | **varies** | **varies** | **1+ Gemini** |

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
| KB Quality | N articles | 1 per store | 1 per store |
| Weekly Narrative | ~7 analytics docs | 1 per store | 1 per store |
| **Per 10 stores (daily)** | **~600** | **20** | **20** |

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
| **Paginated conversations** | 21 reads per page vs entire collection |
| **Client-side filters** | No extra Firestore queries for quality/status/priority/tags |
| **SWR caching** | Prevents redundant fetches on re-renders |
| **Direct Firestore read** for weekly digest | 1 read (not API route overhead) |

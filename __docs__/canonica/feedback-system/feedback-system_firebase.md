# Feedback System — Firebase Cost & Operations Tracking

> **Version:** 1.4.0
> **Last Updated:** 2026-05-31
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections

### 1.1 feedback (Help Center Wizard)

| Property | Value |
|----------|-------|
| **Collection** | `feedback` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.FEEDBACK` |
| **Doc ID** | Auto-generated |
| **Scoping** | `pId="CN" + tId + sId + uId` fields via `canonicaRequestBodyComposer` |
| **Surface fields** | Optional `contextKey`, `surfaceId`, `surfaceLabel`, `surfaceAssignedBy`, `surfaceAssignedAt` for owner sorting |
| **Avg Doc Size** | 0.5-2 KB |
| **Growth Rate** | Per-submission (infrequent) |

### 1.2 canonica_signalEvents (Feedback Signal Mirror)

| Property | Value |
|----------|-------|
| **Collection** | `canonica_signalEvents` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS` |
| **Doc ID** | Auto-generated |
| **Scoping** | `pId="CN" + tId + sId`; metadata links `feedbackId` |
| **Avg Doc Size** | 0.5-2 KB |
| **Growth Rate** | One non-blocking signal per Help Center feedback submission when `ENABLE_CANONICA_SIGNAL_MUTATION=true` |

### 1.3 article_feedback (Content Feedback)

| Property | Value |
|----------|-------|
| **Path** | `article_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.ARTICLE_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array) |

### 1.4 changelog_feedback (Content Feedback)

| Property | Value |
|----------|-------|
| **Path** | `changelog_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.CHANGELOG_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array) |

---

## 2. Operations Per Action

### 2.1 Submit Help Center Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| `addFeedback(data)` | 0 | 1 |
| Optional `feedback` signal event | 0 | 0-1 |
| Use returned `addFeedback()` payload for UI | 0 | 0 |
| **Total** | **0** | **1-2** |

Widget negative-feedback signals dedupe by `searchHistoryId` within the active runtime process to avoid duplicate signal writes from repeated clicks on the same answer.

### 2.2 Get Latest Feedback (On Page Load)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: `uId + tId + sId`, limit 1 | 1 | 0 |
| **Total** | **1** | **0** |

### 2.3 Owner Reviews Workspace Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: `tId + sId`, orderBy `createdOn desc`, limit 200 | 1 bounded query | 0 |
| Query active Product Surfaces for assignment/filter options | 1 bounded query | 0 |
| **Total** | **2 bounded queries** | **0** |

### 2.4 Assign Product Surface To Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| Owner sets or clears Product Surface on selected feedback row | 0 | 1 |
| **Total** | **0** | **1** |

### 2.5 Add Feedback To Support Board

| Step | Reads | Writes |
|------|:-----:|:------:|
| Owner clicks **Add to Support Board** on a selected feedback row | 0 | 1 |
| Surface context carried into `relatedSurfaceId` / `relatedContextKeys` | 0 | 0 |
| **Total** | **0** | **1** |

### 2.6 Article Like/Dislike

| Step | Reads | Writes |
|------|:-----:|:------:|
| Read article (current counts) | 1 | 0 |
| Update likes/dislikes | 0 | 1 |
| **Total** | **1** | **1** |

### 2.7 Changelog Entry Like/Dislike

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction: read page | 1 | 0 |
| Transaction: update entry in page | 0 | 1 |
| **Total** | **1** | **1** |

### 2.8 Add Content Comment Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction: read/create feedback doc | 1 | 1 |
| **Total** | **1** | **1** |

---

## 3. Cost Estimates

### Scenario: 10 stores, 5 feedback submissions/month, 30 likes/month, 10 comments/month

| Operation | Reads/mo | Writes/mo |
|-----------|:--------:|:---------:|
| Help Center feedback submit | 0 | 5 |
| Feedback signal mirror | 0 | 5 |
| Latest feedback load | 100 | 0 |
| Owner feedback review | 10 bounded queries | 0 |
| Product Surface options for owner review | 10 bounded queries | 0 |
| Product Surface assignment on feedback | 0 | 5 |
| Add selected feedback to Support Board | 0 | 2 |
| Article likes/dislikes | 30 | 30 |
| Changelog likes/dislikes | 30 | 30 |
| Content comments | 10 | 10 |
| **Total** | **~190 bounded reads** | **87** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | ~190 bounded reads | ~$0.00008 |
| Firestore writes | ~87 | ~$0.00010 |
| **Total** | | **~$0.0001/month** |

Essentially free at any reasonable scale.

---

## 4. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `feedback` | `uId ASC, tId ASC, sId ASC, createdOn DESC` | Latest feedback per user |
| `feedback` | `tId ASC, sId ASC, createdOn DESC` | Owner workspace feedback review |
| `canonica_productSurfaces` | existing Product Surface indexes | Surface assignment/filter options |
| `canonica_signalEvents` | `tId ASC, sId ASC, timestamp DESC` | Existing recent support-signal query used by Signal Queue / Support Board |

Feedback review reads are capped in the DAL at 200 rows even if a caller passes a larger limit.

---

## 5. Firestore Rules

| Collection | Read | Create | Update/Delete |
|------------|------|--------|---------------|
| `feedback` | Platform admin, support-control users in same `tId+sId`, or the submitting user reading their own row | Platform admin/support-control users, or an authenticated tenant user creating their own feedback row | Support-control update only; delete denied |
| `canonica_signalEvents` | Support-control users in same `tId+sId` | Support-control users, plus self-scoped `type='feedback'` events from Help Center feedback | Append-only; client update/delete denied. Canonica nightly/admin TTL owns archival. |

This allows end users to submit and view their own latest feedback without granting them access to owner review surfaces.

---

## 6. DAL Function → Collection Mapping

| DAL Function | Collection | Operation |
|-------------|-----------|-----------|
| `addFeedback` | `feedback` + `canonica_signalEvents` | addDoc + optional non-blocking signal addDoc |
| `updateFeedbackSurfaceForWorkspace` | `feedback` | updateDoc surface assignment fields |
| `getFeedbackForWorkspace` | `feedback` | getDocs bounded query |
| `getProductSurfacesForSession` | `canonica_productSurfaces` | getDocs bounded query for assignment options |
| `createCanonicaSupportBoardCard` from feedback review | `canonica_supportBoardCards` | addDoc |
| `getLatestFeedbackForUser` | `feedback` | getDocs (query, limit 1) |
| `updateArticleFeedback` | `kb_articles` | getDoc + setDoc merge |
| `updateChangelogFeedback` | `changelog/{tId}/{sId}` | Transaction: get + update |
| `addContentFeedback` | `{type}_feedback/{tId}/{sId}` | Transaction: get + set/update |
| `updateContentFeedback` | Router | Routes to above handlers |

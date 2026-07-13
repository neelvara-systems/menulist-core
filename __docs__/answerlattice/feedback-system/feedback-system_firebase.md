# Feedback System — Firebase Cost & Operations Tracking

> **Version:** 1.7.0
> **Last Updated:** 2026-07-11
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
| **Scoping** | `pId='AL' + tId + sId + uId` fields via `answerlatticeRequestBodyComposer` |
| **Surface fields** | Optional `contextKey`, `surfaceId`, `surfaceLabel`, `surfaceAssignedBy`, `surfaceAssignedAt` for owner sorting |
| **Avg Doc Size** | 0.5-2 KB |
| **Growth Rate** | Per-submission (infrequent) |

### 1.2 answerlattice_signalEvents (Feedback Signal Mirror)

| Property | Value |
|----------|-------|
| **Collection** | `answerlattice_signalEvents` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS` |
| **Doc ID** | Auto-generated |
| **Scoping** | `pId='AL' + tId + sId`; metadata links `feedbackId` |
| **Avg Doc Size** | 0.5-2 KB |
| **Growth Rate** | One non-blocking signal per exact-owned Help Center feedback submission when `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION=true`; malformed/coercive scope is skipped with a bounded diagnostic and dispatch-loader failures are observable |

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

Widget negative-feedback signals dedupe by `searchHistoryId` within the active runtime process to avoid duplicate signal writes from repeated clicks on the same answer. Widget feedback validates `searchHistoryId` through the shared Firestore document-ID boundary before updating `aiSearchHistory`.

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
| Transaction reads article and actor audit row | 2 | 0 |
| Update likes/dislikes and create/append audit row | 0 | 2 (1 when audit is capped) |
| **Total** | **2** | **1-2** |

### 2.7 Changelog Entry Like/Dislike

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction reads page and actor audit row | 2 | 0 |
| Update entry and create/append audit row | 0 | 2 (1 when audit is capped) |
| **Total** | **2** | **1-2** |

### 2.8 Add Content Comment Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| Comment is sanitized and included in the same reaction transaction | Included above | Included above |
| **Total** | **0 additional** | **0 additional** |

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
| Article likes/dislikes + capped reaction audit log | 60 | 60 |
| Changelog likes/dislikes + capped reaction audit log | 60 | 60 |
| Owner opens reaction details | 10 bounded document reads | 0 |
| Content comments | Included in reaction audit log | Included in reaction audit log |
| **Total** | **~250 bounded reads** | **147** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | ~250 bounded reads | ~$0.00010 |
| Firestore writes | ~147 | ~$0.00018 |
| **Total** | | **~$0.0003/month** |

Reaction activity is capped at 200 events per article/changelog entry document. Below the cap, rules allow only an exact one-item append; at the cap the audit row becomes immutable and later reactions update only the source counter. Owner reaction details load only when a specific entry preview is opened. Normal changelog/article browsing still uses existing aggregate counters and does not read the reaction activity log.

The browser reaction marker adds no Firebase operation. It is a versioned local acknowledgement keyed and envelope-checked by `tId+sId+uId+contentType`, capped at 500 exact entries, and discarded on legacy/malformed/cross-scope input. Firestore counters and actor audit rows remain authoritative.

Essentially free at any reasonable scale.

---

## 4. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `feedback` | `uId ASC, tId ASC, sId ASC, createdOn DESC` | Latest feedback per user |
| `feedback` | `tId ASC, sId ASC, createdOn DESC` | Owner workspace feedback review |
| `answerlattice_productSurfaces` | existing Product Surface indexes | Surface assignment/filter options |
| `answerlattice_signalEvents` | `tId ASC, sId ASC, timestamp DESC` | Existing recent support-signal query used by Signal Queue / Support Board |

Feedback review reads are capped in the DAL at 200 rows even if a caller passes a larger limit.

---

## 5. Firestore Rules

| Collection | Read | Create | Update/Delete |
|------------|------|--------|---------------|
| `feedback` | Platform admin, support-control users in same `tId+sId`, or the submitting user reading their own row | Exact admitted payload only; platform admin/support-control users, or an authenticated tenant user creating their own scoped/actor-bound row | Support-control users may change only Product Surface assignment fields plus modification metadata; content, actor and scope changes are denied; delete denied |
| `answerlattice_signalEvents` | Support-control users in same `tId+sId` | Support-control users, plus self-scoped `type='feedback'` events from Help Center feedback | Append-only; client update/delete denied. Answerlattice nightly/admin TTL owns archival. |
| `article_feedback/{tId}/{sId}/{docId}` | Platform admin or authenticated Answerlattice tenant members with product permissions for the same path scope | Same-scope permitted user; exactly one valid actor item and `pId='AL'` metadata | Exact one-item append plus modification metadata while below 200; capped history replacement and delete denied |
| `changelog_feedback/{tId}/{sId}/{docId}` | Platform admin or authenticated Answerlattice tenant members with product permissions for the same path scope | Same-scope permitted user; exactly one valid actor item and `pId='AL'` metadata | Exact one-item append plus modification metadata while below 200; capped history replacement and delete denied |

This allows end users to submit and view their own latest feedback without granting them access to owner review surfaces. Content reaction logs are separate because the current client transaction must read the entry-specific feedback document before appending the next capped reaction event.

The `feedback` create contract requires the canonical category type, its relevant fields only, `pId='AL'`, bounded scope/actor/trace metadata, valid timestamps, a null or exact-key source context, canonical issue/request values, and no duplicate votes. The application performs the same admission before `answerlatticeRequestBodyComposer`; rules are the independent enforcement layer. Legacy rows are not rewritten by reads, and surface-only updates remain compatible because rules constrain changed keys instead of requiring old documents to satisfy the new complete create schema.

**Deployment status (2026-07-11):** the local rules emulator and 102/102 aggregate source gate pass. The Node 22 rules-only `answerlattice-qa` deploy stopped at the Firebase Rules API test request with HTTP 403 caller permission before upload, so QA does not yet enforce this stricter contract.

The updated content-reaction append/item rules passed the same local emulator and 102/102 aggregate. A required post-update retry returned the identical Rules API HTTP 403 before upload. Do not retry the unchanged command until QA IAM changes.

---

## 6. DAL Function → Collection Mapping

| DAL Function | Collection | Operation |
|-------------|-----------|-----------|
| `addFeedback` | `feedback` + `answerlattice_signalEvents` | addDoc + optional non-blocking signal addDoc |
| `updateFeedbackSurfaceForWorkspace` | `feedback` | updateDoc surface assignment fields |
| `getFeedbackForWorkspace` | `feedback` | getDocs bounded query |
| `getProductSurfacesForSession` | `answerlattice_productSurfaces` | getDocs bounded query for assignment options |
| `createAnswerlatticeSupportBoardCard` from feedback review | `answerlattice_supportBoardCards` | addDoc |
| `getLatestFeedbackForUser` | `feedback` | getDocs (query, limit 1) |
| `updateContentFeedbackWithAudit` | `kb_articles` or `changelog/{tId}/{sId}` plus `{type}_feedback/{tId}/{sId}` | One transaction: read both, update source, create/exact-append audit below cap |
| `updateContentFeedback` | Router | Routes to above handlers |

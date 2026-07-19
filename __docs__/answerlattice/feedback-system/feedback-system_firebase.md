# Feedback System — Firebase Cost & Operations Tracking

> **Version:** 1.9.0
> **Last Updated:** 2026-07-19
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections

### 1.1 feedback (Help Center Wizard)

| Property | Value |
|----------|-------|
| **Collection** | `feedback` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.FEEDBACK` |
| **Doc ID** | Deterministic `feedback_{48-char hash}` from exact workspace, actor and request ID |
| **Scoping** | Server-derived `pId='AL' + tId + sId + uId`; caller scope/identity is not accepted |
| **Surface fields** | Optional `contextKey`, `surfaceId`, `surfaceLabel`, `surfaceAssignedBy`, `surfaceAssignedAt` for owner sorting |
| **Avg Doc Size** | 0.5-2 KB |
| **Growth Rate** | Per-submission (infrequent) |

### 1.2 answerlattice_signalEvents (Feedback Signal Mirror)

| Property | Value |
|----------|-------|
| **Collection** | `answerlattice_signalEvents` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS` |
| **Doc ID** | Deterministic from `metadata.feedbackId` through the signal identity boundary |
| **Scoping** | `pId='AL' + tId + sId`; metadata links `feedbackId` |
| **Avg Doc Size** | 0.5-2 KB |
| **Growth Rate** | At most one signal per deterministic feedback document when `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION=true`; exact submission replays retry the same signal identity without duplication |

### 1.3 article_feedback (Content Feedback)

| Property | Value |
|----------|-------|
| **Path** | `article_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.ARTICLE_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array) |
| **Internal actor state** | One sibling `state1_{40-char hash}` document stores up to 5,000 active actor-hash -> sentiment entries; client reads/writes denied |

### 1.4 changelog_feedback (Content Feedback)

| Property | Value |
|----------|-------|
| **Path** | `changelog_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.CHANGELOG_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array) |
| **Internal actor state** | One sibling `state1_{40-char hash}` document stores up to 5,000 active actor-hash -> sentiment entries; client reads/writes denied |

### 1.5 faq_feedback (Content Feedback)

| Property | Value |
|----------|-------|
| **Path** | `faq_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.FAQ_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array, capped at 200 items) |
| **Internal actor state** | One sibling `state1_{40-char hash}` document stores up to 5,000 active actor-hash -> sentiment entries; client reads/writes denied |

---

## 2. Operations Per Action

### 2.1 Submit Help Center Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| Server transaction reads deterministic feedback ID | 1 | 0 |
| Create feedback when request is new | 0 | 0-1 |
| Optional deterministic `feedback` signal event | 0-1 on replay verification | 0-1 |
| Use returned `addFeedback()` payload for UI | 0 | 0 |
| **Total** | **1-2** | **0-2** |

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
| Transaction reads article, actor audit row, and active-actor state | 3 | 0 |
| Update likes/dislikes, actor state, and create/append audit row | 0 | 2-3 (2 when audit is capped) |
| **Total** | **3** | **2-3** |

### 2.7 Changelog Entry Like/Dislike

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction reads page, actor audit row, and active-actor state | 3 | 0 |
| Update entry, actor state, and create/append audit row | 0 | 2-3 (2 when audit is capped) |
| **Total** | **3** | **2-3** |

### 2.8 Add Content Comment Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| Comment is sanitized and included in the same reaction transaction | Included above | Included above |
| **Total** | **0 additional** | **0 additional** |

### 2.9 FAQ Like/Dislike

| Step | Reads | Writes |
|------|:-----:|:------:|
| Server transaction reads published FAQ, actor audit row, and active-actor state | 3 | 0 |
| Update counters/idempotency, actor state, and create/append audit row | 0 | 2-3 (2 when audit is capped) |
| Added dislike creates deterministic feedback signal | 0 | 1 |
| **Total** | **3** | **2-4** |

The same optional dislike-signal write applies to article and changelog reactions. It is transactionally coupled and idempotent.

---

## 3. Cost Estimates

### Illustrative Scenario: 10 stores, 5 feedback submissions/month, 30 non-negative reactions/month, 10 comments/month

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
| FAQ likes/dislikes + capped reaction audit log | Not included in this example | Not included in this example |
| Added-dislike signal writes | 0 | One per idempotent added dislike; not included in this example |
| Owner opens reaction details | 10 bounded document reads | 0 |
| Content comments | Included in reaction audit log | Included in reaction audit log |
| **Total** | **~250 bounded reads** | **147** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | ~250 bounded reads | ~$0.00010 |
| Firestore writes | ~147 | ~$0.00018 |
| **Total** | | **~$0.0003/month** |

Reaction activity is capped at 200 visible events per article/changelog/FAQ item document. At the cap, later valid reactions update the source counter and active-actor state without expanding visible audit history. Owner reaction details load only `doc1_*` when a specific item preview is opened. Normal customer browsing uses existing aggregate counters and does not read reaction audit or actor state.

The browser reaction marker adds no Firebase operation. It is a versioned local acknowledgement keyed and envelope-checked by `tId+sId+uId+contentType`, capped at 500 exact entries, and discarded on legacy/malformed/cross-scope input. Firestore counters plus the internal active-actor state are authoritative; the visible actor audit is bounded review history.

This example is a scale illustration, not a billing promise. Actual cost depends on reaction mix, negative-signal writes, owner audit reads, and regional Firestore pricing.

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
| `feedback` | Platform support/admin, exact `canManageSupport` users in same `tId+sId`, or the submitting user reading their own row | Denied; authenticated server route/Admin SDK only | Exact support managers may change only Product Surface assignment fields plus modification metadata; content, actor and scope changes are denied; delete denied |
| `answerlattice_signalEvents` | Support-control users in same `tId+sId` | Exact support-control users only; Help Center/customer feedback signals are server-owned | Append-only; client update/delete denied. Answerlattice nightly/admin TTL owns archival. |
| `article_feedback/{tId}/{sId}/{docId}` | Exact-workspace knowledge or support operator may read only `doc1_*`; `state1_*` is hidden | Denied; server-owned | Denied; server-owned |
| `changelog_feedback/{tId}/{sId}/{docId}` | Exact-workspace knowledge or support operator may read only `doc1_*`; `state1_*` is hidden | Denied; server-owned | Denied; server-owned |
| `faq_feedback/{tId}/{sId}/{docId}` | Exact-workspace knowledge or support operator may read only `doc1_*`; `state1_*` is hidden | Denied; server-owned | Denied; server-owned |

This allows end users to view their own latest private feedback without granting unrelated workspace members or widget-only managers access to owner review data. Submissions and published-content reactions use authenticated APIs and Admin SDK; customer clients never receive write access to feedback documents, source counters, audit paths, or active-actor state.

The feedback request contract requires a bounded request ID and one canonical category payload. The server derives scope, actor, timestamps and deterministic identity, persists an exact submission fingerprint, and rejects changed replays. Legacy rows are not rewritten by reads, and surface-only updates remain compatible because rules constrain changed keys.

**Deployment status (2026-07-19):** dedicated/shared local feedback rule emulators, content-feedback server emulator, content contracts, and focused source gates pass. The current remote deployment state requires authenticated QA deployment and readback. The latest attempted QA deploys stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule change was confirmed.

---

## 6. DAL Function → Collection Mapping

| DAL Function | Collection | Operation |
|-------------|-----------|-----------|
| `addFeedback` | Protected submission API client | Validate request/response and preserve bounded retry request ID; no direct Firestore mutation |
| `executeAnswerlatticeFeedbackSubmission` | `feedback` + optional `answerlattice_signalEvents` | Admin transaction for deterministic create/replay, followed by deterministic signal acknowledgement |
| `updateFeedbackSurfaceForWorkspace` | `feedback` | updateDoc surface assignment fields |
| `getFeedbackForWorkspace` | `feedback` | getDocs bounded query |
| `getProductSurfacesForSession` | `answerlattice_productSurfaces` | getDocs bounded query for assignment options |
| `createAnswerlatticeSupportBoardCard` from feedback review | `answerlattice_supportBoardCards` | addDoc |
| `getLatestFeedbackForUser` | `feedback` | getDocs (query, limit 1) |
| `updateContentFeedbackWithAudit` | Protected API client | Validate request/response and preserve bounded retry request ID; no direct Firestore mutation |
| `executeAnswerlatticeContentFeedback` | `kb_articles`, `answerlattice_faqs`, or `changelog/{tId}/{sId}` plus `{type}_feedback/{tId}/{sId}` and optional `answerlattice_signalEvents` | One Admin transaction: read source/audit/actor state, enforce actor transition, update source/state, create/exact-append audit below cap, and create deterministic signal for an added dislike |
| `updateContentFeedback` | Router | Routes to above handlers |

---

## 7. Retention And Deletion

- Private Help Center `feedback` rows are durable operational records. There is no client delete and no feature-local automated cleanup.
- Article/changelog/FAQ `doc1_*` actor-audit documents carry a refreshed 365-day `expiresAt`; Answerlattice nightly cleanup deletes expired rows per exact tenant/workspace in bounded batches.
- Internal `state1_*` active-reaction documents remain durable while the source content remains addressable; removing the final active reaction deletes the state document. They contain only actor hashes, not names, email, phone or comments.
- Source counters remain on the published content object when an audit row expires.
- Signal retention follows the shared signal-event policy.
- Full workspace deletion and verified cascading erasure are cross-cutting account-lifecycle requirements; they are not claimed by this feature.

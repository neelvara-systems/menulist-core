# Feedback System — Technical Implementation Blueprint

> **Version:** 1.4.0
> **Last Updated:** 2026-05-31
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Feedback System is a **client-side DAL feature** with no API routes. Three subsystems:
1. **Help Center Feedback Flow** — selectable category form -> `addFeedback()` -> Answerlattice `feedback` collection -> optional `feedback` signal event
2. **Owner Feedback Review** — `/answerlattice/feedback` -> `getFeedbackForWorkspace()` + `getProductSurfacesForSession()` -> scoped review list/detail with optional Product Surface assignment
3. **Content Feedback** — Unified router -> type-specific handlers -> separate collections per content type

---

## 2. Complete File Map

### 2.1 Submission And Review Components

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx` | — | Selectable feedback-category orchestrator — Steps component, direct submit for selected category, submit handler (`addFeedback`), latest feedback display (Alert with rating/comments/issues/requests/votes). Uses `useTranslations('HelpCenter')`. |
| `src/components/templates/main-app/helpCenter/GeneralFeedback.tsx` | 30 | Step 1 — Star rating (`Rate` component, required) + comment (`TextArea`, 4 rows, required) |
| `src/components/templates/main-app/helpCenter/FeatureUsage.tsx` | — | Step 2 — Product-area issue checklist (`Checkbox.Group`, 10 generic SaaS support options in 2-column grid) + comment (`TextArea`, 4 rows, optional) |
| `src/components/templates/main-app/helpCenter/FeatureRequests.tsx` | — | Step 3 — Feature request text (`TextArea`, 4 rows) and/or popular support-improvement voting (5 hardcoded items, thumbs up/down toggle per item). Votes synced to hidden form field via `useEffect`. |
| `src/app/(answerlattice)/answerlattice/feedback/page.tsx` | — | Authenticated Answerlattice owner route for feedback review |
| `src/components/templates/answerlattice/feedback/AnswerlatticeFeedbackReview.tsx` | — | Workspace-scoped wrapper around the reusable feedback review template |
| `src/components/templates/platform/feedbackAdmin/index.tsx` | — | Reusable feedback review template for platform-wide and workspace-scoped review; workspace mode loads Product Surfaces, filters feedback by surface, assigns/clears surface links, shows submitted-by name/email/user ID from `sourceContext`, and carries submitter + surface context into Support Board cards |
| `src/database/contentFeedback/index.ts` | — | Capped article/changelog reaction activity log. Stores actor snapshots for like/dislike added/removed events and exposes a one-document owner read per opened entry. |
| `src/components/templates/platform/changelog/ChangelogPreview.tsx` | — | Owner preview modal can show recent identified changelog reaction activity without loading reaction logs during normal public/help browsing. |

### 2.2 Database Layer

**Help Center Feedback DAL:** `src/database/feedback/index.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `addFeedback(data)` | 0 | 1-2 | `answerlatticeRequestBodyComposer` + `addDoc` to Answerlattice `feedback`; emits one non-blocking `feedback` signal when `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` is true |
| `updateFeedbackSurfaceForWorkspace(feedbackId, input)` | 0 | 1 | Owner/support-control update that sets or clears `contextKey`, `surfaceId`, and `surfaceLabel` without changing the original submitter |
| `getFeedbackForWorkspace(tId, sId)` | 1 bounded query | 0 | Owner review query: `tId + sId`, orderBy `createdOn desc`, limit 200 |
| `getAllFeedback(maxResults)` | 1 bounded query | 0 | Platform-admin query ordered by newest, limit 200 |
| `getLatestFeedbackForUser()` | 1 | 0 | Query: `uId + tId + sId`, orderBy createdOn desc, limit 1 |

**Generic Content Feedback:** `src/database/feedback/genericFeedback.ts` (131 lines)

| Function | Purpose | Routes To |
|----------|---------|-----------|
| `updateContentFeedback(params)` | Unified router | article → `updateArticleFeedback`, changelog → `updateChangelogFeedback` |
| `updateArticleFeedbackGeneric(...)` | Helper for articles | `updateContentFeedback({ contentType: 'article' })` |
| `updateChangelogFeedbackGeneric(...)` | Helper for changelog | `updateContentFeedback({ contentType: 'changelog' })` |
| `updateFaqFeedbackGeneric(...)` | Stub — throws "not implemented" | — |

Content reaction tracking now keeps the existing aggregate counters and also writes a capped `list` activity log under `changelog_feedback/{tId}/{sId}/doc1_{entryId}` or `article_feedback/{tId}/{sId}/doc1_{entryId}`. Each event stores `sentiment`, `action`, sanitized comment text when present, `uId`, `userName`, `userEmail`, `userPhone`, and `sourceContext`. Existing records without actor snapshots remain readable and fall back to `uId`.
| `updateWorkflowFeedbackGeneric(...)` | Stub — throws "not implemented" | — |

**Content Feedback DAL:** `src/database/contentFeedback/index.ts` (68 lines)

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `addContentFeedback(type, entryId, comment, sentiment)` | 1 | 1 | Transaction: read/create doc at `{type}_feedback/{tId}/{sId}/doc1_{entryId}`. Sanitizes comment (500 char max). Appends to `list` array via `arrayUnion`. |

### 2.3 Types

**File:** `src/types/feedback.ts` (17 lines)

```typescript
interface Feedback {
    id?: string;
    pId?: string;   // from answerlatticeRequestBodyComposer
    sId: string | number;    // from requestBodyComposer
    tId: string | number;    // from requestBodyComposer
    uId: string;    // from requestBodyComposer
    type: 'general' | 'feature_usage' | 'feature_requests' | 'feature_request';
    rating?: number;
    comment?: string;
    featureComment?: string;
    featureIssues?: string[];
    featureRequest?: string;
    votedPopularRequests?: { feature: string; interested: boolean }[];
    contextKey?: string | null;
    surfaceId?: string | null;
    surfaceLabel?: string | null;
    surfaceAssignedBy?: string | null;
    surfaceAssignedAt?: Timestamp | null;
    createdOn: Timestamp;   // from requestBodyComposer
}
```

### 2.4 Hook

**File:** `src/hooks/useFeedback.ts` — Feedback state management

---

## 3. Data Flow

### 3.1 User Submits Feedback
```
ShareFeedbackView → Submit selected category
  → validateFields(steps[currentStep].fields)
  → Build feedbackPayload using selected type: { type, rating, comment, featureComment, featureIssues, featureRequest, votedPopularRequests }
  → startLoader('send-feedback')
  → addFeedback(feedbackPayload) [DAL]
  → answerlatticeRequestBodyComposer (adds pId='AL', tId, sId, uId, sourceContext, traceId, createdOn)
    → addDoc to feedback collection
    → emitAnswerlatticeSignal(type='feedback', entityId='unresolved') [non-blocking]
  → setLatestFeedback → display in Alert
  → form.resetFields()
```

### 3.2 Owner Reviews Feedback
```
/answerlattice/feedback
  → AnswerlatticeFeedbackReview reads session tId/sId
  → FeedbackAdminTemplate(scope)
  → getFeedbackForWorkspace(tId, sId, 200)
  → Load Product Surfaces for the workspace
  → Display total, average rating, linked surface count, request count, and unsorted count
  → Owner can filter by Product Surface or Unsorted
  → Detail modal shows comments, product-area issues, feature request text, and votes
  → Owner can assign or clear Product Surface
  → Optional "Add to Support Board" writes answerlattice_supportBoardCards(sourceType='feedback', relatedSurfaceId, relatedContextKeys)
```

### 3.3 Feedback To Support Board / Answer Proposal
```
addFeedback()
  → answerlattice_signalEvents(type='feedback', metadata.feedbackId)
  → Owner can add the feedback row directly to Support Board from /answerlattice/feedback
  → Product Surface assignment is copied to relatedSurfaceId/relatedContextKeys when a card is created
  → Support Board "Sync signals" can also import actionable feedback signals with `relatedContextKeys` / `relatedSurfaceId` when source sync is enabled
  → Owner links related entity on the Support Board card
  → Owner creates a governed answer proposal
  → Knowledge Governance approves/publishes; no automatic publish from feedback
```

### 3.4 Content Like/Dislike
```
ChangelogPreview/ArticleView → click like/dislike
  → updateContentFeedback({ contentType, contentId, feedbackType, increment })
  → Switch on contentType:
    → 'article' → updateArticleFeedback(contentId, feedbackType, increment)
      → Read article doc → increment/decrement likes/dislikes → write back
    → 'changelog' → updateChangelogFeedback(pageId, contentId, feedbackType, increment)
      → Transaction: read page → find entry → update count → write page
```

### 3.5 Content Comment Feedback
```
FeedbackSection → addContentFeedback('changelog'|'article', entryId, comment, sentiment)
  → sanitizeFeedbackComment(comment, 500)
  → Transaction:
    → Read doc at {type}_feedback/{tId}/{sId}/doc1_{entryId}
    → If exists: arrayUnion new feedback to list
    → If not exists: create doc with list: [feedback]
```

---

## 4. Identified Issues

| # | Issue | Severity | File:Line | Notes |
|---|-------|----------|-----------|-------|
| 1 | Feature usage checklist had stale template feature names | Medium | `FeatureUsage.tsx:4-15` | Resolved with generic SaaS support options |
| 2 | Popular requests had stale template feature names | Medium | `FeatureRequests.tsx:8-14` | Resolved with support-improvement request options |
| 3 | No owner view for reviewing submitted feedback | Medium | — | Resolved by `/answerlattice/feedback`; `/platform/feedback-admin` remains platform-wide |
| 4 | Submit flow saved every Help Center feedback row as `feature_requests` | High | `ShareFeedbackView.tsx` | Resolved by direct selected-category submit |
| 5 | Feedback had no clean route into Support Board / Signal Queue | Medium | `database/feedback`, `useSupportBoard` | Resolved by `feedback` signal emission and actionable signal sync |
| 6 | Unresolved feedback signals could become automatic mutation proposals | Medium | `signalMutation.ts`, `answerlatticeNightly.ts` | Resolved by skipping `entityId='unresolved'` in mutation clustering |
| 7 | Article feedback is non-atomic (read-then-write) | Low | `articles.ts:154` | Could drift under concurrent writes |
| 8 | FAQ/workflow feedback types throw errors | Low | `genericFeedback.ts:61-65` | Stubs exist but not implemented |

## 4.1 Widget Negative Feedback Surface Context

Widget search writes only compact, non-sensitive surface fields to `aiSearchHistory` (`contextKey`, `surfaceFeature`, `surfacePage`, `surfaceWorkflow`). The full `AnswerlatticeContextPayload` remains transient. When a widget answer receives negative feedback, `/api/widget/feedback` copies those compact fields plus capped query/source/confidence metadata into the `CHAT_NEGATIVE` signal metadata so Signal Queue and Support Board triage can group failures by Product Surface.

---

## 5. Reverse Engineering Validation

| Category | Count | Verified |
|----------|:-----:|:--------:|
| Submission/review components | 7 | ✅ |
| DAL files | 3 plus signal emitter integration | ✅ |
| Types | 2 | ✅ |
| Hooks | 2 | ✅ |
| **Total** | **14 items** | **✅ 100%** |

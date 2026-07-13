# Feedback System — Technical Implementation Blueprint

> **Version:** 1.7.0
> **Last Updated:** 2026-07-11
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
| `addFeedback(data)` | 0 | 1-2 | `answerlatticeRequestBodyComposer` + `addDoc` to Answerlattice `feedback`; emits one non-blocking `feedback` signal only after exact `AL` product and numeric tenant/store admission when `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` is true; dynamic dispatch failures use a bounded fixed diagnostic |
| `updateFeedbackSurfaceForWorkspace(feedbackId, input)` | 0 | 1 | Owner/support-control update that sets or clears `contextKey`, `surfaceId`, and `surfaceLabel` without changing the original submitter |
| `getFeedbackForWorkspace(tId, sId)` | 1 bounded query | 0 | Owner review query: `tId + sId`, orderBy `createdOn desc`, limit 200 |
| `getAllFeedback(maxResults)` | 1 bounded query | 0 | Platform-admin query ordered by newest, limit 200 |
| `getLatestFeedbackForUser()` | 1 | 0 | Query: `uId + tId + sId`, orderBy createdOn desc, limit 1 |

**Generic Content Feedback:** `src/database/feedback/genericFeedback.ts` (131 lines)

| Function | Purpose | Routes To |
|----------|---------|-----------|
| `updateContentFeedback(params)` | Unified router | article/changelog → `updateContentFeedbackWithAudit`, FAQ → its scoped transaction |
| `updateArticleFeedbackGeneric(...)` | Helper for articles | `updateContentFeedback({ contentType: 'article' })` |
| `updateChangelogFeedbackGeneric(...)` | Helper for changelog | `updateContentFeedback({ contentType: 'changelog' })` |
| `updateFaqFeedbackGeneric(...)` | Stub — throws "not implemented" | — |

Content reaction tracking updates the existing aggregate counter and its capped `list` activity log under `changelog_feedback/{tId}/{sId}/doc1_{entryId}` or `article_feedback/{tId}/{sId}/doc1_{entryId}` in one transaction. Each event stores `sentiment`, `action`, sanitized comment text when present, `uId`, `userName`, optional email/phone, and an exact-key `sourceContext`. Persisted items pass a runtime read normalizer before owner rendering.
| `updateWorkflowFeedbackGeneric(...)` | Stub — throws "not implemented" | — |

**Content Feedback DAL:** `src/database/contentFeedback/index.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `updateContentFeedbackWithAudit(input)` | 2 | 1-2 | One transaction reads source+audit, validates bounded counters/identity, updates source and creates/exact-appends one sanitized actor item. At 200 audit rows, only the source counter changes. |

### 2.3 Types

**File:** `src/types/feedback.ts`

```typescript
interface Feedback {
    id: string;
    pId: 'AL';
    sourceContext: SourceContext | null;
    sId: string | number;
    tId: string | number;
    uId: string | number;
    type: 'general' | 'feature_usage' | 'feature_requests';
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
    traceId?: string;
    requestId?: string;
    role?: string;
    modifiedBy?: string;
    modifiedOn?: Timestamp;
    createdBy?: string;
    createdOn: Timestamp;
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
  → normalizeAnswerlatticeFeedbackSubmission (exact type/field/list/text admission; unknown fields dropped)
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
  → Resolve Answerlattice tId+sId and load a versioned tenant/store/user/content-type local acknowledgement envelope
  → mutationInFlightRef rejects a concurrent duplicate click
  → updateContentFeedback({ contentType, contentId, feedbackType, increment })
  → Switch on contentType:
    → 'article'/'changelog' → updateContentFeedbackWithAudit(...)
      → Transaction reads source document and audit document before writes
      → Validates source scope, IDs, entries and non-negative safe-integer counters
      → Updates counter and creates/exact-appends the sanitized actor audit item together
      → If audit history already contains 200 rows, leaves it immutable and updates only the counter
```

### 3.5 Content Comment Feedback
```
FeedbackSection dislike modal → updateContentFeedbackWithAudit({ comment, sentiment: 'dislike' })
  → sanitizeFeedbackComment(comment, 500)
  → Same source+audit transaction as the aggregate reaction
  → Any audit-rule/write failure rolls back the source counter
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
| 7 | Article counter and content audit could partially succeed | High | `useFeedback`, content/source DALs | Resolved with one source+audit transaction and removal of split writers |
| 8 | FAQ/workflow feedback types throw errors | Low | `genericFeedback.ts:61-65` | Stubs exist but not implemented |
| 9 | Help Center feedback accepted arbitrary/unbounded client fields | High | `feedbackBoundary.ts`, `database/feedback`, Answerlattice rules | Resolved with exact pre-composer normalization plus matching create rules |
| 10 | Support-control feedback update could alter original content/identity | High | `firestore-answerlattice.rules` | Resolved with an affected-key allowlist limited to Product Surface assignment and modification metadata |
| 11 | Feedback reads asserted raw Firestore data to `Feedback` | Medium | `database/feedback`, `types/feedback` | Resolved with runtime persisted-record normalization, canonical legacy type handling, and a reconciled persisted type |
| 12 | Content audit rules allowed capped-list replacement and arbitrary items | High | `firestore-answerlattice.rules` | Resolved with exact item validation, one-item create, exact append, and immutable cap |
| 13 | Rapid duplicate reaction could increment twice | Medium | `useFeedback`, `FeedbackSection` | Resolved with an in-flight lock plus disabled/loading controls |
| 14 | Browser reaction state could survive a workspace switch and trusted arbitrary JSON/object keys | High | `contentFeedbackStorage`, `useFeedback` | Resolved with scoped keys/envelopes, exact entry normalization, null-prototype maps, invalid eviction, 500-entry cap and workspace reset |
| 15 | Browser storage access failures were mislabeled as payload parse failures during the cache-boundary rewrite | Low | `contentFeedbackStorage` diagnostics | Resolved with separate fixed read and parse failure stages plus bounded invalid-eviction context |

## 4.2 Runtime And Rules Contract

- `normalizeAnswerlatticeFeedbackSubmission()` is the only submission admission boundary. It canonicalizes the historical singular type, admits only the fixed issue/request lists, rejects duplicates and empty category payloads, normalizes whitespace, and caps text at 1,000 characters.
- `normalizeAnswerlatticeFeedbackRecord()` verifies document ID, scope/actor identity, source-context keys, timestamps, optional surface metadata, and category payload before returning the persisted `Feedback` type.
- `firestore-answerlattice.rules` independently validates exact create keys and value kinds. Support-control update permission does not authorize content mutation; only surface assignment plus `modifiedBy`/`modifiedOn` may change.
- `npm run verify:answerlattice-feedback-boundary` covers runtime/source contracts. `npm run test:answerlattice-feedback:rules` covers same/cross-workspace create/read, malformed/unknown/oversized payload denial, duplicate vote denial, and update-field confinement.

## 4.1 Widget Negative Feedback Surface Context

Widget search writes only compact, non-sensitive surface fields to `aiSearchHistory` (`contextKey`, `surfaceFeature`, `surfacePage`, `surfaceWorkflow`). The full `AnswerlatticeContextPayload` remains transient. Widget search and feedback parse bounded JSON only after API key auth, rate limiting, Answerlattice product/purpose/scope checks, origin allowlist checks, and search-history document-ID validation. When a widget answer receives negative feedback, `/api/widget/feedback` copies those compact fields plus capped query/source/confidence metadata into the `CHAT_NEGATIVE` signal metadata so Signal Queue and Support Board triage can group failures by Product Surface.

---

## 5. Reverse Engineering Validation

| Category | Count | Verified |
|----------|:-----:|:--------:|
| Submission/review components | 7 | ✅ |
| DAL files | 3 plus signal emitter integration | ✅ |
| Types | 2 | ✅ |
| Hooks | 2 | ✅ |
| **Total** | **14 items** | **✅ 100%** |

# Feedback System — Technical Implementation Blueprint

> **Version:** 1.9.0
> **Last Updated:** 2026-07-19
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Feedback System has server-owned private submission and published-content reaction paths. Three subsystems:
1. **Help Center Feedback Flow** — selectable category form -> validated API client -> protected submission route -> deterministic Answerlattice `feedback` document -> optional replay-safe `feedback` signal event
2. **Owner Feedback Review** — `/answerlattice/feedback` -> `getFeedbackForWorkspace()` + `getProductSurfacesForSession()` -> scoped review list/detail with optional Product Surface assignment
3. **Content Feedback** — fixed router -> validated client request -> protected API -> one server transaction over source counter, bounded active-actor state, audit/idempotency state, and negative signal

---

## 2. Complete File Map

### 2.1 Submission And Review Components

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx` | — | Selectable feedback-category orchestrator — Steps component, direct submit for selected category, submit handler (`addFeedback`), latest feedback display (Alert with rating/comments/issues/requests/votes). Uses `useTranslations('HelpCenter')`. |
| `src/components/templates/main-app/helpCenter/GeneralFeedback.tsx` | 30 | Step 1 — Star rating (`Rate` component, required) + comment (`TextArea`, 4 rows, required) |
| `src/components/templates/main-app/helpCenter/FeatureUsage.tsx` | — | Step 2 — Product-area issue checklist (`Checkbox.Group`, 10 generic SaaS support options, one column on narrow screens/two from `sm`) + comment (`TextArea`, 4 rows, optional) |
| `src/components/templates/main-app/helpCenter/FeatureRequests.tsx` | — | Step 3 — Feature request text (`TextArea`, 4 rows) and/or 44px support-improvement vote controls. Vote state derives from the hidden form field so reset is authoritative. |
| `src/app/(answerlattice)/answerlattice/feedback/page.tsx` | — | Authenticated Answerlattice owner route for feedback review |
| `src/components/templates/answerlattice/feedback/AnswerlatticeFeedbackReview.tsx` | — | Workspace-scoped wrapper around the reusable feedback review template |
| `src/components/templates/platform/feedbackAdmin/index.tsx` | — | Reusable feedback review template for platform-wide and workspace-scoped review; workspace mode loads Product Surfaces, filters feedback by surface, assigns/clears surface links, shows submitted-by name/email/user ID from `sourceContext`, and carries submitter + surface context into Support Board cards |
| `src/app/api/answerlattice/feedback/route.ts` | — | `withAuth` Help Center submission route with exact workspace scope, 16KB body cap, strict request parsing, fail-closed 12/hour scoped-actor rate limit, and bounded response. |
| `src/lib/answerlattice/feedbackSubmissionServer.ts` | — | Admin transaction that derives a deterministic document ID, persists an exact submission fingerprint, rejects changed replays, and retries the deterministic identity-minimized support signal on acknowledged replays. |
| `src/database/contentFeedback/index.ts` | — | Article/changelog/FAQ reaction client and capped audit reader; it validates IDs/scope, reuses a bounded retry request ID, calls the protected API, validates the response, and exposes one-document owner reads. |
| `src/app/api/answerlattice/content-feedback/route.ts` | — | `withAuth` route with exact workspace scope, actor snapshot, 16KB body cap, strict request parsing, and 30 mutations/minute scoped-actor rate limit. |
| `src/lib/answerlattice/contentFeedbackServer.ts` | — | Admin transaction over the exact source, counters, bounded 5,000-actor active-state document, 20-operation replay window, 200-item actor audit, 365-day audit expiry, and deterministic dislike signal. |
| `src/components/templates/platform/changelog/ChangelogPreview.tsx` | — | Owner preview modal can show recent identified changelog reaction activity without loading reaction logs during normal public/help browsing. |

### 2.2 Database Layer

**Help Center Feedback DAL:** `src/database/feedback/index.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `addFeedback(data)` | 0 direct Firestore | 0 direct Firestore | Validates the selected category, reuses a bounded retry request ID, calls `/api/answerlattice/feedback`, validates the bounded response, and returns a normalized Firestore-compatible record. The server performs one replay-check read, one feedback create when new, and one optional deterministic signal create. |
| `updateFeedbackSurfaceForWorkspace(feedbackId, input)` | 0 | 1 | Owner/support-control update that sets or clears `contextKey`, `surfaceId`, and `surfaceLabel` without changing the original submitter |
| `getFeedbackForWorkspace(tId, sId)` | 1 bounded query | 0 | Owner review query: `tId + sId`, orderBy `createdOn desc`, limit 200 |
| `getAllFeedback(maxResults)` | 1 bounded query | 0 | Platform-admin query ordered by newest, limit 200 |
| `getLatestFeedbackForUser()` | 1 | 0 | Query: `uId + tId + sId`, orderBy createdOn desc, limit 1 |

**Generic Content Feedback:** `src/database/feedback/genericFeedback.ts` (131 lines)

| Function | Purpose | Routes To |
|----------|---------|-----------|
| `updateContentFeedback(params)` | Fixed router | article/changelog/FAQ -> `updateContentFeedbackWithAudit`; workflow -> fail closed |
| `updateArticleFeedbackGeneric(...)` | Helper for articles | `updateContentFeedback({ contentType: 'article' })` |
| `updateChangelogFeedbackGeneric(...)` | Helper for changelog | `updateContentFeedback({ contentType: 'changelog' })` |
| `updateFaqFeedbackGeneric(...)` | Helper for FAQs | `updateContentFeedback({ contentType: 'faq' })` |
| `updateWorkflowFeedbackGeneric(...)` | Unsupported helper | Throws through the fixed router |

Content reaction tracking updates the existing aggregate counter, an internal `state1_*` active-actor document, and the capped `doc1_*` activity log under `changelog_feedback`, `article_feedback`, or `faq_feedback` in one server transaction. Actor keys are one-way SHA-256 fragments and state is capped at 5,000 active actors per content item. Each visible audit event stores `sentiment`, `action`, sanitized comment text when present, `uId`, `userName`, optional email/phone, and an exact-key `sourceContext`. Persisted audit items pass a runtime read normalizer before owner rendering; internal state documents are not client-readable.

**Content Feedback DAL:** `src/database/contentFeedback/index.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `updateContentFeedbackWithAudit(input)` | 0 direct Firestore | 0 direct Firestore | Client calls `/api/answerlattice/content-feedback`, validates the bounded response, and preserves a retry request ID. The server transaction performs 3 reads and up to 4 writes: source, active-actor state, audit when below cap, and deterministic signal for a newly added dislike. Duplicate fresh request IDs become acknowledged no-ops from actor state. |

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
  → POST /api/answerlattice/feedback with bounded retry request ID
  → withAuth + exact session scope + fail-closed 12/hour rate limit + 16KB body cap
  → deterministic feedback document ID + exact submission fingerprint transaction
    → create feedback once or acknowledge an exact replay
    → emit/retry deterministic Answerlattice signal(type='feedback', entityId='unresolved')
  → validate bounded response and reconstruct Firestore timestamps
  → setLatestFeedback → display in Alert
  → form.resetFields()
  → ref-backed submit lock releases
```

### 3.2 Owner Reviews Feedback
```
/answerlattice/feedback
  → AnswerlatticeFeedbackReview reads session tId/sId
  → FeedbackAdminTemplate(scope)
  → getFeedbackForWorkspace(tId, sId, 200)
  → Load Product Surfaces for the workspace
  → Display loaded-count, loaded average rating, linked surface count, request count, and unsorted count for the latest 200-row window
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
ChangelogPreview/ArticleView/FaqView → click like/dislike
  → Resolve Answerlattice tId+sId and load a versioned tenant/store/user/content-type local acknowledgement envelope
  → mutationInFlightRef rejects a concurrent duplicate click
  → updateContentFeedback({ contentType, contentId, feedbackType, increment })
  → updateContentFeedbackWithAudit validates scope/IDs and POSTs to the protected API
  → Server transaction reads source document, visible audit document, and internal active-actor state before writes
  → Validates exact scope, publication eligibility, entries and non-negative safe-integer counters
  → Rejects sentiment switching without removal; treats fresh duplicate add/remove requests as authoritative no-ops
  → Updates counter, active-actor state, and creates/exact-appends the sanitized actor audit item together
  → Added dislikes also create one deterministic review signal in the same transaction
  → If audit history already contains 200 rows, leaves it immutable and updates only the counter
  → Client reconciles optimistic likes/dislikes to returned authoritative counts
```

### 3.5 Content Comment Feedback
```
FeedbackSection dislike modal → updateContentFeedbackWithAudit({ comment, sentiment: 'dislike' })
  → sanitizeFeedbackComment(comment, 500)
  → Same source+audit transaction as the aggregate reaction
  → Any transaction failure rolls back the source counter, audit, and signal together
  → Failed submission keeps the comment/modal available for retry
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
| 8 | Workflow feedback is unsupported | None | `genericFeedback.ts` | Deliberate boundary; FAQ feedback is implemented |
| 9 | Help Center feedback accepted arbitrary/unbounded client fields | High | `feedbackBoundary.ts`, `database/feedback`, Answerlattice rules | Resolved with exact pre-composer normalization plus matching create rules |
| 10 | Support-control feedback update could alter original content/identity | High | `firestore-answerlattice.rules` | Resolved with an affected-key allowlist limited to Product Surface assignment and modification metadata |
| 11 | Feedback reads asserted raw Firestore data to `Feedback` | Medium | `database/feedback`, `types/feedback` | Resolved with runtime persisted-record normalization, canonical legacy type handling, and a reconciled persisted type |
| 12 | Content audit rules allowed capped-list replacement and arbitrary items | High | `firestore-answerlattice.rules` | Resolved with exact item validation, one-item create, exact append, and immutable cap |
| 13 | Rapid duplicate reaction could increment twice | Medium | `useFeedback`, `FeedbackSection` | Resolved with an in-flight lock plus disabled/loading controls |
| 14 | Browser reaction state could survive a workspace switch and trusted arbitrary JSON/object keys | High | `contentFeedbackStorage`, `useFeedback` | Resolved with scoped keys/envelopes, exact entry normalization, null-prototype maps, invalid eviction, 500-entry cap and workspace reset |
| 15 | Browser storage access failures were mislabeled as payload parse failures during the cache-boundary rewrite | Low | `contentFeedbackStorage` diagnostics | Resolved with separate fixed read and parse failure stages plus bounded invalid-eviction context |
| 16 | Shared Firebase exposed private feedback to unrelated same-workspace members | High | `firestore.rules` | Resolved with support-control or exact-self reads and dedicated/shared emulator coverage |
| 17 | Feature-request votes survived form reset | Medium | `FeatureRequests.tsx` | Resolved by deriving votes from `Form.useWatch` form authority |
| 18 | Rapid Help Center submit could duplicate one row | Medium | `ShareFeedbackView.tsx` | Resolved with a ref-backed in-flight lock and disabled navigation/actions |
| 19 | Failed negative-feedback comments were cleared and optimistic counts could diverge | Medium | `useFeedback`, `FeedbackSection` | Resolved with boolean acknowledgement, retry preservation, non-negative rollback, and authoritative count reconciliation |
| 20 | Derived Help Center signals duplicated customer identity/source context | Medium | `database/feedback` | Resolved; private source remains identity authority while signal metadata carries operational evidence only |
| 21 | Authenticated customers could bypass HTTP cost controls and create unlimited direct feedback documents | High | `database/feedback`, feedback rules | Resolved with a body-capped, rate-limited, deterministic server route and denied client creates |
| 22 | Fresh content-reaction request IDs could inflate counters because browser acknowledgement was the only actor state | High | `contentFeedbackServer` | Resolved with bounded server-authoritative active-actor state and exact transition rules |
| 23 | Widget-only managers inherited private feedback/audit review through generic support-control permission | High | dedicated/shared Firestore rules | Resolved with exact `canManageSupport` review authority and knowledge-manager audit access |
| 24 | Bounded owner statistics appeared to be all-time totals | Medium | `feedbackAdmin` | Resolved with explicit latest-200 window labels |

## 4.2 Runtime And Rules Contract

- `normalizeAnswerlatticeFeedbackSubmission()` is the only submission admission boundary. It canonicalizes the historical singular type, admits only the fixed issue/request lists, rejects duplicates and empty category payloads, normalizes whitespace, and caps text at 1,000 characters.
- `normalizeAnswerlatticeFeedbackRecord()` verifies document ID, scope/actor identity, source-context keys, timestamps, optional surface metadata, and category payload before returning the persisted `Feedback` type.
- Dedicated and shared Firestore rules deny feedback creates. Private reads require exact submitter identity or `canManageSupport`; surface assignment requires `canManageSupport`. Widget-only roles are denied.
- Content counter/audit writes are server-owned; clients can read only `doc1_*` audit paths when their knowledge or exact support permission and workspace path allow it. Internal `state1_*` actor documents are hidden.
- `npm run verify:answerlattice-feedback` covers runtime/source contracts, submission and reaction server emulators, content contracts, and both rule mirrors. Emulator coverage includes deterministic submission replay/conflict behavior, actor-authoritative duplicate/switch/remove behavior, source eligibility, rollback, cap, FAQ parity, and deterministic negative signals.

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

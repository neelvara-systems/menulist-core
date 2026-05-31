# Feedback System — Product Specification

> **Version:** 1.4.0
> **Last Updated:** 2026-05-31
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Collect structured Canonica help-center feedback from users about their product/support experience, feature usage issues, ratings, feature requests, and suggestions. Submitted feedback is tenant-scoped, owner-reviewable, optionally sorted by Product Surface, and emitted as a Canonica support signal so important items can move into Support Board cards and owner-approved answer proposals.

### Scope

**Help Center Feedback Wizard (3 selectable categories):**

- Step 1: General feedback — Star rating (1-5) + free-text comment
- Step 2: Feature usage — Product-area issue checklist (10 generic SaaS support areas) + free-text comment
- Step 3: Feature requests — Free-text request and/or vote on 5 support-improvement suggestions
- Users can submit the selected category directly; they do not need to complete all categories
- Display latest submitted feedback
- Per-category validation before submission

**Owner Review Loop:**

- `/canonica/feedback` reviews feedback for the current Canonica `tId + sId`
- `/platform/feedback-admin` remains the platform-wide admin review surface
- Owners can assign, change, clear, and filter by Product Surface without requiring the end user to choose one
- Each Help Center feedback submission emits one `feedback` signal when signal mutation is enabled
- Owners can add a selected feedback row directly to Support Board; assigned Product Surface context carries into the card
- Support Board signal sync can turn feedback signals into private support cards
- Support Board cards can become owner-reviewed answer proposals after an entity is linked

**Content Feedback System:**

- Unified API for likes/dislikes on articles and changelog entries
- Detailed comment feedback with sentiment (like/dislike)
- Transaction-based atomic operations
- Extensible for future content types (FAQ, workflows)

### Out of Scope

- Public roadmap/voting board behavior
- Automatic feature prioritization
- Automatic ticket creation from feedback
- Automatic FAQ or answer publishing
- Advanced aggregation beyond current stats cards
- Email notifications on new feedback
- Feedback response/reply system
- Public exposure of internal Product Surface keys
- NPS (Net Promoter Score) surveys

---

## 2. Help Center Feedback Wizard

### Step 1: General Feedback

| Field   | Type                         | Required | Validation         |
| ------- | ---------------------------- | :------: | ------------------ |
| Rating  | 1-5 stars (Rate component)   |    ✅    | Must select rating |
| Comment | Free text (TextArea, 4 rows) |    ✅    | Must enter comment |

**Feedback type:** `general`

### Step 2: Feature Usage

| Field           | Type                         | Required | Validation |
| --------------- | ---------------------------- | :------: | ---------- |
| Feature Issues  | Checkbox group (10 options)  |    ❌    | Optional   |
| Feature Comment | Free text (TextArea, 4 rows) |    ❌    | Optional   |

**Product-area issue options (hardcoded):**

1. Account access
2. Billing and invoices
3. Onboarding and setup
4. Team roles and permissions
5. Settings and configuration
6. Integrations
7. Data import or export
8. Notifications and email
9. Reports and analytics
10. Performance or reliability

**Feedback type:** `feature_usage`

### Step 3: Feature Requests

| Field                 | Type                         | Required | Validation         |
| --------------------- | ---------------------------- | :------: | ------------------ |
| Feature Request       | Free text (TextArea, 4 rows) | Optional | Required only when no vote is selected |
| Popular Request Votes | Thumbs up/down per request   |    ❌    | Optional           |

**Popular requests (hardcoded):**

1. Clearer setup guides
2. More integration options
3. Better billing controls
4. Easier data export and reports
5. Faster issue status updates

**Feedback type:** `feature_requests`

### Wizard Navigation

- Steps indicator (Ant Design Steps component)
- Previous/Next buttons switch categories without forcing unrelated validation
- Cancel button resets form + returns to Step 1
- Submit saves the currently selected category
- After submission: shows latest feedback as Alert with rating, comments, feature issues, requests, and votes

---

## 3. Content Feedback System

### 3.1 Unified Router (`genericFeedback.ts`)

Routes feedback operations to appropriate handlers by content type:

| Content Type | Handler                     | Status                            |
| ------------ | --------------------------- | --------------------------------- |
| `article`    | `updateArticleFeedback()`   | ✅ Implemented                    |
| `changelog`  | `updateChangelogFeedback()` | ✅ Implemented                    |
| `faq`        | —                           | ❌ Not implemented (throws error) |
| `workflow`   | —                           | ❌ Not implemented (throws error) |

### 3.2 Article Feedback

- **Storage:** Directly on article document (`likes`, `dislikes` fields)
- **Operation:** Read current → increment/decrement → write back (NOT atomic)
- **Min value:** 0 (Math.max prevents negative)

### 3.3 Changelog Entry Feedback

- **Storage:** Within page document (likes/dislikes on entry within entries array)
- **Operation:** Transaction-based (atomic read + update within page)

### 3.4 Detailed Comment Feedback (`contentFeedback`)

- **Storage:** Separate collection `{type}_feedback/{tId}/{sId}/doc1_{entryId}`
- **Fields:** comment (sanitized, max 500 chars), sentiment (like/dislike), timestamp, userId
- **Operation:** Transaction-based (create or append to list array)

---

## 4. Data Model

### Feedback Document (Help Center Wizard)

```typescript
{
  id?: string;
  type: 'general' | 'feature_usage' | 'feature_requests' | 'feature_request';
  rating?: number;                    // 1-5 stars
  comment?: string;                   // General feedback text
  featureComment?: string;            // Feature-specific comment
  featureIssues?: string[];           // Selected feature checkboxes
  featureRequest?: string;            // User's new feature request
  votedPopularRequests?: Array<{      // Votes on popular requests
    feature: string;
    interested: boolean;
  }>;
  contextKey?: string | null;          // Optional owner-assigned Product Surface key
  surfaceId?: string | null;           // Optional owner-assigned Product Surface doc ID
  surfaceLabel?: string | null;        // Owner-facing display label
  surfaceAssignedBy?: string | null;
  surfaceAssignedAt?: Timestamp | null;
  // Auto-injected by canonicaRequestBodyComposer/requestBodyComposer:
  pId: 'CN';
  sId: string | number;
  tId: string | number;
  uId: string;
  createdOn: Timestamp;
  sourceContext?: CanonicaSourceContext;
  traceId?: string;
  requestId?: string;
}
```

### Feedback Signal Event

Each successful `addFeedback()` write triggers a non-blocking `canonica_signalEvents` write when `ENABLE_CANONICA_SIGNAL_MUTATION` is enabled.

```typescript
{
  type: 'feedback';
  entityId: 'unresolved';
  tId: number;
  sId: number;
  metadata: {
    source: 'help_center_feedback';
    feedbackId: string;
    feedbackType: 'general' | 'feature_usage' | 'feature_requests';
    rating?: number | null;
    summary: string;
    featureIssues?: string[];
    featureRequest?: string | null;
    contextKey?: string | null;
    surfaceId?: string | null;
    surfaceLabel?: string | null;
    relatedContextKeys?: string[];
    userId?: string | null;
  };
}
```

Unresolved feedback signals are review inputs. They are not eligible for automatic mutation proposals until an owner links the Support Board card to a real Canonica entity.

### Product Surface Assignment

- Feedback submission does not require a Product Surface.
- When page/widget context is available, Canonica may store only compact surface fields (`contextKey`, `surfaceFeature`, `surfacePage`, `surfaceWorkflow`) for internal triage.
- Owners can assign or clear a Product Surface from `/canonica/feedback`.
- Support Board cards created from feedback include `relatedSurfaceId` and `relatedContextKeys` when present.
- Internal Product Surface keys are for Canonica sorting and retrieval only; end users should see labels or no surface indicator.

---

## 5. Data Isolation

| Collection                       | Scoping                                   |
| -------------------------------- | ----------------------------------------- |
| `feedback`                       | `pId="CN" + tId + sId + uId` (tenant + store + user) |
| `canonica_signalEvents`          | `pId="CN" + tId + sId` with `type='feedback'` metadata |
| `article_feedback/{tId}/{sId}`   | Subcollection under tenant+store          |
| `changelog_feedback/{tId}/{sId}` | Subcollection under tenant+store          |

---

## 6. Risks & Open Questions

| #   | Item                                                                                       | Status                                                          |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1   | Feature usage checklist and popular requests were hardcoded with non-current feature names | ✅ RESOLVED — updated to generic SaaS support options           |
| 2   | No owner view for reviewing submitted feedback                                             | ✅ RESOLVED — `/canonica/feedback` plus `/platform/feedback-admin` |
| 3   | Feedback had no Product Surface sorting path                                              | ✅ RESOLVED — optional surface assignment/filtering in owner review |
| 3   | Article feedback is not atomic (read-then-write)                                           | Known — low risk at current scale                               |
| 4   | FAQ and workflow content types throw "not implemented" errors                              | Stubs exist in genericFeedback.ts                               |
| 5   | Only latest feedback per user is displayed                                                 | `getLatestFeedbackForUser()` returns limit(1)                   |
| 6   | Advanced feedback aggregation beyond current admin stats                                   | Not implemented                                                 |
| 7   | Every Help Center submission previously saved as `feature_requests`                        | ✅ RESOLVED — submit now uses the selected category             |
| 8   | Unresolved feedback signals could feed automatic mutation clustering                       | ✅ RESOLVED — mutation engines skip `entityId='unresolved'`     |

---

## 7. STEP 9C Audit (2026-03-04)

### Bugs Fixed

- Removed `console.log('Validation Failed:')` from `ShareFeedbackView.tsx`
- Updated 10 feature usage checklist items from old product template to current shared Help Center options
- Updated 5 popular feature requests from old product template to current shared Help Center options

### Industry Best Practices Comparison (Step D Web Search)

Sources: Userpilot, Frill, Qualaroo, Usersnap

| Industry Feature                  | Our Status                              | Gap?                                   |
| --------------------------------- | --------------------------------------- | -------------------------------------- |
| Star rating (CSAT)                | ✅ 1-5 stars                            | No                                     |
| Free-text comments                | ✅ General + feature                    | No                                     |
| Feature issue checklist           | ✅ 10 current shared options            | No                                     |
| Feature requests with voting      | ✅ Popular requests with thumbs up/down | No                                     |
| Multi-step wizard                 | ✅ 3-step with validation               | No                                     |
| Display previous feedback         | ✅ Latest feedback shown                | No                                     |
| Content feedback (likes/dislikes) | ✅ Articles + changelog                 | No                                     |
| Detailed comments on content      | ✅ Transaction-based                    | No                                     |
| Feedback analytics/admin view     | ✅ Basic stats + list/detail admin view | No                                     |
| Contextual micro-surveys          | ❌                                      | Over-engineering for SMB ICP           |
| NPS surveys                       | ❌                                      | Out of scope per spec                  |

### Improvements Implemented

1. FeatureUsage now lists generic SaaS support areas rather than MenuList/menu-specific labels.
2. FeatureRequests now lists support-improvement suggestions rather than roadmap-style product promises.
3. `/canonica/feedback` gives owners a tenant-scoped review surface with total, average rating, users, and request counts.
4. `/platform/feedback-admin` remains available for platform-wide feedback review.
5. Help Center feedback now emits `feedback` signal events for Signal Queue / Support Board review.

### Skipped (Validated)

- **Contextual micro-surveys:** Over-engineering for SMB ICP who uses dashboard infrequently.

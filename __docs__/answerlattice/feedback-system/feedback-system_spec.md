# Feedback System — Product Specification

> **Version:** 1.9.0
> **Last Updated:** 2026-07-19
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Collect structured Answerlattice help-center feedback from users about their product/support experience, feature usage issues, ratings, feature requests, and suggestions. Submitted feedback is tenant-scoped, owner-reviewable, optionally sorted by Product Surface, and emitted as an Answerlattice support signal so important items can move into Support Board cards and owner-approved answer proposals.

### Scope

**Help Center Feedback Wizard (3 selectable categories):**

- Step 1: General feedback — Star rating (1-5) + free-text comment
- Step 2: Feature usage — Product-area issue checklist (10 generic SaaS support areas) + free-text comment
- Step 3: Feature requests — Free-text request and/or vote on 5 support-improvement suggestions
- Users can submit the selected category directly; they do not need to complete all categories
- Display latest submitted feedback
- Per-category validation before submission

**Owner Review Loop:**

- `/answerlattice/feedback` reviews feedback for the current Answerlattice `tId + sId`
- `/platform/feedback-admin` remains the platform-wide admin review surface
- Owners can assign, change, clear, and filter by Product Surface without requiring the end user to choose one
- Each new Help Center feedback submission receives a deterministic server identity and emits at most one deterministic `feedback` signal when signal mutation is enabled; exact request replays retry the same identities without duplication
- Owners can add a selected feedback row directly to Support Board; assigned Product Surface context carries into the card
- Support Board signal sync can turn feedback signals into private support cards
- Support Board cards can become owner-reviewed answer proposals after an entity is linked

**Content Feedback System:**

- Protected API for likes/dislikes on published articles, changelog entries, and FAQs
- Detailed comment feedback with sentiment (like/dislike)
- One server transaction for each source counter, bounded visible actor audit row, authoritative active-actor state, request replay state, and negative-feedback signal
- Fixed supported types; workflow feedback is rejected

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
| Feature Issues  | Checkbox group (10 options)  |    ❌    | One issue or a comment is required |
| Feature Comment | Free text (TextArea, 4 rows) |    ❌    | One comment or an issue is required |

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
| `article`    | `updateContentFeedbackWithAudit()` | ✅ Implemented              |
| `changelog`  | `updateContentFeedbackWithAudit()` | ✅ Implemented              |
| `faq`        | `updateContentFeedbackWithAudit()` | ✅ Implemented              |
| `workflow`   | —                           | Deliberately unsupported          |

### 3.2 Article And FAQ Feedback

- **Storage:** Counters on the exact article or FAQ document, bounded recent request fingerprints on the source, one visible `doc1_*` actor-audit row, and one server-only `state1_*` active-actor map
- **Operation:** Transactionally validate the actor transition, update counters/state, and append the visible audit item below its cap; either all effects commit or none commit
- **Eligibility:** Exact `AL` tenant/workspace, active content, and `status='published'`
- **Min value:** 0 (Math.max prevents negative)

### 3.3 Changelog Entry Feedback

- **Storage:** Within page document (likes/dislikes on entry within entries array)
- **Operation:** Transaction-based (atomic read + update within page)

For all three supported source types, persisted counters must be non-negative safe integers. The client uses one in-flight mutation lock and a bounded retry request ID, while the server retains 20 recent request fingerprints for exact replay acknowledgement. Fresh request IDs cannot repeat or remove an actor's existing sentiment because the server-only active-actor state is authoritative. Switching directly from like to dislike, or dislike to like, is rejected until the actor removes the existing reaction. The visible audit list is exact-append only until 200 events; at the cap it becomes immutable while aggregate counters and actor state remain correct.

Browser-local reaction acknowledgement is not authoritative. Its versioned key and envelope include Answerlattice tenant, store and user identity plus content type; entries are runtime-validated, capped at 500, stored in a null-prototype map, and evicted on malformed, future-dated, or cross-scope data. Switching content, changelog page, actor, or workspace invalidates pending mutation tokens, resets optimistic state before the scoped acknowledgement is loaded, and prevents an older async completion from changing the newly selected item's counters, modal, messages, or submission state. Firestore source counters plus the hidden active-actor state remain the authority when local browser state is missing, stale, or deliberately cleared.

### 3.4 Detailed Comment Feedback (`contentFeedback`)

- **Storage:** Separate collection `{type}_feedback/{tId}/{sId}/doc1_{entryId}`
- **Fields:** comment (sanitized, max 500 chars), sentiment (like/dislike), timestamp, userId
- **Operation:** Protected server transaction; create or exact append until the 200-event cap
- **Retention:** Audit document expiry is refreshed to 365 days; nightly cleanup deletes expired article/changelog/FAQ audit rows
- **Negative signal:** An added dislike writes one deterministic `feedback` signal in the same transaction; that signal is review evidence, not approved truth

---

## 4. Data Model

### Feedback Document (Help Center Wizard)

```typescript
{
  id: string;
  type: 'general' | 'feature_usage' | 'feature_requests';
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
  // Server-derived and never accepted from the browser request:
  pId: 'AL';
  sId: string | number;
  tId: string | number;
  uId: string | number;
  createdOn: Timestamp;
  sourceContext: AnswerlatticeSourceContext | null;
  traceId?: string;
  requestId: string;
}
```

All three free-text inputs are capped at 1,000 normalized characters. The authenticated submission route caps JSON at 16 KiB, admits at most 12 requests per scoped actor/workspace/hour, validates one bounded request ID and one canonical category payload, then derives scope, actor, timestamps, deterministic document identity, and an exact submission fingerprint on the server. Caller-supplied scope, identity, timestamps, Product Surface assignment, and unknown fields cannot reach the write. Exact request replays are acknowledged; changed replays return conflict. Reads pass through `normalizeAnswerlatticeFeedbackRecord()`; malformed rows are omitted rather than asserted into the UI type. Historical `feature_request` input is accepted only at the normalization boundary and canonicalized to `feature_requests`.

### Feedback Signal Event

After the deterministic feedback transaction succeeds, the server emits the identity-minimized `answerlattice_signalEvents` row when `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` is enabled. Signal identity is deterministic from the feedback document, so an exact submission replay can retry a missed signal acknowledgement without duplicating evidence. A signal-emission failure does not invalidate the accepted private feedback row.

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
  };
}
```

Derived Help Center feedback signals intentionally omit the submitter's `uId` and `sourceContext`; the original private feedback row remains the authorized identity source. Unresolved feedback signals are review inputs. They are not eligible for automatic mutation proposals until an owner links the Support Board card to a real Answerlattice entity.

### Product Surface Assignment

- Feedback submission does not require a Product Surface.
- When page/widget context is available, Answerlattice may store only compact surface fields (`contextKey`, `surfaceFeature`, `surfacePage`, `surfaceWorkflow`) for internal triage.
- Owners can assign or clear a Product Surface from `/answerlattice/feedback`.
- Support Board cards created from feedback include `relatedSurfaceId` and `relatedContextKeys` when present.
- Internal Product Surface keys are for Answerlattice sorting and retrieval only; end users should see labels or no surface indicator.

---

## 5. Data Isolation

| Collection                       | Scoping                                   |
| -------------------------------- | ----------------------------------------- |
| `feedback`                       | `pId='AL' + tId + sId + uId` (tenant + store + user) |
| `answerlattice_signalEvents`          | `pId='AL' + tId + sId` with `type='feedback'` metadata |
| `article_feedback/{tId}/{sId}`   | Subcollection under tenant+store          |
| `changelog_feedback/{tId}/{sId}` | Subcollection under tenant+store          |
| `faq_feedback/{tId}/{sId}`       | Subcollection under tenant+store          |

---

## 6. Risks & Open Questions

| #   | Item                                                                                       | Status                                                          |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1   | Feature usage checklist and popular requests were hardcoded with non-current feature names | ✅ RESOLVED — updated to generic SaaS support options           |
| 2   | No owner view for reviewing submitted feedback                                             | ✅ RESOLVED — `/answerlattice/feedback` plus `/platform/feedback-admin` |
| 3   | Feedback had no Product Surface sorting path                                              | ✅ RESOLVED — optional surface assignment/filtering in owner review |
| 4   | Article/changelog/FAQ counters, audit rows, and negative signals could diverge               | ✅ RESOLVED — one idempotent server transaction                 |
| 5   | Workflow feedback is unavailable                                                            | Deliberate boundary; workflows use guided-outcome evidence      |
| 6   | Only latest feedback per user is displayed                                                  | Deliberate customer acknowledgement; owner review reads 200     |
| 7   | Advanced feedback aggregation beyond current admin stats                                    | Not implemented; do not add before a measured operator need     |
| 8   | Every Help Center submission previously saved as `feature_requests`                         | ✅ RESOLVED — submit now uses the selected category             |
| 9   | Unresolved feedback signals could feed automatic mutation clustering                        | ✅ RESOLVED — mutation engines skip `entityId='unresolved'`     |
| 10  | Shared Firebase allowed unrelated workspace members to read private feedback                 | ✅ RESOLVED — exact support authority or exact submitter only    |
| 11  | Form reset left stale feature-request votes visible                                         | ✅ RESOLVED — vote state derives from the resettable form        |
| 12  | Failed reaction comments were cleared and optimistic counters could drift                    | ✅ RESOLVED — retry text retained and server counts reconcile    |
| 13  | Direct client feedback creation bypassed HTTP body, rate, and deterministic replay controls  | ✅ RESOLVED — authenticated server-owned submission route        |
| 14  | Fresh reaction request IDs could inflate counters for the same actor                          | ✅ RESOLVED — hidden authoritative actor-sentiment state          |
| 15  | Widget-only managers could inherit private feedback/audit review through generic controls     | ✅ RESOLVED — exact `canManageSupport` or knowledge authority     |
| 16  | Owner statistics over the latest 200 loaded rows appeared to be all-time totals                | ✅ RESOLVED — loaded-window labels and explicit review boundary  |
| 17  | Dedicated rules retained a browser-owned self-feedback signal bypass after server migration    | ✅ RESOLVED — client signal creation now requires support authority |

---

## 7. STEP 9C Audit (2026-03-04)

### Bugs Fixed

- Removed `console.log('Validation Failed:')` from `ShareFeedbackView.tsx`
- Updated 10 feature usage checklist items from the pre-rename product template to current shared Help Center options
- Updated 5 popular feature requests from the pre-rename product template to current shared Help Center options

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
| Content feedback (likes/dislikes) | ✅ Articles + changelog + FAQ           | No                                     |
| Detailed comments on content      | ✅ Transaction-based                    | No                                     |
| Feedback analytics/admin view     | ✅ Basic stats + list/detail admin view | No                                     |
| Contextual micro-surveys          | ❌                                      | Over-engineering for SMB ICP           |
| NPS surveys                       | ❌                                      | Out of scope per spec                  |

### Improvements Implemented

1. FeatureUsage now lists generic SaaS support areas rather than MenuList/menu-specific labels.
2. FeatureRequests now lists support-improvement suggestions rather than roadmap-style product promises.
3. `/answerlattice/feedback` gives owners a tenant-scoped review surface with total, average rating, users, and request counts.
4. `/platform/feedback-admin` remains available for platform-wide feedback review.
5. Help Center feedback now uses deterministic server-owned submission and emits retry-safe `feedback` signal events for Signal Queue / Support Board review.

### Skipped (Validated)

- **Contextual micro-surveys:** Over-engineering for SMB ICP who uses dashboard infrequently.

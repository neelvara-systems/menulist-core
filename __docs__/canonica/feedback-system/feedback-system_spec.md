# Feedback System — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Collect structured feedback from SMB owners about their platform experience, feature usage issues, and feature requests — plus provide a unified content feedback system (likes/dislikes/comments) for articles and changelog entries.

### Scope

**Owner Feedback Wizard (3 steps):**

- Step 1: General feedback — Star rating (1-5) + free-text comment
- Step 2: Feature usage — Feature issue checklist (10 features) + free-text comment
- Step 3: Feature requests — Free-text request + vote on 5 popular requests (thumbs up/down)
- Display latest submitted feedback
- Per-step validation before advancing

**Content Feedback System:**

- Unified API for likes/dislikes on articles and changelog entries
- Detailed comment feedback with sentiment (like/dislike)
- Transaction-based atomic operations
- Extensible for future content types (FAQ, workflows)

### Out of Scope

- Admin dashboard for viewing feedback (no platform-side feedback viewer exists)
- Feedback analytics/aggregation
- Email notifications on new feedback
- Feedback response/reply system
- NPS (Net Promoter Score) surveys

---

## 2. Owner Feedback Wizard

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

**Feature issue options (hardcoded):**

1. Video Upload
2. Multi-language Dubbing
3. Voice Cloning/Training
4. YouTube Channel Integration
5. Auto-posting
6. Analytics Dashboard
7. Multiple Voice Profiles
8. Batch Processing
9. Custom Templates
10. Posting Scheduler

**Note:** These feature names appear to be from an earlier product version or template. They don't match current MenuList features. This is a codebase observation, not a recommendation.

**Feedback type:** `feature_usage`

### Step 3: Feature Requests

| Field                 | Type                         | Required | Validation         |
| --------------------- | ---------------------------- | :------: | ------------------ |
| Feature Request       | Free text (TextArea, 4 rows) |    ✅    | Must enter request |
| Popular Request Votes | Thumbs up/down per request   |    ❌    | Optional           |

**Popular requests (hardcoded):**

1. Support for TikTok and Instagram video uploads
2. Real-time collaboration for team accounts
3. Custom voice effects and filters
4. API access for developers
5. Subtitle and caption generation

**Note:** Same observation as Step 2 — these appear to be from a different product context.

**Feedback type:** `feature_requests`

### Wizard Navigation

- Steps indicator (Ant Design Steps component)
- Previous/Next buttons with step-specific validation
- Cancel button resets form + returns to Step 1
- Submit on final step saves to Firestore
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

### Feedback Document (Owner Wizard)

```typescript
{
  id?: string;
  type: 'general' | 'feature_usage' | 'feature_request';
  rating?: number;                    // 1-5 stars
  comment?: string;                   // General feedback text
  featureComment?: string;            // Feature-specific comment
  featureIssues?: string[];           // Selected feature checkboxes
  featureRequest?: string;            // User's new feature request
  votedPopularRequests?: Array<{      // Votes on popular requests
    feature: string;
    interested: boolean;
  }>;
  // Auto-injected by requestBodyComposer:
  sId: string;
  tId: string;
  uId: string;
  createdOn: Timestamp;
}
```

---

## 5. Data Isolation

| Collection                       | Scoping                                   |
| -------------------------------- | ----------------------------------------- |
| `feedback`                       | `tId + sId + uId` (tenant + store + user) |
| `article_feedback/{tId}/{sId}`   | Subcollection under tenant+store          |
| `changelog_feedback/{tId}/{sId}` | Subcollection under tenant+store          |

---

## 6. Risks & Open Questions

| #   | Item                                                                                       | Status                                                          |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1   | Feature usage checklist and popular requests are hardcoded with non-MenuList feature names | ✅ RESOLVED — updated to actual MenuList features               |
| 2   | No admin view for reviewing submitted feedback                                             | ✅ RESOLVED — Feedback Admin page at `/platform/feedback-admin` |
| 3   | Article feedback is not atomic (read-then-write)                                           | Known — low risk at current scale                               |
| 4   | FAQ and workflow content types throw "not implemented" errors                              | Stubs exist in genericFeedback.ts                               |
| 5   | Only latest feedback per user is displayed                                                 | `getLatestFeedbackForUser()` returns limit(1)                   |
| 6   | No feedback analytics or aggregation                                                       | Not implemented                                                 |
| 7   | `console.log` in ShareFeedbackView validation handler                                      | ✅ RESOLVED — removed in audit                                  |

---

## 7. STEP 9C Audit (2026-03-04)

### Bugs Fixed

- Removed `console.log('Validation Failed:')` from `ShareFeedbackView.tsx`
- Updated 10 feature usage checklist items from old product template to actual MenuList features
- Updated 5 popular feature requests from old product template to MenuList-relevant requests

### Industry Best Practices Comparison (Step D Web Search)

Sources: Userpilot, Frill, Qualaroo, Usersnap

| Industry Feature                  | Our Status                              | Gap?                                   |
| --------------------------------- | --------------------------------------- | -------------------------------------- |
| Star rating (CSAT)                | ✅ 1-5 stars                            | No                                     |
| Free-text comments                | ✅ General + feature                    | No                                     |
| Feature issue checklist           | ✅ 10 options (now MenuList-specific)   | No                                     |
| Feature requests with voting      | ✅ Popular requests with thumbs up/down | No                                     |
| Multi-step wizard                 | ✅ 3-step with validation               | No                                     |
| Display previous feedback         | ✅ Latest feedback shown                | No                                     |
| Content feedback (likes/dislikes) | ✅ Articles + changelog                 | No                                     |
| Detailed comments on content      | ✅ Transaction-based                    | No                                     |
| Feedback analytics/admin view     | ❌                                      | Industry standard but separate feature |
| Contextual micro-surveys          | ❌                                      | Over-engineering for SMB ICP           |
| NPS surveys                       | ❌                                      | Out of scope per spec                  |

### Improvements Implemented

1. ✅ **Feature names updated to MenuList:** FeatureUsage.tsx now lists actual platform features (Menu Creation, AI OCR, Translations, Image Gen, Digital Display, QR Sharing, KB, Chatbot, Billing, Analytics). FeatureRequests.tsx now lists MenuList-relevant popular requests (Multi-location, Price updates, Customer ordering, Performance analytics, WhatsApp).
2. ✅ **Feedback Admin View:** New platform admin page at `/platform/feedback-admin`. Components: `FeedbackAdminTemplate` with stats cards (total, avg rating, unique users), feedback list with type tags + rating stars, and detail modal showing all fields. DAL: `getAllFeedback()` fetches all feedback ordered by newest, limited to 200. Navigation: added to Platform sidebar submenu.

### Skipped (Validated)

- **Contextual micro-surveys:** Over-engineering for SMB ICP who uses dashboard infrequently.

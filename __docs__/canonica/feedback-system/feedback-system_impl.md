# Feedback System — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Feedback System is a **client-side DAL feature** with no API routes. Two subsystems:
1. **Owner Feedback Wizard** — 3-step form → `addFeedback()` → `feedback` collection
2. **Content Feedback** — Unified router → type-specific handlers → separate collections per content type

---

## 2. Complete File Map

### 2.1 Owner-Side Components

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx` | 164 | 3-step wizard orchestrator — Steps component, form with per-step validation, submit handler (`addFeedback`), latest feedback display (Alert with rating/comments/issues/requests/votes). Uses `useTranslations('HelpCenter')`. |
| `src/components/templates/main-app/helpCenter/GeneralFeedback.tsx` | 30 | Step 1 — Star rating (`Rate` component, required) + comment (`TextArea`, 4 rows, required) |
| `src/components/templates/main-app/helpCenter/FeatureUsage.tsx` | 52 | Step 2 — Feature issues checklist (`Checkbox.Group`, 10 hardcoded options in 2-column grid) + comment (`TextArea`, 4 rows, optional) |
| `src/components/templates/main-app/helpCenter/FeatureRequests.tsx` | 88 | Step 3 — Feature request text (`TextArea`, 4 rows, required) + popular request voting (5 hardcoded items, thumbs up/down toggle per item). Votes synced to hidden form field via `useEffect`. |

### 2.2 Database Layer

**Owner Feedback DAL:** `src/database/feedback/index.ts` (54 lines)

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `addFeedback(data)` | 0 | 1 | `requestBodyComposer` + `addDoc` to `feedback` collection |
| `getLatestFeedbackForUser()` | 1 | 0 | Query: `uId + tId + sId`, orderBy createdOn desc, limit 1 |

**Generic Content Feedback:** `src/database/feedback/genericFeedback.ts` (131 lines)

| Function | Purpose | Routes To |
|----------|---------|-----------|
| `updateContentFeedback(params)` | Unified router | article → `updateArticleFeedback`, changelog → `updateChangelogFeedback` |
| `updateArticleFeedbackGeneric(...)` | Helper for articles | `updateContentFeedback({ contentType: 'article' })` |
| `updateChangelogFeedbackGeneric(...)` | Helper for changelog | `updateContentFeedback({ contentType: 'changelog' })` |
| `updateFaqFeedbackGeneric(...)` | Stub — throws "not implemented" | — |
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
    sId: string;    // from requestBodyComposer
    tId: string;    // from requestBodyComposer
    uId: string;    // from requestBodyComposer
    type: 'general' | 'feature_usage' | 'feature_request';
    rating?: number;
    comment?: string;
    featureComment?: string;
    featureIssues?: string[];
    featureRequest?: string;
    votedPopularRequests?: { feature: string; interested: boolean }[];
    createdOn: Timestamp;   // from requestBodyComposer
}
```

### 2.4 Hook

**File:** `src/hooks/useFeedback.ts` — Feedback state management

---

## 3. Data Flow

### 3.1 Owner Submits Feedback
```
ShareFeedbackView → form.onFinish(values)
  → Build feedbackPayload: { type: steps[currentStep].key, rating, comment, featureComment, featureIssues, featureRequest, votedPopularRequests }
  → startLoader('send-feedback')
  → addFeedback(feedbackPayload) [DAL]
    → requestBodyComposer (adds tId, sId, uId, createdOn)
    → addDoc to feedback collection
  → getLatestFeedbackForUser() → fetch just-submitted feedback
  → setLatestFeedback → display in Alert
  → form.resetFields()
```

### 3.2 Content Like/Dislike
```
ChangelogPreview/ArticleView → click like/dislike
  → updateContentFeedback({ contentType, contentId, feedbackType, increment })
  → Switch on contentType:
    → 'article' → updateArticleFeedback(contentId, feedbackType, increment)
      → Read article doc → increment/decrement likes/dislikes → write back
    → 'changelog' → updateChangelogFeedback(pageId, contentId, feedbackType, increment)
      → Transaction: read page → find entry → update count → write page
```

### 3.3 Content Comment Feedback
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
| 1 | Feature usage checklist has non-MenuList feature names | Medium | `FeatureUsage.tsx:4-15` | "Video Upload", "Voice Cloning", etc. — should be updated |
| 2 | Popular requests have non-MenuList feature names | Medium | `FeatureRequests.tsx:8-14` | "TikTok uploads", "Voice effects", etc. — should be updated |
| 3 | No admin view for reviewing submitted feedback | Medium | — | Data saved but no dashboard to view it |
| 4 | Article feedback is non-atomic (read-then-write) | Low | `articles.ts:154` | Could drift under concurrent writes |
| 5 | FAQ/workflow feedback types throw errors | Low | `genericFeedback.ts:61-65` | Stubs exist but not implemented |
| 6 | `console.log('Validation Failed:', error)` | Low | `ShareFeedbackView.tsx:116` | Debug log |

---

## 5. Reverse Engineering Validation

| Category | Count | Verified |
|----------|:-----:|:--------:|
| Owner components | 4 | ✅ |
| DAL files | 3 (5 functions + 4 helpers) | ✅ |
| Types | 1 | ✅ |
| Hooks | 1 | ✅ |
| **Total** | **9 items** | **✅ 100%** |

# Reputation Protection — Implementation Plan

**Status:** SCAFFOLDING ONLY / PRODUCT DISABLED (GBP API and runtime completion required; do not flip flags)
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Last Runtime Audit:** August 1, 2026
**Audience:** Developers  
**Pillar:** 3 of 6

---

## Planned Architecture Overview

This pillar records a future design that extends the dormant `reviews-reputation` scaffolding. The diagram below is not a current file/runtime inventory. Full source-truth boundaries are maintained in `__docs__/reviews-reputation/reviews-reputation_impl.md`.

```
Cloud Functions Layer:
  ├── reviewsIngestion.ts      ← Nightly GBP sync (scheduled)
  ├── reviewsClassifier.ts     ← Rule-based classification
  └── replyAssistEngine.ts     ← NEW: Gemini reply suggestion

Dashboard Layer:
  ├── ReputationStatusCard.tsx  ← "Stable" / "Needs Attention"
  ├── ReviewInbox.tsx           ← Actionable reviews list
  ├── ReviewDetail.tsx          ← Single review + AI suggestion
  └── ReplyComposer.tsx         ← Edit/approve/post reply

API Layer:
  ├── /api/reviews/states       ← GET reputation state
  ├── /api/reviews/inbox        ← GET reviews needing attention
  ├── /api/reviews/suggest      ← POST generate AI reply
  └── /api/reviews/reply        ← POST submit reply to Google
```

## Key Changes from Original Spec

### 1. AI Reply Assist (NEW — Was Previously Banned)

**Previous:** Hard ban on AI reply generation  
**Updated:** AI **suggestions** allowed with mandatory owner approval

**Implementation:**

```typescript
// replyAssistEngine.ts
async function generateReplySuggestion(review: Review): Promise<string> {
  const prompt = buildReplyPrompt(review, store.businessType);
  const suggestion = await callGemini(prompt);
  return sanitizeReply(suggestion);
}
```

**Reply prompt guidelines:**

- Polite, professional, under 3 sentences
- Acknowledge concern without being defensive
- Offer private resolution channel
- Match business type tone (restaurant vs salon vs gym)

### 2. Reply Posting via GBP API

Owner approves → POST to Google Business Profile API → Reply appears on Google

**Flow:**

1. Owner taps "Use Reply" or edits suggestion
2. POST `/api/reviews/reply` with review ID + reply text
3. API calls GBP `accounts/{id}/locations/{id}/reviews/{id}/reply`
4. Success → update local review status to "replied"
5. Failure → show retry option

### 3. Reputation Status Signal

Simple boolean state derived from classification:

```typescript
type ReputationState = "stable" | "needs_attention";
```

Computed from:

- Any unresolved "needs_attention" or "high_risk" reviews → `needs_attention`
- All reviews benign/replied → `stable`

---

## File Structure (Planned)

Detailed in `__docs__/reviews-reputation/reviews-reputation_impl.md`. Additional files for reply-assist:

| File                                           | Purpose                 | LOC (est.) |
| ---------------------------------------------- | ----------------------- | ---------- |
| `functions/src/reviews/replyAssistEngine.ts`   | Gemini reply generation | ~100       |
| `src/components/.../reviews/ReplyComposer.tsx` | Reply edit/approve UI   | ~150       |
| `src/app/api/reviews/suggest/route.ts`         | AI suggestion API       | ~60        |
| `src/app/api/reviews/reply/route.ts`           | Post reply to Google    | ~80        |

---

## Dependencies

| Dependency          | Status       | Notes                              |
| ------------------- | ------------ | ---------------------------------- |
| GBP API Access      | BLOCKED      | Ingestion CF needs this to run     |
| Gemini API          | ✅ Available | Already used for menu intelligence |
| GBP OAuth/Sync      | Separate disabled flow | Must be audited before any reuse |
| withAuth middleware | ✅ Built     | For API route protection           |
| Zod validation      | ✅ Available | For request validation             |

## Existing Scaffolding (Not Ready to Activate)

The dormant `/api/reviews/suggest` route reserves paid units before provider
work and refunds any unsettled request. Its per-user distributed limiter also
fails closed: limiter infrastructure outage returns 503, while actual quota
exhaustion returns 429. These source protections do not activate the feature or
change the GBP launch blocker.

| File                                             | Purpose                                                 | Status      |
| ------------------------------------------------ | ------------------------------------------------------- | ----------- |
| `src/types/reviews.ts`                           | Review, ReviewState, ReviewClassification types         | ✅ NEW      |
| `src/constants/database.ts`                      | REVIEWS, REVIEWS_STATE collections                      | ✅ MODIFIED |
| `functions/src/constants/database.ts`            | Same for Cloud Functions                                | ✅ MODIFIED |
| `src/config/features.ts`                         | ENABLE_REVIEWS_REPUTATION, ENABLE_AI_REPLY_ASSIST flags | ✅ MODIFIED |
| `functions/src/reviews/classificationRules.ts`   | Rule-based classification engine                        | ✅ NEW      |
| `src/app/api/reviews/states/route.ts`            | GET review states (boolean flags, parent-flag gated, rate-limited) | ✅ BUILT / DISABLED |
| `src/components/.../reviews/ReputationGuard.tsx` | Passive warning notice                                  | ✅ BUILT / NOT MOUNTED |
| `src/components/.../reviews/ReviewReplyTool.tsx` | Owner-pasted review reply suggestion component           | ✅ BUILT / NOT MOUNTED |

---

## Security Checklist

- [x] All API routes protected with `withAuth`
- [x] Tenant isolation on all review queries
- [x] Rate limiting on AI suggestion endpoint
- [x] SAFE_MODE on AI suggestion endpoint
- [ ] Reply text sanitized before posting to Google (deferred — needs GBP API)
- [ ] Provider privacy/PII launch review (pasted review text is sent to Gemini; bounded logs exclude raw text)
- [x] RBAC: only users with `canManageFeedback` can generate reply suggestions
- [x] Feature flag gated (`ENABLE_REVIEWS_REPUTATION` parent flag + `ENABLE_AI_REPLY_ASSIST`)

## June 11, 2026 Runtime Notes

- `ENABLE_REVIEWS_REPUTATION` and `ENABLE_AI_REPLY_ASSIST` are disabled by default in `src/config/features.ts`.
- `/api/reviews/states` now returns 404 while the parent flag is off, rate-limits authenticated reads, and checks `autoExpiresAt > now` in the query.
- `/api/reviews/suggest` now requires both flags, SAFE_MODE, rate limiting, a 16KB request body cap, Zod validation, sanitized prompt input, and `canManageFeedback` before AI capacity, Gemini, or accounting work.
- June 28, 2026: `/api/reviews/suggest` accounting-failure diagnostics use `review_reply_accounting_failed` with bounded tenant/store/user/business-type metadata only. Suggestion generation, capacity checks, accounting behavior, and disabled/unmounted runtime status are unchanged.
- June 30, 2026: `ReputationGuard` calls `/api/reviews/states` with no-store cache policy, same-origin credentials, and manual redirect handling, then parses the response through a 16KB bounded guard before updating passive warning state. Rejected, redirected, malformed, oversized, or invalid acknowledgements log bounded runtime diagnostics only; route behavior and disabled/unmounted runtime status are unchanged.
- July 1, 2026: `/api/reviews/suggest` now enforces the shared store permission guard with `canManageFeedback` after bounded input validation and before AI capacity/provider work. This keeps dormant reply-assist scaffolding aligned with the Feedback route permission.
- No owner dashboard mount point is active for `ReputationGuard` or `ReviewReplyTool` in the current runtime.
- No GBP ingestion/classifier writer, review inbox, reply composer, Google reply route, status card, or mobile review surface exists. Granting GBP access alone is therefore insufficient to activate the product.
- July 11, 2026: provider/generation failures now emit bounded `review_reply_generation_failed` diagnostics before the disabled suggestion route returns its static, uncharged fallback.
- July 11, 2026: the state contract is the flat `reviewsState/{reviewId}` collection with required embedded `tId`/`sId`, aligned across route, rules, indexes, types, and maintained docs.
- This route/component scaffolding should not be marketed as a live reviews product until GBP ingestion exists and the owner UI is intentionally mounted.

---

**Last Updated:** July 16, 2026

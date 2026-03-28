# Reputation Protection — Implementation Plan

**Status:** ✅ INFRASTRUCTURE BUILT (GBP API blocked — flip flag when granted)  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** Developers  
**Pillar:** 3 of 6

---

## Architecture Overview

This pillar extends existing `reviews-reputation` spec with AI reply-assist capability. Full technical details in `__docs__/reviews-reputation/reviews-reputation_impl.md`.

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
| GBP API Access      | � BLOCKED    | Ingestion CF needs this to run     |
| Gemini API          | ✅ Available | Already used for menu intelligence |
| GBP OAuth           | ✅ Built     | `ENABLE_GBP_SYNC: false`           |
| withAuth middleware | ✅ Built     | For API route protection           |
| Zod validation      | ✅ Available | For request validation             |

## Built Infrastructure (Ready to Activate)

| File                                             | Purpose                                                 | Status      |
| ------------------------------------------------ | ------------------------------------------------------- | ----------- |
| `src/types/reviews.ts`                           | Review, ReviewState, ReviewClassification types         | ✅ NEW      |
| `src/constants/database.ts`                      | REVIEWS, REVIEWS_STATE collections                      | ✅ MODIFIED |
| `functions/src/constants/database.ts`            | Same for Cloud Functions                                | ✅ MODIFIED |
| `src/config/features.ts`                         | ENABLE_REVIEWS_REPUTATION, ENABLE_AI_REPLY_ASSIST flags | ✅ MODIFIED |
| `functions/src/reviews/classificationRules.ts`   | Rule-based classification engine                        | ✅ NEW      |
| `src/app/api/reviews/states/route.ts`            | GET review states (boolean flags)                       | ✅ NEW      |
| `src/components/.../reviews/ReputationGuard.tsx` | Passive warning notice                                  | ✅ NEW      |
| `src/components/.../OwnerDashboard/index.tsx`    | ReputationGuard wired in                                | ✅ MODIFIED |

---

## Security Checklist

- [x] All API routes protected with `withAuth`
- [x] Tenant isolation on all review queries
- [ ] Rate limiting on AI suggestion endpoint (deferred — needs GBP API)
- [ ] Reply text sanitized before posting to Google (deferred — needs GBP API)
- [x] No PII in reply suggestions
- [x] RBAC: only store owner/admin can reply
- [x] Feature flag gated (ENABLE_REVIEWS_REPUTATION)

---

**Last Updated:** February 19, 2026

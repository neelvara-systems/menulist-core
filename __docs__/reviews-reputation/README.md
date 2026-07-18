# Reviews & Reputation

**Feature:** Reviews & Reputation  
**Status:** DORMANT, INCOMPLETE SCAFFOLDING — keep disabled; provider access alone is insufficient
**Version:** 1.0  
**Last Updated:** July 16, 2026

---

## Quick Navigation

| Document                                                  | Audience          | Purpose                                       |
| --------------------------------------------------------- | ----------------- | --------------------------------------------- |
| [Product Spec](./reviews-reputation_spec.md)              | CEO, PM, Business | Business requirements, user stories, scope    |
| [Implementation Plan](./reviews-reputation_impl.md)       | Developers        | Technical blueprint, DB schema, API contracts |
| [Marketing Collateral](./reviews-reputation_marketing.md) | Sales, Marketing  | Pitch deck, landing page copy, messaging      |

### Archive

| Document                                                                      | Purpose                              |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| [ChatGPT Critical Review](./_archive/CHATGPT-CONVERSATION-CRITICAL-REVIEW.md) | Original ChatGPT conversation review |
| [Initial Spec](./_archive/reviews-reputation_spec-old.md)                      | First locked spec (superseded)       |

---

## One-Line Description

> **Future Google-review workflow concept; no active ingestion, inbox, monitoring, or posting runtime exists.**

---

## Planned Architecture (Not Current Runtime)

```
Google Reviews → MenuList (Read-Only) → Classification → Owner Warning

States:
• benign/informational → [SILENCE - Owner sees nothing]
• negative_high_risk   → "It's better not to respond to this publicly."
• volatile             → "A recent review may need careful handling."
```

**Key Principle:** Owner sees at most 2 sentences. No dashboards. No analytics. Just protection.

---

## Key Files in Codebase

| File                                                            | Purpose                               | Status     |
| --------------------------------------------------------------- | ------------------------------------- | ---------- |
| `src/types/reviews.ts`                                          | Review, ReviewState types             | ✅ BUILT |
| `src/database/reviews/index.ts`                                 | DAL for reviews collections           | ❌ NOT PRESENT |
| `src/app/api/reviews/states/route.ts`                           | GET review states API (booleans only; flag-gated, rate-limited) | ✅ BUILT / DISABLED |
| `src/components/templates/main-app/reviews/ReputationGuard.tsx` | Passive warning notice (not mounted while flag is off) | ✅ BUILT / DISABLED |
| `functions/src/reviews/reviewsIngestion.ts`                     | Cloud Function - ingestion            | 🔶 BLOCKED |
| `functions/src/reviews/reviewsClassifier.ts`                    | Cloud Function - classification       | 🔶 BLOCKED |
| `functions/src/reviews/classificationRules.ts`                  | Pure classification rules; no caller/writer | ✅ BUILT / DORMANT |

---

## Feature Flags

```typescript
// src/config/features.ts

ENABLE_REVIEWS_REPUTATION: false; // Master toggle - INACTIVE until GBP access
ENABLE_AI_REPLY_ASSIST: false; // Requires ENABLE_REVIEWS_REPUTATION
```

## June 11, 2026 Runtime Notes

- `ENABLE_REVIEWS_REPUTATION` and `ENABLE_AI_REPLY_ASSIST` are disabled by default.
- `/api/reviews/states` returns only booleans, is parent-flag gated, rate-limited, and queries non-expired `reviewsState` documents.
- `/api/reviews/suggest` is also parent-flag gated and SAFE_MODE guarded. It remains a suggestion-only route; MenuList does not auto-post review replies.
- Review-state and review-suggest limiter keys store only HMAC-hashed owner, tenant, and store key material.
- June 28, 2026: `/api/reviews/states` fetch failures and `/api/reviews/suggest` accounting-failure diagnostics use bounded runtime metadata only; route behavior and disabled feature status are unchanged.
- June 29, 2026: desktop Review Reply copy failures log `desktop_review_reply_copy_failed` with bounded review/reply length metadata only. Pasted review text and generated reply text are not logged, and disabled feature status is unchanged.
- June 30, 2026: `ReputationGuard` calls `/api/reviews/states` with no-store cache policy, same-origin credentials, and manual redirect handling, then parses the response through a 16KB bounded guard before updating passive warning state. Malformed, oversized, rejected, redirected, or invalid acknowledgements log bounded runtime diagnostics only; disabled/unmounted feature status is unchanged.
- June 30, 2026: `ReviewReplyTool` submits `/api/reviews/suggest` with same-origin credentials, no-store cache policy, and manual redirect handling, then parses the response through a 16KB bounded response guard and requires `{ success: true, reply }` before showing a generated reply or incrementing attempts. Disabled/unmounted feature status and the no-auto-post boundary are unchanged.
- June 30, 2026: `/api/reviews/suggest` normalizes pasted review text and business type before prompt construction, escapes review text through JSON string serialization, and records sanitized prompt length/business type metadata for accounting. Disabled/unmounted feature status and the no-auto-post boundary are unchanged.
- June 30, 2026: `ReviewReplyTool` copied feedback waits for Clipboard API success or acknowledged textarea fallback success; failed copy diagnostics include clipboard/fallback support booleans while keeping pasted review text and generated reply text out of logs. Disabled/unmounted feature status and the no-auto-post boundary are unchanged.
- July 6, 2026: `/api/reviews/states` validates session tenant/store IDs with the shared Firestore document-ID guard before limiter keys, query filters, or diagnostics, while preserving the original numeric/string values for existing `reviewsState` equality filters.
- July 1, 2026: `ReviewReplyTool` now requires the suggestion envelope to include `source: "ai" | "fallback"` as well as `success: true` and a non-empty `reply` before showing a generated reply or incrementing attempts. Disabled/unmounted feature status and the no-auto-post boundary are unchanged.
- July 11, 2026: the dormant rule classifier now accepts only integer ratings from 1 through 5 and string/absent comments, matches keywords as complete words or phrases, and keeps stem-like discrimination handling in an explicit pattern. Harmless words such as `rating` therefore cannot match the hygiene keyword `rat`, while malformed future ingestion input fails closed. `npm run verify:reviews-reputation-boundary` covers these cases.
- July 11, 2026: the persisted review-state contract is the flat `reviewsState/{reviewId}` collection with required embedded `tId` and `sId`, matching the active route, rules, and composite indexes. The disabled reply route now logs bounded `review_reply_generation_failed` diagnostics before returning its static, uncharged provider-failure fallback.
- July 11, 2026: `npm run test:reviews:rules` uses the Firestore emulator to prove own-store and multi-store reads, numeric/string embedded scope compatibility, cross-store/cross-tenant/public denial, scope-complete list queries, malformed-scope denial, platform reads, and client/platform write denial.
- `ReputationGuard` and `ReviewReplyTool` exist as components but are not mounted in the owner dashboard while the feature is disabled.
- No GBP ingestion/classifier writer, scheduler, review DAL/inbox, Google reply route, or mobile review UI exists. Full product implementation remains blocked beyond provider access.

---

## Dependencies

| Dependency                   | Status      | Impact                        |
| ---------------------------- | ----------- | ----------------------------- |
| **GBP API Access**           | 🔶 BLOCKED  | Required but not sufficient   |
| GBP Sync Feature             | 🔶 BLOCKED  | Separate flow; validate during implementation |
| Guest Feedback               | ✅ COMPLETE | Separate private correction channel only |
| MOL (Menu Observation Layer) | ✅ COMPLETE | Logging integration           |

---

## Hard Bans (NEVER Build)

| Feature                 | Reason                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ~~AI reply generation~~ | ~~Pre-Rejected Feature~~ → **UPGRADED**: AI reply **suggestions** allowed (owner must review + approve before posting). See `__docs__/reputation-protection/reputation-protection_spec.md` |
| AI auto-post replies    | Owner MUST review before posting. Google GBP API requires explicit action.                                                                                                                 |
| Sentiment dashboard     | Violates Law 7                                                                                                                                                                             |
| Rating analytics        | Violates Law 7                                                                                                                                                                             |
| Review gating           | FTC violation                                                                                                                                                                              |
| Reply templates         | Breaks authority                                                                                                                                                                           |

---

## Related Documentation

| Document                 | Location                                             |
| ------------------------ | ---------------------------------------------------- |
| Internal Feedback System | `__docs__/projects/internal-feedback-system/`        |
| GBP Sync                 | `__docs__/gbp-sync/`                                 |
| Core Doctrine            | `__docs__/constitution/01-core-doctrine.md`          |
| Language Governance      | `__docs__/constitution/02-language-governance.md`    |
| Feature Rejection Gate   | `__docs__/constitution/08-feature-rejection-gate.md` |

---

## Version History

| Version | Date        | Changes                                       |
| ------- | ----------- | --------------------------------------------- |
| 1.0     | Feb 2, 2026 | Initial spec complete, implementation blocked |

---

## Document Owners

| Role            | Responsibility                          |
| --------------- | --------------------------------------- |
| **Product**     | Spec accuracy, user stories             |
| **Engineering** | Implementation plan, technical accuracy |
| **Marketing**   | Approved language, messaging            |
| **Founder**     | Final approval, doctrine alignment      |

---

**IMPLEMENTATION STATUS:** INCOMPLETE AND DISABLED (provider, writer, owner/mobile, security, deploy, and smoke evidence required)

_Source fragments exist, but they are not an activatable product._

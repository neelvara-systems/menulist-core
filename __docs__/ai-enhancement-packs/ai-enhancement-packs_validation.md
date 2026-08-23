# AI Enhancement Packs — Implementation Validation Report

> **Generated:** Feb 9, 2026
> **Last Updated:** July 15, 2026
> **Status:** Current source contract updated; final verification evidence is recorded in the July 14 section
> **Type Check:** ✅ Zero new errors introduced

## July 15, 2026 Client Capacity Error Compatibility

- `AICapacityError` now restores `AICapacityError.prototype`, preserving `instanceof` behavior under the repository's ES5 target.
- The description orchestration boundary sends a mocked 402 response through `checkCapacityResponse()`, verifies the `exhausted` capacity code reaches the caller, attempts no later batch, and publishes no local project update.
- This changes failure classification only; successful requests, server reservation/settlement, balance sync, and existing Billing copy remain unchanged.

## May 20, 2026 Usage History Hardening

Live Billing → View Usage exposed incorrect `Jan 10, 1972` dates when Firestore `Timestamp` values were passed directly into the display formatter. The fix expands the shared date normalizer and routes desktop Transactions, Mobile Transactions, and the transaction details modal through it.

Verification:

- `npx tsx -e "import { Timestamp } from 'firebase/firestore'; import { toDate } from './src/utils/dateTime'; ..."` confirmed a Firestore `Timestamp` normalizes to the expected 2026 date.
- `npx tsc --noEmit --incremental false` passed.
- `npm run lint` passed.

Billing mutation failure paths on desktop and mobile now use the monitored logger instead of frontend `console.error`.

## July 14, 2026 End-to-End Accounting and Owner-Surface Correction

- Inherited-outlet operations remain in the selected outlet history while reservation, settlement, refund, and stale-reservation recovery use the effective HQ subscription recorded as `accountingBillingStoreId`.
- Balance events include `billingStoreId`; the session provider ignores responses for any other active subscription.
- Completed/partial authenticated menu extraction atomically mirrors a compact zero-credit activity row into `menulistAiOperations/{tId}/{sId}` while preserving the detailed platform row in `MENULIST_AI_OPERATIONS`.
- Owner-history mirroring requires a project destination, a non-empty exact owner ID, and either the authenticated owner-upload or authenticated menu-link source. Public-draft and messaging extraction remain platform-audit-only even when their durable jobs carry platform scope IDs.
- Desktop and mobile action filters use the MenuList owner action allowlist. Desktop now exposes Previous/Next when an empty filtered scan requires manual continuation, matching mobile reachability.
- MenuList Billing shows exact purchased Pack balance and operation credit costs, but hides monthly included allowance, monthly remaining, used-this-cycle, provider cost, and margin.
- Batch-image preview uses the shared generated-menu-image cost (5 credits each); extraction upload/delete warnings no longer claim that no credits were used.

Verification commands: `npm run verify:ai-accounting`, `npm run verify:billing-entitlement-boundary`, `npm run test:ai-capacity-reservation:emulator`, `npm run typecheck`, and the MenuList Functions build/lint gates.

The initial scoped `processMenuImagesJob` QA deploy and the post-cross-check retry each passed their configured Functions lint/build predeploy and then stopped before upload at Cloud Resource Manager HTTP 403 because the caller lacks project permission. Source/local gates are complete; deployed owner extraction-history mirroring remains pending that external permission.

---

## Historical February Engineering Checklist

The tables below preserve the original implementation evidence. The July 14 correction above supersedes old line numbers, post-provider consume ordering, owner monthly-meter language, and pre-reservation route descriptions.

### Task 0.1: Kill Switch (ENABLE_AI_ENHANCEMENTS)

| Check                           | Status | Evidence                                                                            |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Flag added to `features.ts`     | ✅     | `src/config/features.ts:790` — `ENABLE_AI_ENHANCEMENTS: true`                       |
| Follows existing pattern        | ✅     | Same `as const` object, JSDoc comment block                                         |
| `checkAICapacity()` checks flag | ✅     | `src/lib/ai/capacityCheck.ts:67-74` — returns `reason: "maintenance"`               |
| Free operations unaffected      | ✅     | `src/lib/ai/capacityCheck.ts:54-61` — free check runs before kill switch            |
| Client receives calm message    | ✅     | Billable AI routes return `"AI enhancements are temporarily unavailable."` on maintenance |

### Task 0.2: Exact Capacity Enforcement

| Check                                 | Status | Evidence                                                                          |
| ------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| No overdraft constant or reason branch | ✅     | `src/constants/AI/unitCosts.ts`, `src/lib/ai/capacityCheck.ts` |
| Expired promotional balance excluded from admission, referral renewal, and desktop/mobile totals | ✅ | `src/data/shared/contentCreditPolicy.ts`, `src/lib/ai/capacityCheck.ts`, `src/lib/ownerReferral/ownerReferralSettlementServer.ts`, billing UI regression coverage |
| Exact admission before provider work   | ✅     | Reservation requires the full operation cost                  |
| Balances remain non-negative           | ✅     | Goodwill uses explicit expiring promotional credits           |

### Task 1.1: AI Unit Costs

| Check                       | Status | Evidence                                                 |
| --------------------------- | ------ | -------------------------------------------------------- |
| `AI_UNIT_COSTS` defined     | ✅     | `src/constants/AI/unitCosts.ts`                          |
| Real-cost map defined       | ✅     | `src/constants/AI/unitCosts.ts`                          |
| Free operations = 0 units   | ✅     | IMAGE_PROCESSING, ADD_DESCRIPTION, NEW_ITEM_METADATA = 0 |
| `isFreeTierAction()` helper | ✅     | Fails closed through `getUnitCost()`                     |
| `getUnitCost()` helper      | ✅     | Unknown actions throw instead of defaulting to 0         |
| Extraction audit owner units | ✅    | Extraction transaction stores `unitsConsumed: 0` while preserving token/cost telemetry |

### Task 1.2: Server Finalizer + unitsConsumed

| Route                                    | Status | Evidence |
| ---------------------------------------- | ------ | -------- |
| `/api/descriptions`                      | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/image-generation`                  | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/image-editing`                     | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/image-generation/batch-generation` | ✅     | Uses `finalizeAiOperationAccounting()` with direct `tId`/`sId` |
| `/api/translations`                      | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/new-item-metadata`                 | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/business-copy`                     | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/seo`                               | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/campaigns/caption`                 | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/reviews/suggest`                   | ✅     | Uses `finalizeAiOperationAccounting()` |
| `/api/menu-card-export/design-advisor`   | ✅     | Uses `finalizeAiOperationAccounting()` |

### Task 2.1 + 2.2: Capacity Check + Consume

| Check                          | Status | Evidence                                                      |
| ------------------------------ | ------ | ------------------------------------------------------------- |
| `checkAICapacity()` created    | ✅     | `src/lib/ai/capacityCheck.ts:49-93`                           |
| `consumeAICapacity()` created  | ✅     | `src/lib/ai/capacityCheck.ts:104-131`                         |
| Monthly credits consumed first | ✅     | `src/lib/ai/capacityCheck.ts:118-126`                         |
| TopUp credits consumed second  | ✅     | `src/lib/ai/capacityCheck.ts:122-124`                         |
| Uses server subscription/accounting boundary | ✅ | Exact-dual-`ML` transaction-owned reservation and settlement in `src/lib/ai/capacityCheck.ts` |

### Task 2.3: Capacity Check Integration (Billable Routes)

| Route                    | Pre-check | Consume | Evidence                                 |
| ------------------------ | --------- | ------- | ---------------------------------------- |
| `/api/descriptions`      | ✅        | ✅      | Lines 82-94 (check), 193-195 (consume)   |
| `/api/image-generation`  | ✅        | ✅      | Lines 190-202 (check), 286-288 (consume) |
| `/api/image-editing`     | ✅        | ✅      | Lines 111-123 (check), 157-159 (consume) |
| `/api/batch-generation`  | ✅        | ✅      | Lines 163-176 (check), 285-287 (consume) |
| `/api/translations`      | ✅        | ✅      | Lines 66-78 (check), 137-139 (consume)   |
| `/api/new-item-metadata` | ✅        | ✅      | Lines 69-81 (check), 150-152 (consume)   |

---

## 2. Data Layer

| Check                                      | Status | Evidence                                |
| ------------------------------------------ | ------ | --------------------------------------- |
| `AIEnhancementPack` interface              | ✅     | `src/data/common.ts:63-71`              |
| One final `AIEnhancementPack` type with no pre-launch compatibility alias | ✅ | `src/data/common.ts` |
| Single launch pack defined                 | ✅     | `src/data/PlatformPlansList.ts:113-123` |
| `aiEnhancementPacksList` exported          | ✅     | `src/data/PlatformPlansList.ts:154`     |
| One final `aiEnhancementPacksList` export with no pre-launch compatibility alias | ✅ | `src/data/PlatformPlansList.ts` |

---

## 3. Razorpay Integration

| Check                                   | Status | Evidence                                                 |
| --------------------------------------- | ------ | -------------------------------------------------------- |
| `create-topup-order` uses new pack list | ✅     | `src/app/api/razorpay/create-topup-order/route.ts:2,87`  |
| `verify-topup` uses new pack list       | ✅     | `src/app/api/razorpay/verify-topup/route.ts:1,123`       |
| Error messages use "Enhancement pack"   | ✅     | Both routes updated                                      |
| Existing Razorpay flow preserved        | ✅     | Architecture unchanged — only pack data + labels updated |

---

## 4. Frontend Integration

| Check                                    | Status | Evidence                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `AICapacityError` class and ES5-safe prototype | ✅ | `src/services/ai/capacityError.ts:22` |
| `checkCapacityResponse()` utility        | ✅     | `src/services/ai/capacityError.ts:39`                                   |
| Descriptions service — 402 handling      | ✅     | `src/services/ai/description/generateDescriptionViaAPI.ts:40`           |
| Image generation service — 402 handling  | ✅     | `src/services/ai/image/generateImageViaApi.ts:62`                        |
| Image editing service — 402 handling     | ✅     | `src/services/ai/image/editImageViaApi.ts:30`                            |
| Translations service — 402 handling      | ✅     | `src/components/templates/main-app/projects/generateTranslations.ts:45` |
| New item metadata service — 402 handling | ✅     | `src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts:97`         |

---

## 5. UI Updates

| Check                                            | Status | Evidence                                                               |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------------- |
| `CreditsPackModal` — outcome-based title         | ✅     | `src/components/templates/main-app/billing/CreditsPackModal.tsx:24-25` |
| `CreditsPackModal` — uses new pack list          | ✅     | Line 30 — `aiEnhancementPacksList`                                     |
| `CreditPackCard` — uses `AIEnhancementPack` type | ✅     | `src/components/templates/main-app/billing/CreditPackCard.tsx:12`      |
| `CreditPackCard` — enhancement pack style        | ✅     | Lines 29-36 — blue theme for "enhancement" packId                      |
| Website `CreditPackCard` — transparent Pack value | ✅     | Shows `pack.creditAmount` plus shared-policy generated-image and description examples |
| Desktop/mobile Billing Pack cards — transparent Pack value | ✅ | Show the same amount and examples through localized Billing copy |

---

## 6. Security Checklist

| Check                               | Status | Notes                                          |
| ----------------------------------- | ------ | ---------------------------------------------- |
| All routes use `withAuth()`         | ✅     | Pre-existing — not changed                     |
| Tenant isolation preserved          | ✅     | `checkAICapacity` uses session.tId/session.sId |
| Rate limiting preserved             | ✅     | Pre-existing — runs before capacity check      |
| Zod validation preserved            | ✅     | Pre-existing — runs before capacity check      |
| No provider economics exposed to client | ✅ | Owners see credit balances; provider costs and margins remain private |
| Kill switch accessible to founder   | ✅     | Simple boolean in `features.ts`                |

---

## 7. Architecture Compliance

| Rule                                      | Status | Notes                                           |
| ----------------------------------------- | ------ | ----------------------------------------------- |
| Per-store capacity model                  | ✅     | `checkAICapacity(tenantId, storeId, ...)`       |
| Uses existing subscription.monthlyCredits | ✅     | No new Firestore documents or collections       |
| Uses existing subscription.topUpCredits   | ✅     | No new Firestore documents or collections       |
| Transparent Pack/operation language       | ✅     | Exact balances, Pack credits, and per-operation costs are allowed; provider economics stay private |
| 3-year architecture freeze compliant      | ✅     | No new infrastructure, uses existing patterns   |

---

## 8. Files Created

| File                               | Purpose                                           |
| ---------------------------------- | ------------------------------------------------- |
| `src/constants/AI/unitCosts.ts`    | Versioned operation costs and strict admission helpers |
| `src/lib/ai/capacityCheck.ts`      | checkAICapacity + consumeAICapacity               |
| `src/services/ai/capacityError.ts` | Frontend AICapacityError + checkCapacityResponse  |

## 9. Files Modified

| File                                                                 | Changes                                                        |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/config/features.ts`                                             | +ENABLE_AI_ENHANCEMENTS kill switch                            |
| `src/data/common.ts`                                                 | Final `AIEnhancementPack` interface                            |
| `src/data/PlatformPlansList.ts`                                      | Final one-Pack `aiEnhancementPacksList` authority              |
| `src/app/api/descriptions/route.ts`                                  | +capacity check, +addAiOperation uncommented, +unitsConsumed   |
| `src/app/api/image-generation/route.ts`                              | +capacity check, +addAiOperation uncommented, +unitsConsumed   |
| `src/app/api/image-editing/route.ts`                                 | +capacity check, +addAiOperation uncommented, +unitsConsumed   |
| `src/app/api/image-generation/batch-generation/route.ts`             | +capacity check, +addAiOperation uncommented, +unitsConsumed   |
| `src/app/api/translations/route.ts`                                  | +capacity check, +addAiOperation uncommented, +unitsConsumed   |
| `src/app/api/new-item-metadata/route.ts`                             | +capacity check, +addAiOperation uncommented, +unitsConsumed   |
| `src/app/api/razorpay/create-topup-order/route.ts`                   | aiEnhancementPacksList import + labels                         |
| `src/app/api/razorpay/verify-topup/route.ts`                         | aiEnhancementPacksList import + labels                         |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx`     | outcome-based title + new pack list                            |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`       | AIEnhancementPack type + enhancement style                     |
| `src/services/ai/description/generateDescriptionViaAPI.ts`           | +402 capacity handling                                         |
| `src/services/ai/image/generateImageViaApi.ts`                       | +402 capacity handling                                         |
| `src/services/ai/image/editImageViaApi.ts`                           | +402 capacity handling                                         |
| `src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts`         | +402 capacity handling                                         |
| `src/components/templates/main-app/projects/generateTranslations.ts` | +402 capacity handling                                         |

---

## 10. ChatGPT Feedback Audit (Feb 10, 2026)

| #   | Feedback Point                   | Verdict                      | Reason                                                                             |
| --- | -------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Margins too high (97%)           | ✅ VALID (no code change)    | Architecture already supports unit cost adjustment via `AI_UNIT_COSTS`             |
| 2   | Anti-abuse velocity guard        | ✅ VALID (already mitigated) | Rate limits + exact capacity + kill switch + top-up limit |
| 3   | Dormant account topUpCredits     | ❌ REJECT                    | Expired subs return null from query; new subs start with topUpCredits=0            |
| 4   | Rename internal variables        | ❌ REJECT                    | Firestore migration needed; violates Rule 20 + 3-year freeze                       |
| 5   | AI Cost % of Revenue metric      | 🔄 IMPROVE (backlog)         | Data infra exists; added to admin dashboard backlog in impl doc                    |
| 6   | Pack naming → "Menu Update Pack" | ? CLARIFY                    | Founder decision needed; current name covers full scope                            |

**Docs updated:** spec §Risks (abuse/dormant/margin sections), impl (admin dashboard backlog)
**Audit file:** `_archive/code-feedback-audit.md`
**Type check:** ✅ Zero new errors (re-verified Feb 10, 2026)

---

## Pre-existing Type Errors (NOT introduced by this implementation)

These existed before and are unrelated:

- `TimeSlotPresetsTab.tsx` — `useFormatter` not found
- `FeedbackCard.tsx` — missing `StarRating` module
- `MenuPage.tsx` — MenuLayout type comparisons
- `integrityEngine.ts` / `molLogger.ts` / `pdfQueue.ts` — pricing module issues
- `auth.ts` — Session type missing `platformRole`/`role`

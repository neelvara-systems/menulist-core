# AI Enhancement Packs — Implementation Plan

**Feature:** AI Enhancement Packs (Outcome-Based AI Pricing & Usage Tracking)
**Status:** Implemented and hardened
**Last Updated:** July 15, 2026
**Audience:** Developers only

> **Launch boundary:** Not current launch certification or deploy approval. This implementation document records source-gated AI Enhancement Pack and accounting behavior only. Current approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:billing-entitlement-boundary`, `npm run verify:ai-accounting`, Razorpay sandbox subscription/top-up/reseller/webhook smoke, desktop/mobile Billing browser QA, target deploy evidence, and production-host smoke.

> **August 22 Content Credit contract:** `content-credit-decision-record-2026-08.md` is authoritative. Billing shows recurring, valid promotional, purchased, and usable balances. The Pack contains 250 credits for ₹799 / $29 before tax. Referral rewards use a separate 365-day promotional balance. Rates are versioned, overdraft is zero, and future annual allowances never become purchased credits during replacement.

`resolveMenuListPromotionalCreditState()` is the shared expiry authority for AI admission, referral settlement, and desktop/mobile Billing. A positive promotional scalar without a valid future expiry is unavailable. A later referral reward starts from zero when the stored promotional balance has expired, preventing stale value from being revived.

## July 15, 2026 Client Capacity Error Contract

`AICapacityError` restores its prototype explicitly after `Error` construction. This is required by the root ES5 TypeScript target so `instanceof AICapacityError` remains reliable in description, metadata, translation, image, and design-advisor clients. A valid 402 capacity response therefore reaches the existing Billing/enhancement guidance instead of being collapsed into a generic provider failure. `test:description-output-boundary` exercises the shared error through a real mocked 402 response.

## June 2, 2026 Accounting Hardening Contract

Billable AI route accounting is centralized in `src/lib/ai/accounting.ts` and `src/lib/ai/capacityCheck.ts`. Paid routes reserve exact positive-integer units transactionally before provider work, using the final operation ID as the idempotency key. The operation stays in the selected outlet ledger while `accountingBillingStoreId` records the effective subscription store that was debited; this is required when an outlet inherits its HQ subscription. Successful provider calls settle that hidden reservation through `finalizeAiOperationAccounting()`; terminal provider or route failure refunds the exact recurring/top-up buckets once against that same effective subscription. A paid non-idempotent finalization without a reservation fails closed instead of returning usable output for free. Zero-unit platform-absorbed actions remain unreserved.

Every subscription admission and transaction re-read must pass `getMenuListSubscriptionEntitlementScope()`: both product aliases must be exact `ML`, both tenant/store alias pairs must be present positive safe integers, and duplicate aliases must agree. Lazy reset, reservation, finalization, refund, legacy consumption, idempotent replay and exhausted-credit messaging never use a primary/fallback alias as authority. Historical operation shells may contain one scope alias; if both compact and legacy aliases exist they must agree before replay or settlement.

Browser/client access to full `menulistAiOperations/{tId}/{sId}` documents is disabled for owners. The old `addAiOperation()` client helper now throws immediately, Firestore rules deny all client writes, and direct full-document client reads are platform-only. Desktop and mobile owner transaction screens read through `GET /api/ai-operations`, which requires current persisted `canAccessBilling` permission and returns an owner-visible allowlisted activity shape. Platform-role API responses use a separate bounded accounting allowlist; raw provider/generation payloads, tenant/store/user IDs, and full transaction JSON do not cross this browser route.

`AI_UNIT_COSTS` and `GEMINI_COST_USD` are now fail-closed. Every `AI_ACTIONS_TYPES` value must have an explicit unit-cost and real-cost entry; unknown AI actions throw instead of silently defaulting to a free operation. This protects future AI features from accidentally bypassing credits or internal margin tracking.

Dashboard visibility is split by audience. Owner-facing desktop/mobile Transactions show operation date, action, project/menu when available, processing time, owner credits used, no-credit setup actions, and the owner-relevant generated/extracted output summary. They do not receive raw token counts, provider cost, model names, provider payloads, generation config, tenant/store IDs, file IDs, or margin fields. Desktop pagination is cursor-based with Previous/Next controls because exact totals are not read from Firestore. The transaction API applies the shared `DATA_READ` limit, validates query/date shape, and requires current persisted `canAccessBilling` permission before operation-ledger reads. The desktop owner page only loads the read-only projects summary when the current page has project IDs; it does not use the project-list helper that can create a default menu. Platform-role users get a gated debug section with bounded token, model, provider-cost, owner-charge, margin, project/file, and transaction identity fields; full transaction JSON and raw provider payloads remain server-side.

Regression command:

```bash
npm run verify:ai-accounting
```

## July 1, 2026 Protected Owner AI Route Permission Contract

Owner-facing AI routes require the existing store-role permission before capacity, provider, task fanout, Firestore analytics reads, or accounting work. Body-based routes run bounded body parsing and schema validation before the permission guard so rejected malformed requests do not incur a store permission read.

| Route | Required permission | Expensive work blocked before |
| --- | --- | --- |
| `src/app/api/business-copy/route.ts` | `canManagePublicPresence` or `canManageStore` | Capacity check, Gemini call, accounting |
| `src/app/api/campaigns/caption/route.ts` | `canManageMenuSharing`, `canPublishMenu`, or `canManageMenu` | Tenant check, capacity check, Gemini call, accounting |
| `src/app/api/descriptions/route.ts` | `canGenerateDescriptions` | Outlet policy, capacity check, Gemini call, accounting |
| `src/app/api/new-item-metadata/route.ts` | `canGenerateDescriptions` | Capacity check, Gemini call, accounting |
| `src/app/api/translations/route.ts` | `canGenerateDescriptions` | Outlet policy, capacity check, Gemini call, accounting |
| `src/app/api/image-generation/route.ts` | `canGenerateImages` | Outlet policy, capacity check, media fetch, Gemini call, accounting |
| `src/app/api/image-editing/route.ts` | `canGenerateImages` | Outlet policy, capacity check, media fetch, Gemini call, accounting |
| `src/app/api/image-generation/batch-trigger/route.ts` | `canGenerateImages` | Outlet policy, prompt estimation, capacity check, Cloud Tasks fanout |
| `src/app/api/menu-card-export/design-advisor/route.ts` | `canManageMenuSharing`, `canPublishMenu`, or `canManageMenu` | Subscription plan read, capacity check, Gemini call, accounting |
| `src/app/api/seo/route.ts` | `canManagePublicPresence` or `canManageStore` | Capacity check, Gemini call, accounting |
| `src/app/api/ai-packs/status/route.ts` | `canAccessBilling` | Capacity status read |
| `src/app/api/analytics/weekly-narrative/generate-local/route.ts` | `canViewAnalytics` | Firestore analytics reads, Gemini call, insight write, operation log |

`npm run verify:menulist-api-tenant-safety` and `npm run verify:auth-security-failure-matrix` guard this route ordering so future AI routes cannot rely only on authenticated tenant/store scope before consuming AI capacity, reading analytics, enqueuing tasks, or calling provider work.

The AI pack status route also resolves compact root and nested legacy session
tenant/store aliases through one exact agreement contract. Every supplied alias
must be a canonical positive numeric Firestore document ID and duplicate aliases
must agree. The same resolved numeric scope is used by the permission store read
and the capacity/subscription lookup, so a contradictory session cannot
authorize one store and inspect or lazily reset another store's subscription.

## May 13, 2026 Runtime Contract

AI enhancement accounting is now enabled end to end for owner-billable AI operations and auditable for free/internal AI operations.

Billable owner actions call `checkAICapacity()` and transactionally reserve exact credits before provider work, deducting `monthlyCredits`, then unexpired `promotionalCredits`, then `topUpCredits`. Valid output settles the same hidden operation shell without a second debit; terminal failure refunds the exact buckets once. API responses return the three balances with the effective `billingStoreId`, and desktop/mobile frontend services sync only the matching active subscription without an extra read.

Free, public, and internal AI calls also write operation events for cost visibility, but set `unitsConsumed = 0` and do not drain owner packs. Current non-billable audit paths include menu intake identity, public create-menu extraction, weekly analytics narrative, Help Center search, public Answerlattice widget search, Help Center article embedding, and Answerlattice translation.

Help Center and widget search are conditional audit paths. The shared search core marks provider-backed work through `aiProviderUsed` and `aiProviderOperations`; wrappers write operation records only when the request actually reached Gemini for image query generation, embedding generation, or answer generation. Canonical hits, instant-cache hits, and ordinary cached answers are not AI operations and do not create `menulistAiOperations` writes.

Owner visibility is exposed in desktop and mobile Billing through recurring plan balance, valid promotional balance, purchased Pack balance, and the total usable balance. Desktop additionally shows recurring allowance and used-this-cycle context. Expired promotional value is excluded from both displayed and usable totals. Desktop and mobile Transactions show credits used, no-credit operations, and normalized operation dates so owners can trace activity without exposing provider cost, model, margin, or raw provider payloads. Menu extraction writes its platform audit row and, for authenticated owner-scoped work, a compact no-credit row to the selected outlet history in one Firestore batch. Platform-role debug surfaces retain bounded token, model, cost, and project/file/transaction identifiers without full transaction payloads.

May 20 hardening: Transactions render `createdOn` through the shared date normalization utility so live Firestore `Timestamp`, serialized `{ seconds, nanoseconds }`, ISO string, and `Date` values display consistently on desktop, mobile, and the transaction details modal. Billing mutation failure paths now report through the monitored logger instead of browser `console.error`.

> **Historical planning record:** Sections below preserve the original implementation sequence and superseded UI sketches. Where they show monthly owner meters, multi-pack variants, client operation writes, post-provider debit, or the old `aiOperations` path, the current June/July contracts above and the July 14 credit-transparency/accounting rules take precedence.

---

## Analysis: ChatGPT Suggestions vs Codebase Reality

### What ChatGPT Got Right

| Suggestion                               | Codebase Evidence                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Internal credits, external outcome packs | `TOKENS_PER_CREDIT`, `CHARGE_PER_CREDIT` in `src/constants/common.ts:138-141`                                               |
| Append-only usage event logging          | `finalizeAiOperationAccounting()` + Admin SDK operation logging in `src/lib/ai/accounting.ts` and `src/lib/ai/operationLog.ts` |
| Rate limiting for AI ops                 | `AI_OPERATION` (20/min), `AI_EXPENSIVE` (5/min) in `src/lib/rateLimit/configs.ts:22-37`                                     |
| Top-up billing infrastructure            | `TOPUPS` collection in `src/constants/database.ts:16`, `PAYMENT_TOPUP` rate limit in `src/lib/rateLimit/configs.ts:148-152` |
| Free/paid boundary                       | `ADD_DESCRIPTION` vs `REWRITE_DESCRIPTION` in `src/constants/common.ts:131-132`                                             |

### What ChatGPT Got Wrong

| Suggestion                             | Why Wrong                                                                                 | Correct Approach                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| OpenAI/GPT models                      | MenuList uses Gemini exclusively (`src/constants/AI/models.ts`)                           | Calibrate unit costs against Google AI pricing               |
| `/tenants/{tenantId}/` Firestore paths | Existing pattern is `{collection}/{tId}/{sId}` (`src/database/aiOperations/index.tsx:14`) | Use existing `MENULIST_AI_OPERATIONS` + `TOPUPS` collections |
| "MOL v0 already exists"                | `ENABLE_MENU_OBSERVATION: false` (`src/config/features.ts:510`) — not built               | Ignore MOL references                                        |
| Mutable `aiCapacityUsed` counter only  | No event-driven backup                                                                    | Use atomic counter + append-only events (reconcilable)       |
| Stripe as payment provider             | MenuList uses **Razorpay** (implemented and billing-slice audited; current launch certification still requires active gates) | Adapt existing Razorpay top-up flow for enhancement packs    |

---

## Existing Payment Infrastructure (Razorpay — Already Built)

### CRITICAL: The top-up purchase flow already exists and is source-gated

The following Razorpay-based credit purchase system is implemented and covered by the billing entitlement source gate. The AI Enhancement Packs implementation must adapt this existing flow, not build a parallel one. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:billing-entitlement-boundary`, Razorpay sandbox top-up smoke, desktop/mobile Billing browser QA, target deploy evidence, and production-host smoke.

#### Existing Top-Up Flow (End-to-End)

```
Client: handleTopupPurchase(pack, currency)                  [usePaymentHandler.ts:147]
    ↓
POST /api/razorpay/create-topup-order                        [create-topup-order/route.ts]
    → withAuth() → verifyTenantAccess() → canManageSubscription → rateLimit(PAYMENT_TOPUP)
    → Find pack from aiEnhancementPacksList by packId
    → razorpayClient.orders.create({ amount, currency, notes: { tenantId, storeId, packId, creditAmount } })
    → Write topups/{orderId} as pending
    → Return { order } to client
    ↓
Client: Opens Razorpay checkout modal (window.Razorpay)      [usePaymentHandler.ts:209]
    → User completes payment
    ↓
POST /api/razorpay/verify-topup                              [verify-topup/route.ts]
    → withAuth() → verifyTenantAccess() → canManageSubscription → Zod validation
    → Verify Razorpay checkout signature
    → Read topups/{orderId} for idempotency
    → razorpayClient.orders.fetch(order_id) → validate tenant/store notes and extract packId
    → razorpayClient.payments.fetch(payment_id) → auto-capture if authorized
    → Verify captured payment belongs to order_id
    → getActiveSubscriptionForStore(tenantId, storeId)
    → Find pack from aiEnhancementPacksList → get creditAmount
    → In one Firestore transaction: increment topUpCredits and mark topups/{orderId} paid
    → Return { success: true, newCreditBalance }
    ↓
Webhook: /api/razorpay/webhook                               [webhook/route.ts]
    → Signature verification → writeProductPaymentTransactionAudit() → writeLogEntry()
    → order.paid can settle the same immutable top-up exactly once
    → refund.processed reverses proportional purchased credits exactly once
    → consumed refunded credits become debt cleared by later Pack purchases
    → Handles payment failure and subscription lifecycle events
```

#### Files to ADAPT (Not Rewrite)

| File                                                             | Current Role                                   | What Changes for Enhancement Packs                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/data/PlatformPlansList.ts`                                  | Defines the one `aiEnhancementPacksList` authority | Keep pack amount and prices derived from `contentCreditPolicy.ts`                                      |
| `src/data/common.ts`                                             | Defines the final `AIEnhancementPack` interface | Keep exact owner-visible `creditAmount`; no compatibility alias                                          |
| `src/app/api/razorpay/create-topup-order/route.ts`               | Creates Razorpay order with exact server-owned pack data | Keep `creditAmount` in signed provider notes and reject client price/amount authority            |
| `src/app/api/razorpay/verify-topup/route.ts`                     | Verifies payment and settles the Pack exactly once | Keep the transaction-owned `topUpCredits` update and return the exact settled balance for local UI sync |
| `src/app/api/razorpay/webhook/route.ts`                          | Provider-authoritative settlement and refund lifecycle | Keep `refund.processed` as the only per-refund authority and delegate credit reversal to `topupSettlementServer.ts` |
| `src/hooks/usePaymentHandler.ts:147-217`                         | Client-side Razorpay checkout orchestration    | Change `name: 'MenuList.ai Credit Pack'` → `'MenuList.ai AI Enhancement Pack'`                            |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx` | Shows credit packs modal                       | Rename labels, remove credit amounts from display                                                         |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`   | Renders individual pack card                   | Remove `creditAmount` display, show outcome description instead                                           |

#### What Stays Exactly As-Is

| Component                                                 | Why No Changes                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Razorpay SDK client (`src/lib/razorpay/razorpay.ts`)      | SDK initialization is provider-level, not product-level                  |
| Razorpay order creation API                               | Same `razorpayClient.orders.create()` call, just different notes data    |
| Payment capture logic in `verify-topup`                   | Auto-capture flow is payment-provider logic, independent of product type |
| Webhook signature verification                            | Security layer, doesn't change with product type                         |
| Rate limiting (`PAYMENT_TOPUP`: 10/hr)                    | Same rate limit applies to enhancement pack purchases                    |
| Security patterns (`withAuth`, `verifyTenantAccess`, Zod) | Already compliant — no changes needed                                    |

---

## Frontend Billing Flow Analysis

### Architecture: Single Billing System (Razorpay Only)

Stripe was fully removed in Feb 2026. Razorpay is the only payment provider.
See `__docs__/razorpay/razorpay-payment-flow.md` for complete reference.

#### `billing/` folder (Razorpay — 11 files)

| File                                                  | Role                                         |
| ----------------------------------------------------- | -------------------------------------------- |
| `billing/index.tsx`                                   | Main billing page orchestrator               |
| `billing/ActiveSubscriptionCard.tsx`                  | Subscription details + **credit card panel** |
| `billing/CreditsPackModal.tsx`                        | Credit pack purchase modal                   |
| `billing/CreditPackCard.tsx`                          | Individual pack card                         |
| `billing/PricingPlansModal.tsx`                       | Upgrade/new plan selection modal             |
| `billing/BillingHistory.tsx`                          | Transaction history table                    |
| `billing/CancellationModal.tsx`                       | Subscription cancellation flow               |
| `billing/RemainingCreditNote.tsx`                     | Credit carryover note during upgrades        |
| `billing/UpgradeConfirmationModal.tsx`                | Upgrade confirmation                         |
| `billing/UpgradeSubscriptionPayementSuccessModal.tsx` | Post-upgrade success modal                   |
| `billing/NoSubscriptionView.tsx`                      | No-subscription gate (redirects to /billing) |

---

### Active Credit Purchase Flow (End-to-End Frontend)

```
BillingPage (billing/index.tsx)
    │
    ├── ActiveSubscriptionCard
    │       ├── Subscription details (plan, billing cycle, payment method)
    │       ├── Content Credit panel:
    │       │     ├── Usable total → recurring + valid promotional + purchased
    │       │     ├── Recurring balance and cycle allowance
    │       │     ├── Promotional balance and expiry when present
    │       │     ├── Purchased balance
    │       │     └── "Buy Content Credits" button → opens CreditsPackModal
    │       └── Action buttons (Upgrade, Cancel, etc.)
    │
    ├── CreditsPackModal
    │       ├── Title: "Buy Content Credits"
    │       └── Maps the single approved Pack → CreditPackCard
    │               ├── Shows 250 credits
    │               ├── Shows ₹799 / $29 before applicable tax
    │               └── onClick → handleCreditsPurchase(packId)
    │
    └── handleCreditsPurchase(packId)
            ├── Find pack from aiEnhancementPacksList
            ├── handleTopupPurchase(pack, currency)  [usePaymentHandler.ts]
            │       ├── POST /api/razorpay/create-topup-order
            │       ├── Open Razorpay checkout modal
            │       ├── On success: POST /api/razorpay/verify-topup
            │       └── Return success/failure
            ├── message.success('Content Credits added successfully.')
            ├── Show confetti animation
            └── Update local state: subscription.topUpCredits += pack.creditAmount
```

### Credit Visibility on Subscription Card

The `ActiveSubscriptionCard.tsx` is the primary owner balance surface. Desktop and mobile show the same usable total and bucket breakdown without exposing provider tokens, provider cost, or margin:

```typescript
const recurring = activeSubscription.monthlyCredits;
const promotional = getValidPromotionalCredits(activeSubscription, now);
const purchased = activeSubscription.topUpCredits;
const usable = recurring + promotional + purchased;
```

### Real-Time Balance Sync (Firebase Cost Optimization)

After every AI operation, the backend returns the updated `remainingBalance` in the API response. The frontend updates `activeSubscription` state via a CustomEvent, **eliminating an extra Firebase read per AI call**.

```
AI Service (e.g. generateImageViaApi)
    → fetch('/api/image-generation')
    → Backend: checkAICapacity (1 Firestore READ)
    → Backend: Gemini API call
    → Backend: reserveAiCapacity (transactional debit + hidden shell) before Gemini
    → Backend: finalizeAiOperationAccounting settles the same shell after valid output
    → Returns { billingStoreId, monthlyCredits, promotionalCredits,
                promotionalCreditsExpireAt, topUpCredits, usableCredits }
    → Backend: response includes remainingBalance
    ↓
Frontend service: syncBalanceFromResponse(responseJson)
    → Dispatches CustomEvent('ai-balance-update', { detail: remainingBalance })
    ↓
SessionProvider: event listener
    → setActiveSubscription(prev => { ...prev, ...detail })
    → UI reflects updated balance immediately
```

**Files involved:**

- `src/services/ai/balanceSync.ts` — dispatches CustomEvent
- `src/providers/sessionProvider.tsx` — listens for event, updates state
- `src/lib/ai/capacityCheck.ts` — reservation/settlement returns billing-store-scoped `RemainingBalance`
- Billable AI API routes — include `remainingBalance` in JSON response when credits are consumed
- Frontend AI services — call `syncBalanceFromResponse()` after parsing responses that include `remainingBalance`

**Firebase cost saved:** 1 Firestore read per AI operation (frontend no longer needs to re-fetch subscription after each AI call).

June 29 response-parsing note: frontend AI services now call `syncBalanceFromResponse()` only after parsing successful API responses through bounded response readers. Text, translation, and business-copy clients use 1MB caps, batch image trigger uses a 64KB acknowledgement cap, and image generation/editing use 24MB caps for base64 image payloads. Malformed, oversized, empty, or non-object successful responses log stable AI service diagnostics and fall back through the existing owner-safe behavior without adding Firestore reads.

July 12 billing-integrity note: description and translation actions are not trusted solely from browser payloads. Description generation upgrades `add_description` to `rewrite_description` when submitted validated items already contain copy. Translation retains explicit image/language actions and upgrades an underdeclared item action when the validated request covers multiple target languages or multiple menu entities. Business-copy and translation parse retries remain one owner operation, while internal usage/cost telemetry sums every successful provider call. Exact output validators run on both server and browser boundaries before generated data can merge into editor state.

### Monthly Credit Reset (Two-Layer)

`monthlyCredits` resets to `monthlyCreditsAllowance` at the start of each billing month via two complementary mechanisms:

**Layer 1 — Webhook (monthly plans):** `subscription.charged` event in `api/razorpay/webhook/route.ts` resets credits when Razorpay charges the next cycle.

**Layer 2 — Lazy reset (yearly plans + safety net):** `checkAICapacity()` in `src/lib/ai/capacityCheck.ts` checks `creditsLastResetMonth` against the current UTC billing period (YYYYMM key based on subscription anchor day, NOT calendar month). `reserveAiCapacity()` re-reads the subscription in its transaction, reprojects exact product plus agreeing tenant/store aliases, applies a due reset, validates period and all three balances against transaction-current truth, requires exact usable capacity, debits exact units, and writes the hidden shell before provider work. Anchor day is capped to days-in-month for month-end edge cases. Malformed periods, balances, expiry, or subscription identity fail closed rather than writing `NaN`, inventing a reset, or selecting one conflicting alias.

Subscription document refs use `src/lib/billing/subscriptionDocumentIdBoundary.ts` before lazy reset and consumption. Malformed subscription IDs cannot reach Firestore refs; paid consumption fails closed through the shared AI accounting finalizer.

**New field:** `creditsLastResetMonth?: number` on `FirestoreSubscriptionDoc`. Set by all subscription creation routes, webhook, and lazy reset. Old subscriptions without the field get reset on first AI call.

---

### Billing History Credit Exposure

The `billing/index.tsx:fetchBillingHistory()` transforms webhook events and exposes credits:

```typescript
// Line 86-94: Top-up history entry
type: "Credit Pack Purchase",
description: `Top-Up Credits for ${orderNotes?.packName}`,
creditsRe: orderNotes?.creditAmount
```

### Credit Transfer During Plan Replacement

Plan replacement transfers only owner-purchased credits and still-valid promotional credits. The replacement plan receives a fresh recurring allowance for its current cycle. Unused recurring credits and projected future annual-cycle allowances are never converted into purchased value. The owner confirmation copy states this boundary before checkout.

---

### Re-Architecture Plan (Confirmed: Not Live, 3-Year Freeze Applies)

> **User confirmed:** "im ready for rearchitecturing the credit purchase flow... since we are not live yet... it for 3 year freeze rule"

This means the entire credit-to-enhancement-pack rename can be done **cleanly at launch** without migration concerns. The 3-year freeze rule means: ship the full AI Enhancement Pack architecture from day one.

#### ActiveSubscriptionCard — Target State

The right-side credit card panel transforms from a credit counter to a simple AI status indicator:

**Current (violates doctrine):**

```
┌─────────────────────────┐
│ Total Available AI Credits   247 │
│ Monthly Credits  ████████ 150/200 │
│ Top-up Credits              97 │
│ [View Usage] [Buy More Credits] │
└─────────────────────────┘
```

**Target (doctrine-compliant):**

```
┌─────────────────────────┐
│ AI Features               Active │
│ Your plan includes AI enhancements │
│ for images, descriptions, and    │
│ translations.                    │
│ [Get AI Enhancements]            │
└─────────────────────────┘
```

**Behavior:**

- If usable balance is available, show the exact recurring, valid promotional, and purchased balances.
- If usable balance is exhausted, show the calm CTA "Get more enhancements".
- Keep provider cost, token counts, margin, and internal provider economics private.
- Admission and reservation remain server-authoritative; the UI balance is explanatory, not an authorization boundary.

#### CreditsPackModal + CreditPackCard — Target State

**Current contract:** one 250-credit Content Enhancement Pack with owner-readable outcome examples.

```
┌─────────────────────────┐
│ Content Enhancement Pack         │
│ 250 credits                     │
│ Up to 50 generated menu images  │
│ or 250 description rewrites     │
│ ₹799 before applicable tax      │
│ [Purchase]                      │
└─────────────────────────┘
```

#### Billing History — Target State

Top-up entries change from:

- `"Credit Pack Purchase"` → `"AI Enhancement Pack"`
- Show the Pack purchase as a Content Enhancement Pack transaction.
- Keep the exact credit amount visible; do not expose provider cost or margin.

#### RemainingCreditNote — Target State

Changes from showing credit math to simple reassurance:

- **Current:** "You have 247 credits of the current Pro Plan will be added into topup credits..."
- **Target:** "Your remaining plan value will transfer to your new plan, so you don't lose value."

---

## Existing Infrastructure Map

### Files That Already Exist (Modify Only)

| File                                                             | What It Does                                                    | What To Change                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/constants/common.ts:123-141`                                | AI action types + credit constants                              | Keep action registry aligned with `AI_UNIT_COSTS` and `GEMINI_COST_USD`                       |
| `src/constants/database.ts:9,16,90-98`                           | `MENULIST_AI_OPERATIONS`, `TOPUPS`, `AI_OPERATIONS_COLLECTIONS` | No changes needed — collections already defined                                               |
| `src/lib/ai/accounting.ts`                                       | Server-side accounting finalizer                                | Shared finalization for billable AI operation logs and credit consumption                     |
| `src/lib/ai/operationLog.ts`                                     | Admin SDK operation logger                                      | Server-only `menulistAiOperations/{tId}/{sId}` writes                                        |
| `src/database/aiOperations/index.tsx`                            | Client transaction-history reader                               | Read scoped operation history only; `addAiOperation()` is disabled                           |
| Billable AI API routes                                           | Paid provider work                                               | Reserve before provider, then call `finalizeAiOperationAccounting()` after valid output       |
| `src/lib/rateLimit/configs.ts:148-152`                           | `PAYMENT_TOPUP` rate limit (10/hr)                              | No changes needed                                                                             |
| `src/data/PlatformPlansList.ts`                                  | Canonical `aiEnhancementPacksList`                               | Keep the single Pack aligned with `contentCreditPolicy.ts`                                    |
| `src/data/common.ts`                                             | `AIEnhancementPack` interface                                   | Keep exact owner-visible Pack fields; do not restore compatibility aliases                    |
| `src/data/PlatformFeaturesList.ts`                               | Feature availability per plan                                   | Keep bounded "Included" language for metered AI features                                     |
| `src/app/api/razorpay/create-topup-order/route.ts`               | Creates Razorpay order for pack purchase                        | Update pack reference, notes data                                                             |
| `src/app/api/razorpay/verify-topup/route.ts`                     | Verifies payment and settles the Pack exactly once              | Keep transaction-owned `topUpCredits` settlement and bounded balance response               |
| `src/hooks/usePaymentHandler.ts`                                 | Client Razorpay checkout handler                                | Update product name label                                                                     |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx` | Pack selection modal                                            | Rename labels per doctrine                                                                    |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`   | Pack display card                                               | Show exact Pack amount and shared-policy outcome examples                                     |

### Files That Need To Be Created

| File                                       | Purpose                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `src/constants/AI/unitCosts.ts`            | Versioned `AI_UNIT_COSTS` and zero/paid action registry       |
| `src/lib/ai/capacityCheck.ts`              | `checkAICapacity()` server-side middleware                    |
| `src/app/api/ai-packs/status/route.ts`     | Check if store has capacity (returns `canRunAction: boolean`) |
| `src/components/common/AICapacityGate.tsx` | Client wrapper: shows calm upsell CTA when blocked            |

---

## Implementation Checklist

### Prerequisites (Before Week 1)

#### Task 0.1: Add System-Wide AI Enhancement Kill Switch

> **Source:** ChatGPT feedback point #4 (Feb 9, 2026 review)

**File:** `src/config/features.ts`

Add a system-wide kill switch for all AI enhancement operations. This is an **infrastructure survival control** — if Gemini pricing changes, a bug causes runaway usage, or someone scripts the API, this flag disables all paid AI operations instantly.

```typescript
// ═════════════════════════════════════════════════════════════════
// AI ENHANCEMENT PACKS (Cost Control)
// ═════════════════════════════════════════════════════════════════

/**
 * Master kill switch for ALL paid AI enhancement operations.
 *
 * When OFF:
 * - Free operations (extraction, base descriptions) continue working
 * - Paid operations (image gen, rewrites, translations) are disabled
 * - Calm message shown: "AI enhancements temporarily unavailable"
 * - No crash, no error — graceful degradation
 *
 * Use cases:
 * - Emergency: Gemini pricing spike or runaway API costs
 * - Abuse: Scripted API attack consuming credits
 * - Maintenance: Capacity system migration or recalibration
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 *
 * Production: Enable when capacity enforcement is ready
 * Emergency: Set to false to disable all paid AI operations instantly
 */
ENABLE_AI_ENHANCEMENTS: true,
```

**Integration pattern** (used in `checkAICapacity()`):

```typescript
import { FEATURE_FLAGS } from "@config/features";

if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS && !isFreeTierAction(actionType)) {
  return { allowed: false, reason: "maintenance", ... };
}
```

**Validation:**

- [ ] Flag added to `src/config/features.ts` following existing pattern
- [ ] Free operations (extraction, ADD_DESCRIPTION) return `reason: "free"` and remain unaffected when paid enhancements are OFF
- [ ] `checkAICapacity()` checks free actions before the paid-enhancement flag
- [ ] Client receives calm message, not error, when flag is OFF

---

#### Task 0.2: Enforce Exact Capacity

The discarded launch-buffer proposal is not part of the runtime contract. `checkAICapacity()` and `reserveAiCapacity()` require the full operation cost to be available across recurring, valid promotional, and purchased balances. Goodwill is granted explicitly as expiring promotional credits; balances never become negative.

**Validation:**

- [x] No overdraft constant or reason branch exists
- [x] Reservation requires exact usable capacity
- [x] Balances remain non-negative

---

### Week 1: Foundation (Internal Cost Tracking)

#### Task 1.1: Define AI Unit Costs

**File:** `src/constants/AI/unitCosts.ts` (NEW)

```typescript
import { AI_ACTIONS_TYPES } from "@constant/common";

/**
 * Internal AI Unit Costs
 *
 * Units are abstract — they do NOT map 1:1 to tokens, API calls, or dollars.
 * They normalize different AI operations to a single cost metric.
 *
 * CALIBRATION NOTE: These values need calibration against actual
 * Gemini API billing data. Current values are estimates.
 *
 * NEVER expose these values to customers.
 */
export const AI_UNIT_COSTS: Record<string, number> = {
  // Free operations (0 units)
  [AI_ACTIONS_TYPES.IMAGE_PROCESSING]: 0, // Core extraction — always free
  [AI_ACTIONS_TYPES.ADD_DESCRIPTION]: 0, // First-pass description — free
  [AI_ACTIONS_TYPES.NEW_ITEM_METADATA]: 0, // Structural — free

  // Paid operations (consumes units)
  [AI_ACTIONS_TYPES.REWRITE_DESCRIPTION]: 2, // ~500-2000 Gemini tokens
  [AI_ACTIONS_TYPES.IMAGE_GENERATION]: 5, // Gemini 2.5 Flash Image
  [AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION]: 5, // Per image in batch
  [AI_ACTIONS_TYPES.LANGUAGE_ADDITION]: 3, // Per language, Gemini 2.5 Flash
  [AI_ACTIONS_TYPES.ITEM_TRANSLATION]: 1, // Per item translation
  [AI_ACTIONS_TYPES.IMAGE_TRANSLATION]: 4, // OCR + translation + regen
};

/**
 * Check if an AI action is free (0 units)
 */
export function isFreeTierAction(actionType: string): boolean {
  return (AI_UNIT_COSTS[actionType] ?? 0) === 0;
}

/**
 * Get unit cost for an AI action
 */
export function getUnitCost(actionType: string): number {
  return AI_UNIT_COSTS[actionType] ?? 0;
}
```

**Validation:**

- [ ] All `AI_ACTIONS_TYPES` values have a corresponding unit cost
- [ ] Free operations return 0
- [ ] Values calibrated against Gemini billing (OPEN: needs founder input)

---

#### Task 1.2: Server-Side Accounting Finalization

Current billable AI routes call `reserveAiCapacity()` before provider work and pass that exact reservation to `finalizeAiOperationAccounting()` after a usable provider result. Finalization atomically replaces the hidden `reserved` shell with the normal `consumed` operation row. The route refunds an unsettled reservation in `finally`; durable batch workers retain it only while transaction-current staged work can retry. Failure settlement also reports that staged-media ownership explicitly, so an ambiguous stage acknowledgement cannot cause route-local Storage cleanup to delete the authoritative retry payload.

```typescript
let capacityReservation = await reserveAiCapacity({
  action,
  operationId,
  session,
  subscription: capacityCheck.subscription,
  unitsToReserve: capacityCheck.unitsRequired,
});

const accounting = await finalizeAiOperationAccounting({
  capacityReservation,
  capacitySubscription: capacityCheck.subscription,
  context: { userId, projectId, action },
  input: transactionObject,
  logLabel: 'Description generation',
  session,
});

transactionObject.unitsConsumed = accounting.unitsConsumed;
transactionObject.transactionId = accounting.transactionId;
remainingBalance = accounting.remainingBalance;
capacityReservation = null;
```

For Cloud Task workers without a browser session, reserve with explicit validated `tId` and `sId`, then pass those fields in the operation input and omit `session`. The deterministic job/item operation ID lets redelivery replay the same reservation and settlement. Paid operation settlement is mandatory; local diagnostic logging remains best-effort and bounded.

**Validation:**

- [x] Billable routes use `finalizeAiOperationAccounting()`
- [x] Transaction objects include `unitsConsumed`
- [x] Batch worker passes tenant/store scope directly
- [x] Free/internal operations log 0 units only when explicitly configured
- [x] Client response structure still includes `transaction` and `remainingBalance` where applicable

---

#### Task 1.3: Disable Client Operation Writes

**File:** `src/database/aiOperations/index.tsx`

The browser DAL remains for paginated transaction-history reads. `addAiOperation()` is intentionally disabled and Firestore rules deny client writes to `menulistAiOperations/{tId}/{sId}`. New AI routes must use the server accounting finalizer instead. `src/lib/ai/operationHistoryClientContract.ts` now supplies the runtime-validated `AiOperationHistoryRow`/page DTO used by desktop, mobile, and Answerlattice consumers; it replaces the former optional untyped interface idea. The MenuList DAL applies no-store/same-origin/manual-redirect policy and exposes only the maintained paginated reader.

**Validation:**

- [x] Browser history responses are bounded and runtime-projected before state
- [x] Browser request policy is no-store, same-origin, and manual-redirect
- [x] Client writes remain disabled; server finalization owns `menulistAiOperations/{tId}/{sId}` writes

---

### Week 2: Capacity Enforcement

#### Task 2.1: AI Capacity Check & Consumption (Using Existing Subscription Credits)

> **Architecture Decision: Per-Store, On Subscription (VALIDATED)**
>
> Capacity lives on the effective billing subscription document. `monthlyCredits` is recurring, `promotionalCredits` is an expiring goodwill/referral bucket, and `topUpCredits` is purchased value. A server-only recovery ledger protects unused purchased value across cancellation and qualifying reactivation.
>
> **Why NOT per-tenant:**
>
> 1. Subscriptions are per-store (`getActiveSubscriptionForStore(tId, sId)`)
> 2. AI operations log to per-store path (`menulistAiOperations/{tId}/{sId}`)
> 3. Projects are per-store (`projectsMetadata/{tId}/{sId}`)
> 4. Top-ups write to per-store subscription (`subscription.topUpCredits`)
> 5. Multi-chain: each store has its own subscription and should manage capacity independently
> 6. Moving to per-tenant would create scope mismatch, cross-store drain, and race conditions
>
> **Founder rationale:** Local outlets use AI credits only for overridden/local data (their choice, not master's). Local items only benefit that outlet — no other outlet gets value. Per-store capacity ensures each outlet pays for its own work.
>
> **Full multi-outlet scenarios:** See spec doc → "Multi-Outlet Pack Logic (Detailed)"

**Implemented boundary:** capacity reads and mutations use the server-only subscription DAL and the transaction-owned accounting helpers in `src/lib/ai/capacityCheck.ts`. Browser subscription code is read-only. Every current subscription must carry both exact `ML` aliases before credits can be reserved, consumed, refunded, or recovered.

**Capacity model:**

```
Usable capacity = recurring + valid promotional + purchased
```

**Consumption order:**

1. Decrement `monthlyCredits` first (resets each billing cycle)
2. Decrement valid, unexpired `promotionalCredits` second
3. Decrement purchased `topUpCredits` last
4. Reject the operation if the exact cost is not available

**Helper function** (add to `src/lib/ai/capacityCheck.ts` — NEW file):

The maintained implementation transactionally reserves capacity before provider work, then settles or refunds the same durable operation. The transaction re-reads the exact subscription, validates exact product and tenant/store ownership, expires stale promotional value, and debits recurring, promotional, then purchased credits. It does not rely on a stale caller-provided subscription balance or a browser merge write.

**Validation:**

- [x] Uses the server-only, transaction-owned capacity boundary
- [x] Requires exact dual-`ML` subscription identity and tenant/store scope
- [x] Decrements recurring, valid promotional, then purchased credits
- [x] Uses durable operation reservation/settlement for replay and recovery
- [x] Per-store scoped (subscription is per-store)

---

#### Task 2.2: Create Capacity Check Middleware

**File:** `src/lib/ai/capacityCheck.ts` (same file as consumeAICapacity above)

Server-side capacity enforcement function used by all paid AI routes. Uses the store's active subscription to check available credits.

```typescript
import { getActiveSubscriptionForStore } from "@database/subscriptions";
import { isFreeTierAction, getUnitCost } from "@constant/AI/unitCosts";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { FEATURE_FLAGS } from "@config/features";

interface CapacityCheckResult {
  allowed: boolean;
  unitsRequired: number;
  remaining: number;
  reason?:
    | "free"
    | "sufficient"
    | "exhausted"
    | "maintenance"
    | "no_subscription";
  subscription: FirestoreSubscriptionDoc | null; // Pass to consumeAICapacity after success
}

/**
 * Check if a store's subscription has sufficient AI capacity for an action.
 *
 * Checks in order:
 * 1. Kill switch (ENABLE_AI_ENHANCEMENTS) — if OFF, block paid actions
 * 2. Free tier check — free actions always pass
 * 3. Subscription lookup — per-store
 * 4. Exact capacity check across recurring, valid promotional, and purchased buckets
 *
 * IMPORTANT: This check happens BEFORE the Gemini API call.
 * If capacity is insufficient, the API call is never made.
 *
 * @param tenantId - Tenant ID from session
 * @param storeId - Store ID from session (capacity is per-store)
 * @param actionType - AI_ACTIONS_TYPES value
 * @param quantity - Number of items (for batch operations)
 */
export async function checkAICapacity(
  tenantId: number,
  storeId: number,
  actionType: string,
  quantity: number = 1,
): Promise<CapacityCheckResult> {
  // Free actions always allowed (even when kill switch is OFF)
  if (isFreeTierAction(actionType)) {
    return {
      allowed: true,
      unitsRequired: 0,
      remaining: Infinity,
      reason: "free",
      subscription: null,
    };
  }

  // Kill switch check — block all paid operations when OFF
  if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS) {
    return {
      allowed: false,
      unitsRequired: 0,
      remaining: 0,
      reason: "maintenance",
      subscription: null,
    };
  }

  const unitsRequired = getUnitCost(actionType) * quantity;
  const subscription = await getActiveSubscriptionForStore(tenantId, storeId);

  if (!subscription) {
    return {
      allowed: false,
      unitsRequired,
      remaining: 0,
      reason: "no_subscription",
      subscription: null,
    };
  }

  const remaining = getUsableContentCredits(subscription, new Date());

  return {
    allowed: remaining >= unitsRequired,
    unitsRequired,
    remaining,
    reason: remaining >= unitsRequired ? "sufficient" : "exhausted",
    subscription,
  };
}
```

**Integration Pattern (per AI route):**

```typescript
// At the top of each paid AI route, after withAuth():
const capacityCheck = await checkAICapacity(
  session.user.tenantId,
  session.user.storeId,
  actionType,
  quantity,
);
if (!capacityCheck.allowed) {
  return NextResponse.json(
    {
      success: false,
      blocked: true,
      reason: "capacity_exhausted", // Internal only — client maps to CTA
    },
    { status: 402 },
  );
}

// ... proceed with Gemini API call ...

// After successful operation, decrement from subscription credits:
await consumeAICapacity(
  capacityCheck.subscription,
  capacityCheck.unitsRequired,
);
```

**Critical:** Capacity is consumed AFTER successful Gemini call, not before. This avoids deducting units for failed operations. The subscription object from the check is reused for the consume call to avoid a second Firestore read.

---

#### Task 2.3: Wire Capacity Check Into All 6 API Routes

Each paid AI route gets the same enforcement pattern:

| Route                                        | Action Type              | Quantity Logic             |
| -------------------------------------------- | ------------------------ | -------------------------- |
| `business-copy/route.ts`                     | `BUSINESS_COPY_GENERATION` | 1 per call               |
| `campaigns/caption/route.ts`                 | `CAMPAIGN_CAPTION`       | 1 per call                 |
| `descriptions/route.ts`                      | `REWRITE_DESCRIPTION`    | 1 per call                 |
| `image-generation/route.ts`                  | `IMAGE_GENERATION`       | 1 per call                 |
| `image-generation/batch-generation/route.ts` | `BATCH_IMAGE_GENERATION` | `items.length`             |
| `image-generation/batch-trigger/route.ts`    | `BATCH_IMAGE_GENERATION` | Estimated batch quantity before worker enqueue |
| `image-editing/route.ts`                     | `IMAGE_GENERATION`       | 1 per call                 |
| `menu-card-export/design-advisor/route.ts`   | `MENU_CARD_EXPORT_DESIGN_ADVISOR` | 1 per call       |
| `seo/route.ts`                               | `SEO_AEO_GENERATION`     | 1 per call                 |
| `translations/route.ts`                      | Server-derived `ITEM_TRANSLATION`, `LANGUAGE_ADDITION`, or `IMAGE_TRANSLATION` | Minimum safe action from requested action, target-language count, and menu-entity scope |
| `new-item-metadata/route.ts`                 | `NEW_ITEM_METADATA`      | 0 (free) — allowed by free short-circuit |

**Note:** Menu extraction (`IMAGE_PROCESSING`) is always free for owner-pack usage. Extraction jobs still keep internal token/cost audit telemetry, but they stamp `unitsConsumed: 0` and never call owner credit consumption.

**Validation:**

- [ ] All paid routes check capacity before Gemini call
- [x] Current paid routes reserve capacity before Gemini and settle/refund the exact reservation
- [ ] Free actions (`IMAGE_PROCESSING`, `ADD_DESCRIPTION`, `NEW_ITEM_METADATA`) return `unitsRequired: 0` and do not require subscription balance
- [ ] Batch operations multiply by quantity
- [ ] 402 response triggers upsell CTA on client (not error message)

---

### Week 3: Pack Purchase Flow (Adapt Existing Razorpay Top-Up)

> **NOTE:** The Razorpay payment flow rework is handled separately. This section documents the TARGET state for when that rework happens. The existing `create-topup-order` → `verify-topup` flow is the foundation — it gets adapted, not replaced.

#### Task 3.1: Rename Data Structures

**File:** `src/data/common.ts` (MODIFY)

Final type:

```typescript
export interface AIEnhancementPack {
  packId: string;
  name: string;
  creditAmount: number;
  priceINR: Price;
  priceUSD: Price;
}
```

**File:** `src/data/PlatformPlansList.ts` (MODIFY)

Final commercial list:

```typescript
const aiEnhancementPacksList: AIEnhancementPack[] = [
  {
    packId: "enhancement",
    name: "Content Enhancement Pack",
    description: "More generated images, descriptions, and translations for your menu.",
    creditAmount: 250,
    priceINR: { price: 79900, monthlyCredits: null },
    priceUSD: { price: 2900, monthlyCredits: null },
  },
];
```

There is one final pack list and no dormant tier flag or compatibility export.

#### Task 3.2: Adapt Razorpay Top-Up Order Route

**File:** `src/app/api/razorpay/create-topup-order/route.ts` (MODIFY)

Key changes (handled during Razorpay flow rework):

1. Resolve `aiEnhancementPacksList` on the server.
2. Pass the exact `creditAmount` in Razorpay order notes.
3. Error message: "Enhancement pack not found" instead of "Credit pack not found"

```typescript
// Line 87: Change pack lookup
const selectedPack = aiEnhancementPacksList.find((p) => p.packId === packId);
if (!selectedPack) {
  return NextResponse.json(
    { error: "Enhancement pack not found." },
    { status: 404 },
  );
}

// Line 100-113: Update Razorpay order notes
const razorpayOrder = await razorpayClient.orders.create({
  amount: price,
  currency,
  notes: {
    tenantId,
    storeId,
    userId,
    packId,
    creditAmount: selectedPack.creditAmount,
    packName: selectedPack.name,
    price: price,
    currency,
  },
});
```

#### Task 3.3: Adapt Razorpay Verify-Topup Route

**File:** `src/app/api/razorpay/verify-topup/route.ts` (MODIFY)

Key changes:

1. Resolve `aiEnhancementPacksList` on the server.
2. Use the exact server-owned `creditAmount` for settlement.
3. **Keep writing to `subscription.topUpCredits`** (per-store, existing behavior)
4. Return the exact settled purchased balance so the matching billing UI can sync without another read.

```typescript
// Line 123: Change pack lookup
const selectedPack = aiEnhancementPacksList.find((p) => p.packId === packId);
if (!selectedPack) {
  return NextResponse.json(
    { success: false, error: "Invalid enhancement pack." },
    { status: 400 },
  );
}
const unitsToAdd = selectedPack.creditAmount;

const settlement = await resolveVerifiedTopupSettlement({
  creditAmount: unitsToAdd,
  // provider and subscription identity omitted here; see current route source
});
return NextResponse.json({ success: true, newCreditBalance: settlement.newBalance });
```

#### Task 3.4: Adapt Client Payment Handler

**File:** `src/hooks/usePaymentHandler.ts` (MODIFY)

```typescript
// Line 173: Change product name shown in Razorpay checkout
const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  order_id: order.id,
  name: "MenuList.ai AI Enhancement Pack", // was: 'MenuList.ai Credit Pack'
  description: pack.name, // Uses pack.name (doctrine-compliant)
  // ... rest stays the same
};
```

#### Task 3.5: Create Pack Status API Route

**File:** `src/app/api/ai-packs/status/route.ts` (NEW)

Simple route that returns whether the current store's subscription has capacity for AI actions. Client uses this to pre-check before showing AI action buttons.

```typescript
// Response shape (NEVER includes unit counts):
{
    canRunActions: true,      // Has capacity
    packAvailable: true,      // Enhancement pack exists for purchase
}
```

---

### Week 4: Client-Side UX

#### Task 4.1: Create AI Capacity Gate Component

**File:** `src/components/common/AICapacityGate.tsx` (NEW)

Wrapper component that checks capacity before rendering AI action buttons. If blocked, shows calm upsell CTA instead.

```typescript
interface AICapacityGateProps {
  children: React.ReactNode;
  actionType: string;
  quantity?: number;
}
```

**Behavior:**

- Capacity available → Render children normally (action buttons)
- Capacity exhausted → Render calm CTA: "Get more AI enhancements for your menu"
- CTA click → Redirect to pack purchase page
- No error messages, no "ran out", no "insufficient credits"

#### Task 4.2: Integrate Gate Into Existing AI Surfaces

| Surface                  | File                                                                  | What Changes                            |
| ------------------------ | --------------------------------------------------------------------- | --------------------------------------- |
| Description regeneration | `src/components/templates/main-app/projects/editor/`                  | Wrap regen button with `AICapacityGate` |
| Image generation         | `src/components/templates/main-app/projects/editor/ImageUploadModal/` | Wrap generate button                    |
| Batch image generation   | `src/components/templates/main-app/projects/editor/`                  | Wrap batch generate trigger             |
| Translation              | `src/components/templates/main-app/projects/editor/`                  | Wrap add language trigger               |
| Image editing            | `src/components/templates/main-app/projects/editor/`                  | Wrap edit button                        |

#### Task 4.3: Handle 402 Response in API Calls

Update existing API call error handling to recognize `{ blocked: true }` responses:

```typescript
// In existing API call patterns:
if (response.status === 402 && data.blocked) {
  // Show calm upsell CTA — NOT an error notification
  showPackUpsell(); // Custom function, not notification.error()
  return;
}
```

---

### Feature Flags (3-Year Freeze Compliance)

**File:** `src/config/features.ts` (MODIFY)

```typescript
/**
 * AI Enhancement Packs
 *
 * Controls AI capacity enforcement and pack purchasing.
 * Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_spec.md
 */
ENABLE_AI_ENHANCEMENT_PACKS: true,    // Master toggle for capacity enforcement

/**
 * Pack Tier Mode
 *
 * "single": One pack, one price (launch mode)
 * "tiered": Multiple pack tiers (future, data flag only)
 */
AI_PACK_TIER_MODE: "single" as "single" | "tiered",

/**
 * AI Outcome Report
 *
 * Customer-facing activity report showing what changed (not consumption).
 * false: Disabled at launch
 * true: Show outcome reports
 */
AI_OUTCOME_REPORT: false,

/**
 * AI Admin Dashboard
 *
 * Internal margin reporting for founder.
 * false: Disabled at launch
 * true: Show admin AI cost dashboard
 */
AI_ADMIN_DASHBOARD: false,
```

---

## Security Checklist

| Requirement                                           | Implementation                               | Status |
| ----------------------------------------------------- | -------------------------------------------- | ------ |
| `withAuth()` on all owner AI routes                   | Required on authenticated owner AI routes    | ✅     |
| Store-role permission on protected owner AI routes    | Route-specific role guard before capacity/provider/task/accounting work | ✅     |
| `withAuth()` on pack purchase route                   | `create-topup-order/route.ts`                | ✅     |
| `withAuth()` on pack status route                     | `GET /api/ai-packs/status`                   | ✅     |
| Zod validation on pack purchase input                 | `validateAPIInput()` in create-topup-order   | ✅     |
| Rate limit on pack purchase                           | `PAYMENT_TOPUP` (10/hr) — already configured | ✅     |
| Capacity check server-side only                       | `checkAICapacity()` in billable AI routes    | ✅     |
| Scoped remaining balance in owner responses           | Exact billing-store response boundary        | ✅     |
| Sanitized server writes                               | Admin operation logger sanitizes AI payloads | ✅     |
| Firestore rules: deny client reads on capacity fields | Not possible in Firestore (field-level)      | N/A    |
| Razorpay webhook signature verification               | Already done in `webhook/route.ts`           | ✅     |
| Store isolation on capacity                           | Per-store subscription fields — verified     | ✅     |
| Owner credit visibility                               | Recurring, valid promotional, purchased, total | ✅   |

**Owner balance contract:** Paid AI routes return `remainingBalance` (`{ billingStoreId, monthlyCredits, promotionalCredits, topUpCredits }`) through authenticated responses. `balanceSync.ts` validates exact safe-integer scalars and the effective billing-store scope before updating `activeSubscription`, avoiding one extra Firestore read per operation. Desktop and mobile Billing show recurring, valid promotional, purchased, and total usable credits; provider token/cost telemetry and reservation internals remain server-only.

---

## Validation Report

| Check                                    | Expected                   | Evidence                                          | Status |
| ---------------------------------------- | -------------------------- | ------------------------------------------------- | ------ |
| AI action types defined                  | Current registry           | `src/constants/common.ts`                         | ✅     |
| AI model configs centralized             | 9 operations               | `src/constants/AI/models.ts:59-219`               | ✅     |
| Server accounting finalizer exists       | Functional                 | `src/lib/ai/accounting.ts`                        | ✅     |
| Client AI operation writes disabled      | Server/Admin writes only   | `src/database/aiOperations/index.tsx`, `firestore.rules` | ✅     |
| `TOPUPS` collection defined              | In DB_COLLECTIONS          | `src/constants/database.ts:16`                    | ✅     |
| `PAYMENT_TOPUP` rate limit               | 10/hr                      | `src/lib/rateLimit/configs.ts:148-152`            | ✅     |
| Razorpay billing infrastructure          | Full CRUD                  | `src/app/api/razorpay/`                           | ✅     |
| Transactions UI                          | Built                      | `src/components/templates/main-app/transactions/` | ✅     |
| `TOKENS_PER_CREDIT` constant             | 500                        | `src/constants/common.ts:138`                     | ✅     |
| `CHARGE_PER_CREDIT` constant             | 100 (paise)                | `src/constants/common.ts:139`                     | ✅     |
| Multi-tenant log pattern                 | `{collection}/{tId}/{sId}` | `src/lib/ai/operationLog.ts`                      | ✅     |
| Admin SDK operation writes               | Server-only timestamps     | `src/lib/ai/operationLog.ts`                      | ✅     |
| Verification script                      | Accounting regression guard | `npm run verify:ai-accounting`                   | ✅     |

---

## Testing Guide

### Manual Test: Usage Event Logging

1. Open any project in the editor
2. Trigger a description rewrite
3. Check Firestore: `menulistAiOperations/{tId}/{sId}` should have a new document
4. Verify document contains: `action`, `unitsConsumed`, `totalTokenCount`, `processingTime`, `model`
5. Verify `requestBodyComposer` added: `sId`, `tId`, `uId`, `createdOn`, `updatedOn`
6. Open Transactions page → verify the operation appears

### Manual Test: Capacity Enforcement

1. Find the store's active subscription document in Firestore
2. Set `monthlyCredits` to 1 and `topUpCredits` to 0
3. Trigger image generation (costs 5 units) → should be blocked (remaining: 1 < 5)
4. Verify 402 response with `{ blocked: true }`
5. Verify client shows calm CTA, NOT error notification
6. Trigger description rewrite (costs 2 units) → should also be blocked (remaining: 1 < 2)
7. Set `monthlyCredits` to 10 → retry → should succeed
8. Verify `monthlyCredits` was decremented after the operation

### Manual Test: Pack Purchase

1. Click upsell CTA → verify Razorpay checkout opens
2. Complete purchase with test card/UPI
3. Verify `verify-topup` increments `subscription.topUpCredits`
4. Verify purchase record in `topups` collection
5. Retry blocked AI action → should succeed now

### Manual Test: Free Operations

1. Set subscription `monthlyCredits` to 0 and `topUpCredits` to 0 (zero capacity)
2. Upload a new menu image → extraction should succeed (free)
3. Generate first-pass descriptions → should succeed (free)
4. Trigger description REWRITE → should be blocked (paid)

---

## Progress Tracking

| Task                                                | Week | Status | Notes                                                      |
| --------------------------------------------------- | ---- | ------ | ---------------------------------------------------------- |
| Define `AI_UNIT_COSTS` config                       | 1    | ✅     | `src/constants/AI/unitCosts.ts` — built                    |
| Server-side accounting finalizer                    | 1    | ✅     | Billable routes use `finalizeAiOperationAccounting()`      |
| Add `unitsConsumed` to transaction objects          | 1    | ✅     | Via fail-closed `getUnitCost()` lookup                     |
| Create capacity check + consume helpers             | 2    | ✅     | `src/lib/ai/capacityCheck.ts` — built                      |
| Create `checkAICapacity()` middleware               | 2    | ✅     | Server-side enforcement — built                            |
| Wire capacity check into billable routes            | 2    | ✅     | Paid routes enforce capacity before provider work          |
| Add feature flags                                   | 2    | ✅     | `ENABLE_AI_ENHANCEMENTS` in `features.ts`                  |
| Final `AIEnhancementPack` type                      | 3    | ✅     | `common.ts` + all consumers; no compatibility alias        |
| Final `aiEnhancementPacksList` authority            | 3    | ✅     | `PlatformPlansList.ts` + consumers; no compatibility alias |
| Adapt `create-topup-order` route                    | 3    | ✅     | Already uses `aiEnhancementPacksList`                      |
| Adapt `verify-topup` route                          | 3    | ✅     | Already uses `aiEnhancementPacksList`                      |
| Adapt `usePaymentHandler.ts` labels                 | 3    | ✅     | "AI Enhancement Pack" in Razorpay checkout (Session 14)    |
| Create pack status API route                        | 3    | ✅     | `GET /api/ai-packs/status` — boolean only (Session 14b)    |
| Change "Unlimited" to "Included" in feature list    | 3    | ✅     | B2C + B2B features updated (Session 14b)                   |
| Re-architect `ActiveSubscriptionCard` credit panel  | 4    | ✅     | AI Features status card, no credit numbers (Session 14)    |
| Re-architect `CreditsPackModal` → single pack modal | 4    | ✅     | Already uses `aiEnhancementPacksList`, outcome labels      |
| Re-architect `CreditPackCard` → pack card           | 4    | ✅     | Shows 250 credits plus exact outcome examples from shared policy |
| Re-architect `RemainingCreditNote`                  | 4    | ✅     | "Your remaining value transfers" — no credit math (S14)    |
| Update `billing/index.tsx` billing history labels   | 4    | ✅     | "AI Enhancement Pack" in history (Session 14)              |
| Update `billing/index.tsx` success messages         | 4    | ✅     | "AI enhancements are ready!" (Session 14)                  |
| Create `AICapacityGate` component                   | 4    | ✅     | `src/components/common/AICapacityGate.tsx` (Session 14b)   |
| Integrate gate into editor surfaces                 | 4    | ✅     | 6 surfaces wired — full 402 pipeline fix (Session 14c)     |
| Handle 402 response in API calls                    | 4    | ✅     | `src/services/ai/capacityError.ts` — already built         |
| Security audit (all routes)                         | 5    | ✅     | See audit findings below (Session 14b)                     |
| Update Firestore security rules                     | 5    | ✅     | Documented: field-level restriction not possible (S14b)    |
| Update website `CreditPacksCtaSection`              | 4    | ✅     | AIEnhancementPack + doctrine-compliant labels (Session 14) |
| Update website `CreditPackCard`                     | 4    | ✅     | AIEnhancementPack, amount and shared-policy outcome examples |
| Update website `SubscriptionManagement`             | 4    | ✅     | AI Features status, no credit numbers (Session 14)         |
| Update `MobileBillingScreen`                        | 4    | ✅     | AI Features status, doctrine-compliant labels (Session 14) |

> **3-Year Freeze Rule:** User confirmed not live yet. Full re-architecture ships at launch. No migration or backward compatibility needed.

---

## May 2026 Runtime Audit — Billing and Enhancement Pack Contract

### Desktop Billing

Desktop billing remains the deepest owner surface:

1. `src/components/templates/main-app/billing/index.tsx` resolves the selected billing store from `activeStoreContext`, `storeDetails.storeId`, or `session.user.storeId`.
2. `getActiveSubscriptionForStore(tenantId, selectedStoreId, tenantDetails.storesList)` returns the selected store subscription or the HQ subscription for outlet stores.
3. Billing history uses the effective subscription store (`activeSubscription.storeId`) so outlet views do not query an empty outlet ledger when billing is inherited.
4. Enhancement-pack purchase still uses `usePaymentHandler.handleTopupPurchase()` and updates local `activeSubscription.topUpCredits` from the verified server balance when available.
5. If the selected outlet inherits HQ billing, the desktop page explicitly tells the owner that plan changes, retries, and enhancement packs apply to HQ.

### Mobile Billing

Mobile billing now mirrors the same contract in `src/components/mobile/screens/MobileBillingScreen.tsx`:

1. Store picker is available for HQ users with `canSwitchStores`.
2. Monthly and yearly plan choices are available in the mobile plan sheet.
3. Enhancement packs are purchased directly on mobile through the same Razorpay top-up handler.
4. Billing history reads from the effective subscription store, matching desktop and multi-outlet billing inheritance.
5. Mobile hides Billing and Transactions from users without `canAccessBilling`.

### Enhancement Pack Server Flow

The verified top-up flow is now audit-complete and idempotent:

```
POST /api/razorpay/create-topup-order
    -> withAuth + tenant access + canManageSubscription + PAYMENT_TOPUP rate limit
    -> Zod validates packId + currency
    -> Razorpay order is created with tenantId, storeId, packId, creditAmount
    -> topups/{orderId} is written as status="pending" after topupDocumentIdBoundary validation

POST /api/razorpay/verify-topup
    -> withAuth + tenant access + canManageSubscription
    -> Zod validates razorpay_payment_id + razorpay_order_id + razorpay_signature
    -> Razorpay checkout signature is verified server-side
    -> normalize checkout order ID through topupDocumentIdBoundary
    -> if topups/{orderId} is already paid, return without adding credits again
    -> payment is captured/verified with Razorpay
    -> Razorpay order tenant/store notes must match the session tenant/store
    -> active subscription is resolved through getActiveSubscriptionForStore()
    -> topUpCredits is incremented once in a Firestore transaction
    -> topups/{orderId} is marked status="paid" with providerPaymentId in the same transaction
```

This keeps `subscriptions.topUpCredits` as the fast balance and `topups` as the financial audit record.

### AI Usage and Balance Consumption

The runtime credit contract is:

1. `monthlyCreditsAllowance` is the plan allowance for the billing period.
2. `monthlyCredits` is the current recurring balance and resets to `monthlyCreditsAllowance` at renewal.
3. `topUpCredits` is purchased enhancement-pack balance and does not reset.
4. Paid AI routes call `checkAICapacity()` and then `reserveAiCapacity()` before the provider request. Admission alone is not a debit guarantee; the reservation transaction is the concurrency authority.
5. A successful request calls `finalizeAiOperationAccounting()` with the exact reservation. Settlement promotes the reservation shell into the normal operation row without a second debit. A failed request calls the idempotent refund path, which restores the exact recurring/top-up buckets charged by that reservation.
6. Lazy monthly reset, reservation, settlement, and refund use Firestore transactions so concurrent requests, renewal, retry, and compensation cannot overwrite each other.
7. AI responses return `remainingBalance`; desktop and mobile owner UI listen through `syncBalanceFromResponse()` and update `activeSubscription` without an extra Firestore read.
8. Campaign caption generation is included as `AI_ACTIONS_TYPES.CAMPAIGN_CAPTION` with a 1-unit cost and the same reservation/accounting path.
9. Batch image generation worker calls are guarded by the Cloud Tasks project header before they run provider work. Their deterministic operation ID retains a durable reservation only while staged work remains retryable; terminal/max-attempt acknowledgement recovers an unsettled reservation.
10. Batch image trigger admission fails closed with `503` and `Retry-After` when its rate-limit provider or strict helper fails; this happens before request-body parsing, permission/capacity reads, or Cloud Tasks fanout. Caller quota exhaustion remains `429`.
11. Every persisted credit scalar used for admission, replay, debit, settlement, refund, or stale-reservation recovery must be an exact JavaScript safe integer in its permitted range. Numeric strings, fractions, non-finite values, unsafe totals, and invalid billing-period keys fail closed; app and Functions use the byte-identical contract in `src/data/shared/aiCreditScalarContract.ts` and `functions/src/sharedData/aiCreditScalarContract.ts`.
12. The shared finalizer applies that exact contract to caller units and historical/free operation replay before returning balances. Browser `remainingBalance` synchronization also accepts only exact numeric values, revalidates direct custom-event payloads, and updates state only when the active subscription is exact dual-`ML` truth for the returned billing store.
13. Operation-log projection never converts provider/caller scalar types. Token counts, unit counts, per-credit constants, paise costs, margins, total credits, and total charge pass explicit integer/finite/range admission before persistence; string counts are omitted from compact response summaries rather than rendered as numeric facts.
14. Operation-log persistence accepts only an omitted product (the backward-compatible MenuList default), exact `ML`, or exact `AL`. Tenant/store path segments must be canonical paired nonnegative safe integers; only MenuList may use the paired platform `0/0` scope. Answerlattice requires positive workspace scope and its configured Admin datastore. An unavailable Answerlattice runtime, unsupported explicit product, partial scope, leading-zero/whitespace ID, or mixed platform/tenant pair fails before any write instead of falling back into the MenuList ledger.
15. Session-backed operation writes resolve all supplied top-level, nested-user, and explicit operation product/tenant/store/user aliases as one agreement set. Numeric/string canonical scope representations may agree, but conflicting aliases, malformed IDs, mismatched actors, partial workspace identity, or product disagreement reject the operation log before path selection. Explicit operation input cannot override a conflicting authenticated session.
16. Accounting-only `clientResponse` summaries use an exact registry of legitimate MenuList and Answerlattice summary kinds. Every kind has an exact scalar/nested-key contract; unknown markers, extra keys, numeric strings, invalid booleans/ratings, oversized labels, and nested payload additions fall back to generic shape/count metadata without copying the submitted object. Answer-test accounting records only provider-operation count, not the operation-name array.
17. The operation document itself is a closed projection: `AiOperationLogInput` has no open string index and `buildAiOperationLog()` never spreads caller input. Only declared identity, accounting, bounded string/ID, exact byte/duration, token-source, compact response and provider-usage fields survive. Request-derived business type, review length/rating, design source hash, generation config, item summaries, raw provider fields and any future accidental extras are omitted. The server always owns `createdOn`; detailed retention must be a positive safe integer no greater than ten years.

---

## Admin Dashboard Backlog (Future)

> **Source:** ChatGPT feedback review (Feb 10, 2026) — classified as IMPROVE

### Priority Metric: AI Cost % of Revenue (Global)

```
Monthly: total_ai_cost / total_subscription_revenue
```

| Range  | Status                                                  |
| ------ | ------------------------------------------------------- |
| <10%   | Excellent — AI costs well within margins                |
| 10–20% | Fine — monitor trends                                   |
| >25%   | Investigate — check for abuse or pricing miscalibration |

**Data infrastructure already exists:**

- Each AI operation doc has: `realCostPaise`, `ourChargePaise`, `marginPaise`
- Subscription docs have: `amount`, `currency`
- Feature flag: `AI_ADMIN_DASHBOARD: false` (ready to enable)
- Query: `menulistAiOperations/{tId}/{sId}` → `sum(realCostPaise)` vs subscription revenue

**Implementation:** Simple Firestore aggregation query on admin page. No new schema needed.

---

**Document Signature:** Lead Architect (Cascade)
**Last Updated:** February 10, 2026 (v5 — ChatGPT feedback audit additions: admin dashboard metric backlog)

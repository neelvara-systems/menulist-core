# Answerlattice Billing — Implementation

> **Version:** 1.1.7
> **Last Updated:** 2026-07-06
> **Audience:** Developers

## Architecture

Answerlattice reuses the MenuList Razorpay routes and payment hook through a product-aware adapter instead of a copied payment stack.

`src/lib/billing/productBillingPlans.ts` owns product-specific plan and support-credit pack mapping:

- MenuList uses existing `PlatformPlansList` and `aiEnhancementPacksList`.
- Answerlattice maps `src/data/answerlattice/plans.ts` into the shared `Plan` shape.
- Answerlattice has `Support Credit Pack` pricing through `ANSWERLATTICE_CREDIT_PACKS_LIST`.

`src/lib/billing/productBillingServer.ts` owns product-aware Firestore routing:

- MenuList payments use the existing default Firestore subscription DAL.
- Answerlattice payments use `answerlatticeFirestoreAdmin`.
- Answerlattice product-billing create/update/get-by-id, active-subscription store-summary fallback, and entitlement sync normalize subscription document IDs through `src/lib/answerlattice/billingDocumentIdBoundary.ts` before `subscriptions/{subscriptionId}` refs.
- July 6 store-scope follow-up: `src/lib/billing/productBillingServer.ts` also validates Answerlattice billing tenant/store scope through `normalizeAnswerlatticeBillingScopeDocumentId()` before active-subscription `stores/{storeId}` summary reads, capped fallback tenant/store queries, and entitlement-summary `stores/{storeId}` writes. Malformed, reserved, whitespace-mutated, path-shaped, decimal, zero, negative, unsafe, or nonnumeric scope IDs fail before the store-summary path.
- Answerlattice entitlement sync writes a compact `stores/{sId}.answerlatticeSubscription` summary, current monthly/top-up credit balances, and subscription `analyticsEntitlement`.
- Answerlattice entitlement sync failures use `answerlattice_subscription_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata plus source error name/code/status only.

## API Behavior

All shared Razorpay routes accept optional `productId`.

- Missing `productId` means MenuList (`ML`) for backward compatibility.
- `productId: 'AL'` resolves Answerlattice scope through `resolveAnswerlatticeSessionScope()`.
- MenuList still uses `verifyTenantAccess()` and `canManageBillingMutation()`.
- Answerlattice uses `canUseAnswerlatticeManagement()` and `productAccounts.AL` scope.

Webhook events derive product from Razorpay notes:

- `notes.productId`
- fallback default `ML`

This lets Razorpay keep one webhook URL while writing transaction/subscription data to the correct product database.

Answerlattice onboarding user ID boundary: `/api/answerlattice/onboard` validates the authenticated session user ID through `src/lib/answerlattice/onboardingUserIdBoundary.ts` before the rate-limit key, `users/{userId}` transaction write, default auth product-account sync, Razorpay subscription metadata, and initial product-surface creator fields. The helper reuses the shared Firestore document-ID guard, so valid Firebase Auth UIDs keep the same behavior while malformed, reserved, or path-shaped IDs cannot become user document refs.

## UI

Answerlattice dashboard routes:

- `/answerlattice/billing`
- `/answerlattice/transactions`

The billing screen reuses shared MenuList billing components where useful:

- `ActiveSubscriptionCard`
- `PricingPlansModal`
- `CreditsPackModal`
- `BillingHistory`

Those components now accept product-aware props for labels, support route, usage route, plans, packs, and checkout names.

The transactions screen also reads Answerlattice AI operation history through `/api/answerlattice/ai-operations` and displays support-credit usage next to invoice history. The route reads `answerlattice_aiOperations/{tId}/{sId}` from Answerlattice Firestore, exposes owner-safe fields only, and includes:

- action label and owner summary
- `unitsConsumed`
- prompt, candidate, and total token counts
- token count source (`provider`, `estimated`, `mixed`, or `none`)
- model/source/timing metadata
- support-credit debit breakdown when the operation consumes credits

The browser DAL sends the usage-history request with no-store cache, same-origin credentials, and manual redirect handling before the existing 512 KB bounded response parser accepts the paginated `{ data, hasMore, lastVisibleDoc }` envelope. The server route validates operation-history query cursors and date filters through `src/lib/ai/operationHistoryQuery.ts`: cursor values must be simple Firestore document IDs that also pass the shared Firestore reserved/path guard, date filters must be strict `YYYY-MM-DD` or browser ISO `...Z` values, and malformed cursors plus reversed or wider-than-366-day ranges are rejected before Firestore cursor/query work.

Provider payloads, raw prompts, real cost, margin, and charge internals stay server/platform-only.

Answerlattice transactions raw load-reason diagnostics boundary: the transactions screen keeps fixed owner-facing load failure copy and records billing-history, support-credit usage, and load-more failures through `answerlattice_billing_history_load_failed`, `answerlattice_support_credit_usage_load_failed`, and `answerlattice_support_credit_usage_more_load_failed` runtime diagnostics. Those diagnostics include bounded tenant/store presence-length metadata, page state counts, cursor presence, and source error name/code/status only; raw rejected Promise reasons, exception messages, tenant IDs, store IDs, transaction rows, and AI operation rows are not logged by the browser component.

AI accounting failure diagnostics are bounded. `src/lib/answerlattice/aiAccounting.ts` logs operation-log, credit-consumption, and balance-detail update failures through `answerlattice_ai_accounting_*` failure codes with tenant/store/action/user presence and length metadata, units consumed, context key counts, and source error name/code/status only. Operation logging remains best-effort; credit consumption still rethrows and fails paid requests when debiting cannot be confirmed.

Answerlattice subscription entitlement sync diagnostics are bounded. `src/lib/billing/productBillingServer.ts` logs `answerlattice_subscription_entitlement_sync_failed` through the Answerlattice diagnostic helper and does not log raw subscription IDs, tenant/store IDs, plan IDs, provider payloads, or exception messages.

Manual draft regeneration and article entity extraction now run through Answerlattice API routes instead of browser-side provider calls. Those routes resolve Answerlattice scope from the session, check safe mode, rate-limit before permission/body/provider work, call Gemini server-side, store zero-unit internal operation rows, and log unexpected route failures with bounded diagnostics.

## Credit And Token Reconciliation

Answerlattice keeps three layers separate:

- Purchased credits: Razorpay support-credit packs write `topups/{orderId}` and atomically increment `subscriptions/{subscriptionId}.topUpCredits`; Answerlattice top-up verification also mirrors the resulting `topUpCredits` into `stores/{sId}.answerlatticeSubscription`.
- Consumed support credits: paid Knowledge Intake OCR/transcription reserves monthly credits first, then top-up credits, settles or refunds `answerlattice_intakeUsageLedger`, and logs consumed units in `answerlattice_aiOperations`.
- Provider tokens: Gemini prompt/candidate/total tokens are recorded on AI operation rows with `tokenCountSource` as `provider`, `estimated`, `mixed`, or `none`. Provider token counts do not automatically equal consumed support credits.

## Non-Goals

- No separate Razorpay account is introduced in this pass.
- No MenuList hardcoded Answerlattice widget/test flag is reintroduced.
- No Answerlattice-specific email lifecycle system is added; MenuList billing messages remain MenuList-only until Answerlattice messaging is explicitly designed.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-05 | 1.1.6 | Documented the Answerlattice onboarding user ID boundary before onboarding user document refs and subscription metadata |
| 2026-07-05 | 1.1.5 | Bounded `/answerlattice/transactions` load failure diagnostics and documented the raw load-reason diagnostics boundary |
| 2026-06-28 | 1.1.4 | Documented safe-mode/rate-limit admission and bounded diagnostics for manual draft/entity extraction routes |
| 2026-06-28 | 1.1.3 | Documented bounded Answerlattice entitlement sync diagnostics |
| 2026-06-20 | 1.1.2 | Documented purchased-credit, consumed-credit, and provider-token reconciliation |
| 2026-06-20 | 1.1.1 | Moved manual draft regeneration and article entity extraction behind server routes with AI operation accounting |
| 2026-06-20 | 1.1.0 | Added Answerlattice AI operation/support-credit usage history to the transactions screen |
| 2026-05-21 | 1.0.0 | Initial product-aware Answerlattice billing implementation |

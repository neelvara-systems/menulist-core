# Answerlattice Billing — Implementation

> **Version:** 1.1.2
> **Last Updated:** 2026-06-20
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
- Answerlattice entitlement sync writes a compact `stores/{sId}.answerlatticeSubscription` summary, current monthly/top-up credit balances, and subscription `analyticsEntitlement`.

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

Provider payloads, raw prompts, real cost, margin, and charge internals stay server/platform-only.

Manual draft regeneration and article entity extraction now run through Answerlattice API routes instead of browser-side provider calls. Those routes permission-check, rate-limit, resolve Answerlattice scope from the session, call Gemini server-side, and store zero-unit internal operation rows.

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
| 2026-06-20 | 1.1.2 | Documented purchased-credit, consumed-credit, and provider-token reconciliation |
| 2026-06-20 | 1.1.1 | Moved manual draft regeneration and article entity extraction behind server routes with AI operation accounting |
| 2026-06-20 | 1.1.0 | Added Answerlattice AI operation/support-credit usage history to the transactions screen |
| 2026-05-21 | 1.0.0 | Initial product-aware Answerlattice billing implementation |

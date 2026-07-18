# Answerlattice Billing — Implementation

> **Version:** 1.5.1
> **Last Updated:** 2026-07-14
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
- `src/lib/answerlattice/billingDocumentIdBoundary.ts` owns strict provider/ledger document IDs and exact positive numeric tenant/store request scope for both client and server billing paths. `src/lib/answerlattice/billingScopeBoundary.ts` separately owns persisted financial identity: at least one exact `AL` product field is required, every present product alias must agree, tenant/store ownership fields must be positive safe-integer numbers, and duplicate compact/legacy aliases must agree. Paid intake, AI accounting, active-subscription selection, entitlement sync, and paid-history projection reuse that persisted boundary. Whitespace-mutated, case-folded, conflicting, string-coercible, reserved, path-shaped, decimal, zero, negative, unsafe, or nonnumeric identifiers fail before a financial row is admitted.
- The billing client accepts a store summary only from an exact Answerlattice store. A valid summary ID is used only to load a direct subscription that independently satisfies exact product/workspace/current-state admission. A summary without a usable direct document is accepted only when the summary itself carries exact persisted financial ownership. Firestore document IDs override embedded data fields. Paid history is filtered/ordered/limited in Firestore and rechecked through the same exact product/workspace boundary, so the transactions screen receives at most the latest 25 admitted rows rather than a numerically coerced or arbitrary window.
- Answerlattice entitlement sync writes a compact `stores/{sId}.answerlatticeSubscription` summary, current monthly/top-up credit balances, and subscription `analyticsEntitlement`.
- Answerlattice entitlement sync selects the current active subscription inside the same Firestore transaction as the store-summary/subscription audit writes. A stale expiry or old-subscription sync cannot replace the active replacement plan. Grace expiry also re-reads current state and the recovery timestamp transactionally before writing `expired`.
- Owner lifecycle mutations use the shared current-state transaction, and upgrade carry-forward updates both old and replacement subscription documents atomically. Existing replacement top-up credits are additive and `carryForwardFromSubscriptionId` makes retries idempotent.
- Existing-workspace creation blocks an unmarked second current subscription, reuses an exact pending provider checkout in `created` state, and compensates a definitively missing local persistence write by cancelling the provider subscription after an ambiguity re-read.
- Existing-workspace shared subscription/top-up creation also uses the central MenuList `billingCheckoutLeases` control plane. The lease is keyed by exact `AL` product/workspace/kind and actor/request hash; Razorpay subscriptions carry `checkoutAttemptId`, while support-credit orders carry both the attempt note and unique receipt. Provider recovery happens before any second create, and a two-minute completed replay checkpoint closes the post-persistence reacquire race without changing the API contract. Answerlattice subscription/top-up truth still writes only to Answerlattice Firestore.
- Shared Razorpay plan creation uses the central `billingProviderPlans` registry/lease because both products use the same provider account. Product code remains part of the canonical lookup key, so `ML` and `AL` plans cannot alias.
- Paid replacements carry a durable old-subscription marker. Authenticated verification and signed activation/charge webhooks both cancel the old provider subscription unless terminal and invoke the same atomic carry-forward finalizer; the browser upgrade route is an idempotent recovery path.
- Answerlattice entitlement sync failures use `answerlattice_subscription_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata plus source error name/code/status only.

## API Behavior

All shared Razorpay routes accept optional `productId`.

- Missing `productId` means MenuList (`ML`) for backward compatibility.
- `productId: 'AL'` resolves Answerlattice scope through `resolveAnswerlatticeSessionScope()`.
- MenuList still uses `verifyTenantAccess()` and `canManageBillingMutation()`.
- Answerlattice uses `canUseAnswerlatticeManagement()` and `productAccounts.AL` scope.
- Every shared Razorpay mutation additionally resolves the current Answerlattice store, user membership, and persisted role through `canManageAnswerlatticeBillingMutation()`. Only platform authority or a current role with `canManageBilling: true` may create or verify subscriptions/top-ups or cancel, pause, resume, or upgrade a subscription. The broader management gate does not grant billing authority to the default Manager role.
- Subscription and top-up creation apply their existing product/user/workspace rate limits before the persisted store/membership permission reads. Verification and lifecycle mutations likewise rate-limit before permission and provider/financial work.

Webhook events derive product from canonical provider notes when present:

- `notes.productId`
- when payment-only notes omit product/scope identity, resolve the referenced provider subscription against the MenuList and Answerlattice billing stores and recover its canonical scope
- default to `ML` only when no subscription identity can establish Answerlattice ownership

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

The bounded browser parser also projects every successful row through `src/lib/ai/operationHistoryClientContract.ts` before billing state changes. It requires canonical operation identity and ISO timestamps, finite accounting numbers, JSON-safe nested detail, bounded file/item/language structures, an exact cursor object, and a cursor whenever `hasMore` is true. Unknown row fields are omitted and malformed success responses use the existing fixed load-failure path. Answerlattice and MenuList share this transport DTO only; their Firebase clients, collections, route authorization, visible-field allowlists, and billing semantics remain separate.

Persisted cursor admission remains product-scoped. After the existing `answerlattice_aiOperations/{tId}/{sId}/{cursorId}` read, the route requires that document to exist, requires a valid Firestore `createdOn` timestamp, and requires the cursor boundary to remain inside the active inclusive date filter. Missing, corrupt, or filter-incompatible cursors return fixed `400 Invalid cursor` before any continuation query; MenuList and Answerlattice retain separate Admin clients, collections, permissions, and response contracts while sharing only this pure boundary helper.

Provider payloads, raw prompts, real cost, margin, and charge internals stay server/platform-only.

Answerlattice AI operation response identity is allowlist-first for both owner and platform roles. The shared pure projector reads and serializes only fields explicitly admitted by the Answerlattice role contract, appends the Firestore document path ID last, and never traverses raw provider, raw batch, generation-configuration, or full Gemini response fields. Platform history may include selected numeric cost fields but not unrestricted operation documents. A legacy or malformed stored `id` cannot replace the document path identity.

Answerlattice transactions raw load-reason diagnostics boundary: the transactions screen keeps fixed owner-facing load failure copy and records billing-history, support-credit usage, and load-more failures through `answerlattice_billing_history_load_failed`, `answerlattice_support_credit_usage_load_failed`, and `answerlattice_support_credit_usage_more_load_failed` runtime diagnostics. Those diagnostics include bounded tenant/store presence-length metadata, page state counts, cursor presence, and source error name/code/status only; raw rejected Promise reasons, exception messages, tenant IDs, store IDs, transaction rows, and AI operation rows are not logged by the browser component.

AI accounting failure diagnostics are bounded. `src/lib/answerlattice/aiAccounting.ts` logs operation-log, credit-consumption, and balance-detail update failures through `answerlattice_ai_accounting_*` failure codes with tenant/store/action/user presence and length metadata, units consumed, context key counts, and source error name/code/status only. Operation logging remains best-effort; credit consumption still rethrows and fails paid requests when debiting cannot be confirmed.

Answerlattice subscription entitlement sync diagnostics are bounded. `src/lib/billing/productBillingServer.ts` logs `answerlattice_subscription_entitlement_sync_failed` through the Answerlattice diagnostic helper and does not log raw subscription IDs, tenant/store IDs, plan IDs, provider payloads, or exception messages.

Manual draft regeneration and article entity extraction now run through Answerlattice API routes instead of browser-side provider calls. Those routes resolve Answerlattice scope from the session, check safe mode, rate-limit before permission/body/provider work, call Gemini server-side, store zero-unit internal operation rows, and log unexpected route failures with bounded diagnostics.

## Credit And Token Reconciliation

Answerlattice keeps three layers separate:

- Purchased credits: Razorpay support-credit packs write an immutable `topups/{orderId}` pending snapshot and atomically increment `subscriptions/{subscriptionId}.topUpCredits`. Either authenticated verification or signed `order.paid` recovery can run the same exactly-once settlement; a new Answerlattice application mirrors the balance into `stores/{sId}.answerlatticeSubscription`, while replay performs no second credit write or notification.
- Consumed support credits: paid Knowledge Intake OCR/transcription reserves monthly credits first, then top-up credits, settles or refunds `answerlattice_intakeUsageLedger`, and logs consumed units in `answerlattice_aiOperations`. Reservation, finalization, and refund are workspace-bound and transaction-serialized: the ledger `tId/sId` must match the supplied workspace, only `reserved` rows may transition, monthly refunds return only within the reservation billing period, and top-up refunds remain durable across a period boundary.
- Provider tokens: Gemini prompt/candidate/total tokens are recorded on AI operation rows with `tokenCountSource` as `provider`, `estimated`, `mixed`, or `none`. Provider token counts do not automatically equal consumed support credits.

## Non-Goals

- No separate Razorpay account is introduced in this pass.
- No MenuList hardcoded Answerlattice widget/test flag is reintroduced.
- No Answerlattice-specific email lifecycle system is added; MenuList billing messages remain MenuList-only until Answerlattice messaging is explicitly designed.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-14 | 1.4.0 | Added pending checkout reuse/provider compensation, durable replacement finalization, webhook product recovery, and lost-browser support-credit settlement |
| 2026-07-13 | 1.3.3 | Enforced current persisted billing permission on all shared Answerlattice mutations and moved creation limits ahead of authorization reads |
| 2026-07-11 | 1.3.1 | Required exact persisted product and numeric workspace ownership for subscription/history reads and entitlement summary selection; conflicting aliases now fail closed |
| 2026-07-05 | 1.1.6 | Documented the Answerlattice onboarding user ID boundary before onboarding user document refs and subscription metadata |
| 2026-07-05 | 1.1.5 | Bounded `/answerlattice/transactions` load failure diagnostics and documented the raw load-reason diagnostics boundary |
| 2026-06-28 | 1.1.4 | Documented safe-mode/rate-limit admission and bounded diagnostics for manual draft/entity extraction routes |
| 2026-06-28 | 1.1.3 | Documented bounded Answerlattice entitlement sync diagnostics |
| 2026-06-20 | 1.1.2 | Documented purchased-credit, consumed-credit, and provider-token reconciliation |
| 2026-06-20 | 1.1.1 | Moved manual draft regeneration and article entity extraction behind server routes with AI operation accounting |
| 2026-06-20 | 1.1.0 | Added Answerlattice AI operation/support-credit usage history to the transactions screen |
| 2026-05-21 | 1.0.0 | Initial product-aware Answerlattice billing implementation |

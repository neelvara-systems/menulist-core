# Answerlattice Billing — Implementation

> **Version:** 2.0.5
> **Last Updated:** 2026-07-29
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
- Every bounded subscription fallback constrains `pId`, `productId`, `tenantId`, `storeId`, `tId`, and `sId` before its limit, then reprojects exact persisted scope. A conflicting duplicate alias cannot consume the bounded window or become direct billing authority.
- `src/lib/answerlattice/billingDocumentIdBoundary.ts` owns strict provider/ledger document IDs and exact positive numeric tenant/store request scope for both client and server billing paths. `src/lib/answerlattice/billingScopeBoundary.ts` separately owns persisted financial identity and resolves the authoritative numeric workspace through `getAnswerlatticeBillingRecordScope()`: both `pId` and `productId` must be exact `AL`, tenant/store ownership fields must be positive safe-integer numbers, and duplicate compact/legacy aliases must agree. Paid intake, AI accounting, direct subscription lookup, payment/lifecycle/webhook transactions, active-subscription selection, entitlement sync, and paid-history projection reuse that persisted boundary. Missing, whitespace-mutated, case-folded, conflicting, string-coercible, reserved, path-shaped, decimal, zero, negative, unsafe, or nonnumeric identifiers fail before a financial row is admitted or mutated.
- The billing client accepts a store summary only from an exact Answerlattice store. A valid summary ID is used only to load a direct subscription that independently satisfies exact product/workspace/current-state admission. A summary without a usable direct document is accepted only when the summary itself carries exact persisted financial ownership. Firestore document IDs override embedded data fields. Paid history is filtered/ordered/limited in Firestore and rechecked through the same exact product/workspace boundary, so the transactions screen receives at most the latest 25 admitted rows rather than a numerically coerced or arbitrary window.
- Browser/Admin active-subscription reads, direct-ID server reads, paid Knowledge Intake, AI-credit transaction rechecks, and grace-expiry transaction rechecks also share `src/lib/answerlattice/subscriptionReadBoundary.ts`. Exact ownership is followed by noncoercing status, interval, currency, amount, quantity, credit-balance, payment-count, bounded history, and browser/Admin lifecycle-timestamp admission. Accessor-backed rows, numeric strings, impossible payment counts, legacy `trialing`, malformed history, or malformed timestamp components fail closed before Billing, entitlement, paid provider work, or payment-lifecycle selection; exact terminal rows remain available to refund/recovery flows.
- Answerlattice entitlement sync first projects exact `AL` product identity and agreeing numeric tenant/store aliases from its input before constructing any subscription reference or active-subscription query. It repeats the exact projection on transaction-current subscription truth, then writes a compact `stores/{sId}.answerlatticeSubscription` summary, current monthly/top-up credit balances, and subscription `analyticsEntitlement`. Contradictory input aliases fail before all reads and writes.
- Answerlattice entitlement sync selects the current active subscription inside the same Firestore transaction as the store-summary/subscription audit writes. Its bounded query constrains exact `pId`, `productId`, `tenantId`, `storeId`, `tId`, and `sId` before ordering and `limit(10)`, so contradictory compact aliases cannot consume the result window and hide a valid current replacement. A stale expiry or old-subscription sync cannot replace the active replacement plan. Grace expiry also re-reads current state and the recovery timestamp transactionally before writing `expired`.
- Owner lifecycle mutations use the shared current-state transaction, and upgrade carry-forward updates both old and replacement subscription documents atomically. Existing replacement top-up credits are additive and `carryForwardFromSubscriptionId` makes retries idempotent.
- Existing-workspace creation blocks an unmarked second current subscription, reuses an exact pending provider checkout in `created` state, and compensates a definitively missing local persistence write by cancelling the provider subscription after an ambiguity re-read.
- A pending checkout for a retired or otherwise different plan is not routed through paid upgrade carry-forward. Billing offers the current plan catalogue; the create route fetches the exact old provider subscription, blocks while payment confirmation is in progress, otherwise cancels a provider-created checkout when required, proves a terminal provider state, and transactionally expires only the unchanged old pending document before creating the newly selected checkout. The transaction compares the captured pending plan, interval, currency, quantity, replacement evidence, provider ID, product, and workspace rather than trusting the new request intent.
- Existing-workspace shared subscription/top-up creation also uses the central MenuList `billingCheckoutLeases` control plane. The lease is keyed by exact `AL` product/workspace/kind and actor/request hash and transactionally records `provider_creating` before a Razorpay call. An expired pre-provider state may renew; an ambiguous subscription state is recovery-only and cannot create again, while support-credit orders may retry only the same attempt-derived unique receipt. A recorded provider ID and two-minute completed replay checkpoint close provider/local-persistence and post-persistence reacquire races without changing the API contract. Answerlattice subscription/top-up truth still writes only to Answerlattice Firestore.
- Shared Razorpay plan creation uses the central versioned `billingProviderPlans` registry because both products use the same provider account. Product code remains part of the canonical lookup key, so `ML` and `AL` plans cannot alias. Provider start is transactionally fenced; an expired provider-started or unversioned row can recover its exact plan but cannot create a second one.
- Paid replacements carry a durable old-subscription marker. Authenticated verification and signed activation/charge webhooks both cancel the old provider subscription unless terminal and invoke the same atomic carry-forward finalizer; the browser upgrade route is an idempotent recovery path.
- Shared signed-webhook coordination distinguishes processed replays from active work: only processed events receive a successful duplicate acknowledgement, active work returns retryable `503`, and attempt-fenced exact terminal replacement prevents an older MenuList runtime from downgrading a newer Answerlattice billing result. Deterministic alerts/messages and immutable payment-audit creation time keep recovery side effects stable.
- Answerlattice entitlement sync failures use `answerlattice_subscription_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata plus source error name/code/status only.

## API Behavior

All shared Razorpay routes accept optional `productId`.

- Missing `productId` means MenuList (`ML`) for backward compatibility.
- `productId: 'AL'` resolves Answerlattice scope through `resolveAnswerlatticeSessionScope()`.
- MenuList still uses `verifyTenantAccess()` and `canManageBillingMutation()`.
- Answerlattice uses `canUseAnswerlatticeManagement()` and `productAccounts.AL` scope.
- Every shared Razorpay mutation additionally resolves the current Answerlattice store, user membership, and persisted role through `canManageAnswerlatticeBillingMutation()`. Only platform authority or a current role with `canManageBilling: true` may create or verify subscriptions/top-ups or cancel, pause, resume, or upgrade a subscription. The broader management gate does not grant billing authority to the default Manager role.
- Subscription and top-up creation apply their existing product/user/workspace rate limits before the persisted store/membership permission reads. Verification and lifecycle mutations likewise rate-limit before permission and provider/financial work.

### Checkout Response Boundary

`src/lib/billing/paymentCheckoutBoundary.ts` projects provider entities into minimal create responses:

- subscription: `{ subscription: { id: 'sub_...' }, reused?: true }`
- top-up: `{ order: { id: 'order_...' } }`

The create routes reject malformed provider IDs before responding. `usePaymentHandler` admits only those exact shapes and rejects unknown nested or outer fields. Razorpay provider notes, customer details, status, amount, hosted URL, and future response fields are never required by the browser.

`src/lib/razorpay/checkoutUrl.ts` applies one exact HTTPS `rzp.io` boundary to subscription and invoice links. Subscription persistence, webhook invoice enrichment, and billing-history projection all use it.

### Billing Read Boundary

Answerlattice client and Admin fallback subscription and payment-history queries include both `pId == 'AL'` and `productId == 'AL'` plus exact tenant/store filters. Dedicated and shared rules require current `canManageBilling`, the same exact dual identity, and current workspace scope for Answerlattice reads. Browser writes remain denied. Shared rules admit MenuList billing rows only when both aliases are exact `ML`; missing or foreign product identity is not inferred from overlapping scope.

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

The active-subscription DAL distinguishes absence from read failure. A valid empty result may show plan selection, but a rejected store/subscription read is rethrown after bounded diagnostics. The Billing screen then clears unverified subscription/history state, sets `hasBillingLoadError`, disables the plan action, and shows a blocking retry alert. It cannot expose a new checkout from an unconfirmed financial state.

The fallback subscription and payment-history queries constrain both `pId` and `productId` to `AL` before workspace/event/order limits. Dedicated and shared rules require the same exact alias pair. Client-side scope projection remains defense in depth and is not relied on to discard a cross-product row after it has been returned.

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

Dedicated Answerlattice Functions apply the same fail-closed scalar principle before writing zero-unit internal operation history. `functions-answerlattice/src/answerlattice/aiOperationAccounting.ts` accepts only registered actions, exact positive safe-integer tenant/store IDs, bounded model/source labels, nonnegative safe-integer counters, and coherent prompt/candidate/total/token-source state. Provider metadata is used only when every supplied counter is a valid nonnegative safe integer and the total covers its components; otherwise the bounded prompt/output estimate is recorded. Each registered action also owns an allowlist-first compact `clientResponse` projector for its counts, document identities, onboarding step, friction level and optional entity label; unknown keys are discarded and malformed known values fail closed before owner-visible history persistence. Numeric strings, fractional/negative/unsafe values, contradictory totals, malformed compact-response fields/containers, and unknown actions create no accounting row. Functions diagnostics expose fixed failure codes and bounded type/length/error-class metadata rather than raw scope values or provider errors.

Support-search paid accounting uses exact runtime scalars end to end. `productBillingServer` does not convert persisted Answerlattice credit fields; `aiAccounting` validates balances, allowance, quantity, unit cost and totals as safe integers before admission or transaction writes. Its deterministic operation replay requires exact action/scope/unit identity and verifies the full before/debit/after arithmetic. Invalid persisted or replay evidence fails closed and leaves the subscription unchanged.

`beforeAiProviderCall` now creates the deterministic `reserved` operation and debits the subscription/store mirror in one transaction. Only the request that owns that reservation reaches the provider. Transaction-current product/workspace/status is revalidated before a monthly reset, new reservation, or existing-reservation renewal, so stale preloaded subscription state cannot authorize a provider call or extend recovery. Settlement changes the shell to `succeeded`; provider-free and route-failure paths change it to `refunded` and restore exact charged buckets. A root recovery pointer carries only exact product/workspace/operation/subscription/unit identity plus recovery time. The existing hourly master scheduler runs `ai_capacity_reservation_recovery`, re-reads the pointer, operation and subscription transactionally, checks full debit arithmetic and billing-period ceilings, refunds stale reservations, and deletes the pointer. A renewed future pointer is rechecked inside the transaction and cannot be reclaimed from a live retry. Per-pointer failures remain isolated, but any nonzero recovery error count throws the fixed `ANSWERLATTICE_AI_CAPACITY_RESERVATION_RECOVERY_INCOMPLETE` task error so scheduler state and bounded error logging cannot report a malformed pointer run as successful.

Answerlattice subscription entitlement sync diagnostics are bounded. `src/lib/billing/productBillingServer.ts` logs `answerlattice_subscription_entitlement_sync_failed` through the Answerlattice diagnostic helper and does not log raw subscription IDs, tenant/store IDs, plan IDs, provider payloads, or exception messages.

Manual draft regeneration and article entity extraction now run through Answerlattice API routes instead of browser-side provider calls. Those routes resolve Answerlattice scope from the session, check safe mode, rate-limit before permission/body/provider work, call Gemini server-side, store zero-unit internal operation rows, and log unexpected route failures with bounded diagnostics.

## Credit And Token Reconciliation

Answerlattice keeps three layers separate:

- Purchased credits: Razorpay support-credit packs write an immutable `topups/{orderId}` pending snapshot and atomically increment `subscriptions/{subscriptionId}.topUpCredits`. Either authenticated verification or signed `order.paid` recovery can run the same exactly-once settlement; a new Answerlattice application mirrors the balance into `stores/{sId}.answerlatticeSubscription`, while replay performs no second credit write or notification.
- Consumed support credits: paid Knowledge Intake OCR/transcription reserves monthly credits first, then top-up credits, settles or refunds `answerlattice_intakeUsageLedger`, and logs consumed units in `answerlattice_aiOperations`. Reservation, finalization, and refund are workspace-bound and transaction-serialized: the ledger `tId/sId` must match the supplied workspace, only `reserved` rows may transition, monthly refunds return only within the reservation billing period, and top-up refunds remain durable across a period boundary.
- Provider tokens: Gemini prompt/candidate/total tokens are recorded on AI operation rows with the applicable source contract (`provider`, `estimated`, `mixed`, or `none`; dedicated Functions emit `provider`, `estimated`, or `none`). Provider counters do not automatically equal consumed support credits and malformed provider metadata is never numerically coerced into accounting truth.

## Workspace-transition billing state boundary

Answerlattice Billing derives one exact `AL:{tenantId}:{storeId}` client scope key. Subscription and payment-history reads carry a monotonic request sequence and apply only when both the sequence and captured scope remain current. A scope change invalidates pending work and clears the previous subscription/history before the next workspace becomes interactive. Credit-purchase callbacks likewise do not patch local state after a workspace transition; server payment authorization remains authoritative.

The Transactions screen applies the same boundary independently. Billing-history and support-credit pages are rendered only when their captured `{tenantId}:{storeId}` key matches the current signed session scope. Initial and load-more reads share a latest-request guard; workspace changes and effect cleanup invalidate older completions, and missing scope clears all rows/cursors. A delayed prior-workspace response cannot populate the new workspace or append to its usage history.

## Non-Goals

- No separate Razorpay account is introduced in this pass.
- No MenuList hardcoded Answerlattice widget/test flag is reintroduced.
- No Answerlattice-specific email lifecycle system is added; MenuList billing messages remain MenuList-only until Answerlattice messaging is explicitly designed.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-29 | 2.0.6 | Constrained all duplicate workspace aliases before the bounded active-entitlement query |
| 2026-07-29 | 2.0.5 | Applied exact subscription projection to paid intake and transaction-current AI reset/debit/reservation/settlement/refund |
| 2026-07-29 | 2.0.4 | Added exact shared browser/Admin active-subscription projection and noncoercing current-state selection |
| 2026-07-23 | 2.0.3 | Partitioned Transactions history and pagination by exact workspace and invalidated stale initial/load-more responses |
| 2026-07-22 | 2.0.2 | Sequence-fenced subscription/history reads and credit callbacks by exact current workspace scope |
| 2026-07-19 | 2.0.1 | Failed active-subscription reads now block plan mutation and exact persisted record scope is enforced on direct reads and transaction-owned mutations |
| 2026-07-19 | 2.0.0 | Feature 30 audit: minimal checkout responses, strict hosted URLs, product-scoped client queries, dual-mode billing rule tests, bounded Billing diagnostics, and complete docs |
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

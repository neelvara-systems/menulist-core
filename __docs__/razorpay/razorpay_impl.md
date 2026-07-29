# Razorpay Payment System — Complete Technical Reference

> **July 28, 2026 billing identity migration hardening:** `classifyMenuListBillingRecordIdentityBackfill()` no longer selects `tenantId ?? tId` or `storeId ?? sId`. Every present compatibility alias must be canonical and all tenant aliases and store aliases must agree before the guarded backfill can add missing exact `ML`/primary scope fields. Ambiguous rows remain untouched for explicit operator review.

> **July 28, 2026 provider-call and transition boundary hardening:** subscription-transition introspection now returns a copy rather than the state machine's live array. Shared Razorpay fetch/quantity helpers require an exact `sub_...` ID and a positive safe-integer quantity within the existing 31-location limit before importing/calling the provider; malformed persisted IDs are never coerced through `String(...)`, and throwing provider error objects cannot break UPI fallback classification. Webhook validation rejects anything other than the provider's 64-character lowercase HMAC-SHA256 hex shape before HMAC construction, then retains timing-safe comparison of the raw-body digest. Razorpay's current primary docs confirm the raw-body HMAC-SHA256 contract and integer subscription quantity: [webhook validation](https://razorpay.com/docs/webhooks/validate-test/?locale=en-US), [subscription update API](https://razorpay.com/docs/api/payments/subscriptions/update-subscription/?preferred-country=IN).

> **July 14, 2026 entitlement post-commit isolation:** after the store/summary/subscription entitlement transaction commits, each menu/store/global cache tag, Digital Screens touch, and Owner Business Assistant invalidation is independently settled. A derived failure is logged with stable code/count and cannot suppress later effects or turn authoritative entitlement sync into failure.

> **July 22, 2026 exact entitlement selection:** the bounded current-entitlement query constrains both product aliases and both tenant/store alias pairs before its limit. Transaction-current and candidate rows use the shared exact MenuList subscription projector; conflicting aliases cannot select another store's mirror or invalidation scope.

**For:** Developers, Founder, CEO, Co-Founder
**Last Updated:** July 16, 2026
**Status:** Implemented and billing-slice audited — full MenuList production certification still pending
**Codebase:** Single source of truth. File paths identify the maintained implementation; line numbers and file lengths are intentionally not treated as stable contracts.

This document covers the **entire** Razorpay payment flow end-to-end: from user onboarding → subscription creation → payment processing → webhook handling → credit management → owner-side billing UI → cancellation/upgrade flows. Runtime code remains the source of truth.

July 14, 2026 scale and concurrency hardening:

- `src/lib/billing/billingCheckoutLease.ts` serializes existing-user subscription or top-up creation per product/tenant/store/kind in central MenuList `billingCheckoutLeases`. Its version-2 state machine is `processing` (no provider call) -> `provider_creating` (provider side effect may exist) -> `provider_created` (one exact provider ID) -> `completed` (two-minute replay). Every transition is actor/request/attempt/scope-bound. Unknown states fail closed, completion requires a provider checkpoint, and a provider ID cannot be replaced by another ID. Unversioned `processing` rows from a rolling release are conservatively treated as provider-ambiguous; exact provider recovery can upgrade them, but subscription recovery cannot start another provider call. Ordinary cleanup may delete only version-2 `processing`; a `provider_created` checkpoint requires explicit compensation plus its matching provider ID, so provider fetch/shape failures cannot reopen creation.
- Existing-user subscription notes carry a `checkoutAttemptId`. An expired `processing` lease can renew to a fresh attempt because the provider-start transaction proves no provider call began. Once `provider_creating` is written, a retry searches the bounded provider subscription window by plan and exact product/scope/plan/quantity/attempt facts. If no match is visible, it returns a bounded conflict and never starts a second subscription. This is required because Razorpay documents create-subscription inputs but no general create idempotency key; Razorpay's documented `X-Payout-Idempotency` support is limited to payout APIs, not subscriptions. ([create subscription](https://razorpay.com/docs/api/payments/subscriptions/create-subscription/), [payout idempotency scope](https://razorpay.com/docs/api/x/payout-idempotency/make-request/))
- Top-up orders use a unique 36-character `mlt_{attemptUuid}` Razorpay `receipt` and matching `checkoutAttemptId` note. Razorpay documents `receipt` as unique with a maximum length of 40 characters, so an ambiguous top-up response is recovered by receipt and only an expired recovery owner may extend the same attempt before retrying the same provider identity. ([create order](https://razorpay.com/docs/api/orders/create/)) The order also freezes `billingStoreId`: for an inherited outlet this is the shared HQ subscription store, so the compact payment audit is written into the billing-history scope that desktop/mobile actually display. The pending `topups/{orderId}` snapshot keeps the requesting outlet scope, and browser/webhook exactly-once settlement remains unchanged.
- `src/lib/razorpay/plan-handler.ts` uses `billingProviderPlans/{lookupHash}` as a durable versioned provider-plan registry. The lease owner scans all admitted 100-row provider pages before create, then transactionally changes `processing` to `provider_creating` immediately before Razorpay. Expired version-2 pre-provider work may be replaced; expired provider-started or unversioned rolling-release work is recovery-only and cannot create again. Concurrent callers wait for `ready`; a create error re-scans by canonical `lookupKey`; exact product/key/attempt ownership and first ready provider ID are immutable.
- New status appends use `appendBoundedBillingStatusHistory()` and retain the latest 100 entries. `billingHistory` remains the payment-id idempotency ledger and is intentionally not truncated.
- `getAllowedSubscriptionTransitions()` returns a fresh readonly projection. A verifier, UI, or future caller cannot mutate the module-level transition table used by later payment, webhook, reconciliation, or grace-expiry writes.
- Shared subscription fetch/quantity calls fail before loading provider credentials when the provider ID or quantity is malformed. Provider error inspection accepts only string diagnostic fields and treats throwing getters/proxies as unclassified rather than replacing the original billing recovery path with another exception.
- Functions reconciliation now keeps `subscriptionReconciliationCursor`, pages only exact-dual-`ML` subscription rows, revalidates the same product identity inside each mutation transaction, processes provider fetches with concurrency five, stops after a six-minute budget, and caps returned sync-detail diagnostics at 100. The next leased run resumes after the committed page cursor; reaching the end clears the cursor.
- `billing_health_snapshot` runs inside the existing maintenance scheduler at 2:40 AM UTC and exact-replaces one compact `systemHealth/billing` summary, so recovered health cannot retain stale/unknown legacy fields. Its checkout, provider-plan and webhook-expiry reads are status-scoped through exact composites in `firestore.indexes.json`, so terminal/ready rows cannot crowd out real recovery work. Terminal webhook writes delete `processingExpiresAt`. The task separately reports expired pre-provider and provider-ambiguous checkout/plan leases, provider-created checkout orphans, failed webhook events, expired webhook claims, and whether any count hit its observation cap. Provider-ambiguous work is critical attention because automatic subscription/plan recreation is intentionally forbidden. Attention state creates a cooldown-aware `Billing Recovery Attention` platform alert through the existing alert system. The same task deletes at most 200 terminal or stale-processing webhook claim documents older than 90 days; it never deletes checkout/plan recovery state or a recent webhook claim.
- No desktop/mobile payload, checkout callback, pricing constant, entitlement rule, pause flag, payment state machine, or provider was changed. Website, desktop, mobile, Answerlattice and reseller onboarding keep their existing serialized/recoverable flows.

Provider constraints were rechecked against Razorpay's current primary documentation: order `receipt` is unique and capped at 40 characters ([Create an Order](https://razorpay.com/docs/api/orders/create/)); orders can be recovered by exact receipt ([Fetch All Orders](https://razorpay.com/docs/api/orders/fetch-all/?preferred-country=IN)); subscription notes remain capped at 15 keys ([Create a Subscription](https://razorpay.com/docs/api/payments/subscriptions/create-subscription/)); and subscription recovery supports plan/time pagination ([Fetch All Subscriptions](https://razorpay.com/docs/api/payments/subscriptions/fetch-subscriptions//?preferred-country=IN)). The generated `mlt_` receipt is 36 characters and provider subscription notes use no more than 13 keys, including replacement metadata.

July 10, 2026 transactional lifecycle corrections:

- Grace-period expiry now re-reads the subscription in a Firestore transaction and expires only a current `past_due` record whose valid recovery timestamp has actually elapsed. A concurrent payment/resume cannot be overwritten by a stale read, malformed legacy timestamps stay on recovery handling instead of throwing, and successful expiry synchronizes the current entitlement state.
- Cancel, pause, and resume routes apply their local state/history through `applyProductSubscriptionStatusTransition()`. The transaction revalidates the current state, treats same-target retries as idempotent, appends history from the current document, and prevents a provider-confirmed owner action from overwriting a concurrent payment/webhook snapshot.
- Upgrade carry-forward uses `applyProductSubscriptionUpgradeCarryForward()` to read and write the old and replacement subscriptions atomically. Credits are calculated from the current old document, added to—not substituted for—the replacement top-up balance, and guarded by `carryForwardFromSubscriptionId` on retry.
- Entitlement sync now reads the authoritative exact-dual-`ML` active subscription for the tenant/store in the same transaction that updates the store/platform summary and subscription audit mirror. Expiring the old subscription during upgrade cannot clear the replacement plan, stale sync completion cannot overwrite a newer active subscription, and a same-scope foreign-product row cannot become MenuList entitlement truth.
- `src/lib/billing/subscriptionUpgradeSettlement.ts` is the pure arithmetic boundary for additive and idempotent credit transfer. `npm run test:billing-settlement-boundaries` covers additive balance preservation, replay behavior, malformed balances, and malformed grace timestamps.
- The Functions reconciliation safety net now runs as the leased 2:20 AM UTC `subscription_reconciliation` task in `menulistMaintenanceScheduler`, not inside Decision Blocks. It paginates by Firestore document ID behind both exact `ML` aliases, rejects embedded/whitespace-mutated provider identity, re-reads and revalidates each subscription in a transaction, appends reconciled status history, clears/starts recovery state correctly, and resets recurring credits only once when provider cycle evidence moves to a new billing period.
- Reconciliation derives the desired plan mirror from the transaction-next subscription shape, not the pre-update cycle/status. Any required mirror change persists `billingEntitlementSyncPending` in that transaction and clears it only after the scoped mirror and cache effects settle, so terminal transitions and lost acknowledgements remain repairable. Cursor cleanup is fail-visible; a failed `_system/subscriptionReconciliationCursor` delete cannot be logged as a completed cycle.
- Manual reseller expiry rechecks exact-dual-`ML` subscription/profile state in one transaction, never decrements the active-offline counter below zero, selects only an exact-dual-`ML` replacement active subscription before changing entitlement, and persists `billingEntitlementSyncPending` until post-commit mirror/cache synchronization succeeds. Later leased runs retry bounded product-scoped pending rows.

July 13, 2026 Answerlattice billing authorization correction:

- Shared Razorpay create, verification, top-up, cancellation, pause, resume, and upgrade routes now require the current persisted Answerlattice role to grant `canManageBilling`. The broad owner/admin/manager management gate remains useful for non-billing surfaces but can no longer let the default non-billing Manager role call payment mutations directly.

July 14, 2026 end-to-end lifecycle corrections:

- Direct recurring checkout is store-scoped. An outlet may inherit the master/HQ subscription for entitlement, but a switched-store billing view is read-only for recurring-plan mutations. Owners must sign in to the directly billed store to create, retry, pause, resume, cancel, or replace its Razorpay subscription. An inherited outlet may still add an enhancement pack to the shared HQ balance when signed in to that outlet.
- Manual reseller/prepaid rows (`manual_...`) never call Razorpay. Cancel, pause, resume, and replacement routes reject them with a controlled conflict response; their capacity and lifecycle remain Firestore/reseller governed.
- New-subscription creation rejects a second unmarked current subscription, reuses an exact matching pending provider subscription in `created` state, and blocks conflicting pending checkouts. Provider subscriptions are cancelled if their local persistence definitively fails; ambiguous writes are re-read first.
- UPI quantity changes and upgrades identify the old subscription with `replacementForSubscriptionId`. Browser verification and the signed webhook both finalize the replacement: cancel the old provider subscription unless it is already terminal, atomically expire the old local row, carry unused credits into the active replacement exactly once, and synchronize entitlement for both rows. The legacy browser follow-up remains an idempotent recovery call.
- Top-up creation stores an immutable pending order snapshot through a create-once transaction. Exact retry preserves the first creation time; an existing paid, foreign-product, differently scoped, differently valued, or differently owned provider order ID fails without merge-overwriting the row. Provider notes and persisted snapshots require both exact product aliases plus complete agreeing tenant/store aliases.
- Either the authenticated browser verification route or a signed `order.paid` webhook settles that snapshot against the transaction-current subscription exactly once. Initial selection, transaction-current mutation and paid replay bind the snapshot's frozen `billingStoreId` to the exact projected subscription. Missing/conflicting aliases, malformed balances and credit additions outside JavaScript's safe integer range fail reconciliation. This recovers captured payments when the browser closes before the callback without doubling credits or notifications.
- Webhook product identity is recovered from exact agreeing canonical notes and reconciled to one exact subscription ID plus exactly one product-local stored subscription before the central event claim. Subscription-bearing payloads query both product stores, reject dual ownership, declaration mismatch, malformed/conflicting IDs and unknown product aliases, and return a retryable response when no row is visible or either read fails. The proven subscription seeds the request-local cache, so lifecycle processing uses the same ownership evidence without another read. Payment/order events without a subscription retain the established exact declaration or MenuList legacy default.
- Razorpay plan deduplication paginates provider plans in bounded pages of 100. It only creates a plan after proving absence; reaching the bounded 20-page safety ceiling fails closed.
- `subscription.updated` transactionally synchronizes a validated provider quantity. The leased Functions reconciliation job now performs the same provider/local quantity comparison in its existing transaction, repairing a missed quantity webhook without another provider mutation.
- Provider subscription state is projected through one exact runtime boundary before authenticated verification or signed webhook mutation. Cycle/start/charge timestamps must be positive numeric safe-integer seconds; quantity and total/paid counts must be bounded numeric safe integers; paid count cannot exceed total count; current end must advance current start; and start/charge ordering must be coherent. Numeric strings are not accepted. The same exact quantity and optional event-time admission protects `subscription.updated`, cancellation/completion and Founder MRR timing. Leased reconciliation uses equivalent exact predicates and fails an item before its transaction when any explicitly present provider scalar is malformed.
- Replacement subscriptions carry paired exact evidence: a valid old subscription document ID and an exact nonnegative safe-integer prior MRR. Pending-checkout reuse, browser verification, signed webhook activation, recovery upgrade and provider-cancellation finalization all use the same runtime projector. Transaction-current and pre-read snapshots must agree; numeric/string coercion, marker-only/MRR-only state and cross-snapshot conflicts fail before provider cancellation, credit carry-forward, entitlement sync or replacement-MRR projection.
- Lost-acknowledgement subscription recovery uses `src/lib/billing/checkoutProviderSubscriptionRecovery.ts` for both bounded provider search and exact checkpoint fetch. A candidate must have an exact valid provider subscription ID, created status, exact plan/attempt/product/plan-note identity, canonical tenant/store notes and agreeing quantity evidence. Notes may carry the provider's canonical decimal string form, while the provider entity quantity must be an exact number; a conflicting or coercible representation is never attached to the checkout lease or persisted subscription.
- The authenticated `upgrade-subscription` recovery route requires the new subscription's paired exact replacement evidence to name the requested old subscription. An exact already-applied carry-forward remains idempotent; otherwise the new row must still be active before the route fetches or cancels the old provider subscription. Markerless or pending replacements cannot trigger provider mutation.
- Captured-payment recurring-credit reset treats `creditsLastResetMonth` and `monthlyCreditsAllowance` as exact persisted scalars. A string period never suppresses a genuine numeric paid-cycle reset and is repaired to the numeric period during that reset. The effective allowance must be a nonnegative safe integer; malformed allowance aborts the transaction before billing history or credit mutation. The leased reconciliation task uses the same exact period comparison and allowance admission.

June 11, 2026 audit corrections:

- `/api/razorpay/verify-subscription` requires the Razorpay checkout signature, verifies payment status is `captured`, and verifies the payment belongs to the submitted subscription before activating local billing state.
- `/api/razorpay/create-subscription` no longer accepts browser-supplied carry-forward credit. New subscriptions start with `topUpCredits: 0`.
- `/api/razorpay/upgrade-subscription` verifies both old and new subscription ownership, computes remaining credits from the old subscription server-side, writes `carryForwardFromSubscriptionId`, and applies carry-forward idempotently.
- `/api/razorpay/create-topup-order` verifies an active subscription exists before opening paid top-up checkout.
- `/api/razorpay/verify-topup` repeats current-subscription admission before provider capture and validates the transaction-current document's complete exact tenant/store aliases, explicit product aliases, frozen billing-store identity, and nonnegative safe-integer credit fields before settlement. Deleted or re-scoped subscriptions are not recreated, transaction credit math never falls back to the pre-capture snapshot, and an individually safe balance/addition pair is still refused when its sum is unsafe.
- Authenticated billing JSON routes use bounded body readers before schema validation, Razorpay provider calls, tenant/store reads, or subscription/top-up writes: 8KB for Razorpay payment actions and 16KB for onboarding subscription setup.
- Browser subscription reads no longer attempt forbidden subscription writes when grace period has ended; server-owned paths perform expiry writes and entitlement/cache sync.
- Owner billing history is capped to the latest 50 successful payment events.
- `usePaymentHandler` and `useRazorpayScript` now use bounded payment diagnostics instead of direct console logging. Subscription/top-up verification failures no longer log raw verification response payloads, payment identifiers, signatures, provider errors, or checkout exception objects.
- Browser billing route requests in `usePaymentHandler` now use no-store caching, same-origin credentials, and manual redirect handling for create, cancel, pause, resume, upgrade, top-up, onboarding, and verification handoffs before accepting route responses.
- Browser billing route responses in `usePaymentHandler` now pass through `readPaymentResponseJson()`, which uses `readJsonResponseWithLimit()` with a 32KB cap. Malformed or oversized create, cancel, pause, resume, upgrade, top-up, onboarding, and verification responses log `payment_response_parse_failed` with status/OK/max-byte metadata plus bounded plan/pack/subscription context only, then continue through fixed generic failure codes. Successful subscription, top-up order, and onboarding responses are shape-checked before checkout opens or session state updates. Cancel, pause, resume, and upgrade responses must also parse as `{ success: true }` before owner success copy or follow-up state refresh can continue.
- Browser payment verification acknowledgements are shape-checked before checkout success resolves. `/api/razorpay/verify-subscription` must return `{ success: true, status: "active" }`, and `/api/razorpay/verify-topup` must return `{ success: true, newCreditBalance: number }`; malformed 2xx responses fail through fixed payment verification failure codes.
- Authenticated Razorpay route `logger.security()` events use `getBoundedRazorpaySecurityContext()` instead of raw `buildSecurityContext()` output. Validation failure `attemptedData`, billing-permission failures, signature failures, tenant/store mismatches, and mutation mismatch breadcrumbs record identifier presence/length metadata instead of raw user IDs, emails, tenant/store IDs, request IP/user-agent values, product/plan/pack IDs, subscription IDs, order IDs, or payment IDs.
- Authenticated MenuList billing mutations use `canManageBillingMutation()` to fail closed for missing store/tenant/role context, cross-tenant stores, inactive stores, soft-deleted stores, and platform-blocked stores before subscription, top-up, cancellation, pause, resume, or upgrade mutations proceed. Every supplied session tenant/store alias must normalize and agree before the shared billing authorization helper reads `stores/{storeId}`; every present embedded store alias must match that document and every persisted tenant alias must match the authorized tenant. Malformed, reserved, path-shaped, whitespace-mutated, decimal, zero, negative, unsafe, nonnumeric, or conflicting scope IDs stop before the store read or provider work.
- Website pricing, website credit packs, desktop billing, subscription self-service, and mobile billing callers now use the same bounded payment diagnostics for payment failures. They do not direct-console or raw-log checkout/store-switch/history/refetch errors, and owner-visible payment failure messages stay generic.
- Desktop and mobile retry-payment and invoice links now open through guarded `noopener,noreferrer` browser handoffs. Blocked opens log bounded URL presence/length and invoice/subscription context only.
- Server-side plan creation and entitlement sync diagnostics are bounded. Razorpay plan lookup/create logs use lookup/provider-plan presence and length metadata only, no longer emit normal-path plan-search debug breadcrumbs, throw fixed local failure text, and store source error name/code/status only in diagnostics. MenuList entitlement sync failures use `billing_store_plan_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata.
- Cancellation flow logs now use `getRazorpaySubscriptionMutationLogContext()` instead of raw subscription, provider-subscription, tenant, store, or plan identifiers. Cancellation failure logs also use the fixed `razorpay_cancel_subscription_failed` code with bounded source-error metadata.
- Subscription verification local logs no longer set raw top-level `userId` fields. Payment, provider subscription, internal subscription, update, and failure breadcrumbs keep user identity as bounded presence/length metadata inside the log payload.
- Successful authenticated billing mutations keep lifecycle/internal notification sends fire-and-forget, but failed notification imports/sends now emit bounded `logRazorpayNonBlockingFailure` diagnostics. Verify-subscription, verify-topup, cancel, pause, resume, and upgrade routes log stable notification failure codes plus identifier presence/length metadata only; they do not log raw emails, store names, provider payloads, or raw tenant/store/payment/subscription IDs.
- Razorpay webhook notification, alert, and failed-status bookkeeping fallbacks also use bounded `logRazorpayNonBlockingFailure` diagnostics. Webhook receipt and duplicate breadcrumbs bound provider event IDs/event keys as presence/length metadata instead of logging raw provider identifiers, and unhandled webhook events keep the local `RAZORPAY_WEBHOOK_UNHANDLED_EVENT` audit row without an extra normal-path debug breadcrumb.
- Onboarding subscription diagnostics and the shared `handlePaymentError()` helper are bounded. Onboarding validation security breadcrumbs, existing-user attempts, success breadcrumbs, failure logs, and local dev payment logs store stable codes plus identifier presence/length metadata only. Shared Firestore/Razorpay payment-handler logs no longer include raw exception messages, stacks, provider descriptions, or raw user/tenant/store IDs; generic Firestore/Razorpay fallback responses use fixed detail text in every environment.
- Desktop Billing, mobile Billing, and website subscription management use the shared past-due grace-period display fallback. If a past-due subscription has enough timestamp context, the UI shows the remaining recovery window; if the grace-period timestamp is missing or invalid, it shows fixed recovery copy instead of a misleading countdown.
- Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`. This locks server-side payment verification, active-subscription top-up gating, checkout response acknowledgement, and entitlement/cache sync source contracts. It is source/docs parity only and does not replace real Razorpay sandbox checkout or webhook smoke.
- Payment verification rate-limit boundary: `/api/razorpay/verify-subscription` and `/api/razorpay/verify-topup` now run the shared `PAYMENT_VERIFICATION` limiter with HMAC-hashed authenticated user key material before bounded body parsing, checkout signature checks, Razorpay provider fetch/capture calls, subscription/top-up reads, or billing writes. The 20-per-hour user ceiling keeps normal checkout completion, browser retry, and webhook race recovery available while bounding repeated verification attempts.
- July 5 past-due grace-period display fallback: `src/utils/razorpay.ts` now exposes `getGracePeriodDisplayInfo()`. Desktop Billing, Mobile Billing, and authenticated pricing subscription-management use it so valid `pastDueSinceAt` values keep the normal countdown, while missing or malformed legacy `past_due` docs show fixed "Grace period details unavailable." recovery copy instead of a misleading zero-day countdown. This is UI/source-gate hardening only; it does not change webhook status writes, DAL access logic, reconciliation, provider calls, or billing mutations.
- MenuList Billing Subscription Document ID Boundary: `src/lib/billing/subscriptionDocumentIdBoundary.ts` validates raw subscription document IDs before server/client subscription DAL refs, AI capacity reset/consume refs, entitlement sync mirror writes, and top-up verification refs. Valid Razorpay `sub_...` IDs keep the same path and Firestore read/write shape; malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail or return null before Firestore document refs.
- MenuList Billing Subscription Scope Document ID Boundary: `src/lib/billing/subscriptionDocumentIdBoundary.ts` validates tenant/store subscription scope with the shared Firestore document ID guard and exact positive numeric admission for both browser and server DALs before subscription queries, request-dedupe keys, or the outlet-to-master fallback `tenants/{tenantId}` read. Firestore document IDs override embedded fields. Malformed, reserved, empty, whitespace-mutated, decimal, zero, negative, unsafe, nonnumeric, or path-shaped scope IDs return no active subscription before Firestore refs.
- Server subscription selection constrains both canonical and legacy tenant/store alias pairs. A grace-period transaction must still match the originally admitted entitlement scope, entitlement synchronization must read and prove the current target store in the same transaction, and stale pending-checkout cleanup must transactionally revalidate product, scope, provider identity, state, plan, interval, currency, quantity and replacement intent.
- Reseller onboarding replay is authoritative only when the transaction-current subscription, reseller/profile/provider identity and operation tenant/store/amount/mode all match the original request. Matching operation IDs alone are not sufficient replay evidence.
- MenuList session billing admission uses the shared exact product+user+tenant+store projector before any payment rate-limit, current-permission, provider, subscription, top-up, or entitlement work. An explicit Answerlattice/sister-product session cannot select the MenuList server or browser branch even when numeric tenant/store values collide. Existing legacy MenuList sessions without product aliases retain the established `ML` default; explicit aliases must be canonical and mutually agreeing. Pre-onboarding `null`, zero, exponent, whitespace, decimal, unsafe, and noncanonical scope aliases resolve to no billing scope; they are never coerced into tenant/store `0` or another document identity.
- Authenticated website pricing scope-tags its subscription and tenant-name reads to that same exact MenuList session key. Superseded responses cannot replace a newer session, prior-scope state is never rendered, current billing truth must finish loading before purchase or management actions appear, and read failure exposes only a generic retry state. Authenticated users without a complete workspace retain the pre-onboarding pricing path.
- Website sign-in continuation stores purchase intent only in the current tab as a versioned two-hour envelope. The 32KB-bounded runtime projector validates business/currency/interval/type fields through the onboarding schema and reconstructs the full plan from the canonical B2C/B2B catalog; it never trusts stored price, credit, name or feature metadata. Invalid, stale, future, oversized and legacy unversioned state is cleared, and the payment hook accepts only the already-projected DTO rather than re-reading browser storage.
- Product subscription identity is revalidated from the transaction-current document for both MenuList and Answerlattice. Direct reads, active selection, payment, webhook, lifecycle, grace-expiry, upgrade carry-forward and replacement finalization require exact dual product aliases plus present, agreeing numeric `tId/tenantId` and `sId/storeId`; a foreign, incomplete or conflicting row is never rewritten into the requested product. Browser subscription/history queries constrain both alias pairs so shared/dedicated rules can prove the same contract before returning a row.
- MenuList Top-Up Order Document ID Boundary: `src/lib/billing/topupDocumentIdBoundary.ts` validates raw Razorpay `order_...` document IDs before `topups/{orderId}` pending writes, idempotency reads, and paid audit writes. Valid order IDs keep the same pending/paid audit path and duplicate-verification behavior; malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail before top-up document refs.
- MenuList Top-Up Scope Document ID Boundary: `normalizeBillingTopupScopeDocumentId()` validates the resolved billing tenant/store scope before top-up rate limits, Razorpay order creation, provider-note comparisons, active-subscription lookup, Answerlattice store-summary mirror refs, and paid top-up writes. Valid numeric tenant/store scopes keep the same billing behavior; malformed, reserved, empty, whitespace-mutated, decimal, zero, negative, unsafe, or path-shaped scope IDs fail before provider or Firestore work.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Inventory](#2-file-inventory)
3. [Type Definitions & Database Schema](#3-type-definitions--database-schema)
4. [Subscription Plans & Pricing](#4-subscription-plans--pricing)
5. [Flow 1: New User Onboarding](#5-flow-1-new-user-onboarding)
6. [Flow 2: Existing User — New Subscription](#6-flow-2-existing-user--new-subscription)
7. [Flow 3: Payment Verification](#7-flow-3-payment-verification)
8. [Flow 4: Webhook Processing](#8-flow-4-webhook-processing)
9. [Flow 5: Plan Upgrade](#9-flow-5-plan-upgrade)
10. [Flow 6: Subscription Cancellation](#10-flow-6-subscription-cancellation)
11. [Flow 7: AI Enhancement Pack (Top-Up)](#11-flow-7-ai-enhancement-pack-top-up)
12. [Credit System — Monthly Reset](#12-credit-system--monthly-reset)
13. [Grace Period & Past Due Handling](#13-grace-period--past-due-handling)
14. [Frontend — Owner Billing Dashboard](#14-frontend--owner-billing-dashboard)
15. [Frontend — Website Subscription Management](#15-frontend--website-subscription-management)
16. [Security Implementation](#16-security-implementation)
17. [Database Access Layer (DAL)](#17-database-access-layer-dal)
18. [Billing History & Transaction Logging](#18-billing-history--transaction-logging)
19. [Utility Functions](#19-utility-functions)
20. [Environment Variables](#20-environment-variables)
21. [Key Architecture Decisions](#21-key-architecture-decisions)
22. [Changes, Fixes & Improvements Log](#22-changes-fixes--improvements-log)
23. [**Razorpay Official Docs Audit**](#23-razorpay-official-docs-audit-feb-10-2026)
24. [Future Enhancements (Backlog)](#24-future-enhancements-backlog)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                                                                   │
│  Website Pricing Page          Owner Dashboard Billing Page      │
│  (shadcn/ui components)        (Ant Design components)           │
│         │                              │                          │
│         └──────────┬───────────────────┘                          │
│                    │                                              │
│         usePaymentHandler.ts (hook)                              │
│         useRazorpayScript.ts (script loader)                     │
│                    │                                              │
│         Razorpay Checkout Modal (client-side)                    │
└────────────────────┼─────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────┐
│                 BACKEND (Next.js API Routes)                      │
│                                                                   │
│  /api/onboarding/create-subscription     (new users)             │
│  /api/razorpay/create-subscription       (existing users)        │
│  /api/razorpay/verify-subscription       (post-payment)          │
│  /api/razorpay/upgrade-subscription      (plan change)           │
│  /api/razorpay/cancel-subscription       (cancellation)          │
│  /api/razorpay/create-topup-order        (AI pack purchase)      │
│  /api/razorpay/verify-topup              (AI pack verification)  │
│  /api/razorpay/webhook                   (Razorpay events)       │
│                    │                                              │
│         lib/razorpay/razorpay.ts         (SDK client)            │
│         lib/razorpay/plan-handler.ts     (plan dedup)            │
│         lib/razorpay/webhook-validator.ts (HMAC-SHA256)          │
└────────────────────┼─────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────┐
│              FIRESTORE DATABASE                                   │
│                                                                   │
│  subscriptions/{providerSubscriptionId}   (subscription doc)     │
│  paymentTransactions/{auto-id}            (webhook event log)    │
│  aiOperations/{tId}/{sId}/{auto-id}       (AI usage tracking)   │
└──────────────────────────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────┐
│           RAZORPAY (External)                                     │
│                                                                   │
│  Plans API        → getOrCreateRazorpayPlan()                    │
│  Subscriptions API → create, fetch, cancel                       │
│  Orders API       → create (for top-ups)                         │
│  Payments API     → fetch, capture                               │
│  Invoices API     → fetch (for billing history)                  │
│  Webhooks         → subscription.charged, payment.failed, etc.   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Principle:** Subscription rows are **store-scoped** (not tenant-wide), while an outlet may inherit its master/HQ subscription for entitlement and shared credits. Only the directly billed, signed-in store can mutate the recurring Razorpay subscription.

---

## 2. File Inventory

### Backend — API Routes

| File                                                  | Purpose                                                                                     | Auth           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------- |
| `src/app/api/onboarding/create-subscription/route.ts` | New-user onboarding, provider creation, local persistence, and compensating cancellation   | `withAuth()`   |
| `src/app/api/razorpay/create-subscription/route.ts`   | Direct-store checkout, pending reuse, and marked replacement creation                       | `withAuth()`   |
| `src/app/api/razorpay/verify-subscription/route.ts`   | Checkout verification, activation, and replacement finalization                            | `withAuth()`   |
| `src/app/api/razorpay/upgrade-subscription/route.ts`  | Idempotent old/new replacement finalization recovery                                        | `withAuth()`   |
| `src/app/api/razorpay/cancel-subscription/route.ts`   | Provider cancellation and local state/entitlement synchronization                           | `withAuth()`   |
| `src/app/api/razorpay/create-topup-order/route.ts`    | Active-subscription admission and immutable pending enhancement-pack order                  | `withAuth()`   |
| `src/app/api/razorpay/verify-topup/route.ts`          | Browser callback verification and exactly-once top-up settlement                            | `withAuth()`   |
| `src/app/api/razorpay/webhook/route.ts`               | Signed lifecycle handling, cross-product recovery, and lost-browser top-up settlement       | HMAC signature |

### Backend — Library / Utilities

| File                                                       | Purpose                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/lib/razorpay/razorpay.ts`                             | Razorpay SDK singleton client                                                                   |
| `src/lib/razorpay/plan-handler.ts`                         | Bounded paginated plan lookup and deduplication                                                  |
| `src/lib/razorpay/webhook-validator.ts`                    | HMAC-SHA256 signature validation with timing-safe comparison                                    |
| `src/lib/billing/topupSettlementServer.ts`                 | Shared immutable-snapshot, transaction-current, exactly-once top-up settlement                   |
| `src/lib/billing/subscriptionReplacementFinalization.ts`   | Shared provider cancellation plus atomic/idempotent old-to-new replacement finalization         |
| `src/utils/razorpay.ts`                                    | Grace-period display and remaining-credit calculation                                            |
| `src/lib/ai/capacityCheck.ts`                              | AI-capacity admission, consumption, and lazy billing-period reset                                |

### Frontend Diagnostics

| File | Purpose |
| ---- | ------- |
| `src/hooks/paymentDiagnostics.ts` | Shared bounded diagnostics for browser payment and Razorpay script failures. |
| `src/hooks/usePaymentHandler.ts` | Opens checkout, posts verification payloads to server routes, parses billing route responses with a bounded 32KB reader, shape-checks subscription/order/onboarding payloads, and logs only normalized failure codes plus bounded product/plan/pack/status metadata. |
| `src/hooks/useRazorpayScript.ts` | Loads Razorpay Checkout and logs script-load failure through bounded payment diagnostics. |
| `src/components/website/pricing-pages/index.tsx` | Handles website subscription/onboarding checkout failures with bounded diagnostics and generic user-facing failure text. |
| `src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx` | Opens the post-payment dashboard handoff with `noopener,noreferrer`, logs bounded blocked-open diagnostics, and falls back to same-tab navigation without raw purchase/payment payloads. |
| `src/components/website/pricing-pages/shared/CreditPacksCtaSection.tsx` | Handles website credit-pack top-up failures with bounded diagnostics. |
| `src/components/templates/main-app/billing/index.tsx` | Handles owner desktop upgrade, paid-location, credit-pack, and store-switch failures with bounded diagnostics. |
| `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx` | Handles desktop cancel, pause, resume, and retry-payment link-open failures with bounded diagnostics and generic owner messages. |
| `src/components/templates/main-app/billing/BillingHistory.tsx` | Handles desktop invoice link-open failures with bounded diagnostics and generic owner messages. |
| `src/components/mobile/screens/MobileBillingScreen.tsx` | Handles mobile billing payment-action, subscription refetch, history-load, store-switch, retry-payment, pending-payment, and invoice link-open failures with bounded diagnostics and generic toast text. |

Frontend diagnostics must not log raw `razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_order_id`, `razorpay_signature`, `shortUrl`, `invoiceUrl`, verification responses, billing route response bodies, provider exception payloads, owner identity, or full plan/subscription objects. `npm run verify:menulist-api-tenant-safety` guards this contract.

### Backend — Database Layer

| File                                                | Purpose                                         | Lines |
| --------------------------------------------------- | ----------------------------------------------- | ----- |
| `src/database/subscriptions/index.ts`               | Subscription CRUD + grace period enforcement    | 143   |
| `src/database/subscriptions/paymentTransactions.ts` | Read-only bounded owner billing-history query | 40    |

### Backend — Type Definitions

| File                                     | Purpose                                                               | Lines |
| ---------------------------------------- | --------------------------------------------------------------------- | ----- |
| `src/types/razorpay.ts`                  | `FirestoreSubscriptionDoc`, `FirestoreTopupDoc`, `BillingHistoryItem` | 141   |
| `src/types/razorpayWebhookEventTypes.ts` | Webhook event payload types (Payment, Subscription, EventObject)      | 126   |

### Backend — Plan Data

| File                            | Purpose                                                          | Lines |
| ------------------------------- | ---------------------------------------------------------------- | ----- |
| `src/data/PlatformPlansList.ts` | B2C plans, B2B plans, AI Enhancement Packs, getters              | 154   |
| `src/data/common.ts`            | `Plan`, `AIEnhancementPack`, `Currency`, `BillingInterval` types | 104   |

### Frontend — Hooks

| File                             | Purpose                                                               | Lines |
| -------------------------------- | --------------------------------------------------------------------- | ----- |
| `src/hooks/usePaymentHandler.ts` | All payment flows: create, verify, upgrade, cancel, topup, onboarding | 350   |
| `src/hooks/useRazorpayScript.ts` | Dynamic Razorpay Checkout.js script loader                            | 36    |

### Frontend — Owner Dashboard (Ant Design)

| File                                                                                    | Purpose                                        | Lines |
| --------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- |
| `src/components/templates/main-app/billing/index.tsx`                                   | Main billing page — orchestrator               | 234   |
| `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx`                  | Subscription details card + credits display    | 288   |
| `src/components/templates/main-app/billing/PricingPlansModal.tsx`                       | Plan selection modal with MONTH/YEAR toggle    | 300   |
| `src/components/templates/main-app/billing/CancellationModal.tsx`                       | 2-step cancellation flow with reason + consent | 167   |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`                          | Individual AI Enhancement Pack card            | 134   |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx`                        | Modal wrapping pack cards                      | 40    |
| `src/components/templates/main-app/billing/RemainingCreditNote.tsx`                     | Credit carry-forward display on upgrade        | 32    |
| `src/components/templates/main-app/billing/UpgradeConfirmationModal.tsx`                | Upgrade confirmation with credit note          | 64    |
| `src/components/templates/main-app/billing/UpgradeSubscriptionPayementSuccessModal.tsx` | Success modal with confetti                    | 107   |
| `src/components/templates/main-app/billing/BillingHistory.tsx`                          | Table of past payments with invoice links      | 145   |
| `src/components/templates/main-app/billing/NoSubscriptionView.tsx`                      | Empty state → "View Plans" CTA                 | 38    |

### Frontend — Website (shadcn/ui)

| File                                                                                                     | Purpose                             | Lines |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----- |
| `src/components/templates/website/platformSite/landingPage/pricing/SubscriptionManagement.tsx`           | Public subscription management page | 204   |
| `src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx` | Onboarding success modal with safe dashboard handoff | 108   |

**Total: 34 files, ~4,000+ lines of code**

---

## 3. Type Definitions & Database Schema

### FirestoreSubscriptionDoc

**Collection:** `subscriptions`
**Document ID:** Razorpay subscription ID (e.g., `sub_xxxxxxxxxxxxx`)
**File:** `src/types/razorpay.ts:36-99`

```typescript
interface FirestoreSubscriptionDoc {
  id?: string;
  paymentProvider: "razorpay"; // Always "razorpay"
  providerSubscriptionId: string; // Razorpay sub ID (also used as Firestore doc ID)
  providerPlanId: string; // Razorpay plan ID

  // Core User & Tenant Context
  userId: string;
  name: string;
  email: string;
  tenantId: number | string;
  storeId: number | string;
  userType: "B2C" | "B2B";

  // Plan & Status
  status:
    | "pending"
    | "active"
    | "cancelled"
    | "expired"
    | "paid"
    | "failed"
    | "past_due"
    | "completed";
  planName: string; // e.g., "Pro Plan (Yearly)"
  planId: string; // e.g., "pro"
  planType: "MONTH" | "YEAR";
  amount: number; // In smallest currency unit (paise/cents)
  currency: "INR" | "USD";

  // Billing Cycle Dates (Firebase Timestamps)
  cycleStartDate: Timestamp; // Start of current billing period
  cycleEndDate: Timestamp; // End of current billing period
  renewsOn: Timestamp; // When next charge occurs (= cycleEndDate)
  subscriptionStartDate: Timestamp; // When subscription first started
  subscriptionEndDate: Timestamp; // When subscription will fully end
  pastDueSinceAt: Timestamp; // When payment first failed (null if not past_due)

  // Credit Management System
  monthlyCreditsAllowance: number; // Fixed credits per cycle (set once, e.g., 200)
  monthlyCredits: number; // Current balance (resets every billing cycle)
  topUpCredits: number; // Purchased credits (never resets, never expires)
  creditsLastResetMonth?: number; // YYYYMM billing-period key (e.g., 202602)

  // Razorpay Metadata
  totalPaymentsNeededCount: number; // Razorpay total_count
  totalPaymentsMadeCount: number; // Razorpay paid_count
  shortUrl: string; // Razorpay payment page URL

  // Payment Method
  paymentMethod: {
    type: string; // "card" | "upi"
    brand?: string; // "visa" | "mastercard"
    last4?: string; // "4024"
    upiId?: string; // UPI VPA
    upiTransactionId?: string;
  } | null;

  // Audit Trail
  statuses: Array<{
    status: string;
    timestamp: Timestamp;
    amount: number;
    currency: string;
    remark: string;
  }>;
  billingHistory: string[]; // Array of Razorpay payment IDs
  lastWebhook: { event: string; timestamp: Timestamp } | null;
}
```

### FirestoreTopupDoc

**File:** `src/types/razorpay.ts:114-129`

```typescript
interface FirestoreTopupDoc {
  id?: string;
  paymentProvider: "razorpay";
  providerOrderId: string; // Razorpay order ID
  providerPaymentId?: string; // Razorpay payment ID
  creditsAdded: number;
  amount: number;
  currency: "INR" | "USD";
  status: PaymentStatus;
  userId: string;
  tenantId: number | string;
  storeId: number | string;
  paidAt?: Timestamp;
  packId?: string;
}
```

### BillingHistoryItem (Frontend Display)

**File:** `src/types/razorpay.ts:131-141`

```typescript
interface BillingHistoryItem {
  id: string;
  type: string; // "Subscription Payment" | "Credit Pack Purchase"
  date: number; // JS timestamp
  description: string;
  amount: number;
  currency: string;
  status: string;
  invoiceId?: string;
  invoiceUrl?: string;
}
```

---

## 4. Subscription Plans & Pricing

**File:** `src/data/PlatformPlansList.ts:10-95`

### B2C Plans

| Plan ID   | Plan Name    | Monthly Price (INR) | Yearly Price (INR) | Monthly Credits (INR) | Monthly Price (USD) | Yearly Price (USD) | Monthly Credits (USD) |
| --------- | ------------ | ------------------- | ------------------ | --------------------- | ------------------- | ------------------ | --------------------- |
| `starter` | Starter Plan | ₹499                | ₹4,990             | 75                    | $29                 | $290               | 100                   |
| `pro`     | Pro Plan     | ₹1,499              | ₹14,990            | 200                   | $79                 | $790               | 400                   |
| `premium` | Premium Plan | ₹3,999              | ₹39,990            | 600                   | $149                | $1,490             | 1,000                 |

### B2B Plans

| Plan ID   | Plan Name   | Monthly Price (INR) | Yearly Price (INR) | Monthly Credits (INR) | API Call Allowance |
| --------- | ----------- | ------------------- | ------------------ | --------------------- | ------------------ |
| `starter` | Starter API | ₹4,999              | ₹49,990            | 200                   | 1,000/mo           |
| `pro`     | Pro API     | ₹18,999             | ₹1,89,990          | 1,000                 | 5,000/mo           |

### AI Enhancement Pack (Top-Up)

**File:** `src/data/PlatformPlansList.ts:112-121`

| Pack ID       | Name                | Credits | Price (INR) | Price (USD) |
| ------------- | ------------------- | ------- | ----------- | ----------- |
| `enhancement` | AI Enhancement Pack | 250     | ₹2,999      | $35         |

### Razorpay Plan Deduplication

**File:** `src/lib/razorpay/plan-handler.ts:57-130`

Plans are created on Razorpay's side using a **lookup key** pattern to avoid duplicates:

```
lookupKey = "{productId}_{userType}_{planId}_{interval}_{currency}_{price}".toUpperCase()
Example: "ML_B2C_PRO_MONTH_INR_149900"
```

`getOrCreateRazorpayPlan()` first reads the server-only `billingProviderPlans/{lookupHash}` registry. A cold or expired version-2 pre-provider key is transactionally leased to one caller; concurrent callers wait briefly for `ready`. The lease owner searches Razorpay plans in bounded pages of 100 using `skip`, up to 20 pages, for a matching `lookupKey` in `notes`, and re-runs that search after an ambiguous create error. Before a create it atomically proves current unexpired ownership and writes `provider_creating`. Once that state exists, expiry can trigger another search but never another create; unversioned `processing` is treated the same way during rolling release. It creates only after a short page proves the provider listing is exhausted and the provider-start fence commits. Reaching the safety ceiling, malformed state, changed product/key/attempt, or unresolved provider work fails closed. Lookup, found-plan, create-plan, and failure diagnostics use bounded metadata only; raw lookup keys, provider plan IDs, and provider exception messages are not logged or rethrown.

---

## 5. Flow 1: New User Onboarding

**Entry Point:** Website pricing page → user signs up → selects plan
**Frontend:** `usePaymentHandler.ts:219-314` → `executePostOnboarding()`
**Backend:** `src/app/api/onboarding/create-subscription/route.ts:41-348`

### Sequence

```
1. User selects plan on website pricing page
2. purchaseIntent stored in localStorage: { plan, currency, businessName, businessIndustry }
3. User signs in (NextAuth)
4. executePostOnboarding() called with purchaseIntent

FRONTEND:
5. POST /api/onboarding/create-subscription
   Body: { businessName, businessIndustry, planId, interval, currency, userType }

BACKEND:
6. withAuth() verifies session
7. Verify user does NOT already have tenant/store (security)
8. Rate limit check: PAYMENT_ONBOARDING config
9. Bounded JSON body parse (16KB cap)
10. Zod input validation (OnboardingSubscriptionSchema)
11. Find plan from PlatformPlansList constants
12. ATOMIC TRANSACTION (Firestore runTransaction):
    a. Create tenant document
    b. Create store document (with default roles, time slot presets)
    c. Sync to storesSummary (Cloud Function optimization)
    d. Update user document with tenantId + storeId
    e. Update platformSummary counts
13. getOrCreateRazorpayPlan() — find or create Razorpay plan
14. razorpayClient.subscriptions.create() — create Razorpay subscription
    - total_count: 36 (monthly) or 3 (yearly)
    - notes: { tenantId, storeId, userId, userType, planId, priceKey, interval, ... }
15. createInitialSubscription() — Firestore doc with:
    - status: "pending"
    - monthlyCreditsAllowance: plan credits
    - monthlyCredits: plan credits (full balance)
    - topUpCredits: 0
    - creditsLastResetMonth: YYYYMM (calendar month, corrected later by verify)
    - cycleStartDate/EndDate: null (set after payment)
16. Return { subscription, tenantId, storeId }

FRONTEND (continued):
17. Update NextAuth session with new tenantId/storeId
18. Open Razorpay Checkout modal (subscription_id)
19. User completes payment
20. Razorpay handler callback → verifySubscriptionPaymentResponse()
21. POST /api/razorpay/verify-subscription (see Flow 3)
22. Show SubscriptionPayementSuccessModal with confetti
```

### Analytics Assistant Entitlement Sync

When a subscription has current paid-cycle plan entitlement, payment verification, lifecycle routes, Razorpay webhooks, and maintenance repair sync the plan id to:

- `stores/{storeId}.activePlanType`
- `platformSummary/storesSummary.stores.{storeId}.activePlanType`
- `subscriptions/{subscriptionId}.analyticsEntitlement`

Current `active` subscriptions carry an active plan type. `cancelled` and `paused` subscriptions keep it only through a valid `cycleEndDate`, so owner-visible access and plan-dependent mirrors agree for the paid period. `past_due`, `expired`, and `completed` do not carry this plan mirror. When multiple rows exist, a current active row wins before a paid-cycle cancelled/paused row. The leased reconciliation job repairs stale or missing mirrors without scanning stores and evaluates provider cycle/status updates as one next-state contract. The hourly `subscription_access_expiry` maintenance task transitions at most 500 due cancelled/paused rows per run. Both tasks preserve `billingEntitlementSyncPending: true` until the mirror/cache settlement succeeds, allowing the bounded retry path to repair partial failure.

The active Firebase Functions reconciler at `functions/src/billing/reconcileSubscriptions.ts` is the only supported subscription reconciliation path and is called by the leased `subscription_reconciliation` task in `functions/src/schedulers/menulistMaintenanceScheduler.ts`. The deprecated Vercel fallback route at `src/app/api/internal/reconcile-subscriptions/route.ts` was removed on July 1, 2026. Functions per-subscription failures use `BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED`. Subscription/provider IDs are logged as presence-length metadata only, update logs use counts/booleans instead of raw field arrays, and source error names/codes/status values are capped before Functions logging.

### Key Security

- `withAuth()` middleware on the route
- Checks user does NOT already have tenant (prevents duplicate onboarding)
- Rate limiting: `PAYMENT_ONBOARDING` config
- Zod validation: `OnboardingSubscriptionSchema`
- Atomic transaction: prevents partial tenant/store creation
- Server-created IDs passed to Razorpay notes (not client-provided)

---

## 6. Flow 2: Existing User — New Subscription

**Entry Point:** Owner dashboard billing page → "View Plans" / "Choose a New Plan"
**Frontend:** `usePaymentHandler.ts:20-74` → `createSubscription()` → `onClickPaymentCard()`
**Backend:** `src/app/api/razorpay/create-subscription/route.ts`

### Sequence

```
1. User clicks "Get Started" on a plan card (PricingPlansModal)
2. UpgradeConfirmationModal shows plan details + remaining credits
3. User confirms → handleConfirmUpgrade() called

FRONTEND:
4. createSubscription(plan, currency, user)
5. POST /api/razorpay/create-subscription
   Body: { planId, interval, currency, userType, quantity? }

BACKEND:
6. withAuth()
7. Bounded JSON body parse (8KB cap)
8. Zod validation
9. Resolve billing scope, verify tenant/store access, and check billing mutation permission
10. Rate limit check: PAYMENT_SUBSCRIPTION config
11. Find plan from PlatformPlansList constants
12. getOrCreateRazorpayPlan()
13. razorpayClient.subscriptions.create()
    - total_count: 36 (monthly) or 3 (yearly)
    - notes include zero server-owned carried credits for new subscriptions
    - billing name/email come from the authenticated session only, not request body fallbacks
14. createInitialSubscription():
    - status: "pending"
    - monthlyCredits: plan's monthlyCredits
    - topUpCredits: 0
    - creditsLastResetMonth: YYYYMM
15. Return { subscription }

FRONTEND (continued):
16. Open Razorpay Checkout modal
17. User pays → handler → verifySubscriptionPaymentResponse()
18. POST /api/razorpay/verify-subscription
19. Refetch subscription, show success modal
```

---

## 7. Flow 3: Payment Verification

**File:** `src/app/api/razorpay/verify-subscription/route.ts:40-222`

Called immediately after Razorpay Checkout completes on the frontend. This is an **optimistic update** — we don't wait for the webhook.

### Sequence

```
1. Frontend POST /api/razorpay/verify-subscription
   Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, productId? }

2. withAuth() + bounded JSON body parse (8KB cap) + Zod validation (VerifyPaymentRequestSchema)
3. Verify Razorpay checkout HMAC signature before provider or Firestore reads
4. Fetch payment from Razorpay: razorpayClient.payments.fetch(payment_id)
5. Fetch subscription from Razorpay: razorpayClient.subscriptions.fetch(sub_id)
6. Resolve billing scope, verify tenant/store access, and check billing mutation permission
7. Find internal Firestore subscription: getSubscriptionById(sub_id)
8. Verify payment is captured and belongs to the submitted subscription
9. Verify internal subscription belongs to the session billing scope
10. If already active → return { success: true } (webhook may have beaten us)
11. Get plan details from constants using subscription notes
12. Calculate creditsLastResetMonth (billing-period-aware):
   - Anchor day = cycleStartDate day-of-month
   - Cap anchor to days in current month (month-end edge case)
   - If today < anchor: still in previous billing period
13. Build updatePayload:
    - status: "active"
    - monthlyCreditsAllowance: from plan constants
    - monthlyCredits: full allowance
    - topUpCredits: preserved from pending doc
    - creditsLastResetMonth: billing-period key
    - cycleStartDate, cycleEndDate, renewsOn: from Razorpay subscription
    - subscriptionStartDate, subscriptionEndDate: calculated
    - paymentMethod: { type, brand, last4, upiId, upiTransactionId }
    - billingHistory: [payment_id]
    - statuses: append "verified" entry
14. updateSubscription() — write to Firestore
15. Return { success: true, status: "active" }
```

### Subscription End Date Calculation

**File:** `src/app/api/razorpay/verify-subscription/route.ts:23-38`

```typescript
// For YEAR plans: start_at + total_count years
// For MONTH plans: start_at + total_count months
// total_count = 36 for monthly (3 years), 3 for yearly
```

---

## 8. Flow 4: Webhook Processing

**File:** `src/app/api/razorpay/webhook/route.ts:63-260`

Razorpay sends webhook events for subscription lifecycle changes. This route is **unauthenticated** (no `withAuth()`) but **signature-validated**. Before the raw body is read, it rejects malformed or oversized `content-length` headers above 256KB and applies the shared `WEBHOOK` IP rate limit. Chunked/no-length bodies are still read through a bounded raw-body reader, so oversized streams are rejected before JSON parse, idempotency claims, or billing mutations.

### Security — Webhook Signature Validation

**File:** `src/lib/razorpay/webhook-validator.ts:36-93`

```
1. Extract x-razorpay-signature header
2. Reject malformed/oversized declared bodies above 256KB
3. Apply `WEBHOOK` public rate limit
4. Read the raw body with a 256KB stream cap
5. HMAC-SHA256(requestBody, RAZORPAY_WEBHOOK_SECRET)
6. Timing-safe comparison (crypto.timingSafeEqual)
7. If mismatch -> 400 "Invalid signature"
```

### Durable Webhook Replay Guard

Before any billing mutation, the webhook handler claims a server-only document in `razorpayWebhookEvents/{eventKey}`. The key accepts only bounded string provider identities, prefers Razorpay's webhook event id when valid, and falls back to a stable hash of the signed raw body. An existing row is admitted only when version 1, embedded event key, UUID attempt, positive Firestore timestamps, nonnegative safe retry count, bounded nullable provider metadata, state and processing-lease shape all agree. Malformed persisted state throws through the route's retryable `503` path; a bare or conflicting `processed` status can never suppress a signed event as a duplicate. Valid already processed events return `status: duplicate`. An actively locked event returns `503` with `Retry-After` so Razorpay keeps a recovery delivery available if the original worker dies. Failed or expired claims receive a new attempt ID. Exact transactional terminal replacement requires the current attempt, prunes stale failure/lease fields, and never lets an old worker replace a newer `processed` result. Payment-failure and processing-failure alerts use deterministic document IDs, while the owner-message fallback uses the event key rather than wall-clock time.

Answerlattice top-up settlement and paid-order replay mirror only the transaction-current projected subscription. The projection requires exact AL product/scope aliases, nonnegative safe credit scalars, a valid optional reset period and bounded optional subscription identities. Store summary repair never numerically coerces raw persisted fields or reuses the pre-transaction subscription after the settlement transaction has selected newer truth.

Webhook payment-transaction audit rows are deterministic by event key. The shared Admin serializer preserves actual Firestore `FieldValue` sentinels instead of converting `serverTimestamp()` to an empty map. New writes require exact dual product identity and either no workspace scope or complete agreeing numeric tenant/store aliases. A retry transaction preserves the first valid `createdOn`, advances `modifiedOn`, and treats product, workspace, event/type, provider entity IDs, amount, currency and provider event time as immutable before merging non-identity enrichment. Provider amount/time values are runtime-checked without numeric coercion. Top-up audit history is written only after immutable settlement supplies canonical billing scope/value; unknown non-top-up orders remain unscoped and cannot enter owner history. Legacy rows continue to render from provider `created_at`; conflicting/malformed rows require guarded review rather than silent reassignment.

Webhook product selection is resolved before the central event claim or any product-local Admin client is used. Every present `pId`/`productId` across the top-level envelope and payment/refund/subscription/order notes must be exact `ML` or `AL` and all aliases must agree. Explicit conflict/unknown identity returns 400. Legacy missing-note subscription events query both product stores; lookup failure returns retryable 503, dual match is rejected, and a unique match selects the product. Missing-note events without a subscription retain the legacy MenuList fallback but remain subject to exact settlement/audit boundaries.

### Handled Events

| Event                    | Action                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `subscription.activated` | Set status "active", update billing dates, reset credits, store payment method         |
| `subscription.charged`   | Same as activated — reset monthlyCredits, update cycle dates, append to billingHistory |
| `subscription.completed` | Set status "completed", update subscriptionEndDate                                     |
| `subscription.cancelled` | Apply cancelled status idempotently, synchronize entitlement, record churn, notify once |
| `subscription.halted`    | Set status "past_due", record pastDueSinceAt                                           |
| `payment.failed`         | Set status "past_due" with fixed recovery metadata and product-correct founder alert  |
| `order.paid`             | Settle a pending enhancement-pack snapshot exactly once when browser verification is absent |

### Key Webhook Logic (subscription.activated / subscription.charged)

**File:** `src/app/api/razorpay/webhook/route.ts:154-208`

```
1. Extract subscriptionEntity and paymentEntity from event payload
2. getSubscriptionById(subscriptionEntity.id) — find our Firestore doc
3. getPlanDetailsFromConstants(notes) — get plan from local constants
4. Extract payment method (card brand/last4 or UPI VPA)
5. Compute billing-period key (same anchor-day logic as verify-subscription):
   - newCycleStart = subscriptionEntity.current_start
   - rawAnchorDay = newCycleStart day-of-month
   - Cap anchor to days in current month
   - If today < anchor: still previous period
   - key = year * 100 + month
6. Build update:
   - status: "active"
   - monthlyCredits: reset to monthlyCreditsAllowance
   - creditsLastResetMonth: billing-period key
   - cycleStartDate/EndDate from Razorpay current_start/current_end
   - renewsOn from charge_at
   - subscriptionEndDate calculated from start_at + total_count
   - Append payment ID to billingHistory
   - Append status entry to statuses array
7. updateSubscription()
```

### Transaction Logging

**File:** `src/app/api/razorpay/webhook/route.ts:119`

Every webhook event is logged to the `paymentTransactions` collection as a lean v2 audit summary instead of the full Razorpay payload. This creates a complete audit trail while limiting Firestore document size and read cost. The event summary is enriched with:

- `tenantId` and `storeId` (extracted from subscription/order notes)
- `transactionType`: "subscription" or "topup"
- `invoiceUrl`: fetched from Razorpay Invoices API for `subscription.charged` and `order.paid` events

Billing history rendering uses `src/lib/billing/billingHistoryFormatter.ts` so desktop and mobile both accept lean v2 summaries and legacy raw Razorpay payload rows. The formatter keeps webhook documents small while preserving invoice, amount, status, billing-cycle, and top-up credit display. If Razorpay omits `creditAmount` from a top-up webhook row but the pack name/amount still matches the configured pack catalog, the UI uses the configured pack credit count for display without adding a Firestore read.

---

## 9. Flow 5: Plan Upgrade

**Entry Point:** Owner dashboard → "Upgrade Plan" button
**Frontend:** `usePaymentHandler.ts:129-145` → `onUpgradePlan()`
**Backend:** `src/app/api/razorpay/upgrade-subscription/route.ts:13-120`

### Sequence

```
FRONTEND:
1. User clicks "Upgrade Plan" → PricingPlansModal opens (filtered to higher plans)
2. Selects new plan → UpgradeConfirmationModal shows:
   - New plan details + price
   - RemainingCreditNote showing credit carry-forward calculation
3. User confirms → onUpgradePlan() called

4. createSubscription(newPlan, currency, user, oldSubscriptionId)
   → This sends `replacementForSubscriptionId` to the server
   → The server verifies both rows share the direct signed-in billing scope
   → It reuses an exact matching pending provider checkout or creates one marked with the old subscription ID
   → Browser-supplied credit math is not authoritative
6. User pays via Razorpay Checkout
7. verify-subscription activates the new subscription and calls the shared replacement finalizer
   → Fetch old provider subscription; cancel unless already cancelled/completed/expired
   → Atomically expire old local row and add transaction-current remaining credits to the new row
   → Guard replay with `carryForwardFromSubscriptionId`
   → Synchronize old and new entitlement mirrors
   → The signed activation/charge webhook runs the same finalizer if the browser callback is lost

8. POST /api/razorpay/upgrade-subscription
   Body: { nSi: newSubscriptionId, oSi: oldSubscriptionId }
   This legacy browser follow-up is an idempotent recovery call, not the sole finalization path.

BACKEND:
9. withAuth() + rate limit + bounded JSON body parse (8KB cap)
10. Resolve billing scope, verify tenant/store access, and check billing mutation permission
11. getProductSubscriptionById(oldSubscriptionId) and getProductSubscriptionById(newSubscriptionId)
12. Verify both old and new subscriptions belong to the same tenant/store billing scope
13. Require the new subscription's durable replacement marker to match the old subscription
14. Fetch the old provider subscription through its validated provider identity
15. If it is not cancelled/completed/expired → cancel it immediately
16. Run `applyProductSubscriptionUpgradeCarryForward()` in one Firestore transaction:
    - re-read both rows and their exact scope
    - compute remaining credits from the transaction-current old row
    - expire the old row and append status history
    - add credits to the new row's existing `topUpCredits`
    - set `carryForwardCredits` and `carryForwardFromSubscriptionId`
17. Synchronize both old and replacement entitlement states
18. Return { success: true }
```

### Credit Carry-Forward Calculation

**File:** `src/utils/razorpay.ts:34-74` → `calculateRemainingCredits()`

```
Monthly plans: totalRemainingCredits = monthlyCredits + topUpCredits
Yearly plans:
  monthsRemaining = (endYear - todayYear) * 12 + (endMonth - todayMonth)
  if today.date <= end.date: monthsRemaining += 1
  totalRemainingCredits = unusedThisMonth + (monthsRemaining - 1) * monthlyCreditsAllowance + topUpCredits
```

All remaining credits become `topUpCredits` on the new subscription (they never expire).

---

## 10. Flow 6: Subscription Cancellation

**Entry Point:** Owner dashboard → "Cancel Subscription" button
**Frontend:** `ActiveSubscriptionCard.tsx:59-72` → `CancellationModal.tsx`
**Backend:** `src/app/api/razorpay/cancel-subscription/route.ts:12-116`

### Sequence

```
FRONTEND:
1. User clicks "Cancel Subscription"
2. CancellationModal opens — 2-step animated flow:
   Step 1: Select reason (6 predefined + "Other" with textarea)
   Step 2: Confirm with checkbox consent
3. User confirms → onCancelSubscription()
4. POST /api/razorpay/cancel-subscription
   Body: { reason, otherReason, consent, subscriptionId? }

BACKEND:
5. withAuth() + rate limit + bounded JSON body parse (8KB cap)
6. Resolve billing scope, verify tenant/store access, and check billing mutation permission
7. Find subscription: by subscriptionId or direct current-store subscription lookup
8. Verify subscription belongs to user's tenant/store
9. Fetch subscription from Razorpay
10. If Razorpay status is "completed" → skip cancel (already ended)
11. Else → razorpayClient.subscriptions.cancel(providerSubscriptionId)
    This is IMMEDIATE cancellation on Razorpay's side
12. Verify Razorpay status is now "cancelled" or "completed"
13. updateSubscription():
    - status: "cancelled"
    - cycleEndDate: preserved (user keeps access until end of paid period)
    - subscriptionEndDate: set to cycleEndDate
    - Append status entry with reason, otherReason, consent
14. Return { success: true }
```

### Cancellation Reasons

**File:** `src/components/templates/main-app/billing/CancellationModal.tsx:11-18`

```
- "No longer need a website"
- "Lack of functionality"
- "Too expensive"
- "Found another tool"
- "Purchased accidentally"
- "Other (Please specify)"
```

### Post-Cancellation Behavior

- User retains access until `cycleEndDate` (paid period end)
- Subscription status shows "Cancelled" with access-until date
- The `getActiveSubscriptionForStore()` query includes `cancelled` status + `cycleEndDate >= now` — so they still pass capacity checks
- The store and platform plan mirrors retain the purchased plan through that same paid cycle
- After `cycleEndDate` passes, the hourly leased maintenance task changes the row to `expired`, synchronizes those mirrors, and the subscription no longer appears in active queries

---

## 11. Flow 7: AI Enhancement Pack (Top-Up)

**Entry Point:** Owner dashboard → "Buy More Credits" or capacity exhaustion → "Get More Enhancements"
**Frontend:** `usePaymentHandler.ts:147-217` → `handleTopupPurchase()`
**Backend Create:** `src/app/api/razorpay/create-topup-order/route.ts:15-130`
**Backend Verify:** `src/app/api/razorpay/verify-topup/route.ts:11-157`

### Sequence

```
FRONTEND:
1. User clicks "Buy More Credits" → CreditsPackModal opens
2. Selects pack → handleTopupPurchase(pack, currency)

3. POST /api/razorpay/create-topup-order
   Body: { packId, currency }

BACKEND (create-topup-order):
4. withAuth() + verifyTenantAccess() + canManageSubscription
5. Rate limit: PAYMENT_TOPUP config
6. Resolve the canonical pack and active transaction target
7. razorpayClient.orders.create():
   - amount: pack price
   - currency
   - notes: { tenantId, storeId, userId, packId, creditAmount, packName, price }
8. Normalize the Razorpay order ID through `src/lib/billing/topupDocumentIdBoundary.ts`, then transactionally create `topups/{orderId}` with exact product/scope/user/billing-store/pack/value truth. Only an exact still-pending replay is accepted; no merge overwrite is allowed.
9. Return { order }

FRONTEND (continued):
10. Open Razorpay Checkout with order_id (NOT subscription_id — this is a one-time order)
11. User pays
12. POST /api/razorpay/verify-topup
    Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature }

BACKEND (verify-topup):
13. withAuth() + verifyTenantAccess() + canManageSubscription
14. Zod validation (VerifyTopupRequestSchema)
15. Verify Razorpay checkout signature
16. Normalize the checkout order ID through `src/lib/billing/topupDocumentIdBoundary.ts`, then read `topups/{orderId}` for idempotency
17. Fetch order and validate tenant/store notes
18. Fetch payment: razorpayClient.payments.fetch(payment_id)
19. If payment.status === "authorized" → programmatic capture:
    razorpayClient.payments.capture(payment_id, amount, currency)
20. Re-fetch payment → verify status === "captured" and payment.order_id matches
21. Find active subscription for store
22. Verify subscription belongs to tenant
23. Treat the persisted pending order snapshot—not mutable browser input or later constants—as settlement authority
24. In one Firestore transaction, re-read that exact subscription document, require both product aliases and both agreeing tenant/store aliases, bind the snapshot `billingStoreId` to the current subscription, require safe numeric credit state and a safe resulting sum, increment transaction-current `topUpCredits`, and mark `topups/{orderId}` as `paid`. Missing or changed subscription authority returns a reconciliation response without recreating the document.
25. Return { success: true, newCreditBalance }

FRONTEND (continued):
26. Update local state from `newCreditBalance`
27. Show success message

SIGNED WEBHOOK RECOVERY (when the browser callback is lost):
28. `order.paid` verifies the webhook signature and resolves the correct MenuList/Answerlattice product
29. `settleProductTopupFromProvider()` validates provider order/payment facts against the immutable pending snapshot
30. It runs the same exactly-once Firestore settlement transaction
31. Owner/internal notifications are sent only when that transaction reports a new application
```

### Key Difference: Orders vs Subscriptions

- **Subscriptions** are for recurring plan payments (Razorpay manages billing cycle)
- **Orders** are for one-time purchases (AI Enhancement Packs)
- Top-up uses `order_id` in Razorpay Checkout, not `subscription_id`
- Payments on orders may need **programmatic capture** (vs auto-capture on subscriptions)

---

## 12. Credit System — Monthly Reset

### Two-Layer Reset Mechanism

#### Layer 1: Webhook Reset (Monthly Plans)

**File:** `src/app/api/razorpay/webhook/route.ts:170-192`

When Razorpay fires `subscription.charged` (every billing cycle):

```
monthlyCredits = monthlyCreditsAllowance (e.g., back to 200)
creditsLastResetMonth = current billing-period key
```

#### Layer 2: Lazy Reset (Yearly Plans + Safety Net)

**File:** `src/lib/ai/capacityCheck.ts:160-195`

Before every paid AI call in `checkAICapacity()`:

```
currentBillingPeriod = getBillingPeriodKey(subscription.cycleStartDate)
if creditsLastResetMonth !== currentBillingPeriod:
    monthlyCredits = monthlyCreditsAllowance
    creditsLastResetMonth = currentBillingPeriod
    → write to Firestore (1 write, first AI call of billing month only)
```

#### Billing Period Key — Anchor Day Logic

**File:** `src/lib/ai/capacityCheck.ts:167-195` → `getBillingPeriodKey()`

```
Sub starts Feb 15 → anchorDay = 15
  Mar 1  (day 1 < 15)  → period key 202602 (still Feb's billing period — NO reset)
  Mar 15 (day 15 ≥ 15) → period key 202603 (new billing period — reset triggers)

Month-end edge case: anchorDay=31, February (28 days)
  anchorDay capped to min(31, 28) = 28
  Feb 28 triggers reset correctly.
  Without cap, credits would never reset in shorter months.
```

#### Why Both Layers?

- **Monthly plans:** Webhook handles reset reliably when Razorpay charges
- **Yearly plans:** No monthly webhook — lazy reset fills this gap
- **Safety net:** If webhook fails/delays, lazy reset catches it on next AI call
- **Race-safe:** Concurrent calls both reset to the same idempotent value

---

## 13. Grace Period & Past Due Handling

### Backend Logic

**File:** `src/database/subscriptions/index.ts:62-89`

When `getActiveSubscriptionForStore()` finds a subscription with `pastDueSinceAt`:

```
1. Calculate grace period: pastDueSinceAt + 7 days
2. If within grace period → return subscription (access granted)
3. If outside grace period:
   → Auto-expire subscription:
     status = "expired"
     cycleEndDate = now
     subscriptionEndDate = now
     Append "expired" status entry
   → Return null (no active subscription)
```

### Utility Function

**File:** `src/utils/razorpay.ts` → `getGracePeriodInfo()` and `getGracePeriodDisplayInfo()`

```typescript
getGracePeriodInfo(pastDueTimestamp, graceDays = 7)
→ Returns: { remainingDays, graceEndsDate, graceEndsTimestamp }

getGracePeriodDisplayInfo(pastDueTimestamp, graceDays = 7)
→ Returns known countdown metadata when pastDueSinceAt exists
→ Returns fixed "Payment recovery" / "Grace period details unavailable." fallback metadata when it does not
```

### Frontend Display

**File:** `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:155-161`

When `past_due`:

- Tag shows "Payment Failed" (warning color)
- Grace period countdown: "X days left" when `pastDueSinceAt` is known.
- Grace-period fallback: fixed "Grace period details unavailable." recovery copy when a legacy or malformed `past_due` doc has no `pastDueSinceAt`.
- Warning message: "Your last payment attempt failed..." followed by either known countdown recovery copy or the fixed unavailable fallback.
- Action buttons: "Cancel Subscription" + "Retry Payment" (links to Razorpay short_url)
- Webhook status remarks use fixed local text such as "Payment failed" or "Payment retry pending"; raw Razorpay `error_description` / `error_reason` values stay out of subscription history and platform alert messages.

---

## 14. Frontend — Owner Billing Dashboard

**File:** `src/components/templates/main-app/billing/index.tsx`

### Page Structure

```
BillingPage
├── Loading state (Spin + Alert)
├── ActiveSubscriptionCard (if subscription exists)
│   ├── Plan details (name, price, cycle dates)
│   ├── Status tag (Active/Cancelled/Past Due/Expired)
│   ├── Payment method display (Card brand/last4 or UPI VPA)
│   ├── Action buttons (context-dependent):
│   │   ├── Active: "Cancel" + "Upgrade Plan" (if not premium)
│   │   ├── Active (final cycle): "Change Plan"
│   │   ├── Cancelled/Expired: "Choose a New Plan"
│   │   └── Past Due: "Cancel" + "Retry Payment"
│   └── Credit Card (right column):
│       ├── Total Available Credits (monthlyCredits + topUpCredits)
│       ├── Monthly Credits progress bar (monthlyCredits / allowance)
│       ├── Top-up Credits count
│       └── "View Usage" + "Buy More Credits" buttons
├── BillingHistory (lazy-loaded table)
├── PricingPlansModal (upgrade/new plan selection)
├── UpgradeSubscriptionPayementSuccessModal (confetti)
├── CreditsPackModal (AI Enhancement Pack purchase)
└── NoSubscriptionView (if no subscription — "View Plans" CTA)
```

### Smart Button Logic

**File:** `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:76-107`

```
isFinalCycle = |renewsOn - subscriptionEndDate| <= 86400 (within 1 day)

Active + not final cycle → "Cancel" + "Upgrade" (if not premium)
Active + final cycle → "Change Plan" (subscription ends, need new one)
Cancelled/Expired → "Choose a New Plan"
Past Due + not final cycle → "Cancel" + "Retry Payment"
```

### Plan Filtering on Upgrade

**File:** `src/components/templates/main-app/billing/PricingPlansModal.tsx:212-223`

```
If upgrading from Starter → show Pro + Premium only
If upgrading from Pro → show Premium only
If new subscription → show all plans
```

### Currency Auto-Detection

**File:** `src/components/templates/main-app/billing/PricingPlansModal.tsx:226-229`

```typescript
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (userTimeZone === "Asia/Kolkata" || userTimeZone === "Asia/Calcutta") {
  setCurrency("INR");
}
```

---

## 15. Frontend — Website Subscription Management

**File:** `src/components/templates/website/platformSite/landingPage/pricing/SubscriptionManagement.tsx`

A separate subscription management page on the public website (shadcn/ui components instead of Ant Design). Shows:

- Current Plan card: name, price, billing cycle, status, payment method
- AI Credits card: monthly credits progress, top-up credits, total
- Navigation buttons: Dashboard, Transactions, Billing History
- Credit Packs CTA section
- Grace period info for past_due subscriptions

---

## 16. Security Implementation

### Authentication

All protected routes use `withAuth()` middleware:

| Route                                 | Auth Method           |
| ------------------------------------- | --------------------- |
| `/api/onboarding/create-subscription` | `withAuth()`          |
| `/api/razorpay/create-subscription`   | `withAuth()`          |
| `/api/razorpay/verify-subscription`   | `withAuth()`          |
| `/api/razorpay/upgrade-subscription`  | `withAuth()`          |
| `/api/razorpay/cancel-subscription`   | `withAuth()`          |
| `/api/razorpay/create-topup-order`    | `withAuth()`          |
| `/api/razorpay/verify-topup`          | `withAuth()`          |
| `/api/razorpay/webhook`               | HMAC-SHA256 signature |

### Tenant Isolation

Every protected route verifies `verifyTenantAccess(session, tenantId, storeId, request)`:

- Verify subscription belongs to the user's tenant/store
- Log security events on mismatch with `logger.security()` at CRITICAL level using bounded identifier presence/length metadata from `getBoundedRazorpaySecurityContext()` and `getBoundedRazorpayStringContext()`
- MenuList billing mutations also require `canManageBillingMutation()` to confirm the session store still belongs to the session tenant and is not inactive, soft-deleted, or platform-blocked before provider or Firestore mutation work continues.

### Input Validation

- 8KB bounded JSON body cap before Zod validation on authenticated Razorpay payment action routes.
- 16KB bounded JSON body cap before onboarding subscription validation and tenant/store creation.
- `VerifyPaymentRequestSchema` (Zod) on verify-subscription and `VerifyTopupRequestSchema` on verify-topup.
- `OnboardingSubscriptionSchema` (Zod) on onboarding.
- Subscription create, upgrade, cancel, pause, resume, and top-up create routes validate through the shared billing API schemas.

### Rate Limiting

| Route               | Config Key             |
| ------------------- | ---------------------- |
| Onboarding          | `PAYMENT_ONBOARDING`   |
| Create subscription | `PAYMENT_SUBSCRIPTION` |
| Create topup        | `PAYMENT_TOPUP`        |
| Cancel/upgrade/pause/resume | `SUBSCRIPTION_MUTATION` |

Provider keys keep the route/product bucket names but hash authenticated user and tenant key material before calling the shared limiter. Raw user IDs and tenant IDs must not be stored in Razorpay or onboarding subscription rate-limit provider keys.

Onboarding subscription security events use `getBoundedSecurityRouteContext(session, request)` for user/request route metadata and the bounded Razorpay/onboarding helpers for business, tenant, store, plan, and subscription fields. Raw `buildSecurityContext()` output must not be spread into onboarding subscription security logs.

### Webhook Security

**File:** `src/lib/razorpay/webhook-validator.ts`

- HMAC-SHA256 signature verification
- `crypto.timingSafeEqual()` — prevents timing attacks
- Secure logging via `secureLog()`/`secureError()` (no sensitive data in logs)

---

## 17. Database Access Layer (DAL)

**Files:** `src/database/subscriptions/index.ts` for read-only browser selection; `src/database/subscriptions/server.ts` for privileged server operations.

### Functions

| Function                                           | Purpose                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `getActiveSubscriptionForStore(tenantId, storeId)` | Browser/server variants query exact-dual-`ML` active/past_due/cancelled/paused subscriptions where cycleEndDate >= now, with grace handling and bounded visible fallbacks. |
| `createInitialSubscription(providerSubId, data)`   | Server-only create with Razorpay sub ID as Firestore document ID and exact dual-`ML` payload composition |
| `updateSubscription(subId, data)`                  | Server-only merge update that rejects supplied foreign product aliases and writes both exact `ML` aliases |
| `getSubscriptionById(id)`                          | Server-only direct read that returns only an exact-dual-`ML` document |

### Active Subscription Query

**Files:** `src/database/subscriptions/index.ts` and `src/database/subscriptions/server.ts`

```typescript
const q = query(
  getCollectionRef(),
  where("status", "in", ["active", "past_due", "cancelled", "paused"]),
  where("cycleEndDate", ">=", now),
  where("tenantId", "==", tenantId),
  where("storeId", "==", storeId),
  limit(1),
);
```

Note: `cancelled` and `paused` subscriptions are included because the user still has access until `cycleEndDate`. The grace period check on `past_due` happens after the query. Expired-cycle paused and pending rows may remain visible through bounded UI fallbacks, but they do not grant access.

### Patterns

- All functions wrapped in `apiCallComposer()` (error handling)
- Client DAL writes use `requestBodyComposer(..., { isNew: true | false })` with explicit lifecycle intent (adds tId, sId, uId, and write timestamps without resetting creation metadata on updates)
- Collection name from `DB_COLLECTIONS.SUBSCRIPTIONS`
- `setDoc(docRef, data, { merge: true })` for updates

---

## 18. Billing History & Transaction Logging

### Payment Transactions (Server-Owned Webhook Log)

**Writer:** `src/lib/billing/productBillingServer.ts::writeProductPaymentTransactionAudit()`

**Reader:** `src/database/subscriptions/paymentTransactions.ts::getBillingHistoryForStore()`

**Collection:** `payment_transactions` (via `DB_COLLECTIONS.PAYMENT_TRANSACTIONS`)

Verified webhook events use deterministic server-owned document IDs. Firestore rules deny all client writes, and the browser DAL exports no ledger writer. The collection is used for:

- Audit trail of all Razorpay events
- Billing history display in the frontend

**May 20, 2026 hardening:** New webhook rows use `auditVersion: 2` and store only the fields needed for audit and billing history (`event`, tenant/store ids, payment/subscription/order ids, amount, currency, status, invoice id/url, subscription cycle, quantity, and top-up pack metadata). Raw provider payloads are not stored for new rows. Desktop and mobile billing history still fall back to legacy raw rows.

**July 11, 2026 history admission:** The shared formatter accepts finite positive seconds/milliseconds plus valid JavaScript Date and Firestore Timestamp shapes. Missing, malformed, throwing, or invalid dates are omitted; they are never replaced with the current time. The dead client `createPaymentTransaction()` export was removed because rules already require server-only writes.

**July 13, 2026 scope admission:** Desktop and mobile pass the signed tenant/store values to `getBillingHistoryForStore()` without numeric coercion. The DAL applies the same exact positive subscription-scope document-ID boundary used by active-subscription readers before query construction. Null, zero, exponent-like, whitespace, decimal, leading-zero, unsafe, or otherwise malformed identities return an empty history with zero Firestore reads; valid tenant/store scope keeps the existing newest-50 query.

**July 22, 2026 product admission:** MenuList payment-history and active/paused/pending subscription queries now prove both `pId: ML` and `productId: ML`; shared subscription, top-up and transaction rules require the same exact pair. Answerlattice fallback subscription/history queries likewise prove both `AL` aliases. Browser filtering is defense in depth, not authorization. A guarded MenuList-only migration completes `productId: ML` for selected legacy `payment_transactions` or `subscriptions` rows only when they already carry explicit `pId: ML` evidence and canonical scope; it never guesses alias-less or conflicting product ownership.

Pending subscriptions can be cancelled before authentication/activation. This is expected for abandoned hosted checkout or cleanup flows, so the shared state machine allows `pending -> cancelled`.

### Billing History Query

**File:** `src/database/subscriptions/paymentTransactions.ts:29-54`

```typescript
const q = query(
  getCollectionRef(),
  where("pId", "==", PRODUCT_IDS.MENULIST),
  where("productId", "==", PRODUCT_IDS.MENULIST),
  where("tenantId", "==", tenantScope.numericId),
  where("storeId", "==", storeScope.numericId),
  where("event", "in", ["subscription.charged", "order.paid", "owner_referral.reward_issued"]),
  orderBy("created_at", "desc"),
  limit(50),
);
```

### Frontend Billing History

**File:** `src/components/templates/main-app/billing/index.tsx:53-101` → `fetchBillingHistory()`

Transforms raw webhook events into display format:

| Event Type                 | Display Type           | Extra Info                       |
| -------------------------- | ---------------------- | -------------------------------- |
| `subscription.charged`     | "Subscription Payment" | Billing cycle dates, invoice URL |
| `order.paid` (with packId) | "Credit Pack Purchase" | Pack name, credits received      |

**File:** `src/components/templates/main-app/billing/BillingHistory.tsx` — Table with:

- Date, Type, Description, Amount, Billing Cycle, Credits, Status, Invoice link

---

## 19. Utility Functions

### getGracePeriodInfo()

**File:** `src/utils/razorpay.ts:4-32`

```
Input: pastDueTimestamp, graceDays (default 7)
Output: { remainingDays, graceEndsDate, graceEndsTimestamp }
```

### calculateRemainingCredits()

**File:** `src/utils/razorpay.ts:34-74`

```
Input: activeSubscription (FirestoreSubscriptionDoc)
Output: { unusedThisMonth, monthsRemaining, monthlyCreditsAllowance, totalRemainingCredits }

Monthly: totalRemainingCredits = monthlyCredits + topUpCredits
Yearly: totalRemainingCredits = unusedThisMonth + (monthsRemaining - 1) * allowance + topUpCredits
```

Used in:

- `RemainingCreditNote.tsx` — shows carry-forward on upgrade
- `usePaymentHandler.ts` — calculates carry-forward for upgrade flow

### getOrCreateRazorpayPlan()

**File:** `src/lib/razorpay/plan-handler.ts:57-130`

Deduplicates Razorpay plans using a lookup key in `notes`. Prevents creating duplicate plans for the same price/currency/interval combination. Diagnostics are bounded through `getRazorpayPlanLogContext()` and `razorpay_plan_lookup_or_create_failed`; callers receive fixed local failure text instead of provider messages.

### getBillingPeriodKey()

**File:** `src/lib/ai/capacityCheck.ts:167-195`

Calculates billing-cycle-aware YYYYMM key from subscription's `cycleStartDate`. Uses anchor day (day subscription started) instead of calendar month to determine period boundaries. Handles month-end edge cases by capping anchor to days in current month.

---

## 20. Environment Variables

| Variable                      | Purpose                         | Used In                                 |
| ----------------------------- | ------------------------------- | --------------------------------------- |
| `RAZORPAY_KEY_ID`             | Server-side API key             | `src/lib/razorpay/razorpay.ts`          |
| `RAZORPAY_KEY_SECRET`         | Server-side API secret          | `src/lib/razorpay/razorpay.ts`          |
| `RAZORPAY_WEBHOOK_SECRET`     | Webhook signature verification  | `src/app/api/razorpay/webhook/route.ts` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client-side key for Checkout.js | `src/hooks/usePaymentHandler.ts`        |

---

## 21. Key Architecture Decisions

1. **Razorpay-only:** Stripe fully removed (Feb 2026). Single payment provider reduces complexity.
2. **Store-scoped rows with HQ inheritance:** Direct subscriptions and billing cycles are stored per billed store. Outlets may inherit the HQ subscription and shared credit balance for entitlement; only the directly billed signed-in store can mutate recurring provider state.
3. **Razorpay sub ID = Firestore doc ID:** The `providerSubscriptionId` is used as the Firestore document ID. This creates a 1:1 mapping and simplifies lookups.
4. **Credits carry forward on upgrade:** Remaining credits (monthly + topUp + future months for yearly) are calculated and added as `topUpCredits` on the new subscription.
5. **Two-layer credit reset:** provider-payment transaction (monthly charges) + lazy reset/debit transaction in `checkAICapacity()` and `consumeAICapacity()` (yearly plans + safety net). Both use the shared UTC anchor-period contract and serialize against current balances.
6. **Billing-period-aware reset:** Uses subscription anchor day, not calendar month. Prevents premature resets for mid-month subscriptions.
7. **7-day grace period:** Enforced in DAL (`getActiveSubscriptionForStore`), not in a Cloud Function. Auto-expires on next query after grace period.
8. **Optimistic verification:** `verify-subscription` activates the subscription immediately after payment, without waiting for the webhook. Both webhook and verify converge to the same state.
9. **Top-ups use Orders, not Subscriptions:** AI Enhancement Packs use Razorpay Orders API (one-time) with programmatic capture. Credits are added to `topUpCredits` which never reset.
10. **Transaction logging:** Every webhook event is stored in `paymentTransactions` collection. Serves as audit trail and billing history source.
11. **Plan deduplication:** `getOrCreateRazorpayPlan()` uses a lookup key to avoid creating duplicate plans on Razorpay.
12. **Immediate cancellation:** Cancellations are immediate on Razorpay (not end-of-cycle). User retains access until `cycleEndDate` via our Firestore query logic.

---

## 22. Changes, Fixes & Improvements Log

### May 20, 2026 — Production Audit Hardening

- **Webhook replay protection:** Added `razorpayWebhookEvents` server-only idempotency locks. Duplicate signed events now return without repeating payment transaction writes or subscription mutations.
- **State transitions now block invalid writes:** API routes, DAL grace expiry, webhook handlers, and reconciliation only write status changes when `subscriptionStateMachine.ts` allows the transition.
- **State-machine diagnostics bounded:** App-side transition validation and the active Functions reconciliation mirror now log invalid/unknown transition warnings with fixed text plus bounded status/context presence metadata only.
- **Payment mutation lookup tightened:** Cancel, pause, and resume no longer use master/outlet fallback when no subscription ID is provided; they fetch only the current store's direct subscription.
- **Mutation validation tightened:** Verify-subscription now requires `razorpay_subscription_id`; cancel, pause, resume, and upgrade use Zod schemas and return controlled 400/404/409 responses instead of leaking internal errors.
- **Reconciliation diagnostics bounded:** The active Firebase Functions reconciler logs stable reconciliation failure codes with bounded subscription/provider metadata, update counts/booleans, and no raw sync detail rows in local dev logs. The deprecated `/api/internal/reconcile-subscriptions` fallback route has been removed.
- **Client mutation errors fixed:** Dashboard cancel and upgrade promises now stop after failed responses instead of rejecting and then resolving.
- **Rate limiter outage behavior improved:** Upstash provider calls now have a short timeout and temporary bypass window so a Redis outage does not stall billing actions.

### Feb 10, 2026 — Monthly Credit Reset Bug Fix

**Problem:** `monthlyCredits` was set at subscription creation but NEVER reset on renewal. Monthly subscribers kept depleted balances after paying again. Yearly subscribers had no monthly reset at all.

**Root Cause:** Missing reset logic in both webhook handler and capacity check.

**Fix:** Two-layer reset mechanism:

- **Layer 1 (Webhook):** Reset `monthlyCredits` to `monthlyCreditsAllowance` on `subscription.charged` event
- **Layer 2 (Lazy):** Reset in `checkAICapacity()` using `creditsLastResetMonth` field comparison

**Files Changed:**

| File                                                        | Change                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/types/razorpay.ts`                                     | Added `creditsLastResetMonth?: number` to `FirestoreSubscriptionDoc` |
| `src/app/api/razorpay/webhook/route.ts:170-192`             | Reset monthlyCredits + set creditsLastResetMonth on charge           |
| `src/app/api/razorpay/verify-subscription/route.ts:162-170` | Set creditsLastResetMonth on first verification                      |
| `src/app/api/razorpay/create-subscription/route.ts:180`     | Initialize creditsLastResetMonth on creation                         |
| `src/app/api/onboarding/create-subscription/route.ts:295`   | Initialize creditsLastResetMonth on onboarding                       |
| `src/lib/ai/capacityCheck.ts:160-195`                       | Lazy reset logic with getBillingPeriodKey()                          |

### Feb 10, 2026 — Calendar Month → Billing Period Key

**Problem:** Initial `creditsLastResetMonth` used calendar month YYYYMM (e.g., 202602 = February). A subscription starting Feb 15 would get a premature reset on March 1 (new calendar month, but still in same billing period).

**Fix:** Changed to billing-cycle-aware period key based on subscription's anchor day. `getBillingPeriodKey(cycleStartDate)` uses the day-of-month from the subscription start date as the anchor.

### Feb 10, 2026 — Month-End Edge Case Fix

**Problem:** If a user subscribes on Jan 31 (anchorDay=31), February has only 28 days. The check `now.getDate() < anchorDay` would always be true (no day in Feb is ≥ 31), causing credits to never reset.

**Fix:** Cap `anchorDay` to `Math.min(rawAnchorDay, daysInCurrentMonth)`. Applied in:

- `src/lib/ai/capacityCheck.ts:182` (lazy reset)
- `src/app/api/razorpay/webhook/route.ts:177` (webhook reset)
- `src/app/api/razorpay/verify-subscription/route.ts:167` (verification)

### Feb 2026 — Stripe Removal

**What:** All Stripe-related code, types, API routes, and UI components removed. Razorpay is now the sole payment provider.

**Files Removed:**

| Deleted File                                       | Razorpay Equivalent                          |
| -------------------------------------------------- | -------------------------------------------- |
| `billingStripe/NoSubscriptionView.tsx`             | `billing/NoSubscriptionView.tsx`             |
| `billingStripe/PlanDetails.tsx`                    | `billing/PricingPlansModal.tsx`              |
| `billingStripe/SubscribeButton.tsx`                | `hooks/usePaymentHandler.ts`                 |
| `billingStripe/ManageSubscription.tsx`             | `billing/ActiveSubscriptionCard.tsx`         |
| `billingStripe/type.ts`                            | `data/common.ts`                             |
| `api/subscriptions/cancel/route.ts`                | `api/razorpay/cancel-subscription/route.ts`  |
| `api/subscriptions/create-payment-intent/route.ts` | `api/razorpay/create-subscription/route.ts`  |
| `api/subscriptions/update/route.ts`                | `api/razorpay/upgrade-subscription/route.ts` |
| `api/subscriptions/verify-session/route.ts`        | `api/razorpay/verify-subscription/route.ts`  |
| `api/webhook/route.ts` (Stripe)                    | `api/razorpay/webhook/route.ts`              |
| `lib/stripe.ts`                                    | `lib/razorpay/razorpay.ts`                   |
| `database/subscriptions/stripe.ts`                 | `database/subscriptions/index.ts`            |

No features were lost in the migration.

---

## 23. Razorpay Official Docs Audit (Feb 10, 2026)

> **Source:** Deep cross-reference of our codebase against official Razorpay documentation (razorpay.com/docs). All subscription API endpoints, webhook events, lifecycle states, payment retries, international payments, and SaaS patterns reviewed.

### 23.1 Subscription Lifecycle States — Our Coverage

Razorpay defines **9 subscription states**. Here's what we handle vs what we don't:

| Razorpay State     | Webhook Event                | Our Handling                                                                                                                                                                                 | Status             |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `created`          | —                            | Set when `createInitialSubscription()` writes `status: "pending"`                                                                                                                            | ✅ Handled         |
| `authenticated`    | `subscription.authenticated` | NOT explicitly handled — falls to `default` case in webhook. OK because subscription progresses to `active` next.                                                                            | ⚠️ Logged only     |
| `active`           | `subscription.activated`     | Full handling: status → "active", billing dates set, credits reset, payment method stored                                                                                                    | ✅ Handled         |
| `active` (renewal) | `subscription.charged`       | Full handling: same as activated — credits reset, cycle dates updated                                                                                                                        | ✅ Handled         |
| `pending`          | `subscription.pending`       | ✅ Handled (Feb 11, 2026): sets `past_due` + `pastDueSinceAt`, supports both payment-entity and subscription-entity paths                                                                    | ✅ Handled         |
| `halted`           | `subscription.halted`        | Handled: status → "past_due", `pastDueSinceAt` recorded                                                                                                                                      | ✅ Handled         |
| `cancelled`        | `subscription.cancelled`     | Webhook applies the cancelled transition idempotently, synchronizes entitlement, records churn, and sends owner lifecycle copy only on a new application                                    | ✅ Handled         |
| `completed`        | `subscription.completed`     | Handled: status → "completed", `subscriptionEndDate` updated                                                                                                                                 | ✅ Handled         |
| `paused`           | `subscription.paused`        | ✅ Handled (Feb 11, 2026): sets `status: "paused"`, records in statuses array. New API route + frontend UI.                                                                                  | ✅ Handled         |
| `resumed`          | `subscription.resumed`       | ✅ Handled (Feb 11, 2026): sets `status: "active"`, records in statuses array. New API route + frontend UI.                                                                                  | ✅ Handled         |
| `expired`          | —                            | Not a Razorpay webhook event. Razorpay expires subscriptions when `start_at` time passes without authentication. Our internal "expired" status is used for upgrades and grace period expiry. | ✅ Different usage |

### 23.2 Critical Findings

#### Historical Finding #1: `subscription.pending` Was Not Explicitly Handled — Resolved

**Razorpay docs say:** When auto-charge fails, subscription moves to `pending`. Razorpay retries automatically (for cards). If ALL retries fail → `halted`.

**Previous code:** The `pending` event fell to the webhook default case, so Firestore could remain `active` until a companion failure or halted event arrived.

**Current code:** `subscription.pending`, `payment.failed`, and `subscription.halted` share the explicit recovery branch. They apply `past_due` state idempotently and record the correct recovery history without waiting for a later event.

**Status:** ✅ Resolved Feb 11, 2026 and rechecked July 14, 2026.

#### Finding #2: Cancellation Uses Immediate Cancel, Not `cancel_at_cycle_end` ⚠️

**Razorpay docs say:** Cancel API supports `cancel_at_cycle_end: true` — subscription stays `active` until billing cycle ends, then moves to `cancelled`.

**Our code:** `cancel-subscription/route.ts:80` calls `razorpayClient.subscriptions.cancel()` WITHOUT `cancel_at_cycle_end` parameter (defaults to `false` = immediate cancel).

**What we do instead:** We cancel immediately on Razorpay's side but preserve `cycleEndDate` in Firestore so user retains access until end of paid period. The `getActiveSubscriptionForStore()` query includes `cancelled` status with `cycleEndDate >= now`.

**Assessment:** This is a **valid design choice**, not a bug. Using `cancel_at_cycle_end: true` would keep Razorpay billing active until cycle end (which we DON'T want — we want to stop all future charges immediately). Our approach is correct: cancel on Razorpay immediately, grant access locally until paid period ends.

**Confirmation:** ✅ Correct as-is. No change needed.

#### Finding #3: Upgrade Uses Cancel + New Sub, Not Razorpay's Update API

**Razorpay docs say:** You can update a subscription's plan using the Update Subscription API with `schedule_change_at: "now"` or `"cycle_end"`. Razorpay handles prorated charges/refunds automatically.

**Our code:** `upgrade-subscription/route.ts` cancels the old subscription, creates a new one, and carries forward credits manually.

**Assessment:** Our approach is **intentionally different** and correct for our use case:

- Razorpay's Update API changes the plan in-place (same `sub_id`). This means we'd need to handle prorated invoice events, credit note refunds, and billing cycle changes.
- Our cancel-and-create approach gives us full control: clean credit carry-forward, new subscription doc, no prorated charge complexity, supports monthly↔yearly frequency changes.
- Razorpay's Update API has a limitation: "If plans have different billing cycles, the new plan is billed at the new interval, starting on the day of the change" — which is exactly what we want, but our approach gives us more predictability.

**Confirmation:** ✅ Correct design choice. More control, simpler mental model.

#### Finding #4: `payment.failed` Handler Assumes `subscription_id` Exists

**Our code:** `webhook/route.ts:128-153` — The `payment.failed` case accesses `paymentEntity.subscription_id`. For subscription payments this works. But `payment.failed` can also fire for:

- Failed top-up order payments (which don't have `subscription_id`)
- Failed standalone payments

**Current protection:** Line 131 checks `if (paymentEntity.subscription_id)` before proceeding. This is correct.

**Assessment:** ✅ Already guarded correctly.

#### Finding #5: Webhook Signature Validation — Raw Body ✅

**Razorpay docs explicitly warn:** "Ensure that the webhook body is passed as an argument in the raw webhook request body. Do not parse or cast the webhook request body."

**Our code:** `webhook/route.ts:78` correctly uses `await request.text()` (raw body) for signature validation, then `JSON.parse(requestBody)` separately.

**Confirmation:** ✅ Correct implementation per Razorpay's explicit warning.

#### Finding #6: `total_count` Updated for Auto-Renewal ✅

**Razorpay docs say:** `total_count` = number of billing cycles. For yearly plan billed yearly, `total_count: 1` means one charge (1 year).

**Previous code:** `totalCount = 1` for yearly, `totalCount = 24` for monthly.

**Updated code (Feb 11, 2026):** `totalCount = 3` for yearly (3-year auto-renewal), `totalCount = 36` for monthly (3-year auto-renewal). Updated in both `create-subscription/route.ts` and `onboarding/create-subscription/route.ts`.

**Rationale:** Yearly subscriptions with `total_count: 1` moved to `completed` after first charge, forcing manual renewal. Now with `total_count: 3`, Razorpay auto-charges yearly for up to 3 years. Monthly subscriptions extended from 24 to 36 cycles (3 years). Users who want to stop renewing can cancel anytime.

**Confirmation:** ✅ Updated. Both subscription creation routes now consistent at 3-year total_count.

#### Finding #7: `lastWebhook` Field — Now Updated ✅

**Previous state:** `FirestoreSubscriptionDoc` had `lastWebhook` field but no webhook code updated it.

**Fixed (Feb 11, 2026):** Added `lastWebhook: { event: event.event, timestamp: Timestamp.now() }` to ALL webhook update payloads:

- `payment.failed` / `subscription.halted` / `subscription.pending` case
- `subscription.activated` / `subscription.charged` case
- `subscription.completed` case
- `subscription.cancelled` case (idempotent cancelled transition plus `lastWebhook`)
- `subscription.paused` case (new)
- `subscription.resumed` case (new)

**Status:** ✅ DONE

### 23.3 Payment Retries & Dunning — Our Handling

**Razorpay's retry model (cards):**

1. Auto-charge fails → `subscription.pending` webhook
2. Razorpay retries automatically (next day for cards)
3. If retry succeeds → `subscription.charged` → back to `active`
4. If all retries fail → `subscription.halted` → no more auto-charges
5. Customer can change card → if successful charge → back to `active`
6. When moving from `halted` to `active`, previous unpaid invoices are NOT re-attempted

**Our handling:**

- `payment.failed` → status: "past_due" + `pastDueSinceAt` recorded ✅
- `subscription.halted` → status: "past_due" ✅
- 7-day grace period → auto-expire in `getActiveSubscriptionForStore()` ✅
- Frontend shows "Retry Payment" button linking to Razorpay `short_url` ✅
- `subscription.charged` (after successful retry) → resets to "active" ✅

**Gap identified:**

- Razorpay distinguishes `pending` (retrying) from `halted` (retries exhausted). We map both to `past_due`. This is acceptable for our use case — the user sees the same UX either way.
- We don't use Razorpay's "Change Card" flow (customer-facing link in Razorpay emails). Instead, we link to `short_url`. Per Razorpay docs, the email sent to customers already contains a link to change card details. ✅ OK — Razorpay handles customer communication when `customer_notify: true`.

**Our `customer_notify` setting:** We don't pass `customer_notify` in subscription creation, which **defaults to `true`** per Razorpay docs. This means Razorpay sends:

- Email on subscription start
- Email on successful charge
- Email on payment failure (with card change link)
- Email when subscription moves to halted

**Confirmation:** ✅ Correct. Razorpay handles dunning emails automatically.

### 23.4 India vs International — Currency & Payment Handling

**Razorpay docs say:**

- Supports 135+ currencies for international payments
- Amount must be in smallest currency unit (paise for INR, cents for USD)
- Currency parameter must match at order/subscription creation
- International payments require separate activation on Razorpay Dashboard
- Settlements for international payments happen in INR (for Indian businesses)

**Our implementation:**

| Check                       | Status | Evidence                                                                          |
| --------------------------- | ------ | --------------------------------------------------------------------------------- |
| Currency in plan creation   | ✅     | `plan-handler.ts:48` — `currency: currency` passed to Razorpay plan creation      |
| Amount in smallest unit     | ✅     | `PlatformPlansList.ts` stores amounts in paise/cents (e.g., 149900 = ₹1,499)      |
| Currency auto-detection     | ✅     | `PricingPlansModal.tsx:226-229` — timezone-based: Asia/Kolkata → INR, else USD    |
| Separate plans per currency | ✅     | `plan-handler.ts:23` — lookup key includes currency: `"B2C_PRO_MONTH_INR_149900"` |
| Top-up currency support     | ✅     | `create-topup-order/route.ts:102` — currency passed to `orders.create()`          |
| Zod validation for currency | ✅     | `apiSchemas.ts:148` — `z.enum(['INR', 'USD'])`                                    |

**Gap identified:**

- **Timezone-based currency detection** could be inaccurate. An Indian user traveling abroad would get USD pricing. A US-based Indian would get USD pricing. This is acceptable at launch but could be improved with IP-based geolocation or explicit user preference.
- **No currency switching UI** — once set, users can't change currency. This is fine because subscriptions are locked to a currency on Razorpay's side.

**Razorpay international activation requirement:**

- International payments must be enabled on the Razorpay Dashboard
- Requires additional KYC for Indian businesses accepting international payments
- **Action item:** Ensure international payments are activated before launching USD pricing

### 23.5 Date Handling — Detailed Verification

**Razorpay provides these timestamps (Unix seconds):**

- `current_start` — start of current billing cycle
- `current_end` — end of current billing cycle
- `charge_at` — when next charge will occur
- `start_at` — when subscription first started
- `ended_at` — when subscription was cancelled/completed
- `created_at` — when subscription was created

**Our mapping:**

| Razorpay Field  | Our Firestore Field                   | Conversion                                            | Status |
| --------------- | ------------------------------------- | ----------------------------------------------------- | ------ |
| `current_start` | `cycleStartDate`                      | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| `current_end`   | `cycleEndDate`                        | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| `charge_at`     | `renewsOn`                            | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| `start_at`      | `subscriptionStartDate`               | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| Calculated      | `subscriptionEndDate`                 | `start_at + total_count * interval`                   | ✅     |
| `ended_at`      | `subscriptionEndDate` (on completion) | `Timestamp.fromMillis(x * 1000)` or `Timestamp.now()` | ✅     |

**Subscription end date calculation — verified:**

- `getSubscriptionEndDate()` in both `webhook/route.ts:22-37` and `verify-subscription/route.ts:23-38`
- For YEAR: `startDate.setFullYear(startDate.getFullYear() + total_count)`
- For MONTH: `startDate.setMonth(startDate.getMonth() + total_count)`
- This correctly uses JavaScript's `Date` rollover handling (e.g., adding 1 month to Jan 31 = Mar 3, which matches Razorpay's billing behavior)

**Edge case consideration:** JavaScript's `setMonth()` can overflow. Jan 31 + 1 month = March 3 (not Feb 28). Razorpay handles month-end differently (may use Feb 28). For `total_count: 24` (monthly plans), the end date is approximate — but we also update `cycleEndDate` from Razorpay's actual values on each webhook, so the authoritative dates stay accurate.

### 23.6 SaaS Patterns Comparison — What Others Do

| SaaS Pattern                | Razorpay Support                     | Our Status                                               | Priority         |
| --------------------------- | ------------------------------------ | -------------------------------------------------------- | ---------------- |
| **Auto-retry on failure**   | ✅ Built-in (cards)                  | ✅ Razorpay handles                                      | N/A              |
| **Dunning emails**          | ✅ `customer_notify: true`           | ✅ Default behavior                                      | N/A              |
| **Grace period**            | ❌ Not built-in                      | ✅ 7-day grace in our DAL                                | N/A              |
| **Cancel at cycle end**     | ✅ `cancel_at_cycle_end`             | ⚠️ We do immediate cancel + local access until cycle end | OK               |
| **Pause/Resume**            | ✅ Pause/Resume API                  | Implemented but self-service disabled by `ENABLE_SUBSCRIPTION_PAUSE=false` (May 21, 2026) | Disabled by policy |
| **Plan upgrade (prorated)** | ✅ Update Subscription API           | ⚠️ We use cancel + new sub                               | OK (by design)   |
| **Plan downgrade**          | ✅ Update Subscription API           | ✅ Implemented (Feb 11, 2026) — same cancel+new flow     | Done             |
| **Invoice download**        | ✅ Razorpay generates invoices       | ✅ Fixed (Feb 11, 2026) — button condition corrected     | Done             |
| **Card change flow**        | ✅ Customer email link               | ✅ Razorpay emails contain link                          | N/A              |
| **Webhook idempotency**     | Recommended                          | ✅ payment/event transactions + deterministic event audit IDs | Done             |
| **Trial period**            | ✅ Supported                         | ❌ Not used                                              | N/A (not needed) |
| **Addons (extra charges)**  | ✅ Supported                         | ❌ Not used                                              | N/A              |
| **Scheduled plan changes**  | ✅ `schedule_change_at: "cycle_end"` | ❌ Not used                                              | P3               |

#### Finding #8: Webhook and Verification Idempotency — Transaction Boundary Added ✅

**Razorpay docs:** Webhooks can be retried if your endpoint returns non-2xx. The same event may arrive multiple times.

**Repaired (July 10, 2026):** Successful subscription payments now converge on `applyProductSubscriptionPayment()`. One Firestore transaction reads the authoritative subscription, checks the provider payment ID in `billingHistory`, validates the current transition, conditionally resets recurring credits once per provider billing cycle, appends the payment/status evidence once, and writes the result. The transaction ignores caller-supplied recurring and top-up balances.

```typescript
const paymentApplication = await applyProductSubscriptionPayment(productId, {
  billingPeriod,
  paymentHistoryId: providerPaymentId,
  statusEntry,
  subscriptionId,
  update: providerDatesAndPlanFields,
});
```

Non-payment subscription events use `applyProductSubscriptionWebhookEvent()`. The event key is recorded in a bounded recent history inside the same subscription transaction, so a retry after partial failure cannot append a status twice and concurrent provider events cannot overwrite one another's status history. Payment transaction audit documents use the deterministic webhook event key instead of random document IDs.

**Status:** ✅ DONE (payment, status-event, and audit-ledger idempotency transaction boundaries).

### 23.7 Razorpay Subscription Entity Fields We Don't Use

These fields exist in Razorpay webhook payloads but we don't store/use them:

| Razorpay Field          | What It Is                 | Should We Use It?                        |
| ----------------------- | -------------------------- | ---------------------------------------- |
| `remaining_count`       | Billing cycles remaining   | Could display to user. Low priority.     |
| `auth_attempts`         | Card auth attempts         | Useful for debugging. Low priority.      |
| `has_scheduled_changes` | Pending plan changes       | We don't use Razorpay's update API. N/A. |
| `offer_id`              | Linked offer/discount      | Not using offers yet. N/A.               |
| `pause_initiated_by`    | Who paused (self/customer) | Webhook-compatible only. Owner self-service pause is disabled by policy. |
| `cancel_initiated_by`   | Who cancelled              | Could be useful for analytics. P3.       |

### 23.8 Summary — Action Items

| #   | Finding                                           | Priority | Effort            | Status                                   |
| --- | ------------------------------------------------- | -------- | ----------------- | ---------------------------------------- |
| 1   | Handle `subscription.pending` webhook explicitly  | P1       | ~10 lines         | ✅ DONE (Feb 11, 2026)                   |
| 2   | Update `lastWebhook` field in webhook handler     | P2       | ~5 lines per case | ✅ DONE (Feb 11, 2026)                   |
| 3   | Webhook idempotency — check duplicate payment IDs | P2       | ~15 lines         | ✅ DONE (Feb 11, 2026)                   |
| 4   | Invoice download button in billing history UI     | P2       | ~20 lines         | ✅ DONE (Feb 11, 2026)                   |
| 5   | Pause/Resume subscription flow                    | P2       | ~200 lines        | Disabled by default (May 21, 2026); API/UI gated behind `ENABLE_SUBSCRIPTION_PAUSE=false` |
| 6   | Plan downgrade flow                               | P1       | ~300 lines        | ✅ DONE (Feb 11, 2026)                   |
| 7   | Ensure Razorpay international payments enabled    | P0       | Dashboard config  | 📋 Checklist added (see §23.10)          |
| 8   | Consider yearly `total_count: 3` for auto-renewal | P2       | 1 line change     | ✅ DONE (Feb 11, 2026) — changed to 3/36 |

### 23.9 Verification Checklist — Everything Correct

| Area                              | Verified Against                             | Result                                                  |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Webhook signature validation      | Razorpay docs: HMAC-SHA256 + raw body        | ✅ Correct                                              |
| Subscription state handling       | Razorpay lifecycle docs                      | ✅ 9/9 states handled (all including paused/resumed)    |
| Payment retry flow                | Razorpay payment-retries docs                | ✅ Handled via payment.failed + halted                  |
| Cancel API usage                  | Razorpay cancel-subscription docs            | ✅ Correct (immediate cancel by design)                 |
| Subscription creation params      | Razorpay create-subscription API             | ✅ plan_id, total_count (3/36), quantity, notes correct |
| Date handling (Unix → Timestamp)  | Razorpay API response fields                 | ✅ All × 1000 conversions correct                       |
| Currency handling (INR/USD)       | Razorpay international payments docs         | ✅ Separate plans per currency, smallest unit           |
| Top-up via Orders API             | Razorpay orders vs subscriptions distinction | ✅ Correct — one-time orders with programmatic capture  |
| Plan deduplication                | Not in Razorpay docs (our pattern)           | ✅ Lookup key prevents duplicates                       |
| Credit reset on charge            | Our billing architecture                     | ✅ Provider-payment transaction + lazy monthly reset   |
| Grace period                      | Our architecture (not Razorpay-native)       | ✅ 7-day in DAL query                                   |
| Security (auth, tenant isolation) | Our security rules + OWASP                   | ✅ All routes protected                                 |

### 23.10 Razorpay International Payments Activation Checklist

> **P0 — Required before launching USD pricing.** This is a Razorpay Dashboard configuration, not a code change.

| #   | Step                                                         | Status     |
| --- | ------------------------------------------------------------ | ---------- |
| 1   | Log in to Razorpay Dashboard → Settings → International      | ⬜ Pending |
| 2   | Enable "Accept International Payments"                       | ⬜ Pending |
| 3   | Complete additional KYC documents (Indian business required) | ⬜ Pending |
| 4   | Wait for Razorpay approval (may take 2-5 business days)      | ⬜ Pending |
| 5   | Verify test payment with USD currency in test mode           | ⬜ Pending |
| 6   | Verify currency auto-detection works (timezone-based)        | ⬜ Pending |
| 7   | Verify Razorpay plan creation with USD amounts works         | ⬜ Pending |
| 8   | Confirm settlement happens in INR (Razorpay default)         | ⬜ Pending |

**Code readiness:** ✅ All code supports INR/USD already — separate plans per currency, Zod validation for currency, timezone-based detection.

**When to complete:** Before any marketing/launch targeting international (non-India) customers.

---

## 24. Future Enhancements (Backlog)

| #   | Feature                                       | Priority | Notes                                                                                         |
| --- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| 1   | ~~Downgrade plan flow~~                       | ~~P1~~   | ✅ DONE (Feb 11, 2026) — PricingPlansModal now shows all plans, uses same cancel+new-sub flow |
| 2   | ~~Handle `subscription.pending` webhook~~     | ~~P1~~   | ✅ DONE (Feb 11, 2026) — Added to webhook switch with dual-path handling                      |
| 3   | Pause subscription                           | P2       | Implemented but disabled by default (May 21, 2026). UI hides Pause/Resume and APIs return unavailable while `ENABLE_SUBSCRIPTION_PAUSE=false`. |
| 4   | ~~Invoice download in billing history~~       | ~~P2~~   | ✅ DONE (Feb 11, 2026) — Fixed condition, button shows when invoiceUrl exists                 |
| 5   | Failed payment retry UI                       | P2       | Show "Update payment method" when `past_due`. Currently links to Razorpay short_url.          |
| 6   | Subscription analytics                        | P2       | MRR, churn rate, LTV tracking for founder dashboard.                                          |
| 7   | ~~Webhook idempotency guard~~                 | ~~P2~~   | ✅ DONE; strengthened July 10, 2026 with payment/status transactions and deterministic audit IDs |
| 8   | ~~Update `lastWebhook` field~~                | ~~P2~~   | ✅ DONE (Feb 11, 2026) — Added to all webhook update payloads                                 |
| 9   | Multi-store billing                           | P3       | If tenant has multiple stores, aggregate billing view.                                        |
| 10  | ~~Yearly auto-renewal (`total_count > 1`)~~   | ~~P2~~   | ✅ DONE (Feb 11, 2026) — Changed to 3 (yearly) / 36 (monthly) in both create routes           |
| 11  | ~~Razorpay international payments checklist~~ | ~~P0~~   | ✅ Checklist added in §23.10. Dashboard config required before USD launch.                    |

## 25. Exact subscription producer and pending-reuse identity boundary

Initial MenuList and Answerlattice subscription persistence is create-only: an existing provider document ID is never overwritten. Writer payloads require exact product aliases plus present, agreeing numeric `tId/tenantId` and `sId/storeId`, then persist both canonical alias pairs. Direct update helpers re-read the document in a transaction and reject foreign, incomplete or conflicting current ownership before merging.

The create-subscription pending-checkout lookup constrains both product aliases and both tenant/store alias pairs, then applies the shared exact product-scope projector before fetching Razorpay state or returning a hosted checkout URL. A quarantined legacy/conflicting row cannot be reused merely because its primary aliases match the current session.

This changes no normal-path provider call count. Initial persistence changes from overwrite-capable `set` to `create`; direct updates add one transaction read; pending checkout keeps one bounded query with stricter equality predicates and uses the already-declared exact-scope composite. App deployment and hosted-checkout smoke remain pending.

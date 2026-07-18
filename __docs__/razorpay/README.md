# Razorpay Payment System — Documentation Hub

**Status:** Billing architecture reference; not current launch certification | Razorpay is the ONLY payment provider
**Last Updated:** July 16, 2026

> **Launch Boundary:** This hub records the frozen Razorpay billing architecture and source-gated implementation evidence, not current MenuList production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:billing-entitlement-boundary`, Razorpay sandbox subscription/top-up/reseller/webhook smoke, desktop/mobile Billing browser QA, past-due grace-period display fallback coverage, target deploy evidence, and production-host smoke.

---

## Documents

| Document                                                                                | Audience            | Description                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [active-subscription-flow.md](./active-subscription-flow.md)                            | Developers, Founder | Complete subscription architecture — state machine, DAL layers, reconciliation, testing matrix, frozen core governance   |
| [razorpay_impl.md](./razorpay_impl.md)                                                  | Developers, Founder | Complete technical reference — maintained file map, every flow, DB schema, security, credit system, frontend, webhook handling |
| [user-journey-tracking.md](./user-journey-tracking.md)                                  | QA, Developers      | Comprehensive tracking of all 20 user journeys, webhook coverage, API security                                           |
| [razorpay-payment-flow.md](./razorpay-payment-flow.md)                                  | Quick Reference     | Original payment flow doc (superseded by razorpay_impl.md, kept for historical reference)                                |
| [razorpay_firebase.md](./razorpay_firebase.md)                                          | Founder, DevOps     | Firebase cost tracking — every Firestore read/write/delete in the billing system                                         |
| [razorpay_verification.md](./razorpay_verification.md)                                  | QA, Developers      | Dated verification evidence, current source-gate commands, and external smoke still required                              |
| [\_archive/razorpay_code-feedback-audit.md](./_archive/razorpay_code-feedback-audit.md) | Archive             | ChatGPT feedback audit — decisions on all 8 hardening suggestions                                                        |

---

## Quick Navigation

### By Flow

| Flow                     | Section in razorpay_impl.md                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| New user signs up + pays | [§5 — New User Onboarding](./razorpay_impl.md#5-flow-1-new-user-onboarding)                    |
| Existing user subscribes | [§6 — Existing User Subscription](./razorpay_impl.md#6-flow-2-existing-user--new-subscription) |
| Payment verification     | [§7 — Payment Verification](./razorpay_impl.md#7-flow-3-payment-verification)                  |
| Webhook processing       | [§8 — Webhook Processing](./razorpay_impl.md#8-flow-4-webhook-processing)                      |
| Plan upgrade             | [§9 — Plan Upgrade](./razorpay_impl.md#9-flow-5-plan-upgrade)                                  |
| Cancellation             | [§10 — Subscription Cancellation](./razorpay_impl.md#10-flow-6-subscription-cancellation)      |
| Buy AI credits (top-up)  | [§11 — AI Enhancement Pack](./razorpay_impl.md#11-flow-7-ai-enhancement-pack-top-up)           |
| Monthly credit reset     | [§12 — Credit System](./razorpay_impl.md#12-credit-system--monthly-reset)                      |
| Grace period             | [§13 — Grace Period](./razorpay_impl.md#13-grace-period--past-due-handling)                    |

### By Role

| If you are...    | Start here                                                                      |
| ---------------- | ------------------------------------------------------------------------------- |
| **Founder/CEO**  | §1 Architecture Overview → §4 Plans & Pricing → §21 Key Decisions → §24 Backlog |
| **Backend Dev**  | §3 Schema → §5-11 Flows → §16 Security → §17 DAL                                |
| **Frontend Dev** | §14 Owner Dashboard → §15 Website Management → §19 Utilities                    |
| **DevOps**       | §20 Environment Variables → §8 Webhook Processing → §16 Security                |

### By File

The maintained billing files are inventoried in [§2 — File Inventory](./razorpay_impl.md#2-file-inventory).

---

## Related Documentation

| Doc                                                         | Location                         |
| ----------------------------------------------------------- | -------------------------------- |
| AI Credit System (capacity, consumption, billing explainer) | `__docs__/ai-enhancement-packs/` |
| AI Enhancement Packs (spec + impl)                          | `__docs__/ai-enhancement-packs/` |
| Platform Plans & Pricing                                    | `src/data/PlatformPlansList.ts`  |

---

## Key Architecture Facts

- **Payment provider:** Razorpay only (Stripe removed Feb 2026)
- **Subscription documents:** Root-level `subscriptions/{subscriptionId}` rows carry exact tenant/store aliases. A store can own a direct subscription; a MenuList outlet without one can inherit its tenant master/HQ subscription for access and shared enhancement balance.
- **Owner mutation scope:** The desktop/mobile store picker is a read context. Plan changes, recurring payment links, quantity changes, and direct subscription actions are enabled only for the signed-in store's direct subscription; switched-store views are read-only. An inherited outlet can buy an enhancement pack into the shared HQ balance but cannot mutate the HQ plan.
- **Provider boundary:** `billingMode: 'manual'` and `manual_...` prepaid subscriptions never call Razorpay subscription APIs. Reseller renewals and prepaid location capacity are separate server-owned, idempotent Firestore flows.
- **Credit types:** Monthly (resets each billing cycle) + Top-up (never expires)
- **Reset mechanism:** Two-layer — webhook (monthly plans) + lazy reset in capacity check (yearly + safety net)
- **Grace period:** 7 days for failed payments, enforced in DAL (`expireIfGracePeriodEnded`)
- **Grace display fallback:** Desktop Billing, Mobile Billing, and authenticated pricing subscription-management use the shared past-due grace-period display fallback. If a legacy or malformed `past_due` doc is missing `pastDueSinceAt`, owner UI shows fixed "Grace period details unavailable." recovery copy instead of a false zero-day countdown.
- **Top-ups:** One-time Razorpay Orders (not Subscriptions). Either the authenticated checkout callback or the signed `order.paid` webhook can settle the immutable pending top-up snapshot; the Firestore transaction applies credits exactly once.
- **Billing history:** Sourced from webhook event log (`paymentTransactions` collection, append-only lean v2 summaries)
- **Payment action body caps:** Authenticated subscription, top-up, verification, upgrade, pause/resume, cancel, and onboarding billing JSON routes use bounded request parsing before Zod validation, provider calls, or Firestore writes.
- **Answerlattice billing permission:** Shared Razorpay mutations re-read the current Answerlattice workspace membership and persisted role and require `canManageBilling`; general management access alone does not authorize payment changes.
- **Document-ID boundary:** Subscription document refs pass through `src/lib/billing/subscriptionDocumentIdBoundary.ts` before DAL, AI capacity, entitlement sync, and top-up verification refs.
- **Top-up order document-ID boundary:** Raw top-up order refs pass through `src/lib/billing/topupDocumentIdBoundary.ts` before pending writes, idempotency reads, and paid audit writes; whitespace-mutated order IDs fail before Firestore refs.
- **Top-up subscription settlement boundary:** Verification proves a current subscription exists before provider capture, then re-reads the exact document in the credit transaction. Missing, re-scoped, conflicting-product, or malformed-balance current documents fail closed without recreation or stale balance fallback.
- **Webhook cheap-fail:** Missing signature/secret, oversized bodies above 256KB, and IP-rate-limited bursts are rejected before raw-body signature verification or Firestore idempotency work.
- **Webhook idempotency:** Signed webhook events are claimed in server-only `razorpayWebhookEvents/{eventKey}` before billing mutations, so duplicate retries do not repeat writes.
- **Webhook product recovery:** When a subscription payment event omits product notes, the handler resolves the provider subscription against MenuList and Answerlattice billing stores before audit, alert, or state mutation.
- **Replacement subscriptions:** Upgrade/create requests persist `replacementForSubscriptionId`. Browser verification and webhook activation both finalize the replacement, cancel the old provider subscription before the idempotent two-document carry-forward transaction, and safely resume after a partial failure.
- **Creation recovery:** Existing-user, website-onboarding, reseller-online, and Answerlattice onboarding creators check ambiguous persistence outcomes and compensate provider/local provisioning only when safe. Sequential retry reuses a matching provider `created` subscription instead of creating another checkout.
- **Concurrent checkout recovery:** Existing-user subscription and top-up creation acquire a short server-only scope lease before provider creation. Provider subscription notes carry `checkoutAttemptId`; top-up orders additionally use a unique attempt-derived `receipt`. Concurrent clicks fail closed, while an expired/ambiguous attempt searches or fetches the exact provider object before any new create. After local persistence, a two-minute completed-attempt checkpoint replays that exact provider object so a request that passed its initial read just before the first commit cannot create a second object; deliberate later purchases acquire a new attempt after the replay window.
- **Plan lookup:** Razorpay plan deduplication uses the server-only `billingProviderPlans` Firestore registry/lease plus complete bounded provider pagination. One request owns provider creation, concurrent requests wait briefly for its result, and ambiguous creates are recovered by canonical `lookupKey` before another plan can be created.
- **State machine:** All status transitions validated by `subscriptionStateMachine.ts`; invalid transitions are blocked before status writes.
- **DAL architecture:** 3-layer composition — `fetchSubscriptionRaw` → `expireIfGracePeriodEnded` → `getActiveSubscriptionForStore`
- **Bounded history:** New subscription status entries retain the latest 100 diagnostic entries. Payment settlement identifiers remain in the separate idempotency ledger and are not truncated.
- **Reconciliation:** The leased 2:20 AM UTC task processes 100-row pages with five provider calls at a time, a six-minute runtime budget, and a Firestore cursor. It syncs provider status, cycle, charge, paid-count, and quantity truth without loading the whole population into memory.
- **Paid-cycle plan entitlement:** `active` subscriptions carry their plan mirror. `cancelled` and `paused` subscriptions retain the purchased plan mirror only through a valid `cycleEndDate`, matching the owner-visible paid-access promise; `past_due`, `expired`, and `completed` do not carry that plan mirror. The existing maintenance scheduler checks at most 500 due cancelled/paused rows each hour, transitions them to `expired`, synchronizes store/platform mirrors, and leaves a durable retry marker if the post-transition entitlement repair fails.
- **Billing health and retention:** The existing maintenance scheduler writes one daily server-only `systemHealth/billing` summary for stale checkout leases, orphaned provider-created attempts, failed webhooks, and expired webhook claims. Attention state uses the existing cooldown-aware platform alert path. Terminal or stale-processing webhook idempotency claims older than 90 days are deleted in batches of at most 200; all recent claims are preserved.
- **Architecture status:** FROZEN — only new plans, price changes, credit packs allowed; no structural changes

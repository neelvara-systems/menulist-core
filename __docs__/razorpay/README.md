# Razorpay Payment System — Documentation Hub

**Status:** Billing architecture reference; not current launch certification | Razorpay is the ONLY payment provider
**Last Updated:** July 6, 2026

> **Launch Boundary:** This hub records the frozen Razorpay billing architecture and source-gated implementation evidence, not current MenuList production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:billing-entitlement-boundary`, Razorpay sandbox subscription/top-up/reseller/webhook smoke, desktop/mobile Billing browser QA, past-due grace-period display fallback coverage, target deploy evidence, and production-host smoke.

---

## Documents

| Document                                                                                | Audience            | Description                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [active-subscription-flow.md](./active-subscription-flow.md)                            | Developers, Founder | Complete subscription architecture — state machine, DAL layers, reconciliation, testing matrix, frozen core governance   |
| [razorpay_impl.md](./razorpay_impl.md)                                                  | Developers, Founder | Complete technical reference — all 34+ files, every flow, DB schema, security, credit system, frontend, webhook handling |
| [user-journey-tracking.md](./user-journey-tracking.md)                                  | QA, Developers      | Comprehensive tracking of all 20 user journeys, webhook coverage, API security                                           |
| [razorpay-payment-flow.md](./razorpay-payment-flow.md)                                  | Quick Reference     | Original payment flow doc (superseded by razorpay_impl.md, kept for historical reference)                                |
| [razorpay_firebase.md](./razorpay_firebase.md)                                          | Founder, DevOps     | Firebase cost tracking — every Firestore read/write/delete in the billing system                                         |
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
| **Founder/CEO**  | §1 Architecture Overview → §4 Plans & Pricing → §21 Key Decisions → §23 Backlog |
| **Backend Dev**  | §3 Schema → §5-11 Flows → §16 Security → §17 DAL                                |
| **Frontend Dev** | §14 Owner Dashboard → §15 Website Management → §19 Utilities                    |
| **DevOps**       | §20 Environment Variables → §8 Webhook Processing → §16 Security                |

### By File

All 34 files are inventoried in [§2 — File Inventory](./razorpay_impl.md#2-file-inventory).

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
- **Subscriptions:** Per-store, not per-tenant
- **Credit types:** Monthly (resets each billing cycle) + Top-up (never expires)
- **Reset mechanism:** Two-layer — webhook (monthly plans) + lazy reset in capacity check (yearly + safety net)
- **Grace period:** 7 days for failed payments, enforced in DAL (`expireIfGracePeriodEnded`)
- **Grace display fallback:** Desktop Billing, Mobile Billing, and authenticated pricing subscription-management use the shared past-due grace-period display fallback. If a legacy or malformed `past_due` doc is missing `pastDueSinceAt`, owner UI shows fixed "Grace period details unavailable." recovery copy instead of a false zero-day countdown.
- **Top-ups:** One-time Razorpay Orders (not Subscriptions)
- **Billing history:** Sourced from webhook event log (`paymentTransactions` collection, append-only lean v2 summaries)
- **Payment action body caps:** Authenticated subscription, top-up, verification, upgrade, pause/resume, cancel, and onboarding billing JSON routes use bounded request parsing before Zod validation, provider calls, or Firestore writes.
- **Document-ID boundary:** Subscription document refs pass through `src/lib/billing/subscriptionDocumentIdBoundary.ts` before DAL, AI capacity, entitlement sync, and top-up verification refs.
- **Top-up order document-ID boundary:** Top-up order refs pass through `src/lib/billing/topupDocumentIdBoundary.ts` before pending writes, idempotency reads, and paid audit writes.
- **Webhook cheap-fail:** Missing signature/secret, oversized bodies above 256KB, and IP-rate-limited bursts are rejected before raw-body signature verification or Firestore idempotency work.
- **Webhook idempotency:** Signed webhook events are claimed in server-only `razorpayWebhookEvents/{eventKey}` before billing mutations, so duplicate retries do not repeat writes.
- **State machine:** All status transitions validated by `subscriptionStateMachine.ts`; invalid transitions are blocked before status writes.
- **DAL architecture:** 3-layer composition — `fetchSubscriptionRaw` → `expireIfGracePeriodEnded` → `getActiveSubscriptionForStore`
- **Reconciliation:** Runs in Firebase nightly scheduler (2:30 AM UTC) via `functions/src/billing/reconcileSubscriptions.ts` — syncs Firestore ↔ Razorpay
- **Architecture status:** FROZEN — only new plans, price changes, credit packs allowed; no structural changes

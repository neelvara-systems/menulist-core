# Razorpay Payment System — Documentation Hub

**Status:** Production Ready — Billing Architecture FROZEN | Razorpay is the ONLY payment provider
**Last Updated:** May 20, 2026

---

## Documents

| Document                                                                                | Audience            | Description                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [ACTIVE_SUBSCRIPTION_FLOW.md](./ACTIVE_SUBSCRIPTION_FLOW.md)                            | Developers, Founder | Complete subscription architecture — state machine, DAL layers, reconciliation, testing matrix, frozen core governance   |
| [razorpay_impl.md](./razorpay_impl.md)                                                  | Developers, Founder | Complete technical reference — all 34+ files, every flow, DB schema, security, credit system, frontend, webhook handling |
| [USER_JOURNEY_TRACKING.md](./USER_JOURNEY_TRACKING.md)                                  | QA, Developers      | Comprehensive tracking of all 20 user journeys, webhook coverage, API security                                           |
| [RAZORPAY_PAYMENT_FLOW.md](./RAZORPAY_PAYMENT_FLOW.md)                                  | Quick Reference     | Original payment flow doc (superseded by razorpay_impl.md, kept for historical reference)                                |
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
- **Top-ups:** One-time Razorpay Orders (not Subscriptions)
- **Billing history:** Sourced from webhook event log (`paymentTransactions` collection, append-only lean v2 summaries)
- **Webhook idempotency:** Signed webhook events are claimed in server-only `razorpayWebhookEvents/{eventKey}` before billing mutations, so duplicate retries do not repeat writes.
- **State machine:** All status transitions validated by `subscriptionStateMachine.ts`; invalid transitions are blocked before status writes.
- **DAL architecture:** 3-layer composition — `fetchSubscriptionRaw` → `expireIfGracePeriodEnded` → `getActiveSubscriptionForStore`
- **Reconciliation:** Runs in Firebase nightly scheduler (2:30 AM UTC) via `functions/src/billing/reconcileSubscriptions.ts` — syncs Firestore ↔ Razorpay
- **Architecture status:** FROZEN — only new plans, price changes, credit packs allowed; no structural changes

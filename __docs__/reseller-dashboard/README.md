# Reseller Dashboard

**Feature:** Assisted onboarding portal for authorized resellers to manually onboard SMB clients with flexible pricing and payment modes.

**Status:** ✅ IMPLEMENTED — Feature Flag OFF  
**Created:** February 27, 2026  
**Feature Flag:** `ENABLE_RESELLER_DASHBOARD` (OFF by default)

---

## What Is This?

A separate dashboard accessible to authorized resellers (friends, sales partners) who onboard SMB clients on their behalf. Resellers can:

1. Create stores and upload menus for clients
2. Select from predefined pricing tiers (not arbitrary prices)
3. Choose payment mode: Online (Razorpay) or Offline (cash/UPI collected manually)
4. Select license duration: 3 / 6 / 12 months
5. Track their onboarded clients and license statuses

**This is NOT:**

- A white-label platform
- A permanent parallel billing system
- A self-service partner signup
- An independent reseller portal with separate branding

**This IS:**

- A controlled, founder-authorized assisted sales channel
- Time-bound (designed to be phased out as self-serve grows)
- Architecturally integrated with existing billing (same `subscriptions` collection, same state machine)

---

## Key Architectural Decisions

| #   | Decision                                              | Rationale                                                                                                 |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **Reuse existing subscription system**                | No parallel "License" engine. Same `FirestoreSubscriptionDoc`, same state machine, same webhook handling. |
| 2   | **New `platformRole: RESELLER`**                      | Fits existing auth infrastructure (`withAuth` + `requiredPlatformRole`).                                  |
| 3   | **Fixed pricing tiers only**                          | No arbitrary price input. Predefined reseller tiers in constants. Protects price anchor.                  |
| 4   | **Online = same Razorpay Subscription as self-serve** | Unified billing. `shortUrl` for client checkout. Auto-renewal. Same webhooks.                             |
| 5   | **Offline = manual subscription with auto-expiry**    | `billingMode: 'manual'` on subscription doc. Nightly scheduler enforces expiry.                           |
| 6   | **Same Next.js app, separate route group**            | Route: `/reseller/*`. Same codebase, gated by role. No separate deployment.                               |
| 7   | **Immutable transaction logs**                        | Every reseller action logged in `resellerTransactions` collection. Cannot be edited.                      |
| 8   | **Concurrent cap system (not lifetime)**              | Max concurrent active offline stores per reseller. Expired stores free up slots.                          |
| 9   | **Feature-flag-based tier sunset**                    | Pricing tiers disabled via flags at scale thresholds. Not reliant on discipline.                          |

---

## Documentation Index

| #   | Document                                               | Audience       | Description                                                   |
| --- | ------------------------------------------------------ | -------------- | ------------------------------------------------------------- |
| 1   | [Spec](reseller-dashboard_spec.md)                     | CEO / Business | Product requirements, user flows, business rules              |
| 2   | [Implementation](reseller-dashboard_impl.md)           | Developers     | Technical blueprint, DB schema, API contracts, file structure |
| 3   | [Firebase](reseller-dashboard_firebase.md)             | Developers     | Every read/write/delete with cost estimates                   |
| 4   | [Marketing](reseller-dashboard_marketing.md)           | Sales          | Internal pitch, partner recruitment messaging                 |
| 5   | [Website](reseller-dashboard_website.md)               | Public         | Landing page content for partner program (if needed)          |
| 6   | [Help Doc](reseller-dashboard_helpdoc.md)              | Resellers      | Step-by-step guide for reseller partners                      |
| 7   | [Mobile Support](reseller-dashboard_mobile-support.md) | Internal       | Mobile admission test results                                 |

---

## Relationship to Existing Systems

- **Auth:** Uses NextAuth session + existing `platformRole` check
- **Billing:** Extends `FirestoreSubscriptionDoc` with `billingMode` + `resellerMetadata` fields
- **Onboarding:** Reuses atomic transaction pattern from `create-subscription/route.ts`
- **State Machine:** Same `subscriptionStateMachine.ts` — no new states needed
- **Nightly Scheduler:** Adds manual license expiry check to existing `decisionBlocksScoring.ts`
- **Plans:** Adds reseller pricing tiers to `PlatformPlansList.ts` pattern

---

## ChatGPT Review Summary

### Review 1 — Initial Conversation (Feb 27, 2026)

**Accuracy:** ~65% — Good strategic framing, but suggested parallel "License Engine" which conflicts with existing billing.

- **Accepted:** Fixed pricing tiers, cap system, immutable logs, offline mode, expiry enforcement, governance phasing
- **Rejected:** Separate "License Engine", arbitrary price input, `StoreDraft` concept, friend-set pricing

### Review 2 — Doc Feedback (Feb 27, 2026)

**Accuracy:** ~85% — Significantly better. Core insight (use Razorpay Subscriptions instead of Payment Links) was correct and supported by codebase evidence.

- **Accepted:** Unified Razorpay Subscriptions for online, renewal anchor rule, concurrent caps (not lifetime), state authority clarification, feature-flag sunset encoding, commitment period redefinition
- **Rejected:** None — all feedback points were valid
- **Archive:** `_archive/chatgpt-review.md`

---

**Last Updated:** February 27, 2026  
**Version:** 1.1 (updated per ChatGPT doc feedback review)

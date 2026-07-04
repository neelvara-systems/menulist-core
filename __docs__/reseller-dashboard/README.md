# Reseller Dashboard

**Feature:** Assisted onboarding portal for authorized resellers to manually onboard SMB clients with flexible pricing and payment modes.

**Status:** ✅ IMPLEMENTED — Feature Flag ON in current repo
**Created:** February 27, 2026  
**Feature Flag:** `ENABLE_RESELLER_DASHBOARD` (`true` in `src/config/features.ts`)
**Local source gate:** `npm run verify:reseller-dashboard-boundary`

---

## What Is This?

A separate dashboard accessible to authorized resellers (friends, sales partners) who onboard SMB clients on their behalf. Resellers can:

1. Create stores/accounts for clients and hand over dashboard/customer links
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

## Production-Readiness Source Gate

`npm run verify:reseller-dashboard-boundary` is the first-class local verifier for this feature. It source-checks reseller route admission order, platform/reseller role separation, hashed read/write rate-limit keys, bounded request/response parsing, offline/manual entitlement sync, online-provider failure compensation, desktop/mobile shell parity, and docs parity.

This is a local source gate only. It does not perform Razorpay sandbox payment smoke, authenticated browser QA, physical-device mobile QA, Firebase deploys, Vercel deploys, production builds, live Firestore writes, or provider calls.

Current reseller onboarding creates the tenant/store account, subscription state, dashboard link, and public customer link. It does not upload or extract menu files inside the reseller onboarding API path; menu content is added later through the normal owner dashboard and import/review flows.

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

**Last Updated:** July 4, 2026
**Version:** 1.3 (added reseller onboarding account/link boundary)

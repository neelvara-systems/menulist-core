# Reseller Dashboard

**Feature:** Assisted onboarding portal for authorized resellers to create a customer account and online recurring checkout.

**Status:** ✅ IMPLEMENTED — Feature Flag ON in current repo
**Created:** February 27, 2026  
**Feature Flag:** `ENABLE_RESELLER_DASHBOARD` (`true` in `src/config/features.ts`)
**Local source gate:** `npm run verify:reseller-dashboard-boundary`

---

## What Is This?

## Current billing admission (August 24, 2026)

- New reseller onboarding is online-only through Razorpay.
- The reseller enters the billed customer's legal name, invoice email, Indian
  billing address/state, postal code, and optional GSTIN.
- The server freezes the MenuList tax snapshot before account provisioning,
  charges the tax-inclusive amount, and stores the same evidence used by the
  standard MenuList invoice, refund, credit-note, and NotificationOS pipeline.
- Recurring credits scale with the paid location quantity.
- Offline cash/UPI collection, manual renewal, manual payment confirmation,
  and manual location-capacity sales are fail-closed until a reviewed seller,
  reseller, remittance, refund, invoice, and credit-note contract exists.
- Historical offline implementation notes below describe dormant code, not an
  admitted new-sale path.

A separate dashboard accessible to authorized resellers (friends, sales partners) who onboard SMB clients on their behalf. Resellers can:

1. Create stores/accounts for clients and hand over dashboard/customer links
2. Select from predefined pricing tiers (not arbitrary prices)
3. Create an online Razorpay recurring payment link
4. Optionally record a commercial commitment period
5. Track their onboarded clients and license statuses

**This is NOT:**

- A white-label platform
- A permanent parallel billing system
- A self-service partner signup
- An independent reseller portal with separate branding

**This IS:**

- A controlled, founder-authorized assisted sales channel
- Capped and source-controlled alongside self-serve onboarding
- Architecturally integrated with existing billing (same `subscriptions` collection, same state machine)

---

## Key Architectural Decisions

| #   | Decision                                              | Rationale                                                                                                 |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **Reuse existing subscription system**                | No parallel "License" engine. Same `FirestoreSubscriptionDoc`, same state machine, same webhook handling. |
| 2   | **New `platformRole: RESELLER`**                      | Fits existing auth infrastructure (`withAuth` + `requiredPlatformRole`).                                  |
| 3   | **Fixed pricing tiers only**                          | No arbitrary price input. Predefined reseller tiers in constants. Protects price anchor.                  |
| 4   | **Online = same Razorpay Subscription as self-serve** | Unified billing. `shortUrl` for client checkout. Auto-renewal. Same webhooks.                             |
| 5   | **Offline = manual subscription with auto-expiry**    | `billingMode: 'manual'` on subscription doc. The daily consolidated maintenance scheduler enforces expiry. |
| 6   | **Same Next.js app, separate route group**            | Route: `/reseller/*`. Same codebase, gated by role. No separate deployment.                               |
| 7   | **Immutable financial/action inputs**                 | Every reseller action is appended in `resellerTransactions`; only bounded payment-status convergence fields may update. |
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
| 8   | [July 16 Verification](reseller-dashboard_verification-2026-07-16.md) | Internal | Code-truth fixes, cost boundary, local gates, and pending external evidence |

---

## Production-Readiness Source Gate

August 1, 2026 onboarding recovery boundary:

- Every reseller request revalidates the current persisted MenuList actor before
  provisioning. Existing owner Auth credentials are changed only after a
  fingerprinted provisional operation commits with tenant/store/user truth.
- Online onboarding records the provider attempt before calling Razorpay.
  Ambiguous outcomes remain retryable and are recovered by exact operation
  notes; incomplete bounded searches fail closed instead of creating a possible
  duplicate subscription.
- Lost billing acknowledgements distinguish verification-read outages from
  proven absence. Exact provisional operations upgrade atomically to final
  subscription/ledger/profile truth and replay cannot recount the onboarding.

`npm run verify:reseller-dashboard-boundary` is the first-class local verifier for this feature. It source-checks reseller route admission order, platform/reseller role separation, UUID retry boundaries, transaction-atomic subscription/ledger/profile writes, offline-cap enforcement, deferred online revenue recognition, bounded request/response parsing, safe Razorpay checkout URLs, desktop/mobile onboarding/renewal/location parity, and docs parity. The focused pure and Firestore-emulator tests are `npm run test:reseller-onboarding-boundary`, `npm run test:reseller-onboarding-billing:emulator`, `npm run test:reseller-confirm-payment-boundary`, and `npm run test:reseller-confirm-payment:emulator`.

This is a local source gate only. It does not perform Razorpay sandbox payment smoke, authenticated browser QA, physical-device mobile QA, Firebase deploys, Vercel deploys, production builds, live Firestore writes, or provider calls.

Current reseller onboarding creates the tenant/store account, subscription state, dashboard link, and public customer link. It does not upload or extract menu files inside the reseller onboarding API path; menu content is added later through the normal owner dashboard and import/review flows.

---

## Relationship to Existing Systems

- **Auth:** Uses NextAuth session + existing `platformRole` check
- **Billing:** Extends `FirestoreSubscriptionDoc` with `billingMode` + `resellerMetadata` fields
- **Onboarding:** Tenant/store/owner creation uses the shared onboarding transaction; subscription, reseller ledger, offline-cap reservation, and profile counters commit in a second atomic billing transaction
- **State Machine:** Same `subscriptionStateMachine.ts` — no new states needed
- **Daily Scheduler:** Manual license expiry runs in `functions/src/schedulers/menulistMaintenanceScheduler.ts` under the shared per-task lease model
- **Plans:** Internal reseller pricing tiers live only in `src/config/resellerPricing.ts`; public plan constants remain separate

The dashboard client list reads current reseller subscription documents directly (100 per reseller, 200 for platform, plus one overflow row), ordered newest-first before the Firestore cap. This avoids a transaction-ledger query followed by one subscription read per row, prevents renewal/add-location ledger entries from appearing as duplicate clients, and keeps the bounded window deterministic. `isPartial` is shown on desktop and mobile when the bounded result is exceeded; the immutable ledger remains the source for monthly reporting, which carries its own 2,000-row partial indicator.

Provider sandbox checkout, authenticated browser QA, and physical-device QA remain owner-run release checks. They stay pending until the matching environments and credentials are available; local source and emulator gates do not claim those external checks.

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

**Last Updated:** July 16, 2026
**Version:** 1.4 (atomic billing, retry recovery, renewal UI, and current-subscription read model)

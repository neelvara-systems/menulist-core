# Razorpay — Session Verification Log

## Session: May 20, 2026

**Task:** Production audit hardening for Razorpay billing routes, webhook replay protection, and local test-mode payment smoke.

### Changes Verified

| Check | Result |
|-------|--------|
| Root TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Functions TypeScript | Passed: `cd functions && npx tsc --noEmit` |
| Production build | Passed: `npm run build` |
| ESLint | Passed: `npm run lint` |
| Signed webhook idempotency | Passed: first signed `order.paid` returned `status: ok`, exact replay returned `status: duplicate`, one `payment_transactions` row was written |
| Invalid webhook signature | Passed: invalid signature returned 400 before parsing/mutation |
| Authenticated Razorpay test-mode subscription create | Passed: created `starter` monthly subscription in Razorpay test mode |
| Authenticated Razorpay test-mode cancel | Passed: created test subscription cancelled successfully |
| Authenticated top-up order create | Passed: created Razorpay test-mode top-up order |
| Verify-subscription schema | Passed: valid payment id without `razorpay_subscription_id` returns 400 with required-field error |
| Verify-topup bad signature | Passed: valid-shaped IDs with bad signature return 403 |
| Hosted Razorpay top-up checkout | Passed on `https://menulist.online/billing` in Razorpay Test Mode: checkout opened, OTP success completed, and MenuList updated pack balance by +250 credits |
| Billing history formatter | Passed: lean v2 top-up rows and subscription rows normalize without legacy raw payload assumptions |
| Chrome pricing page smoke | Passed: `/pricing` renders plan and credit-pack sections without the previous credit-pack error boundary |
| Local test data cleanup | Passed: deleted the test `subscriptions/{subId}` and `topups/{orderId}` Firestore documents after smoke testing |

### Remaining External Conditions

- Hosted top-up checkout completion was verified on the live domain in Razorpay Test Mode. New subscription checkout, upgrade checkout, pause/resume, and cancellation success paths should be tested with a disposable store/account or explicit approval because the available live account already has an active Premium subscription.
- Live WhatsApp onboarding requires configured Meta WhatsApp Cloud API test/sandbox credentials, a reachable webhook URL, and a test sender number. This session did not run a live WhatsApp provider delivery test.
- Local Upstash DNS failed during testing. `checkRateLimit()` now times out provider calls and opens a short bypass window, but staging/production should still use a healthy Upstash REST endpoint.

---

**Session:** Feb 12, 2026
**Task:** Migrate subscription reconciliation from Vercel API route to Firebase Cloud Function

---

## Changes Made

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `functions/src/billing/reconcileSubscriptions.ts` | **CREATED** | Reconciliation logic using Admin SDK + Razorpay SDK. Exports `reconcileSubscriptions()`. Inlines state machine (mirrors `subscriptionStateMachine.ts`), lazy Razorpay client init, `DB_COLLECTIONS.SUBSCRIPTIONS` for Firestore queries. |
| 2 | `functions/package.json` | MODIFIED | Added `razorpay: ^2.9.6` dependency |
| 3 | `functions/src/constants/features.ts` | MODIFIED | Added `ENABLE_SUBSCRIPTION_RECONCILIATION` feature flag with JSDoc |
| 4 | `functions/src/decisionBlocksScoring.ts` | MODIFIED | (a) Import `reconcileSubscriptions`, (b) Added `secrets: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']` to scheduler config, (c) Added reconciliation call block after guest feedback retention |
| 5 | `vercel.json` | MODIFIED | Removed Vercel cron for `/api/internal/reconcile-subscriptions` |
| 6 | `src/app/api/internal/reconcile-subscriptions/route.ts` | REMOVED | Deprecated Vercel fallback route removed after Firebase scheduler migration |
| 7 | `__docs__/razorpay/README.md` | MODIFIED | Updated reconciliation line in Key Architecture Facts, added `razorpay_firebase.md` to documents table, updated date |
| 8 | `__docs__/razorpay/active-subscription-flow.md` | MODIFIED | Updated §14.3 (reconciliation section), file inventory (added Firebase Functions table), verification checklist, test cases 8 and security test 3 |
| 9 | `__docs__/razorpay/razorpay_firebase.md` | **CREATED** | Firebase cost tracking for entire billing system |
| 10 | `__docs__/razorpay/razorpay_verification.md` | **CREATED** | This file |
| 11 | `__docs__/changelog.md` | MODIFIED | Added Feb 12, 2026 entry |

---

## Decision Rationale

### Why migrate from Vercel to Firebase Functions?

1. **Timeout:** Vercel serverless functions have a 10s timeout (free) / 60s (pro). Firebase Functions v2 allows 540s (9 min). Reconciliation iterates over all active subscriptions sequentially — with 100+ stores, Vercel would time out.
2. **No extra cron:** A nightly scheduler already runs at 2:30 AM UTC for Decision Blocks, Menu Intelligence, Authority Maturation, Menu Drift, and Guest Feedback Retention. Adding reconciliation as another non-blocking task eliminates a separate Vercel Cron dependency.
3. **Same infrastructure:** Firebase Functions use the service account — no CRON_SECRET needed. Razorpay keys are managed as Firebase secrets, same as other sensitive configs.

### Why inline the state machine instead of sharing?

Firebase Functions (`functions/src/`) cannot import from the Next.js app (`src/`). The state machine is 20 lines of code — inlining with a comment `// mirrors src/lib/billing/subscriptionStateMachine.ts` is simpler and more maintainable than creating a shared package.

### Why lazy Razorpay client init?

Firebase secrets are only available at runtime, not at import time. Lazy initialization ensures the Razorpay client is created only when `reconcileSubscriptions()` is actually called, after secrets are populated.

### Why keep the deprecated Vercel route?

Kept temporarily for reference. The file is clearly marked as deprecated with migration pointers. Can be safely deleted in a future cleanup session.

---

## Verification Checklist

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (functions/) | ✅ Zero errors |
| `npx tsc --noEmit` (root/) | ✅ Zero errors |
| Feature flag exists in `functions/src/constants/features.ts` | ✅ `ENABLE_SUBSCRIPTION_RECONCILIATION` |
| Secrets declared on scheduler config | ✅ `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Non-blocking (try/catch, no throw) | ✅ Line 699-707 in decisionBlocksScoring.ts |
| Vercel cron removed | ✅ `vercel.json` is empty `{}` |
| Old route marked deprecated | ✅ Header added |
| Docs updated: active-subscription-flow.md | ✅ §14.3, file inventory, checklist, tests |
| Docs updated: README.md | ✅ Key facts, documents table |
| Changelog entry added | ✅ Feb 12, 2026 |
| Firebase cost doc created | ✅ `razorpay_firebase.md` |
| State machine mirrors frontend version | ✅ Same transitions, comment references source |
| Admin SDK used (not client SDK) | ✅ `firestoreAdmin` from `../firebaseAdmin` |
| `Timestamp` imported at top level (not inline require) | ✅ Fixed during review |

---

## Scope for Improvement

1. **Reconciliation metrics** — Could write a summary doc to Firestore (`_system/reconciliationLog`) for historical tracking of how many subs were synced per night. Low priority.
2. **Parallel Razorpay fetches** — Currently fetches subscriptions from Razorpay sequentially. Could batch with `Promise.allSettled()` in groups of 5-10 for faster execution with many stores. Low priority until 100+ active stores.
3. **Shared types package** — If more logic needs to be shared between `functions/` and `src/`, consider a `shared/` package with common types. Currently only the state machine is duplicated — not worth the complexity yet.

---

## Items Needing Discussion

None — migration is straightforward with no open questions.

# Razorpay Code Feedback Audit

> **Source:** ChatGPT review of subscription & billing architecture docs
> **Date:** February 11, 2026
> **Overall ChatGPT Grade:** A- (Launchable)
> **Audit Result:** 4/8 Valid | 1 Partial | 3 Rejected

---

## Summary

| #      | ChatGPT Risk                                       | Status          | Spec Reference                              | Action                                          | Code Changes                      |
| ------ | -------------------------------------------------- | --------------- | ------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| RISK 1 | Single Source of Truth — dual subscription loaders | ❌ REJECT       | Architecture is intentional (public vs app) | Document decision                               | None — architecturally separate   |
| RISK 2 | DAL doing too much business logic                  | ✅ VALID        | `database/subscriptions/index.ts`           | Split into 3 composable functions               | DAL refactored                    |
| RISK 3 | No hard state machine                              | 🔄 PARTIAL      | Webhook + 6 API routes set status manually  | Lightweight transition validator (not full FSM) | New `subscriptionStateMachine.ts` |
| RISK 4 | No daily reconciliation                            | ✅ VALID        | No self-healing if webhook fails            | Create reconciliation API route + cron          | New API route + vercel.json       |
| Item 5 | Billing immutability rule                          | ✅ VALID        | Documentation gap                           | Add code comments + doc section                 | Comments in types + doc update    |
| Item 6 | Payment event log lock                             | ✅ ALREADY DONE | `createPaymentTransaction()` is append-only | None                                            | No changes needed                 |
| Item 7 | Lock billing architecture                          | ✅ VALID        | Documentation gap                           | Add "Frozen Core" section to arch doc           | Doc update only                   |
| Item 8 | Testing matrix                                     | ❌ DEFER        | Manual testing, not code                    | Testing guide in doc only                       | No code changes                   |

---

## Detailed Reasoning

### RISK 1 — REJECTED: Single Source of Truth

**ChatGPT says:** Landing page and dashboard fetch subscription independently. Create `useActiveSubscription()` hook.

**Codebase reality:**

- `SessionProvider` (line 108) fetches sub → stores in `PlatformGlobalDataProvider` context
- `LandingPage` (line 57) fetches sub → stores in local state
- These are **architecturally separate**: landing page is PUBLIC (`/pricing`), dashboard is PRIVATE (`/billing`)
- Landing page is NOT wrapped in `PlatformGlobalDataProvider` — different React tree entirely
- User never views both simultaneously — page navigation triggers fresh fetch
- Both call the identical DAL function (`getActiveSubscriptionForStore`)

**Why REJECT:** Merging these into one hook would require wrapping the entire public website in the same provider as the dashboard — a heavy refactor that adds complexity for zero user benefit. The "mismatch" scenario ChatGPT describes (webhook updates, dashboard shows new, website shows old) doesn't happen in practice because page navigation always re-fetches.

**Decision:** Keep current architecture. Document the intentional separation.

### RISK 2 — VALID: DAL Split

**ChatGPT says:** `getActiveSubscriptionForStore()` does query + grace period + expiry mutation + fallback + access decision. Too much in one function.

**Codebase reality:** Confirmed. The function (157 lines) handles:

1. Primary Firestore query
2. Paused subscription fallback query
3. Grace period calculation
4. Auto-expire mutation (WRITES during a READ operation)

**Why VALID:** The auto-expire mutation during a read is genuinely dangerous. If this function bugs, it could lock ALL users out. Splitting into composable pieces makes each testable independently and reduces blast radius.

**Implementation:** Split into `fetchSubscriptionRaw()`, `expireIfGracePeriodEnded()`, and compose in `getActiveSubscriptionForStore()`.

### RISK 3 — PARTIAL: State Machine

**ChatGPT says:** Full state machine with `transitionSubscription(currentState, event)` enforced everywhere.

**Codebase reality:** Status is set manually in 7 places (webhook: 5 cases, cancel route, upgrade route, DAL auto-expire, pause route, resume route, verify route).

**Why PARTIAL:** A full state machine with event-driven transitions is over-engineering for current scale. But a lightweight **transition validator** that prevents impossible states (e.g., `cancelled → past_due`) adds real safety with minimal complexity. The validator logs warnings for invalid transitions rather than throwing — since Razorpay webhooks are authoritative, we should never reject their events.

**Implementation:** Create `subscriptionStateMachine.ts` with `VALID_TRANSITIONS` map and `validateTransition()` function. Apply as guard before every `updateSubscription({ status: x })` call.

### RISK 4 — VALID: Daily Reconciliation

**ChatGPT says:** Add daily cron job to sync Firestore with Razorpay API.

**Codebase reality:** No reconciliation exists. If webhook fails entirely, user stays in stale state until next page load triggers verify or a new webhook arrives.

**Why VALID:** This is genuine production safety. Webhook failures are rare but real. A daily reconciliation job is the industry standard for payment systems. Simple to implement: query active/past_due subs, fetch from Razorpay, sync mismatches.

**Implementation:** Create `/api/internal/reconcile-subscriptions` route protected by `CRON_SECRET`. Add `vercel.json` cron config for daily execution.

### Items 5-8

- **Item 5 (Immutability):** VALID — add `@immutable` comments to types and doc section
- **Item 6 (Payment log):** Already done — `createPaymentTransaction()` is append-only, no update/delete methods exist
- **Item 7 (Lock architecture):** VALID — add "Frozen Core" governance section to architecture doc
- **Item 8 (Testing matrix):** DEFER — manual testing, documented in USER_JOURNEY_TRACKING.md already

---

## Additional Refactoring Fixes (Found During Deep Scan)

| #   | Issue                                     | File(s)                              | Action                                                    | Pattern                           |
| --- | ----------------------------------------- | ------------------------------------ | --------------------------------------------------------- | --------------------------------- |
| R1  | Debug `console.log` left in production    | `src/utils/razorpay.ts:19-25`        | **Removed** — was logging sensitive pastDueTimestamp data | Security hygiene                  |
| R2  | Duplicate `getPlanDetailsFromConstants()` | webhook + verify-subscription routes | **Extracted** to `src/lib/billing/billingUtils.ts`        | Pattern 1: Redundancy Elimination |
| R3  | Duplicate `getSubscriptionEndDate()`      | webhook + verify-subscription routes | **Extracted** to `src/lib/billing/billingUtils.ts`        | Pattern 1: Redundancy Elimination |
| R4  | Testing matrix not documented             | N/A                                  | **Created** Section 15 in ACTIVE_SUBSCRIPTION_FLOW.md     | ChatGPT suggestion #8             |

## Medium Risks Assessment

| Item                         | ChatGPT Says                 | Verdict                                                              |
| ---------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| Timezone currency            | "Not okay at scale"          | ❌ REJECT — explicit currency selection exists in plan purchase flow |
| total_count = 3 years        | "Document clearly"           | ✅ Already documented in ACTIVE_SUBSCRIPTION_FLOW.md                 |
| Billing history webhook-only | "Add invoice fetch fallback" | ✅ Already implemented — `getInvoiceById()` in webhook               |

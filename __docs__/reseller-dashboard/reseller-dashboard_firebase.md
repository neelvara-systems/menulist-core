# Reseller Dashboard — Firebase Cost Tracking

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** Implemented - reseller boundary source gate added July 2, 2026
**Created:** February 27, 2026  
**Last Updated:** July 17, 2026
**Audience:** Developers

---

## 1. New Collections

| Collection             | Doc ID Pattern | Purpose                                             |
| ---------------------- | -------------- | --------------------------------------------------- |
| `resellerTransactions` | Operation UUID for new writes; legacy rows may use generated IDs | Immutable financial/action inputs with bounded payment-status convergence fields |
| `resellerProfiles`     | `{profileId}`  | Reseller profile with caps, counts, status; lookup uses `{authUserId}` first, then email fallback |
| `users`                | `{authUserId}` | Reseller login account with `platformRole: 'RESELLER'`; no store assignment |

## 2. Modified Collections

| Collection      | Modified Fields                                                                                                                                                                                         | Purpose                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `subscriptions` | `billingMode`, `validUntil`, `onboardingSource`, `resellerId`, `resellerProfileId`, `resellerPricingTier`, `commitmentPeriodMonths`, `manualPaymentConfirmed`, `manualPaymentConfirmedAt`, `shortUrl`, `userId`, `email` | Reseller metadata on subscription doc |

---

## 3. Operations Per Feature

### 3.1 Reseller Onboarding (Create Store — Offline)

| Operation                        | Collection             | Type  | Count       | Notes                      |
| -------------------------------- | ---------------------- | ----- | ----------- | -------------------------- |
| Read platformSummary             | `platformSummary`      | READ  | 2           | Read `summary` and `storesSummary`; `storesSummary` bootstraps counters if `summary` is missing |
| Write tenant                     | `tenants`              | WRITE | 1           | Atomic transaction         |
| Write store                      | `stores`               | WRITE | 1           | Atomic transaction         |
| Write user (client)              | `users`                | WRITE | 1           | Client account creation    |
| Update platformSummary           | `platformSummary`      | WRITE | 1           | Increment counts           |
| Update storesSummary             | `platformSummary`      | WRITE | 1           | Sync store data            |
| Read operation/subscription/profile | reseller collections | READ | 2-3 | Billing transaction rechecks UUID, absence, current profile activity, and cap |
| Write subscription               | `subscriptions`        | WRITE | 1           | `billingMode: manual`, deterministic `manual_{operationId}` |
| Write operation                  | `resellerTransactions` | WRITE | 1           | Same UUID as request; immutable collected amount/scope |
| Update reseller profile          | `resellerProfiles`     | WRITE | 0-1         | Offline slot, totals, transaction count, and collected revenue in the same billing transaction |
| Refresh public cache             | Next.js cache tags     | CACHE | 0 Firebase ops | Calls `revalidateMenuCache(storeId, { tId })` after tenant/store transaction commit; failures are bounded and fail open |
| **Replay**                       | operation + subscription + store | READ | bounded | Exact retry returns existing handoff and writes nothing |

### 3.2 Reseller Onboarding (Create Store — Online)

Online uses the same account transaction and local billing transaction plus the external Razorpay Subscription call. The local operation starts `pending_payment` with `profileRevenueRecognized: false`; profile revenue remains unchanged until webhook activation transactionally converges the ledger and increments it once. Provider/local persistence failures follow cancel-before-compensate recovery.

July 16 onboarding consolidation adds one deterministic operation read and one subscription-absence read (plus profile when present) to the local billing transaction, while removing separate subscription, transaction, and profile commits. This is a correctness trade: cap enforcement, subscription truth, ledger truth, and counters can no longer diverge. Exact browser retries are write-free.

All reseller write routes apply `DATA_WRITE` throttling and a bounded 16KB JSON body cap before validation, subscription reads, account creation, or writes. Rate-limited, malformed, or oversized requests add no Firestore reads or writes. Successful reseller onboarding refreshes public menu, OBP, store, and client-store cache tags immediately after the tenant/store transaction commits, before subscription creation.

July 2 source-gate coverage is Firebase-cost neutral. `npm run verify:reseller-dashboard-boundary` now checks that reseller read and write routes keep their hashed rate-limit keys, bounded body/response parsers, manual subscription entitlement sync, online-provider compensation, capped read queries, desktop/mobile request policy, mobile shell mapping, and docs parity. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, route calls, Razorpay calls, cache invalidations, rules, indexes, schema fields, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 5 monthly-summary month filter boundary is Firebase-cost neutral. `/api/reseller/monthly-summary` still defaults missing `month` to the current India month, but invalid explicit `month` filters return `400` before Firestore reads. Valid explicit months must be calendar-valid `YYYY-MM` values from 2020 through 2100. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, route calls beyond existing valid monthly-summary reads, Razorpay calls, cache invalidations, rules, indexes, schema fields, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 1 online-provider failure compensation is failure-path only. If Razorpay plan lookup or subscription creation fails after the reseller tenant/store/user transaction commits, the route writes compensation state to `tenants/{tenantId}`, `stores/{storeId}`, `platformSummary/storesSummary`, and the owner `users/{userId}` document, clears the just-set owner custom claims to remove tenant/store scope, and revalidates public cache tags. Successful online and offline onboarding costs are unchanged.

July 14 provider-persistence compensation adds one exact subscription read only when local persistence throws after provider creation. A present matching row is treated as an ambiguous acknowledgement and retained. A definitively missing row triggers Razorpay cancellation; tenant/store/user compensation runs only after cancellation succeeds. If provider cancellation fails, no additional Firestore compensation writes run, preserving the customer scope needed to reconcile the live provider subscription.

July 14 manual mutation idempotency changes renewal/add-location from independent writes to one Firestore transaction keyed by required UUID `operationId`. First application reads the deterministic operation and current subscription, plus the reseller profile when present, then writes subscription + operation + profile together. A response-loss retry reads the stored operation result and writes nothing. This intentionally adds an operation read while preventing duplicate validity extension, quantity, transaction rows, and revenue counters. No rules, indexes, Functions, dependencies, or deploy target changed.

June 29 mutation limiter-key hardening is Firebase-cost neutral. `onboard`, `renew`, `add-location-capacity`, `confirm-payment`, and platform `manage` keep the same `DATA_WRITE` limits and request ordering, but hash reseller/user key segments before storage in Upstash. This resets existing mutation buckets once and changes no Firestore reads/writes/deletes, Firebase Auth operations, Razorpay calls, cache invalidations, rules, indexes, schema fields, or reseller UI behavior.

June 30 reseller mutation/security-log boundary hardening is Firebase-cost neutral. `onboard`, `renew`, `add-location-capacity`, and `confirm-payment` now use bounded route metadata for validation, profile, and authorization security events instead of raw `buildSecurityContext()` output. Platform `manage` success breadcrumbs keep bounded reseller metadata and no longer import raw security context. Valid request admission, reseller profile checks, subscription reads/writes, Firebase Auth owner/reseller account creation, Razorpay calls, entitlement sync, public cache invalidation, rules, indexes, schema fields, owner-facing settings, Firebase deploy requirement, and Vercel deploy action are unchanged.

June 29 onboarding Auth rollback diagnostics are cost-neutral in the success path. If a newly created Firebase Auth owner account must be rolled back after the Firestore onboarding transaction fails, the route still attempts the same `deleteUser()` cleanup. Failed cleanup now logs bounded `reseller_onboard_auth_cleanup_failed` diagnostics only. This adds no Firestore reads/writes/deletes, no Firebase Auth operations beyond the already-attempted rollback delete, no Razorpay calls, cache invalidations, rules, indexes, schema fields, owner-facing settings, or deploy requirements.

July 11 owner single-claim concurrency boundary adds one authoritative owner-document read at the start of the existing tenant/store creation transaction. Existing unlinked owners must still have the expected email/Auth UID and no tenant/store; new owners require the deterministic Auth UID document to remain absent. Competing onboardings therefore conflict before tenant/store writes, and the loser returns 409. Auth rollback now deletes a request-created identity only when `users/{authUid}` is still absent, so it cannot remove an identity a competing transaction has bound. Successful onboarding retains the same writes and adds one transaction read; no rules, indexes, Functions or deploy action changed.

June 29 browser response-parse hardening is Firebase-cost neutral. `src/hooks/useResellerDashboard.ts` caps profile, clients, and monthly-summary response JSON at 64KB, uses `no-store`, same-origin credentials, and manual redirect handling before parsing those route responses, logs `reseller_dashboard_response_parse_failed` / `reseller_dashboard_response_invalid` with bounded phase/status metadata, and rejects malformed successful responses through fixed local load errors. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 platform reseller management request/response hardening is Firebase-cost neutral. Desktop and mobile platform management callers send `/api/reseller/manage` and `/api/reseller/monthly-summary` requests with no-store cache, same-origin credentials, and manual redirect handling, cap response JSON at 64KB, log `desktop_reseller_management_response_parse_failed` / `mobile_reseller_management_response_parse_failed` for malformed or oversized responses, and require valid profile-list, monthly-summary, and save acknowledgement shapes before platform UI state updates. This adds no Firestore reads/writes/deletes beyond existing valid reseller management reads/writes, Storage operations, Firebase Auth changes beyond existing valid profile creation, new route calls, reseller profile writes beyond existing valid saves, monthly summary reads beyond existing valid loads, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 1 reseller management update acknowledgement hardening is Firebase-cost neutral. Desktop and mobile management save handlers now require update acknowledgements to return the edited `profileId` before closing the editor or showing saved success. This changes no `/api/reseller/manage` reads/writes, Firebase Auth operations, route calls, reseller profile writes, monthly summary reads, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 5 platform reseller management profile-id boundary is Firebase-cost neutral. `/api/reseller/manage` validates the exact raw update `profileId` through the shared Firestore document-ID boundary before reseller profile lookup, Firebase Auth sync, or profile merge work, so whitespace-mutated IDs fail before Firestore reads/writes. This changes no valid `/api/reseller/manage` reads/writes, Firebase Auth operations, route calls, reseller profile writes, monthly summary reads, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

Desktop and mobile reseller onboarding callers send `/api/reseller/onboard` requests with no-store cache, same-origin credentials, and manual redirect handling, cap response JSON at 16KB, log bounded parse failures, and require matching store, tenant, subscription, request operation/transaction ID, and status fields before rendering returned login/link details. This browser acknowledgement validation adds no Firebase operation.

July 1 add-location request/response hardening is also Firebase-cost neutral. Desktop and mobile reseller dashboard callers send `/api/reseller/add-location-capacity` requests with no-store cache, same-origin credentials, and manual redirect handling, cap response JSON at 8KB, log `desktop_reseller_dashboard_add_location_response_parse_failed` / `mobile_reseller_dashboard_add_location_response_parse_failed` for malformed or oversized responses, and require `success: true`, positive numeric `amountExpected`, the requested store id, requested tenant id, and requested location count before showing the amount to collect. This adds no Firestore reads/writes/deletes beyond existing valid add-location writes, Storage operations, Firebase Auth changes, new route calls, billing writes beyond existing valid capacity updates, transaction writes beyond existing valid capacity updates, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 reseller copy acknowledgement hardening is browser-local and Firebase-cost neutral. Desktop and mobile onboarding/dashboard copy actions for returned payment links, dashboard links, public links, owner usernames, login emails, owner passwords, and pending payment links now show copied feedback only after Clipboard API success or acknowledged textarea fallback success. Failed copy diagnostics add clipboard/fallback support booleans to existing bounded handoff context. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, route calls, Razorpay calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

### 3.3 Confirm Offline Payment

| Operation | Collection | Type | Count | Notes |
| --- | --- | --- | ---: | --- |
| Re-read current authority | `resellerProfiles` or `users` | READ | 1 | Exact active reseller identity or current platform authority |
| Transactionally read subscription | `subscriptions` | READ | 1 | Exact ownership/product/scope/manual/pending admission |
| Confirm subscription | `subscriptions` | WRITE | 0-1 | One write on first confirmation; no write for an idempotent replay |
| Reconcile entitlement/referral | `stores`, `platformSummary`, `subscriptions`, referral settlement state | READ/WRITE | state-dependent | Existing safe repair paths run after both first success and replay; public/assistant cache invalidation follows entitlement truth |

Concurrent confirmations serialize on the subscription document. Only one request appends the active status. A retry after a committed response loss returns `alreadyConfirmed: true` and reruns idempotent derived-state repair instead of returning a false failure. Cancelled, expired, completed, past-due, online, foreign-reseller, wrong-product, incoherent-scope, malformed amount/currency, and oversized-history documents are not mutated.

### 3.4 List Reseller Clients

| Operation | Collection | Type | Count | Notes |
| --------- | ---------- | ---- | ----- | ----- |
| Query current clients | `subscriptions` | READ | up to 101 reseller / 201 platform | Direct current-subscription projection ordered by `createdOn desc` before the cap; final row is overflow detection. Composite indexes cover reseller and platform filters. |
| Return bounded state | none | LOCAL | 0 | Normalizes pending status/payment URL and returns `isPartial`; browser dedupes historical replacement subscriptions by store |
| **Total** | | | **one bounded subscription query** | Removes the former ledger query plus exact subscription `getAll()` fan-out. Deterministic newest-first ordering prevents the cap from returning an arbitrary historical window without increasing reads. |

The daily leased billing/reseller maintenance task also repairs the shared `billingEntitlementSyncPending` marker before checking the reseller feature flag. This keeps ordinary Razorpay cancellation/paused-cycle mirror failures recoverable even when the reseller dashboard is disabled. The repair query remains capped at five 100-row pages and adds only one empty-query minimum on a disabled-reseller day.

There is no separate reseller client-detail route. Renewal/add-location mutations use the selected current subscription scope from this bounded list and transactionally re-read it before writing.

### 3.5A Claimed Client Billing View

| Operation | Collection | Type | Count | Notes |
| --------- | ---------- | ---- | ----- | ----- |
| Query active/current subscription | `subscriptions` | READ | 1 | Existing billing lookup |
| Query pending subscription fallback | `subscriptions` | READ | 0-1 | Only when no current subscription exists; keeps reseller-online checkout visible before payment |
| Query billing history | `paymentTransactions` | READ | 0-1 | User-triggered only |
| **Total** | | | **1-2R + optional history read** | No writes during normal screen load |

### 3.6 Reseller Profile

| Operation    | Collection         | Type | Count  | Notes        |
| ------------ | ------------------ | ---- | ------ | ------------ |
| Read profile | `resellerProfiles` | READ | 1-2    | Direct auth-user doc lookup, then email fallback for legacy auto-ID profiles |
| **Total**    |                    |      | **1-2R** |            |

### 3.6A Monthly Summary

| Operation | Collection | Type | Count | Notes |
| --------- | ---------- | ---- | ----- | ----- |
| Query transactions | `resellerTransactions` | READ | up to 2000 monthly rows | Date range scoped; non-platform also filters `resellerId` |
| Read visible profile docs | `resellerProfiles` | READ | 1-2 reseller / up to 50 platform | Reseller users no longer read the full profile collection |
| **Total** | | | **bounded monthly rows + bounded profile docs** | |

### 3.7 Reseller Management

| Operation | Collection / Service | Type | Count | Notes |
| --------- | -------------------- | ---- | ----- | ----- |
| Create login account | Firebase Auth | AUTH WRITE | 1 | Password stored only in Firebase Auth |
| Write reseller user | `users` | WRITE | 1 | `platformRole: 'RESELLER'`, no store assignment |
| Write reseller profile | `resellerProfiles` | WRITE | 1 | New profiles use the Auth UID as document ID; legacy generated profile IDs remain supported through `authUserId`/email authority lookup |
| Duplicate checks | `resellerProfiles`, `users`, Firebase Auth | READ/AUTH READ | 2R + 1 auth lookup | Prevents duplicate email/username/login accounts |

### 3.8 Renew License

| Operation             | Collection             | Type  | Count | Notes |
| --------------------- | ---------------------- | ----- | ----- | ----- |
| Read operation        | `resellerTransactions/{operationId}` | READ | 1 | Returns stored result on exact replay; mismatched reuse fails |
| Re-read subscription  | `subscriptions`        | READ  | 1 | Transaction-current eligibility, quantity, and renewal anchor |
| Read profile          | `resellerProfiles`     | READ  | 0-1 | Only when a profile counter must be updated |
| Update subscription   | `subscriptions`        | WRITE | 0-1 | Extend `validUntil` only on first application |
| Create operation      | `resellerTransactions` | WRITE | 0-1 | Deterministic immutable renewal result |
| Update profile        | `resellerProfiles`     | WRITE | 0-1 | Revenue/transaction counters; expired renewal also reacquires one active-offline slot after a cap check |
| **Replay**            |                        |       | **2R, 0W** | Existing exact operation is returned without another extension |

### 3.8A Add Manual Location Capacity

The add-location route uses the same operation/subscription/profile transaction pattern. On first application it adds paid quantity and amount and creates `resellerTransactions/{operationId}` with `action: ADD_LOCATION`; an exact replay returns the stored `amountExpected`, quantity, days, and expiry with zero writes.

### 3.8B Owner Credential Linkage

| Operation | Collection | Type | Count | Notes |
| --------- | ---------- | ---- | ----- | ----- |
| Prepare Firebase Auth owner | Firebase Auth | AUTH READ/WRITE | 1-2 | Existing compatible UID/email is reused or a new owner is created |
| Claim `users/{authUid}` | `users` | transaction read/write | 1R + 1W | Prevents concurrent owner scope binding |
| Persist subscription owner | `subscriptions` | WRITE | included in onboarding billing | Subscription is created with the real owner UID/login email; no later claim-link rewrite is required |

### 3.8C Browser Handoff Diagnostics

| Operation | Collection / Service | Type | Count | Notes |
| --------- | -------------------- | ---- | ----- | ----- |
| Copy returned onboarding values | Browser Clipboard API | LOCAL | 0 Firebase ops | Logs bounded failure metadata only when clipboard copy fails |
| Share returned onboarding links | Browser Native Share API | LOCAL | 0 Firebase ops | Expected user cancel is ignored; real share failures use bounded metadata |
| Open pending payment links | Browser popup handoff | LOCAL | 0 Firebase ops | Logs bounded failure metadata only when the payment-link open is blocked or throws |
| Read onboarding acknowledgement | Browser fetch response | LOCAL | 0 Firebase ops | Caps acknowledgement JSON at 16KB and requires matching store/tenant/subscription/request-operation/status before success UI |
| Read add-location acknowledgement | Browser fetch response | LOCAL | 0 Firebase ops | Caps acknowledgement JSON at 8KB and shape-checks `success`, `amountExpected`, store id, tenant id, and location count before success UI |
| Read renewal acknowledgement | Browser fetch response | LOCAL | 0 Firebase ops | Caps acknowledgement JSON at 8KB and requires matching store, tenant, subscription, operation ID, amount, and validity date |

These diagnostics do not add Firestore reads, writes, deletes, Storage operations, Firebase Auth changes, Cloud Function calls, API routes, rules, indexes, schema fields, cache invalidations, or Firebase deploy requirements. Raw returned URLs, owner credentials, login emails, and passwords are not logged.

### 3.9 Daily Expiry Check (Cloud Function)

| Operation                         | Collection                  | Type  | Count             | Notes |
| --------------------------------- | --------------------------- | ----- | ----------------- | ----- |
| Query manual active subs          | `subscriptions`             | READ  | up to 100         | Composite index query capped at 100 expired candidates per run |
| Update expired subscriptions      | `subscriptions`             | WRITE | N                 | Mark subscription expired, set end dates, append status history, mirror analytics entitlement |
| Decrement reseller profile count  | `resellerProfiles`          | WRITE | 0-N               | Only when the subscription has `resellerProfileId` or `resellerId` |
| Clear store entitlement           | `stores`                    | WRITE | 0-N               | Removes stale `activePlanType` for public/business truth |
| Clear platform summary entitlement| `platformSummary/storesSummary` | WRITE | 0-N          | Keeps cached store summary entitlement aligned |
| Touch digital screen version      | `platformSummary`           | READ/WRITE | 0-N reads, 0-2N writes | Only when public cache revalidation is configured and the store has a screen token |
| Public/OBA cache invalidation     | HTTP / Redis                | External | 0-N calls      | Public menu/OBP cache revalidation plus owner-business-assistant Redis packet invalidation |
| **Total per run**                 |                             |       | **up to 100R + bounded writes** | N = expired subscriptions in the capped run |

---

## 4. Server/API Boundaries

| Function                       | Collection                                                                                     | Operations | Location                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------- |
| `createResellerOnboardingBillingServer()` | subscriptions, resellerTransactions, resellerProfiles | 2-3 transaction reads + 2-3 writes; replay 0 writes | `src/database/reseller/server.ts` |
| `confirmManualSubscriptionPaymentServer()` | subscriptions | one transaction read + 0-1 write | `src/database/subscriptions/server.ts` |
| `getResellerClients()`         | subscriptions | One bounded query; no ledger fan-out | `src/app/api/reseller/clients/route.ts` |
| `getResellerProfile()`         | resellerProfiles | 1-2 reads | `src/database/reseller/server.ts` |
| `renewResellerLicense()`       | subscriptions, resellerTransactions, resellerProfiles                                           | 2-3 transaction reads + 0-3 writes; replay 0 writes | `src/app/api/reseller/renew/route.ts` |
| `addManualLocationCapacity()`  | subscriptions, resellerTransactions, resellerProfiles                                           | 2-3 transaction reads + 0-3 writes; replay 0 writes | `src/app/api/reseller/add-location-capacity/route.ts` |
| `reseller_license_expiry` | subscriptions, resellerProfiles, stores, platformSummary, HTTP cache revalidation, OBA Redis cache | Up to five 100-row expiry pages; one subscription/profile transaction per confirmed expiry; bounded pending-entitlement retry pages; current-active entitlement transaction and cache invalidation | `functions/src/schedulers/menulistMaintenanceScheduler.ts` |

---

## 5. Firestore Indexes Required

### New Composite Indexes

```json
[
  {
    "collectionGroup": "subscriptions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "billingMode", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "validUntil", "order": "ASCENDING" }
    ]
  }
]
```

The current-client screen queries single-field `subscriptions.resellerId` or `subscriptions.onboardingSource` and needs no new composite index. The monthly ledger report continues using its existing reseller/date index. This keeps current state and immutable history on separate, bounded read paths.

---

## 6. Cost Estimate

### Monthly Assumptions

- 5 active resellers
- 20 onboardings/month (mix of online/offline)
- 5 client list views/day
- 2 renewals/month
- 1 daily expiry check

### Monthly Cost Breakdown

| Operation | Read/write shape | Deletes |
| --------- | ---------------- | ------- |
| Onboarding | Existing tenant/store/user transaction plus one subscription, onboarding transaction, and optional profile update | 0 |
| Payment confirmation | Authority + transaction-current subscription reads; first application writes subscription, then runs state-dependent entitlement/referral repair; replay does no second confirmation write | 0 |
| Client list/profile | One bounded current-subscription query plus the separate profile read | 0 |
| Renewal/add location | 2-3 transaction reads and 0-3 writes on first application; exact operation replay writes 0 | 0 |
| Daily expiry | Up to five 100-row pages plus transaction rechecks and mismatch/entitlement writes only for confirmed expired/pending rows | 0 |

Do not use the former fixed monthly total for forecasting: billed reads depend on returned documents, visible-client subscription lookups, expired candidates, contention retries, and entitlement repair. Use Firebase usage by collection plus the bounded route shapes above.

**Verdict:** The flow is bounded and materially cheaper than the former ledger-plus-subscription fan-out, but no fixed currency estimate is asserted. Use Firebase usage by collection because transaction retries, returned rows, provider events, and repair work determine billing.

---

## 7. Storage Impact

- `resellerProfiles`: ~10 docs × ~500 bytes = ~5 KB
- `resellerTransactions`: ~20 docs/month × ~800 bytes = ~16 KB/month
- Subscription field additions: ~200 bytes per reseller-onboarded sub

**Verdict:** Negligible storage impact.

---

## 8. Security Rules

```
// firestore.rules additions
match /resellerTransactions/{docId} {
  allow read: if isAuthenticated()
    && (isPlatformAdmin()
      || resource.data.resellerId == request.auth.uid
      || resource.data.resellerId == request.auth.token.uId);
  allow write: if false;
}

match /resellerProfiles/{profileId} {
  allow read: if isAuthenticated()
    && (isPlatformAdmin()
      || resource.data.authUserId == request.auth.uid
      || resource.data.authUserId == request.auth.token.uId
      || profileId == request.auth.uid
      || profileId == request.auth.token.uId);
  allow write: if false;
}
```

Reseller mutations go through API routes (server-side with `withAuth`), `DATA_WRITE` rate limiting with hashed reseller/user key material, bounded JSON parsing, and Zod validation. Browser dashboard reads also use server APIs with the shared `DATA_READ` cheap-fail gate; direct rules remain least-privilege compatible for authenticated platform/own-profile history reads and deny every client write. The shared hook caps response parsing and shape-checks profile, clients (including `isPartial`), and monthly-summary responses before UI state updates.

---

**DOCUMENT STATUS:** 📝 DOCUMENTED  
**Last Updated:** July 16, 2026

# Reseller Dashboard — Firebase Cost Tracking

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** Implemented - reseller boundary source gate added July 2, 2026
**Created:** February 27, 2026  
**Last Updated:** July 2, 2026
**Audience:** Developers

---

## 1. New Collections

| Collection             | Doc ID Pattern | Purpose                                             |
| ---------------------- | -------------- | --------------------------------------------------- |
| `resellerTransactions` | Auto-ID        | Immutable transaction log for every reseller action |
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
| Write subscription               | `subscriptions`        | WRITE | 1           | With billingMode: 'manual' |
| Write transaction                | `resellerTransactions` | WRITE | 1           | Immutable log              |
| Update reseller profile          | `resellerProfiles`     | WRITE | 0-1         | Increment offline/online counters, transaction count, and tracked revenue when a reseller profile exists |
| Refresh public cache             | Next.js cache tags     | CACHE | 0 Firebase ops | Calls `revalidateMenuCache(storeId, { tId })` after tenant/store transaction commit; failures are bounded and fail open |
| **Total per offline onboarding** |                        |       | **2R + 7-8W** |                          |

### 3.2 Reseller Onboarding (Create Store — Online)

Same as offline, minus reseller profile offline cap update unless a profile exists for online-count tracking. Uses existing Razorpay Subscription creation (external API call, not Firestore). Webhook handling is identical to self-serve.

| **Total per online onboarding** | | | **2R + 6-7W** | |

All reseller write routes apply `DATA_WRITE` throttling and a bounded 16KB JSON body cap before validation, subscription reads, account creation, or writes. Rate-limited, malformed, or oversized requests add no Firestore reads or writes. Successful reseller onboarding refreshes public menu, OBP, store, and client-store cache tags immediately after the tenant/store transaction commits, before subscription creation.

July 2 source-gate coverage is Firebase-cost neutral. `npm run verify:reseller-dashboard-boundary` now checks that reseller read and write routes keep their hashed rate-limit keys, bounded body/response parsers, manual subscription entitlement sync, online-provider compensation, capped read queries, desktop/mobile request policy, mobile shell mapping, and docs parity. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, route calls, Razorpay calls, cache invalidations, rules, indexes, schema fields, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 1 online-provider failure compensation is failure-path only. If Razorpay plan lookup or subscription creation fails after the reseller tenant/store/user transaction commits, the route writes compensation state to `tenants/{tenantId}`, `stores/{storeId}`, `platformSummary/storesSummary`, and the owner `users/{userId}` document, clears the just-set owner custom claims to remove tenant/store scope, and revalidates public cache tags. Successful online and offline onboarding costs are unchanged.

June 29 mutation limiter-key hardening is Firebase-cost neutral. `onboard`, `renew`, `add-location-capacity`, `confirm-payment`, and platform `manage` keep the same `DATA_WRITE` limits and request ordering, but hash reseller/user key segments before storage in Upstash. This resets existing mutation buckets once and changes no Firestore reads/writes/deletes, Firebase Auth operations, Razorpay calls, cache invalidations, rules, indexes, schema fields, or reseller UI behavior.

June 30 reseller mutation/security-log boundary hardening is Firebase-cost neutral. `onboard`, `renew`, `add-location-capacity`, and `confirm-payment` now use bounded route metadata for validation, profile, and authorization security events instead of raw `buildSecurityContext()` output. Platform `manage` success breadcrumbs keep bounded reseller metadata and no longer import raw security context. Valid request admission, reseller profile checks, subscription reads/writes, Firebase Auth owner/reseller account creation, Razorpay calls, entitlement sync, public cache invalidation, rules, indexes, schema fields, owner-facing settings, Firebase deploy requirement, and Vercel deploy action are unchanged.

June 29 onboarding Auth rollback diagnostics are cost-neutral in the success path. If a newly created Firebase Auth owner account must be rolled back after the Firestore onboarding transaction fails, the route still attempts the same `deleteUser()` cleanup. Failed cleanup now logs bounded `reseller_onboard_auth_cleanup_failed` diagnostics only. This adds no Firestore reads/writes/deletes, no Firebase Auth operations beyond the already-attempted rollback delete, no Razorpay calls, cache invalidations, rules, indexes, schema fields, owner-facing settings, or deploy requirements.

June 29 browser response-parse hardening is Firebase-cost neutral. `src/hooks/useResellerDashboard.ts` caps profile, clients, and monthly-summary response JSON at 64KB, uses `no-store`, same-origin credentials, and manual redirect handling before parsing those route responses, logs `reseller_dashboard_response_parse_failed` / `reseller_dashboard_response_invalid` with bounded phase/status metadata, and rejects malformed successful responses through fixed local load errors. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 platform reseller management request/response hardening is Firebase-cost neutral. Desktop and mobile platform management callers send `/api/reseller/manage` and `/api/reseller/monthly-summary` requests with no-store cache, same-origin credentials, and manual redirect handling, cap response JSON at 64KB, log `desktop_reseller_management_response_parse_failed` / `mobile_reseller_management_response_parse_failed` for malformed or oversized responses, and require valid profile-list, monthly-summary, and save acknowledgement shapes before platform UI state updates. This adds no Firestore reads/writes/deletes beyond existing valid reseller management reads/writes, Storage operations, Firebase Auth changes beyond existing valid profile creation, new route calls, reseller profile writes beyond existing valid saves, monthly summary reads beyond existing valid loads, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 1 reseller management update acknowledgement hardening is Firebase-cost neutral. Desktop and mobile management save handlers now require update acknowledgements to return the edited `profileId` before closing the editor or showing saved success. This changes no `/api/reseller/manage` reads/writes, Firebase Auth operations, route calls, reseller profile writes, monthly summary reads, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 onboarding request/response hardening is Firebase-cost neutral. Desktop and mobile reseller onboarding callers send `/api/reseller/onboard` requests with no-store cache, same-origin credentials, and manual redirect handling, cap response JSON at 16KB, log `desktop_reseller_onboard_response_parse_failed` / `mobile_reseller_onboard_response_parse_failed` for malformed or oversized acknowledgements, and require store, tenant, subscription, and status fields before rendering returned login/link details. This adds no Firestore reads/writes/deletes beyond existing valid onboarding writes, Storage operations, Firebase Auth changes beyond existing valid owner creation, new route calls, subscription writes beyond existing valid onboarding, transaction writes beyond existing valid onboarding, cache invalidations beyond existing valid onboarding, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 1 add-location request/response hardening is also Firebase-cost neutral. Desktop and mobile reseller dashboard callers send `/api/reseller/add-location-capacity` requests with no-store cache, same-origin credentials, and manual redirect handling, cap response JSON at 8KB, log `desktop_reseller_dashboard_add_location_response_parse_failed` / `mobile_reseller_dashboard_add_location_response_parse_failed` for malformed or oversized responses, and require `success: true`, positive numeric `amountExpected`, the requested store id, requested tenant id, and requested location count before showing the amount to collect. This adds no Firestore reads/writes/deletes beyond existing valid add-location writes, Storage operations, Firebase Auth changes, new route calls, billing writes beyond existing valid capacity updates, transaction writes beyond existing valid capacity updates, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 reseller copy acknowledgement hardening is browser-local and Firebase-cost neutral. Desktop and mobile onboarding/dashboard copy actions for returned payment links, dashboard links, public links, owner usernames, login emails, owner passwords, and pending payment links now show copied feedback only after Clipboard API success or acknowledged textarea fallback success. Failed copy diagnostics add clipboard/fallback support booleans to existing bounded handoff context. This adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, route calls, Razorpay calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

### 3.3 Confirm Offline Payment

| Operation               | Collection             | Type  | Count       | Notes                  |
| ----------------------- | ---------------------- | ----- | ----------- | ---------------------- |
| Read subscription       | `subscriptions`        | READ  | 1           | Verify ownership       |
| Update subscription     | `subscriptions`        | WRITE | 1           | Set active + confirmed |
| Sync store entitlement  | `stores`, `platformSummary`, `subscriptions` | WRITE | 2-3 | Mirrors active plan and invalidates public/assistant cache |
| **Total**               |                        |       | **1R + 3-4W** |                      |

### 3.4 List Reseller Clients

| Operation          | Collection             | Type | Count  | Notes                    |
| ------------------ | ---------------------- | ---- | ------ | ------------------------ |
| Query transactions | `resellerTransactions` | READ | up to 100 reseller / 200 platform | Where resellerId == user for resellers; platform sees latest 200 |
| Read current subscriptions | `subscriptions` | READ | up to one per visible subscription ID | Bounded `getAll()` keeps current status/quantity/payment-link accurate without duplicating subscription truth into every transaction |
| **Total**          |                        |      | **bounded transaction rows + bounded subscription docs** | |

### 3.5 Client Detail

| Operation          | Collection             | Type | Count  | Notes                  |
| ------------------ | ---------------------- | ---- | ------ | ---------------------- |
| Read subscription  | `subscriptions`        | READ | 1      | Current status         |
| Query transactions | `resellerTransactions` | READ | 1      | History for this store |
| **Total**          |                        |      | **2R** |                        |

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
| Write reseller profile | `resellerProfiles` | WRITE | 1 | Doc ID matches auth user ID for 1-read profile lookup |
| Duplicate checks | `resellerProfiles`, `users`, Firebase Auth | READ/AUTH READ | 2R + 1 auth lookup | Prevents duplicate email/username/login accounts |

### 3.8 Renew License

| Operation             | Collection             | Type  | Count       | Notes              |
| --------------------- | ---------------------- | ----- | ----------- | ------------------ |
| Read subscription     | `subscriptions`        | READ  | 1           | Current state      |
| Update subscription   | `subscriptions`        | WRITE | 1           | Extend validUntil  |
| Write transaction     | `resellerTransactions` | WRITE | 1           | New renewal record |
| **Total per renewal** |                        |       | **1R + 2W** |                    |

### 3.8A Account Claim Linkage

| Operation | Collection | Type | Count | Notes |
| --------- | ---------- | ---- | ----- | ----- |
| Query subscriptions for tenant/store | `subscriptions` | READ | 1 | Runs only when client claims reseller-created account |
| Update matching subscriptions | `subscriptions` | WRITE | N | Sets real `userId`, `email`, and owner name; N is normally 1 |
| **Total per claim** | | | **1R + NW** | Keeps billing/audit owner identity aligned |

### 3.8B Browser Handoff Diagnostics

| Operation | Collection / Service | Type | Count | Notes |
| --------- | -------------------- | ---- | ----- | ----- |
| Copy returned onboarding values | Browser Clipboard API | LOCAL | 0 Firebase ops | Logs bounded failure metadata only when clipboard copy fails |
| Share returned onboarding links | Browser Native Share API | LOCAL | 0 Firebase ops | Expected user cancel is ignored; real share failures use bounded metadata |
| Open pending payment links | Browser popup handoff | LOCAL | 0 Firebase ops | Logs bounded failure metadata only when the payment-link open is blocked or throws |
| Read onboarding acknowledgement | Browser fetch response | LOCAL | 0 Firebase ops | Caps acknowledgement JSON at 16KB and shape-checks returned store/tenant/subscription/status before success UI |
| Read add-location acknowledgement | Browser fetch response | LOCAL | 0 Firebase ops | Caps acknowledgement JSON at 8KB and shape-checks `success`, `amountExpected`, store id, tenant id, and location count before success UI |

These diagnostics do not add Firestore reads, writes, deletes, Storage operations, Firebase Auth changes, Cloud Function calls, API routes, rules, indexes, schema fields, cache invalidations, or Firebase deploy requirements. Raw returned URLs, owner credentials, login emails, and passwords are not logged.

### 3.9 Nightly Expiry Check (Cloud Function)

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

## 4. DAL Functions

| Function                       | Collection                                                                                     | Operations | Location                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------- |
| `createResellerOnboarding()`   | tenants, stores, users, platformSummary, subscriptions, resellerTransactions, resellerProfiles | 2R + 7-8W  | `src/app/api/reseller/onboard/route.ts` |
| `confirmOfflinePayment()`      | subscriptions, resellerTransactions, resellerProfiles                                          | 1R + 3W    | `src/database/reseller/index.ts`         |
| `getResellerClients()`         | resellerTransactions, subscriptions                                                           | Bounded transaction query + bounded subscription reads | `src/app/api/reseller/clients/route.ts` |
| `getClientDetail()`            | subscriptions, resellerTransactions                                                            | 2R         | `src/database/reseller/index.ts`         |
| `getResellerProfile()`         | resellerProfiles                                                                               | 1-2R       | `src/database/reseller/index.ts`         |
| `renewResellerLicense()`       | subscriptions, resellerTransactions, resellerProfiles                                           | 1R + 2-3W  | `src/app/api/reseller/renew/route.ts`    |
| `addManualLocationCapacity()`  | subscriptions, resellerTransactions, resellerProfiles                                           | 1R + 3W    | `src/app/api/reseller/add-location-capacity/route.ts` |
| `reseller_license_expiry` | subscriptions, resellerProfiles, stores, platformSummary, HTTP cache revalidation, OBA Redis cache | Capped query + bounded writes | `functions/src/schedulers/menulistMaintenanceScheduler.ts` |

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

Reseller transaction screens query by reseller/store and sort the bounded result set in the client. That keeps the dashboard usable without reseller-specific composite indexes and avoids extra index write/storage overhead for a low-volume operational table.

---

## 6. Cost Estimate

### Monthly Assumptions

- 5 active resellers
- 20 onboardings/month (mix of online/offline)
- 10 client detail views/day
- 5 client list views/day
- 2 renewals/month
- 1 nightly expiry check (30 nights/month)

### Monthly Cost Breakdown

| Operation                              | Reads   | Writes  | Deletes |
| -------------------------------------- | ------- | ------- | ------- |
| Onboardings (20 × 2R + 7-8W)           | 40      | 140-160 | 0       |
| Payment confirmations (10 × 1R + 3W)   | 10      | 30      | 0       |
| Client list views (5/day × 30 × 1R)    | 150     | 0       | 0       |
| Client detail views (10/day × 30 × 2R) | 600     | 0       | 0       |
| Profile views (5/day × 30 × 1R)        | 150     | 0       | 0       |
| Renewals (2 × 1R + 2W)                 | 2       | 4       | 0       |
| Nightly expiry (30 × 1R + ~1W)         | 30      | 30      | 0       |
| **Monthly Total**                      | **962** | **224** | **0**   |

### Cost

| Resource          | Count | Rate           | Cost       |
| ----------------- | ----- | -------------- | ---------- |
| Reads             | 962   | $0.06 per 100K | $0.0006    |
| Writes            | 224   | $0.18 per 100K | $0.0004    |
| **Monthly Total** |       |                | **~₹0.08** |

**Verdict:** Negligible cost. Well within free tier even at 10x scale.

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
  allow read, write: if false; // Admin SDK only (server-side)
}

match /resellerProfiles/{profileId} {
  allow read, write: if false; // Admin SDK only (server-side)
}
```

Reseller mutations go through API routes (server-side with `withAuth`), `DATA_WRITE` rate limiting with hashed reseller/user key material, bounded JSON parsing, and Zod validation. Dashboard reads also use server API routes with the shared `DATA_READ` cheap-fail gate before reseller profile, transaction, subscription, or platform profile reads. The shared browser dashboard hook caps response parsing and shape-checks successful profile, clients, and monthly-summary payloads before updating UI state. The shared reseller read limiter stores only HMAC-hashed user/profile key material in the provider key.

---

**DOCUMENT STATUS:** 📝 DOCUMENTED  
**Last Updated:** July 1, 2026

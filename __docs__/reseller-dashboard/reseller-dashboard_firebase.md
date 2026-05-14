# Reseller Dashboard — Firebase Cost Tracking

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** 📝 DOCUMENTED  
**Created:** February 27, 2026  
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
| **Total per offline onboarding** |                        |       | **2R + 7-8W** |                          |

### 3.2 Reseller Onboarding (Create Store — Online)

Same as offline, minus reseller profile offline cap update unless a profile exists for online-count tracking. Uses existing Razorpay Subscription creation (external API call, not Firestore). Webhook handling is identical to self-serve.

| **Total per online onboarding** | | | **2R + 6-7W** | |

### 3.3 Confirm Offline Payment

| Operation               | Collection             | Type  | Count       | Notes                  |
| ----------------------- | ---------------------- | ----- | ----------- | ---------------------- |
| Read subscription       | `subscriptions`        | READ  | 1           | Verify ownership       |
| Update subscription     | `subscriptions`        | WRITE | 1           | Set active + confirmed |
| Update transaction      | `resellerTransactions` | WRITE | 1           | Update status          |
| Update reseller profile | `resellerProfiles`     | WRITE | 1           | Increment count        |
| **Total**               |                        |       | **1R + 3W** |                        |

### 3.4 List Reseller Clients

| Operation          | Collection             | Type | Count  | Notes                    |
| ------------------ | ---------------------- | ---- | ------ | ------------------------ |
| Query transactions | `resellerTransactions` | READ | 1      | Where resellerId == user |
| **Total**          |                        |      | **1R** |                          |

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

### 3.9 Nightly Expiry Check (Cloud Function)

| Operation                | Collection      | Type  | Count       | Notes                      |
| ------------------------ | --------------- | ----- | ----------- | -------------------------- |
| Query manual active subs | `subscriptions` | READ  | 1           | Composite index query      |
| Update expired subs      | `subscriptions` | WRITE | N           | N = number of expired subs |
| **Total per run**        |                 |       | **1R + NW** | N typically 0-5            |

---

## 4. DAL Functions

| Function                       | Collection                                                                                     | Operations | Location                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------- |
| `createResellerOnboarding()`   | tenants, stores, users, platformSummary, subscriptions, resellerTransactions, resellerProfiles | 2R + 7-8W  | `src/app/api/reseller/onboard/route.ts` |
| `confirmOfflinePayment()`      | subscriptions, resellerTransactions, resellerProfiles                                          | 1R + 3W    | `src/database/reseller/index.ts`         |
| `getResellerClients()`         | resellerTransactions                                                                           | 1R         | `src/database/reseller/index.ts`         |
| `getClientDetail()`            | subscriptions, resellerTransactions                                                            | 2R         | `src/database/reseller/index.ts`         |
| `getResellerProfile()`         | resellerProfiles                                                                               | 1-2R       | `src/database/reseller/index.ts`         |
| `renewResellerLicense()`       | subscriptions, resellerTransactions, resellerProfiles                                           | 1R + 2-3W  | `src/app/api/reseller/renew/route.ts`    |
| `checkResellerLicenseExpiry()` | subscriptions                                                                                  | 1R + NW    | `functions/src/decisionBlocksScoring.ts` |

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

Reseller mutations go through API routes (server-side with `withAuth`). Dashboard reads use the existing client DAL with Firestore rules and session-gated UI access.

---

**DOCUMENT STATUS:** 📝 DOCUMENTED  
**Last Updated:** February 27, 2026

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
| `resellerProfiles`     | `{userId}`     | Reseller profile with caps, counts, status          |

## 2. Modified Collections

| Collection      | Modified Fields                                                                                                                                                                                         | Purpose                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `subscriptions` | `billingMode`, `validUntil`, `onboardingSource`, `resellerId`, `resellerPricingTier`, `resellerDurationMonths`, `manualPaymentConfirmed`, `manualPaymentConfirmedAt`, `paymentLinkId`, `paymentLinkUrl` | Reseller metadata on subscription doc |

---

## 3. Operations Per Feature

### 3.1 Reseller Onboarding (Create Store — Offline)

| Operation                        | Collection             | Type  | Count       | Notes                      |
| -------------------------------- | ---------------------- | ----- | ----------- | -------------------------- |
| Read platformSummary             | `platformSummary`      | READ  | 1           | Get next tenant/store IDs  |
| Write tenant                     | `tenants`              | WRITE | 1           | Atomic transaction         |
| Write store                      | `stores`               | WRITE | 1           | Atomic transaction         |
| Write user (client)              | `users`                | WRITE | 1           | Client account creation    |
| Update platformSummary           | `platformSummary`      | WRITE | 1           | Increment counts           |
| Update storesSummary             | `platformSummary`      | WRITE | 1           | Sync store data            |
| Write subscription               | `subscriptions`        | WRITE | 1           | With billingMode: 'manual' |
| Write transaction                | `resellerTransactions` | WRITE | 1           | Immutable log              |
| Update reseller profile          | `resellerProfiles`     | WRITE | 1           | Increment offline count    |
| **Total per offline onboarding** |                        |       | **1R + 8W** |                            |

### 3.2 Reseller Onboarding (Create Store — Online)

Same as offline, minus reseller profile offline cap update. Uses existing Razorpay Subscription creation (external API call, not Firestore). Webhook handling is identical to self-serve — zero additional Firestore cost.

| **Total per online onboarding** | | | **1R + 7W** | |

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

### 3.6 Reseller Profile

| Operation    | Collection         | Type | Count  | Notes        |
| ------------ | ------------------ | ---- | ------ | ------------ |
| Read profile | `resellerProfiles` | READ | 1      | Caps, counts |
| **Total**    |                    |      | **1R** |              |

### 3.7 Renew License

| Operation             | Collection             | Type  | Count       | Notes              |
| --------------------- | ---------------------- | ----- | ----------- | ------------------ |
| Read subscription     | `subscriptions`        | READ  | 1           | Current state      |
| Update subscription   | `subscriptions`        | WRITE | 1           | Extend validUntil  |
| Write transaction     | `resellerTransactions` | WRITE | 1           | New renewal record |
| **Total per renewal** |                        |       | **1R + 2W** |                    |

### 3.8 Nightly Expiry Check (Cloud Function)

| Operation                | Collection      | Type  | Count       | Notes                      |
| ------------------------ | --------------- | ----- | ----------- | -------------------------- |
| Query manual active subs | `subscriptions` | READ  | 1           | Composite index query      |
| Update expired subs      | `subscriptions` | WRITE | N           | N = number of expired subs |
| **Total per run**        |                 |       | **1R + NW** | N typically 0-5            |

---

## 4. DAL Functions

| Function                       | Collection                                                                                     | Operations | Location                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------- |
| `createResellerOnboarding()`   | tenants, stores, users, platformSummary, subscriptions, resellerTransactions, resellerProfiles | 1R + 8W    | `src/database/reseller/index.ts`         |
| `confirmOfflinePayment()`      | subscriptions, resellerTransactions, resellerProfiles                                          | 1R + 3W    | `src/database/reseller/index.ts`         |
| `getResellerClients()`         | resellerTransactions                                                                           | 1R         | `src/database/reseller/index.ts`         |
| `getClientDetail()`            | subscriptions, resellerTransactions                                                            | 2R         | `src/database/reseller/index.ts`         |
| `getResellerProfile()`         | resellerProfiles                                                                               | 1R         | `src/database/reseller/index.ts`         |
| `renewResellerLicense()`       | subscriptions, resellerTransactions                                                            | 1R + 2W    | `src/database/reseller/index.ts`         |
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
  },
  {
    "collectionGroup": "resellerTransactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "resellerId", "order": "ASCENDING" },
      { "fieldPath": "createdOn", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "resellerTransactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "resellerId", "order": "ASCENDING" },
      { "fieldPath": "storeId", "order": "ASCENDING" },
      { "fieldPath": "createdOn", "order": "DESCENDING" }
    ]
  }
]
```

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
| Onboardings (20 × 1R + 8W)             | 20      | 160     | 0       |
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

match /resellerProfiles/{userId} {
  allow read, write: if false; // Admin SDK only (server-side)
}
```

All reseller operations go through API routes (server-side with `withAuth`). No direct client-side Firestore access.

---

**DOCUMENT STATUS:** 📝 DOCUMENTED  
**Last Updated:** February 27, 2026

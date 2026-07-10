# Summary Document Pattern

> **Purpose:** Reduce Firebase read costs by maintaining a single summary document instead of querying multiple full documents.

---

## Problem

When Cloud Functions or scheduled jobs need minimal data from many documents:

```typescript
// ❌ EXPENSIVE: N reads × full document size
const storesSnapshot = await db.collection("stores").get();
for (const storeDoc of storesSnapshot.docs) {
  const tId = storeDoc.data().tenantId; // Only need 2 fields
  const businessType = storeDoc.data().businessType;
  // ... but we read the entire document (50+ fields)
}
```

**Cost Impact:**

- 100 stores × 1 read each = 100 reads
- Each read includes unnecessary data (logos, settings, etc.)

---

## Solution: Summary Document

Maintain a single document with minimal data for all entities:

```typescript
// ✅ OPTIMIZED: 1 read × minimal data
const summaryDoc = await db
  .collection("platformSummary")
  .doc("storesSummary")
  .get();
const stores = summaryDoc.data().stores;
for (const [storeId, storeInfo] of Object.entries(stores)) {
  const { tId, businessType, active } = storeInfo;
  // All data in one read!
}
```

**Cost Impact:**

- 1 read total (regardless of store count)
- ~100 bytes per store vs ~5KB per full document

---

## When to Use This Pattern

| ✅ Good Fit                        | ❌ Bad Fit                        |
| ---------------------------------- | --------------------------------- |
| Scheduled jobs reading many docs   | Real-time user queries            |
| Only need 2-5 fields per entity    | Need full document data           |
| Entity count < 10,000              | Entity count > 10,000 (1MB limit) |
| Data changes infrequently          | Data changes every request        |
| Cloud Functions / batch processing | Client-side reads                 |

---

## Implementation Guide

### 1. Document Structure

```typescript
// Collection: platformSummary
// Document: storesSummary

{
  lastUpdated: Timestamp,
  stores: {
    "store123": {
      tId: 1,                    // tenantId
      businessType: "restaurant",
      businessCategory: "food",
      active: true,
      name: "My Restaurant",     // Optional: for display
      activePlanType: "pro",     // Optional: denormalized billing plan for scheduler entitlements
      menuPresence: {            // Optional: bounded distribution-presence hints only
        googleBusiness: "2026-07-03T10:30:00.000Z"
      }
    },
    "store456": {
      tId: 2,
      businessType: "cafe",
      active: true,
      name: "Coffee Shop"
    }
  }
}
```

### 2. Sync on Entity Changes

**CRITICAL:** Update summary when entity is created/updated/deleted.

```typescript
// In addStore()
await addStore(data);
await syncStoreToSummary(data.storeId, {
  tId: data.tenantId,
  businessType: data.businessType,
  active: true,
  name: data.name,
});

// In updateStore()
await updateStore(data);
await syncStoreToSummary(data.storeId, {
  tId: data.tenantId,
  businessType: data.businessType,
  active: data.active ?? true,
  name: data.name,
});

// In deleteStore()
await deleteStore(storeId);
await removeStoreFromSummary(storeId);
```

### 3. DAL Functions

```typescript
// Get summary (1 read)
export const getStoresSummary = async () => {
  const doc = await getDoc(storesSummaryDocRef());
  return doc.exists() ? doc.data().stores : {};
};

// Sync single store (1 write)
export const syncStoreToSummary = async (
  storeId: string,
  data: StoreSummaryData
) => {
  await setDoc(
    storesSummaryDocRef(),
    {
      lastUpdated: serverTimestamp(),
      stores: {
        [storeId]: data,
      },
    },
    { merge: true }
  );
};

// Remove store (1 write)
export const removeStoreFromSummary = async (storeId: string) => {
  await updateDoc(storesSummaryDocRef(), {
    lastUpdated: serverTimestamp(),
    [`stores.${storeId}`]: deleteField(),
  });
};
```

`platformSummary/storesSummary` feeds public store lookup surfaces such as OBP, menus, PWA shortcuts, compliance pages, outlet routing, and platform-wide scheduler snapshots. Keep each row compact: store identity/status fields, scheduling fields, publish counters/timestamps, plan entitlement, and bounded distribution-presence hints are acceptable; full store documents, settings blobs, menu content, analytics rows, and owner-private payloads are not. Any path that changes public-facing store summary truth must invalidate the same public cache tags as store saves through `src/lib/cache/publicClientCache.ts` or the server `revalidateMenuCache()` path. One-off browser-console summary backfills are not part of production runtime and must not be reintroduced.

---

## Firestore Limits

| Limit              | Value         | Impact                         |
| ------------------ | ------------- | ------------------------------ |
| Max document size  | 1 MB          | ~10,000 stores max             |
| Max fields per doc | 20,000        | Not a concern for this pattern |
| Write rate         | 1/sec per doc | Use batch writes if needed     |

**Scale Calculation:**

- ~100 bytes per store entry
- 1 MB / 100 bytes = ~10,000 stores
- If exceeding this, shard by tenant or use subcollections

---

## Existing Implementations

| Summary                         | Location                        | Used By                                      |
| ------------------------------- | ------------------------------- | -------------------------------------------- |
| `platformSummary/default`       | `src/database/platformSummary/` | Platform stats (tenant/store counts)         |
| `platformSummary/storesSummary` | `src/database/platformSummary/` | Cloud Functions (analytics, decision blocks) |

---

## Migration: One-Time Backfill

When adding this pattern to existing data:

```typescript
// Cloud Function: backfillStoresSummary
export const backfillStoresSummary = onCall(async () => {
  const stores = await db.collection("stores").get();
  const summary: Record<string, StoreSummaryData> = {};

  for (const doc of stores.docs) {
    const data = doc.data();
    summary[doc.id] = {
      tId: data.tenantId,
      businessType: data.businessType,
      active: data.active ?? true,
      name: data.name,
    };
  }

  await db.collection("platformSummary").doc("storesSummary").set({
    lastUpdated: FieldValue.serverTimestamp(),
    stores: summary,
  });

  return { count: stores.size };
});
```

---

## Cost Comparison

### Before (N stores = N reads)

| Operation             | Reads | Cost (per 100K) |
| --------------------- | ----- | --------------- |
| Get all stores        | 100   | $0.06           |
| Nightly job (30 days) | 3,000 | $1.80           |
| 3 Cloud Functions     | 9,000 | $5.40           |

### After (1 read)

| Operation             | Reads | Cost (per 100K) |
| --------------------- | ----- | --------------- |
| Get stores summary    | 1     | $0.0006         |
| Nightly job (30 days) | 30    | $0.018          |
| 3 Cloud Functions     | 90    | $0.054          |

**Savings: ~99% read reduction**

---

## Checklist for New Implementations

- [ ] Identify which fields are actually needed
- [ ] Create summary document in `platformSummary` collection
- [ ] Add DAL functions (get, sync, remove)
- [ ] Update all create/update/delete operations to sync
- [ ] Create one-time backfill for existing data
- [ ] Update Cloud Functions to use summary
- [ ] Add to this documentation

---

## Related Patterns

- **Aggregation Pattern**: For computed summaries (counts, totals)
- **Denormalization Pattern**: For frequently accessed data
- **TTL Pattern**: For time-limited data cleanup

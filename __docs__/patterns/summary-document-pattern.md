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

> **Runtime admission:** A summary is a denormalized optimization, not trusted identity. Browser and Functions readers route `storesSummary` through the shared `storeSummaryBoundary` parser before using map keys or tenant scope. Canonical `stores/{storeId}` remains public and authorization authority. There is no standalone browser summary writer: every active mutation owns its canonical and summary writes in the same Firestore transaction.

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

- 1 bounded summary-document read
- only the fields admitted by the shared summary boundary

---

## When to Use This Pattern

| ✅ Good Fit                        | ❌ Bad Fit                        |
| ---------------------------------- | --------------------------------- |
| Scheduled jobs reading many docs   | Real-time user queries            |
| Only need 2-5 fields per entity    | Need full document data           |
| Entity count within the enforced 1,500-row / 850,000-byte ceiling | Data beyond that ceiling; shard or use bounded canonical pages |
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

### 2. Project Within the Canonical Transaction

**CRITICAL:** Update summary when an entity is created or changed, but never as a follow-up write. The canonical entity and its summary projection must share one transaction. Stores are soft-deactivated and retain their summary identity row with `active: false`; do not delete the row.

```typescript
await runTransaction(firebaseClient, async (transaction) => {
  const currentStore = await transaction.get(storeRef);
  validateCurrentStoreAndTenantScope(currentStore);
  transaction.set(storeRef, canonicalStoreUpdate, { merge: true });
  transaction.set(storesSummaryRef, {
    lastUpdated: serverTimestamp(),
    stores: { [storeId]: buildStoreSummaryEntry(nextStore) },
  }, { merge: true });
});
```

Standalone `syncStoreToSummary()` and `mergeStoreSummaryFields()` exports are intentionally absent. Store create/update, presence confirmation, tenant naming, outlet policy/lifecycle, brand propagation, entitlement, and block-state routes each own the relevant transaction and post-commit cache effects.

### 3. DAL Reader and Projection Builder

```typescript
// Get summary (1 read)
export const getStoresSummary = async () => {
  const doc = await getDoc(storesSummaryDocRef());
  return doc.exists() ? doc.data().stores : {};
};

// Pure projection builder used inside the owning transaction
export const buildStoreSummaryEntry = (data: StoreSummaryData) => ({
  tId: data.tId,
  businessType: data.businessType,
  businessCategory: data.businessCategory,
  active: data.active,
  name: data.name,
});
```

`platformSummary/storesSummary` is a denormalized internal optimization for scheduled Functions, platform/owner read models, and bounded operational aggregation. It is not an authorization, tenant-membership, public-routing, or public store-identity source. Public sitemap outlet discovery, Brand OBP outlet selection, and OBP multi-store detection query canonical `stores` documents with an explicit `tenantId` predicate and use the Firestore document ID as store authority. Keep each summary row compact: scheduling fields, status hints, publish counters/timestamps, plan entitlement, and bounded distribution-presence hints are acceptable; full store documents, settings blobs, menu content, analytics rows, and owner-private payloads are not. Client-authorized writes may change only the authenticated store slot and Firestore rules require its `tId` and optional `storeId` to match authenticated claims. Deactivation preserves those identity fields and writes `active: false`; deleting the slot would erase the invariant and is denied. Any store mutation that affects public truth must still invalidate the same public cache tags through `src/lib/cache/publicClientCache.ts` or the server `revalidateMenuCache()` path. One-off browser-console summary backfills are not part of production runtime and must not be reintroduced.

Cross-store mutations cannot use the current-store summary writer. Master brand propagation uses the authenticated Admin route so current master/outlet eligibility reads, canonical writes, and every affected summary row share one transaction; derived cache/screen/context work starts only after that acknowledgement.

Full store-summary projection must preserve inherited tenant block state as well as direct store block state. `buildSummaryDataFromStore()` carries `tenantBlocked` from the canonical store and `buildStoreSummaryEntry()` emits it whenever present, including explicit `false`. This prevents newly created or rebuilt rows from appearing eligible to summary-backed schedulers while their tenant is blocked. The dedicated platform tenant-block route remains the authority that synchronizes a tenant decision across existing stores and summary rows.

Runtime readers must admit this denormalized document through the byte-identical `src/data/shared/storeSummaryBoundary.ts` and `functions/src/sharedData/storeSummaryBoundary.ts` contract. The boundary supports nested and historical flat shapes, rejects magic path segments, non-record rows, non-canonical numeric tenant/store IDs, and conflicting embedded `storeId`, and normalizes valid scope IDs before any Firestore path/query is composed. Invalid rows are skipped without aborting the other stores. Persisted summary timestamps must use the same boundary date normalizer so invalid dates do not become `NaN` analytics state.

The nested `stores` and `projects` payload maps are not query surfaces. `firestore.indexes.json` exempts `platformSummary.stores` and `platformSummary.projects` from automatic single-field indexing so index entries do not grow with every store/project row. Keep independently queried top-level summary scalars, such as `specialMenuNextTransitionAt`, indexed. If a future feature needs a cross-summary query, add one explicit bounded scalar projection/index instead of re-enabling automatic indexing for the entire nested map.

The platform backfill is a repair merge, never a destructive rebuild. `backfillStoresSummary` reads at most 1,501 canonical rows to enforce a 1,500-store ceiling, rejects any invalid canonical identity before writing, caps the serialized row payload at 850,000 bytes, and uses nested `{ merge: true }` so omitted scheduler enrichment, distribution hints, billing state, routing fields and future bounded fields survive. The external parity verifier applies the same exact-ID and safe-map rules, caps default store reads at 1,500 and canonical project reads at 500 per store, and must describe `storesSummary` as internal rather than public membership authority.

---

## Firestore Limits

| Limit | Enforced repository boundary | Impact |
| --- | --- | --- |
| Document payload | 850,000 serialized bytes | Leaves safety room below Firestore's document limit |
| Canonical backfill scan | 1,500 rows, with one extra row used to detect overflow | Refuses an unsafe monolithic rebuild |
| Write contention | One shared summary document | Keep writes inside owning transactions; shard before write frequency becomes material |

**Scale Calculation:**

- Entry size varies with admitted scheduling, entitlement, and presence fields.
- The implementation measures the serialized payload and refuses more than
  850,000 bytes or 1,500 canonical rows.
- Before either ceiling is approached, move to tenant/range shards or bounded
  canonical queries through an explicit migration.

---

## Existing Implementations

| Summary                         | Location                        | Used By                                      |
| ------------------------------- | ------------------------------- | -------------------------------------------- |
| `platformSummary/summary`       | `src/database/platformSummary/`, onboarding and outlet transactions | Canonical global tenant/store ID counters |
| `platformSummary/default`       | Legacy compatibility read only  | Counter floor reconciliation; never written by active allocation |
| `platformSummary/storesSummary` | `src/database/platformSummary/` | Internal Cloud Functions, platform and owner read models; never public identity/tenant authority |

Global tenant/store IDs are security identities, not display counters. Every active allocator must serialize on `platformSummary/summary`, reconcile the legacy `default` and strict `storesSummary` floors, and prove the candidate `tenants/{id}` or `stores/{id}` document is absent before committing. UI code must not allocate with `count + 1`; a failed manual entity write may leave a safe reserved gap, but an ID may never be reused.

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

## Operation Comparison

| Example | Canonical scan | Bounded summary |
| --- | ---: | ---: |
| Read scheduling fields for 100 stores once | 100 document reads | 1 document read |
| Repeat that read daily for 30 days | 3,000 document reads | 30 document reads |

This comparison is about document-operation shape, not a currency forecast.
Firebase pricing varies by region, edition, free-tier usage, network, storage,
indexing, aggregation, and future provider pricing. Use Cloud Billing export
and the internal Cost Posture surface for real spend. Keep canonical reads when
identity, authorization, routing, or fresh full truth is required.

---

## Checklist for New Implementations

- [ ] Identify which fields are actually needed
- [ ] Create summary document in `platformSummary` collection
- [ ] Add DAL functions (get, sync, remove)
- [ ] Update all create/update/delete operations to sync
- [ ] Create one-time backfill for existing data
- [ ] Update Cloud Functions to use summary
- [ ] Keep authorization, public routing, and public tenant/store identity on canonical documents
- [ ] Constrain client-writable summary identity fields in Firestore rules and emulator tests
- [ ] Add to this documentation

---

## Related Patterns

- **Aggregation Pattern**: For computed summaries (counts, totals)
- **Denormalization Pattern**: For frequently accessed data
- **TTL Pattern**: For time-limited data cleanup

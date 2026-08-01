# Business Entity Index

> Cross-business queryable discovery-index builder for AI systems and structured search.
> Builder and types exist; the scheduler writer and query API are not active.
> Last Updated: May 9, 2026

---

## 1. What

A **denormalized discovery index** (`businessEntityIndex` Firestore collection) containing PUBLIC business data only. One document per active store. Populated by nightly scheduler. Enables cross-business queries (geo + category + attribute) without scanning tenant-scoped documents. SMB-universal — works for restaurants, salons, gyms, retail, clinics, and all 60+ MenuList business types.

## 2. Why

MenuList stores data in tenant-scoped collections: `stores/{storeId}`, `projects/{tId}/{sId}/{projectId}`. Cross-business queries like "salons with hair coloring near me" or "restaurants with outdoor seating in Bandra" require scanning individual tenant documents — impossible at scale. This is the single largest infrastructure gap identified in the 24-layer audit.

## 3. Cross-Tenant Data Compliance

**CRITICAL:** This collection contains ONLY public business information.

### Included (PUBLIC data only)

- Business name, type, category
- Geographic coordinates (lat/lng)
- City, state, country
- Standard categories (from taxonomy)
- Business attributes (dietary, amenities, service modes, payment)
- Working hours
- Top items (name + price — publicly visible on menu)
- Freshness signals (menuVersion, lastPublishedAt, truthScore)
- Public presence data (descriptor, priceRange)

### NEVER included

- User data (email, phone, passwords)
- Billing information (subscription, payments)
- API keys
- Internal operational data (analytics, logs, MOL)
- Staff information
- Internal notes
- Chat sessions
- Feedback data

### Compliance Notes

- All data in this index is already publicly visible on OBP/menu pages
- No new data exposure — this is an aggregation of already-public data
- Can be restricted to stores with `active: true` and published menus only
- Delete from index when store deactivated/deleted

## 4. Data Model

```typescript
interface BusinessEntityIndexDoc {
  // Identity
  storeId: number;
  tenantId: number;
  name: string;
  businessType: string;
  businessCategory: string;
  descriptor?: string; // from publicPresence.descriptor

  // Location
  geo?: {
    latitude: number;
    longitude: number;
  };
  city?: string;
  state?: string;
  country?: string;

  // Taxonomy (from Phase 1A)
  standardCategories: string[]; // Canonical category IDs
  dietaryTags: string[]; // Canonical dietary tag IDs
  cuisineTypes?: string[]; // Detected cuisine IDs

  // Attributes (from Phase 1C)
  semanticAttributes: string[]; // Canonical attribute IDs

  // Offerings Summary
  topItems: Array<{
    name: string;
    price: string;
  }>;
  totalItems: number;
  totalCategories: number;

  // Freshness
  menuVersion?: number;
  lastPublishedAt?: string; // ISO 8601
  truthScore?: number; // Store truth confidence (0-100)
  priceRange?: string; // '$' to '$$$$'

  // Hours (for "open now" queries)
  workingHours?: Record<string, string>;

  // Metadata
  indexedAt: string; // ISO 8601 — when this doc was last computed
  active: boolean; // Mirror of store.active
}
```

## 5. Firestore Collection

**Collection:** `businessEntityIndex` (top-level, flat)
**Document ID:** `{storeId}` (one document per active store)
**Indexes needed:**

- `businessCategory ASC, city ASC` (category + city filter)
- `businessType ASC, active ASC` (type filter)
- `active ASC, indexedAt DESC` (recent index check)

## 6. Population Strategy

### Nightly Scheduler (New Task)

Added as task 9 in `decisionBlocksScoring.ts` nightly scheduler.

Flow:

1. Read `storesSummary` (1 read — already loaded by scheduler)
2. For each active store with a published project:
   a. Read store document (already loaded by existing tasks)
   b. Read default project document (1 read per store)
   c. Run taxonomy matcher → standardCategories, dietaryTags
   d. Run semantic attribute extractor → semanticAttributes
   e. Write/update `businessEntityIndex/{storeId}`
3. Delete index entries for deactivated/deleted stores

### Cost Estimate

- Per store: 1 additional project read + 1 index write = 2 operations
- 100 stores: ~200 ops/night = ~$0.001/night
- 10,000 stores: ~20,000 ops/night = ~$0.01/night

## 7. Integration Points

- **Nightly scheduler:** Not wired yet. No `functions/src/infrastructure/discoveryIndexTask.ts` exists in the current codebase.
- **Store deactivation:** Not wired yet. When this flag is activated, store deactivation must delete or mark the index entry inactive.
- **Conditional Discovery API:** May query this collection only after separate API/security/cost audit.
- **Conditional Feed Infrastructure:** May read this collection only after separate webhook/feed design approval.

## 8. Feature Flag

`ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX: false` in both `src/config/features.ts` and `functions/src/constants/features.ts`.

When OFF: No index documents written, no nightly task runs.

## 9. Files

| File                                                 | Purpose                              |
| ---------------------------------------------------- | ------------------------------------ |
| `src/lib/infrastructure/discovery/types.ts`          | Index document types                 |
| `src/lib/infrastructure/discovery/indexBuilder.ts`   | Builds index from store/project data |
| `src/lib/infrastructure/discovery/index.ts`          | Barrel exports                       |
| `functions/src/infrastructure/discoveryIndexTask.ts` | Not present yet; planned scheduler task |

## 10. Security

- Current Firestore access: no collection-specific rule exists, so root default deny blocks every browser read and write while the feature remains inactive.
- No sensitive data in the collection (see §3)
- The dormant builder's safety guard recursively rejects sensitive-looking keys, hostile objects, and cyclic structures; this remains defense in depth rather than authorization.
- Freshness test fixtures and runtime projection use descriptor-safe timestamp
  data (`seconds`/`nanoseconds`, ISO text, epoch numbers, or valid `Date`
  instances). Method-only objects such as a caller-supplied `toDate()` wrapper
  are not trusted persisted timestamp data.
- Feature-flagged OFF by default
- Store deactivation cleanup is not wired yet; when activated, the scheduler/DAL must delete or mark index entries inactive.
- Activation requires a separate runtime schema, server-only writer, public DTO review, query/index/cost plan, tenant/product ownership model, deactivation cleanup, and focused Firestore rules tests before any rule path is added.

# KitStamp - Product Separation Playbook

**Status:** Planning playbook
**Created:** May 31, 2026
**Model:** Answerlattice-style separation adapted for KitStamp

---

## 1. Product Matrix

Proposed KitStamp environment matrix:

| Environment | KitStamp URL | KitStamp Firebase |
| --- | --- | --- |
| Local development | `http://localhost:3000/__kitstamp/` | `kitstamp-qa` |
| Vercel Preview / QA | final preview domain TBD | `kitstamp-qa` |
| Vercel Production | `https://kitstamp.com` or approved domain | `kitstamp` |

The current code has a disabled KitStamp placeholder in `src/constants/productDomains.ts`, but `src/constants/deploymentTargets.ts` does not include KitStamp yet.

Do not enable the product host until deployment targets and Firebase targets exist.

## 2. Product Identity

KitStamp uses:

```txt
pId = "KS"
```

Every KitStamp-owned document must have:

```txt
pId: "KS"
tId: <KitStamp tenant id>
sId: <KitStamp workspace/scope id>
```

Do not invent `tenantId`, `scopeId`, or `productId` aliases as the primary document identity. Compatibility fields can exist only when needed for shared billing code.

## 3. Source Context

When KitStamp imports from another product, store copied source context:

```ts
sourceContext: {
  sourcePId: "ML" | "AL" | "GR" | "external",
  sourceTId?: number,
  sourceSId?: number,
  sourceDocId?: string,
  sourceLabel?: string,
  importedBy: string,
  importedAt: Timestamp,
  sourceHash: string,
}
```

KitStamp must not hold live pointers that require MenuList or Answerlattice reads at render time.

## 4. Session Bridge

Use the same pattern as Answerlattice only where needed:

- default login can hold `productAccounts.KS`
- KitStamp routes resolve session scope from the KitStamp account
- KitStamp billing sends `productId: "KS"`
- KitStamp data writes to KitStamp Firebase

Do not use MenuList `tenantId/storeId` as KitStamp scope.

## 5. Data Access Rule

KitStamp DAL files must use KitStamp Firebase helpers:

```txt
src/database/kitstamp/
src/lib/firebase/visualMetaFirebaseClient.ts
src/lib/firebase/visualMetaFirebaseAdmin.ts
```

Do not import default `firebaseClient` or `firestoreAdmin` for KitStamp-owned data unless running an explicitly documented emulator/recovery mode.

## 6. Cloud Functions Rule

If KitStamp needs server-side functions, use:

```txt
functions-kitstamp/
```

Do not add KitStamp scheduled jobs to MenuList functions or Answerlattice functions.

If scheduled cleanup or batch processing is needed, it must live in KitStamp's own functions package with leases, bounded reads, and cost docs.

## 7. Public Route Rule

Public website routes belong under:

```txt
src/app/sites/kitstamp/
```

Dashboard/product routes should use a KitStamp-owned route group and not appear in MenuList owner navigation.

Local development path:

```txt
/__kitstamp
```

## 8. Storage Rule

KitStamp source and generated assets must use KitStamp Storage paths, not MenuList project image paths.

Suggested prefixes:

```txt
kitstamp/source/{tId}/{sId}/{projectId}/...
kitstamp/generated/{tId}/{sId}/{projectId}/...
kitstamp/export-kits/{tId}/{sId}/{kitId}/...
```

## 9. Billing Rule

KitStamp must not consume MenuList AI enhancement packs.

Billing should extend the product-aware billing adapter:

- `PRODUCT_IDS.KITSTAMP`
- KitStamp plans
- KitStamp credit packs
- KitStamp scoped subscription reads/writes
- product-specific AI operation logs

## 10. Verification Rule

Before activation:

- host-header smoke test for product domain
- `/__kitstamp` local smoke
- Firebase target verification
- route does not fall into tenant/custom-domain resolver
- KitStamp APIs reject MenuList-only sessions
- KitStamp writes go only to KitStamp Firebase
- KitStamp Storage writes use KitStamp bucket
- direct publishing controls do not exist

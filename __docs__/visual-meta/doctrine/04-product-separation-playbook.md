# VisualMeta - Product Separation Playbook

**Status:** Planning playbook
**Created:** May 31, 2026
**Model:** Canonica-style separation adapted for VisualMeta

---

## 1. Product Matrix

Proposed VisualMeta environment matrix:

| Environment | VisualMeta URL | VisualMeta Firebase |
| --- | --- | --- |
| Local development | `http://localhost:3000/__visualmeta/` | `visualmeta-qa` |
| Vercel Preview / QA | final preview domain TBD | `visualmeta-qa` |
| Vercel Production | `https://visualmeta.app` or approved domain | `visualmeta` |

The current code has a disabled VisualMeta placeholder in `src/constants/productDomains.ts`, but `src/constants/deploymentTargets.ts` does not include VisualMeta yet.

Do not enable the product host until deployment targets and Firebase targets exist.

## 2. Product Identity

VisualMeta uses:

```txt
pId = "VM"
```

Every VisualMeta-owned document must have:

```txt
pId: "VM"
tId: <VisualMeta tenant id>
sId: <VisualMeta workspace/scope id>
```

Do not invent `tenantId`, `scopeId`, or `productId` aliases as the primary document identity. Compatibility fields can exist only when needed for shared billing code.

## 3. Source Context

When VisualMeta imports from another product, store copied source context:

```ts
sourceContext: {
  sourcePId: "ML" | "CN" | "GR" | "external",
  sourceTId?: number,
  sourceSId?: number,
  sourceDocId?: string,
  sourceLabel?: string,
  importedBy: string,
  importedAt: Timestamp,
  sourceHash: string,
}
```

VisualMeta must not hold live pointers that require MenuList or Canonica reads at render time.

## 4. Session Bridge

Use the same pattern as Canonica only where needed:

- default login can hold `productAccounts.VM`
- VisualMeta routes resolve session scope from the VisualMeta account
- VisualMeta billing sends `productId: "VM"`
- VisualMeta data writes to VisualMeta Firebase

Do not use MenuList `tenantId/storeId` as VisualMeta scope.

## 5. Data Access Rule

VisualMeta DAL files must use VisualMeta Firebase helpers:

```txt
src/database/visualmeta/
src/lib/firebase/visualMetaFirebaseClient.ts
src/lib/firebase/visualMetaFirebaseAdmin.ts
```

Do not import default `firebaseClient` or `firestoreAdmin` for VisualMeta-owned data unless running an explicitly documented emulator/recovery mode.

## 6. Cloud Functions Rule

If VisualMeta needs server-side functions, use:

```txt
functions-visualmeta/
```

Do not add VisualMeta scheduled jobs to MenuList functions or Canonica functions.

If scheduled cleanup or batch processing is needed, it must live in VisualMeta's own functions package with leases, bounded reads, and cost docs.

## 7. Public Route Rule

Public website routes belong under:

```txt
src/app/sites/visualmeta/
```

Dashboard/product routes should use a VisualMeta-owned route group and not appear in MenuList owner navigation.

Local development path:

```txt
/__visualmeta
```

## 8. Storage Rule

VisualMeta source and generated assets must use VisualMeta Storage paths, not MenuList project image paths.

Suggested prefixes:

```txt
visualmeta/source/{tId}/{sId}/{projectId}/...
visualmeta/generated/{tId}/{sId}/{projectId}/...
visualmeta/export-kits/{tId}/{sId}/{kitId}/...
```

## 9. Billing Rule

VisualMeta must not consume MenuList AI enhancement packs.

Billing should extend the product-aware billing adapter:

- `PRODUCT_IDS.VISUAL_META`
- VisualMeta plans
- VisualMeta credit packs
- VisualMeta scoped subscription reads/writes
- product-specific AI operation logs

## 10. Verification Rule

Before activation:

- host-header smoke test for product domain
- `/__visualmeta` local smoke
- Firebase target verification
- route does not fall into tenant/custom-domain resolver
- VisualMeta APIs reject MenuList-only sessions
- VisualMeta writes go only to VisualMeta Firebase
- VisualMeta Storage writes use VisualMeta bucket
- direct publishing controls do not exist

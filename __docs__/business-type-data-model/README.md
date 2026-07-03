# Business Type Data Model — Inconsistency Fix

**Feature:** Business Type / Category / Industry Data Model Cleanup
**Status:** Implemented source evidence; migration guarded; not current launch certification
**Last Updated:** July 2, 2026
**Priority:** CRITICAL — Affects schema.org, OBP, time slots, UI labels, filters, image generation, decision blocks
**Triggered By:** Messaging Onboarding deep codebase cross-check (§18.1)
**Local Source Gate:** `npm run verify:agent-readiness`

---

## Quick Navigation

| Document    | Purpose                  |
| ----------- | ------------------------ |
| This README | Overview + tracking list |

---

## Current Launch Boundary

This document records the current source contract for MenuList business identity fields. It is not live-data or production-launch certification by itself.

Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:agent-readiness`, a target-project dry run of `scripts/migrate-business-type-swap.ts`, Firestore backup evidence before live migration, an explicit live command with `--write --confirm-project <projectId> --all-stores-and-tenants`, post-migration spot checks for stores and tenants, public menu/OBP/schema smoke for corrected business types, target deploy evidence where runtime code changes, and production-host smoke.

The local source gate verifies code and documentation contracts only. It does not run Firestore reads/writes, execute the migration, certify existing production data, deploy Firebase, deploy Vercel, run a production build, call providers, or run browser/device QA.

---

## The Problem

Three fields exist on store/tenant documents for business identification:

| Field              | Current Usage                                                                                                                              | Correct Usage (Decision)                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `businessType`     | Stores `'B2C'` or `'B2B'` from onboarding (WRONG)                                                                                          | Actual business type from `BUSINESS_TYPES`: e.g., `"Restaurant"`, `"Salon"`, `"Cafe"`            |
| `businessCategory` | Derived from `businessType` via `getBusinessCategory()` — but gets `undefined` because input is `'B2C'`                                    | Derived from `businessType` via `getBusinessCategory()`: e.g., `"food"`, `"service"`, `"health"` |
| `businessIndustry` | Stores actual business type selected from `IMAGE_VIEW_TYPES` during onboarding (e.g., "Restaurant") — **THIS IS WHERE THE REAL TYPE WENT** | `'B2C'` or `'B2B'` — plan-type marker; no current B2B runtime depends on this field               |

**Root cause:** During onboarding, `userType` (which is `'B2C'`/`'B2B'`) was stored as `store.businessType`, and the actual type (e.g., "Restaurant") was stored as `store.businessIndustry`. The field names are swapped from their semantic meaning.

---

## The Fix (Locked Decision)

| Field                     | Before (Wrong)                                        | After (Correct)                                                  |
| ------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `store.businessType`      | `'B2C'` / `'B2B'`                                     | Actual type from `BUSINESS_TYPES[].value` (e.g., `"Restaurant"`) |
| `store.businessCategory`  | `undefined` → `'specialty'` fallback                  | Correctly derived via `getBusinessCategory()` (e.g., `"food"`)   |
| `store.businessIndustry`  | Actual type (e.g., `"Restaurant"`) — wrong field name | `'B2C'` / `'B2B'` — plan type identifier. Future scope.          |
| `tenant.businessType`     | `'B2C'` / `'B2B'`                                     | Same as store — actual business type                             |
| `tenant.businessIndustry` | Actual type (e.g., `"Restaurant"`)                    | `'B2C'` / `'B2B'`                                                |

**`businessIndustry` = `'B2B'` | `'B2C'`** — This is the plan/industry identifier. B2B = POS software providers. B2C = SMB businesses. MenuList's current owner runtime is B2C-first and does not depend on B2B behavior from this field.

---

## Impact Analysis

### `businessType` — 363 matches across 55 files (HEAVY usage)

#### Category 1: CORRECTLY expects actual business type (e.g., "Restaurant")

These functions already expect the CORRECT value. After the fix, they'll work properly instead of falling back to defaults.

| File                                         | Function/Usage                                      | Current Behavior (Broken)                           | After Fix                                                 |
| -------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/schema/index.ts:149`                | `getSchemaType(businessType)`                       | Gets `'B2C'` → returns `'LocalBusiness'`            | Gets `'Restaurant'` → returns `'Restaurant'` ✅           |
| `src/config/defaultTimeSlotPresets.ts:96`    | `getDefaultTimeSlotPresets(businessType, tId, sId, businessCategory)` | Gets `'B2C'` → category `null` → generic presets    | Gets actual type/category; `Other + food` → food presets ✅ |
| `src/config/businessLabels.ts:74`            | `getAvailabilityLabels(businessType, businessCategory)`               | Gets `'B2C'` → DEFAULT_LABELS                       | Gets actual type/category; `Other + food` → food labels ✅  |
| `src/config/decisionBlocks.ts:246`           | `getDecisionConfig(businessType, businessCategory)`                   | Gets `'B2C'` → DEFAULT_CONFIG                       | Gets actual type/category; `Other + food` → food config ✅  |
| `src/data/shared/businessTypes.ts`           | `getBusinessCategory(businessType)`                 | Gets `'B2C'` → `undefined` → fallback `'specialty'` | Gets `'Restaurant'` → `'food'` ✅                         |
| `src/database/stores/index.tsx:134`          | `addStore()` — derives businessCategory             | Gets `'B2C'` → `undefined`                          | Gets `'Restaurant'` → `'food'` ✅                         |
| `src/database/stores/index.tsx:167`          | `updateStore()` — derives businessCategory          | Same                                                | Same ✅                                                   |
| `src/app/api/outlets/create/route.ts:118`    | Outlet creation — copies from master                | Gets master's `'B2C'` → `'specialty'` fallback      | Gets actual type ✅                                       |
| `functions/src/triggers/operations.ts`       | Store-operation summaries derive category           | Gets `'B2C'` → shared resolver falls back           | Gets actual type → correct category ✅                    |
| `functions/src/decisionBlocksScoring.ts:530` | Decision blocks scoring — uses category             | Gets `'specialty'` fallback                         | Gets correct category ✅                                  |

#### Category 2: IMAGE_VIEW_TYPES lookups (expects actual type)

These look up `storeDetails.businessType` against `IMAGE_VIEW_TYPES[].businessType` (e.g., "Restaurant").

| File                                                                      | Usage                                                                             | Current Behavior                                        | After Fix                   |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| `src/components/.../AiImageGenerator/index.tsx:42`                        | `IMAGE_VIEW_TYPES.find(type => type.businessType === storeDetails?.businessType)` | Finds nothing (no `'B2C'` in IMAGE_VIEW_TYPES) → `null` | Finds correct entry ✅      |
| `src/components/.../AiImageGenerator/EditImageModal.tsx:201`              | Same lookup for editing features                                                  | Same → no features                                      | Correct features ✅         |
| `src/components/.../batchImageGeneration/BatchImageGenerationView.tsx:22` | Same lookup for batch generation                                                  | Same                                                    | Same ✅                     |
| `src/app/api/image-generation/prompt.ts:171`                              | Prompt building — finds business info                                             | No match → generic prompt                               | Business-specific prompt ✅ |
| `src/app/api/image-editing/promptsList/prompt.ts:124`                     | Same for editing                                                                  | Same                                                    | Same ✅                     |
| `src/app/api/image-editing/promptsList/getBusinessSpecificPrompt.ts:33`   | Same                                                                              | Same                                                    | Same ✅                     |

#### Category 3: Onboarding write path (fixed)

The historical source of the bug was the onboarding write path. The current path is centralized through `createTenantStoreInTransaction()`:

| File | Current Contract | Status |
| ---- | ---------------- | ------ |
| `src/app/api/onboarding/create-subscription/route.ts` | Passes `businessType: businessIndustry || FALLBACK_BUSINESS_TYPE` and `businessIndustry: userType` into `createTenantStoreInTransaction()` | ✅ Fixed |
| `src/lib/onboarding/createTenantStore.ts` | Writes the same `businessType`, `businessIndustry`, and derived `businessCategory` to tenant, store, and `platformSummary/storesSummary` inside the transaction | ✅ Fixed |
| `src/data/shared/businessTypes.ts` and `functions/src/sharedData/businessTypes.ts` | Share `resolveStoreBusinessCategory()` for current source and Functions consumers | ✅ Fixed |

#### Category 4: UI Components (Settings — already correct)

These let the owner set/edit `businessType` from `BUSINESS_TYPES` dropdown. Already correct — owner overwrites the `'B2C'` value.

| File                                                             | Usage                                       | Status             |
| ---------------------------------------------------------------- | ------------------------------------------- | ------------------ |
| `src/components/.../BasicInfoTab.tsx:32`                         | businessType dropdown from `BUSINESS_TYPES` | ✅ Already correct |
| `src/components/mobile/screens/MobileBasicSettingsScreen.tsx:25` | businessType picker                         | ✅ Already correct |

#### Category 5: Platform/Admin display

| File                                        | Usage                        | Status                                          |
| ------------------------------------------- | ---------------------------- | ----------------------------------------------- |
| `src/components/.../tenantDetailsModal.tsx` | Displays tenant businessType | Shows `'B2C'` → will show actual type after fix |

#### Category 6: API Validation schemas

| File                                   | Usage                              | Fix Required                                                                     |
| -------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/validation/apiSchemas.ts:161` | `userType: z.enum(['B2C', 'B2B'])` | No change — this is `userType` not `businessType`                                |
| `src/lib/validation/apiSchemas.ts:157` | `businessIndustry: z.string()`     | **FIX:** Rename parameter semantically or keep field name + swap values in route |

#### Category 7: Pricing page (uses `PlanType` = B2C/B2B for plan selection)

| File                                                | Usage                              | Status                                                                                        |
| --------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/components/.../pricing/index.tsx`              | `activeBusinessType` tab (B2C/B2B) | ✅ No change — this is plan type selection, not store field                                   |
| `src/components/.../pricing/OnboardingModal.tsx:57` | `businessType: PlanType` prop      | ✅ No change — this is for conditional UI (B2C shows IMAGE_VIEW_TYPES, B2B shows POS options) |

### `businessCategory` — 35 matches across 10 files

All usages are CORRECT — they expect derived category values like `'food'`, `'service'`, `'health'`, `'specialty'`. After fixing `businessType`, `getBusinessCategory()` will return correct values and all these will work.

### `businessIndustry` — 21 matches across 6 files

ALL usages are in the onboarding flow only. After the fix:

- Onboarding writes `businessIndustry = userType` (`'B2C'` or `'B2B'`) instead of actual type
- `businessIndustry` is in `StoreDataType` as an optional plan-type marker
- `businessIndustry` is only stored in Firestore, never read by any system logic
- No current owner/customer runtime depends on B2B behavior from this field

---

## Implemented Source Contract

### Source Check A: Onboarding Route and Centralized Creator

**Files:** `src/app/api/onboarding/create-subscription/route.ts`, `src/lib/onboarding/createTenantStore.ts`

The onboarding route now passes the owner-selected actual business type as `businessType` and the plan type as `businessIndustry`. The centralized creator derives `businessCategory` with `resolveStoreBusinessCategory()` and writes tenant, store, and storesSummary values in the same transaction.

### Source Check B: Payment Handler Payload

**File:** `src/hooks/usePaymentHandler.ts` — No change needed. It already passes `businessIndustry` correctly from the form. The fix is in the route handler where values are swapped.

### Source Check C: Existing Data Migration (Guarded, Not Run Here)

**CRITICAL:** Existing stores have `businessType = 'B2C'` and `businessIndustry = 'Restaurant'`. Need to swap these values for all existing stores.

**Migration script (one-time admin operation):**

```typescript
// Migration: Swap businessType ↔ businessIndustry for all stores
const stores = await db.collection("stores").get();
const batch = db.batch();
let count = 0;

for (const doc of stores.docs) {
  const data = doc.data();
  const currentBusinessType = data.businessType; // Currently 'B2C' or 'B2B'
  const currentBusinessIndustry = data.businessIndustry; // Currently 'Restaurant' etc.

  // Only swap if businessType looks like a plan type (B2C/B2B)
  if (currentBusinessType === "B2C" || currentBusinessType === "B2B") {
    // And businessIndustry has an actual type
    if (
      currentBusinessIndustry &&
      currentBusinessIndustry !== "B2C" &&
      currentBusinessIndustry !== "B2B"
    ) {
      batch.update(doc.ref, {
        businessType: currentBusinessIndustry, // Now stores actual type
        businessIndustry: currentBusinessType, // Now stores B2C/B2B
        businessCategory:
          getBusinessCategory(currentBusinessIndustry) || "specialty",
      });
      count++;
    }
  }

  if (count % 400 === 0 && count > 0) {
    await batch.commit();
    // Start new batch (Firestore limit: 500 per batch)
  }
}
await batch.commit();

// Same for tenants
const tenants = await db.collection("tenants").get();
// ... same swap logic
```

The maintained migration script is `scripts/migrate-business-type-swap.ts`. It is dry-run by default, derives categories from `src/data/shared/businessTypes.ts`, and refuses live writes unless the command includes `--write`, `--project-id`, matching `--confirm-project`, and `--all-stores-and-tenants`.

### Source Check D: StoreDataType

**File:** `src/types/platform/store.ts`

`businessIndustry?: string;` is present after `businessCategory`.

### Source Check E: Consumer Behavior

After the swap:

- All `getBusinessCategory(store.businessType)` calls → now receive actual type → return correct category
- All `IMAGE_VIEW_TYPES.find()` lookups → now match against actual type
- All `getSchemaType()`, `getDefaultTimeSlotPresets()`, `getAvailabilityLabels()`, `getDecisionConfig()` → all work correctly
- `FILTER_ALLOWLIST[category]` → correct filters per business
- Settings UI (`BasicInfoTab`, `MobileBasicSettingsScreen`) → already show correct dropdown, no change
- storesSummary → correct values on rebuild

---

## Risk Assessment

| Risk                                     | Severity | Mitigation                                                                                                       |
| ---------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| Data migration corrupts stores           | HIGH     | Backup before migration. Script is dry-run by default and live mode requires explicit project confirmation plus `--all-stores-and-tenants`. |
| Stores with owner-corrected businessType | LOW      | If owner already set correct type via Settings, `businessType` won't be `'B2C'`/`'B2B'` — migration skips these. |
| Cloud Functions reference old values     | MEDIUM   | `functions/src/index.ts` storesSummary rebuild runs daily — will pick up new values.                             |
| Decision blocks scoring uses stale data  | LOW      | Next scheduled run (every 6h) will use correct category.                                                         |

---

## Verification Checklist (Post-Fix)

- [ ] `store.businessType` for ALL stores is a value from `BUSINESS_TYPES[].value`
- [ ] `store.businessCategory` is correctly derived for ALL stores
- [ ] `getSchemaType(store.businessType)` returns specific type (not `'LocalBusiness'`) for known types
- [ ] `getDefaultTimeSlotPresets(store.businessType)` returns category-specific presets
- [ ] `IMAGE_VIEW_TYPES.find(t => t.businessType === store.businessType)` returns a match for stores with known types
- [ ] New onboarding creates stores with actual businessType (not `'B2C'`)
- [ ] `tenant.businessType` matches `store.businessType`
- [ ] `businessIndustry` stores `'B2C'`/`'B2B'` on all affected docs
- [ ] Messaging onboarding docs updated to reflect corrected data model

---

## Files to Modify (Complete List)

| #   | File                                                  | Change                                                | Risk                   | Status                   |
| --- | ----------------------------------------------------- | ----------------------------------------------------- | ---------------------- | ------------------------ |
| 1   | `src/app/api/onboarding/create-subscription/route.ts` | Swap businessType ↔ businessIndustry values (7 lines) | HIGH — core onboarding | ✅ DONE                  |
| 2   | `src/types/platform/store.ts`                         | Add `businessIndustry?: string` field                 | LOW — type addition    | ✅ DONE                  |
| 3   | `scripts/migrate-business-type-swap.ts`               | Migration script with dry run mode                    | HIGH — data migration  | ✅ CREATED (not yet run) |
| 4   | `__docs__/messaging-onboarding/messaging-onboarding_impl.md` | Update §18 to reflect fix                             | LOW — docs             | ✅ DONE                  |
| 5   | `__docs__/business-type-data-model/README.md`         | Mark as complete                                      | LOW — docs             | ✅ DONE                  |

**Total code changes: ~10 lines + migration script**  
**Total files: 2 code + 1 type + 1 migration + 2 docs = 6**

### Pre-Migration Checklist

- [x] Code fix applied to `create-subscription/route.ts`
- [x] `StoreDataType` updated with `businessIndustry` field
- [x] Migration script created with dry-run safety
- [ ] **RUN migration in dry-run mode first** (`npx tsx scripts/migrate-business-type-swap.ts --project-id <projectId>`)
- [ ] Review dry-run output — verify swap count matches expected stores
- [ ] **Backup Firestore** before live migration
- [ ] Run migration LIVE (`npx tsx scripts/migrate-business-type-swap.ts --project-id <projectId> --write --confirm-project <projectId> --all-stores-and-tenants`)
- [ ] Verify post-migration: spot-check 5 stores in Firestore console
- [ ] Rebuild storesSummary (daily cron will do this, or trigger manually)

---

## Post-Fix Verification: Line-by-Line Audit (55 files, Feb 17, 2026)

Every file using `businessType`, `businessCategory`, or `businessIndustry` was traced line-by-line. Grouped by function:

### GROUP 1: WRITE to Firestore (4 files) — All ✅

| File                                | Line        | What It Writes                                 | Status                                  |
| ----------------------------------- | ----------- | ---------------------------------------------- | --------------------------------------- |
| `create-subscription/route.ts`      | 146,174,197 | `businessType: businessIndustry` (actual type) | ✅ FIXED                                |
| `outlets/create/route.ts`           | 118,130     | Copies `masterStore.businessType`              | ✅ Correct (master now has actual type) |
| `database/stores/index.tsx`         | 113-141     | Passes through `data.businessType`             | ✅ Correct                              |
| `database/platformSummary/index.ts` | 164         | Passes through `data.businessType`             | ✅ Correct                              |

### GROUP 2: READ for business logic (6 files) — All ✅

| File                                  | Function                      | What It Expects                         | Status                        |
| ------------------------------------- | ----------------------------- | --------------------------------------- | ----------------------------- |
| `config/defaultTimeSlotPresets.ts:96` | `getDefaultTimeSlotPresets()` | Actual type → derives category          | ✅ Now receives correct value |
| `config/businessLabels.ts:74`         | `getAvailabilityLabels()`     | Actual type → derives category → labels | ✅ Now works                  |
| `config/decisionBlocks.ts:246`        | `getDecisionConfig()`         | Actual type → derives category → config | ✅ Now works                  |
| `src/data/shared/businessTypes.ts`    | `getBusinessCategory()`       | Actual type → case-insensitive lookup   | ✅ Now finds match            |
| `src/lib/schema/index.ts`             | `getSchemaType()`             | Actual type → shared schema mapping     | ✅ Now returns specific type  |
| `src/app/client/obp/schema.ts`        | OBP schema builder            | Calls `getSchemaType()`                 | ✅ Now correct                |

### GROUP 3: IMAGE_VIEW_TYPES lookup (4 files) — All ✅

| File                                               | Pattern                                                                           | Status             |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------ |
| `AiImageGenerator/index.tsx:42`                    | `IMAGE_VIEW_TYPES.find(type => type.businessType === storeDetails?.businessType)` | ✅ Now finds match |
| `AiImageGenerator/EditImageModal.tsx:201`          | Same lookup for editing features                                                  | ✅ Now finds match |
| `AiImageGenerator/BatchImageGenerationView.tsx:22` | Same lookup for batch gen                                                         | ✅ Now finds match |
| `AiImageGenerator/StyleSelector.tsx:46`            | Uses for style recommendations                                                    | ✅ Now works       |

### GROUP 4: AI prompt building (10 files) — All ✅

All receive `businessType` as parameter from frontend → passes through to prompt. No Firestore read. Correct.

`image-generation/prompt.ts`, `image-generation/route.ts`, `image-generation/batch-generation/route.ts`, `image-generation/batch-trigger/route.ts`, `image-editing/prompt.ts`, `image-editing/route.ts`, `image-editing/getBusinessSpecificPrompt.ts`, `image-editing/index.ts`, `new-item-metadata/prompt.ts`, `new-item-metadata/route.ts`

### GROUP 5: UI Settings (2 files) — All ✅

| File                               | What It Does                                       | Status                        |
| ---------------------------------- | -------------------------------------------------- | ----------------------------- |
| `BasicInfoTab.tsx:32`              | Dropdown from `BUSINESS_TYPES` — saves actual type | ✅ Correct (no change needed) |
| `MobileBasicSettingsScreen.tsx:25` | Picker from `BUSINESS_TYPES`                       | ✅ Correct (no change needed) |

### GROUP 6: UI Display (10 files) — All ✅

`editItemModal.tsx`, `Editor.tsx`, `ImageUploadModal.tsx`, `DecisionBlocks.tsx`, `DecisionBlocksSettingsModal.tsx`, `MenuFilterChips.tsx`, `MenuSearchBar.tsx`, `menuPageNew.tsx`, `tenantDetailsModal.tsx`, `mainContentRenderer/index.tsx` — All read `storeDetails.businessType` for display/logic. All correct.

### GROUP 7: Landing page (6 files) — All ✅

`BusinessTypeDetials.tsx`, `BusinessTypesSection.tsx` (×2), `landingPage/index.tsx`, `pricing/index.tsx`, `pricing/OnboardingModal.tsx` — Uses literal type names for showcase. Pricing uses `PlanType` (B2C/B2B) for tab switching (NOT `store.businessType`). Correct.

### GROUP 8: Cloud Functions (2 files) — All ✅

| File                                         | What It Does                                                 | Status                                       |
| -------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `functions/src/index.ts:307`                 | storesSummary rebuild — derives category from `businessType` | ✅ Will use actual type after migration      |
| `functions/src/decisionBlocksScoring.ts:530` | Decision blocks — uses `businessCategory`                    | ✅ Will get correct category after migration |

### GROUP 9: `businessIndustry` field (6 files) — All ✅

| File                                   | What It Does                                                | Status                                            |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| `create-subscription/route.ts:147,176` | Stores `userType` ('B2C'/'B2B')                             | ✅ FIXED                                          |
| `OnboardingModal.tsx:63`               | Collects actual type in form field named `businessIndustry` | ✅ Correct (form field name, not Firestore field) |
| `pricing/index.tsx:99`                 | Passes form data                                            | ✅ Correct                                        |
| `usePaymentHandler.ts:271`             | Passes to API                                               | ✅ Correct                                        |
| `data/common.ts:47`                    | `PurchaseIntent.businessIndustry` type                      | ✅ Correct                                        |
| `lib/validation/apiSchemas.ts:157`     | Validates as string                                         | ✅ Correct                                        |

### Naming Clarification

The onboarding form field is named `businessIndustry` but collects the actual business type (e.g., "Restaurant"). This is the form field name, not the Firestore field name. After the fix:

- Form `businessIndustry` value ("Restaurant") → stored as `store.businessType` ✅
- Form `userType` value ("B2C") → stored as `store.businessIndustry` ✅

---

## Version History

| Version | Date         | Changes                                                                                                                                                             |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Feb 17, 2026 | Initial analysis — complete codebase audit of businessType/businessCategory/businessIndustry usage across 55+ files. Fix plan created.                              |
| 1.1     | Feb 17, 2026 | Implementation — Code fix applied, StoreDataType updated, migration script created at scripts/migrate-business-type-swap.ts. |
| 1.2     | Feb 17, 2026 | Post-fix verification — Line-by-line audit of all 55 files. Every consumer verified correct after fix. Migration command fixed (tsx not ts-node).                   |
| 1.3     | Jul 2, 2026  | Launch boundary refreshed from current source: onboarding creator contract documented, migration script guarded with project confirmation, and source gate added.       |

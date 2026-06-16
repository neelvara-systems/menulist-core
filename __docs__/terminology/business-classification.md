# MenuList Business Classification — Terminology & Data Model

**Status:** LOCKED — Permanent system terminology  
**Last Updated:** June 3, 2026
**Authority:** This document defines the ONLY correct usage of business classification fields across the entire MenuList codebase.

---

## Three Fields — Three Purposes

| Field                 | Firestore Key      | Type     | Example Values                                                                               | Purpose                                                                                                                                                            | Source of Truth                                                                                                        |
| --------------------- | ------------------ | -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Business Type**     | `businessType`     | `string` | `"Restaurant"`, `"Salon"`, `"Cafe"`, `"Gym"`, `"Other"`                                      | The actual business type when known. `Other` is the canonical fallback when intake cannot identify a confident exact type. Drives schema.org, OBP, time slots, UI labels, filters, image generation, decision blocks, AI prompts. | `src/data/shared/businessTypes.ts` → `BUSINESS_TYPES[].value` (60+ values + `Other`)                                            |
| **Business Category** | `businessCategory` | `string` | `"food"`, `"service"`, `"retail"`, `"health"`, `"creative"`, `"professional"`, `"specialty"` | Broad vertical used for category-level logic (filter allowlists, decision block scoring, time slot defaults). For exact canonical types it is derived from `businessType`; for `Other` and legacy/free-text types it may carry the best known broad category. | `src/data/shared/businessTypes.ts` → `BUSINESS_CATEGORIES[].value` (7 values). Persisted through `resolveStoreBusinessCategory()`. |
| **Business Industry** | `businessIndustry` | `string` | `"B2C"`, `"B2B"`                                                                             | Plan/industry identifier. B2C = SMB businesses (restaurants, salons, etc.). B2B = POS software providers, agencies. Future scope — MenuList is currently B2C only. | `src/data/common.ts` → `PlanType` = `'B2C' \| 'B2B'`                                                                   |

---

## Rules (MANDATORY — ZERO EXCEPTIONS)

### Rule 1: `businessType` = ACTUAL business type

```
store.businessType = "Restaurant"    ✅ CORRECT
store.businessType = "Salon"         ✅ CORRECT
store.businessType = "B2C"           ❌ WRONG (this is businessIndustry)
store.businessType = "food"          ❌ WRONG (this is businessCategory)
```

### Rule 2: `businessCategory` follows store-write resolution

```
// CORRECT: concrete canonical type owns the category
resolveStoreBusinessCategory("Salon", "food"); // "service"

// CORRECT: Other can preserve the broad category detected by intake
resolveStoreBusinessCategory("Other", "food"); // "food"

// WRONG: never persist a conflicting concrete pair
store.businessType = "Restaurant";
store.businessCategory = "retail"; // ❌ Must resolve to "food" before write
```

### Rule 3: `businessIndustry` = B2C or B2B only

```
store.businessIndustry = "B2C"         ✅ CORRECT
store.businessIndustry = "B2B"         ✅ CORRECT
store.businessIndustry = "Restaurant"  ❌ WRONG (this is businessType)
```

### Rule 4: Functions that consume `businessType` expect ACTUAL type

```typescript
// All these expect "Restaurant", "Salon", "Cafe" etc. — NOT "B2C"/"B2B"
getSchemaType(store.businessType, store.businessCategory); // → "Restaurant" schema.org type
getDefaultTimeSlotPresets(store.businessType, tId, sId, store.businessCategory); // → category-aware time slots
getAvailabilityLabels(store.businessType, store.businessCategory); // → "Sold Out" / "Not Available"
getDecisionConfig(store.businessType, store.businessCategory); // → popular/quickPick/bestValue config
resolveStoreBusinessCategory(store.businessType, store.businessCategory); // → persisted store category
IMAGE_VIEW_TYPES.find((t) => t.businessType === store.businessType); // → image gen config
```

---

## Data Sources

### `BUSINESS_TYPES` — 60+ types across 7 categories

```
src/data/shared/businessTypes.ts

Food & Beverage (food):     Restaurant, Cafe, Cake Shop, Bakery, Coffee Shop,
                            Specialty Coffee Shop, Ice Cream Shop
Service (service):          Spa, Salon, Pet Grooming Service/Salon/Studio,
                            Cleaning Services, Car Wash, Landscaping Service/Company
Retail (retail):            Fashion Boutique, Jewelry Store, Bookstore, Electronics,
                            Furniture, Luxury Watch, Craft Supply, Music, Shoe, etc.
Professional (professional): Real Estate, Law Firm, Financial Advisor, Wedding Planner,
                            Event Planning, Interior Designer, Life Coach, Travel Agency
Creative (creative):        Photography Studio, Tattoo Studio, Art Gallery, Music School,
                            Makeup Studio, Handmade Jewelry, Florist, Event Decorator
Health & Wellness (health): Dental Clinic, Yoga Studio, Gym, Fitness Center,
                            Personal Trainer, Spa Resort, Martial Arts Academy
Specialty (specialty):      Car Dealership, Auto Repair, 3D Printing Studio,
                            Boutique Hotel, Daycare, Coworking Space, Bike Rental
```

### `BUSINESS_CATEGORIES` — 7 broad verticals

```
src/data/shared/businessTypes.ts

food          — Food & Beverage
service       — Service Businesses
retail        — Retail Businesses
professional  — Professional Services
creative      — Creative Businesses
health        — Health & Wellness
specialty     — Specialty Businesses (also the DEFAULT fallback)
```

### `PlanType` (businessIndustry values)

```
src/data/common.ts:36

B2C — SMB businesses (restaurants, salons, etc.) — CURRENT FOCUS
B2B — POS software providers, marketing agencies — FUTURE SCOPE
```

---

## Where Each Field Is Set

### During Dashboard Onboarding (`create-subscription/route.ts`)

```
store.businessType     = form.businessIndustry || 'Other'        // Actual type from dropdown, or canonical fallback
store.businessCategory = resolveStoreBusinessCategory(businessType, businessCategory) // Exact type wins; Other can keep broad category
store.businessIndustry = form.userType                          // 'B2C' or 'B2B'
```

### During Messaging Onboarding (publish pipeline)

```
store.businessType     = session.detectedBusinessType || 'Other'        // AI-detected from menu, or canonical fallback
store.businessCategory = resolveStoreBusinessCategory(businessType, session.detectedBusinessCategory) // Exact type wins; Other can keep broad category
store.businessIndustry = ''                                            // Not applicable (always B2C)
```

### During Store Settings Edit (BasicInfoTab / MobileBasicSettingsScreen)

```
store.businessType     = owner_selected_value   // From BUSINESS_TYPES dropdown
store.businessCategory = resolveStoreBusinessCategory(owner_selected_value, currentCategory)  // Re-resolved on save
store.businessIndustry = unchanged              // Not editable in settings
```

### During Outlet Creation (outlets/create/route.ts)

```
store.businessType     = masterStore.businessType      // Copied from master
store.businessCategory = resolveStoreBusinessCategory(businessType, masterStore.businessCategory)
store.businessIndustry = not set                       // Outlets don't have independent industry
```

---

## Historical Context

Before Feb 17, 2026, the onboarding route had the values SWAPPED:

- `store.businessType` stored `'B2C'`/`'B2B'` (wrong)
- `store.businessIndustry` stored `'Restaurant'` etc. (wrong)

This was fixed in `create-subscription/route.ts`. Existing stores need migration (`scripts/migrate-business-type-swap.ts`).

See: `__docs__/business-type-data-model/README.md` for full fix tracking.

---

_This terminology is PERMANENT. All future features, docs, and code must follow these definitions._

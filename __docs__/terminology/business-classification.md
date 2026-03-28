# MenuList Business Classification — Terminology & Data Model

**Status:** LOCKED — Permanent system terminology  
**Last Updated:** February 17, 2026  
**Authority:** This document defines the ONLY correct usage of business classification fields across the entire MenuList codebase.

---

## Three Fields — Three Purposes

| Field                 | Firestore Key      | Type     | Example Values                                                                               | Purpose                                                                                                                                                            | Source of Truth                                                                                                        |
| --------------------- | ------------------ | -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Business Type**     | `businessType`     | `string` | `"Restaurant"`, `"Salon"`, `"Cafe"`, `"Gym"`                                                 | The actual business type. Drives: schema.org, OBP, time slots, UI labels, filters, image generation, decision blocks, AI prompts.                                  | `src/constants/common.ts` → `BUSINESS_TYPES[].value` (60+ values)                                                      |
| **Business Category** | `businessCategory` | `string` | `"food"`, `"service"`, `"retail"`, `"health"`, `"creative"`, `"professional"`, `"specialty"` | Broad vertical derived from `businessType`. Used for category-level logic (filter allowlists, decision block scoring, time slot defaults).                         | `src/constants/common.ts` → `BUSINESS_CATEGORIES[].value` (7 values). Derived via `getBusinessCategory(businessType)`. |
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

### Rule 2: `businessCategory` = ALWAYS derived, NEVER manually set

```
// CORRECT: Always derive from businessType
const category = getBusinessCategory(store.businessType); // "food", "service", etc.

// WRONG: Never hardcode or set independently
store.businessCategory = "food"; // ❌ Must be derived
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
getSchemaType(store.businessType); // → "Restaurant" schema.org type
getDefaultTimeSlotPresets(store.businessType, tId, sId); // → food time slots
getAvailabilityLabels(store.businessType); // → "Sold Out" / "Not Available"
getDecisionConfig(store.businessType); // → popular/quickPick/bestValue config
getBusinessCategory(store.businessType); // → "food", "service", etc.
IMAGE_VIEW_TYPES.find((t) => t.businessType === store.businessType); // → image gen config
```

---

## Data Sources

### `BUSINESS_TYPES` — 60+ types across 7 categories

```
src/constants/common.ts:173-257

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
src/constants/common.ts:163-171

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
store.businessType     = form.businessIndustry || 'Restaurant'  // Actual type from dropdown
store.businessCategory = getBusinessCategory(businessType)       // Derived
store.businessIndustry = form.userType                          // 'B2C' or 'B2B'
```

### During Messaging Onboarding (publish pipeline)

```
store.businessType     = session.detectedBusinessType || 'Restaurant'  // AI-detected from menu
store.businessCategory = getBusinessCategory(businessType)              // Derived
store.businessIndustry = ''                                            // Not applicable (always B2C)
```

### During Store Settings Edit (BasicInfoTab / MobileBasicSettingsScreen)

```
store.businessType     = owner_selected_value   // From BUSINESS_TYPES dropdown
store.businessCategory = getBusinessCategory()  // Re-derived on save
store.businessIndustry = unchanged              // Not editable in settings
```

### During Outlet Creation (outlets/create/route.ts)

```
store.businessType     = masterStore.businessType      // Copied from master
store.businessCategory = derived or masterStore value   // Copied/derived
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

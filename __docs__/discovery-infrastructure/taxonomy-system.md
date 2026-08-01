# Offering Taxonomy System

> Standard category and classification vocabulary for cross-business discovery.
> Phase 1A of Infrastructure Expansion.
> Last Updated: May 9, 2026

---

## 1. What

A **standard taxonomy registry** that maps free-text category names, item tags, and business attributes to canonical IDs. Covers ALL 7 MenuList business categories (food, service, health, retail, creative, professional, specialty) — not restaurant-only.

Three classification layers:

1. **Standard Categories** — canonical category IDs per business type (e.g., `food_starters`, `service_hair`, `health_yoga`, `retail_clothing`)
2. **Offering Tags** — SMB-universal tags covering dietary (food), audience (service/retail), level (health/creative), and universal (all) dimensions
3. **Cuisines** — food-business-specific sub-classification (indian, italian, chinese, etc.)

## 2. Why

MenuList stores category names as free-text `{[lang]: string}`. Two restaurants might call the same concept "Starters", "Appetizers", or "स्नैक्स". Two salons might use "Hair" vs "Haircut" vs "Hair Services".

**Without taxonomy:**

- AI systems cannot query "salons offering hair coloring near me" — must parse free-text
- Cross-business comparisons impossible — "Starters" ≠ "Appetizers" to machines
- A conditional discovery index has no structured categories to filter on unless this utility is deliberately wired

**With taxonomy:**

- `matchCategoryToTaxonomy("Appetizers", "food")` → `food_starters` (canonical ID)
- Cross-business queries become structured: `WHERE standardCategories CONTAINS 'food_starters'`
- AI systems reason about canonical IDs, not free-text

## 3. How

### 3.1 Architecture

```
Free-text category name (from ExtractedDataCategory.name)
         │
         ▼
matchCategoryToTaxonomy(name, businessCategory)
         │
         ├── Step 1: Exact alias match (case-insensitive)
         ├── Step 2: Fuzzy substring match (>3 chars overlap)
         └── Step 3: No match → return null (category stays unclassified)
         │
         ▼
TaxonomyMatchResult { taxonomyCategoryId, matchType, canonicalLabel }
```

### 3.2 Data Model

```typescript
interface TaxonomyCategory {
  id: string; // e.g., 'food_starters', 'service_hair'
  label: string; // English canonical name
  aliases: string[]; // Known variations for matching
  parentId?: string; // Reserved hierarchy support
  businessCategory: string; // Which business category
  sortOrder: number; // Default display order
}

interface OfferingTag {
  id: string; // e.g., 'vegetarian', 'for_men', 'beginner', 'popular'
  label: string; // Display label
  aliases: string[]; // Matching variations
  scope: string[]; // ['*'] = all, ['food'] = food only, ['service', 'retail'] = specific
  schemaOrg?: string; // Schema.org mapping if applicable
}
```

### 3.3 Coverage (95+ standard categories)

| Business Category | Categories | Examples                                                               |
| ----------------- | ---------- | ---------------------------------------------------------------------- |
| food              | 21         | Starters, Mains, Rice & Biryani, Beverages, Desserts, Pizza, Breakfast |
| service           | 15         | Hair, Skin Care, Nails, Spa, Makeup, Waxing, Bridal, Pet, Auto         |
| health            | 14         | Classes, Personal Training, Yoga, Cardio, Dental, Therapy, Wellness    |
| retail            | 14         | New Arrivals, Men's, Women's, Kids, Clothing, Electronics, Home        |
| creative          | 11         | Photography, Design, Art, Tattoo, Music, Craft, Events, Classes        |
| professional      | 10         | Legal, Financial, Consulting, Real Estate, Education, IT, Marketing    |
| specialty         | 10         | Rooms, Dining, Activities, Childcare, Coworking, Vehicles, Rentals     |

### 3.4 Offering Tags (35+ SMB-universal tags)

| Scope                 | Tags                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| Universal (\*)        | popular, new, premium, budget, express, seasonal                                      |
| Food only             | vegetarian, vegan, halal, kosher, gluten_free, dairy_free, jain, spicy, keto, organic |

Static registry records omit `schemaOrg` when no governed mapping exists.
They never serialize `null`, matching the `schemaOrg?: string` runtime and
TypeScript contract.
| Service/Health/Retail | for_men, for_women, unisex, for_kids, for_seniors                                     |
| Health/Creative       | beginner, intermediate, advanced                                                      |
| Service/Health        | appointment_required, walk_in, home_service                                           |
| Cross-category        | eco_friendly, handmade, imported, online_available                                    |

## 4. Where (File Map)

| File                                                     | Purpose                                                          | Lines |
| -------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| `src/lib/infrastructure/taxonomy/types.ts`               | All TypeScript interfaces                                        | ~105  |
| `src/lib/infrastructure/taxonomy/data/categories.json`   | 95 standard categories (JSON, not TS — build-safe)               | ~1,349 |
| `src/lib/infrastructure/taxonomy/data/dietaryTags.json`  | 14 dietary tags with schema.org mappings                         | ~16   |
| `src/lib/infrastructure/taxonomy/data/cuisines.json`     | 20 cuisine types with aliases                                    | ~22   |
| `src/lib/infrastructure/taxonomy/data/offeringTags.json` | 35+ SMB-universal offering tags with scope                       | ~45   |
| `src/lib/infrastructure/taxonomy/registry.ts`            | Static data loaders + lookup functions                           | ~135  |
| `src/lib/infrastructure/taxonomy/matcher.ts`             | Free-text → taxonomy matching (exact + fuzzy + dietary)          | ~185  |
| `src/lib/infrastructure/taxonomy/adapter.ts`             | Reads existing MenuList project data → produces taxonomy mapping | ~141  |
| `src/lib/infrastructure/taxonomy/index.ts`               | Barrel exports                                                   | ~47   |

Runtime verification requires the category catalog to cover exactly the seven
canonical `BUSINESS_CATEGORIES`, use unique IDs globally and unique positive
sort orders per group, and contain non-empty, case-insensitively unique aliases.
Registry callers receive copies, so mutation cannot alter later lookups.

## 5. Integration Points

| Integration                       | How                                                                      | When              |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------- |
| Discovery Index Builder           | `extractTaxonomyFromProject()` is called by `buildBusinessEntityIndexDoc()`; no writer runs while `ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX` is off | Conditional scheduler |
| AI extraction candidate           | Extraction prompt uses taxonomy as category naming hint after extraction-audit approval | During extraction |
| Schema.org enhancement candidate  | Canonical category maps to schema.org `hasMenuSection` for food or `OfferCatalog` grouping for non-food after schema parity audit | Page render       |
| Public API v2 candidate           | Return `standardCategories` in API response only after API v2 approval   | API call          |

## 6. Feature Flag

`ENABLE_INFRASTRUCTURE_TAXONOMY: false` — in both `src/config/features.ts` and `functions/src/constants/features.ts`

## 7. Security & Compliance

- **No cross-tenant data** in the static taxonomy utility — taxonomy is reference data
- **No PII** — category names and tags are public business classification
- **No GDPR/SOC2 impact** — no personal data involved
- **Cross-tenant aggregation** is not active. If the business entity index is wired later, it must use PUBLIC data only.

## 8. Design Decisions

1. **JSON data files, not TypeScript arrays** — follows Large Static Data → JSON rule for build performance
2. **Alias-based matching, not AI** — deterministic, zero cost, predictable
3. **Business-category-scoped** — categories are specific to business type (food ≠ service)
4. **Offering tags are scope-aware** — dietary tags only match food businesses, audience tags only match service/retail
5. **Graceful degradation** — unmatched categories return null (existing free-text preserved)
6. **No existing data mutation** — taxonomy is computed on-demand, never stored on existing documents

## 9. Migration Notes

- Zero migration required — existing data untouched
- Taxonomy is purely additive
- Existing categories remain free-text
- Standard category mapping is computed on-demand by adapter functions

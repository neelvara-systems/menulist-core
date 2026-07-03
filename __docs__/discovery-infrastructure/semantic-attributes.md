# Semantic Attribute Registry

> Controlled vocabulary for business attributes with schema.org mappings.
> Phase 1C of Infrastructure Expansion.
> Last Updated: May 10, 2026

---

## 1. What

A **unified semantic attribute registry** mapping `store.businessAttributes` boolean fields to canonical IDs with schema.org mappings. Covers 17 attributes across 5 groups: amenity, dietary, service_mode, payment, accessibility. SMB-universal — applies to all business types, not just restaurants.

## 2. Why

MenuList already stores business attributes as typed booleans on `store.businessAttributes` (e.g., `wifi: true`, `outdoorSeating: true`). These are structured but:

- **No canonical ID system** — code references `businessAttributes.wifi` directly, no abstraction
- **No schema.org linkage** — `buildAmenityFeatures()` in `src/lib/schema/index.ts` hardcodes the mapping
- **No group classification** — amenities, dietary, service modes mixed in flat object
- **No cross-business query vocabulary** — discovery index needs canonical attribute IDs

**With semantic registry:**

- `extractStoreSemanticProfile(store.businessAttributes)` → `{ attributeIds: ['wifi', 'outdoor_seating', 'dine_in'], byGroup: { amenity: ['wifi', 'outdoor_seating'], service_mode: ['dine_in'] } }`
- Discovery index stores canonical attribute IDs → queryable across businesses
- Schema.org mappings available for enhanced structured data

## 3. How

### 3.1 Architecture

```
store.businessAttributes (existing boolean fields)
         │
         ▼
extractStoreSemanticProfile(businessAttributes)
         │
         ├── For each SEMANTIC_ATTRIBUTES entry:
         │   if storeField exists AND businessAttributes[storeField] === true
         │   → add attribute ID to result
         │
         ▼
StoreSemanticProfile { attributeIds: string[], byGroup: Record<group, string[]> }
```

### 3.2 Registry (17 Attributes, 5 Groups)

| Group             | Attributes                                                            | Schema.org                      |
| ----------------- | --------------------------------------------------------------------- | ------------------------------- |
| **amenity**       | wifi, outdoor_seating, parking, air_conditioning, live_music          | LocationFeatureSpecification    |
| **dietary**       | vegetarian_options, vegan_options, halal_options, gluten_free_options | VegetarianDiet, VeganDiet, etc. |
| **service_mode**  | dine_in, takeaway, delivery, drive_through                            | —                               |
| **payment**       | accepts_cards, accepts_upi, accepts_cash                              | —                               |
| **accessibility** | pet_friendly                                                          | LocationFeatureSpecification    |

### 3.3 Key Functions

| Function                                          | Purpose                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `getAllSemanticAttributes()`                      | Get all 17 attributes                    |
| `getAttributesByGroup(group)`                     | Filter by group (amenity, dietary, etc.) |
| `getSemanticAttributeById(id)`                    | Lookup single attribute                  |
| `extractStoreSemanticProfile(businessAttributes)` | Extract active attributes from store     |

## 4. Where (File Map)

| File                                                    | Purpose                                                         | Lines |
| ------------------------------------------------------- | --------------------------------------------------------------- | ----- |
| `src/lib/infrastructure/semantics/types.ts`             | SemanticAttribute, SemanticAttributeGroup, StoreSemanticProfile | ~45   |
| `src/lib/infrastructure/semantics/attributeRegistry.ts` | 17 attributes + lookup functions + store adapter                | ~106  |
| `src/lib/infrastructure/semantics/index.ts`             | Barrel exports                                                  | ~20   |

## 5. Integration Points

| Integration                       | How                                                                            | When              |
| --------------------------------- | ------------------------------------------------------------------------------ | ----------------- |
| Discovery Index Builder           | `extractStoreSemanticProfile()` is called by `buildBusinessEntityIndexDoc()`; no writer runs while `ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX` is off | Conditional scheduler |
| Schema.org enhancement candidate  | Replace hardcoded `ATTRIBUTE_LABELS` in `buildAmenityFeatures()` with registry after schema parity audit | Page render       |
| Public API v2 candidate           | Return `semanticAttributes` in a structured API response only after API v2 approval | API call          |
| Extraction-derived OBP defaults   | `businessAttributeSuggestions` and deterministic dietary tags fill missing `store.businessAttributes` only when evidence is high-confidence | First extraction auto-save; owner-approved re-extraction |

### 5.1 Extraction Defaulting Guardrails

Business attributes can be suggested by menu extraction, but owner-entered store truth stays authoritative.

- Shared allowlist: `src/data/shared/businessAttributeInference.ts`
- Functions mirror: `functions/src/sharedData/businessAttributeInference.ts`
- First extraction path: `functions/src/logic/businessAttributeDefaults.ts`
- Review/apply path: `src/lib/obp/inferBusinessAttributesFromMenu.ts` and `src/lib/extraction/applyChanges.ts`
- AI suggestions must be positive and `confidence: "high"` before they can fill a missing store attribute.
- Deterministic dietary inference uses canonical taxonomy tags, including `gluten_free`, so `glutenFree` is not missed when taxonomy normalization runs.
- Existing `store.businessAttributes.<key> === true|false` is never overwritten by extraction.

## 6. Feature Flag

`ENABLE_INFRASTRUCTURE_SEMANTIC_ATTRIBUTES: false` — in both `src/config/features.ts` and `functions/src/constants/features.ts`

## 7. Security & Compliance

- **No cross-tenant data** — attributes are per-store, read from existing store document
- **No PII** — business amenities and service modes are public data
- **Zero Firebase cost** — reads existing `store.businessAttributes` (already loaded)
- **Static registry** — no Firestore reads for attribute definitions

## 8. Design Decisions

1. **Maps to existing store fields** — `storeField` on each attribute links to `store.businessAttributes.*`
2. **5 semantic groups** — amenity, dietary, service_mode, payment, accessibility
3. **Schema.org where applicable** — not all attributes have schema.org mappings (payment, service_mode don't)
4. **SMB-universal** — amenities (WiFi, parking) apply to restaurants AND salons AND gyms
5. **Grouped output** — `byGroup` enables UI rendering by category if needed

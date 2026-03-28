# Field-Level Provenance Metadata

> Track data source, confidence, and lineage per field on menu/offering items.
> Phase 1B of Infrastructure Expansion.
> Last Updated: March 10, 2026

---

## 1. What

An internal `_provenance` metadata stamp on offering items tracking **source** (AI/owner/staff/system/import) and **confidence** (0.0–1.0) per field. Applies to ALL business types — not restaurant-specific. Stripped before customer exposure (same pattern as `_mce`).

**6 trackable fields:** name, price, description, category, tags, available.

## 2. Why

MenuList currently tracks provenance at document-level (`createdBy`, `modifiedBy`) and for one field (`descriptionSource: 'ai' | 'manual'`). External AI consumers cannot assess per-field trust:

- "Was this price typed by the owner (confidence: 1.0) or extracted by AI (confidence: 0.7)?"
- "Was this availability set by staff today or by a system default 6 months ago?"
- "Which fields have been owner-verified vs auto-generated?"

**Without provenance:** AI systems treat all fields equally — no trust differentiation.
**With provenance:** AI systems can weight owner-verified data higher than AI-extracted data.

## 3. How

### 3.1 Architecture

```
Item field changes
      │
      ├── AI extraction → stampAIExtraction(confidence)
      │   source: 'ai_extraction', confidence: 0.0–0.99
      │
      ├── Owner edits → stampOwnerEdit(existing, field)
      │   source: 'owner_edit', confidence: 1.0
      │
      └── Staff edits → stampProvenance(existing, fields, 'staff_edit', 1.0)
      │
      ▼
_provenance: { name: {source, confidence, timestamp}, price: {...}, ... }
      │
      ▼ (stripped by sanitizeForClient)
Public pages never see _provenance
```

### 3.2 Data Model

```typescript
type ProvenanceSource =
  | "ai_extraction"
  | "owner_edit"
  | "staff_edit"
  | "system"
  | "import";

interface ProvenanceEntry {
  source: ProvenanceSource;
  confidence: number; // 0.0–1.0 (clamped)
  timestamp: number; // Date.now() epoch ms
}

interface ItemProvenance {
  name?: ProvenanceEntry;
  price?: ProvenanceEntry;
  description?: ProvenanceEntry;
  category?: ProvenanceEntry;
  tags?: ProvenanceEntry;
  available?: ProvenanceEntry;
}
```

### 3.3 Key Functions

| Function                                                | Purpose                                                 |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `stampAIExtraction(confidence)`                         | Stamp all fields with AI source + extraction confidence |
| `stampOwnerEdit(existing, field)`                       | Stamp single field as owner-verified (confidence: 1.0)  |
| `stampProvenance(existing, fields, source, confidence)` | Generic stamp for any source type                       |
| `detectChangedFields(oldItem, newItem, lang)`           | Detect which provenance-trackable fields changed        |
| `createProvenanceEntry(source, confidence)`             | Create a single entry with clamped confidence           |

### 3.4 Integration Flow

When `ENABLE_INFRASTRUCTURE_PROVENANCE` is true:

1. **AI extraction completes** → `stampAIExtraction(extractionConfidence)` → stored as `item._provenance`
2. **Owner edits item name** → `detectChangedFields()` → `stampOwnerEdit(existing, 'name')` → name provenance updated to `{source: 'owner_edit', confidence: 1.0}`
3. **Discovery index builder reads** → `item._provenance.price.confidence` → used as `truthScore` signal

## 4. Where (File Map)

| File                                           | Purpose                                                            | Lines |
| ---------------------------------------------- | ------------------------------------------------------------------ | ----- |
| `src/lib/infrastructure/provenance/types.ts`   | ProvenanceSource, ProvenanceEntry, ItemProvenance, ProvenanceField | ~60   |
| `src/lib/infrastructure/provenance/tracker.ts` | All stamping/detection functions (pure, no side effects)           | ~120  |
| `src/lib/infrastructure/provenance/index.ts`   | Barrel exports                                                     | ~25   |

## 5. Integration Points

| Integration               | How                                                  | When                   |
| ------------------------- | ---------------------------------------------------- | ---------------------- |
| AI Extraction Pipeline    | `stampAIExtraction()` called after Gemini extraction | During menu processing |
| Editor Save               | `detectChangedFields()` + `stampOwnerEdit()` on save | Owner edits            |
| Discovery Index (Phase 2) | Read `_provenance` confidence for trust scoring      | Nightly scheduler      |
| sanitizeForClient         | Strip `_provenance` before public exposure           | SSR page render        |

## 6. Feature Flag

`ENABLE_INFRASTRUCTURE_PROVENANCE: false` — in both `src/config/features.ts` and `functions/src/constants/features.ts`

## 7. Security & Compliance

- **Internal metadata only** — `_` prefix convention, stripped by sanitizeForClient
- **No PII** — only source type, confidence score, timestamp
- **No cross-tenant data** — provenance is per-item, per-store
- **Same write cost** — stamped in same Firestore setDoc call as item data

## 8. Design Decisions

1. **`_` prefix convention** — matches existing `_mce` pattern for internal metadata
2. **Per-field, not per-document** — name confidence ≠ price confidence
3. **Clamped 0.0–1.0** — predictable range for all consumers
4. **Pure functions** — no Firebase calls, no side effects, safe in any context
5. **Graceful when missing** — `_provenance` is optional on items, functions handle undefined
6. **SMB-universal** — applies to any business type's items (menu items, services, products)

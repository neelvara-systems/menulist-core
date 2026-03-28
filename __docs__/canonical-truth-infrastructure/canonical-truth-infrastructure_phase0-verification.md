# Phase 0 — Codebase Verification Report

**Date:** 2025-02-24
**Source:** `chatgpt-conv-implementation-backlog.md` Phase 0 items
**Method:** Deep codebase analysis of actual code, types, and data flows

---

## Summary

| Backlog Item | Status | Evidence |
|-------------|--------|----------|
| 1.1 Strict Price Schema | ⚠️ PARTIAL | Prices stored as `string`, MCE validates parseable numbers |
| 1.2 Explicit Availability | ✅ SUFFICIENT | `available?: boolean` + `active: boolean` covers P0 needs |
| 1.3 Semantic Normalization | ❌ NOT BUILT | Tags are free-text strings — P1 item, not P0 |
| 1.4 Zero-Blank on Publish | ⚠️ BUILT BUT OFF | MCE has 18 rules, `ENABLE_MCE: false` in production |
| 1.5 Deterministic Output | ⚠️ NOT VERIFIED | No byte-level stability guarantee exists |
| 1.6 Atomic Publish | ✅ EFFECTIVELY ATOMIC | Single Firestore `setDoc` = all readers see same state |
| 4.1 Global Version ID | ❌ NOT BUILT | `menuVersion` exists only in POS sync context |
| 4.2 Monotonic Versions | ❌ NOT BUILT | Depends on 4.1 |
| 4.3 Version on Surfaces | ❌ NOT BUILT | No version/timestamp rendered on public pages |

---

## Detailed Findings

### 1.1 Strict Price Schema Enforcement

**Current reality:**
- `ExtractedDataItem.price` is `string | undefined` — `@src/components/templates/main-app/projects/types/extractedData.types.ts:56`
- `ExtractedDataAttribute.price` is `string` — same file line 41
- `SnapshotItem.price` is `string` (e.g., "₹899") — `@src/types/multiOutlet.types.ts:204`
- MCE rule `VALID_PRICE_FORMAT` validates prices parse to numbers — `@src/lib/mce/correctnessResolver.ts:114-143`
- `pricing.schema.ts` allows text prices like "Market Price" — `@src/lib/validation/pricing.schema.ts:26-31`

**Verdict:** Price storage is string-based. MCE validates numeric parseability but `pricing.schema.ts` allows non-numeric text. For P0, MCE coverage is sufficient. Full numeric migration is a schema-breaking change (P2).

### 1.2 Explicit Availability Model

**Current reality:**
- `available?: boolean` on items (default `true`) = sold-out toggle — `@src/components/templates/main-app/projects/types/extractedData.types.ts:60`
- `active: boolean` = permanent visibility toggle — same file line 59
- MOL tracks both: `AVAILABILITY` and `ITEM_ACTIVE` change types — `@src/types/menuObservation.ts:22,25`

**Verdict:** ✅ Two-flag model (active + available) covers `temporarily_unavailable` (available=false) and `permanently_removed` (active=false). Sufficient for P0.

### 1.4 Zero-Blank Enforcement (MCE)

**Current reality:**
- MCE engine exists with 18 rules across 5 Laws — `@src/lib/mce/correctnessResolver.ts`
- MCE stamps `_mce` metadata on saves — `@src/database/projects/index.ts:468-484`
- Publish-Gate blocks "Continue to UI Editor" when MCE fails — `@src/components/templates/main-app/projects/editorView/Editor.tsx:271-289`
- **BUT `ENABLE_MCE: false`** — `@src/config/features.ts:900`

**Action needed:** Enable MCE flag.

### 1.6 Atomic Publish

**Current reality:**
- `publishProject()` → single `setDoc` with merge — `@src/database/projects/index.ts:752-754`
- `updateProject()` → single `setDoc` with merge — `@src/database/projects/index.ts:487-489`
- All surfaces (QR, web, screen) read from the same Firestore document
- Cache invalidation fires after write — `@src/database/projects/index.ts:493-501`

**Verdict:** ✅ Single-document architecture = inherently atomic. All readers see the same state.

### 4.1-4.3 Version Tracking

**Current reality:**
- `menuVersion` exists ONLY in `posSync` context — `@src/types/platform/store.ts:292`
- POS delivery uses atomic increment via transaction — `@src/app/api/pos-sync/deliver/route.ts:75-83`
- **No global publish version on project document**
- **No version/timestamp rendered on public surfaces**

**Action needed:** Add `menuVersion` + `lastPublishedAt` to Project type and publish pipeline.

---

## What Already Exists (Mapping to Backlog)

| Backlog Item | Existing Implementation |
|-------------|------------------------|
| 2.1 Event Ledger | `menuChangeLog/{tId}/{sId}` — append-only, debounced |
| 2.2 Price Events | MOL tracks `PRICE` changes with old/new values |
| 2.3 Availability Events | MOL tracks `AVAILABILITY` changes |
| 2.4 Category Events | MOL types include `CATEGORY_ADDED`, `CATEGORY_REMOVED`, `CATEGORY_REORDER` |
| 2.8 Store Truth Metrics | `DerivedItemMetrics` type exists for nightly computation |
| 3.1 Completeness Score | MCE `_mce.verified` + rules cover completeness |
| 3.4 AI Guardrails | MCE validates on every save; AI can't bypass DAL |

## Critical Gaps to Fix Now

1. **`ENABLE_MCE: false`** → flip to `true`
2. **`ENABLE_MENU_OBSERVATION: false`** → flip to `true`
3. **No global menuVersion** → add to Project + publish pipeline
4. **No publish event** → add `PUBLISH` to MOL change types
5. **No menu snapshot on publish** → add `menuSnapshots` collection

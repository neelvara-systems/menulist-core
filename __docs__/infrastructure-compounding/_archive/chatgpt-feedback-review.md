# ChatGPT Feedback Review — Infrastructure Compounding Specs

**Date:** February 24, 2026  
**Reviewer:** Cascade (Lead Architect)  
**Context:** Shared all 4 spec docs (10.1–10.4) with ChatGPT. Received validation + suggestions.  
**ChatGPT Accuracy vs Our Specs:** ~90% redundant. 3 rejections. 1 useful framing.

---

## Verdict Summary

| ChatGPT Suggestion | Decision | Reason |
|---|---|---|
| "Build as one integrated system, closed loop" | ✅ ACCEPT (framing) | Good naming. Our specs already designed as sequential chain. Added "closed loop" diagram + "Truth Engine" codename to README. |
| New `extractionErrorLog` collection | ❌ REJECT | Our spec uses existing `menuChangeLog` with `EXTRACTION_CORRECTION` event type. Zero new collections. ChatGPT's approach adds unnecessary cost. |
| "Highlight low-confidence items subtly" in UI | ❌ REJECT | **Violates Doc 01 Law 3 (No Explanations) and Law 6 (No Cognitive Load).** Showing confidence to owners makes them evaluate and think. Infrastructure stays invisible. |
| Weekly aggregation | ❌ REJECT | Nightly is 7x fresher. Our scheduler already runs 9 tasks nightly. One more is trivial. |
| "One tap: Confirm or Edit" in-app UI | ⏸️ DEFER to v2 | Interesting but adds UI surface. Email-first approach (v1) is simpler, doctrine-compliant, zero UI. Log as future enhancement. |
| "MenuList Truth Engine" / "Intelligence Core" naming | ✅ ACCEPT (internal codename) | Added to README as internal codename. Not a product name — just team reference. |
| 6-week implementation timeline | ✅ ACCEPT | Aligned with our spec scope. Added to README as target timeline. |
| Per-item HIGH/MEDIUM/LOW confidence | ✅ ALREADY IN SPEC | `extraction-confidence-scoring_spec.md` §4.2 — exact same. |
| Track name/price/category corrections | ✅ ALREADY IN SPEC | `extraction-learning-loop_spec.md` §4.2 — captures all fields. |
| Store truth score 0-100 | ✅ ALREADY IN SPEC | `store-truth-confidence_spec.md` §4.1 — 5 weighted components. |
| 90-day staleness + calm message | ✅ ALREADY IN SPEC | `periodic-staleness-check_spec.md` §4.2 — exact same. |
| "Don't add dashboards, analytics, suggestions" | ✅ ALREADY IN SPEC | Every spec has "What This Does NOT Do" section. Also per Doc 01, 11, 17. |

---

## Key Doctrine Conflicts Identified

### 1. "Highlight low-confidence items subtly" — REJECTED

ChatGPT suggests showing confidence to owners, even subtly. This directly violates:

- **Doc 01 Law 3:** "MenuList never explains WHY it made a decision. No scores, percentages, comparisons."
- **Doc 01 Law 6:** "If a feature causes the owner to think, compare, choose, or analyze — it does not ship."
- **Doc 09 (Product Taste):** Confidence indicators create cognitive load. Owner starts evaluating AI quality instead of just fixing errors.

**Our approach:** Confidence data is purely internal. It feeds the learning loop and truth confidence score. Owners see nothing.

### 2. New `extractionErrorLog` collection — REJECTED

ChatGPT suggests: `extractionErrorLog` with `storeId`, `itemId`, `field`, `originalValue`, `correctedValue`, `errorType`, `timestamp`.

**Our approach:** Use existing `menuChangeLog/{tId}/{sId}` with new `EXTRACTION_CORRECTION` change type. Same data, same structure, zero new collections. Follows established MOL pattern. Lower Firebase cost.

**Why our approach is better:**
- Zero new Firestore collections (cost discipline)
- Follows existing MOL architecture (consistency)
- Already feature-flag gated (`ENABLE_MENU_OBSERVATION`)
- Already has debounced writes, fire-and-forget pattern
- Already has cost telemetry

---

## Changes Made to Specs

| File | Change | Reason |
|------|--------|--------|
| `README.md` | Added "closed loop" diagram + "Truth Engine" codename | Good framing from ChatGPT, validated against our existing sequential design |
| `README.md` | Added 6-week implementation timeline | Validated as reasonable target |
| No spec changes | — | All spec content was already correct. ChatGPT feedback was redundant with our specs. |

---

## What ChatGPT DIDN'T Know

1. Our specs already use **existing MOL** (not a new collection)
2. Our specs already have **zero UI** commitment (ChatGPT suggested UI changes)
3. Our nightly scheduler already runs **9 tasks** — adding 3 more is trivial
4. Our specs already have **feature flags** on every component
5. Our specs already have **Firebase cost analysis** per feature ($0.003/mo total at 100 stores)
6. Our specs already designed the **sequential dependency chain** that ChatGPT calls "closed loop"

---

**Reviewer:** Cascade (Lead Architect)  
**Status:** REVIEW COMPLETE ✅

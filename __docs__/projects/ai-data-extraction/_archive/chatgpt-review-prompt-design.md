# ChatGPT Review — Extraction Prompt Design

**Date:** March 13, 2026
**Source:** ChatGPT conversation (~16 discussion points on prompt engineering for menu extraction)
**Reviewer:** Cascade
**ChatGPT Accuracy:** ~20% genuinely new (80% redundant, 10% wrong)

---

## Summary

ChatGPT provided a comprehensive discussion on extraction prompt design covering: system role, task objective, extraction rules, output schema, edge cases, Gemini-specific optimizations, temperature tuning, multi-pass extraction, evaluation harness, and a gold-standard test dataset design.

After line-by-line cross-check against the actual `parallelProcessingPrompt.ts` (386 lines), `extractionHardening.ts` (627 lines), `aiResponseUtils.ts` (278 lines), `processMenuImages.ts` (911 lines), and `ai.ts` (101 lines), the vast majority of suggestions were already implemented — often more sophisticated than what ChatGPT proposed.

---

## Cross-Check Results

### Already Implemented (~80%)

| ChatGPT Suggestion | Codebase Implementation | Notes |
|---|---|---|
| "Structured data extraction engine" role | Line 46 of prompt (now upgraded in v2) | Was "specialized AI model" — improved |
| Multi-industry support | Prompt says "menus, service lists, and rate cards" | Already industry-neutral |
| Text preservation rules | "No Interpretation" rule in prompt | Already done |
| Category assignment (nearest heading) | 4-level priority system (lines 31-34) | MORE detailed than ChatGPT |
| Price extraction as-is | Price field handling (line 208) | Already done |
| Variant → attributes | Lines 209-213 | Already done |
| Multi-language preservation | Lines 186-202 (language detection + isPrimary) | MORE detailed |
| Multi-column layout | Lines 164-171 (column-by-column) | MORE accurate than ChatGPT's L-to-R |
| Anti-hallucination | Tags anti-hallucination + confidence scoring | MORE sophisticated |
| Flat schema (categories + items by ID) | Lines 236-297 | Identical architecture |
| Edge cases (missing categories) | "Uncategorized" fallback (line 154) | Already done |
| Category merging | extractionHardening.ts (~140 synonyms) | MUCH more comprehensive |
| `responseMimeType: 'application/json'` | ai.ts line 31 | Already done |
| Prompt versioning | `EXTRACTION_PROMPT_VERSION` constant | Already done |
| Retry with backoff | retryWithBackoff() in processMenuImages.ts | Already done |
| Circuit breaker | circuitBreaker.ts | Already done |
| Quality scoring | scoreExtractionQuality() | Already done |
| Per-item confidence | Extraction confidence in prompt (lines 362-379) | Already done |

### ChatGPT WRONG (~10%)

| Suggestion | Why Wrong |
|---|---|
| `maxOutputTokens: 2048-4096` | Real menus have 200+ items. Our 65536 is correct. 4096 would truncate most menus. |
| Prompt size 250-350 tokens | Impossible for our complexity (multi-batch, sourceFileIndex, fileMessages, confidence, tags, multi-column). ~385 lines is the correct size. |
| Multi-pass extraction (structure first, then details) | Adds latency and cost. Our batch processing + hardening layer is a better architecture. |

### Genuinely Useful (~10%) — IMPLEMENTED

| Finding | Severity | Action Taken |
|---|---|---|
| Description generation contradicted anti-hallucination | CRITICAL | Removed "generate up to 30 words" — now extract-only |
| "Mandatory Fields" forced description hallucination | CRITICAL | Changed to "descriptions only if visible" |
| "Text Formatting: Remove parenthesis" destroyed data | MEDIUM | Changed to "preserve text exactly as written" |
| System role could be more deterministic | MINOR | Upgraded to "structured data extraction engine" framing |
| No explicit anti-inference rule | MINOR | Added "Do not generate, infer, or fabricate" |
| No schema stability instruction | MINOR | Added "Do not add fields beyond defined schema" |

### Valid P3 Items — DOCUMENTED ONLY

| Suggestion | Priority | Notes |
|---|---|---|
| Evaluation harness with ground-truth dataset | P3 | Valid. Already in remaining improvements. Need real restaurant data first. |
| Gold-standard test dataset (30-50 cases) | P3 | Good suggestion. Part of MISR/HCR/TTFP metrics work. |
| Comparison algorithm for semantic matching | P3 | Useful when evaluation harness is built. |
| Prompt comparison mode (v1 vs v2 metrics) | P3 | Requires evaluation harness first. |

### Decisions Kept — Not Changed

| Setting | ChatGPT Recommendation | Our Value | Reason to Keep |
|---|---|---|---|
| `temperature` | 0.1 | 0.2 | Production-validated. 0.1 can be too rigid. Test separately. |
| `topP` | 0.9 | 0.95 | Working well. Marginal difference. |
| `topK` | Not mentioned | 40 | Already set, no reason to change. |

---

## Changes Made

### Files Modified

| File | Change |
|---|---|
| `functions/src/logic/parallelProcessingPrompt.ts` | 5 prompt improvements (system role, anti-inference, text preservation, mandatory fields, description handling, schema stability) |
| `functions/src/constants/ai.ts` | Version bump `parallel_v1` → `parallel_v2` |
| `__docs__/projects/ai-data-extraction/ai-data-extraction_impl.md` | Documented prompt v2 changes, updated known issues |

### Verification

- `npx tsc --noEmit` on functions/: **0 errors**
- `npx tsc --noEmit` on main project: **0 errors**

---

## Key Insight

ChatGPT's discussion was well-structured but lacked codebase context. It assumed a typical "prompt + JSON response" system without knowing about our:
- Multi-batch processing with category continuation
- Extraction hardening layer (synonym normalization, integrity validation, anomaly detection)
- Per-item confidence scoring
- fileMessages per-file issue tracking
- sourceFileIndex tracking for multi-image extraction
- Circuit breaker and rate limiting
- Provenance tracking (raw responses + prompt version)

The real value was NOT in the prompt structure recommendations (already done) but in catching **two internal contradictions** in our existing prompt that had been documented as known issues but never fixed.

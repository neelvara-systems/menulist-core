# ChatGPT Feedback Audit — Multi-Language Translation

> **Date:** March 14, 2026
> **Source:** ChatGPT infrastructure review conversation (~20,000 words)
> **Reviewer:** Cascade (full codebase access)
> **ChatGPT Accuracy:** ~55%

---

## Summary: 7 Valid | 12 Rejected | 4 Deferred (Already Documented)

The ChatGPT conversation was an exhaustive 11-layer architectural audit of the translation system. Many observations were correct about the **existing** architecture but ChatGPT was unaware of several features already implemented (multi-outlet governance, AI usage logging, language resolver, language constants). The conversation contained significant strategic value but ~45% of suggestions either already exist or violate doctrine.

---

## Feedback Audit Table

| # | ChatGPT Point | Status | Codebase Reality | Action |
|---|--------------|--------|-----------------|--------|
| 1 | **Source Language Authority** — `isPrimary: true` is critical | ❌ Already exists | `ExtractedDataLanguage.isPrimary` in `extractedData.types.ts` | None |
| 2 | **Deterministic Translation Keys** (`_c`, `_i`, `_d`, `_a`) are excellent | ❌ Already exists | `translationsUtils.ts:66-176` — all 4 key types implemented | None |
| 3 | **Translation Skipping Logic** — skip if target exists | ❌ Already exists | `extractTranslatableStringsJSON` checks `!Boolean(name?.[targetLang])` | None |
| 4 | **File-Scoped Processing** — correct batch unit | ❌ Already exists | `handleLanguageToggle` iterates `for (const file of prevData.files)` | None |
| 5 | **Immediate Persistence** — `updateProject()` after translation | ❌ Already exists | `Editor.tsx:320` — persist immediately after loop | None |
| 6 | **URL Language Override** — stateless, correct priority | ❌ Already exists | `resolveRenderLanguage()` in `src/lib/localization/languageResolver.ts` | None |
| 7 | **Outlet Governance Model** — master defines, outlet subsets | ❌ Already exists | `TranslationGovernanceOptions`, `shouldTranslateItem/Category` in `translationsUtils.ts:17-59` | None |
| 8 | **Sequential Translation Bottleneck** — `for...await` is slow | ✅ Valid | `handleLanguageToggle` is sequential. 10 files × 5 langs = 50 calls | 🔄 Defer (P2, already in impl.md) |
| 9 | **Firestore Document Size Risk** | ❌ Already handled | `LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT: 6`, `DOC_SIZE_WARNING_KB: 500`, `DOC_SIZE_BLOCK_KB: 900` in `src/constants/languages.ts` | None |
| 10 | **Translation Drift Detection (Source Hash)** — source text changes invalidate translations | ✅ Valid finding | No source fingerprinting exists. `extractTranslatableStringsJSON` skips items that already have a target translation, so edits to source are invisible | Document as future improvement |
| 11 | **Translation Memory** — cache repeated phrases | 🔄 Already documented | Explicitly deferred in `impl.md:786-841` with full schema design | None |
| 12 | **Dish/Entity Identity Preservation** — AI may translate brand/dish names | ✅ Valid | Current prompt has NO entity preservation rules. Generic "translate strings" | **IMPLEMENT: Prompt improvement** |
| 13 | **AI Response Validation** — JSON parse + key integrity check | ✅ Valid | `route.ts:113` does bare `JSON.parse(response.text)` — no try/catch, no key check, no retry | **IMPLEMENT: Add retry + validation** |
| 14 | **AI Cost Logging** — persist translation costs | ❌ Already exists | `addAiOperation(transactionObject)` at `route.ts:147` logs tokens, cost, model, margins | None |
| 15 | **Temperature Reduction** — 0.8 too high for translation | ✅ Valid | `temperature: 0.8` at `route.ts:94`. Translation is deterministic task. | **IMPLEMENT: Lower to 0.3** |
| 16 | **Fallback to primary language instead of "en"** | ❌ Already handled | `languageResolver.ts:58-63` already falls back to `availableLanguages[0]` if "en" not available | None |
| 17 | **Token Compression (pipe format)** — reduce token usage | ❌ Reject | Using `responseMimeType: "application/json"` forces JSON mode. Pipe format breaks this. Parsing complexity outweighs marginal token savings. | None |
| 18 | **Contextual Grouping** — group by category for better context | 🔄 Defer | Would require restructuring translation pipeline. Marginal accuracy gain for significant complexity. | Document only |
| 19 | **Key Anchoring** — tell model to preserve keys | ❌ Already exists | Prompt rule 2: "The 'id'... must be preserved" and rule 3: "Do not omit the 'id'" | None |
| 20 | **Translation State (VALID/OUTDATED/MISSING)** — per-field state tracking | ✅ Valid concept | Same as #10 (drift detection). Requires major schema change: translations from `string` → `{value, sourceHash}` | Document as future improvement |
| 21 | **Prompt Injection Protection** — menu text could contain instructions | ✅ Valid | No explicit anti-injection instruction in prompt. Input is JSON-wrapped but model could still follow injected instructions | **IMPLEMENT: Add to prompt** |
| 22 | **Cultural Adaptation** — adapt spice levels, etc. | ❌ Already rejected | Documented in impl.md:845-883 as "Not Recommended" with doctrine violation table | None |
| 23 | **Allergen Translation** — extra validation for allergens | 🔄 Already documented | Deferred in impl.md:746-783 | None |

---

## UX Suggestions (Not Code Changes)

| # | ChatGPT UX Point | Assessment | Notes |
|---|-----------------|------------|-------|
| U1 | Progressive Language Reveal — collapse translations in editor | Good idea | Future UX improvement, not blocking |
| U2 | Language Preview before adding | Good idea | Adds complexity but reduces hesitation |
| U3 | "One menu, multiple languages" mental model | ✅ Already correct | Editor uses language switcher chips, not separate views |
| U4 | Dashboard vs Menu language separation | ✅ Already correct | `language` (admin UI) vs `activeLanguages/defaultLanguage` (menu) are separate |
| U5 | Automatic translation maintenance on source edit | Same as drift detection (#10) | Requires source hash infrastructure |
| U6 | No flags for languages | ✅ Already correct | Uses globe icon |
| U7 | "Language invisibility" — treat as infrastructure not feature | ✅ Already correct per doctrine | "Translation is PLUMBING, not INTELLIGENCE" in impl.md |

---

## Implementation Plan

### Priority 1 — Implement Now (Low Effort, High Impact)

| # | Change | File | Effort |
|---|--------|------|--------|
| A | **Prompt hardening**: Add entity preservation rules + anti-injection protection | `src/app/api/translations/prompt.ts` | ~15 min |
| B | **Temperature reduction**: 0.8 → 0.3 | `src/app/api/translations/route.ts` | ~1 min |
| C | **JSON parse safety**: Add try/catch + 1 retry around `JSON.parse` | `src/app/api/translations/route.ts` | ~15 min |

### Priority 2 — Document for Future (Defer)

| # | Improvement | Why Defer |
|---|-------------|-----------|
| D | Translation drift detection (source hash) | Major schema change: `string` → `{value, sourceHash}`. Requires migration. |
| E | Parallel translation (bounded workers) | Already documented in impl.md. Implement when latency complaints arise. |
| F | Contextual grouping | Restructures translation pipeline. Marginal accuracy gain. |

### Rejected (with reasoning)

| # | Suggestion | Why Rejected |
|---|-----------|-------------|
| R1 | Token compression (pipe format) | Breaks `responseMimeType: "application/json"`. Adds parsing fragility. |
| R2 | Cultural adaptation | Violates doctrine (impl.md:845-883) |
| R3 | Translation dashboards/analytics | Violates "PLUMBING, not INTELLIGENCE" principle |
| R4 | Confidence scores | Creates audit mindset (impl.md:1147) |
| R5 | Translation memory (now) | Premature — defer per existing plan until ~5K restaurants |

---

## ChatGPT Accuracy Breakdown

| Category | Count | Notes |
|----------|-------|-------|
| **Described existing features accurately** | 7 | Good system understanding from docs alone |
| **Missed existing implementations** | 6 | Multi-outlet governance, AI logging, language resolver, fallback logic, key anchoring, allergen docs |
| **Valid new suggestions** | 7 | Drift detection, entity preservation, temperature, JSON retry, prompt injection, response validation, parallel translation |
| **Correctly rejected** | 3 | Cultural adaptation, confidence scores, dashboards |
| **Over-engineered** | 3 | Token compression, translation state machine (too complex for current scale), contextual grouping |

**Overall accuracy: ~55%** — High strategic value but significant blind spots on existing code.

---

_Generated: March 14, 2026_
_Reviewer: Cascade (IDE AI with full codebase access)_

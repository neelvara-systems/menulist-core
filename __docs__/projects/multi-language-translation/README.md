# Multi-Language Translation — Documentation Hub

> **Feature:** AI-Powered Menu Translation  
> **Classification:** Foundational / Preparation Infrastructure  
> **Status:** Implemented source evidence; not current launch certification
> **Last Updated:** March 14, 2026  
> **Version:** 3.3
>
> **Launch Boundary:** This documentation hub records Multi-Language Translation source evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, target feature-flag/provider review, deploy evidence, browser/mobile QA for translated menu flows, public renderer fallback/RTL evidence, and production-host smoke.

### Feature Classification Note

This feature **prepares content** but does **not influence decisions**. It is:

- ✅ Exempt from authority-lock constraints
- ✅ Subject to architecture freeze
- ✅ Optimization-friendly (translation memory, caching allowed later)

---

## Quick Navigation

| Audience       | Document                                                                   | Purpose                            |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| **CEO / PM**   | [multi-language-translation_spec.md](./multi-language-translation_spec.md) | Business requirements, user flows  |
| **Developers** | [multi-language-translation_impl.md](./multi-language-translation_impl.md) | Technical blueprint, API contracts |
| **Developers** | [multi-language-translation_localization-contract.md](./multi-language-translation_localization-contract.md) | Localization ownership, field contract, fallback rules |

---

## What Is This Feature?

**One-liner:** AI-powered translation of menu content into 90+ languages using Gemini 2.5 Flash.

**Problem Solved:** Restaurant owners in tourist areas or multi-cultural cities need menus in multiple languages. Manual translation is expensive and slow.

**Solution:** One-click language addition with automatic translation of all menu items, categories, and descriptions. Immediate database persistence. Full RTL support.

---

## Architecture Overview (60-Second Summary)

```
┌──────────────────────────────────────────────────────────────┐
│                     TRANSLATION FLOWS                         │
├──────────────────────────────────────────────────────────────┤
│  FLOW 1: OCR + Languages (Upload)                             │
│  FLOW 2: Add Language (Editor) → translateFile() per file     │
│  FLOW 3: Re-translate File → translateFile()                  │
│  FLOW 4: Item Translation → translateItem()                   │
└──────────────────────────────────────────────────────────────┘

API: POST /api/translations
AI: Gemini 2.5 Flash
Languages: 90+ including 5 RTL
```

Provider-response parsing is bounded and fail-closed: fenced JSON and extractable object-fragment JSON can recover before the retry call, while unrecoverable parse failures log capped `translation_provider_response_parse_failed` diagnostics with fixed `retry_once_then_return_translation_failed` policy and no raw response/menu/translation text.

---

## Key Files in Codebase

| Purpose               | File Path                                                 |
| --------------------- | --------------------------------------------------------- |
| **API Route**         | `src/app/api/translations/route.ts`                       |
| **Translation Utils** | `src/components/.../projects/utils/translationsUtils.ts`  |
| **Language Modal**    | `src/components/.../editorView/LanguageSelectorModal.tsx` |
| **Editor Handler**    | `src/components/.../editorView/Editor.tsx`                |
| **Languages Data**    | `src/data/languages.ts` (90+ languages)                   |

---

## Feature Highlights

| Feature                 | Status |
| ----------------------- | ------ |
| 90+ Languages           | ✅     |
| 5 RTL Languages         | ✅     |
| Primary Language Lock   | ✅     |
| Progress Indicator      | ✅     |
| Cancel Mid-Translation  | ✅     |
| Pre-Translation Summary | ✅     |
| Translation Quality %   | ✅     |

---

## Version History

| Version | Date         | Changes                                                                                                 |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| 3.5     | Jul 5, 2026  | Added bounded provider-response parse diagnostics, fenced/object-fragment JSON recovery before retry, and raw prompt input/language payload exclusion from transaction input and local success/error logs |
| 3.4     | Jun 30, 2026 | Added request key/value caps plus sanitized prompt-only translation payload serialization                |
| 3.3     | Mar 14, 2026 | Prompt hardening (entity preservation, anti-injection), temperature 0.8→0.3, JSON retry, ChatGPT review |
| 3.2     | Feb 1, 2026  | Added feature classification, doctrine guardrails, fixed UI copy                                        |
| 3.1     | Jan 31, 2026 | Fixed typos, added deferred improvements, verification complete                                         |
| 3.0     | Jan 31, 2026 | Fresh documentation from codebase, 93 languages, improved UX                                            |
| 2.0     | Dec 2025     | Added quality scores, pre-translation summary, removal impact                                           |
| 1.0     | Nov 2025     | Initial release with 41 languages, primary lock, RTL support                                            |

---

## Related Features

| Feature                | Relationship                                 |
| ---------------------- | -------------------------------------------- |
| AI Data Extraction     | OCR extracts with translation                |
| Data Editor            | Where translations are edited                |
| Description Generation | Generates descriptions in multiple languages |
| B2C View               | Displays translated menus to customers       |

---

## Legacy Documentation

| File                             | Status                                             |
| -------------------------------- | -------------------------------------------------- |
| `_spec.md`                       | Superseded by `multi-language-translation_spec.md` |
| `_impl.md`                       | Superseded by `multi-language-translation_impl.md` |
| `assessments/ASSESSMENT-13-*.md` | Archived (reference only)                          |

---

_Generated from codebase: January 31, 2026_

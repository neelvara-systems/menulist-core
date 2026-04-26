# Multi-Language Translation — Documentation Hub

> **Feature:** AI-Powered Menu Translation  
> **Classification:** Foundational / Preparation Infrastructure  
> **Status:** ✅ COMPLETE (Production Ready)  
> **Last Updated:** March 14, 2026  
> **Version:** 3.3

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
| `Assessments/ASSESSMENT-13-*.md` | Archived (reference only)                          |

---

_Generated from codebase: January 31, 2026_

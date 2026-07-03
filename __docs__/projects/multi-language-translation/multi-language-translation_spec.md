# Multi-Language Translation — Product Specification

> **Feature:** AI-Powered Menu Translation  
> **Parent Feature:** Projects (Menu Digitization)  
> **Status:** Implemented source evidence; not current launch certification
> **Last Updated:** January 31, 2026  
> **Version:** 3.0

> **Launch boundary:** This spec documents multi-language translation. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, target feature-flag/provider review, deploy evidence, browser/mobile QA for translated menu flows, and public renderer fallback/RTL evidence.

---

## Executive Summary

Multi-Language Translation enables menus and related public business content to be localized into 90+ languages using Gemini 2.5 Flash plus inline localized field storage. The feature operates at four levels for structured menu content: OCR extraction with translation, file-level re-translation, global language addition, and single-item translation. It also supports localized rendering of project names, special-menu display names, and public business identity fields used across the menu page, OBP, and related public routes. Full RTL language support is included.

English (`en`) is the required canonical source language across both store-level business content and project/menu content. It is always present in language sets, is never removable, is used as the source for AI generation and translation flows, and is the first fallback when a requested localized value is missing.

Store-level discovery content follows an explicit SEO policy:

- localized: `tagline`, `metaTitle`, `metaDescription`
- localized string list: `keywords`

`keywords` are localized string lists and participate in missing-translation repair with the rest of store-level public business copy.

### What It Does

| Capability                | Description                               |
| ------------------------- | ----------------------------------------- |
| **OCR + Translation**     | Extract text AND translate during upload  |
| **File Re-Translation**   | Re-translate all items from one menu file |
| **Global Add Language**   | Add new language to entire menu at once   |
| **Item Translation**      | Translate single item on demand           |
| **Localized Public Identity** | Render project names and public business labels per language |
| **RTL Support**           | Arabic, Hebrew, Persian, Urdu, Sindhi     |
| **Primary Language Lock** | Source language protected from removal    |
| **Canonical Source**      | English (`en`) for all AI and fallback flows |
| **Default Operating Language** | Detected or configured local language for owner/public render |

### What It Does NOT Do

- ❌ Human translator review (AI only)
- ❌ Translation memory/caching (each translation is fresh)
- ❌ Real-time collaboration on translations
- ❌ Automatic quality scoring of translations
- ❌ Automatic translation of legal/technical identity fields like slugs or store IDs
- ❌ Arbitrary non-English source-language selection for AI generation or repair

---

## Goals & Success Metrics

| Goal                  | Success Metric                   | Status |
| --------------------- | -------------------------------- | ------ |
| Wide language support | 90+ languages including 5 RTL    | ✅     |
| Fast translation      | < 10 seconds per file            | ✅     |
| Automatic persistence | Translations saved immediately   | ✅     |
| Primary language lock | Original language protected      | ✅     |
| Easy management       | Add/remove languages in 2 clicks | ✅     |
| Progress visibility   | Show file-by-file progress       | ✅     |
| Cancel capability     | Stop mid-translation             | ✅     |

---

## Target Customers (ICP)

| Segment                      | Use Case                                 |
| ---------------------------- | ---------------------------------------- |
| **Tourist-Area Restaurants** | English + local language menus           |
| **Multi-Cultural Cities**    | 3-5 language menus for diverse customers |
| **Hotel Restaurants**        | International guest support              |
| **Chain Restaurants**        | Consistent translations across locations |
| **Food Delivery Platforms**  | Multi-language menu display              |

---

## User Stories

### Story 1: Multi-Language Restaurant

> "As a restaurant owner in a tourist area, I want my menu in English and Spanish so I can serve both customer bases."

**Acceptance Criteria:**

- Select languages during upload
- AI extracts AND translates automatically
- Both language versions editable
- Primary language marked and protected

### Story 2: Adding New Language

> "As an owner who wants to add French to my existing menu, I want to translate everything without re-uploading files."

**Acceptance Criteria:**

- Open Language Manager from editor
- Select French from 90+ options
- See pre-translation summary (item count, file count)
- Progress indicator shows "Translating file 1 of 3..."
- Translations saved immediately to database
- Can cancel mid-translation

### Story 3: Item-Level Translation

> "As a user editing a specific item, I want to regenerate its translation without affecting other items."

**Acceptance Criteria:**

- Click regenerate button on item in Edit Modal
- Only that item's translations update
- Other items remain unchanged

---

## User Flows

### Flow 1: OCR + Languages (Upload)

```
┌─────────────────────────────────────────────────────────────────┐
│ User uploads menu image                                          │
│ Selects: English (Primary), Spanish, Arabic                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI PROCESSING (Gemini 2.5 Flash)                                 │
│   • Extracts text from image (OCR)                              │
│   • Auto-detects primary language                               │
│   • Translates to all selected languages                        │
│   • Returns structured JSON with all translations               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESULT                                                           │
│   • Each category/item has name in all languages                │
│   • Primary language marked with isPrimary: true                │
│   • Editor shows language switcher chips                        │
│   • Data persisted to Firestore                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Global Add Language (Editor)

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Manage Languages" in Editor                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ LANGUAGE SELECTOR MODAL                                          │
│   • Shows current languages (Primary has lock icon)             │
│   • Quality percentage shown for each language                  │
│   • Available languages searchable dropdown (90+ options)       │
│   • User selects French to add                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PRE-TRANSLATION SUMMARY                                          │
│   • Shows file count, item count, category count                │
│   • User confirms with "Start Translation" button               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TRANSLATION PROGRESS                                             │
│   • Progress bar with percentage                                │
│   • "Translating file 1 of 3..."                                │
│   • Cancel button available                                     │
│   • For each file: translateFile() → /api/translations          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PERSISTENCE                                                      │
│   • updateProject() saves to Firestore immediately              │
│   • User sees French in language switcher                       │
│   • Success message: "Language added and translations saved!"   │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 3: File Re-Translation

```
┌─────────────────────────────────────────────────────────────────┐
│ User opens file preview (ZoomableImage)                          │
│ Clicks "Re-translate" button                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TRANSLATION                                                      │
│   • For each language (except primary):                         │
│     translateFile() → /api/translations                         │
│   • Progress shown with loader                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PERSISTENCE                                                      │
│   • updateProject() saves to Firestore                          │
│   • All items in file have fresh translations                   │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 4: Item Translation

```
┌─────────────────────────────────────────────────────────────────┐
│ User opens Edit Item Modal                                       │
│ Switches to non-primary language tab                            │
│ Clicks "Regenerate" AI button                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TRANSLATION                                                      │
│   • translateItem() → /api/translations                         │
│   • Only this item's name, description, attributes translated   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MODAL UPDATE                                                     │
│   • Item data updated in modal state                            │
│   • User must click "Save" to persist                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                            | Priority | Status |
| ----- | -------------------------------------- | -------- | ------ |
| FR-01 | OCR with multi-language extraction     | P0       | ✅     |
| FR-02 | Add language to existing menu          | P0       | ✅     |
| FR-03 | Primary language lock (non-removable)  | P0       | ✅     |
| FR-04 | Immediate database persistence         | P0       | ✅     |
| FR-05 | File-level re-translation              | P1       | ✅     |
| FR-06 | Item-level translation                 | P1       | ✅     |
| FR-07 | RTL language support (5 languages)     | P1       | ✅     |
| FR-08 | Language removal with impact preview   | P1       | ✅     |
| FR-09 | Progress indicator with file name      | P1       | ✅     |
| FR-10 | Cancel translation mid-process         | P1       | ✅     |
| FR-11 | Pre-translation summary                | P1       | ✅     |
| FR-12 | Translation quality percentage         | P2       | ✅     |
| FR-13 | Native language names (Français, 中文) | P2       | ✅     |

### Non-Functional Requirements

| ID     | Requirement               | Target       | Status |
| ------ | ------------------------- | ------------ | ------ |
| NFR-01 | Languages supported       | 90+          | ✅     |
| NFR-02 | Translation time per file | < 10 seconds | ✅     |
| NFR-03 | RTL direction support     | 5 languages  | ✅     |
| NFR-04 | Rate limiting             | 20 req/min   | ✅     |
| NFR-05 | API response format       | JSON         | ✅     |

---

## Supported Languages (90+)

### LTR Languages (85+)

**Global:** English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Turkish

**Indian (22):** Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Maithili, Sanskrit, Konkani, Nepali, Kashmiri, Dogri, Manipuri, Santali, Bodo

**Southeast Asian:** Thai, Vietnamese, Indonesian, Malay, Filipino, Khmer, Burmese, Lao

**European (30+):** Dutch, Polish, Swedish, Norwegian, Danish, Finnish, Greek, Czech, Hungarian, Romanian, Bulgarian, Ukrainian, Croatian, Serbian, Slovak, Slovenian, Estonian, Lithuanian, Latvian, Macedonian, Albanian, Bosnian, Catalan, Welsh, Irish, Icelandic, Maltese

**Middle Eastern & Central Asian:** Azerbaijani, Georgian, Armenian, Kazakh, Uzbek

**African:** Swahili, Amharic, Afrikaans, Zulu

### RTL Languages (5)

| Language | Code | Native Name |
| -------- | ---- | ----------- |
| Arabic   | ar   | العربية     |
| Hebrew   | he   | עברית       |
| Persian  | fa   | فارسی       |
| Urdu     | ur   | اردو        |
| Sindhi   | sd   | سنڌي        |

---

## Primary Language Behavior

| Aspect        | Behavior                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| **Detection** | First language in list is primary                                        |
| **Marking**   | `isPrimary: true` in language object                                     |
| **UI**        | Lock icon + "Primary" badge                                              |
| **Removal**   | Cannot be removed (button disabled)                                      |
| **Source**    | Used as source text for all translations                                 |
| **Tooltip**   | "Primary language cannot be removed. It is the source for translations." |

---

## Error Messages (Authority UX Copy)

| Scenario                | Message                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| Translation failed      | "Translation failed. Please try again."                                  |
| Rate limit              | "Too many requests. Please wait."                                        |
| No source text          | "No content to translate."                                               |
| Primary removal attempt | "Primary language cannot be removed. It is the source for translations." |
| At least one language   | "At least one language must remain selected"                             |
| Translation cancelled   | "Translation cancelled. Partial translations saved."                     |
| Success (add)           | "Language added and translations saved!"                                 |
| Success (remove)        | "Language removed successfully!"                                         |

---

## Multi-Chain Language Governance

When Multi-Store Consistency (Feature #4) is enabled, language management follows a **two-layer model** to ensure brand consistency while allowing regional flexibility.

### Schema Fields

| Level       | Field             | Type       | Purpose                                                 |
| ----------- | ----------------- | ---------- | ------------------------------------------------------- |
| **Store**   | `activeLanguages` | `string[]` | Languages available for this store's projects           |
| **Store**   | `defaultLanguage` | `string`   | Default rendering language (QR/PDF/Screen)              |
| **Project** | `languages`       | `string[]` | Languages with translations in this project (unchanged) |
| **Project** | `defaultLanguage` | `string`   | Default owner/public render language for this project   |

### Authority Model

| Aspect                  | Master Store                        | Outlet Store                               |
| ----------------------- | ----------------------------------- | ------------------------------------------ |
| **`activeLanguages`**   | Defines all languages for the chain | Subset of master's (what outlet enables)   |
| **`defaultLanguage`**   | Default for master store menus      | Can differ per outlet (regional default)   |
| **Add new language**    | ✅ Can add any language (up to MAX) | ✅ Can add from master's `activeLanguages` |
| **Create new language** | ✅ Yes (adds to `activeLanguages`)  | ❌ No (must exist in master first)         |

### Language Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ MASTER STORE                                                     │
│   activeLanguages: ["en", "hi", "fr", "ar", "gu"]               │
│   defaultLanguage: "en"                                          │
│                                                                  │
│   Master Project                                                 │
│   └── languages: ["en", "hi", "fr", "ar", "gu"]  (all translated)│
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ OUTLET: Gujarat             │   │ OUTLET: Dubai               │
│   activeLanguages: ["en","gu"]│  │   activeLanguages: ["en","ar"]│
│   defaultLanguage: "gu"     │   │   defaultLanguage: "ar"     │
│                             │   │                             │
│   Outlet Project            │   │   Outlet Project            │
│   └── languages: ["en","gu"]│   │   └── languages: ["en","ar"]│
└─────────────────────────────┘   └─────────────────────────────┘
```

### Project Screen Behavior

When user opens a project in an outlet:

1. **Language selector shows:** `store.activeLanguages` (subset available to this outlet)
2. **User can add language:** From master's `activeLanguages` only
3. **Translation runs:** Adds to `project.languages`
4. **New language creation:** Blocked at outlet level (must go to master)

### Rendering Rules (QR / PDF / Screen)

```
Priority 1: URL ?lang=xx parameter → use that language
Priority 2: project.defaultLanguage → use project default when available
Priority 3: store.defaultLanguage → use store's default
Priority 4: Fallback → "en" (English)
```

| Surface        | Default Language        |
| -------------- | ----------------------- |
| QR Menu        | `project.defaultLanguage ?? store.defaultLanguage` |
| PDF Export     | `project.defaultLanguage ?? store.defaultLanguage` |
| Digital Screen | `project.defaultLanguage ?? store.defaultLanguage` |
| URL Override   | `?lang=xx` wins always  |

Important distinction:

- `store.defaultLanguage` controls rendering preference
- `project.defaultLanguage` controls the default language for a specific menu when it differs from the broader store policy
- English (`en`) remains the canonical source language for AI generation, translation repair, and fallback
- if a requested/render language is missing for a localized business or project field, the system falls back to English before any other fallback

### URL Language Persistence

**Decision: No memory (Option A)**

- Each QR scan uses `store.defaultLanguage`
- No localStorage persistence
- No tracking of user language preference
- Matches doctrine: silence, no cleverness

### Multi-Menu Default Language

**Decision: Per-project default with store fallback**

- Each project can set `project.defaultLanguage`
- If absent, rendering falls back to `store.defaultLanguage`
- This preserves regional/operator intent from detected uploads while keeping one store-level policy layer

### Local-Only Items Translation

When outlet adds local-only items (L*I*\* prefix):

| Behavior             | Rule                               |
| -------------------- | ---------------------------------- |
| Can translate        | ✅ Yes                             |
| Into which languages | Only from `store.activeLanguages`  |
| Create new language  | ❌ No (must exist in master first) |

### Guardrails

| Guardrail                   | Value  | Purpose                       |
| --------------------------- | ------ | ----------------------------- |
| `MAX_LANGUAGES_PER_PROJECT` | 6      | Firestore doc size safety     |
| `DOC_SIZE_WARNING`          | 500 KB | Internal monitoring threshold |
| `DOC_SIZE_BLOCK`            | 900 KB | Block new languages           |

**Note:** `MAX_LANGUAGES_PER_PROJECT` is defined as a global constant. Can be adjusted via feature flag if needed.

### Forbidden Actions

| Action                                        | Why Forbidden            |
| --------------------------------------------- | ------------------------ |
| Outlet creates new language                   | Breaks brand consistency |
| Auto language detection                       | No ML/cleverness         |
| Per-outlet language variants (es-MX vs es-ES) | Complexity               |
| Language preference tracking                  | No user tracking         |

---

## Out of Scope

| Feature                            | Reason            | Alternative              |
| ---------------------------------- | ----------------- | ------------------------ |
| Human translation review           | Complexity        | AI with manual editing   |
| Translation memory/cache           | Phase 2           | Regenerate as needed     |
| Language variants (es-MX vs es-ES) | Complexity        | Base language codes only |
| Quality confidence scores          | Phase 2           | Manual review            |
| Batch translation across projects  | Complexity        | Per-project only         |
| Per-outlet language creation       | Brand consistency | Master-only              |
| Language preference memory         | No tracking       | Use defaultLanguage      |

---

## Related Documents

| Document                             | Purpose                                    |
| ------------------------------------ | ------------------------------------------ |
| `multi-language-translation_impl.md` | Technical implementation details           |
| `../description-generation/`         | Description generation (uses translations) |
| `../data-editor/`                    | Where translations are edited              |

---

_Document Status: Historical multi-language translation source evidence - not current launch certification_
_Generated from codebase: January 31, 2026_

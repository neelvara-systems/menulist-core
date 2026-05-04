# Multi-Language Translation — Localization Contract

> **Purpose:** Canonical contract for what is localized, where it lives, and how it must be rendered  
> **Status:** Active  
> **Last Updated:** April 27, 2026  
> **Authority Level:** Implementation Guardrail

---

## Why This Document Exists

MenuList now supports localization beyond category and item content. This document defines the long-term contract so future work does not reintroduce mixed patterns.

The governing rule is simple:

- **System UI copy** belongs in `next-intl`
- **Owner-authored customer-visible content** belongs on the entity as localized inline data
- **Operational / technical identity fields** remain plain strings

And one canonical language rule applies everywhere:

- **English (`en`) is the required canonical source language for localization, AI generation, and fallback**

---

## Canonical Data Model

### Localized Text Type

Use:

```ts
type LocalizedText = Record<string, string>;
```

Primary shared helper layer:

- `src/lib/localization/text.ts`

Core helper functions:

- `getLocalizedText()`
- `getPrimaryLocalizedLanguage()`
- `updateLocalizedText()`
- `toLocalizedText()`

Canonical language-policy helpers:

- `src/lib/localization/languagePolicy.ts`
- `CANONICAL_SOURCE_LANGUAGE = 'en'`
- `normalizeStoreLanguagePolicy()`
- `normalizeProjectLanguages()`

---

## Field Ownership Rules

### 1. System / Product UI Copy

These strings must live in locale message files and render through `next-intl`.

Examples:

- button labels
- empty states
- validation messages
- onboarding instructions
- dashboard shell text
- modal titles
- static OBP interface copy

These values do **not** belong in Firestore translation maps.

### 2. Owner-Authored Customer-Visible Content

These values must be stored inline on the entity as localized text maps.

Examples already covered by this contract:

- `Project.name`
- `Project.description`
- `ProjectSummaryData.name`
- `ProjectSummaryData.description`
- `ProjectSummaryData.specialMenuDisplayName`
- `SpecialMenuMetadata.displayName`
- `store.publicPresence.descriptor`
- `store.publicPresence.knownFor`
- `store.tagline`
- `store.metaTitle`
- `store.metaDescription`
- `store.pwaSettings.pwaShortName`

These values are customer-facing business content and must not be detached into a separate translation document unless a future workflow requires it.

### 3. Operational / Technical Identity Fields

These remain plain strings.

Examples:

- `store.name`
- `projectId`
- `storeId`
- `slug`
- `outletSlug`
- `customDomain`
- URLs
- phone numbers
- email addresses
- timestamps
- flags
- enums

`tenantName` is the brand identity. `store.name` is the store/location identity and remains the operational fallback.

---

## Current Schema Contract

### Project

Localized:

- `name`
- `description`

Language availability:

- `languages`
- `defaultLanguage`

Also localized in summary / special-menu metadata:

- `specialMenuDisplayName`

Reference files:

- `src/components/templates/main-app/projects/types/project.types.ts`
- `src/database/projects/index.ts`

### Store

Localized public-presence fields:

- `publicPresence.descriptor`
- `publicPresence.knownFor`

Localized business-copy fields:

- `tagline`
- `metaTitle`
- `metaDescription`
- `pwaSettings.pwaShortName`
- `keywords`

Language policy fields:

- `activeLanguages`
- `defaultLanguage`

Operational fallback remains:

- `tenantName`
- `name`

Reference file:

- `src/types/platform/store.ts`

---

## Rendering Contract

Every render path that shows owner-authored customer-facing text must use the shared fallback helpers.

Preferred pattern:

```ts
const text = getLocalizedText(value, activeLanguage, primaryLanguage, fallback);
```

Public routes should resolve the active render language through:

- `src/lib/localization/publicRenderLanguage.ts`
- `resolveStorePublicLanguage()` for store-level public surfaces such as OBP
- `resolveProjectPublicLanguage()` for menu/project surfaces
- `appendPublicLanguageParam()` when moving between public surfaces and preserving a selected `?lang=xx`

### Fallback Order

For localized content, rendering must follow this order:

1. requested language
2. English (`en`)
3. entity primary language
4. safe fallback string

For public business identity:

1. `tenantName` for brand-level OBP identity
2. `store.name` for store/location identity
3. hard fallback like `Menu` or `Restaurant` only when no store identity exists

For project identity:

1. `project.name[requestedLanguage]`
2. `project.name.en`
3. `project.name[project.defaultLanguage]`
4. `project.name[primaryLanguage]`
5. safe fallback such as `Untitled`

---

## Language Governance Contract

There are two language layers, and they are intentionally different.

### Store-Level Language Policy

Fields:

- `store.activeLanguages`
- `store.defaultLanguage`

Purpose:

- defines the language policy for that store or outlet
- defines the default public rendering language
- may be initialized from the detected menu language during onboarding or first extraction
- always includes `en` because English is the canonical source language
- governs store-level public surfaces such as OBP, SEO, Customer App identity, manifest, screenshots, and business copy
- constrains which languages projects are allowed to add

### Project-Level Content Availability

Fields:

- `project.languages`
- `project.defaultLanguage`

Purpose:

- defines which translations currently exist on that specific menu project
- governs which languages a menu project can actually render
- defines the default owner-facing and public render language for that project
- is the availability input to `resolveRenderLanguage(...)`

### Canonical Rule

- store-level business content targets `store.activeLanguages`
- project/menu content targets `project.languages`
- `project.languages` must remain a subset of `store.activeLanguages`

This is a layered model, not two competing sources of truth:

- store = language policy
- project = content availability
- default language = regional/operator-facing preference
- canonical source language = English (`en`) for AI stability and fallback

Example:

- Marathi upload:
  - extraction metadata keeps `mr` as detected primary language
  - `store.defaultLanguage = 'mr'`
  - `project.defaultLanguage = 'mr'`
  - `store.activeLanguages` and `project.languages` still include `en`
  - AI generation, translation repair, and fallback still anchor on `en`

### Business Copy Rule

Business Copy is store-authored, store-wide public identity content.

Therefore:

- the selected/default project may be used as semantic context for AI generation
- translation targets must come from `store.activeLanguages`
- the source language is fixed to English (`en`) even when render language differs
- generated SEO fields (`tagline`, `metaTitle`, `metaDescription`) are localized
- SEO `keywords` are localized string lists and count toward missing-translation coverage

The project helps the AI understand the menu.
It does not decide the language policy for store-level copy.

---

## Write Contract

### New / Updated Content

When owner-edited content is saved:

- string input from forms may be accepted
- persistence must normalize to localized inline storage
- persistence must preserve or backfill the `en` key so the canonical source is always present for fallback and AI flows

Shared helpers:

- `updateLocalizedText()`
- `toLocalizedText()`

### Auditability

Store-level business-copy automation persists lightweight metadata on the store document under `businessCopyMeta`.

Current audit fields:

- `lastGeneratedAt`
- `lastGeneratedSourceLanguage`
- `lastGeneratedTargetLanguages`
- `lastGeneratedProjectId`
- `lastGeneratedFieldKeys`
- `lastRepairedAt`
- `lastRepairedSourceLanguage`
- `lastRepairedTargetLanguages`
- `lastRepairedGapCount`
- `lastRepairedFieldKeys`
- `lastManualOverrideAt`
- `lastManualOverrideFieldKeys`

This is the current long-term audit contract for answering:

- when AI last generated store-level business copy
- when missing translations were last repaired after language changes
- when an owner last manually overrode store-level business-copy fields
- `toLocalizedText()`

### Migration Compatibility

During compatibility windows, some reads may still encounter `string | LocalizedText`.

That is acceptable for reads.

The long-term target remains:

- localized business content stored as `LocalizedText`
- no permanent dependence on `string | LocalizedText` for new canonical writes
- English (`en`) present on every canonical localized field

---

## Routes And Surfaces Covered

This contract now applies across:

- public menu pages
- OBP
- brand/outlet OBP
- manifest and customer-app metadata
- PWA shortcut routes
- public business API
- discovery/index builders
- project creation/edit/duplicate/special-menu flows
- mobile and desktop project selectors
- share flows
- communication templates
- owner dashboard selectors
- business settings public-presence editing
- mobile official-page editing
- SEO generation input that uses business/project identity
- shared store-switching and location selection surfaces

---

## What Is Intentionally Not Localized

The following are not auto-translated by default:

- legal business identity
- raw internal IDs
- slugs
- domains
- technical routing fields

The system may **display** localized public identity in internal tools, but it should not overwrite the operational canonical source fields automatically.

---

## Future Change Rules

Before introducing any new customer-visible owner-authored field, decide only one thing:

- Is this **system UI copy** or **business content**?

If it is system UI copy:

- put it in `next-intl`

If it is business content:

- store it inline as `LocalizedText`
- render it only through the shared localization helpers

Do **not** introduce:

- ad hoc detached translation objects
- screen-specific fallback logic
- direct raw rendering of `string | LocalizedText`

---

## Enforcement Checklist

For any future field or screen:

1. confirm whether the field is system copy or business content
2. use `LocalizedText` for customer-visible owner-authored content
3. use helper-based rendering, never raw object rendering
4. preserve `store.name` only as operational fallback, not public source of truth
5. preserve English as the canonical source key on every localized write
6. run `npx tsc --noEmit`
7. grep the affected area for direct `.name` / display-name rendering before closing

---

## Reference Implementation Files

- `src/lib/localization/text.ts`
- `src/types/platform/store.ts`
- `src/components/templates/main-app/projects/types/project.types.ts`
- `src/database/projects/index.ts`
- `src/components/templates/main-app/businessSettings/index.tsx`
- `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx`
- `src/components/mobile/screens/MobileOfficialPageScreen.tsx`
- `src/app/client/[[...slug]]/page.tsx`
- `src/app/client/obp/OBPContent.tsx`
- `src/app/client/obp/BrandOBPContent.tsx`
- `src/app/manifest.webmanifest/route.ts`

---

## Final Principle

MenuList should have one localization model, not many.

That model is:

- `next-intl` for product copy
- inline localized fields for business content
- English as required canonical source
- helper-based fallback resolution everywhere

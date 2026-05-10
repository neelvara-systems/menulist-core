# Client Menu Retrieval Foundation Spec

## Purpose

MenuList public menus must help customers find, verify, and decide quickly. This feature improves retrieval and trust without adding owner settings, AI chat, or stale offline menu caches.

## User Outcomes

- Customers can find items even when they mistype, use common phonetic spelling, or search across localized names, descriptions, categories, attributes, and item metadata.
- Exact visible item-name matches appear before broader partial, fuzzy, or metadata matches.
- Public schema represents the same current public menu truth that the customer can see.
- Weak-network users get stable pages and a clear offline screen instead of layout jumps or stale cached menus.

## Stored Data Reality

Public menu data is stored on project documents and rendered from `files[].extractedData.data`:

- `categories[]`: `id`, localized `name`, optional owner-selected `icon`, image and time-slot metadata.
- `items[]`: `id`, `category`, localized `name`, localized `description`, `price`, `images`, `tags`, `attributes[]`, availability, and decision facts.
- `attributes[]`: localized `name`, optional `price`, active/order fields.
- `decisionFacts`: owner-confirmed structured fields such as dietary tags, allergens, spice, duration, material, warranty, skill level, target audience, and nutrition.
- Project freshness fields: `menuVersion` and `lastPublishedAt`.
- SMB type/category truth comes from `src/data/shared/businessTypes.ts`. Search placeholders, domain aliases, filters, and schema fallback behavior must use the same `businessType` / `businessCategory` model.
- Public rendering must tolerate older/current store shapes where `businessType` may hold a generic plan value such as `B2C`; when that happens, use the real SMB type from `businessIndustry` if it matches the shared registry.

The public render path must continue using `sanitizeForClient()` before customer exposure.

## Requirements

### FR-1 Search Normalization

Public menu search must normalize case, punctuation, accents, spacing, repeated characters, and common phonetic variations.

Search behavior must stay business-category aware:

- food searches support practical menu spelling variants;
- service, health, professional, and specialty pages use service-oriented terms;
- retail pages use product/material/warranty terms;
- creative pages use offering/session/material terms.

### FR-2 Transliteration-Aware Matching

Search must support practical India-first retrieval:

- common Roman spelling variants such as `paneer`, `panir`, and `panner`;
- Devanagari/Marathi and Gujarati text matched through a lightweight transliteration fold where practical;
- exact script matching for localized item/category text.

### FR-3 Search Scope

Search must cover:

- item names in all available languages;
- item descriptions in available languages;
- category names;
- attribute names;
- tags;
- public decision facts and legacy metadata fields;
- prices only when public prices are enabled.

### FR-3A Exact Result Priority

When a customer search exactly matches the visible item name in the active language, that item must rank before prefix, partial, fuzzy, category, description, metadata, or price matches. Original menu order remains the tie-breaker.

### FR-4 No Extra Firebase Cost

Search must stay client-side and use the already-fetched public menu payload. No search API, Firestore query, or Cloud Function is introduced.

### FR-5 Structured Public Truth

JSON-LD must represent only current public truth:

- active public categories and active public items;
- visible item name/description fallback logic;
- visible price only when public prices are enabled;
- availability;
- item/category identifiers;
- `menuVersion`, `lastPublishedAt`, and `dateModified` derived from real project/store fields.
- business type schema must not mislabel non-food SMBs as restaurants.

No schema-only verification claims are allowed.

### FR-6 Low-Network Resilience

The public customer service worker must remain network-first and must not cache menu HTML, Firestore data, item images, or tenant menu content. Offline fallback must be explicit.

### FR-7 Multilingual Payload Governance

For 3+ language menus, the public payload may stay compact, but the resolved initial render language description must be preserved alongside the primary language even when no `?lang=` query is present. Search may use a compact generated search index to avoid shipping every raw description.

Customer language persistence must be scoped by the current store/project. Old global language preference keys must not override the current menu language, especially inside installed PWAs.

Search recall must remain explainable. Short query tokens may use exact or prefix matches, but substring and typo expansion must stay bounded so unrelated words do not appear to match. One-character customer input is not treated as an active filter because it creates noisy or false empty states. Two-character numeric queries may use prefix matching only against numeric tokens with text suffixes, so times and numeric item names such as `11am` remain findable from `11` without matching unrelated prices such as `115`. Phonetic skeleton tokens must stay specific enough to be trustworthy; ambiguous compressed forms such as three-letter consonant skeletons are not valid matches. Food aliases are deliberately directional and query-side where needed; `tea` can recover `chai`, but stored item text that mentions `tea` does not acquire `chai` as an indexed meaning. Food aliases must not leak into service, health, retail, or other SMB menus. Document indexing must not character-transliterate every Indic sentence because common Marathi/Hindi suffixes can fold into unrelated Roman words; only controlled word aliases should expand indexed document terms. Generated `_publicSearch.terms` are output-only and must not be re-read as source text while regenerating the index or while building the live client-side search document.

## Non-Goals

- No AI chat.
- No AI ranking black box.
- No owner-facing search settings.
- No aggressive offline-first menu cache.
- No fake `verified` or `officially verified` claims.
- No dependency upgrade or new search package.

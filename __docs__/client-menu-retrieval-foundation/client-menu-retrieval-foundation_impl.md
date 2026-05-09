# Client Menu Retrieval Foundation Implementation

## Current Entry Points

- Public menu SSR: `src/app/client/[[...slug]]/page.tsx`
- Customer menu UI: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- Public business type resolver: `src/lib/businessIdentity/publicBusinessType.ts`
- Item metadata helpers: `src/lib/menu/itemDecisionFacts.ts`
- Public sanitizer: `src/lib/mce/utils.ts`
- Customer service worker: `public/sw-customer.js`

## Implementation Plan

### 1. Search Utility

Add `src/lib/menu/publicMenuSearch.ts` with:

- text normalization;
- lightweight Indic transliteration fold;
- alias expansion for common menu/service/product/offering spellings, resolved through the shared `businessType` / `businessCategory` model in `src/data/shared/businessTypes.ts`;
- bounded Levenshtein typo tolerance;
- search document construction from item, category, attributes, tags, decision facts, and optional price;
- compact `_publicSearch.terms` generation for the public payload.

### 2. Public Menu Wiring

Update `menuPageNew.tsx` to:

- build category lookup once;
- cache per-item search documents for the visible menu payload;
- call the shared public search matcher instead of simple substring matching;
- keep filter chips after search;
- keep current category grouping and ordering;
- improve empty-state copy without noisy suggestions.

### 3. SSR Payload

Update `src/app/client/[[...slug]]/page.tsx` to:

- attach compact search terms after `sanitizeForClient()`;
- preserve the requested language description in `optimizeLanguagePayload()`;
- keep primary-language description for fallback.

### 4. Structured Data

Add `src/lib/menu/publicMenuStructuredData.ts` with freshness helpers.

Update JSON-LD generation to:

- use `project.lastPublishedAt` before store modified timestamps;
- include menu `identifier`, `dateModified`, and `additionalProperty` for `menuVersion`;
- include active public categories/items only;
- include item identifiers, item URLs, images when public images are enabled, price only when public prices are enabled, and public metadata as `PropertyValue`.
- keep `getMenuSchemaType()` aligned with `businessTypes.ts` so non-food SMB pages do not fall back to `Restaurant`.
- emit `Menu/MenuSection/MenuItem` only for food businesses and `OfferCatalog/Offer/Product|Service` for non-food SMBs.
- use `resolvePublicBusinessType()` before public schema/search rendering so generic stored plan values such as `B2C` do not hide the real SMB industry.

### 5. Low-Network Service Worker

Update `public/sw-customer.js` to:

- keep navigation network-first;
- add a bounded navigation timeout before branded `/offline` fallback;
- continue deleting any legacy non-offline caches;
- keep the frozen rule that stale menu content is never served.

## Feature Flag

Use `FEATURE_FLAGS.ENABLE_PUBLIC_MENU_RETRIEVAL_FOUNDATION`.

Default: `true`.

Disable behavior:

- public menu falls back to existing substring search and existing payload optimization;
- schema freshness hardening remains safe when possible, but search index attachment is disabled.

## Validation

- `npx tsc --noEmit --incremental false`
- `npm run build`
- public route smoke check on tenant host
- `git diff --check`

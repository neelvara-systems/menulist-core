# MenuList Resources Localization Plan

**Status:** Implemented - reviewed resource URLs live for every active website language
**Created:** June 1, 2026
**Scope:** MenuList main website resources content
**Owner:** Main website

---

## Decision

Do not duplicate the 12 long resource articles manually into every locale file.

Use a managed localization system for resource content:

1. Keep `en-US` as the source of truth.
2. Store long-form resource translations as structured locale packs, not as scattered JSON strings.
3. Publish only reviewed locale packs.
4. Add locale-addressable resource URLs before treating translated resources as SEO/AEO surfaces.
5. Keep every language under the same MenuList product boundary; do not reuse Answerlattice, Canonica, MyCodex, GrowthOS, or KitStamp content systems.

Current state:

- The website supports `en-US`, `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, and `es-ES` in the public language switcher.
- The broader owner app locale registry also supports `en-GB`, `gu-IN`, `kn-IN`, `ml-IN`, `pa-IN`, `ur-IN`, `or-IN`, `as-IN`, `ne-NP`, `mai-IN`, `kok-IN`, `sd-IN`, `ks-IN`, `doi-IN`, `mni-IN`, `sat-IN`, `brx-IN`, `fr-FR`, `pt-BR`, `de-DE`, `it-IT`, `ja-JP`, `zh-CN`, `id-ID`, `vi-VN`, `th-TH`, `ko-KR`, `tr-TR`, `ms-MY`, `nl-NL`, `pl-PL`, `uk-UA`, `cs-CZ`, `ro-RO`, `el-GR`, `hu-HU`, `sv-SE`, `da-DK`, `fi-FI`, `fil-PH`, `zh-TW`, `he-IL`, `fa-IR`, and `sw-KE`. These are app/UI locales with `en-US` fallback coverage, not reviewed public website resource locales.
- Resource content currently has full English content plus reviewed full resource packs for Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish for all 12 articles, including hub copy, metadata, descriptions, quick answers, CTAs, sections, checklists, comparison rows, FAQ, and schema-rendered article content.
- Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish now have stable locale-prefixed resource URLs under `/{locale}/resources` and `/{locale}/resources/[slug]`.
- Reviewed resource URLs are exposed in sitemap, `hreflang`, `llms.txt`, and `llms-full.txt` only after passing `npm run verify:website-resource-locales`.

---

## Language Priority

### P0 - Publish First

| Locale | Reason | Scope | Status |
| --- | --- | --- | --- |
| `hi-IN` | Highest immediate utility for Indian SMB owners and already partially implemented. | Full 12 articles, hub, metadata, FAQ, schema, CTAs | Shipped |

### P1 - Indian Language Expansion

| Locale | Reason | Scope | Status |
| --- | --- | --- | --- |
| `ta-IN` | Existing app + website language; strong restaurant-market relevance. | Full 12 articles, hub, metadata, FAQ, schema, CTAs | Shipped |
| `te-IN` | Existing app + website language; strong regional SMB relevance. | Full 12 articles, hub, metadata, FAQ, schema, CTAs | Shipped |
| `mr-IN` | Existing app + website language; strong western India relevance. | Full 12 articles, hub, metadata, FAQ, schema, CTAs | Shipped |
| `bn-IN` | Existing app + website language; strong eastern India relevance. | Full 12 articles, hub, metadata, FAQ, schema, CTAs | Shipped |

### P2 - Add Only After Locale Support Decision

| Locale | Decision Needed |
| --- | --- |
| `gu-IN` | Owner app locale support is active. Public website/resource support remains pending until a full reviewed resource pack is created and verified. |
| `kn-IN`, `ml-IN`, `pa-IN`, `ur-IN` | Owner app locale support is active with `en-US` fallback for untranslated UI keys. Public website/resource support remains pending until full reviewed resource packs are created and verified. |
| `or-IN`, `as-IN`, `ne-NP`, `mai-IN`, `kok-IN` | Owner app locale support is active with compact dashboard/mobile runtime coverage and `en-US` fallback for untranslated UI keys. Public website/resource support remains pending until full reviewed resource packs are created and verified. |
| `sd-IN`, `doi-IN`, `mni-IN`, `sat-IN` | Owner app locale support is active with compact dashboard/mobile runtime coverage and `en-US` fallback for untranslated UI keys. Public website/resource support remains pending until full reviewed resource packs are created and verified. |
| `ks-IN`, `brx-IN` | Owner app locale support is active as fallback-safe runtime coverage. Native copy remains pending because no reliable machine-translation source was used for Kashmiri or Bodo in this pass. Public website/resource support remains pending until full reviewed resource packs are created and verified. |
| `fr-FR`, `pt-BR`, `de-DE`, `it-IT`, `ja-JP`, `zh-CN`, `id-ID`, `vi-VN`, `th-TH`, `ko-KR`, `tr-TR`, `ms-MY` | International owner app locale support is active with compact dashboard/mobile runtime coverage and `en-US` fallback for untranslated UI keys. Public website/resource support remains pending until full reviewed resource packs are created and verified. |
| `nl-NL`, `pl-PL`, `uk-UA`, `cs-CZ`, `ro-RO`, `el-GR`, `hu-HU`, `sv-SE`, `da-DK`, `fi-FI`, `fil-PH`, `zh-TW`, `he-IL`, `fa-IR`, `sw-KE` | Final practical global owner app locale support is active with compact dashboard/mobile runtime coverage and `en-US` fallback for untranslated UI keys. Public website/resource support remains pending until full reviewed resource packs are created and verified. |

### Active Non-Indian Website Languages

| Locale | Reason | Scope | Status |
| --- | --- | --- | --- |
| `ar-SA` | Existing public website language and RTL locale. | Full 12 articles, hub, metadata, FAQ, schema, CTAs | Shipped |
| `es-ES` | Existing public website language. | Full 12 articles, hub, metadata, FAQ, schema, CTAs | Shipped |

---

## SEO/AEO Rule

Translated resources should not be treated as SEO/AEO-ready until they have stable language URLs.

Google's multilingual guidance expects different URLs for equivalent localized pages and recommends using `hreflang` alternates to identify language/region variants. The current cookie/header language selection can help users, but it is not enough as the only discovery system.

Source references:

- Google Search Central: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- next-intl routing docs: https://next-intl.dev/docs/routing

Recommended public URL model:

```text
/resources
/resources/menu-source-audit
/hi-IN/resources
/hi-IN/resources/menu-source-audit
/ta-IN/resources
/ta-IN/resources/menu-source-audit
...
```

Rules:

- Keep English article slugs for v1. Do not translate slugs yet.
- English canonical remains the non-prefixed URL.
- Locale pages use their own locale-prefixed canonical URL.
- Add `hreflang` alternates for every reviewed locale.
- Add only reviewed locale URLs to sitemap and LLM context files.
- Use `x-default` pointing to the English resource URL.
- Do not auto-redirect crawlers from English URLs based on `Accept-Language`.

---

## Content Architecture

Current files:

```text
src/content/websiteResources/en-US.ts
src/content/websiteResources/hi-IN.ts
src/content/websiteResources/ta-IN.ts
src/content/websiteResources/te-IN.ts
src/content/websiteResources/mr-IN.ts
src/content/websiteResources/bn-IN.ts
src/content/websiteResources/ar-SA.ts
src/content/websiteResources/es-ES.ts
src/content/websiteResources/index.ts
src/content/websiteResources/types.ts
```

Implemented structure before adding more languages:

```text
src/content/websiteResources/
├── en-US.ts                         # Canonical source content
├── buildLocalizedResources.ts       # Applies locale packs to en-US safely
├── glossary.ts                      # Protected terms and forbidden claims
├── index.ts                         # Locale resolver and discovery exports
├── routing.ts                       # Reviewed locale URL and alternate helpers
├── sourceVersion.ts                 # Resource source-version contract
├── locales/
│   ├── hi-IN.ts                     # Full reviewed Hindi pack
│   ├── ta-IN.ts                     # Full reviewed Tamil pack
│   ├── te-IN.ts                     # Full reviewed Telugu pack
│   ├── mr-IN.ts                     # Full reviewed Marathi pack
│   ├── bn-IN.ts                     # Full reviewed Bengali pack
│   ├── ar-SA.ts                     # Full reviewed Arabic pack
│   ├── es-ES.ts                     # Full reviewed Spanish pack
│   └── index.ts                     # Reviewed packs and planned locale exclusions
└── types.ts
```

Locale packs should override content by slug and stable section ID:

```ts
export const hiINResourceTranslations = {
  locale: 'hi-IN',
  status: 'reviewed',
  sourceVersion: '2026-06-01.resources.v1',
  articles: {
    'menu-source-audit': {
      title: '...',
      metaTitle: '...',
      metaDescription: '...',
      quickAnswer: '...',
      sections: {
        'why-old-menus-remain': {
          title: '...',
          body: ['...'],
        },
      },
      faq: {
        'how-often-should-a-business-run-this-audit': {
          question: '...',
          answer: '...',
        },
      },
    },
  },
};
```

Do not translate section IDs or slugs in v1. IDs stay stable so internal links, schema, and validation can compare source and translation coverage.

---

## Translation Governance

### Protected Terms

Keep these as-is unless there is a strong reason:

- `MenuList`
- `QR`
- `Google`
- `WhatsApp`
- `Instagram`
- `PDF`
- `SEO`
- `AI`
- URL paths and slugs

### Preferred Style

- Use natural owner language, not formal government-style translation.
- Use native script, but allow familiar business terms where owners naturally use them.
- Keep sentences shorter than English where possible.
- Preserve caveats around Google, search, AI, ranking, citations, and external platforms.
- Avoid hype and forbidden public copy in every language.

Forbidden meanings in all languages:

- generic AI restaurant software
- smart menu engine
- guaranteed Google ranking
- guaranteed AI citation
- rank in ChatGPT
- dominate search
- automatic Google/Instagram/WhatsApp sync
- fully automated menu engineering

### Claim Caveat To Preserve

Every discovery-oriented language pack must preserve this meaning:

```text
MenuList prepares a clearer public source. Search engines, directories, AI assistants, and crawlers decide what they crawl, cite, show, or summarize.
```

---

## Workflow

### Step 1 - Build Translation Infrastructure

- Status: done.
- Added locale-pack types.
- Added a localization builder that applies reviewed locale packs over `en-US`.
- Added completeness validation:
  - every English article has a translation entry,
  - every translated article has title, meta title, meta description, quick answer, CTA, sections, FAQ where source has FAQ,
  - every source section ID exists in translation,
  - no translated content uses forbidden claims,
  - no reviewed locale falls back to English body text.
- Non-reviewed locales remain out of sitemap/hreflang.

### Step 2 - Hindi Full Content

- Status: done.
- Translated all 12 articles into `hi-IN`.
- Added FAQ IDs to the English source so translated FAQs map by stable ID instead of order.
- Verified the Hindi pack with `npm run verify:website-resource-locales`.
- `hi-IN` route rendering works through reviewed locale-prefixed URLs.

### Step 3 - Locale URL Layer

- Status: done for Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish.
- Added locale-prefixed resource routes:
  - `/{locale}/resources`
  - `/{locale}/resources/[slug]`
- Reused the same components and resource registry through `ResourcePageShell`.
- Added localized metadata and JSON-LD `inLanguage`.
- Added `alternates.languages` metadata and sitemap alternates for reviewed locales.
- Added reviewed Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish URLs to `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`.
- Kept English non-prefixed routes unchanged.

### Step 4 - P1 Indian Languages

Status: done.

Translated, source-versioned, registered, and verified in this order:

1. `ta-IN`
2. `te-IN`
3. `mr-IN`
4. `bn-IN`

Each language shipped only after complete resource-pack coverage and route/discovery verification passed. Do not publish future languages as SEO surfaces until they pass the same complete-pack verifier.

### Step 5 - Active Website Language Completion

Status: done.

Arabic and Spanish were added after the Indian-language rollout so every active non-default public website-switcher language has complete long-form resource content.

1. `ar-SA`
2. `es-ES`

The verifier now asserts that reviewed resource translation packs cover every active non-default website language from `src/config/websiteLanguages.ts`.

### Step 6 - Maintenance

When English resource content changes:

- bump `sourceVersion`,
- mark affected translations as `needs_review`,
- remove stale locale URLs from sitemap/hreflang until reviewed,
- rerun the locale verifier,
- update this doc or the validation log with the affected slugs.

---

## Verification Commands

Recommended checks after localization implementation:

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
npx tsc --noEmit --incremental false
npm run lint
```

New verifier should check:

- locale pack completeness,
- reviewed status,
- source version alignment,
- active public website language coverage,
- forbidden claim scans,
- sitemap/hreflang coverage for reviewed locales only,
- no locale URL for incomplete translations,
- no accidental Answerlattice/Canonica/GrowthOS/KitStamp route inclusion.

---

## Non-Scope

- No CMS dependency in this pass.
- No unverified machine-translation publishing. Generated packs must preserve protected terms, pass source-version/completeness/forbidden-claim checks, and stay eligible for native-market copy polish when feedback is available.
- No locale expansion outside supported app languages without a separate locale-support decision.
- Owner-app locale support is not the same as public website/resource support. A language may appear in app settings while remaining absent from `src/config/websiteLanguages.ts`, resource route static params, sitemap alternates, and LLM discovery files until long-form resources pass review.
- No translation work inside owner dashboard, customer menu runtime, billing, auth, Firebase, Cloud Functions, Answerlattice, Canonica, MyCodex, GrowthOS, or KitStamp.
- No translated slugs in v1.

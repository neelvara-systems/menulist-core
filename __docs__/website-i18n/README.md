# Website Internationalization (i18n)

**Status:** Implemented  
**Feature Flag:** None (always active, deepMerge fallback ensures safety)  
**Last Updated:** July 18, 2026

## Overview

Multi-language support for the MenuList marketing website (`menulist.ai`). Leverages the existing `next-intl` infrastructure — no new packages or architectural changes.

## Supported Languages (8)

| Locale | Language | Coverage | Priority |
|--------|----------|----------|----------|
| en-US | English | Complete global website source + resource routes | Default |
| hi-IN | Hindi | Complete maintained global website copy + reviewed resource routes | Primary market |
| ar-SA | Arabic (RTL) | English fallback for global pages + reviewed resource routes | Middle East |
| es-ES | Spanish | English fallback for global pages + reviewed resource routes | Global |
| ta-IN | Tamil | English fallback for global pages + reviewed resource routes | South India |
| te-IN | Telugu | English fallback for global pages + reviewed resource routes | South India |
| mr-IN | Marathi | English fallback for global pages + reviewed resource routes | West India |
| bn-IN | Bengali | English fallback for global pages + reviewed resource routes | East India |

en-GB excluded from website switcher (negligible difference for marketing copy).

## Architecture

### How It Works

1. **Auto-detection**: Browser `Accept-Language` header → `Negotiator` → `matchLocale()` (existing in `src/i18n/request.ts`)
2. **Manual selection**: Language switcher in website header → `setUserLocale()` server action → cookie `e-locale`
3. **Persistence**: Cookie `e-locale` takes precedence over browser detection on subsequent visits
4. **Global-page fallback**: `deepMerge(en-US, locale)` — missing keys show English instead of a broken UI
5. **Reviewed resource routes**: English uses `/resources`; reviewed non-English articles use `/{locale}/resources` and preserve the `/ml` product alias when present
6. **Document language/direction**: the shared internationalization wrapper updates root `lang` and `dir` after locale resolution; reviewed resource pages also render a locale-scoped content boundary

### Key Files

| File | Purpose |
|------|---------|
| `src/config/websiteLanguages.ts` | Website language configuration (SSOT) |
| `src/components/website/shared/WebsiteLanguageSwitcher.tsx` | Language switcher dropdown |
| `src/content/websiteResources/routing.ts` | Reviewed resource locale routes and alternates |
| `src/providers/IntlClientWrapper.tsx` | Root document language/direction synchronization |
| `public/locales/menulist.ai/{locale}.json` → `Website` namespace | All website translation keys |
| `src/i18n/request.ts` | Locale resolution + deepMerge (unchanged) |
| `src/lib/localization/index.ts` | `setUserLocale()` server action (unchanged) |

### Translation Key Structure

Single `Website` namespace with section-based keys:

```
Website.Header.*       — Navigation, CTA, login
Website.Footer.*       — Links, brand, copyright
Website.Hero.*         — Hero section
Website.Problem.*      — Problem tiles
Website.Solution.*     — Solution bullets
Website.Prepared.*     — Capabilities cards
Website.SmartFeatures.* — Correctness section
Website.Surfaces.*     — Surface cards
Website.Stats.*        — Statistics
Website.Business.*     — Business points
Website.Industry.*     — Industry grid
Website.Workflow.*     — How it works steps
Website.Faq.*          — FAQ questions/answers
Website.FinalCta.*     — Final CTA
```

### Component Pattern

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function MySection() {
    const t = useTranslations('Website');
    return <h2>{t('MySection.title')}</h2>;
}
```

## Adding Translations for New Languages

1. Open `public/locales/menulist.ai/{locale}.json`
2. Add/update keys under `"Website": { ... }`
3. Keys missing from the locale file automatically show English (deepMerge)
4. For a reviewed resource translation, also add the localized article data used by `src/content/websiteResources/`
5. Run `npm run verify:website-resource-locales`

## Adding New Website Pages

1. Extract all hardcoded strings into `Website` namespace keys in en-US.json
2. Add corresponding keys to hi-IN.json
3. Use `useTranslations('Website')` in the component
4. Other global-page locales get English fallback automatically
5. If the page is part of the reviewed resource system, add the localized route/data and language alternates

## Legal Pages

Privacy Policy, Terms of Service, and Refund Policy remain English-only for legal accuracy. These are NOT translated.

## SEO Considerations

- Global marketing routes remain single-path and use the selected locale cookie with English metadata defaults.
- Reviewed resource locales have URL-based routes and `hreflang`/`x-default` alternates from `buildWebsiteResourceLanguageAlternates()`.
- The platform sitemap and resource metadata must use that same alternate map.
- Homepage `WebSite.inLanguage` lists configured website languages; page-specific structured data remains bounded to the language implemented by that page.
- Do not add locale-prefixed global routes until the routing, canonical, sitemap, alias, and switcher contracts are implemented together.

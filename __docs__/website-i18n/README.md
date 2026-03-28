# Website Internationalization (i18n)

**Status:** Implemented  
**Feature Flag:** None (always active, deepMerge fallback ensures safety)  
**Last Updated:** March 11, 2026

## Overview

Multi-language support for the MenuList marketing website (`menulist.ai`). Leverages the existing `next-intl` infrastructure — no new packages or architectural changes.

## Supported Languages (8)

| Locale | Language | Coverage | Priority |
|--------|----------|----------|----------|
| en-US | English | Complete (source) | Default |
| hi-IN | Hindi | Complete | Primary market |
| ar-SA | Arabic (RTL) | Fallback to en-US | Middle East |
| es-ES | Spanish | Fallback to en-US | Global |
| ta-IN | Tamil | Fallback to en-US | South India |
| te-IN | Telugu | Fallback to en-US | South India |
| mr-IN | Marathi | Fallback to en-US | West India |
| bn-IN | Bengali | Fallback to en-US | East India |

en-GB excluded from website switcher (negligible difference for marketing copy).

## Architecture

### How It Works

1. **Auto-detection**: Browser `Accept-Language` header → `Negotiator` → `matchLocale()` (existing in `src/i18n/request.ts`)
2. **Manual selection**: Language switcher in website header → `setUserLocale()` server action → cookie `e-locale`
3. **Persistence**: Cookie `e-locale` takes precedence over browser detection on subsequent visits
4. **Fallback**: `deepMerge(en-US, locale)` — missing keys show English (no broken UI)

### Key Files

| File | Purpose |
|------|---------|
| `src/config/websiteLanguages.ts` | Website language configuration (SSOT) |
| `src/components/website/shared/WebsiteLanguageSwitcher.tsx` | Language switcher dropdown |
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
4. No code changes needed — just JSON

## Adding New Website Pages

1. Extract all hardcoded strings into `Website` namespace keys in en-US.json
2. Add corresponding keys to hi-IN.json
3. Use `useTranslations('Website')` in the component
4. Other locales get English fallback automatically

## Legal Pages

Privacy Policy, Terms of Service, and Refund Policy remain English-only for legal accuracy. These are NOT translated.

## SEO Considerations

- `hreflang` tags NOT added yet (single-domain, no URL-based locale routing)
- Schema.org markup stays English (structured data)
- Meta tags in layout.tsx stay English (OG/Twitter cards)
- Future: Add `hreflang` when URL-based routing is implemented

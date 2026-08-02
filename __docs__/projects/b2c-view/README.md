# B2C View (Customer Menu)

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** July 16, 2026

**Launch boundary:** This hub links B2C/customer-menu source docs; it is not current launch certification. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

---

## Overview

The customer-facing digital menu that restaurant patrons see. Includes a controlled menu design editor for owners to choose moods, compatible layouts, branding accents, display settings, and visual preset previews with responsive design and SEO optimization.

---

## Documentation

| Document        | Audience          | Purpose                                |
| --------------- | ----------------- | -------------------------------------- |
| `b2c-view_spec.md` | Product, Business | Requirements, constrained design controls, SEO |
| `b2c-view_impl.md` | Developers | Architecture, performance, memoization |
| `b2c-view_mobile-support.md` | Product, Mobile | Mobile customer-menu and owner design parity |
| `b2c-view_marketing.md` | Sales, Marketing | Pitch, copy, objection handling |

---

## Quick Reference

### URL Patterns

- Subdomain: `{store}.menulist.online/{slug}`
- Custom Domain: `custom-domain.com/{slug}`

### Performance Acceptance Targets

These are release targets, not current measured results. They require target browser/device evidence before use in launch or marketing claims.

| Metric                   | Target |
| ------------------------ | ------ |
| First Contentful Paint   | < 1.8s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive      | < 3.9s |

### Owner-Selectable Layout Options

- List (text-first customer scan)
- Grid (image-supported scan with capped image density)
- Card (image-top item cards)

Category tabs are a separate navigation toggle for mobile/tablet customer browsing. Legacy saved `tabs` layout values are normalized into a compatible layout while preserving the category-tabs display intent.

| Mood | Compatible layouts |
| --- | --- |
| Clean | List, Grid |
| Warm | List, Card, Grid |
| Premium | List, Card |
| Bold | Card, Grid |
| Fast | List |

When price display is enabled, active option prices are visible in the item list before interaction. Invalid/inactive options are excluded, and large menus keep all current items addressable for search, category navigation, and direct item links.

### Key Files

```text
src/app/client/[[...slug]]/page.tsx
src/components/templates/main-app/projects/b2cView/index.tsx
src/components/templates/main-app/projects/b2cView/designSystem/index.ts
src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx
src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx
src/components/shared/menuDesign/MenuStylePresetPreview.tsx
src/components/mobile/screens/MobileDesignEditorScreen.tsx
src/lib/menu/menuDesignPresets.ts
src/lib/menu/publicMenuBackground.ts
src/lib/pricing/publicItemPricePresentation.ts
src/database/projects/index.ts
```

---

## SEO Features

- `generateMetadata()` for dynamic SEO
- Schema.org JSON-LD (Restaurant/Menu/MenuItem)
- OpenGraph and Twitter cards
- Semantic HTML

---

## Source Gate

`npm run verify:menu-design-presentation-boundary` checks the exact mood/layout matrix, malformed/prototype config normalization, desktop and mobile design controls, visual preset preview parity, public background admission, upfront active option prices, stable large-menu addressability, public image/category-tabs behavior, the project publish/truth/cache path, and this doc boundary. Passing this source gate is not current launch certification; release approval still needs the External Certification Runbook, Digital Menu Output Constitution checks, browser/mobile customer-menu QA, public cache/deploy evidence, and target production smoke.

---

## Legacy Documentation

| Legacy File                             | Status         |
| --------------------------------------- | -------------- |
| `assessments/assessment-11-b2c-view.md` | → Consolidated |
| `__docs__/client-menu/`                 | → Referenced   |

---

## Related Features

| Feature             | Relationship                 |
| ------------------- | ---------------------------- |
| Data Editor         | Where menu content is edited |
| Multi-Language      | Displays translated content  |
| AI Image Generation | Provides item images         |

---

_Last Updated: July 16, 2026_

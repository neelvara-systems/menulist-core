# B2C View (Customer Menu)

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready

---

## Overview

The customer-facing digital menu that restaurant patrons see. Includes a controlled menu design editor for owners to choose moods, compatible layouts, branding accents, and display settings with responsive design and SEO optimization.

---

## Documentation

| Document        | Audience          | Purpose                                |
| --------------- | ----------------- | -------------------------------------- |
| `_spec.md`      | Product, Business | Requirements, customization, SEO       |
| `_impl.md`      | Developers        | Architecture, performance, memoization |
| `_marketing.md` | Sales, Marketing  | Pitch, copy, objection handling        |

---

## Quick Reference

### URL Patterns

- Subdomain: `{store}.menulist.ai/{slug}`
- Custom Domain: `custom-domain.com/{slug}`

### Performance Targets

| Metric                   | Target |
| ------------------------ | ------ |
| First Contentful Paint   | < 1.8s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive      | < 3.9s |

### Layout Options

- Grid (card-based)
- List (vertical)
- Card (image-top item cards)
- Tabs (sticky category navigation)

### Key Files

```
src/app/(website)/menu/[projectId]/page.tsx
src/components/templates/main-app/projects/b2cView/
├── index.tsx
├── homePage/
├── menuPage/menuPageNew.tsx  # Core public menu renderer
├── layouts/
└── shareModal/
```

---

## SEO Features

- `generateMetadata()` for dynamic SEO
- Schema.org JSON-LD (Restaurant/Menu/MenuItem)
- OpenGraph and Twitter cards
- Semantic HTML

---

## Legacy Documentation

| Legacy File                             | Status         |
| --------------------------------------- | -------------- |
| `Assessments/ASSESSMENT-11-B2C-VIEW.md` | → Consolidated |
| `__docs__/client-menu/`                 | → Referenced   |

---

## Related Features

| Feature             | Relationship                 |
| ------------------- | ---------------------------- |
| Data Editor         | Where menu content is edited |
| Multi-Language      | Displays translated content  |
| AI Image Generation | Provides item images         |

---

_Last Updated: January 2026_

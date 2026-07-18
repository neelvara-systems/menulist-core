# B2C View — Product Specification

**Feature:** Customer-Facing Digital Menu
**Parent Feature:** Projects (Menu Digitization)
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** July 8, 2026

**Launch boundary:** This archived spec documents the earlier customer-facing menu view; it is not current launch certification. Current release approval requires the active [production-readiness audit](../../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

---

## Executive Summary

B2C View is the customer-facing digital menu that restaurant patrons see. It includes a controlled menu design editor for owners to choose moods, compatible layouts, branding accents, display settings, and visual preset previews, with real-time preview and responsive design.

### What It Does

- **Visual Menu Display** → Clear, responsive menu for customers
- **Menu Design Controls** → Controlled moods, compatible layouts, visual preset previews, optional brand accent, display settings
- **Menu Layouts** → List, grid, and card layouts with controlled category tabs
- **Device Preview** → Mobile, tablet, desktop frames
- **Share & Embed** → URL sharing, QR codes
- **SEO Optimization** → Dynamic metadata, Schema.org markup

### What It Does NOT Do

- ❌ Does not process orders (display only)
- ❌ Does not integrate with POS systems
- ❌ Does not require customer login

---

## Goals

| Goal             | Success Metric                |
| ---------------- | ----------------------------- |
| **Fast loading** | FCP < 1.8s, LCP < 2.5s        |
| **Mobile-first** | 70%+ mobile users served well |
| **Accessible**   | WCAG AA compliance            |
| **Shareable**    | One-click sharing, QR codes   |
| **SEO-ready**    | Schema.org, OpenGraph         |

---

## User Stories

### Restaurant Customer

> "As a customer, I want to browse the menu on my phone easily and see item details."

**Acceptance Criteria:**

- Fast loading on mobile
- Clear category navigation
- Item images and descriptions visible
- Price clearly displayed
- Easy search/filter

### Restaurant Owner

> "As an owner, I want to customize my digital menu to match my brand."

**Acceptance Criteria:**

- Choose a controlled mood and compatible layout
- Choose a recommended style from preview cards that show the expected customer-menu shape
- Optionally apply a brand accent color
- Upload logo
- Select a compatible layout style
- Preview on different devices
- Share via link or QR code

---

## User Flow (Customer)

```
┌─────────────────────────────────────────────────────────────────┐
│ Customer opens menu link (or scans QR code)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MENU HOMEPAGE                                                    │
│   • Restaurant branding (logo, colors)                          │
│   • Category navigation                                         │
│   • Featured items (if configured)                              │
│   • Search bar                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CATEGORY/ITEM BROWSING                                           │
│   • Grid or list layout                                         │
│   • Item cards with image, name, price                          │
│   • Click for item details                                      │
│   • Filter by category, search                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ITEM DETAIL (Modal or Page)                                      │
│   • Full image                                                  │
│   • Description                                                 │
│   • Price and variants                                          │
│   • Attributes (size, options)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                    | Priority | Status |
| ----- | ------------------------------ | -------- | ------ |
| FR-01 | Display menu items with images | P0       | ✅     |
| FR-02 | Category navigation            | P0       | ✅     |
| FR-03 | Theme customization            | P0       | ✅     |
| FR-04 | Mobile responsiveness          | P0       | ✅     |
| FR-05 | Real-time preview              | P1       | ✅     |
| FR-06 | Search/filter items            | P1       | ✅     |
| FR-07 | Share via link                 | P1       | ✅     |
| FR-08 | QR code generation             | P1       | ✅     |
| FR-09 | SEO metadata                   | P1       | ✅     |
| FR-10 | Dark/light mode                | P2       | ✅     |
| FR-11 | Multiple layout templates      | P2       | ✅     |

### Non-Functional Requirements

| ID     | Requirement              | Target | Status |
| ------ | ------------------------ | ------ | ------ |
| NFR-01 | First Contentful Paint   | < 1.8s | ✅     |
| NFR-02 | Largest Contentful Paint | < 2.5s | ✅     |
| NFR-03 | Time to Interactive      | < 3.9s | ✅     |
| NFR-04 | Cumulative Layout Shift  | < 0.1  | ✅     |
| NFR-05 | Mobile viewport support  | 320px+ | ✅     |

---

## Menu Design Controls

### Available Options

| Option               | Values                      |
| -------------------- | --------------------------- |
| **Menu Mood**        | Clean, Warm, Premium, Bold, Fast |
| **Layout**           | List, Card, Grid, filtered by mood compatibility |
| **Brand Accent**     | Preset colors or custom color |
| **Item Prices**      | Show or hide menu-level price display |
| **Item Images**      | Show or hide item images |
| **Category Icons**   | Show or hide category icons |
| **Category Tabs**    | Sticky category navigation on mobile/tablet |
| **Logo**             | Upload custom logo          |
| **Menu Background**  | Desktop advanced setting    |

### Layout Templates

| Template            | Description                | Best For                 |
| ------------------- | -------------------------- | ------------------------ |
| **Grid**            | Card-based grid layout     | Visual menus with images |
| **List**            | Stacked item list with details | Text-heavy menus      |
| **Card**            | Image-top item cards       | Visual, medium-sized menus |

Category tabs are not an owner-selectable layout template. They are a display/navigation toggle. Legacy saved `tabs` layout values are normalized to a compatible layout while preserving the category-tabs intent.

---

## Device Preview

| Frame          | Width  | Use Case         |
| -------------- | ------ | ---------------- |
| **Mobile**     | 375px  | Phone browsing   |
| **Tablet**     | 768px  | Tablet browsing  |
| **Desktop**    | 1024px | Desktop browsing |
| **Full Width** | 100%   | Actual view      |

---

## SEO Features

### Dynamic Metadata (generateMetadata)

```typescript
{
  title: projectData.seoTitle || projectData.name,
  description: projectData.seoDescription || projectData.description,
  openGraph: {
    title: ...,
    description: ...,
    images: [{ url: projectData.ogImageUrl }],
  },
  twitter: { card: 'summary_large_image', ... },
}
```

### Schema.org JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Restaurant Name",
  "menu": {
    "@type": "Menu",
    "hasMenuSection": [
      {
        "@type": "MenuSection",
        "name": "Category",
        "hasMenuItem": [
          {
            "@type": "MenuItem",
            "name": "Item",
            "description": "...",
            "offers": { "@type": "Offer", "price": "12.99" }
          }
        ]
      }
    ]
  }
}
```

---

## Share & Embed

### Share Options

| Method      | Implementation                              |
| ----------- | ------------------------------------------- |
| **URL**     | Copy menu link to clipboard                 |
| **QR Code** | Generated QR code image                     |
| **Social**  | Share buttons (Facebook, Twitter, WhatsApp) |

### Embed (Future)

| Feature      | Status                        |
| ------------ | ----------------------------- |
| iframe embed | UI exists, CSP not configured |

---

## Error Messages

| Scenario          | Message                                    |
| ----------------- | ------------------------------------------ |
| Menu not found    | `"Menu not found"` with 404 page           |
| Loading error     | `"Unable to load menu. Please try again."` |
| Image not loading | Placeholder image displayed                |

---

## Out of Scope

| Feature             | Reason            | Alternative          |
| ------------------- | ----------------- | -------------------- |
| Online ordering     | Different product | Display only         |
| Customer accounts   | Complexity        | Anonymous browsing   |
| Reservations        | Different product | External integration |
| Analytics dashboard | Separate feature  | Analytics tracking   |

---

## Related Documents

| Document          | Purpose                          |
| ----------------- | -------------------------------- |
| `_impl.md`        | Technical implementation details |
| `_marketing.md`   | Sales and marketing collateral   |
| `../data-editor/` | Where menu is edited             |
| `../client-menu/` | Detailed B2C implementation      |

---

## Source Gate

`npm run verify:menu-design-presentation-boundary` verifies the current mood/layout compatibility contract, owner-selectable layout list, desktop and mobile editor parity, public menu output behavior, publish/cache revalidation path, and active docs boundary. Passing this source gate is not current launch certification; external approval still needs the External Certification Runbook, Digital Menu Output Constitution checks, browser/mobile customer-menu QA, public cache/deploy evidence, and target production smoke.

---

_Document Status: Historical B2C view source evidence - not current launch certification_

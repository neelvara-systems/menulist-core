# Customer-Facing Digital Menu — Documentation Index

**Feature:** Client Menu  
**Status:** ✅ Production Ready  
**Last Updated:** May 7, 2026

---

## Quick Navigation

### Core Documentation

| Document                          | Audience               | Purpose                                       |
| --------------------------------- | ---------------------- | --------------------------------------------- |
| [\_spec.md](./_spec.md)           | Product, CEO, Business | Non-technical PRD, requirements, user stories |
| [\_impl.md](./_impl.md)           | Engineers, Tech Leads  | Technical blueprint, architecture, validation |
| [\_marketing.md](./_marketing.md) | Sales, Marketing       | Pitch deck, copy, messaging                   |

### Sub-Feature Documentation

| Sub-Feature            | Spec                                       | Impl                                       |
| ---------------------- | ------------------------------------------ | ------------------------------------------ |
| **Analytics Tracking** | [\_spec.md](./analytics-tracking/_spec.md) | [\_impl.md](./analytics-tracking/_impl.md) |
| **Auto-Sell Features** | [\_spec.md](./autosell-features/_spec.md)  | [\_impl.md](./autosell-features/_impl.md)  |

## Folder Structure

```
__docs__/client-menu/
├── README.md                          # This file
├── _spec.md                           # Product Specification (PRD)
├── _impl.md                           # Implementation Blueprint
├── _marketing.md                      # Marketing & Sales Collateral
│
├── analytics-tracking/                # Analytics Sub-Feature
│   ├── _spec.md                       # Analytics specification
│   └── _impl.md                       # Analytics implementation
│
└── autosell-features/                 # Auto-Sell Sub-Feature
    ├── _spec.md                       # Auto-Sell specification
    └── _impl.md                       # Auto-Sell implementation
```

---

## Feature Overview

The **Customer-Facing Digital Menu** (Client Menu) is the public-facing interface that restaurant customers see when they scan a QR code or visit a restaurant's menu URL.

### Key Capabilities

| Capability               | Description                                         | Status |
| ------------------------ | --------------------------------------------------- | ------ |
| Multi-tenant routing     | Subdomains + custom domains + outlet routing        | ✅     |
| SEO optimization         | Metadata, Schema.org, BreadcrumbList, FAQ, sitemap  | ✅     |
| Decision Blocks          | Smart recommendations (precomputed nightly)         | ✅     |
| Live Indicator           | "Updated just now" trust signal                     | ✅     |
| Instant Availability     | Sold-out items fade instantly                       | ✅     |
| Time-Based Categories    | Auto-switch by time                                 | ✅     |
| Multi-language           | Customer language selection                         | ✅     |
| Analytics tracking       | Internal + optional GA4/FB Pixel per store          | ✅     |
| Offline support          | PWA with service worker                             | ✅     |
| State persistence        | Scroll, filter preserved                            | ✅     |
| Infrastructure hardening | Timeout, retry, skeleton, Vercel Data Cache         | ✅     |
| OBP Integration          | Root = Official Business Page, /menu = default menu | ✅     |
| Special Menu Switching   | Replace/overlay modes for special occasions         | ✅     |
| Multi-Outlet Resolution  | Master/outlet merge for chain restaurants           | ✅     |
| URL Routing Architecture | Slug chain redirects, reserved namespaces           | ✅     |
| Menu Correctness Engine  | 17-rule validation + publish-gate                   | ✅     |
| Client Sanitization      | Internal metadata stripped before customer exposure | ✅     |
| Public UI Governance     | Locked output primitives over project-wise presets  | ✅     |

### Entry Points

| URL Pattern                      | Example                        | Behavior         |
| -------------------------------- | ------------------------------ | ---------------- |
| `{subdomain}.menulist.ai`        | `joespizza.menulist.ai`        | Default menu     |
| `{subdomain}.menulist.ai/{slug}` | `joespizza.menulist.ai/drinks` | Specific project |
| `{custom-domain}`                | `joespizza.com`                | Default menu     |
| `{custom-domain}/{slug}`         | `joespizza.com/bar-menu`       | Specific project |

---

## Navigation by Role

### For Product/Business

1. Start with **[\_spec.md](./_spec.md)** for full requirements
2. Review **[\_marketing.md](./_marketing.md)** for positioning

### For Engineers

1. Start with **[\_impl.md](./_impl.md)** for architecture
2. Deep-dive into sub-features as needed:
   - [Analytics Implementation](./analytics-tracking/_impl.md)
   - [Auto-Sell Implementation](./autosell-features/_impl.md)

### For Sales/Marketing

1. Start with **[\_marketing.md](./_marketing.md)** for messaging
2. Reference **[\_spec.md](./_spec.md)** for feature details

---

## Related Documentation

| Location                                              | Content                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| `__docs__/projects/DECISION-INTELLIGENCE-ANALYSIS.md` | Decision Blocks feature (owner controls, scoring) |
| `__docs__/projects/DECISION-BLOCKS-SCHEDULER.md`      | Nightly Cloud Function scheduler                  |
| `__docs__/continuous-menu-intelligence/`              | CMI system documentation                          |

---

## Codebase Entry Points

| File                                                             | Purpose             |
| ---------------------------------------------------------------- | ------------------- |
| `src/app/client/[[...slug]]/page.tsx`                            | Main page component |
| `src/app/client/layout.tsx`                                      | Minimal HTML layout |
| `src/components/templates/website/clientWebsite/index.tsx`       | Client renderer     |
| `src/components/templates/website/mainContentRenderer/index.tsx` | Home/Menu router    |
| `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` | Public menu renderer |
| `src/components/templates/main-app/projects/b2cView/designSystem/index.ts` | Menu mood/layout presets |

## Public UI Governance

The public menu is not a website-builder surface. Store/project owners can select the existing `config.design.menu` mood and layout presets, but customer output keeps the following primitives locked:

- Search remains the primary retrieval control and uses the shared `MenuSearchBar`.
- Category navigation remains the orientation layer: sticky rail/tabs plus the `Sections` navigator.
- Public category icons render through the shared icon system and preserve owner-selected icon choices, including emoji values.
- Category headings are structural markers, not decorative title screens.
- Item cards preserve line limits, price alignment, text-first hierarchy, and stable image slots.
- Platform attribution remains quiet infrastructure attribution through `PublicMenuListAttribution`.

---

## Version History

| Date       | Change                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-07 | Public menu UI governance hardening: constrained category icon rendering, structural category/navigation styling, search focus state, stable image slots, quiet platform attribution, and localized fallback use |
| 2026-03-15 | Implemented all 8 ChatGPT review items: lazy language loading, progressive rendering, dish metadata schema, analytics lazy loading, state version key, text-first fallback |
| 2026-04-28 | Analytics tracking tightened for Firebase cost discipline: added de-duplicated search demand, unavailable-item demand, and final menu CTA conversion clicks; explicitly rejected scroll-depth telemetry |
| 2026-03-11 | Responsive layout architecture (mobile/tablet/desktop sidebar)                                                                                                             |
| 2026-02-22 | URL routing architecture: slug chains, outlet routing, reserved namespaces                                                                                                 |
| 2026-02-21 | Special menu switching (replace + overlay modes)                                                                                                                           |
| 2026-02-15 | OBP integration (root = OBP, /menu = default project)                                                                                                                      |
| 2026-02-14 | Infrastructure hardening: withTimeout, withRetry, MenuSkeleton, caching                                                                                                    |
| 2026-01-12 | Documentation consolidated into \_spec.md, \_impl.md, \_marketing.md pattern                                                                                               |
| 2026-01-09 | Customer UI analysis completed, implementation verified                                                                                                                    |
| 2025-12-28 | Analytics tracking implemented with project-wise keys                                                                                                                      |
| 2025-12-18 | Time-based categories refactored to store-level presets                                                                                                                    |
| 2025-12-17 | Instant availability implemented                                                                                                                                           |
| 2025-12-16 | Auto-Sell features specification created                                                                                                                                   |
| 2025-12-21 | Multi-tenant domain routing implemented                                                                                                                                    |

---

_Documentation Index — Last Updated: May 7, 2026_

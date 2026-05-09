# Customer-Facing Digital Menu — Documentation Index

**Feature:** Client Menu  
**Status:** ✅ Production Ready  
**Last Updated:** May 8, 2026

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
| Decision Blocks          | Featured choices (precomputed nightly)              | ✅     |
| Live Indicator           | "Updated just now" trust signal                     | ✅     |
| Instant Availability     | Sold-out items fade instantly                       | ✅     |
| Time-Based Categories    | Auto-switch by time                                 | ✅     |
| Multi-language           | Customer language selection                         | ✅     |
| Fuzzy menu search        | Client-side spelling/phonetic search across localized menu data | ✅     |
| Analytics tracking       | Internal + optional GA4/FB Pixel per store          | ✅     |
| Offline support          | PWA with service worker and no stale menu cache     | ✅     |
| State persistence        | Scroll, filter preserved                            | ✅     |
| Infrastructure hardening | Timeout, retry, skeleton, Vercel Data Cache         | ✅     |
| OBP Integration          | Root = Official Business Page, /menu = default menu | ✅     |
| Special Menu Switching   | Replace/overlay modes for special occasions         | ✅     |
| Multi-Outlet Resolution  | Master/outlet merge for chain restaurants           | ✅     |
| URL Routing Architecture | Slug chain redirects, reserved namespaces           | ✅     |
| Menu Correctness Engine  | 17-rule validation + publish-gate                   | ✅     |
| Client Sanitization      | Internal metadata stripped before customer exposure | ✅     |
| Public UI Governance     | Locked output primitives over project-wise presets  | ✅     |
| Structured public truth  | JSON-LD aligned to active menu data and freshness   | ✅     |

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
| `__docs__/client-menu-retrieval-foundation/`          | Public menu search, structured truth, low-network contract |

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
| `src/lib/menu/publicMenuSearch.ts` | Client-side fuzzy/transliteration search utility |
| `src/lib/menu/publicMenuStructuredData.ts` | Public menu freshness helpers |

## Public UI Governance

The public menu is not a website-builder surface. Store/project owners can select the existing `config.design.menu` mood and layout presets, but customer output keeps the following primitives locked:

- Search remains the primary retrieval control and uses the shared `MenuSearchBar`.
- Mobile/tablet menus use one sticky command row: search on the left and `Sections` on the right.
- Category navigation remains the orientation layer: lightweight sticky rail/tabs plus the `Sections` bottom-sheet navigator.
- Public category icons render through the shared icon system and preserve owner-selected icon choices, including emoji values.
- Featured cards reuse category icon/emoji identity only when the owner has category icons enabled for the menu design.
- Desktop and mobile owner controls use the same public wording for this area: `Featured section`, `Featured choice`, `Quick choice`, and `Value choice`.
- Category headings are structural markers, not decorative title screens.
- Item cards preserve line limits, price alignment, text-first hierarchy, and render image frames only when an item has an image.
- Public image rendering normalizes legacy and current stored image shapes before cards, featured choices, PDP galleries, and metadata read item images.
- PDP open/close keeps the sticky command row mounted and avoids fixed-body locking at the top of iPhone PWAs, reducing temporary unclickable states after repeated item views.
- Large PDP content stays inside a capped scrollable modal/sheet, and the close control remains reachable while the item detail content scrolls.
- Item detail uses a centered modal on desktop and a bottom sheet on mobile, with contain-fit images, gallery controls, and owner-enabled category identity.
- Back-to-top is isolated from item cards underneath it; it scrolls only on completed tap/click and does not trigger PDP for the covered item.
- Footer business actions use compact icon/text chips while keeping platform attribution quiet.
- Platform attribution remains quiet infrastructure attribution through `PublicMenuListAttribution`.

---

## Version History

| Date       | Change                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-09 | Installed PWA interaction stability improved: PDP close no longer remounts sticky controls, active search is blurred before item details open, and top-of-page scroll lock is lighter on iPhone PWAs |
| 2026-05-09 | PDP long-content handling tightened: modal/sheet height remains viewport-capped, internal touch scrolling is preserved, and close remains reachable while details scroll |
| 2026-05-09 | Back-to-top tap isolation fixed so scrolling to top cannot also open the item card underneath the floating control |
| 2026-05-09 | Public item image rendering now tolerates legacy object-shaped image data so PDP galleries and featured/item cards do not crash customer menus |
| 2026-05-09 | Client menu interaction hardening: search controls stay reachable, Sections/language popovers render above sticky layers, PDP mobile bottom sheet/image viewing improved, blank image placeholders removed, and footer/back-to-top spacing tightened |
| 2026-05-08 | Desktop and mobile owner Featured section controls now use the same Featured choice, Quick choice, and Value choice wording as the public menu |
| 2026-05-08 | Featured cards now inherit owner-enabled category icon/emoji identity in their compact category metadata row without adding a separate badge system |
| 2026-05-07 | Client menu retrieval foundation: fuzzy/transliteration search, compact multilingual search terms, active-item JSON-LD freshness, and bounded offline navigation fallback |
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

# Customer-Facing Digital Menu — Documentation Index

**Feature:** Client Menu  
**Status:** ✅ Production Ready  
**Last Updated:** May 10, 2026

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
| Fuzzy menu search        | Client-side spelling/phonetic search with exact visible-name matches ranked first | ✅     |
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
| Special note disclosure  | Menu/store DB note renders in the public menu footer trust zone | ✅     |

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
- Tapping the search row must focus the actual input on the first tap, even while the row is expanding and side controls are hiding.
- Mobile/tablet menus use one sticky command row: search on the left and `Sections` on the right when there are three or more sections.
- The sticky command row must not use compositor transform hacks or clipped sticky ancestors; scroll-spy category updates are frame-throttled so normal vertical scrolling does not make the row vibrate.
- Mobile public menus switch the command row to a measured fixed layer only after it reaches the top. Visual spacing and safe-area breathing room live inside the row padding, and public mobile uses stable `svh` viewport height so iOS browser/PWA chrome changes do not make the row bounce.
- Search focus can show compact suggestions derived from visible item/section names; suggestions are client-side only and must not add Firestore/API reads.
- The compact top-row language control shows only the language initials; full language names remain inside the language picker.
- Category navigation remains the orientation layer: lightweight sticky rail/tabs plus the `Sections` bottom-sheet navigator.
- The `Sections` navigator header stays compact; close controls keep their tap target without creating a tall heading band.
- Selecting a section from the `Sections` navigator must close the navigator before the page scrolls to that section.
- Public category icons render through the shared icon system and preserve owner-selected icon choices, including emoji values.
- Featured cards reuse category icon/emoji identity only when the owner has category icons enabled for the menu design.
- Featured choices use a full-width grid on desktop and keep horizontal scrolling only on smaller touch layouts.
- Desktop and mobile owner controls use the same public wording for this area: `Featured section`, `Featured choice`, `Quick choice`, and `Value choice`.
- Mobile Menu Design includes a persistent preview-only action so owners can inspect draft design changes through the same public menu renderer before saving.
- Category headings are structural markers, not decorative title screens.
- Item cards preserve line limits, price alignment, text-first hierarchy, and render image frames only when an item has an image.
- Compact two-column mobile Grid output should let a single final card span the full row so odd item counts do not leave an empty second column.
- Public image rendering normalizes legacy and current stored image shapes before cards, featured choices, PDP galleries, and metadata read item images.
- PDP close waits for the item-history back event when the item URL was pushed, then restores scroll without synthetic scroll/resize events so iPhone PWAs do not move the category rail while returning to the menu.
- PDP close must not remount the sticky command row or dispatch synthetic scroll events; featured item PDPs close like regular item PDPs without moving the horizontal category rail.
- Large PDP content stays inside a capped scrollable modal/sheet, and the close control remains reachable while the item detail content scrolls.
- Item detail uses a centered modal on desktop and a bottom sheet on mobile, with contain-fit images, gallery controls, fullscreen pinch-to-zoom image inspection, owner-enabled category identity, and a quiet item-share action that preserves the current language URL.
- Back-to-top is isolated from item cards underneath it; it scrolls only on completed tap/click and does not trigger PDP for the covered item.
- Footer business actions use compact icon/text chips while keeping platform attribution quiet.
- The common Call / WhatsApp / Directions set stays in one compact row; desktop renders centered chips, mobile can use equal-width touch targets, and extra actions can wrap instead of crowding.
- Platform attribution remains quiet infrastructure attribution through `PublicMenuListAttribution` and uses the same compact `Powered by MenuList. All rights reserved` treatment as other public pages.
- Customer-facing menu and category controls are non-selectable to avoid accidental text selection while tapping; footer identity and policy content remain selectable.
- Public menu viewport locks mobile pinch zoom on the client surface to match the owner app shell and avoid accidental two-finger zoom states inside installed PWAs.
- Fullscreen PDP image inspection owns its own touch zoom, so customers can pinch product/service photos without zooming the entire menu surface.
- Business logos render as the uploaded image itself on menu and OBP surfaces; no extra wrapper border or crop is applied around the logo image.
- Public menu language persistence is scoped to the store/project session and the project-specific local preference key; old global language preferences are ignored so installed PWAs cannot leak a previous menu language into another project.
- Compact multi-language payloads must not strip public descriptions needed by the language picker; descriptions, names, categories, route `?lang=`, and item share URLs must stay aligned when the customer changes language on the menu after arriving from OBP.
- Item PDPs opened from the menu must update the client document head (`title`, canonical URL, Open Graph URL/title/description, and Twitter URL/title/description) because mobile browser share sheets can read head metadata after client-side history changes.
- PDP item sharing uses the native device share sheet when available and falls back to copying the exact item URL. This is especially important inside installed PWAs where the browser share button is not visible.
- Public search waits for at least two normalized characters before filtering, allows numeric prefix search for alphanumeric tokens such as `11am` without matching unrelated price tokens such as `115`, rejects ambiguous compressed token matches, aliases expand customer queries rather than stored item meanings, and treats multi-term searches as exact phrase first, then any-term recovery.
- Starting a search from a deep scroll position must bring the result area back under the sticky command row so customers never have to manually scroll to find the filtered output.
- Active temporary status notices on the public menu belong in the bottom trust zone as centered pills, not above the business identity header. Expired status data must not reserve empty space.

---

## Version History

| Date       | Change                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-13 | Public menu tap hardening: `Sections` now closes before category jump, and the expanding search row focuses the input on the first tap |
| 2026-05-12 | Public menu UX fixes: mobile grid odd rows span cleanly, search suggestions are data-based, multi-term search supports any-term recovery, language routing updates server-rendered menu names, item URLs/head metadata preserve language, PDP item sharing works in installed PWAs, PDP nutrition facts display, active temporary status moved to the bottom trust zone, and Sections appears only for 3+ sections |
| 2026-05-10 | Search false-positive hardening: one-character input no longer shows a no-result state, and chai typo recovery no longer matches unrelated choice/cheese/tea-description text |
| 2026-05-10 | Mobile grid output restored, fullscreen PDP image pinch zoom added, and public menu language switching now keeps item descriptions aligned with the selected language |
| 2026-05-10 | Desktop menu polish: featured choices use a desktop grid, and footer contact actions render as compact centered chips instead of full-width controls |
| 2026-05-10 | Numeric search prefix support: two-character numeric queries such as `11` can match item text tokens such as `11am` without matching unrelated price tokens such as `115` |
| 2026-05-10 | Deep-scroll search positioning: active search now scrolls the result area back under the sticky command row when the customer starts from lower in the menu |
| 2026-05-10 | iOS sticky-row stabilization: mobile public menu sticky controls now anchor at `top: 0` with internal safe-area padding and stable viewport height to avoid scroll bounce on iPhone Chrome/PWA |
| 2026-05-10 | Sticky search row stability: removed sticky-row transform hints and frame-throttled scroll-spy updates to reduce scroll vibration |
| 2026-05-10 | Interaction/search hardening: featured PDP close no longer moves the category rail, public menu pinch zoom is locked, menu/category text selection is suppressed, and short-token search matching is stricter |
| 2026-05-10 | Logo and attribution alignment: menu/OBP logos render without extra wrapper borders, and public branding stays on the shared `Powered by MenuList. All rights reserved` treatment |
| 2026-05-10 | Public menu hardening: exact visible-name search ranking, project-scoped language persistence, compact top language button, single-row primary footer actions, centered special note, and aligned MenuList attribution |
| 2026-05-10 | Multi-language payload hardening: compact public menus now preserve the resolved initial render language description when no `?lang=` query is present |
| 2026-05-10 | PDP close path hardened for top-of-menu iPhone/PWA cases by letting history back close the modal without remounting or synthetically scrolling the sticky command row |
| 2026-05-09 | Sections popup header height reduced while preserving the close tap target |
| 2026-05-09 | Expanded sticky search now removes the parent flex gap while side controls are hidden, so no right-side spacing artifact remains |
| 2026-05-09 | Public menu analytics now bypasses the authenticated DAL wrapper and writes through the local coalescing queue first |
| 2026-05-09 | Featured item taps now open PDP without also scrolling the underlying menu; inline scroll remains only as a non-modal fallback |
| 2026-05-09 | Mobile public menu wrapper padding now caps at 12px on mobile and 18px on tablet while desktop keeps the configured design spacing |
| 2026-05-09 | Installed PWA interaction stability improved: PDP close no longer remounts sticky controls, active search is blurred before item details open, and top-of-page scroll lock is lighter on iPhone PWAs |
| 2026-05-09 | PDP long-content handling tightened: modal/sheet height remains viewport-capped, internal touch scrolling is preserved, and close remains reachable while details scroll |
| 2026-05-09 | Back-to-top tap isolation fixed so scrolling to top cannot also open the item card underneath the floating control |
| 2026-05-09 | Public item image rendering now tolerates legacy object-shaped image data so PDP galleries and featured/item cards do not crash customer menus |
| 2026-05-09 | Client menu interaction hardening: search controls stay reachable, Sections/language popovers render above sticky layers, PDP mobile bottom sheet/image viewing improved, blank image placeholders removed, and footer/back-to-top spacing tightened |
| 2026-05-09 | Mobile Menu Design draft preview added with shared public renderer and preview-only guardrails |
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

_Documentation Index — Last Updated: May 10, 2026_

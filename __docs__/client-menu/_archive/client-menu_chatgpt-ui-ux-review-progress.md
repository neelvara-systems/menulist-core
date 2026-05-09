# Client Menu ChatGPT UI/UX Review Progress

**Source:** ChatGPT screenshot-only review of two public menu examples  
**Review owner:** Codex  
**Started:** May 7, 2026  
**Status:** Implemented, including second-turn sticky command-layer review, retrieval foundation follow-up, and featured-section UX polish

---

## Ground Rules

- ChatGPT feedback is an input, not an instruction.
- Codebase truth wins: public output runs through `src/app/client/[[...slug]]/page.tsx` and `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`.
- Existing project-wise `config.design.menu` mood/layout controls stay. This pass hardens what those presets are allowed to output.
- No website-builder drift: no custom layouts, custom fonts, custom CSS, feed behavior, engagement counters, or marketing popups.
- Public output must stay text-first, mobile-first, safe-area-aware, and machine-readable.

---

## External Reference Check

| Area | Source | Decision Impact |
| --- | --- | --- |
| Contrast | W3C WCAG 2.2, SC 1.4.3 requires 4.5:1 for normal text and 3:1 for large text | Accepted: light theme containment and readable borders deserve priority. |
| Layout stability | web.dev CLS guidance warns against visible layout shifts that move content while users read or tap | Accepted: item image slots need stable reserved space when images are enabled. |
| Structured data | Google Search Central says structured data must represent visible page content and be up to date | Accepted: AEO claims are valid only where UI and schema stay aligned; no hidden/misleading markup. |
| Carousel restraint | SAP Fiori carousel guidance uses related cards with a glimpse of the next card and recommends a small compact set | Accepted: featured choices can use a horizontal row when the next card peeks and the main page does not overflow horizontally. |

References:
- https://www.w3.org/TR/WCAG22/
- https://web.dev/optimize-cls
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://www.sap.com/design-system/fiori-design-ios/v26-1/components/cards-and-layouts/carousel-layout/usage

---

## Decision Matrix

| # | ChatGPT Topic | Verdict | Decision | Implementation Status |
| --- | --- | --- | --- | --- |
| 1 | Layout architecture | Partial | Keep current direct utility-first layout. Improve sticky navigation cohesion and footer transition; do not add homepage/hero behavior. | Done |
| 2 | Typography | Partial | Reduce decorative category heading drift in public output. Do not remove the mood system. | Done |
| 3 | Color system | Partial | Improve light containment and reduce active-state loudness. Do not create arbitrary theme freedom. | Done |
| 4 | Spacing/rhythm | Agree | Tighten category interruption, chip density, card text rhythm, and footer separation using shared output styles. | Done |
| 5 | Category navigation | Partial | Category rail remains lightweight and the sticky-row `Sections` button becomes the section navigator. Owner-selected category icons, including emoji, are preserved. | Done |
| 6 | Search UX | Agree with constraints | Search is sticky and calm. UI affordance was handled first; fuzzy/transliteration retrieval was then implemented as a separate foundation feature without AI chat or new owner settings. | Done |
| 7 | Item cards | Agree | Add title/description governance, softer price weight, stable image slot behavior, and restrained interaction feedback. | Done |
| 8 | Image system | Agree | Preserve text-first cards and reserve image slots when image mode is active. Do not turn menu into a visual feed. | Done |
| 9 | Freshness/live state | Partial | Existing `LiveIndicator`, `TrustSignals`, and footer metadata already exist. Improve docs and avoid louder "live" theater. | Documented |
| 10 | Business identity block | Agree | Keep business identity after menu content; separate platform attribution more clearly. | Done |
| 11 | Footer architecture | Agree | Replace growth-marketing attribution tone with quiet infrastructure attribution. | Done |
| 12 | Theme governance | Agree | Document locked primitives; keep 3-5 moods and constrained presets. | Done |
| 13 | Motion/interactions | Partial | Add restrained press/focus states only. No parallax, cinematic motion, or engagement animation. | Done |
| 14 | Performance perception | Agree | Build toward stable layout, text-first rendering, and no image-driven shifts. | Done |
| 15 | Accessibility/i18n | Agree | Improve contrast, text expansion, and localized fallback paths. RTL remains a larger architecture item. | Done |
| 16 | AI/AEO readiness | Partial | Preserve structural consistency and visible/schema alignment. No new AI retrieval feature in this UI pass. | Documented |
| 17 | Infrastructure signals | Agree | Remove low-authority visual elements and reduce expressive drift. | Done |
| 18 | What should not exist | Agree | Explicitly reject website-builder, engagement, feed, badge inflation, and over-customization drift. | Documented |
| 19 | Long-term moats | Doctrine-aligned | Treat as strategy guidance for constraints and public truth, not as a code feature. | Documented |

---

## Second-Turn ChatGPT Review: Sticky Search + Sections Row

| ChatGPT Idea | Verdict | Decision | Action |
| --- | --- | --- | --- |
| Move the disconnected bottom `Sections` control into the sticky search row | Agree | This improves retrieval speed and orientation clarity without adding a new feature surface. Desktop keeps its existing sidebar because the duplicated button is unnecessary there. | Implemented in `menuPageNew.tsx` and `MenuFilters.tsx`. |
| Treat search + sections as one command/navigation layer | Agree | The actual value is a unified retrieval/orientation row, not merely moving a button. | Search now renders compactly beside `Sections` on mobile/tablet. |
| Open `Sections` as a structured navigator | Agree with constraints | Full fuzzy/semantic navigation is not part of this pass, but a bottom-sheet-style section list with active state and item counts is aligned and low risk. | Implemented in `MenuFilters.tsx`. |
| Remove double navigation overload | Agree | Keep the lightweight category rail where configured, but remove the separate floating section FAB from the public menu render. | Implemented in `menuPageNew.tsx`; back-to-top remains as accessibility infrastructure only. |
| Add smarter search, transliteration, AI retrieval, low-network/offline systems | Split | Fuzzy/transliteration search, structured public truth, and low-network navigation fallback are valid base foundations. AI retrieval infrastructure remains separate. | Base foundations implemented; AI retrieval deferred. |

## Third-Turn Review: Retrieval Foundation

| ChatGPT/User Idea | Verdict | Decision | Action |
| --- | --- | --- | --- |
| Fuzzy search and transliteration | Agree | High end-user value if deterministic, client-side, and based on already-published public menu data. | Implemented in `src/lib/menu/publicMenuSearch.ts` and wired into `menuPageNew.tsx`. |
| Search every relevant public menu field | Agree | Search should include localized names/descriptions, category names, attributes, tags, public decision facts, and prices only when prices are visible. | Implemented without new Firestore reads. |
| AI-era metadata and structured public truth | Agree with constraints | JSON-LD must represent visible/current public truth only. No fake verified claims or hidden schema-only data. | Hardened in `src/app/client/[[...slug]]/page.tsx` and `src/lib/menu/publicMenuStructuredData.ts`. |
| Offline/low-network resilience | Agree with strict boundary | Customer app can fail clearly to `/offline`, but must not serve stale menu content. | `public/sw-customer.js` now applies bounded network-first navigation fallback. |
| AI retrieval infrastructure | Defer | Requires separate API/retrieval/cache/data design after base search is stable. | Not implemented in this pass. |

Final pass notes:

- The shared app and Functions copies of `businessTypes.ts` matched byte-for-byte.
- Public rendering now resolves legacy/generic stored values such as `businessType: B2C` through real SMB industry values before search/schema output.
- Browser search flow was verified on the tenant route: phonetic `chay`, no-result recovery, category jump from search, search-mode recommendation/feedback suppression, and active-category state restoration.

## Fourth-Turn Review: Featured Section UX

| User/Review Point | Verdict | Decision | Action |
| --- | --- | --- | --- |
| Featured section caused or risked full-page horizontal scroll | Agree | The featured row may scroll horizontally, but the page itself must stay width-safe. | Constrained the carousel in `DecisionBlocks.tsx` and added the missing global `.scrollbar-hide` utility in `public/styles/base/_base.scss`. |
| Featured cards felt like repeated status labels | Agree | The section should explain ownership once, not repeat "selected" on every card. | Replaced repeated owner text with a compact `Business picks` header label and category metadata per card. |
| Featured row needed better scanability | Agree | Use compact related cards with stable width, visible next-card peek, clamped names, and aligned price metadata. | Reworked `DecisionBlocks.tsx` card layout and localized category fallback. |
| Featured cards should reflect category icon/emoji config | Agree with constraint | Reuse the existing category icon/emoji design setting; do not add a featured-only badge or force icons when the owner disables category icons. | `DecisionBlocks.tsx` now receives `showCategoryIcons` and renders the item category icon beside category metadata when enabled. |
| Owner controls still said `Smart Recommendations` | Agree | Desktop and mobile owner controls should use the same mental model as the public menu: Featured section, Featured choice, Quick choice, and Value choice. | Desktop editor action/modal, mobile Menu tab/sheet, analytics settings, and feature copy now use Featured wording while preserving the existing settings path. |
| Featured shortcuts must still open item detail | Required | Visual polish must not break decision-block click behavior or analytics. | Browser-verified a featured card opens the PDP overlay. |
| PDP images need detail inspection across SMB types | Agree | Keep normal PDP images contain-fit for fast menu scanning, then provide an explicit fullscreen inspection layer for salons, retail, repair, portfolios, and other visual SMB offerings. | `PDPModal.tsx` now has an enlarge control, fullscreen image viewer, zoom in/out, reset, close, pan, keyboard image navigation, and the same theme-aware icon button treatment. |

---

## Accepted Implementation Scope

- Public category icons preserve owner-selected icon choices, including emoji values, through the shared `CategoryIcon` path: `src/components/atoms/CategoryIcon/index.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx`.
- Sticky navigation becomes a unified mobile/tablet command layer: search on the left, `Sections` on the right, with tighter category chips below when configured: `src/components/templates/main-app/projects/b2cView/output/MenuSearchBar.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`.
- `Sections` opens a bottom-sheet-style navigator with localized fallback labels, active state, owner-selected icons, and item counts: `src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx`.
- Category headings become structural markers rather than theme-heavy title screens: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/designSystem/index.ts`.
- Item cards enforce title/description line limits and softer price weight: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`.
- Image-enabled layouts reserve stable image slots and show intentional placeholders when an item has no image: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`.
- Footer/platform attribution becomes quiet infrastructure attribution: `src/components/customer/PublicMenuListAttribution.tsx`.
- Light theme containment is strengthened through safer surface/background/border tokens: `src/components/templates/main-app/projects/b2cView/designSystem/index.ts`.

## Rejected For This Pass

- Full custom theme redesign.
- Arbitrary owner design freedom.
- Feed-like/image-first menus.
- AI chat/search UI. Deterministic fuzzy and transliteration retrieval moved into the separate retrieval-foundation feature.
- Public engagement counters or popularity theater.
- Extra marketing CTAs on customer-facing menu footer.

## Granular Suggestion Coverage

This appendix exists because the source review had many small points inside the 19 larger sections. Each point below was considered against the real codebase, owner controls, public-route doctrine, Firebase cost discipline, accessibility, and MenuList's constrained public-surface model.

### 1. Layout Architecture

| Suggestion | Decision | Status |
| --- | --- | --- |
| Keep direct utility-first page start instead of hero/welcome page | Accepted | Existing behavior preserved in `menuPageNew.tsx`. |
| Strengthen one dominant orientation model | Accepted | Sticky search plus `Sections` command row implemented on mobile/tablet. |
| Avoid long-scrolling website feeling | Accepted with constraints | Category rail and section jump layer remain the navigation structure. |
| Make category rail sticky earlier | Partial | Existing sticky controls retained and visual cohesion improved; no new scroll algorithm in this pass. |
| Reduce category header interruption | Accepted | Category headings made smaller and structural. |
| Avoid mini website/customizable section drift | Accepted | Documented as governance rule in README/spec/impl. |
| Improve footer completion transition | Partial | Attribution made quieter; deeper footer layout redesign deferred. |

### 2. Typography

| Suggestion | Decision | Status |
| --- | --- | --- |
| Remove decorative typography drift | Accepted | Category headings now use a restrained body-font hierarchy. |
| Standardize hierarchy mathematically | Partial | Public renderer line heights, line limits, sizes, and weights tightened. |
| Reduce category heading dominance | Accepted | Implemented in `menuPageNew.tsx`. |
| Reduce title/price shouting | Accepted | Item title and price sizing/weight reduced. |
| Improve description compression | Accepted | Description line-height and line clamp tightened. |
| Add long-title governance | Accepted | Item titles are clamped to two lines. |
| Full global font-system redesign | Rejected for this pass | Would exceed this public-surface hardening scope. |

### 3. Color System

| Suggestion | Decision | Status |
| --- | --- | --- |
| Improve light theme containment | Accepted | Clean mood background/surface/border tokens strengthened. |
| Reduce active category chip loudness | Accepted | Active chip styling changed from filled accent to calmer tint/border. |
| Separate semantic green roles | Partial | Price visual weight reduced; no new semantic palette API added. |
| Improve border contrast | Accepted | Light mood borders use stronger neutral opacity. |
| Avoid arbitrary expressive colors | Accepted | Existing mood presets stay constrained; no owner CSS added. |
| Improve CTA hierarchy in business footer | Deferred | Needs business-type-aware action policy, not a quick UI-only patch. |

### 4. Spacing & Rhythm

| Suggestion | Decision | Status |
| --- | --- | --- |
| Systematize sticky navigation spacing | Accepted | Sticky controls margins/padding tightened. |
| Reduce category interruption spacing | Accepted | Header/divider spacing reduced. |
| Tighten chip density | Accepted | Mobile/tablet category chips reduced from large CTA-like pills. |
| Standardize item card internal spacing | Accepted | Item card padding/gap adjusted. |
| Improve description density | Accepted | Description gap/line-height tightened. |
| Adaptive density for huge menus | Deferred | Requires menu-size-aware density policy and testing across business types. |

### 5. Category Navigation

| Suggestion | Decision | Status |
| --- | --- | --- |
| Make category rail canonical | Accepted | Rail remains the primary orientation layer. |
| Rename floating `Menu` button | Accepted | Renamed to `Sections`. |
| Bottom sheet/full navigator concept | Accepted with constraints | Sticky-row `Sections` opens a bottom-sheet-style list with active state and item counts; deeper semantic navigator remains separate retrieval work. |
| Improve active-state clarity | Accepted | Active chip/popover state made calmer but clearer. |
| Use localization fallback for category labels | Accepted | `getLocalizedText`/`getMenuText` paths used. |
| Remove raw emoji category icons | Rejected after owner correction | Owner-selected icon choices, including emoji, are preserved. |
| Improve weighted scroll tracking | Deferred | Existing scroll spy remains; deeper tracking needs behavior testing. |

### 6. Search UX

| Suggestion | Decision | Status |
| --- | --- | --- |
| Make search more structurally primary | Accepted | Search focus/containment strengthened and compacted into the sticky command row. |
| Keep search near top before categories | Accepted | Existing placement preserved. |
| Sticky search behavior | Existing/accepted | Search already lived in sticky controls; it now shares that row with `Sections` on mobile/tablet. |
| Better focus state | Accepted | Focus border, ring, and icon emphasis added. |
| Better empty state recovery | Existing/accepted | Existing no-result recovery actions retained. |
| Typo tolerance/fuzzy search | Accepted in follow-up | Implemented as deterministic client-side retrieval foundation. |
| Semantic/AI search UI | Rejected for this pass | Would add complexity and drift from calm deterministic retrieval. |

### 7. Item Cards

| Suggestion | Decision | Status |
| --- | --- | --- |
| Preserve linear scanability | Accepted | Existing list/card/grid model retained. |
| Enforce title line limits | Accepted | Item titles clamp to two lines. |
| Reduce description heaviness | Accepted | Description typography tightened. |
| Reduce price dominance | Accepted | Price size reduced while preserving alignment. |
| Improve image/no-image rhythm | Accepted with refinement | Image slots reserve only in categories that contain images. |
| Add subtle interaction feedback | Existing/accepted | Existing press/hover behavior preserved and style transitions tightened. |
| Modifier/variant-ready structure | Deferred | Needs data model and PDP/card contract work beyond this pass. |

### 8. Image System

| Suggestion | Decision | Status |
| --- | --- | --- |
| Preserve text-first hierarchy | Accepted | Images remain secondary to item text. |
| Avoid image feed behavior | Accepted | Existing image quotas retained. |
| Reserve image space to avoid layout shift | Accepted | Stable slots and placeholders added when a category has images. |
| Do not show missing-image boxes everywhere | Accepted after review | Slots now appear only for categories with at least one image. |
| Keep broken image layout stable | Accepted | Broken images hide inside reserved slots instead of collapsing layout. |
| Smart cropping/quality validation pipeline | Deferred | Requires upload/processing policy, not public renderer only. |
| AI image realism governance | Deferred | Belongs to image-generation/upload governance. |

### 9. Freshness & Live State

| Suggestion | Decision | Status |
| --- | --- | --- |
| Treat freshness as trust infrastructure | Accepted | Existing `LiveIndicator`, `TrustSignals`, footer metadata documented as trust layer. |
| Separate `Live` vs `Updated` meanings | Existing/partial | Existing components have separate live/freshness surfaces; no new semantics added. |
| Avoid fake real-time theater | Accepted | No counters, fake live activity, or animation theater added. |
| Improve visual integration | Partial | Bottom trust/meta section retained; major redesign deferred. |
| Add staleness governance | Deferred | Needs product policy for stale menus/hours and owner workflows. |
| POS freshness/verification | Deferred | Requires POS sync/trust infrastructure. |

### 10. Business Identity Block

| Suggestion | Decision | Status |
| --- | --- | --- |
| Keep business identity after menu content | Accepted | Existing sequencing preserved. |
| Separate identity from platform attribution | Accepted | Attribution quieted so identity remains dominant. |
| Preserve address/contact trust role | Accepted | Existing footer identity/actions retained. |
| Clarify action hierarchy by business type | Deferred | Needs business-type policy and possibly owner settings. |
| Keep social links secondary | Accepted | Existing icon-only social treatment retained. |
| Avoid booking/chat/form bloat | Accepted | No new modules added. |

### 11. Footer Architecture

| Suggestion | Decision | Status |
| --- | --- | --- |
| Replace builder-like attribution tone | Accepted | Default label changed to `Powered by MenuList`. |
| Remove growth marketing CTA by default | Accepted | Default `ctaLabel` is now `null`. |
| Keep platform branding quiet | Accepted | Compact attribution preserved. |
| Avoid SEO/link-heavy footer | Accepted | No footer link directory added. |
| Separate feedback from platform promotion | Partial | Existing feedback remains business-facing; platform CTA removed. |
| Turn footer into trust metadata later | Deferred | Needs broader trust/verification layer. |

### 12. Theme Governance

| Suggestion | Decision | Status |
| --- | --- | --- |
| Do not become website builder | Accepted | Documented as public UI governance. |
| Keep project-wise mood/layout presets | Accepted | Existing `config.design.menu` model preserved. |
| Lock structural primitives | Accepted | Search/category/card/footer primitives documented. |
| Reduce expressive theme drift | Accepted | Decorative heading and light-token drift reduced. |
| Limit arbitrary owner design freedom | Accepted | No custom CSS/fonts/layout controls added. |
| Keep owner icon choices | Accepted after correction | Owner-selected category icons, including emoji, render publicly. |
| Full theme system overhaul | Deferred | Existing presets remain. |

### 13. Motion & Interaction

| Suggestion | Decision | Status |
| --- | --- | --- |
| Add subtle press/focus feedback | Accepted | Existing card press states retained; search focus improved. |
| Avoid over-animation | Accepted | No parallax, bounce, cinematic reveal, or feed motion added. |
| Improve sticky transition quality | Partial | Sticky visual styling improved; no new scroll animation engine. |
| Improve image loading stability | Accepted | Reserved slots prevent jumpy image collapse. |
| Add reduced-motion architecture | Deferred | Requires cross-component motion audit. |
| Bottom-sheet motion overhaul | Deferred | Current popover retained and clarified. |

### 14. Performance Perception

| Suggestion | Decision | Status |
| --- | --- | --- |
| Text should load before images | Accepted | Existing text-first rendering retained. |
| Avoid image-driven layout shifts | Accepted | Stable image slots added. |
| Preserve progressive rendering | Existing | Large-menu progressive category rendering retained. |
| Improve perceived search speed | Partial | Search remains debounced/client-side and now uses deterministic fuzzy matching against already-loaded data. |
| Improve weak-network/offline behavior | Accepted | Customer service worker now uses bounded network-first fallback while still never caching menu content. |
| Predictive preload/adaptive loading | Deferred | Needs performance design and measurement. |

### 15. Accessibility & Internationalization

| Suggestion | Decision | Status |
| --- | --- | --- |
| Improve contrast consistency | Accepted | Light theme containment and borders strengthened. |
| Improve text expansion resilience | Accepted | Labels use fallback and truncation/line clamps where needed. |
| Avoid active-language-only text reads | Accepted | Public menu/PDP/category labels use fallback helpers. |
| Preserve mobile touch targets | Accepted | Chips tightened but stay at least 40px; footer actions remain large. |
| Do not rely only on color for unavailable state | Existing | Unavailable label remains visible. |
| RTL-ready architecture | Deferred | Requires separate global RTL audit. |
| Transliteration-aware search | Accepted in follow-up | Implemented with lightweight deterministic matching for public menu search. |

### 16. AI/AEO Readiness

| Suggestion | Decision | Status |
| --- | --- | --- |
| Preserve semantic hierarchy | Accepted | Business/category/item structure retained. |
| Keep canonical URLs correct | Accepted | Outlet-aware redirect/canonical fixes are in `page.tsx`. |
| Keep visible content aligned with schema | Accepted | JSON-LD now filters active public menu data and respects visible price rules. |
| Strengthen freshness metadata | Accepted | Schema now prefers project `lastPublishedAt`/`menuVersion` when real values exist. |
| Add AI retrieval APIs | Deferred | Not a UI hardening task. |
| Add trust scoring/business graph | Deferred | Needs separate infrastructure design. |

### 17. Infrastructure Signals

| Suggestion | Decision | Status |
| --- | --- | --- |
| Make UI calmer and more deterministic | Accepted | Navigation, typography, card rhythm, and footer attribution tightened. |
| Remove low-authority elements | Partial | Marketing CTA removed; owner-selected emoji preserved by product choice. |
| Strengthen operational tone | Accepted | Docs and footer attribution updated. |
| Improve screenshot recognizability | Partial | Structure tightened; theme freedom not expanded. |
| Add verification markers | Deferred | Needs real verification system, not decorative labels. |
| Avoid noisy badges/counters | Accepted | No new badges/counters added. |

### 18. What Should Not Exist

| Suggestion | Decision | Status |
| --- | --- | --- |
| No website-builder drift | Accepted | Documented and enforced by no new freeform layout controls. |
| No feedification | Accepted | Image quotas and text-first cards retained. |
| No engagement counters | Accepted | Rejected in tracker/docs. |
| No badge inflation | Accepted | No new badges added. |
| No homepage/marketing sections | Accepted | Public menu remains utility-first. |
| No AI-everywhere UI | Accepted | No chat/search assistant added. |
| No ads/sponsored ranking | Accepted | No monetization changes added. |

### 19. Long-Term Moats

| Suggestion | Decision | Status |
| --- | --- | --- |
| Canonical public truth is the moat | Accepted as doctrine | Docs updated around public UI governance and constrained primitives. |
| Structural consistency compounds trust | Accepted | Presets remain constrained; arbitrary customization rejected. |
| Freshness trust matters | Existing/documented | Live/trust signals remain and are documented. |
| Machine readability matters | Accepted | Canonical/schema/freshness alignment hardened without hidden verification claims. |
| QR/public URL continuity matters | Existing/accepted | Outlet/canonical fixes from the audit preserve URL correctness. |
| Avoid feature creep | Accepted | Explicit rejected/deferred list maintained. |

## May 8, 2026 Runtime Bugfix Pass

| Issue Found In Public Menu | Decision | Status |
| --- | --- | --- |
| PDP image could crop instead of showing the full uploaded image | Accepted | PDP image rendering now uses `object-contain` inside the reserved modal image frame. |
| Mobile search focus could trigger browser zoom | Accepted | Public menu search input uses 16px mobile font sizing and touch manipulation to avoid iOS zoom behavior. |
| Featured/decision blocks could widen the full page horizontally | Accepted | The featured row remains a contained horizontal carousel, with max-width/min-width guards so page-level horizontal scroll is blocked. |
| Category click should select and keep the active category visible in the horizontal rail | Accepted | Category tabs use anchor semantics plus active-tab refs and direct tab-container centering on mobile/tablet. |
| Category icon/title vertical alignment was uneven | Accepted, preserving owner choice | Shared `CategoryIcon` now renders icon and emoji choices in a stable inline-flex box; owner-selected emoji/icons are not removed. |
| Category header divider felt partial | Accepted | Section divider now spans the content width with calmer opacity instead of a short partial underline. |

## May 9, 2026 Follow-Up Interaction Hardening

| Issue Found In Public Menu | Decision | Status |
| --- | --- | --- |
| Search focus hid `Sections` and language controls, and the expansion animation made the sticky row feel unstable | Accepted | Search expansion is preserved, side controls collapse through a stable transition, and controls return when search is cleared/blurred. |
| Search expansion was removed while fixing sticky-row motion | Reversed | Search expands again on focus/type. The command row collapses side controls with a stable max-width/opacity transition instead of removing the behavior. |
| PDP opening motion felt stronger than related menu popovers | Accepted | The PDP spring treatment is now centralized as a shared menu motion primitive and reused for transient panels such as `Sections`, language selection, search-result summary, and no-result recovery. |
| Search clear icon looked like a dot and clear behavior was unclear | Accepted | Clear uses a larger explicit `LuX` glyph. In this menu context, clear exits search mode and blurs the input so the customer returns to browsing. |
| `Sections` and language dropdowns could be clipped or covered by sticky/overflow containers | Accepted | Inline category and language popovers render through portals with fixed viewport anchoring. |
| `Sections` popup stayed open while the page scrolled behind it | Accepted | Page-level scroll now closes the section popup; scrolling inside the section list itself remains allowed. |
| Horizontal category tab could feel like it lagged or vibrated after click | Accepted | Intentional category jumps now lock the chosen category during smooth scroll, suppress intermediate scroll-spy updates, and center the tab rail directly only when the tab is not already comfortably visible. |
| Passive scroll active-category tracking could flip between neighboring sections | Accepted | Scroll-spy now selects the last section that has crossed the sticky reading line instead of whichever header is nearest, reducing boundary flicker and forced rail motion. |
| Zero-result search showed final-action CTAs already available in the footer | Accepted | Zero-result recovery now stays retrieval-focused: show all plus category recovery only. |
| Featured carousel could still contribute to page-level horizontal overflow on small screens | Accepted | Featured row keeps its own horizontal scroll while card widths are capped against viewport width. |
| Single featured card looked like a partial carousel card | Accepted | When only one featured choice renders, it takes the full available row width. |
| Items without images showed blank image placeholders | Accepted | Public item cards now render image frames only when the item has an image URL. |
| Mobile PDP was still centered and image viewing/closing could feel fragile | Accepted | PDP now becomes a bottom sheet on mobile, uses contain-fit image frames, supports arrows/dots plus touch swiping, and clears modal state immediately on close before history back. |
| PDP gallery arrows could appear unresponsive while the next image was still loading | Accepted | PDP now mounts gallery images in the frame, eagerly loads non-primary slides, preloads gallery URLs through the browser image cache, and only fades to a target slide once it is decoded. |
| PDP image action buttons merged into image colors | Accepted | PDP image actions now sit in a bottom overlay control cluster with a dark translucent backing and theme-aware buttons; fullscreen image controls use the same bottom toolbar treatment. |
| Menu behind PDP remained scrollable on mobile/browser scroll | Accepted | PDP now applies a real document scroll lock while item details are open, freezes the background at its current position, keeps the modal content scrollable, and restores page scroll on close. |
| PDP close/image controls drifted from the search clear button styling | Accepted | PDP close, previous image, and next image buttons now share the same accent-tint button treatment as the search clear control. |
| Closing PDP from a top-of-menu featured item could leave sticky search/categories hidden or unclickable until scroll | Accepted | PDP scroll-lock cleanup now forces a two-frame scroll/resize repaint after body unlock. The sticky command row stays mounted and only receives a compositor repaint signal so search, sections, and language controls do not lose their hit targets. |
| PDP category identity was missing | Accepted with owner-control constraint | PDP category row now shows the category icon/emoji only when category icons are enabled and the category has an icon. |
| Footer action buttons and terminal spacing felt label-heavy and loose | Accepted | Footer actions use compact icon/text chips; compact MenuList attribution no longer adds duplicate safe-area padding. |
| Back-to-top was shifted upward after the category FAB was removed | Accepted | Back-to-top now sits at the bottom-right safe-area corner. |
| Back-to-top color felt disconnected from active category navigation | Accepted | Back-to-top now uses the same accent-tint background, accent text color, and soft border family as active category navigation. |
| Back-to-top returned the sticky search row flush against the device top edge | Accepted | Mobile/tablet sticky command controls now keep a small real top offset in addition to safe-area handling, and scroll padding uses the same buffer. |
| Sticky command-row top buffer exposed scrolled content behind it | Accepted | The sticky command row now paints a matching top cover behind the safe-area/buffer gap so menu content does not show through while scrolling. |
| Footer content needed horizontal centering | Accepted | Business identity, actions, social links, policy links, language labels, and attribution now center-align as one footer system. |
| Mobile PWA rotation felt incompatible | Existing policy kept | The tenant manifest already requests `portrait-primary` for installed customer PWAs. No artificial landscape blocker was added because mobile browsers may ignore it and public menus should remain accessible if a device is already rotated. |
| PDP crashed when stored `item.images` was not an array | Accepted | Public rendering now normalizes image data before PDP galleries, featured cards, item cards, metadata, and image-quality checks read it, preserving owner data while avoiding customer-facing crashes. |
| Installed iPhone PWA could feel like menu elements were rerendering or temporarily unclickable after repeated PDP opens/closes | Accepted | PDP now uses a lighter top-of-page scroll lock instead of always fixing the body, blurs active search input before opening item details, ignores stale close cleanup if another item is already open, and repaints sticky controls without remounting them. |
| PDP content could become very long for SMB items with long descriptions, variants, metadata, or recovery actions | Accepted | PDP keeps a capped modal/sheet height with internal touch scrolling, no longer applies body-level `touch-action: none`, and keeps the close button sticky inside the scrollable detail surface. |
| Back-to-top tap could also open the item card underneath it | Accepted | Back-to-top is now a button that scrolls only on the completed click/tap. Pointer/touch start only stops propagation, so the control does not disappear during pointerdown and retarget the final click to the item below. |

## Verification

- `npx tsc --noEmit --incremental false` passed on May 7, 2026.
- `npm run build` passed on May 7, 2026. The build still logs the existing website i18n dynamic-server warnings for cookie-using routes, but exits successfully.
- Local tenant-route smoke passed: `Host: mysalon.menulist.ai` `HEAD /bar-menu` returned `200 OK` and rewrote to `/client/bar-menu`.
- Full tenant menu GET rendered after a defensive Decision Blocks time-slot guard; saved HTML contained `_publicSearch`, `menuVersion`, and `dateModified`.
- `/offline` route smoke returned `200 OK`.
- `npx tsc --noEmit --incremental false` passed again on May 8, 2026.
- Default worker-mode `npm run build` compiled and type-checked on May 8, 2026 but hit a Next build-worker `.next/server/chunks/2274.js` page-data race; `NEXT_PRIVATE_BUILD_WORKER=0 npm run build` passed. The same pre-existing website i18n dynamic-server warnings for cookie-using routes were logged, and the build exited successfully.
- Local tenant-route runtime smoke passed on May 8, 2026 using `http://mysalon.menulist.ai:4015/bar-menu`: menu loaded, search returned results, PDP opened/closed, and category anchor navigation scrolled to the requested section.
- `npx tsc --noEmit --incremental false` passed on May 9, 2026.
- Local tenant-route browser smoke passed on May 9, 2026 using `http://mysalon.menulist.ai:4015/bar-menu`: zero-result search no longer shows final-action CTAs, PDP opened/closed without leaving a stuck overlay, featured cards still open PDP, and category navigation updates the category hash.
- Local tenant-route browser stress passed on May 9, 2026 using `http://mysalon.menulist.ai:4015/bar-menu`: five consecutive PDP open/close cycles kept search and `Sections` present and clickable, then `Sections` opened successfully.
- PDP height smoke passed on May 9, 2026 using `http://mysalon.menulist.ai:4015/bar-menu`: item detail opened with the capped scroll container and closed cleanly after the sticky-close/touch-scroll update.
- `npm run build` passed on May 9, 2026. The existing website i18n dynamic-server warnings for cookie-using routes were logged, and the build exited successfully.

## Intentionally Deferred

- AI retrieval APIs, semantic ranking, and chat-style search. Base fuzzy/transliteration menu search is implemented, but AI retrieval infrastructure remains separate.
- RTL architecture and adaptive typography by script. The current pass improves fallback and text constraints without claiming full RTL readiness.
- Verification/trust scoring, POS freshness, or AI-consumable APIs. Existing trust signals stay visible and honest; no hidden trust score was added.
- Owner-facing theme model overhaul. The current `config.design.menu` presets remain, with stricter public rendering behavior.

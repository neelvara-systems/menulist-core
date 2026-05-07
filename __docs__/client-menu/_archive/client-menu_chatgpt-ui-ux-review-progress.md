# Client Menu ChatGPT UI/UX Review Progress

**Source:** ChatGPT screenshot-only review of two public menu examples  
**Review owner:** Codex  
**Started:** May 7, 2026  
**Status:** Implemented  

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

References:
- https://www.w3.org/TR/WCAG22/
- https://web.dev/optimize-cls
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies

---

## Decision Matrix

| # | ChatGPT Topic | Verdict | Decision | Implementation Status |
| --- | --- | --- | --- | --- |
| 1 | Layout architecture | Partial | Keep current direct utility-first layout. Improve sticky navigation cohesion and footer transition; do not add homepage/hero behavior. | Done |
| 2 | Typography | Partial | Reduce decorative category heading drift in public output. Do not remove the mood system. | Done |
| 3 | Color system | Partial | Improve light containment and reduce active-state loudness. Do not create arbitrary theme freedom. | Done |
| 4 | Spacing/rhythm | Agree | Tighten category interruption, chip density, card text rhythm, and footer separation using shared output styles. | Done |
| 5 | Category navigation | Partial | Category rail remains canonical and FAB becomes a section navigator. Owner-selected category icons, including emoji, are preserved. | Done |
| 6 | Search UX | Agree with constraints | Search is already sticky; strengthen affordance/focus and keep exact, calm retrieval UI. Fuzzy/semantic search is not part of this pass. | Done |
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

## Accepted Implementation Scope

- Public category icons preserve owner-selected icon choices, including emoji values, through the shared `CategoryIcon` path: `src/components/atoms/CategoryIcon/index.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx`.
- Sticky navigation becomes visually unified: stronger search affordance, tighter category chips, calmer active state: `src/components/templates/main-app/projects/b2cView/output/MenuSearchBar.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`.
- Floating category button is renamed from vague "Menu" to "Sections" and opens "Menu sections": `src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx`.
- Category headings become structural markers rather than theme-heavy title screens: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/designSystem/index.ts`.
- Item cards enforce title/description line limits and softer price weight: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`.
- Image-enabled layouts reserve stable image slots and show intentional placeholders when an item has no image: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`.
- Footer/platform attribution becomes quiet infrastructure attribution: `src/components/customer/PublicMenuListAttribution.tsx`.
- Light theme containment is strengthened through safer surface/background/border tokens: `src/components/templates/main-app/projects/b2cView/designSystem/index.ts`.

## Rejected For This Pass

- Full custom theme redesign.
- Arbitrary owner design freedom.
- Feed-like/image-first menus.
- Fuzzy/semantic/AI search UI.
- Public engagement counters or popularity theater.
- Extra marketing CTAs on customer-facing menu footer.

## Granular Suggestion Coverage

This appendix exists because the source review had many small points inside the 19 larger sections. Each point below was considered against the real codebase, owner controls, public-route doctrine, Firebase cost discipline, accessibility, and MenuList's constrained public-surface model.

### 1. Layout Architecture

| Suggestion | Decision | Status |
| --- | --- | --- |
| Keep direct utility-first page start instead of hero/welcome page | Accepted | Existing behavior preserved in `menuPageNew.tsx`. |
| Strengthen one dominant orientation model | Accepted | Sticky search/category controls and `Sections` navigator tightened. |
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
| Bottom sheet/full navigator concept | Partial | Existing floating category popover clarified; larger navigator remains future work. |
| Improve active-state clarity | Accepted | Active chip/popover state made calmer but clearer. |
| Use localization fallback for category labels | Accepted | `getLocalizedText`/`getMenuText` paths used. |
| Remove raw emoji category icons | Rejected after owner correction | Owner-selected icon choices, including emoji, are preserved. |
| Improve weighted scroll tracking | Deferred | Existing scroll spy remains; deeper tracking needs behavior testing. |

### 6. Search UX

| Suggestion | Decision | Status |
| --- | --- | --- |
| Make search more structurally primary | Accepted | Search focus/containment strengthened. |
| Keep search near top before categories | Accepted | Existing placement preserved. |
| Sticky search behavior | Existing | Search already lives in sticky controls. |
| Better focus state | Accepted | Focus border, ring, and icon emphasis added. |
| Better empty state recovery | Existing/accepted | Existing no-result recovery actions retained. |
| Typo tolerance/fuzzy search | Deferred | Needs separate retrieval/data design. |
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
| Improve perceived search speed | Partial | Focus/UI strengthened; debounce/search logic unchanged. |
| Improve weak-network/offline behavior | Existing/partial | PWA/offline docs retained; no new cache policy added. |
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
| Transliteration-aware search | Deferred | Requires search/indexing work. |

### 16. AI/AEO Readiness

| Suggestion | Decision | Status |
| --- | --- | --- |
| Preserve semantic hierarchy | Accepted | Business/category/item structure retained. |
| Keep canonical URLs correct | Accepted | Outlet-aware redirect/canonical fixes are in `page.tsx`. |
| Keep visible content aligned with schema | Accepted | No hidden/misleading schema added. |
| Strengthen freshness metadata | Existing/documented | Live/trust metadata retained. |
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
| Machine readability matters | Accepted | Canonical/schema alignment preserved; no hidden claims added. |
| QR/public URL continuity matters | Existing/accepted | Outlet/canonical fixes from the audit preserve URL correctness. |
| Avoid feature creep | Accepted | Explicit rejected/deferred list maintained. |

## Verification

- `npx tsc --noEmit --incremental false` passed on May 7, 2026.
- `npm run build` passed on May 7, 2026. The build still logs the existing website i18n dynamic-server warnings for cookie-using routes, but exits successfully.
- Local tenant-route smoke passed: `Host: mysalon.menulist.ai` `HEAD /bar-menu` returned `200 OK` and rewrote to `/client/bar-menu`.

## Intentionally Deferred

- Fuzzy, semantic, or transliteration-aware search. Existing exact local filtering stays; future retrieval work needs a separate data/search design.
- RTL architecture and adaptive typography by script. The current pass improves fallback and text constraints without claiming full RTL readiness.
- Verification/trust scoring, POS freshness, or AI-consumable APIs. Existing trust signals stay visible and honest; no hidden trust score was added.
- Owner-facing theme model overhaul. The current `config.design.menu` presets remain, with stricter public rendering behavior.

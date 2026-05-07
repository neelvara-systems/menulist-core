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
| 5 | Category navigation | Agree with constraints | Category rail remains canonical; FAB becomes a section navigator. Raw emoji category identity is disabled on public output. | Done |
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

- Public category icons use controlled Lucide glyph fallback instead of raw emoji rendering: `src/components/atoms/CategoryIcon/index.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx`.
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

## Verification

- `npx tsc --noEmit --incremental false` passed on May 7, 2026.
- `npm run build` passed on May 7, 2026. The build still logs the existing website i18n dynamic-server warnings for cookie-using routes, but exits successfully.

## Intentionally Deferred

- Fuzzy, semantic, or transliteration-aware search. Existing exact local filtering stays; future retrieval work needs a separate data/search design.
- RTL architecture and adaptive typography by script. The current pass improves fallback and text constraints without claiming full RTL readiness.
- Verification/trust scoring, POS freshness, or AI-consumable APIs. Existing trust signals stay visible and honest; no hidden trust score was added.
- Owner-facing theme model overhaul. The current `config.design.menu` presets remain, with stricter public rendering behavior.

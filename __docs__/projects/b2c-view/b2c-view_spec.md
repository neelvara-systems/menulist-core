# B2C View — Current Customer Menu Presentation Specification

**Status:** Local source complete; not current launch certification
**Last Updated:** July 16, 2026

This is the maintained specification for MenuList menu design and customer presentation. Earlier broad design notes are preserved in `_archive/b2c-view_spec-pre-2026-07-16.md` and do not override current code.

**Launch boundary:** Release approval still requires the [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md), Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

## Product boundary

The feature lets an owner choose a constrained customer-menu presentation without creating an unbounded page builder. It covers:

- five menu moods;
- mood-compatible List, Grid, or Card structure;
- recommended style presets and a visual preset preview;
- optional item images, category icons, category navigation tabs, price display, brand accent, and menu background;
- the same normalized result in owner preview and public output;
- responsive customer browsing, search, filters, item details, availability, and public item links.

It does not add ordering, checkout, customer accounts, free-form fonts, arbitrary CSS, or a second mobile data model.

## Canonical mood and layout contract

`src/components/templates/main-app/projects/b2cView/designSystem/index.ts` is the source of truth.

| Mood | Allowed structural layouts | Preferred layout on mood change |
| --- | --- | --- |
| Clean | List, Grid | List |
| Warm | List, Card, Grid | Card |
| Premium | List, Card | List |
| Bold | Card, Grid | Card |
| Fast | List | List |

Category tabs are a separate mobile/tablet navigation option, not a structural layout. A legacy saved `layout: "tabs"` value becomes the selected mood's safe default layout while preserving `showCategoryTabs: true` unless a real boolean explicitly overrides it.

Unknown, prototype-chain, whitespace/case, legacy mood, incompatible layout, malformed boolean, array, or non-object config cannot become unsupported public output. Known legacy mood names are mapped; other invalid values fall back to Clean/List and true display defaults except category tabs, which default false.

## Owner requirements

Desktop and MobileShell must use the same preset, compatibility, normalization, and publish helpers.

- Changing mood selects that mood's preferred compatible layout.
- Only compatible layouts are offered and accepted.
- Recommended presets must themselves be compatible.
- A custom accent may be selected, but public accent and price colors fall back when normal-text contrast is below WCAG AA.
- Background images are prepared through the shared media profile before upload.
- Local success state changes only after `publishProject()` returns the acknowledged project.
- Embedded MobileShell state receives the acknowledged project rather than a speculative draft.

## Customer presentation requirements

- Public rendering re-normalizes mood/layout rather than trusting stored config.
- Brand accent and baseline price colors retain at least 4.5:1 contrast against their mood background; tag and warning text use readable foreground pairs rather than low-contrast accent tints.
- Background images accept only HTTPS or safe root-relative persisted URLs. Data-image URLs are allowed only in explicit owner preview before upload. Fixed background attachment is not used.
- Item images honor the selected layout and the per-category image cap. Failed images retain a reserved fallback slot.
- When price display is enabled, base price or the active option-price range appears in the list. Every active priced option is shown before item interaction and again in item details. Inactive, unpriced, and non-finite options are excluded.
- Price-driven recommendation and analytics fields remain absent when menu price display is disabled. Variant items do not report a stale base price as the tap/view price.
- Unavailable items remain readable and keyboard-openable for their explanation/recovery details, with a visible unavailable label and dashed presentation.
- All current categories/items remain in the document. The prior estimated-height placeholder for 150+ items is retired because it broke layout stability, search results, category navigation, and off-screen item deep links.

## Persistence and public truth

Design settings remain inside the existing project document. Desktop and MobileShell publish with `publishProject()` and an expected modification value. Standalone and linked-outlet branches record published menu truth and invalidate the project/menu public cache path after acknowledged persistence. Linked outlets continue through `/api/projects/outlet-save` and existing outlet override policy.

No new collection, listener, rule, index, Cloud Function, scheduler, or owner setting is introduced by this presentation hardening.

## Acceptance boundary

Local acceptance requires:

- exact mood/layout compatibility and normalization tests;
- preset compatibility and color contrast tests;
- public background and option-price runtime tests;
- desktop/MobileShell source parity;
- public rendering, publish acknowledgement, published-truth, and cache-invalidation source checks;
- exact TypeScript, scoped lint, dependency freeze, documentation links, and diff integrity.

The source gate is not current launch certification. Browser/device visual inspection must still cover every mood/layout pair, long localized text, background images, unavailable items, mixed option prices, large menus, keyboard navigation, low-bandwidth image failure, and public cache refresh.

# PDF Surface — Documentation Index

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** 2.2 — Professional Bistro Layout with Michelin Typography
**Status:** Always-on compatibility bridge to Menu Card Export
**Last Updated:** July 16, 2026

---

## Documents

| File                            | Audience              | Purpose                                                       |
| ------------------------------- | --------------------- | ------------------------------------------------------------- |
| `pdf-surface_spec.md`           | Product / CEO         | Business requirements, design decisions, what owners see      |
| `pdf-surface_impl.md`           | Engineers             | Architecture, design tokens, code references, version history |
| `pdf-surface_firebase.md`       | Engineering / Finance | Firebase cost analysis ($0.00 — fully client-side)            |
| `pdf-surface_mobile-support.md` | Engineering           | 4-gate admission test, mobile implementation status           |
| `pdf-surface_marketing.md`      | Sales / Support       | Talking points, differentiators, language governance          |
| `pdf-surface_helpdoc.md`        | End users             | Step-by-step guide, FAQ                                       |
| `pdf-surface_website.md`        | Marketing             | Public-facing copy, language governance compliance            |

---

## Current Runtime Boundary

Legacy PDF entry points remain available without a separate PDF Surface toggle.
`src/lib/export/menuPdfGenerator.ts` adapts the legacy input into Menu Card
Export's deterministic print source and renderer.

When `ENABLE_MENU_CARD_EXPORT` is on, the normal owner action opens `/use-menulist/menu-card-export`. Older or flag-off callers may still call `generateMenuPdf()`, but the resulting file uses the same Menu Card Export rendering contract.

**Compatibility entry points:**

- Desktop: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`
- Mobile: `src/components/mobile/screens/MobileShareScreen.tsx`

**Generator:** `src/lib/export/menuPdfGenerator.ts`

**Runtime invariant:** the compatibility adapter is always available; the routed
workflow is controlled by `FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT`.

---

## Successor Decision

The successor is implemented: [Menu Card Export](../menu-card-export/README.md) is the canonical routed Print Menu workflow under `/use-menulist/menu-card-export`. It owns job presets, preflight warnings, controlled styles, store-scoped local export history, print-shop packet support, QR scan checks, and freshness detection.

Migration rule:

- Keep PDF Surface only as the compatibility bridge while legacy callers remain.
- New print workflow decisions belong in `__docs__/menu-card-export/`.
- Do not expand PDF Surface into a full route, print-shop packet system, or design editor.

---

## Current Output Ownership

The compatibility adapter does not specify a separate bistro layout. Current visual rules, business-type profiles, page styling, logo/color behavior, currency formatting, live-menu QR, attribution, metadata, filenames, and source references come from `src/lib/menu-card-export/`. Historical v2.2 standalone layout material is retained under `_archive/` only.

---

## Related Docs

- `__docs__/pricing-integrity-system/` — FR-7.3 (PDF Updated On requirement)
- `__docs__/physical-surfaces/` — legacy campaign-card compatibility boundary
- `__docs__/print-menu-surfaces/` — supported scan-first table/counter print layouts

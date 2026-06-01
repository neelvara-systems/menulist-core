# PDF Surface — Documentation Index

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** 2.2 — Professional Bistro Layout with Michelin Typography
**Status:** Active, `ENABLE_PDF_SURFACE: true`
**Last Updated:** 2026-03

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

## Quick Reference

**Entry point:** Share Modal → Download PDF button

- Desktop: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`
- Mobile: `src/components/mobile/screens/MobileShareScreen.tsx`

**Generator:** `src/lib/export/menuPdfGenerator.ts`

**Feature flag:** `FEATURE_FLAGS.ENABLE_PDF_SURFACE` in `src/config/features.ts`

---

## Successor Planning

PDF Surface remains the active lightweight PDF path. It is not the long-term product surface for print.

The planned successor is [Menu Card Export](../menu-card-export/README.md), a routed Print Menu workflow under `/use-menulist/menu-card-export`. It adds job presets, preflight warnings, controlled styles, export history, print-shop packet support, QR scan checks, and freshness detection.

Migration rule:

- Keep PDF Surface available while Menu Card Export is flagged off or still proving parity.
- New print workflow decisions belong in `__docs__/menu-card-export/`.
- Do not expand PDF Surface into a full route, print-shop packet system, or design editor.

---

## v2.1 Design Summary (Bistro Style)

```
┌─────────────────────────────────────────────────────┐
│               STORE NAME IN WHITE                   │  ← charcoal band (#2d2d2d)
│         address · contact (if provided)             │
└─────────────────────────────────────────────────────┘

▌ STARTERS                                             ← 3mm accent bar + uppercase
──────────────────────────────────────────────────────

  Bruschetta                            ₹ 180.00      ← clean alignment (standard density)
    Toasted bread, tomatoes, basil                      ← italic, indented, gray
    · Large  ₹220                                       ← attribute variant

──────────────────────────────────────────────────────
m-x9af2  │  Page 1 of 2  │  Menu Updated: Mar 1, 2026  ← footer
View online: joespizza.menulist.ai                         ← URL (page 1 only)
```

---

## Related Docs

- `__docs__/pricing-integrity-system/` — FR-7.3 (PDF Updated On requirement)
- `__docs__/physical-surfaces/` — Tent cards and counter stickers (separate feature)

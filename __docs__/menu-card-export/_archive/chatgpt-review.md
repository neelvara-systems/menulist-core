# Menu Card Export — ChatGPT Conversation Review

**Source:** Attached ChatGPT conversation about MenuList PDF export
**Reviewed:** June 1, 2026
**Reviewer:** Codex
**Status:** Complete

---

## Executive Summary

The conversation is directionally strong. Its most important correction is that PDF export should not remain a single button. MenuList needs a routed Menu Card Export surface with preview, safe styles, automatic layout, export history, and freshness checks.

The main adjustment is implementation strategy. ChatGPT recommends an HTML/CSS plus headless-browser PDF renderer. That is a good long-term rendering pattern, but the live repo currently uses `jsPDF` and does not have Playwright/Puppeteer installed. The plan therefore requires a renderer adapter boundary and starts from repo-safe dependencies unless the heavier runtime is explicitly validated.

---

## Themes Identified

| Theme | ChatGPT suggestion | Codex verdict |
| --- | --- | --- |
| Product shape | Reframe from PDF button to print menu/card export. | Agree. |
| UI surface | Use a style gallery, preview, settings, export history. | Agree, but put it on a route. |
| Templates | Fixed professional templates, not free-form editing. | Agree. |
| Layout | Category-first, measurement-first pagination. | Agree. |
| Snapshot/freshness | Store version, hash, and stale status. | Agree. |
| AI | Advice only, never final rendering. | Agree with flag-off default. |
| Renderer | Use headless browser PDF. | Partial. Needs repo/runtime proof. |
| Scope | Multiple templates and presets. | Partial. Registry yes; expose only validated styles. |

---

## Codebase Cross-Check

| Claim | Live repo evidence | Decision |
| --- | --- | --- |
| Current PDF is a generator, not a routed product. | `generateMenuPdf()` is a utility in `src/lib/export/menuPdfGenerator.ts:274`; desktop/mobile call it directly. | Valid. |
| Existing UI is button-based. | Share modal button at `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:320`; Use MenuList asset at `src/components/templates/main-app/useMenuList/index.tsx:940`; Mobile tile at `src/components/mobile/screens/MobileShareScreen.tsx:878`. | Valid. |
| Existing docs reject a new UI surface. | `__docs__/pdf-surface/pdf-surface_spec.md:32` says owners access PDF from Share Modal and there is no new UI surface. | Supersede with new docs, do not silently edit behavior. |
| Snapshot/hash concept exists. | `createMenuVersion()` exists at `src/lib/export/menuPdfGenerator.ts:153`. | Expand into durable `printSourceHash`. |
| Menu Kit already creates physical assets. | Menu Kit generator orchestrates print/social assets at `src/lib/menu-kit/menuKitGenerator.ts:36`. | Keep Menu Card Export separate from Menu Kit. |
| Persistent export history does not exist. | Current PDF freshness uses browser `localStorage`, not Firestore. | Add `menuCardExports` records. |

---

## Accepted Recommendations

1. Create a separate route.
2. Use fixed, controlled style families.
3. Reject design-editor behavior.
4. Build a deterministic layout engine.
5. Preserve menu/category/item order.
6. Add preview before export.
7. Add export history and freshness state.
8. Keep QR pointing to the live menu.
9. Keep mobile parity from the start.

---

## Adjusted Recommendations

| ChatGPT point | Adjustment |
| --- | --- |
| Start with 6 template families | Use 3 exposed styles first: Classic, Compact, Premium. Registry can define more. |
| Use Playwright/Chromium immediately | Use renderer adapter; prove deployment/runtime before adding heavy dependency. |
| Add AI advisor | Flag off by default and never part of final render truth. |
| Store all exports indefinitely | Retain a bounded history to control Storage cost. |

---

## Rejected Recommendations

| Suggestion | Reason |
| --- | --- |
| Free-form design controls | Violates MenuList owner-load and source-of-truth doctrine. |
| AI-generated final pages | Risky for prices, names, QR, and public trust. |
| Manual page-by-page editing | Creates a second menu-maintenance system. |
| Public anonymous PDF generation | Adds abuse, cost, and data-leak risk. |

---

## Final Decision

Create `__docs__/menu-card-export/` as the successor feature documentation set. Keep `__docs__/pdf-surface/` as the current live implementation reference until the new route is built and migrated.

---

## Post-Research Update — June 1, 2026

Web research validated the separate-route decision and expanded the feature shape beyond "better PDF export."

Added decisions:

1. Add job presets: Home Print, WhatsApp PDF, Print-shop packet, Table menu, Takeaway insert, Staff reference, and batch mode.
2. Add preflight checks for missing prices, long text, QR quiet zone/module size, bleed/safety margins, low-resolution photos, file size, and stale menu state.
3. Add print-shop packet support behind a flag.
4. Treat QR as a first-class print block that points to the live menu, not as decoration.
5. Preserve selectable PDF text and avoid screenshot-only PDF output.
6. Do not claim PDF/UA compliance until tagged PDF verification exists.

See `__docs__/menu-card-export/menu-card-export_research.md`.

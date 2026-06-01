# Menu Card Export

**Status:** Production-ready client-first route with Pro/Premium layout suggestion
**Owner route:** `/use-menulist/menu-card-export`
**Current predecessor:** `__docs__/pdf-surface/`
**Last Updated:** June 2, 2026

---

## What This Is

Menu Card Export is the routed owner surface for creating print-ready menu files from current MenuList truth. It replaces the current single-click PDF download with a complete print workflow: choose the job, pick a controlled style, review preflight, preview pages, export, and see whether older files still match the current menu.

This is not a design editor. The route keeps owners out of freeform layout work and keeps printable output tied to the same menu truth used by QR menus, official pages, screens, and Menu Kit.

---

## Product Decision

Build this as a dedicated owner route, not another button inside Share Modal.

| Decision | Outcome |
| --- | --- |
| Route | `/use-menulist/menu-card-export` |
| Entry points | Use MenuList card, project Share modal, Mobile Share print section, Mobile Menu command sheet, More > Modules |
| Primary action | Print menu / export menu card |
| Current `Menu PDF` button | Becomes a route entry point or legacy quick export while migration is active |
| Renderer model | Deterministic print model, template registry, preflight engine, layout engine, local export record |
| Owner controls | Job preset, style, paper, density, logo, descriptions, QR, contact, safe category-level layout overrides |
| Core presets | Home print PDF, WhatsApp PDF, print-shop packet, table menu |
| Layout suggestion | Pro/Premium-only AI recommendation that returns a bounded JSON recipe; owner must apply it |
| Rejected | Drag/drop editor, arbitrary text boxes, custom CSS, font uploads, per-item styling |

---

## Document Index

| File | Purpose | Audience |
| --- | --- | --- |
| [Research](./menu-card-export_research.md) | Market research, print standards, competitive lessons, final product decisions | Founder / Product / Engineering |
| [Spec](./menu-card-export_spec.md) | Business requirements, product boundaries, ChatGPT validation | Founder / Product |
| [Implementation](./menu-card-export_impl.md) | Route, modules, data contracts, APIs, renderer plan | Engineering |
| [Firebase](./menu-card-export_firebase.md) | Firestore, Storage, API, cost model | Engineering / Finance |
| [Mobile Support](./menu-card-export_mobile-support.md) | Mobile admission, route behavior, parity | Product / Engineering |
| [Marketing](./menu-card-export_marketing.md) | Internal positioning and sales notes | Sales / Support |
| [Website](./menu-card-export_website.md) | Public website copy candidates | Marketing |
| [Help Doc](./menu-card-export_helpdoc.md) | Customer-facing help article draft | Support |
| [Test Cases](./menu-card-export_test-cases.md) | QA matrix and release gates | QA / Engineering |
| [Validation](./menu-card-export_validation.md) | Implementation evidence, cost checks, validation commands | Engineering |
| [ChatGPT Review](./_archive/chatgpt-review.md) | Conversation review and decision matrix | Engineering |

---

## Runtime Baseline

The predecessor PDF Surface remains available only as the flag-off fallback. The active Print Menu workflow is the routed implementation.

| Current behavior | Evidence |
| --- | --- |
| PDF generation uses the existing `jsPDF` dependency in the browser. | `src/lib/export/menuPdfGenerator.ts:1`, `src/lib/export/menuPdfGenerator.ts:274` |
| The predecessor generator builds a sanitized snapshot from active items/categories. | `src/lib/export/menuPdfGenerator.ts:175` |
| The predecessor PDF is A4 portrait and single-renderer based. | `src/lib/export/menuPdfGenerator.ts:294` |
| Project Share modal routes to Print Menu when the feature flag is on. | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:250`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:327` |
| Use MenuList routes to Print Menu when the feature flag is on. | `src/components/templates/main-app/useMenuList/index.tsx:251`, `src/components/templates/main-app/useMenuList/index.tsx:951` |
| Shared route helper preserves project selection in entry links. | `src/lib/menu-card-export/navigation.ts:1` |
| Mobile Share routes to Print Menu when the feature flag is on. | `src/components/mobile/screens/MobileShareScreen.tsx:461`, `src/components/mobile/screens/MobileShareScreen.tsx:889` |
| Mobile Menu command sheet routes to Print Menu and saves pending edits first. | `src/components/mobile/screens/MobileMenuScreen.tsx:2742`, `src/components/mobile/screens/MobileMenuScreen.tsx:2749`, `src/components/mobile/components/MobileMenuCommandSheet.tsx:185` |
| More > Modules exposes Print Menu for discoverability beside Dashboard. | `src/components/mobile/screens/MobileMoreScreen.tsx:442` |
| Existing PDF Surface docs explicitly say there was no predecessor UI surface; Menu Card Export supersedes that with a dedicated route. | `__docs__/pdf-surface/pdf-surface_spec.md:34` |

---

## Relationship To Existing Features

| Feature | Relationship |
| --- | --- |
| PDF Surface | Current lightweight PDF generator. Menu Card Export supersedes it as the long-term route. |
| Menu Kit | QR deployment pack. Menu Card Export produces the full printable menu/menu-card workflow and print-shop packet. |
| Use MenuList | Parent output center. It links to the routed export workflow instead of trying to contain all print controls. |
| Public menu / OBP | Source of truth remains unchanged. Export reads from canonical project/store data and links back to the live menu. |
| Menu snapshots | Export records must reference a snapshot/hash so freshness can be checked. |

---

## Research-Backed Feature Pillars

| Pillar | What it means |
| --- | --- |
| Job presets, not PDF jargon | Owner chooses `Home print`, `WhatsApp`, or `Print-shop packet`; the system maps that to paper, density, QR, bleed, and file settings. |
| Preflight before export | The route flags missing prices, long text, low-resolution photos, QR scan risk, bleed/safety issues, stale menu state, and page overflow before the owner prints. |
| QR bridge to live menu | Printed files can include a scan-safe QR back to the current mobile menu, not a stale PDF. |
| Print-shop handoff | A packet can include the print PDF, home-printer proof, print instructions, and QR test checklist. |
| Freshness history | Old exports show whether the source menu changed and can be regenerated from the same settings. |

---

## Implementation Status

Implemented and validated in code:

- Route: `src/app/(main)/use-menulist/menu-card-export/page.tsx`
- Main UI: `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx`
- Client-side print source, preflight, preview, PDF render, packet ZIP, local history: `src/lib/menu-card-export/`
- Entry points: Use MenuList, project Share modal, Mobile Share, Mobile Menu command sheet, and More > Modules.
- Feature flags control route, local history, print-shop packet visibility, batch exposure, and Pro/Premium layout suggestion.
- Multi-project selection uses the shared project selector pattern and guards against stale project data while switching.
- Real project data shape support covers top-level extracted data and file-based `project.files[].extractedData.data` menus.
- Pro/Premium layout suggestion: `src/app/api/menu-card-export/design-advisor/route.ts`, `src/lib/menu-card-export/ai/designAdvisor.ts`, `src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts`.
- AI accounting uses `AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR` and consumes one enhancement unit only after a valid recommendation is returned.
- Verification command: `npm run verify:menu-card-export`
- Real-data runtime QA generated PDFs and print-shop packet ZIPs from an active multi-project account without adding Firebase writes or Storage uploads.

Firebase cost decision:

- Default export path performs **zero Firestore writes** and **zero Storage uploads**.
- Empty stores stay read-only: the route uses an existing-projects summary helper and does not create a default menu from the print workflow.
- Export history is local to the browser/device.
- Server persistence/export-storage API routes are intentionally not added in the default implementation to protect Firebase cost.
- The AI layout suggestion is a separate owner-click route, available only to Pro/Premium subscriptions and blocked before provider call for other plans.

---

## Release Principle

The feature is complete only when the same menu, template version, settings, and source hash produce the same export every time.

No new public menu write path is introduced. Public cache invalidation is not required unless implementation mutates public `projects` or `stores` truth, which this plan forbids.

## Freeze Notes

June 2, 2026 mobile parity guardrails:

- Desktop Use MenuList, project Share modal, Mobile Share, Mobile Menu command sheet, and More > Modules all enter the routed Print Menu workflow.
- Handheld layout routing bypasses the generic mobile shell for `/use-menulist/menu-card-export`.
- Mobile Menu saves pending local edits before opening Print Menu so the route reads the latest saved menu truth.
- More keeps Print Menu in the Modules list beside Dashboard for discovery; the analytics dashboard itself stays metric-focused.
- Local export history obeys `ENABLE_MENU_CARD_EXPORT_HISTORY`.
- Print-shop packet visibility and creation obey `ENABLE_MENU_CARD_EXPORT_PRINT_SHOP`.
- Pro/Premium layout suggestion remains deterministic-advice only; final PDF/packet rendering is not AI-rendered.

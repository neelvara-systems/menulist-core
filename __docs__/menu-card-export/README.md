# Menu Card Export

**Status:** Source-gated route evidence; not current launch certification
**Owner route:** `/use-menulist/menu-card-export`
**Current predecessor:** `__docs__/pdf-surface/`
**Last Updated:** June 3, 2026

> **Current release boundary (July 2, 2026):** This document records source/runtime evidence only. It is not current production-release approval. Current Menu Card Export approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, target deploy evidence, and production-host smoke.

---

## What This Is

Menu Card Export is the routed owner surface for creating print-ready files from current MenuList truth. It replaces the current single-click PDF download with a complete print workflow: choose the job, pick a controlled style, review preflight, preview pages, export, and see whether older files still match the current menu, service list, or catalog.

This is not a design editor. The route keeps owners out of freeform layout work and keeps printable output tied to the same business truth used by QR pages, official pages, screens, and Menu Kit.

---

## Product Decision

Build this as a dedicated owner route, not another button inside Share Modal.

| Decision | Outcome |
| --- | --- |
| Route | `/use-menulist/menu-card-export` |
| Entry points | Use MenuList card, project Share modal, Mobile Share print section, Mobile Menu command sheet, More > Modules |
| Primary action | Print menu/service/catalog file |
| Current `Menu PDF` button | Opens the route when the feature flag is on; the flag-off quick export now uses the same branded renderer through a compatibility bridge |
| Renderer model | Deterministic print model, template registry, preflight engine, layout engine, local export record |
| Owner controls | Job preset, style, paper, density, logo, descriptions, QR, contact, safe category-level layout overrides |
| Core presets | Home print PDF, WhatsApp PDF, print-shop packet, table menu |
| Auto design | Client-side automatic style, density, and safe toggle selection from business type and content shape |
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

The predecessor PDF Surface path now acts as a compatibility bridge. When the routed workflow is enabled, owners enter Print Menu. When a legacy/flag-off button still calls `generateMenuPdf()`, it delegates to the same Menu Card Export print source and renderer, so the output still has logo, brand color, business profile, currency formatting, physical-menu styling, metadata, and source hash. MenuList logo/name/domain attribution is visible for non-Premium stores and hidden only when the already-loaded store plan is `premium`.

| Current behavior | Evidence |
| --- | --- |
| Legacy `generateMenuPdf()` delegates to Menu Card Export instead of drawing its own plain PDF. | `src/lib/export/menuPdfGenerator.ts` |
| Legacy print-copy calls pass store/project context into the bridge for logo, brand color, business profile, and currency. | `src/components/templates/main-app/useMenuList/index.tsx`, `src/components/mobile/screens/MobileShareScreen.tsx`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` |
| Project Share modal routes to Print Menu when the feature flag is on. | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:250`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:327` |
| Use MenuList routes to Print Menu when the feature flag is on. | `src/components/templates/main-app/useMenuList/index.tsx:251`, `src/components/templates/main-app/useMenuList/index.tsx:951` |
| Shared route helper preserves project selection in entry links. | `src/lib/menu-card-export/navigation.ts:1` |
| Shared export controller keeps desktop and mobile behavior aligned. | `src/hooks/useMenuCardExportController.ts:87` |
| Dedicated mobile Print Menu screen renders inside the MobileShell More stack on handheld devices. | `src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx:59` |
| Mobile Share routes to Print Menu when the feature flag is on. | `src/components/mobile/screens/MobileShareScreen.tsx:461`, `src/components/mobile/screens/MobileShareScreen.tsx:889` |
| Mobile Menu command sheet routes to Print Menu and saves pending edits first. | `src/components/mobile/screens/MobileMenuScreen.tsx:2742`, `src/components/mobile/screens/MobileMenuScreen.tsx:2749`, `src/components/mobile/components/MobileMenuCommandSheet.tsx:185` |
| More > Modules exposes Print Menu for discoverability beside Dashboard. | `src/components/mobile/screens/MobileMoreScreen.tsx:442` |
| Existing PDF Surface docs explicitly say there was no predecessor UI surface; Menu Card Export supersedes that with a dedicated route. | `__docs__/pdf-surface/pdf-surface_spec.md:34` |

---

## Relationship To Existing Features

| Feature | Relationship |
| --- | --- |
| PDF Surface | Compatibility bridge only. It delegates to Menu Card Export so older quick-download buttons do not produce a different plain PDF. |
| Menu Kit | QR deployment pack. Menu Card Export produces the full printable menu/menu-card workflow and print-shop packet. |
| Use MenuList | Parent output center. It links to the routed export workflow instead of trying to contain all print controls. |
| Public menu / OBP | Source of truth remains unchanged. Export reads from canonical project/store data, reuses the OBP store logo and `publicPresence.accentColor`, follows the stored business type/category, and links back to the live public surface. |
| Menu snapshots | Export records must reference a snapshot/hash so freshness can be checked. |

---

## Research-Backed Feature Pillars

| Pillar | What it means |
| --- | --- |
| Job presets, not PDF jargon | Owner chooses `Home print`, `WhatsApp`, or `Print-shop packet`; the system maps that to paper, density, QR, bleed, and file settings. |
| Preflight before export | The route flags missing prices, long text, low-resolution photos, QR scan risk, bleed/safety issues, stale menu state, and page overflow before the owner prints. |
| QR bridge to live surface | Printed files can include a scan-safe QR back to the current mobile menu, service list, or catalog, not a stale PDF. |
| Print-shop handoff | A packet can include the print PDF, home-printer proof, print instructions, and QR test checklist. |
| Freshness history | Old exports show whether the source menu changed and can be regenerated from the same settings. |
| Export identification | PDF metadata, generated date, deterministic filename, and print-shop source summary make files easier to find and support without adding Firebase storage. |

---

## Implementation Status

Implemented and validated in code:

- Route: `src/app/(main)/use-menulist/menu-card-export/page.tsx`
- Main UI: `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx`
- Client-side print source, preflight, preview, PDF render, packet ZIP, local history: `src/lib/menu-card-export/`
- Legacy print-copy bridge: `src/lib/export/menuPdfGenerator.ts` delegates old `generateMenuPdf()` calls to the Menu Card Export renderer.
- Entry points: Use MenuList, project Share modal, Mobile Share, Mobile Menu command sheet, and More > Modules.
- Feature flags control route, local history, print-shop packet visibility, batch exposure, and Pro/Premium layout suggestion.
- Multi-project selection uses the shared project selector pattern and guards against stale project data while switching.
- Real project data shape support covers top-level extracted data and file-based `project.files[].extractedData.data` menus.
- PDF output reuses the existing store logo and OBP `publicPresence.accentColor`; brand color, logo, business type/category, catalog kind, offering kind, and currency are included in the local source hash so old plain, wrong-profile, or wrong-currency exports are not reused after store changes.
- PDF output uses density-based font sizes and store currency settings. INR/rupee output is rendered as PDF-safe `Rs 120` text with whole-number prices kept clean and price ranges preserved.
- PDF output now uses controlled physical styling: warm paper tone, page border, title plaque/editorial/header card, section treatments, and price leaders where the selected template and business type benefit from them.
- PDF output footer includes subtle `Menu powered by MenuList | menulist.ai` attribution with the MenuList logo mark on non-Premium stores. Premium stores hide this visible attribution through the shared MenuList branding policy.
- Use MenuList, mobile Share, and project Share legacy quick-download paths use the same renderer bridge, so flag-off/legacy PDF output no longer falls back to an unbranded plain PDF.
- PDF output resolves business type/category through the shared MenuList business taxonomy: food gets menu-style output, retail/product businesses get catalog-style output, and service/professional/health businesses get cleaner service-list output without owners choosing another setting.
- Auto print design chooses the starting style, density, description, QR, and contact defaults from business type and content shape before any AI/provider call. Owners can still override style/density/options.
- PDF output sets document properties, uses generated-date/source-reference filenames, and keeps internal source hashes out of the visible customer footer.
- Print-shop packets include a source summary with preset, style/template version, page count, generated date, menu updated date, source reference, renderer version, and live menu destination.
- Pro/Premium layout suggestion: `src/app/api/menu-card-export/design-advisor/route.ts`, `src/lib/menu-card-export/ai/designAdvisor.ts`, `src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts`.
- AI accounting uses `AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR` and consumes one enhancement unit only after a valid recommendation is returned.
- Verification command: `npm run verify:menu-card-export`
- Real-data runtime QA generated PDFs and print-shop packet ZIPs from an active multi-project account without adding Firebase writes or Storage uploads.

Firebase cost decision:

- Default export path performs **zero Firestore writes** and **zero Storage uploads**.
- Brand color/logo reuse comes from the existing platform store context. When `Include logo` is on, logo embedding may download the existing logo image once during final render; it is cached in memory for repeat exports in the same route session.
- Business-type profile reuse comes from the already-loaded store context. It adds no Firestore read, write, Storage upload, Cloud Function, rule, or index.
- Auto print design is browser CPU work over the already-built print source. It adds no Firebase cost and no AI unit usage.
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
- Handheld layout routing maps `/use-menulist/menu-card-export` and all mobile entry points into `MobileShell` as `more/printMenu`; it does not use a route-level mobile shell bypass.
- Desktop and mobile share `useMenuCardExportController`, so project loading, export generation, local history, and AI advisor behavior stay aligned.
- Mobile Menu saves pending local edits before opening Print Menu so the route reads the latest saved menu truth.
- More keeps Print Menu in the Modules list beside Dashboard for discovery; the analytics dashboard itself stays metric-focused.
- Local export history obeys `ENABLE_MENU_CARD_EXPORT_HISTORY`.
- Print-shop packet visibility and creation obey `ENABLE_MENU_CARD_EXPORT_PRINT_SHOP`.
- Pro/Premium layout suggestion remains deterministic-advice only; final PDF/packet rendering is not AI-rendered.
- Legacy `Menu PDF`/print-copy buttons must not reintroduce a standalone renderer. They stay as a thin bridge into Menu Card Export and must pass store/project context for brand and currency parity.

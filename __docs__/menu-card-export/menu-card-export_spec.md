# Menu Card Export — Product Specification

**Status:** Production-ready client-first route with Pro/Premium layout suggestion
**Route:** `/use-menulist/menu-card-export`
**Feature flags:** `ENABLE_MENU_CARD_EXPORT`, `ENABLE_MENU_CARD_EXPORT_HISTORY`, `ENABLE_MENU_CARD_EXPORT_PRINT_SHOP`, `ENABLE_MENU_CARD_EXPORT_BATCH`, `ENABLE_MENU_CARD_EXPORT_AI_ADVISOR`
**Last Updated:** June 2, 2026

---

## Executive Summary

Menu Card Export turns MenuList's current menu truth into print-ready menu files. The owner opens a dedicated route, chooses the job they need, selects a controlled style, reviews preflight warnings, checks a preview, and exports a PDF or packet that can point customers back to the live menu.

The current PDF Surface is useful but too small as a product surface: it is a single download button in Share Modal and Use MenuList, backed by one `jsPDF` generator. The long-term feature needs its own route because style choice, page preview, export history, stale detection, and mobile parity need more room than a modal action can safely provide.

One-sentence product definition:

> Create print-ready menu files from the current MenuList menu.

---

## Research Summary

See [menu-card-export_research.md](./menu-card-export_research.md) for the full source review.

The research changed the feature from "better PDF export" into a routed print workflow:

| Research signal | Product decision |
| --- | --- |
| MustHaveMenus combines print, web, QR, brand assets, POS sync, and multi-location management. | Treat print output as an operating surface, not as a utility download. |
| Canva and Adobe Express win on templates and general design freedom. | Do not compete as another design editor; compete on current menu truth to usable print files. |
| PosterMyWall and iMenuPro show the value of reusable menu item data, item variants, QR sharing, and auto-formatting. | Do not create a second item database; render directly from MenuList menu data and preserve variants/tags. |
| Print shops care about safe margins, trim, bleed, crop marks, file size, and instructions. | Add print-shop packet and preflight, behind a flag until verified. |
| QR reliability depends on quiet zone, module size, error correction, and avoiding dense long URLs. | QR rendering and validation are first-class requirements. |
| Accessible PDFs require selectable/tagged content and correct reading order before claims are safe. | No screenshot-only PDFs; do not claim PDF/UA until automated verification exists. |

Final research-backed position:

> Build a compact Print Menu route with presets, preflight, QR bridge, print-shop handoff, history, and freshness.

---

## Feature Gate

| Question | Answer | Result |
| --- | --- | --- |
| Does it remove a decision? | Yes. Owners no longer design, rebuild, or diagnose printable menus after menu edits. | PASS |
| Would anyone notice if absent? | Yes. Printed menus and WhatsApp PDFs are common SMB operating surfaces. Current PDF quality is not enough. | PASS |
| Does it strengthen the core moment? | Yes. Customers see correct menu information in print and can scan back to the latest live menu. | PASS |
| Can it be explained in one sentence without "and"? | Yes: Create print-ready menu files from the current MenuList menu. | PASS |
| Will this matter in 3 years? | Yes. Offline menu cards and stale printed prices are durable restaurant problems. | PASS |

Verdict: approved as a routed print workflow, not as a design tool.

---

## Conversation And Research Verdict

| ChatGPT idea | Verdict | MenuList decision |
| --- | --- | --- |
| Build fixed professional templates, not a Canva-style editor. | Agree | Controlled style families only. No drag/drop, custom CSS, arbitrary text, or manual item positioning. |
| Add a separate route-level experience. | Agree | Use `/use-menulist/menu-card-export`; Share Modal, Mobile Share, Mobile Menu, and More link into it. |
| Treat pagination as the product. | Agree | Build explicit category-first pagination. Do not rely on raw CSS columns. |
| Add print-shop handoff. | Agree | Add a flag-gated packet with PDF, print instructions, proof checklist, and QR test note. |
| Add useful SMB additions. | Agree | Add job presets, preflight, WhatsApp file, QR scan checks, safe layout overrides, and stale-file regeneration. |
| Use snapshots and freshness detection. | Agree | Store `printSourceHash`, `menuSnapshotId`, and freshness state on export records. |
| Start with many template families. | Partial | Ship a registry that supports families, but expose only approved Classic, Compact, and Premium styles until each passes the QA matrix. |
| Use Playwright/Chromium server rendering. | Partial | Keep a renderer adapter boundary. Existing repo dependency is `jsPDF`, not Playwright; any browser renderer requires deployment/runtime proof before adoption. |
| Add AI style advice. | Agree with guardrails | Pro/Premium-only, JSON-only layout recipe. It never renders final pages or rewrites menu truth. |
| Store generated artifacts and export history. | Partial | Local browser history is implemented first to keep Firebase cost at zero. Server artifact storage remains behind future flag approval. |

---

## Codebase Reality

The live code already proves demand and a basic path:

- `src/lib/export/menuPdfGenerator.ts:274` exports `generateMenuPdf()`.
- `src/lib/export/menuPdfGenerator.ts:283` builds a renderable snapshot before drawing.
- `src/lib/export/menuPdfGenerator.ts:498` writes footer metadata on every page.
- `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:327` opens Print Menu from the project Share modal when the feature flag is on.
- `src/components/templates/main-app/useMenuList/index.tsx:951` opens Print Menu from Use MenuList when the feature flag is on.
- `src/lib/menu-card-export/navigation.ts:1` centralizes the route path and `projectId` query construction.
- `src/components/mobile/screens/MobileShareScreen.tsx:889` opens Print Menu from Mobile Share when the feature flag is on.
- `src/components/mobile/components/MobileMenuCommandSheet.tsx:185` exposes Print Menu inside the mobile Menu command sheet.
- `src/components/mobile/screens/MobileMenuScreen.tsx:2742` starts the mobile Menu route handoff, and `src/components/mobile/screens/MobileMenuScreen.tsx:2749` saves pending mobile menu edits before leaving for Print Menu.
- `src/components/mobile/screens/MobileMoreScreen.tsx:442` exposes Print Menu inside More > Modules beside Dashboard for discovery.
- `src/config/features.ts:1666` already gates the predecessor with `ENABLE_PDF_SURFACE`.
- `__docs__/pdf-surface/pdf-surface_spec.md:34` explicitly says "No new UI surface" for the predecessor; this successor feature intentionally changes that with a dedicated route.

---

## Owner Experience

### Entry Points

| Surface | Behavior |
| --- | --- |
| Use MenuList | Primary card: `Menu Card Export` opens `/use-menulist/menu-card-export`. |
| Project Share modal | `Menu card` action opens the route with `projectId` preselected. |
| Mobile Share | `Print Menu` tile opens the responsive route with the selected menu. |
| Mobile Menu | Command sheet `Print Menu` opens the responsive route after saving pending edits. |
| More > Modules | `Print Menu` opens the route with the current mobile project selection; it is listed beside Dashboard for discovery, not inside analytics. |
| Existing `Menu PDF` action | May stay behind legacy flag during migration, but it is no longer the main feature. |

### Route Flow

1. Choose menu
2. Choose job preset
3. Choose style
4. Adjust safe settings
5. Review preflight
6. Preview pages
7. Export
8. See export history and freshness

The route should not show a marketing explanation. It should open directly into the work surface.

---

## Job Presets

The owner should choose the job, not technical PDF settings.

| Preset | Primary use | Default behavior |
| --- | --- | --- |
| Home print | In-house printer or quick local print | Standard page size, no bleed, printer-friendly margins, fast PDF. |
| WhatsApp PDF | Sending to staff, customers, or print shop from phone | Larger text, fewer columns, smaller file, phone-readable first page. |
| Print-shop packet | Professional print handoff | Print PDF, instructions file, proof checklist, QR test note, optional bleed/crop marks. |
| Table menu | Dine-in table/menu card | QR included, current menu date, scan-safe footer. |
| Takeaway insert | Delivery bag, parcel, or counter handout | Smaller format, QR and short URL emphasized. |
| Staff reference | Internal staff reference in WhatsApp group or counter print | Current visible menu, readable item/price list, no private notes. |
| Multi-location batch | Same preset across multiple outlets | One packet per selected store/project, feature-flagged. |

`Home print`, `WhatsApp PDF`, and `Table menu` are exposed by default. `Print-shop packet` is exposed only when `ENABLE_MENU_CARD_EXPORT_PRINT_SHOP=true`. Other presets remain registry-supported and hidden until their QA matrix passes.

---

## Styles

Launch-approved styles:

| Style | Best For | Default Layout |
| --- | --- | --- |
| Classic | Restaurants and cafes | Two-column category flow |
| Compact | Long price lists, snacks, bakeries, services | Two/three-column compact flow |
| Premium | Shorter menus, cafes, higher-ticket venues | Single column or category-per-page |

Registry-supported but not exposed until validated:

- Takeaway
- Photo Menu
- Drinks
- Folded
- QR Insert

This prevents weak templates from entering owner workflows while keeping the architecture extensible.

---

## Safe Owner Settings

Allowed:

- Job preset
- Paper size: A4, A5, Letter
- Orientation: portrait, landscape where style supports it
- Density: comfortable, balanced, compact
- Include logo
- Include descriptions
- Include photos if template supports them
- Include QR
- Include contact block
- Include updated date
- Job preset: Home Print, WhatsApp PDF, Print-shop packet when enabled
- Safe category overrides:
  - keep category together where possible
  - start category on a new page
  - compact one category
  - hide descriptions for one category
  - include category/photo block where template supports it

Rejected:

- Drag/drop editor
- Freeform manual page editing
- Custom CSS
- Font upload
- Arbitrary background images
- Free text boxes
- Per-item styling
- Manual price alignment
- AI-generated final pages

Safe overrides are not a design editor. They are constrained layout hints validated by the pagination engine.

### Pro/Premium Layout Suggestion

The route may show **Pro layout suggestion** when `ENABLE_MENU_CARD_EXPORT_AI_ADVISOR=true`.

Rules:

- Available only to active Pro or Premium subscriptions via `MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS`.
- Block Starter/no-subscription users before any provider call.
- Send only bounded menu summary, current settings, source hash, and preflight warning metadata.
- Return only approved settings: preset, style, density, description/QR/contact toggles, owner note, reason, and up to three warnings.
- Require owner action to apply the suggestion.
- Keep final PDF and packet rendering deterministic through the existing renderer.
- Consume one AI enhancement unit only after the recommendation validates against `MenuCardDesignAdvisorRecommendationSchema`.

---

## Preflight

Preflight runs before final export and returns warnings plus blocking errors.

| Check | Severity | Owner-facing action |
| --- | --- | --- |
| Missing prices on visible items | Warning or blocker by preset | Add prices or confirm price-free menu. |
| Hidden/unavailable items excluded | Info | Show count only. |
| Long item names/descriptions | Warning | Use Compact or hide descriptions for that category. |
| Page overflow | Blocker | Choose compact density or remove unsafe override. |
| Category orphan/header alone | Blocker | Engine repaginates or blocks export. |
| QR quiet zone missing | Blocker | Template must reserve four-module quiet zone. |
| QR module size too small | Blocker | Use larger QR or shorter URL. |
| QR too dense | Warning/blocker | Use short URL or lower embedded data. |
| Low contrast text | Warning/blocker | Template tokens adjust automatically. |
| Low-resolution photos | Warning | Exclude photo or use non-photo style. |
| Bleed/safety margin issue | Blocker for print-shop preset | Use print-safe margins or disable edge-to-edge art. |
| File size too large for WhatsApp | Warning | Use WhatsApp preset compression. |
| Menu changed after selected export | Warning | Create again from current menu. |

---

## Layout Requirements

Hard rules:

1. Preserve official category order.
2. Preserve item order inside each category.
3. Exclude hidden items.
4. Exclude unavailable items by default unless the setting explicitly includes them.
5. Item name and price stay together.
6. Item description, variants, and tags stay with the item block.
7. Category header cannot appear alone at the bottom of a page.
8. Footer cannot overlap body content.
9. QR must remain scan-safe.
10. Same input hash and renderer version must produce the same export output.
11. Print-shop preset must keep body content inside safe area.
12. PDFs must preserve text as text where the renderer supports it; screenshot-only text is not acceptable.

Layout modes:

- `single_column`
- `two_column_category_flow`
- `three_column_compact`
- `category_per_page`
- `mixed_adaptive`
- `photo_grid`
- `variant_table`
- `qr_insert`

---

## Export Presets

| Preset | Output | Notes |
| --- | --- | --- |
| Print PDF | A4/A5/Letter PDF for physical printing | Default |
| WhatsApp PDF | Phone-readable PDF with larger text and fewer columns | Avoid tiny three-column layouts |
| Print-shop packet | ZIP with full-quality PDF, optional home-printer proof, print instructions, and QR test note | Feature-flagged |
| Page images | PNG page images for sharing | Feature-flagged |
| QR insert | Small QR/menu reference card | Registry support only |

Print-shop packet contents:

- `menu-print.pdf`
- `menu-home-printer-proof.pdf` when enabled
- `PRINT_INSTRUCTIONS.txt`
- `QR_TEST_CHECKLIST.txt`
- optional page thumbnails/proof images

---

## Freshness

Every export stores:

- `menuSnapshotId`
- `printSourceHash`
- `rendererVersion`
- `templateId`
- `templateVersion`
- `settings`
- `sourceMenuUpdatedAt`
- `generatedAt`

When an owner returns to the route, the system compares the export hash with the current print source hash.

Owner-facing states:

- `Current`
- `Menu changed`
- `Style updated`
- `Create again`

Do not show hash values to owners unless support mode is active.

---

## Functional Requirements

| ID | Requirement |
| --- | --- |
| MCE-1 | A dedicated route exists at `/use-menulist/menu-card-export`. |
| MCE-2 | The route supports desktop and mobile owner flows. |
| MCE-3 | The route can preselect `projectId` from query params. |
| MCE-4 | The route reads canonical store/project/menu data; it does not maintain separate menu content. |
| MCE-5 | Preview returns page count, layout mode, warnings, and page thumbnails/preview data. |
| MCE-6 | Preflight returns warnings/blockers before final export. |
| MCE-7 | Final export downloads directly from the browser by default; no Firebase artifact path is created. |
| MCE-8 | Local export history shows style, preset, date, page count, and freshness on the same device. |
| MCE-9 | Duplicate source/template/settings hashes reuse a ready export. |
| MCE-10 | Legacy PDF Surface remains available only as migration fallback until removed. |
| MCE-11 | QR output preserves quiet zone, adequate module size, and a live-menu destination. |
| MCE-12 | Print-shop packet includes print instructions and QR test checklist when enabled. |
| MCE-13 | Multi-location batch export is feature-flagged and shares the same access checks per selected store/project. |
| MCE-14 | Generated PDF text remains selectable wherever the renderer supports text output. |
| MCE-15 | Pro/Premium layout suggestion is optional, plan-gated, capacity-gated, JSON-only, and never part of final render truth. |

---

## Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Security | Authenticated owner route uses existing DAL/session context; the AI advisor API uses `withAuth()`, tenant/store verification, validation, and rate limiting. |
| Cost | Preview and final export must not write Firestore or upload Storage in the default implementation. AI advisor must be blocked before provider call for non-Pro/Premium users. |
| Performance | Preview should return in under 2 seconds for normal menus; final export must show clear queued/rendering/ready states. |
| Mobile | Thumb-safe controls, no precision layout editing, same export records as desktop. |
| Public output | PDF must not include internal notes, owner-only metadata, draft items, or hidden content. |
| Cache | No public cache invalidation because no public menu/store truth is mutated. |
| Reliability | If render fails, the export record stores a safe error code and owner can retry. |
| Accessibility | Do not claim PDF/UA compliance until tagged PDF, reading order, metadata, and verification tooling are implemented. |

---

## Out Of Scope

- Canva-style editor
- Public route for anonymous PDF generation
- Public PDF index pages
- Owner-uploaded fonts
- Manual layout editing
- Automatic emails to print shops
- Automatic print ordering
- Mutation of public menu/store data
- AI-generated visual output
- New scheduled Firebase function

---

## Open Decisions Before Implementation

| Decision | Default Recommendation |
| --- | --- |
| Renderer | Start with `jsPDF` behind a renderer interface because it exists in the repo. Validate browser-rendered PDF only if runtime/dependency is approved. |
| Artifact retention | Local browser history keeps latest 20 exports per project. Server artifact retention is not active because server storage is not implemented. |
| Print-shop preset | Flag off until file size, bleed, and printer specs are verified. |
| QR error correction | Use short URLs and choose level by preset; default print QR should favor resilience while keeping module size scan-safe. |
| Accessibility target | Preserve selectable text at launch; treat tagged PDF/PDF-UA as a verified hardening target, not a launch claim. |
| AI advisor | Enabled as Pro/Premium value-add only. Keep it JSON-only and independent from final rendering. |

---

## Durable Decision Check

No new constitution-level document is required. The durable decisions are recorded in this feature doc set: reduce owner decisions, keep printed files tied to current menu truth, preserve QR scan reliability, and do not turn this route into a design editor.

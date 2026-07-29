# Menu Card Export — Test Cases

**Status:** Test-case evidence; not current launch certification
**Last Updated:** June 3, 2026
**Boundary Reviewed:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Card Export evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, Digital Menu Output Constitution checks for print/menu outputs, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, applicable target deploy evidence, and production-host smoke.

---

## Release Gate Evidence Boundary

These test cases preserve the June 2026 automated-gate and real-data runtime evidence for the client-first PDF/packet path. They are not current release approval.

Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks for print/menu outputs, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, target deploy evidence, and production-host smoke.

Current validated baseline:

- `npm run verify:menu-card-export`
- focused `next lint --file ...`
- `npx tsc --noEmit --incremental false`
- active multi-project owner data generated PDFs and print-shop packet ZIPs from two non-empty menus

Local unauthenticated HTTP route smoke returned `200 OK` for `/use-menulist/menu-card-export`. Visual Browser inspection was blocked by the local Browser webview attach issue, not by a feature-specific HTTP/runtime failure.

Authenticated browser click-through remains an external certification gate before a Vercel release. Authenticated real-data source extraction, PDF rendering, ZIP generation, and cost-path validation passed for the June 2026 evidence scope only.

---

## Real-Data Runtime Cases Passed

| Case | Result |
| --- | --- |
| Multi-project account with several active menus | PASS. Runtime loaded and generated output for separate menus without mixing source data. |
| File-based extracted menu data | PASS. Items/categories stored in `project.files[].extractedData.data` were included in the print source. |
| Medium menu PDF | PASS. 37-item menu generated a 2-page PDF. |
| Small menu PDF | PASS. 10-item menu generated a 1-page PDF. |
| Print-shop packet ZIP | PASS. ZIP contained `menu-print.pdf`, `PRINT_INSTRUCTIONS.txt`, and `QR_TEST_CHECKLIST.txt`. |
| Firebase cost path | PASS. Generation stayed local to PDF/ZIP blobs; no export Firestore write, Storage upload, export-storage API route, index, rule, or Cloud Function was used. |

---

## Fixtures

| Fixture | Required Data |
| --- | --- |
| Small menu | 10 items, 3 categories |
| Medium menu | 50 items, 8 categories |
| Large menu | 150 items, 12 categories |
| Very large menu | 250 items, 20 categories |
| No descriptions | Items with name and price only |
| Long descriptions | 200+ character descriptions |
| Missing prices | 10 percent of items without price |
| Variants | Half/full, small/medium/large, add-ons |
| Photos low coverage | Less than 30 percent item photos |
| Photos high coverage | More than 70 percent item photos |
| Low-resolution photos | Photos below print threshold |
| Long business name | 40+ characters |
| Long address | 100+ characters |
| Multilingual | English plus Hindi or another configured language |
| Multi-location | 3 stores, 3 different menus |

---

## Layout Tests

| Case | Expected Result |
| --- | --- |
| Category header near page bottom | Header moves with at least two items. |
| Item with long description | Item block stays together or description is clamped by template rule. |
| Long item name with price | Price remains attached and readable. |
| Variant-heavy category | Variant table mode applies where needed. |
| Compact style on A5 | Three-column mode is not used. |
| WhatsApp PDF | Text remains readable on a phone. |
| QR footer | QR scans from printed and screen preview. |
| Footer | Footer never overlaps body. |
| Page overflow | Validation blocks export or retries compact settings. |
| Safe category override | Start/keep/compact category hints never create overlap. |
| Home print preset | Uses printer-safe margins and no forced bleed. |
| Print-shop preset | Bleed/safe-area rules pass before export. |
| Takeaway insert | Small format keeps QR and short URL readable. |

---

## Preflight Tests

| Case | Expected Result |
| --- | --- |
| Missing prices | Warning appears with item count; export policy follows preset. |
| Hidden/unavailable exclusions | Info warning shows count; excluded item payloads are not leaked. |
| QR quiet zone too small | Export is blocked. |
| QR module size too small | Export is blocked or QR is resized. |
| QR URL too dense | Short URL fallback or warning appears. |
| Low contrast token pair | Template adjusts or export blocks. |
| Low-resolution photo | Warning appears and non-photo fallback is available. |
| File too large for WhatsApp | Warning appears with smaller preset behavior. |
| Stale export | History marks the export as `Menu changed`. |

---

## Print-Shop Packet Tests

| Case | Expected Result |
| --- | --- |
| Packet flag off | Preset is hidden and stale flagged state cannot create a packet. |
| Packet generated | ZIP contains PDF, instructions, and QR test checklist. |
| Instructions | Includes store/menu, preset, style/template version, paper size, orientation, generated date, menu updated date, page count, source reference, renderer version, live menu destination, and contact block where available. |
| QR checklist | Tells staff/printer to scan one sample before a full print run. |
| Packet retention | No Firebase retention path exists in the default implementation; packet downloads as a local ZIP only. |

---

## Accessibility / PDF Quality Tests

| Case | Expected Result |
| --- | --- |
| Selectable item text | Sample item names can be extracted from PDF text. |
| Screenshot-only PDF attempt | Verification fails. |
| PDF document properties | Title, subject, author, keywords, and creator are set by the renderer. |
| Download filename | Includes business/menu name, preset, generated date, and short source reference. |
| Visible footer | Does not print the full internal source hash. |
| Link annotation support | QR destination/short URL is present where renderer supports links. |
| PDF/UA claim | No public/support claim exists unless tagged PDF verification is implemented. |
| OBP brand color | Header, category dividers, and prices use `store.publicPresence.accentColor` when present. |
| Store logo | Existing store logo appears in the PDF header when the logo URL can be loaded safely. |
| Brand fallback | If the logo image cannot be embedded, PDF still renders with the store accent color and no broken image placeholder. |
| Light brand color | Header text and small accent text remain readable when the stored accent color is light. |
| Density font sizes | Compact, balanced, and comfortable presets use stable item/category/description font sizes and do not resize unpredictably. |
| Dynamic price width | Long prices, currency codes, and ranges do not overlap item names. |
| Currency source | PDF uses store `currencySymbol`, falling back to `currency` and then `currencyCode`. |
| INR PDF fallback | Store `₹`/`INR` prices render as readable `Rs 120` instead of a broken PDF glyph. |
| Price decimals | Whole-number prices do not force `.00`; decimal prices keep two decimals. |
| Price ranges/text | Ranges such as `120/140` and text such as `Market price` are preserved. |
| Physical page base | Every PDF page has the selected template's paper tone and border before content is drawn. |
| Classic physical style | Classic output uses a centered plaque, ribbon/section treatment, and dotted price leaders. |
| Premium physical style | Premium output uses an editorial hierarchy and readable whitespace. |
| Compact physical style | Compact output uses a warm dense card sheet with boxed sections and QR-friendly layout. |
| Multi-page physical style | Added pages redraw the same paper/border base and do not revert to plain white pages. |
| Food business profile | Food businesses use menu labels, menu-style physical styling, and QR text for the current menu. |
| Service business profile | Service businesses use service labels and calmer service-list styling without restaurant-only ornamentation. |
| Retail business profile | Retail/product businesses use catalog labels, boxed catalog sections, and product price-list treatment. |
| Health/professional profile | Health and professional businesses use service labels and quieter service-guide styling. |
| Auto design food dense | Long food menus start on Compact with compact density and descriptions off where needed for readability. |
| Auto design food short | Short descriptive food menus start on Premium with comfortable density. |
| Auto design service | Service/professional/wellness menus start on Premium or Compact by length, not restaurant ribbon styling. |
| Auto design retail | Retail/product catalogs start on Compact/catalog treatment with QR and contact enabled. |
| Manual override guard | After owner changes style, density, or toggles, auto design does not overwrite that manual choice. |
| Preset reset | Changing job preset allows auto design to pick a preset-appropriate style/density again. |
| Legacy Use MenuList PDF | If the routed feature flag is off and Use MenuList calls `generateMenuPdf()`, the downloaded PDF still uses Menu Card Export brand color, logo, business profile, currency formatting, physical styling, metadata, and source hash. |
| Legacy mobile Share PDF | If the routed feature flag is off and Mobile Share calls `generateMenuPdf()`, the downloaded PDF uses the selected mobile project cache and the same branded renderer output as desktop. |
| Legacy project Share PDF | If the project Share modal direct-download path runs, it passes store context and uses the same branded renderer output. |
| Premium attribution removal | When loaded store context has `activePlanType: "premium"`, generated PDFs, QR cards, Menu Kit files, physical cards, OBP/menu footers, compliance pages, and digital screen attribution hide visible MenuList logo/name/domain. Missing, Starter, Pro, and unknown plan data keeps attribution visible. |

---

## Security Tests

| Case | Expected Result |
| --- | --- |
| Unauthenticated request | 401. |
| Wrong tenant | 403 and security log. |
| Wrong store | 403 and security log. |
| Invalid template id | 400. |
| Custom CSS payload | Rejected. |
| Unsafe image URL | Image skipped or request rejected. |
| Hidden item | Not included. |
| Internal notes | Not included. |

---

## Cost Tests

| Case | Expected Result |
| --- | --- |
| Multiple active menus | Shared project selector opens and selects the intended menu. |
| Route query `projectId` exists | Matching menu is selected when present. |
| Route query `projectId` is stale/missing | Default active menu, then first active menu, is selected. |
| Switch menu while previous project data is loaded | Preview/export waits for the new project data and never combines old items with the new menu URL. |
| Tenant/store changes while project/advisor/export work is pending | The controller clears the old scope, rejects late project/advisor/artifact settlement, and never downloads, shares, records, or renders the previous workspace's result. |
| Double-click layout suggestion or export | The controller admits one in-flight operation and does not duplicate provider work, file delivery, or local history. |
| Store has no menus | Route shows an empty state and does not create a default project. |
| Preview style browsing | No Firestore write, no Storage upload. |
| Menu switch, then switch back | Previously opened project data is reused from route-session cache. |
| Final export | No Firestore export record and no Storage artifact upload. |
| Duplicate export | Matching local source/settings hash is detected. |
| Brand change | Changing store logo URL or OBP accent color creates a different source hash instead of reusing an old export. |
| Business type/category change | Changing store business type/category creates a different source hash instead of reusing an old menu-style, service-style, or catalog-style export. |
| Currency change | Changing store currency symbol or code creates a different source hash instead of reusing a wrong-currency export. |
| Repeat logo export | Same logo URL is converted from in-memory cache during the route session instead of refetching for every export. |
| Auto design cost | No provider call, AI credit consumption, Firestore write, Storage upload, Cloud Function, rule, or index. |
| History flag off | Local history UI is hidden and no browser history record is written. |
| History flag on | Reads shaped local browser history only, max 20 records per tenant/store/project. Equal project IDs in another store return no records. Invalid preset/page count/timestamp/project records, oversized arrays, and malformed JSON are evicted. |
| Legacy quick-PDF freshness | Only canonical positive safe-integer millisecond timestamps at or before the current time are admitted; coercible exponent, fractional, negative, and future values are rejected. |
| Device storage rejection after delivery | Export/download success remains success; device-local history/freshness persistence is omitted without a false failure. |
| Native share cancelled | No fallback download, success event, or local history record. |
| Native file sharing unsupported | Download fallback runs and reports a download. |
| Empty or non-Latin-only QR filename label | Browser file falls back to `menu-qr.png` or `menu-feedback-qr.png`; valid ASCII labels keep their existing sanitized name. |
| Print-shop flag off | Preset is hidden and no print-shop artifact is generated. |
| Batch flag off | Batch endpoint/action is unavailable. |
| AI advisor flag off | No AI/provider call occurs. |
| Starter layout suggestion attempt | 403 `plan_required`; provider is not called and credits are not consumed. |
| Pro/Premium layout suggestion | Returns JSON recipe only, records AI operation, and consumes one unit after validation. |
| Provider failure | No credit is consumed and no suggestion is applied. |
| Invalid AI output | Recommendation is rejected before credit consumption. |
| Apply suggestion | Only approved preset/style/density/toggles are applied; final PDF renderer remains deterministic. |
| Batch unauthorized store | Request fails before writes or uploads. |
| Batch hash reuse | Existing ready export is reused per project. |

---

## Mobile Tests

| Case | Expected Result |
| --- | --- |
| Open from Mobile Share | `Print Menu` switches `MobileShell` to `more/printMenu`, renders the dedicated mobile Print Menu screen with the selected project, and does not leave the mobile shell. |
| Open from Mobile Menu | Command sheet `Print Menu` saves pending local edits, updates the shared mobile selected project, then switches `MobileShell` to `more/printMenu`. If the save is still pending after retry, owner sees a retry-later message instead of exporting stale data. |
| Open from More | More > Modules `Print Menu` opens `more/printMenu` with the current mobile project selection; it does not reload the PWA or create a separate dashboard export surface. |
| Style picker | Horizontal cards are thumb-safe. |
| Settings | Controls are at least 44px high. |
| Preview | Pages swipe without layout shift. |
| Export | File can be downloaded or shared from mobile. |
| WhatsApp PDF | Native share works where browser supports Web Share files. |
| Print-shop packet | Mobile can download/share packet without desktop-only UI. |
| Failed export | Retry is visible without technical text. |
| Dashboard/mobile PDF parity | Dashboard and mobile both call `createArtifact(false)` from `useMenuCardExportController`; neither surface calls `renderPdf` or the source/hash/history helpers directly. |
| Dashboard/mobile share parity | Dashboard and mobile both call `createArtifact(true)` from `useMenuCardExportController`; share fallback/download behavior remains controller-owned. |
| Same settings, same source hash | For the same project, preset, style, density, and toggles, dashboard and mobile produce the same source hash and route through the same PDF or packet builder. |

---

## Verification Script

Add:

```bash
npm run verify:menu-card-export
```

Script responsibilities at freeze:

- Verify route, library, API, service, and docs files exist.
- Verify feature flags and AI accounting tokens exist.
- Verify the route uses the read-only project helper, project selector, preview renderer, local history, AI advisor, history flag, and print-shop flag guard.
- Verify controller state requires the exact current session tenant/store, late advice/artifacts are scope-owned, and same-tick duplicate advice/export operations are rejected.
- Verify print-source support for top-level and file-based extracted menu data.
- Verify print-source support for OBP accent color, existing store logo, renderer logo embedding, and brand-aware source hashes.
- Verify PDF currency fallback, whole-number price formatting, and dynamic price-width handling.
- Verify physical output page styling, page borders, category treatments, dotted price leaders, business-type-aware visual profiles, and auto print design remain wired.
- Verify the legacy `generateMenuPdf()` bridge delegates to Menu Card Export and receives store/project brand context from Use MenuList, mobile Share, and project Share.
- Verify Premium attribution removal uses already-loaded `activePlanType` and does not add subscription reads or server generation.
- Verify no export-storage API route or artifact Firebase write path was added.
- Verify unused placeholder modules stay removed.
- Verify the Pro/Premium AI advisor route uses auth, tenant access, rate limit, plan gate, capacity check, provider call, output normalization, operation logging, and credit consumption.
- Verify Mobile Share, Mobile Menu, and More Print Menu entry points use `MobileShell` screen state and do not force a PWA reload.

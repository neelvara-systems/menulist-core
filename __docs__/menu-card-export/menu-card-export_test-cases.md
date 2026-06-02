# Menu Card Export — Test Cases

**Status:** Production-ready baseline; Pro/Premium layout suggestion added
**Last Updated:** June 2, 2026

---

## Release Gate

Menu Card Export is release-ready for the client-first PDF/packet path after the automated gates and real-data runtime checks below.

Current validated baseline:

- `npm run verify:menu-card-export`
- focused `next lint --file ...`
- `npx tsc --noEmit --incremental false`
- active multi-project owner data generated PDFs and print-shop packet ZIPs from two non-empty menus

Local unauthenticated route smoke is currently blocked by a shared Next dev runtime issue that also affects `/use-menulist`; do not count it as feature-specific failure evidence.

Authenticated browser click-through remains a useful manual smoke before a Vercel release, but authenticated real-data source extraction, PDF rendering, ZIP generation, and cost-path validation passed.

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
| Store has no menus | Route shows an empty state and does not create a default project. |
| Preview style browsing | No Firestore write, no Storage upload. |
| Menu switch, then switch back | Previously opened project data is reused from route-session cache. |
| Final export | No Firestore export record and no Storage artifact upload. |
| Duplicate export | Matching local source/settings hash is detected. |
| History flag off | Local history UI is hidden and no browser history record is written. |
| History flag on | Reads local browser history only, max 20 records per project. |
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
| Open from Mobile Share | `/use-menulist/menu-card-export?projectId=...` renders the export workflow with the selected project; the generic mobile shell does not replace it with the Share tab. |
| Open from Mobile Menu | Command sheet `Print Menu` saves pending local edits, then opens `/use-menulist/menu-card-export?projectId=...`. If the save is still pending after retry, owner sees a retry-later message instead of exporting stale data. |
| Open from More | More > Modules `Print Menu` opens the route with the current mobile project selection; it does not create a separate dashboard export surface. |
| Style picker | Horizontal cards are thumb-safe. |
| Settings | Controls are at least 44px high. |
| Preview | Pages swipe without layout shift. |
| Export | File can be downloaded or shared from mobile. |
| WhatsApp PDF | Native share works where browser supports Web Share files. |
| Print-shop packet | Mobile can download/share packet without desktop-only UI. |
| Failed export | Retry is visible without technical text. |

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
- Verify print-source support for top-level and file-based extracted menu data.
- Verify no export-storage API route or artifact Firebase write path was added.
- Verify unused placeholder modules stay removed.
- Verify the Pro/Premium AI advisor route uses auth, tenant access, rate limit, plan gate, capacity check, provider call, output normalization, operation logging, and credit consumption.

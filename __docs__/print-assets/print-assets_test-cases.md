# Print Assets Test Cases

**Status:** Implemented
**Last Updated:** June 21, 2026

## Automated

| Test | Expected |
| --- | --- |
| `npm run verify:menu-card-export` | Passes and checks Print Assets route/shell/catalog wiring. |
| Focused ESLint | Passes for changed Print Assets, Use MenuList, mobile, and Menu Kit files. |
| `npx tsc --noEmit --incremental false` | Passes. |
| `git diff --check` | Passes. |
| `npm run verify:website-resource-locales` | Passes when website copy is touched. |
| `npm run verify:env-targets` | Passes before freeze. |

## Manual

| Area | Check |
| --- | --- |
| Desktop route | `/assets` renders the focused Assets page. |
| Compatibility route | `/use-menulist/print-assets` renders the same Assets workspace while old links exist. |
| Route helper | Desktop entry uses `buildPrintAssetsUrl(projectId)`. |
| Desktop navigation | Use MenuList -> Assets, Assets -> Use MenuList, and Assets -> Print Menu use App Router navigation without full document reload. |
| Project selector | Switching projects changes menu URL and downloaded QR target. |
| Table Tent | Downloads the A5 fold file. |
| Single Table Card | Downloads the A6 upright file. |
| Counter Sticker | Downloads the 8 x 8 cm file. |
| Entrance Poster | Downloads A4 poster. |
| Feedback QR | Shows only when feedback is enabled. |
| Flyer | Downloads the A5 campaign file. |
| Gift Certificate | Downloads the landscape voucher file. |
| Business Card | Downloads one file containing front and back 90 x 55 mm business card faces. |
| ID Card | Downloads the 54 x 85 mm portrait identity card. |
| Invitation | Downloads the A6 invitation file. |
| Postcard | Downloads the A6 landscape postcard file. |
| Product Tag | Downloads the small item tag file. |
| Campaign Poster | Downloads the A4 campaign poster. |
| Print Menu | Opens Menu Card Export route when enabled. |
| Print readiness | Shows live link, logo, brand color, business name, and feedback readiness from existing context. |
| Print-shop handoff | Copy action places the printer specs and menu link on the clipboard. |
| Output preview | Template click shows an immediate generated output preview inside the modal or sheet without opening a PDF viewer or downloading the full ZIP. |
| Format actions | Single printable assets expose separate PDF and image download actions from the modal or sheet. |
| Desktop customization | Supported single assets open **Customize in editor**, keep QR/link source layers locked, keep MenuList attribution out of the editor canvas, and download edited Image/Print PDF output with runtime plan-aware attribution. |
| Reprint guidance | Explains that content/price updates do not require reprint and lists the cases that do. |
| Mobile More | Assets opens inside More sub-screen. |
| Mobile Share | Assets shortcut opens mobile sub-screen without reload. |
| Mobile Assets to Print Menu | Print Menu opens by shell callback without route reload. |
| Mobile Menu to Print Menu | Menu command opens Print Menu by shell callback after pending saves, without route reload. |
| Individual asset performance | Table/card/sticker/poster and extended campaign asset downloads do not build the ZIP. |
| Quantity planning | No table-count or print-quantity estimator is shown. |

## Regression Guards

- Do not reintroduce hardcoded Menu Kit print asset indices outside the central catalog.
- Do not call `result.assets[index]` from owner UI for individual assets.
- Do not add generated Storage uploads for print assets.
- Do not fork mobile print designs from desktop output.
- Do not fork readiness, print-shop handoff, or reprint guidance between desktop and mobile.
- Do not add quantity estimation without reopening product scope.
- Do not use `window.location` or plain `href` for internal dashboard jumps between Use MenuList, Assets, and Print Menu.
- Do not use `router.push`, `window.location`, or route builders from mobile Share/Menu/More/Assets for Assets or Print Menu transitions; use `MobileShell` callbacks and sub-screen state.

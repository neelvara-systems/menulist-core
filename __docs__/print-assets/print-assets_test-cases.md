# Print Assets Test Cases

**Status:** Implemented
**Last Updated:** June 4, 2026

## Automated

| Test | Expected |
| --- | --- |
| `npm run verify:menu-card-export` | Passes and checks Print Assets route/shell/catalog wiring. |
| Focused ESLint | Passes for changed Print Assets, Use MenuList, mobile, and Menu Kit files. |
| `npx tsc --noEmit --incremental false` | Passes. |

## Manual

| Area | Check |
| --- | --- |
| Desktop route | `/use-menulist/print-assets` renders focused Print Assets page. |
| Route helper | Desktop entry uses `buildPrintAssetsUrl(projectId)`. |
| Desktop navigation | Use MenuList -> Print Assets, Print Assets -> Use MenuList, and Print Assets -> Print Menu use App Router navigation without full document reload. |
| Project selector | Switching projects changes menu URL and downloaded QR target. |
| Table Tent | Downloads the A5 fold file. |
| Single Table Card | Downloads the A6 upright file. |
| Counter Sticker | Downloads the 8 x 8 cm file. |
| Entrance Poster | Downloads A4 poster. |
| Feedback QR | Shows only when feedback is enabled. |
| Print Menu | Opens Menu Card Export route when enabled. |
| Print readiness | Shows live link, logo, brand color, business name, and feedback readiness from existing context. |
| Print-shop handoff | Copy action places the printer specs and menu link on the clipboard. |
| Output preview | Table/card/sticker/poster Preview opens the generated output without downloading the full ZIP. |
| Reprint guidance | Explains that content/price updates do not require reprint and lists the cases that do. |
| Mobile More | Print Assets opens inside More sub-screen. |
| Mobile Share | Print Assets shortcut opens mobile sub-screen without reload. |
| Mobile Print Assets to Print Menu | Print Menu opens by shell callback without route reload. |
| Mobile Menu to Print Menu | Menu command opens Print Menu by shell callback after pending saves, without route reload. |
| Individual asset performance | Table/card/sticker/poster downloads use `generateMenuKitAsset()` and do not build the ZIP. |
| Quantity planning | No table-count or print-quantity estimator is shown. |

## Regression Guards

- Do not reintroduce hardcoded Menu Kit print asset indices outside the central catalog.
- Do not call `result.assets[index]` from owner UI for individual assets.
- Do not add generated Storage uploads for print assets.
- Do not fork mobile print designs from desktop output.
- Do not fork readiness, print-shop handoff, or reprint guidance between desktop and mobile.
- Do not add quantity estimation without reopening product scope.
- Do not use `window.location` or plain `href` for internal dashboard jumps between Use MenuList, Print Assets, and Print Menu.
- Do not use `router.push`, `window.location`, or route builders from mobile Share/Menu/More/Print Assets for Print Assets or Print Menu transitions; use `MobileShell` callbacks and sub-screen state.

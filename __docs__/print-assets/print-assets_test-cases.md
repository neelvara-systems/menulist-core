# Print Assets Test Cases

**Status:** Implemented
**Last Updated:** September 4, 2026

## Automated

| Test | Expected |
| --- | --- |
| `npm run verify:menu-card-export` | Passes and checks Print Assets route/shell/catalog wiring. |
| Focused ESLint | Passes for changed Print Assets, Use MenuList, mobile, and Menu Kit files. |
| `npx tsc --noEmit --incremental false` | Passes. |
| `npx tsx scripts/verification/test-asset-business-profile-readiness.ts` | Proves overall/contact-focused field sets, completeness, drafts, brand/location separation, and usable-address readiness. |
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
| Business Card | PDF downloads one paired print handoff file; image download downloads separate front and back PNG files. |
| ID Card | Downloads the 54 x 85 mm portrait identity card. |
| Invitation | Downloads the A6 invitation file. |
| Postcard | Downloads the A6 landscape postcard file. |
| Product Tag | Downloads the small item tag file. |
| Campaign Poster | Downloads the A4 campaign poster. |
| Print Menu | Opens Menu Card Export route when enabled. |
| Print Menu category icons | The preview/download shows only saved canonical category icons, honors `showCategoryIcons`, aligns them with headings, uses the theme accent for Lucide marks while retaining native emoji appearance, and becomes stale when an icon changes. |
| Print readiness | Shows live link, logo, brand color, business name, and feedback readiness from existing context. |
| Business-profile readiness | Dashboard and asset modal/sheet show the same applicable-field count. General assets require core identity; Business Card also requires public contact fields. Country alone does not count as a usable business address. |
| Asset-scoped profile save | Identity-only assets validate and write only visible identity fields. Business Card and Complete Kit additionally validate/write contact fields. Clearing the active-language tagline removes it from subsequent previews. |
| Inline profile save | An authorized owner edits canonical Business Settings data in place, logo selection uses the existing image pipeline, the active preview refreshes, and no per-asset profile is created. |
| Inline profile permissions | Users without store-management access see truthful guidance but no edit action. |
| Unsaved profile close | Desktop and mobile require explicit discard confirmation; save/prepare work locks dismissal and duplicate submission. |
| Print-shop handoff | Copy action places the printer specs and menu link on the clipboard. |
| Output preview | Template click shows an immediate generated output preview inside the modal or sheet without opening a PDF viewer or downloading the full ZIP. |
| Format actions | Single printable assets expose separate PDF and image download actions from the modal or sheet. |
| Desktop customization | Supported single assets open **Customize in editor**, keep QR/link source layers locked, keep MenuList attribution out of the editor canvas, and download edited Image/Print PDF output with runtime plan-aware attribution. |
| Reprint guidance | Explains that content/price updates do not require reprint and lists the cases that do. |
| Mobile More | `QR and print assets` opens Assets inside the More sub-screen. |
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
- Do not create asset-specific business-profile fields or route owners away when the shared inline editor can update canonical settings.
- Do not add quantity estimation without reopening product scope.
- Do not use `window.location` or plain `href` for internal dashboard jumps between Use MenuList, Assets, and Print Menu.
- Do not use `router.push`, `window.location`, or route builders from mobile Share/Menu/More/Assets for Assets or Print Menu transitions; use `MobileShell` callbacks and sub-screen state.

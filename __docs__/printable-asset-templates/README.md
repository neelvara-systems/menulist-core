# Printable Asset Templates - Documentation Hub

> **Feature:** Printable Asset Templates  
> **Status:** Implemented - desktop and mobile route live behind feature flag  
> **Last Updated:** June 15, 2026
> **Version:** 1.2

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./printable-asset-templates_spec.md) | Business scope, owner value, template families |
| Developers | [Implementation](./printable-asset-templates_impl.md) | Technical blueprint, files, contracts, rollout |
| Sales | [Marketing](./printable-asset-templates_marketing.md) | Internal positioning and talking points |
| Website | [Website](./printable-asset-templates_website.md) | Public-site copy guidance after implementation |
| Support | [Help Doc](./printable-asset-templates_helpdoc.md) | Owner-facing help article draft |
| Cost | [Firebase](./printable-asset-templates_firebase.md) | Firebase read/write/storage/cost model |
| Mobile | [Mobile Support](./printable-asset-templates_mobile-support.md) | Mobile admission and shell contract |
| QA | [Test Cases](./printable-asset-templates_test-cases.md) | Verification matrix |

---

## What Is This Feature?

**One-liner:** A dedicated Assets screen where owners choose a finished print style and download branded files for tables, counters, entrances, feedback, and paper menus.

**Problem Solved:** SMB owners care deeply about printed table cards and menu files because customers see those before they talk to staff. The current files are functional, but the owner still needs stronger choice and polish without hiring a designer or learning a design tool.

**Solution:** MenuList provides a governed template catalog with complete style families. The owner selects an asset type on the left, chooses a supported template on the right, sees the output preview immediately in the modal or sheet, and downloads the file as PDF or image. Non-menu printable assets are generated from shared Creative Editor documents so desktop owners can open a governed fullscreen editor, adjust copy/layout, save the edited design as a reusable template, and download the edited print PDF/image without breaking the QR link. The system fills store name, branch, logo, color, menu URL, feedback URL, business type copy, currency, and MenuList branding policy automatically.

---

## Architecture Overview

```text
Dashboard /assets
  -> asset type sidebar
  -> supported template families for that asset
  -> shared render input
  -> optional Saved designs registry for explicitly saved editor documents
  -> editor-backed output engine for non-menu print assets
      - CreativeEditorDocument template
      - locked QR/link/attribution layers
      - PNG/PDF browser render
  -> existing specialized output engines
      - Print Menu PDF + image
      - Menu Kit ZIP
```

The feature is a template orchestration layer. It uses Creative Editor documents for scan-first single assets, while Print Menu and complete Menu Kit keep their specialized pagination/ZIP renderers. It adds a stable catalog so templates are added by registering a new family and editor document layout, not by duplicating dashboard logic.

---

## Key Existing Codebase Anchors

| Purpose | Current File |
| --- | --- |
| Dashboard navigation list | `src/constants/navigations.ts:23` |
| Use MenuList nav item location | `src/constants/navigations.ts:91` |
| Print/Menu Kit feature flags | `src/config/features.ts:1696` |
| Current print asset catalog | `src/lib/print-assets/printAssetCatalog.ts:1` |
| Single Menu Kit asset generation | `src/lib/menu-kit/menuKitGenerator.ts:201` |
| Full Menu Kit ZIP generation | `src/lib/menu-kit/menuKitGenerator.ts:214` |
| Brand token resolver for print assets | `src/lib/menu-kit/brandTokens.ts:78` |
| Store brand color sources | `src/lib/menu-kit/brandTokens.ts:113` |
| Physical print card face renderer | `src/lib/print-menu-surfaces/templates/printMenuCardFace.ts:98` |
| Existing desktop Print Assets route | `src/app/(main)/use-menulist/print-assets/page.tsx:5` |
| Dedicated Assets route | `src/app/(main)/assets/page.tsx:1` |
| Desktop Assets workspace | `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx:1` |
| Template catalog | `src/lib/printable-asset-templates/templateFamilies.ts:1` |
| Asset type catalog | `src/lib/printable-asset-templates/assetTypes.ts:1` |
| Shared render adapter | `src/lib/printable-asset-templates/renderPrintableAsset.ts:1` |
| Existing mobile route mapping | `src/components/mobile/MobileShell.tsx:36` |
| Mobile Print Assets entry | `src/components/mobile/screens/MobileMoreScreen.tsx:450` |

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_PRINTABLE_ASSET_TEMPLATES: true
ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER: true
ENABLE_PRINTABLE_ASSET_EDITOR_CUSTOMIZE: true
ENABLE_PRINTABLE_ASSET_USER_TEMPLATES: true
```

The existing `ENABLE_PRINT_ASSETS_ROUTE`, `ENABLE_PRINT_MENU_SURFACES`, `ENABLE_MENU_KIT`, `ENABLE_MENU_CARD_EXPORT`, and `ENABLE_PREMIUM_MENULIST_BRANDING_REMOVAL` flags remain respected.

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.2 | June 15, 2026 | Added Saved designs for explicitly saved Creative Editor documents, backed by the Creative Editor Template Registry. |
| 1.1 | June 15, 2026 | Added Creative Editor document renderer for non-menu printable assets and desktop governed customization. |
| 1.0 | June 6, 2026 | Implemented `/assets`, compatibility route, desktop catalog, mobile shell integration, shared renderer adapter, and verifier. |
| 0.1 | June 6, 2026 | Created separate feature doc set and template system plan. |

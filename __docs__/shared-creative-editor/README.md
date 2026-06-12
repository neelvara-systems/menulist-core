# Shared Creative Editor - Documentation Hub

**Status:** Implemented as shared infrastructure with CampaignCue as the first product adapter
**Feature:** Shared Creative Editor
**Owner:** Shared product infrastructure

Shared Creative Editor is the product-neutral static asset editor used by CampaignCue and other products. It provides a reusable document schema, a Fabric.js editing runtime, a full editor shell, left tool rail, asset drawer, central canvas, right inspector, bottom canvas controls, dark/light mode, layer controls, starter templates, JSON/image/SVG import, text/path-text/shape/image/QR/polygon/path/free-draw elements, typography and text decoration controls, multi-stop gradient fills, image filters and adjustments, image outline/border controls, visible watermark controls, ruler/grid orientation, shadow controls, preview, SVG/PNG/JSON export, PNG clipboard export, base64 clipboard export, and product adapters that decide where source data, trust metadata, and saved asset records live.

The editor is not CampaignCue-specific. CampaignCue can open it from campaign outputs or from a blank asset flow, but the editor module cannot import CampaignCue workspace UI, CampaignCue Firebase clients, MenuList owner state, or Answerlattice tenant shapes.

## Documents

| Document | Audience | Purpose |
| --- | --- | --- |
| [shared-creative-editor_spec.md](./shared-creative-editor_spec.md) | Product, design | User flows, capabilities, boundaries, and acceptance. |
| [shared-creative-editor_impl.md](./shared-creative-editor_impl.md) | Engineering | Shared module paths, schema, adapters, and CampaignCue integration. |
| [shared-creative-editor_marketing.md](./shared-creative-editor_marketing.md) | GTM | Internal positioning and product packaging notes. |
| [shared-creative-editor_website.md](./shared-creative-editor_website.md) | Website | Public content boundary; no standalone public page by default. |
| [shared-creative-editor_helpdoc.md](./shared-creative-editor_helpdoc.md) | Support | Owner-facing usage guide for products that expose the editor. |
| [shared-creative-editor_firebase.md](./shared-creative-editor_firebase.md) | Engineering, finance | Product-adapter persistence and cost posture. |
| [shared-creative-editor_mobile-support.md](./shared-creative-editor_mobile-support.md) | Mobile | Mobile admission decision and supported mobile subset. |
| [shared-creative-editor_test-cases.md](./shared-creative-editor_test-cases.md) | QA | Verification matrix. |
| [shared-creative-editor_parity-audit.md](./shared-creative-editor_parity-audit.md) | Engineering, QA | Old editor comparison and product-neutral coverage decisions. |

## Architecture

```text
Product surface
  -> product adapter
  -> shared creative document
  -> shared Fabric editor UI
  -> SVG/PNG/JSON export
  -> product-owned save/export callback
```

## Current Implementation Anchors

| Area | Path |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| Shared types | `src/modules/creative-editor/types.ts` |
| Shared templates | `src/modules/creative-editor/templates.ts` |
| Shared export utilities | `src/modules/creative-editor/export.ts` |
| Shared Fabric adapter | `src/modules/creative-editor/fabricAdapter.ts` |
| Shared editor UI | `src/modules/creative-editor/CreativeEditor.tsx` |
| Shared editor styles | `src/modules/creative-editor/CreativeEditor.module.scss` |
| Internal smoke route | `src/app/(internal)/creative-editor-smoke/page.tsx` |
| CampaignCue adapter | `src/modules/creative-editor/providers/campaigncue.ts` |
| CampaignCue workspace integration | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| CampaignCue asset API | `src/app/api/campaigncue/assets/route.ts` |

## Boundaries

| Boundary | Decision |
| --- | --- |
| CampaignCue | First consumer. Opens editor from campaign outputs and blank asset flow, then registers exported assets in CampaignCue Asset Library. |
| MenuList | MenuList can use the editor for owned assets through a MenuList adapter. Generated or edited menu item images must use MenuList project/store/item authority, MenuList media image paths, MenuList AI accounting, and MenuList public cache invalidation. |
| Answerlattice | Future consumer must use Answerlattice tenant fields and doctrine; no CampaignCue assumptions. |
| Fabric | Day-one editing engine. The shared module maps Fabric objects into the neutral document schema instead of storing Fabric JSON as product persistence. |
| Storage | The shared editor does not write files directly. Product adapters own Storage, Firestore, trust, and rights persistence. |
| AI tools | Visible as a disabled rail entry for screen parity. It is not active until a governed product-specific provider contract exists. |
| Templates | Active local starter templates. They update the neutral document locally and do not call provider APIs. |
| Old editor parity | Owner-visible editing and exported-result parity is implemented through the shared Fabric adapter. Backend-only legacy features such as PSD service import, remote material search/upload, login, and language switching stay outside the shared editor boundary. |
| Internal smoke route | Development-only verification surface. It returns 404 in production and cannot save to a product workspace. |

## Version History

| Version | Date | Notes |
| --- | --- | --- |
| 0.6 | June 12, 2026 | Added remaining product-neutral old-editor parity items: path text, arrow and thin-tail arrow layers, draw-polygon mode, polygon point editing, visible export watermark, image outline, multi-stop gradients, RemoveColor/Gamma/grayscale-mode filters, richer dash/cap border styles, multi-select distribute X/Y, numeric ruler gutters, replace-image file action, and clipboard/base64 export. |
| 0.5 | June 12, 2026 | Added result-parity controls from the old editor: text italic/underline/strike/spacing/background, gradient fills, expanded image filter presets, and image filter adjustment sliders. |
| 0.4 | June 12, 2026 | Added old-editor parity controls: active templates, JSON/Fabric JSON import, image/SVG file import, SVG markup import, preview modal, grid toggle, freehand drawing, flip/group controls, typography controls, image filters, image borders, and shadow controls. |
| 0.3 | June 12, 2026 | Replaced the temporary SVG editing runtime with Fabric.js 5.3.0, added polygon/path layers, snap guidelines, Fabric selection/transform controls, keyboard shortcuts, and Fabric SVG/PNG export while preserving product-neutral persistence. |
| 0.2 | June 12, 2026 | Upgraded to the full editor shell with rail, drawer, inspector, bottom controls, dark/light mode, line/triangle shapes, blur, angle, border style, and alignment controls. |
| 0.1 | June 12, 2026 | Created shared editor doc set and first CampaignCue integration contract. |

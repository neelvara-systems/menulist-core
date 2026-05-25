# Developer Install Pack Implementation

## Typed SDK

`packages/canonica-web/src/index.ts` exports:

- `createCanonicaWebClient`
- `validateCanonicaPageContext`
- `validateCanonicaContext`
- typed context/event/runtime interfaces

The SDK loads `public/widget/canonica-widget.js`, queues page context until runtime is available, and validates/sanitizes safe context fields using the same bounds as the widget runtime.

Package-local build metadata is present in `packages/canonica-web/package.json` and `packages/canonica-web/tsconfig.json`. Publishing remains a release operation; website copy describes the helper and install screen, not an already-published public registry artifact.

## Quickstarts

`src/app/sites/canonica/quickstarts/page.tsx` provides copyable examples for:

- Next.js App Router
- React SPA
- Vue/Nuxt
- vanilla script

## Install Verifier

`CanonicaWidgetManagement.tsx` now shows a verifier checklist:

- Widget key ready
- Script loaded recently
- Origin valid
- Route allowed
- Context arriving

The checklist uses `runtimeStatus`, `allowedOrigins`, `blockedRoutes`, and widget key metadata already returned by `/api/canonica/widget-config`.

## Surface Templates

`src/data/canonica/surfaceTemplates.ts` defines six starter surfaces. `CanonicaProductSurfaces.tsx` lets owners add one or all missing templates. The save path reuses `saveProductSurface()` and rebuilds the compact surface summary once after template application.

## Importer Starter Pack

`UploadModal.tsx` now provides starter text templates for Markdown docs, FAQ CSV, changelog entries, and ticket macros. It still creates the existing ingestion job and does not add crawling.

## Public Pages

New public pages:

- `/quickstarts`
- `/roi-calculator`
- `/proof`
- `/security-one-pager`

Site registry, footer, resources, pricing, install page, and LLM context files now link them.

# Developer Install Pack Implementation

## Typed SDK

`packages/canonica-web/src/index.ts` exports:

- `createCanonicaWebClient`
- `validateCanonicaPageContext`
- `validateCanonicaContext`
- typed context/event/runtime interfaces

The SDK loads `public/widget/canonica-widget.js`, queues page context until runtime is available, and validates/sanitizes safe context fields using the same bounds as the widget runtime.

Package-local build metadata is present in `packages/canonica-web/package.json` and `packages/canonica-web/tsconfig.json`. Publishing remains a release operation; website copy describes the helper and install screen, not an already-published public registry artifact.

## Environment Handoff

The dashboard and public quickstarts now recommend env-backed installs for client products:

```bash
# Next.js / Vercel
NEXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js

# Vite / React SPA
VITE_CANONICA_WIDGET_KEY=cn_your_widget_key
VITE_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js

# Nuxt
NUXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NUXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js
```

This is guidance, not a new Canonica runtime feature. The only browser-safe credential is the public `cn_*` widget key. Client products must not put Firebase service accounts, Canonica admin credentials, private API keys, tenant IDs, store IDs, user IDs, or customer records in frontend env files.

## Quickstarts

`src/app/sites/canonica/quickstarts/page.tsx` provides copyable examples for:

- Next.js App Router
- React SPA
- Vue/Nuxt
- vanilla script

Framework examples read from client-safe env variables where the framework supports that pattern. Plain HTML can either use the direct dashboard snippet or inject the values through the product's build template.

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

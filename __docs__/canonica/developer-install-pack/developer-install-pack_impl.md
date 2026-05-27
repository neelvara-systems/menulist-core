# Canonica Developer Install Pack v1 Implementation

## Optional Typed Browser Helper

`packages/canonica-web/src/index.ts` exports:

- `createCanonicaWebClient`
- `validateCanonicaPageContext`
- `validateCanonicaContext`
- typed context/event/runtime interfaces

The SDK is not the Canonica runtime authority and is not required for installation. The stable public contract remains:

- Script URL: `https://canonica.app/widget/v1/canonica-widget.js`
- Public widget key: `cn_*`
- Browser global: `window.CanonicaWidget`
- Context methods: `setContext()` and `page()`

The helper may load the script, queue page context until runtime is available, and validate/sanitize context before calling the runtime. Legacy `/widget/canonica-widget.js` installs remain accepted, but generated docs and packets point agents to `/widget/v1/canonica-widget.js`.

Package-local build metadata is present in `packages/canonica-web/package.json` and `packages/canonica-web/tsconfig.json`. Publishing remains a release operation; website copy describes the helper and install screen, not an already-published public registry artifact.

## Environment Handoff

The dashboard and public quickstarts now recommend env-backed installs for client products:

```bash
# Next.js / Vercel
NEXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/v1/canonica-widget.js

# Vite / React SPA
VITE_CANONICA_WIDGET_KEY=cn_your_widget_key
VITE_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/v1/canonica-widget.js

# Nuxt
NUXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key
NUXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/v1/canonica-widget.js
```

This is guidance, not a new Canonica runtime authority model. The only browser-safe credential is the public `cn_*` widget key. Client products must not put Firebase service accounts, Canonica admin credentials, private API keys, tenant IDs, store IDs, user IDs, emails, phones, billing data, or customer records in frontend env files.

## Agent Install Contract Source

`src/lib/canonica/installContract/contract.ts` is the single source for:

- v1 widget script URL, compatibility URLs, widget global, context methods, env var names, public docs routes, and agent file targets.
- canonical v1 safe context fields, compatibility-only legacy context mapping, and forbidden context fields.
- blocked route defaults.
- copyable AI install prompt.
- AGENTS.md, CLAUDE.md, Cursor `RULE.md`, Cursor `.mdc`, Windsurf, and skill output.
- public Markdown install docs.
- llms.txt and llms-full.txt install entries.
- dashboard packet JSON and agent-kit ZIP file contents.

Public pages, Markdown mirrors, the dashboard Install Center, protected ZIP download, and public agent-file routes read from this source instead of maintaining separate hand-written instructions.

No public page, dashboard packet, ZIP file, or agent-specific instruction file may define install instructions separately.

## Quickstarts

`src/app/sites/canonica/quickstarts/page.tsx` provides copyable examples for:

- Next.js App Router
- React SPA
- Vue/Nuxt
- vanilla script

Framework examples read from client-safe env variables where the framework supports that pattern. Plain HTML can either use the direct dashboard snippet or inject the values through the product's build template. The new `/install/frameworks/*` pages provide the agent-ready versions and `.md` mirrors.

## Dashboard Install Center

`src/components/templates/canonica/install/CanonicaInstallCenter.tsx` is the dashboard route for workspace-specific install handoff:

- Copy AI install packet
- Copy AGENTS.md
- Copy CLAUDE.md
- Copy Cursor RULE.md
- Copy Cursor .mdc
- Copy Windsurf rule
- Download workspace-specific agent kit ZIP
- Current widget setup snapshot
- Public v1 script URL and generic snippet
- Framework snippets
- Machine-readable docs links
- Widget key ready
- Script loaded recently
- Origin valid
- Route allowed
- Context arriving

The route uses `runtimeStatus`, `allowedOrigins`, `blockedRoutes`, and widget key metadata already returned by `/api/canonica/widget-config`. It optionally reads `/api/canonica/activation/summary` for workspace name/readiness. The widget management Install tab now links to `/canonica/install-center` instead of duplicating the full agent packet. Existing `/canonica/widget` remains the widget configuration route and must keep working. The protected packet/kit endpoints perform one authenticated store read and never return the raw key by default.

The workspace-specific agent kit ZIP may include widget key prefix, allowed origins, blocked routes, public script URL, framework choice, install checklist, and env placeholders. It must not include the raw widget key unless the user explicitly chooses a one-time include/reveal action through the existing key flow.

## Widget Script Caching

`/widget/v1/canonica-widget.js` is stable and backward-compatible, but not immutable. The route uses:

```http
Cache-Control: public, max-age=300, stale-while-revalidate=86400
```

Do not use long immutable caching on `/widget/v1/canonica-widget.js`. If Canonica later ships content-addressed builds, those may use immutable URLs such as `/widget/v1/builds/{hash}/canonica-widget.js`, while generated install docs continue to point to the stable v1 URL.

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
- `/install/ai-agent`
- `/install/manual`
- `/install/frameworks/nextjs`
- `/install/frameworks/react`
- `/install/frameworks/vue`
- `/install/frameworks/plain-html`
- `/install/frameworks/shopify`
- `/install/frameworks/webflow`
- `/install/verify`
- `/install/security`
- `/install/contracts`
- `/install/changelog`

Site registry, footer, resources, pricing, install page, and LLM context files now link them.

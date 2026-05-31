# Answerlattice Developer Install Pack v1 Implementation

## Supported Browser Contract

- Script URL: `https://answerlattice.com/widget/v1/answerlattice-widget.js`
- Public widget key: `al_*`
- Browser global: `window.AnswerlatticeWidget`
- Context methods: `setContext()` and `page()`

Answerlattice does not support a public SDK or npm install path. Existing internal helper source may stay in the repo for experiments, but public pages, dashboard snippets, Markdown mirrors, agent files, and ZIP packets must not offer it to end users. Generated docs and packets point agents to `/widget/v1/answerlattice-widget.js`.

## Environment Handoff

The dashboard and public quickstarts now recommend env-backed installs for client products:

```bash
# Next.js / Vercel
NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY=al_your_widget_key
NEXT_PUBLIC_ANSWERLATTICE_WIDGET_SCRIPT_SRC=https://answerlattice.com/widget/v1/answerlattice-widget.js

# Vite / React SPA
VITE_ANSWERLATTICE_WIDGET_KEY=al_your_widget_key
VITE_ANSWERLATTICE_WIDGET_SCRIPT_SRC=https://answerlattice.com/widget/v1/answerlattice-widget.js

# Nuxt
NUXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY=al_your_widget_key
NUXT_PUBLIC_ANSWERLATTICE_WIDGET_SCRIPT_SRC=https://answerlattice.com/widget/v1/answerlattice-widget.js
```

This is guidance, not a new Answerlattice runtime authority model. The only browser-safe credential is the public `al_*` widget key. Client products must not put Firebase service accounts, Answerlattice admin credentials, private API keys, tenant IDs, store IDs, user IDs, emails, phones, billing data, or customer records in frontend env files.

## Agent Install Contract Source

`src/lib/answerlattice/installContract/contract.ts` is the single source for:

- v1 widget script URL, widget global, context methods, env var names, public docs routes, and agent file targets.
- canonical v1 safe context fields and forbidden context fields.
- dashboard-owned blocked route defaults for packet context.
- copyable AI install prompt.
- AGENTS.md, CLAUDE.md, Cursor `RULE.md`, Cursor `.mdc`, Windsurf, and skill output.
- public Markdown install docs.
- llms.txt and llms-full.txt install entries.
- dashboard packet JSON and agent-kit ZIP file contents.

Public pages, Markdown mirrors, the dashboard Install Center, protected ZIP download, and public agent-file routes read from this source instead of maintaining separate hand-written instructions.

No public page, dashboard packet, ZIP file, or agent-specific instruction file may define install instructions separately.

## Quickstarts

`src/app/sites/answerlattice/quickstarts/page.tsx` provides copyable examples for:

- Next.js App Router
- React SPA
- Vue/Nuxt
- vanilla script

Framework examples read from client-safe env variables where the framework supports that pattern. Plain HTML can either use the direct dashboard snippet or inject the values through the product's build template. The new `/install/frameworks/*` pages provide the agent-ready versions and `.md` mirrors.

## Dashboard Install Center

`src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx` is the dashboard route for workspace-specific install handoff:

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
- Origins saved in Answerlattice
- Blocked routes saved in Answerlattice
- Context arriving

The route uses `runtimeStatus`, `allowedOrigins`, `blockedRoutes`, and widget key metadata already returned by `/api/answerlattice/widget-config`. It optionally reads `/api/answerlattice/activation/summary` for workspace name/readiness. The widget management Install tab now links to `/answerlattice/install-center` instead of duplicating the full agent packet. Existing `/answerlattice/widget` remains the widget configuration route and must keep working. The protected packet/kit endpoints perform one authenticated store read and never return the raw key by default.

The workspace-specific agent kit ZIP may include widget key prefix, dashboard-owned allowed origins, dashboard-owned blocked routes, public script URL, framework choice, install checklist, and env placeholders. It must not include the raw widget key unless the user explicitly chooses a one-time include/reveal action through the existing key flow.

Allowed origins and blocked routes are edited in Answerlattice dashboard UI. The generated agent packet may include the saved values for verification and local route-guard decisions, but must not tell the client product to create duplicate owner settings.

## Widget Script Caching

`/widget/v1/answerlattice-widget.js` is stable and backward-compatible, but not immutable. The route uses:

```http
Cache-Control: public, max-age=300, stale-while-revalidate=86400
```

Do not use long immutable caching on `/widget/v1/answerlattice-widget.js`. If Answerlattice later ships content-addressed builds, those may use immutable URLs such as `/widget/v1/builds/{hash}/answerlattice-widget.js`, while generated install docs continue to point to the stable v1 URL.

## Surface Templates

`src/data/answerlattice/surfaceTemplates.ts` defines six starter surfaces. `AnswerlatticeProductSurfaces.tsx` lets owners add one or all missing templates. The save path reuses `saveProductSurface()` and rebuilds the compact surface summary once after template application.

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

Machine-readable only:

- `/install/contracts.md`

Site registry, footer, resources, pricing, install page, and LLM context files now link them.

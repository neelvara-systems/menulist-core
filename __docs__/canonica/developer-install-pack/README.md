# Canonica Developer Install Pack v1

## Purpose

The Developer Install Pack turns Canonica's existing widget/runtime, product surfaces, KB ingestion, and public website into a day-one buyer/developer package for AI-built SaaS founders.

## Implemented Pieces

- Canonica v1 install contract source of truth: `src/lib/canonica/installContract/contract.ts`
- Public agent install pages: `/install/ai-agent`, `/install/manual`, `/install/frameworks/*`, `/install/verify`, `/install/security`, `/install/contracts`, `/install/changelog`
- Machine-readable install docs: `/install.md`, `/install/ai-agent.md`, framework `.md` mirrors, `/llms.txt`, and `/llms-full.txt`
- Public agent files: `/agents/canonica/AGENTS.md`, `/agents/canonica/CLAUDE.md`, `/agents/canonica/cursor/RULE.md`, `/agents/canonica/cursor.mdc`, `/agents/canonica/windsurf.md`, `/agents/canonica/skill/SKILL.md`, and `/agents/canonica/canonica-agent-kit.zip`
- Dashboard Install Center: `/canonica/install-center` shows the workspace setup snapshot, AI install packet, AGENTS/CLAUDE/Cursor/Windsurf copies, framework snippets, verification checklist, machine-readable docs, and links back to widget settings.
- Workspace packet APIs: `/api/canonica/widget-agent-packet` and `/api/canonica/widget-agent-kit`
- Frozen widget script URL: `https://canonica.app/widget/v1/canonica-widget.js`
- Optional typed web helper source package: `packages/canonica-web/src/index.ts`
- Framework quickstarts: `src/app/sites/canonica/quickstarts/page.tsx`
- Install/context verifier route: `src/components/templates/canonica/install/CanonicaInstallCenter.tsx`
- Product surface starter templates: `src/data/canonica/surfaceTemplates.ts`
- Importer starter pack: `src/components/templates/platform/KBGeneration/UploadModal.tsx`
- Public ROI calculator: `src/app/sites/canonica/roi-calculator/page.tsx`
- Proof pack: `src/app/sites/canonica/proof/page.tsx`
- Security/ops one-pager: `src/app/sites/canonica/security-one-pager/page.tsx`
- Env-backed install guidance: dashboard Install tab, public Install page, Quickstarts page, and `packages/canonica-web/README.md`

## Product Boundary

This pack does not create a second widget, a second ingestion pipeline, a public API promise, MCP access, or a separate support product. It packages the existing Canonica runtime so buyers can hand one agent packet to their coding agent, install the widget, verify runtime status, seed starter surfaces, and evaluate support knowledge faster.

The frozen public contract is the v1 browser contract: `https://canonica.app/widget/v1/canonica-widget.js`, `cn_*` widget key, `window.CanonicaWidget`, `setContext()`, and `page()`. The typed helper is optional and not required for installation.

## Key Handling

Workspace-specific packets and ZIPs include widget key prefix, allowed origins, blocked routes, public script URL, framework hints, install checklist, and env placeholders by default. They must not include the raw widget key unless the user explicitly reveals or copies the key through the existing key flow.

## Client Env Guidance

Client products should keep only browser-safe Canonica values in env:

- `NEXT_PUBLIC_CANONICA_WIDGET_KEY` / `VITE_CANONICA_WIDGET_KEY` / `NUXT_PUBLIC_CANONICA_WIDGET_KEY`
- optional `*_CANONICA_WIDGET_SCRIPT_SRC` override for staging or custom script hosts

Do not put Firebase service accounts, Canonica admin credentials, private API keys, tenant IDs, store IDs, user IDs, emails, phone numbers, billing data, or customer records in client-side env files. The widget key is a public publishable credential and still relies on allowed origins, blocked routes, rate limits, and server-side key validation.

## Cost Position

Most additions are static website/client UI. Opening `/canonica/install-center` uses the existing widget-config read and optionally the activation summary read; the protected ZIP endpoint performs one authenticated store read when downloaded. No new collection scan, listener, scheduled job, or telemetry collection is part of the install center. Firebase cost also changes when an authenticated owner chooses to apply starter surfaces or upload/import starter knowledge.

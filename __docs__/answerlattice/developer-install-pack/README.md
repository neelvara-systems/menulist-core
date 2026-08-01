# Answerlattice Developer Install Pack v1

## Purpose

The Developer Install Pack turns Answerlattice's existing widget/runtime, product surfaces, KB ingestion, and public website into a day-one buyer/developer package for AI-built SaaS founders.

## Implemented Pieces

- Answerlattice v1 install contract source of truth: `src/lib/answerlattice/installContract/contract.ts`
- Public agent install pages: `/install/ai-agent`, `/install/manual`, and `/install/frameworks/*`
- Machine-readable install docs: `/install.md`, `/install/ai-agent.md`, framework `.md` mirrors, `/install/contracts.md`, `/llms.txt`, and `/llms-full.txt`
- Public agent files: `/agents/answerlattice/AGENTS.md`, `/agents/answerlattice/CLAUDE.md`, `/agents/answerlattice/cursor/RULE.md`, `/agents/answerlattice/cursor.mdc`, `/agents/answerlattice/windsurf.md`, `/agents/answerlattice/skill/SKILL.md`, and `/agents/answerlattice/answerlattice-agent-kit.zip`
- Dashboard Install Center: `/answerlattice/install-center` shows the workspace setup snapshot, AI install packet, AGENTS/CLAUDE/Cursor/Windsurf copies, framework snippets, verification checklist, machine-readable docs, and links back to widget settings.
- Workspace packet APIs: `/api/answerlattice/widget-agent-packet` and `/api/answerlattice/widget-agent-kit`
- Frozen widget script URL: `https://answerlattice.com/widget/v1/answerlattice-widget.js`
- Framework quickstarts: `src/app/sites/answerlattice/quickstarts/page.tsx`
- Install/context verifier route: `src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx`
- Product surface starter templates: `src/data/answerlattice/surfaceTemplates.ts`
- Importer starter pack: `src/components/templates/platform/KBGeneration/UploadModal.tsx`
- Public ROI calculator: `src/app/sites/answerlattice/roi-calculator/page.tsx`
- Proof pack: `src/app/sites/answerlattice/proof/page.tsx`
- Security/ops one-pager: `src/app/sites/answerlattice/security-one-pager/page.tsx`
- Env-backed install guidance: dashboard Install tab, public Install page, and Quickstarts page

Generated Next.js, React, and Vue quickstarts acknowledge async widget load
before relying on the initial page-context delivery, then continue updating
context after client-side navigation.

## Product Boundary

This pack does not create a second widget, a second ingestion pipeline, a separately versioned npm SDK, a broad public API promise, MCP access, or a separate support product. It packages the existing Answerlattice runtime so buyers can hand one agent packet to their coding agent, install the widget, verify runtime status, seed starter surfaces, and evaluate support knowledge faster.

The frozen first-party browser SDK contract is `https://answerlattice.com/widget/v1/answerlattice-widget.js`, the public `al_*` widget key, `window.AnswerlatticeWidget`, `setContext()`, and `page()`. Answerlattice does not support a separately installed npm package or a broad general-purpose public SDK.

## Key Handling

Workspace-specific packets and ZIPs include an explicit full-key placeholder, a saved-key identifier for dashboard lookup, dashboard-owned allowed origins, dashboard-owned blocked routes, public script URL, framework hints, install checklist, and env placeholders by default. They must not include the raw widget key unless the user explicitly reveals or copies the key through the existing key flow. The saved-key identifier is not installable.

Allowed origins and blocked routes are configured in Answerlattice dashboard UI. Generated prompts must not ask owners to maintain separate `ALLOWED_ORIGINS` or `BLOCKED_ROUTES` variables in the client product.

Generated HTML snippets escape widget-key and blocked-route attribute values before copy. Workspace packet and ZIP responses are private, `no-store`, `nosniff`, actor/workspace rate-limited, permission checked, and exact-scope checked. The Install Center downloads the ZIP through a same-origin no-store request, requires a successful ZIP response, and enforces a 2 MiB response cap before saving it.

## Client Env Guidance

Client products should keep only browser-safe Answerlattice values in env:

- `NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY` / `VITE_ANSWERLATTICE_WIDGET_KEY` / `NUXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY`
- optional `*_ANSWERLATTICE_WIDGET_SCRIPT_SRC` override for staging or custom script hosts

Do not put Firebase service accounts, Answerlattice admin credentials, private API keys, tenant IDs, store IDs, user IDs, emails, phone numbers, billing data, or customer records in client-side env files. The widget key is a public publishable credential and still relies on allowed origins, blocked routes, rate limits, and server-side key validation.

## Cost Position

Most additions are static website/client UI. Opening `/answerlattice/install-center` uses the existing widget-config read and optionally the activation summary read; the protected ZIP endpoint performs one authenticated store read when downloaded. No new collection scan, listener, scheduled job, or telemetry collection is part of the install center. Firebase cost also changes when an authenticated owner chooses to apply starter surfaces or upload/import starter knowledge.

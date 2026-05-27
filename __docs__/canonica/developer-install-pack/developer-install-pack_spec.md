# Canonica Developer Install Pack v1 Spec

## Goal

Help a Canonica client reach the first successful support install quickly:

1. Understand value from public quickstarts, ROI, proof, and security summaries.
2. Create a workspace.
3. Seed starter product surfaces.
4. Import starter knowledge.
5. Install the widget.
6. Verify key, origin, route, and page context.
7. Hand a generated Canonica install packet to Codex, Claude Code, Cursor, Windsurf, or another coding agent when the product owner is not coding manually.

## In Scope

- Frozen Canonica Widget Contract v1 centered on `https://canonica.app/widget/v1/canonica-widget.js`.
- Frozen safe context contract for canonical v1 fields: `path`, `title`, `feature`, `workflow`, `role`, and `locale`.
- Legacy compatibility fields accepted by runtime sanitization but not promoted as canonical v1 fields:
  - `contextKey` -> normalized to a workflow or internal routing hint.
  - `page` -> normalized to a title or path hint.
  - `userRole` -> normalized to `role`.
  - `plan` -> accepted only as a public plan label, never subscription ID, billing ID, entitlement object, or pricing metadata.
  - `entityHints` -> accepted only as public slugs/tags/hints, never tenant IDs, store IDs, internal entity IDs, user IDs, emails, or customer records.
- Generated public agent files: AGENTS.md, CLAUDE.md, Cursor `RULE.md`, Cursor `.mdc`, Windsurf rule, Codex skill, and agent kit ZIP.
- Public install pages and Markdown mirrors generated from one contract source.
- Dashboard `/canonica/install-center` route generated from the workspace widget key prefix, allowed origins, blocked routes, runtime status, and v1 contract source.
- Optional typed browser helper around `window.CanonicaWidget`; the browser contract remains the required integration surface.
- Quickstarts for Next.js App Router, React SPA, Vue/Nuxt, and vanilla script.
- Dashboard install verifier based on existing widget runtime telemetry.
- Starter surface templates for Billing, Onboarding, Team Settings, Releases, Integrations, and Common Errors.
- Import starter templates for Markdown docs, FAQ CSV, changelog entries, and ticket macros.
- Static public ROI calculator.
- Public proof pack with clearly labeled example workloads.
- Shareable security and operations one-pager.

## Contract Names

- Canonica Widget Contract v1
- Canonica Safe Context Contract v1
- Canonica Agent Install Packet v1
- Canonica Developer Install Pack v1

## Out of Scope

- No autonomous publishing.
- No URL crawling expansion.
- No new public write APIs.
- No new scheduled jobs.
- No separate helpdesk product.
- No claim that the SDK bypasses widget keys, allowed origins, or server-side authorization.
- No public API v1 self-serve promise. Public API remains rollout-gated and secondary to widget install.
- No MCP promise. Agent-facing install docs are static/context files, not runtime agent write access.

## Acceptance Criteria

### Public Discoverability

- Public install pages are included in sitemap and public Canonica navigation.
- Public install pages are included in `/llms.txt` and `/llms-full.txt`.
- Markdown mirrors exist for install overview, AI agent packet, manual install, Next.js, React, Vue/Nuxt, plain HTML, Shopify, Webflow, verify, security, contracts, and changelog.

### Contract Stability

- `/widget/v1/canonica-widget.js` returns the current widget runtime.
- Legacy `/widget/canonica-widget.js` installs remain compatible.
- Generated docs and packets point new installs to `/widget/v1/canonica-widget.js`.
- The frozen browser contract is script URL + `cn_*` key + `window.CanonicaWidget` + `setContext()` + `page()`.
- SDK/helper package is optional and not required for installation.
- `/widget/v1/canonica-widget.js` uses bounded public caching, not long immutable caching.

### Context Safety

- Canonical v1 context fields are `path`, `title`, `feature`, `workflow`, `role`, and `locale`.
- Legacy fields are accepted only through normalization/sanitization.
- `plan` is accepted only as a public plan label.
- `entityHints` accepts only public slugs/tags/hints.
- Forbidden context fields are dropped or rejected: tenantId, storeId, userId, email, phone, token, cookie, JWT, secret, billingId, subscriptionId, payment data, customer records, and private account metadata.

### Agent Packet Generation

- AGENTS.md, CLAUDE.md, Cursor `RULE.md`, Cursor `.mdc`, Windsurf rule, Codex skill, Markdown docs, dashboard packet JSON, and agent kit ZIP render from the same contract source.
- Generated packet does not expose the raw widget key unless the user explicitly copies/reveals the key through the existing key flow.
- Workspace-specific ZIP contains key prefix, allowed origins, blocked routes, framework hints, and env placeholders by default.
- Tool-specific files are wrappers around the Canonica v1 contract, not independent hand-written docs.

### Dashboard Install Center

- `/canonica/install-center` is the single dashboard route for agent handoff, setup snapshot, framework snippets, machine-readable docs, and install verification.
- `/canonica/widget` remains compatible and links to `/canonica/install-center`.
- The Install Center uses existing widget config/runtime status and optional activation summary.
- The verifier adds no collection scans, no new scheduled jobs, no new listeners, and no new telemetry collection.

### Starter Setup

- Surface templates create only product surface records.
- Surface templates do not create authoritative knowledge automatically.
- Starter knowledge templates feed the existing KB generation job source flow.
- Importer does not crawl URLs.
- Generated knowledge remains review-required before becoming canonical.

### Public Claims

- Public ROI calculator is static and assumption-labeled.
- Proof pack examples are labeled as examples unless backed by real customer evidence.
- Security one-pager describes implemented runtime behavior only.
- Public API v1 remains rollout-gated and secondary to widget install.
- MCP is not promised.
- Runtime behavior claims match implemented Canonica behavior.

## Contract Tests

- `/widget/v1/canonica-widget.js` returns 200 and uses non-immutable caching.
- `/widget/canonica-widget.js` remains compatible.
- Public install docs, Markdown mirrors, `/llms.txt`, and `/llms-full.txt` render from the contract source.
- Agent files render from `src/lib/canonica/installContract/contract.ts`.
- Dashboard packet and agent kit do not include raw widget keys by default.
- Forbidden context fields are rejected or dropped by validation/runtime sanitization.
- Legacy context fields normalize to safe canonical or compatibility fields.
- `/canonica/install-center` is gated by Canonica product scope.
- `/canonica/widget` still renders and links to Install Center.
- Agent kit ZIP manifest contains no secrets by default.

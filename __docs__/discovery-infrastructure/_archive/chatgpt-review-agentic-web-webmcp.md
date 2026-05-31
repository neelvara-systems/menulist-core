# ChatGPT Review — Agentic Web, WebMCP, and MenuList PAL

**Date:** 2026-05-23
**Source:** YouTube session `https://youtu.be/HdCc-KezQPk` plus ChatGPT conversation provided by the founder
**Status:** Reviewed against live MenuList and Answerlattice code/docs
**Decision:** Partial acceptance with bounded implementation

---

## Executive Summary

The video's core claim is valid: websites now need to be legible to browser agents through visible actions, semantic HTML, DOM structure, accessibility tree quality, structured data, and eventually WebMCP tools.

The ChatGPT plan was directionally right for MenuList: MenuList should own verified public business truth, not operational POS/CRM/payment execution. The plan was less useful where it implied building a new full fact graph, MCP server, and WebMCP catalog immediately. The repo already has major discovery infrastructure, and WebMCP is still an emerging browser standard.

Immediate accepted change:

- tighten MenuList `llms.txt` / `llms-full.txt` around agent boundaries and unknown handling
- add Answerlattice `llms.txt` / `llms-full.txt` routes so `answerlattice.com` has product-specific agent context
- server-render active website JSON-LD for MenuList and Answerlattice public pages
- keep redirected legacy URLs out of sitemap and agent-context inventories
- document PAL as a discovery-infrastructure posture, not a new unbounded product surface

Deferred:

- WebMCP tools
- MenuList MCP server
- new public mutation tools
- direct public agent edits to business truth or Answerlattice canonical answers

---

## Video and Source Check

Verified current official Chrome docs:

- WebMCP is a proposed web standard for exposing structured tools to AI agents on websites: `https://developer.chrome.com/docs/ai/webmcp`
- Chrome describes WebMCP as progressive enhancement for reliable browser actuation, with discovery, JSON Schema inputs/outputs, and page state.
- WebMCP requires a browser tab or WebView context and is not headless/persistent backend access.
- Chrome distinguishes WebMCP from MCP: WebMCP is frontend/browser context; MCP is backend/external systems.
- Chrome's declarative API turns annotated forms into tools with `toolname` and `tooldescription`.
- Chrome's eval guidance says model-facing tools need evals because agents are probabilistic.

Strategic interpretation:

- WebMCP is an interaction layer.
- MenuList's durable moat is the truth layer below it.
- Answerlattice's durable moat is governed support knowledge, not a public chatbot promise.

---

## Decision Matrix

| ChatGPT idea | Verdict | Decision |
| --- | --- | --- |
| MenuList should own public business truth for humans, search, and agents | Agree | Already aligned with discovery infrastructure and canonical truth docs; reinforce through PAL docs and LLM files |
| WebMCP should be the strategy | Reject | WebMCP is browser-context progressive enhancement; truth layer remains the core |
| Build a Canonical Fact Graph from scratch | Partial | Existing canonical truth, MCE/MOL/snapshots, schema, public API, and discovery docs already cover much of this; do not duplicate a parallel model today |
| Public agents should get read-only business/menu facts and handoff links | Agree | Agent context files now state this boundary |
| Public agents should directly update prices, hours, POS, orders, or canonical answers | Reject | Owner/admin verification remains required |
| Add Answerlattice to the same PAL plan | Partial | Answerlattice is a separate product; it gets product-specific agent context files, not MenuList business-truth positioning |
| Add MCP server now | Defer | Needs security, cost, API scope, evals, and docs-first implementation |
| Add WebMCP tools now | Defer | Needs origin-trial maturity, typed React attribute handling, feature flags, evals, and visible UI synchronization |

---

## Product Boundaries

### MenuList

PAL means: public business truth is readable and action-aware for humans, crawlers, search engines, and agents.

Current production surfaces:

- public OBP/menu pages
- schema.org JSON-LD
- robots/sitemaps
- `llms.txt` and `llms-full.txt`
- public API v1 where enabled
- POS webhook delivery where configured

MenuList must not become:

- POS
- payment/order execution
- CRM
- payroll
- private customer-data automation
- direct public-agent mutation surface

### Answerlattice

Answerlattice is not a restaurant/business truth layer. It is the Governed Answer Infrastructure for SaaS Support.

The relevant agent-readiness action is product-specific:

- explain the website and product routes clearly to agents
- keep Answerlattice's category and non-goals explicit
- expose supported public pages, demo, install, security, and FAQ context
- prevent agents from describing Answerlattice as helpdesk replacement or AI autopilot

---

## Current Implementation Result

Implemented in this pass:

- `src/components/seo/JsonLdScript.tsx`
- `src/components/website/SchemaMarkup.tsx`
- `src/components/website/WebsitePageStructuredData.tsx`
- `src/app/sites/answerlattice/components/StructuredData.tsx`
- `src/app/sites/answerlattice/components/PageStructuredData.tsx`
- `src/app/sites/answerlattice/llms.txt/route.ts`
- `src/app/sites/answerlattice/llms-full.txt/route.ts`
- `public/llms.txt`
- `public/llms-full.txt`
- `public/sitemap.xml`
- `public/robots.txt`
- `scripts/verification/verify-agent-readiness.js`
- discovery/website docs updated to document PAL, server-rendered structured-data coverage, redirected-route cleanup, and agent-action boundaries

No Firebase reads/writes, Cloud Functions, rules, or indexes were added.

---

## Future Implementation Gates

Before adding WebMCP tools:

1. Confirm current Chrome API status and origin-trial requirements from official docs.
2. Add a feature flag.
3. Pick one narrow visible workflow: search menu items, show opening hours, show official action links, or start correction submission.
4. Keep public tools read-only or pending-suggestion only.
5. Add deterministic tests and agent eval prompts.
6. Verify UI synchronization for every tool result.

Before adding an MCP server:

1. Define public read-only scope.
2. Reuse existing public API auth/rate-limit/ETag patterns where applicable.
3. Document Firebase read cost.
4. Keep mutations as pending suggestions.
5. Add abuse logging and scoped credentials.

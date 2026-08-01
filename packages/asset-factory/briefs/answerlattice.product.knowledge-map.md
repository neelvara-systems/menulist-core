# Asset Brief - answerlattice.product.knowledge-map

**Generated:** 2026-07-29
**Brand:** answerlattice
**Status:** approved
**Approval:** automatic
**Autonomy level:** 2
**Output file:** packages/asset-factory/briefs/answerlattice.product.knowledge-map.md

## Intent

Show a curated product hierarchy with answer coverage, drift, and review state instead of exposing the raw ontology graph.

## Placement

- Page: Knowledge governance product page
- Route: /product/knowledge-governance
- Placement: curated Knowledge Map proof
- Component: src/app/sites/answerlattice/product/knowledge-governance/page.tsx
- Destination: public/answerlattice-knowledge-map.webp

## Output Contract

- primary: webp, 6:5, max 220 KB

## Existing Files

- primary: public/answerlattice-knowledge-map.webp

## Narrative Rules

- Use dark infrastructure visual language with restrained teal or verdigris controls.
- Show support knowledge governance, canonical answers, hosted help, and page-aware context.
- Use product-surface diagrams, status boards, and controlled proof scenes instead of generic SaaS dashboards.
- Keep Answerlattice separate from MenuList restaurant visuals and MenuList tenant data.

## Rejection Rules

- No restaurant, menu, ordering, POS, or local business visuals.
- No claims that Answerlattice is a helpdesk, CMS, autonomous chatbot, or generic AI support tool.
- No live customer support data, private tickets, or tenant identifiers.
- No bright generic startup gradient art or unrelated dashboard mockups.
- No public capability claim that is not present in Answerlattice route/docs/runtime.
- No raw entity graph, unrestricted cross-links, private tickets, or internal candidate entities.
- No invented demand score, trend, support-volume count, or customer metric.

## Mobile Requirements

- Mobile required: yes
- Mobile max KB: 220
- Notes: The curated hierarchy and selected-node pattern must remain recognizable without horizontal canvas interaction; surrounding copy carries exact states.

## Source Files To Inspect

- packages/asset-factory/brand/answerlattice.asset-context.md: Answerlattice Asset Context
- __docs__/answerlattice/answerlattice-website/README.md: AnswerLattice Website (answerlattice.com)
- __docs__/answerlattice/knowledge-map/README.md: Answerlattice Knowledge Map
- __docs__/answerlattice/knowledge-map/knowledge-map_website.md: Knowledge Map Website Truth
- scripts/website-assets/generate-answerlattice-website-dummy-assets.js: Source file
- src/app/sites/answerlattice/product/knowledge-governance/page.tsx: Source file
- src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx: Source file
- src/app/sites/answerlattice/answerlatticeWebsiteAssets.ts: Source file

## Brand Context Snapshot

# Answerlattice Asset Context

**Product boundary:** Governed Answer Infrastructure
**Asset-system role:** Internal input for Website Asset Operating System
**Public-product status:** Do not expose this as Answerlattice runtime

## Narrative

Answerlattice assets should show governed support knowledge moving from product surfaces, docs, FAQs, tickets, and releases into approved support answers and controlled customer-facing surfaces.

Assets must feel systemic, dark, restrained, and infrastructure-grade. Use Answerlattice's existing diagrams, status boards, proof blocks, and public website visual language as the reference system.

The official Answerlattice logo is design-final at `public/answerlattice-logo.svg`. Use that file as the canonical transparent source for Answerlattice logo UI, metadata, favicon, PWA, OpenGraph, and splash derivatives. UI components must follow the MenuList inline SVG-path pattern through `src/components/atoms/answerlatticeLogoMark/index.tsx` so the design-team geometry, colors, gradients, filters, and stroke widths are not reinterpreted. Visible website diagrams must stay vector-based through inline SVG paths and the shared logo atom, not PNGs, screenshots, or image-wrapped logo assets. Do not add external CSS blur or drop-shadow to the logo; any shadow/effect must come from the SVG-native design filters. Do not leave visible diagram sections on persistent transform/will-change compositing layers that can make inline SVG look rasterized while zooming. Do not redraw, recolor, reshape, simplify, reinterpret the logo mark, or reintroduce the exported black canvas/frame into logo assets.

## Approved Directions

- Canonical answers taking priority over generic retrieval.
- Page-aware support context.
- Hosted help and widget surfaces.
- Review loops for missed questions and drift.
- Product-surface governance.
- Founder/operator control without support-team sprawl.

## Rejection Rules

- No restaurant, menu, ordering, QR menu, or MenuList tenant imagery.
- No helpdesk, CMS, autonomous chatbot, or generic SaaS dashboard positioning.
- No private support tickets, customer identities, tenant IDs, or internal workspace data.
- No unsupported public claim about integrations, workflows, AI autonomy, or data handling.
- No bright generic startup gradient treatment.

## Source Docs

- `__docs__/answerlattice/answerlattice-website/README.md`
- `__docs__/answerlattice/doctrine/01-core-doctrine.md`
- `__docs__/answerlattice/doctrine/02-non-goals-charter.md`

## Safe Next Action

Safe deterministic generation is allowed if all rejection rules pass.

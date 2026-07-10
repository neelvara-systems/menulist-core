# Asset Brief - answerlattice.brand.logo.mark

**Generated:** 2026-07-10
**Brand:** answerlattice
**Status:** generated
**Approval:** automatic
**Autonomy level:** 2
**Output file:** packages/asset-factory/briefs/answerlattice.brand.logo.mark.md

## Intent

Keep the Answerlattice mark consistent across metadata and static previews.

## Placement

- Page: Answerlattice brand system
- Route: /
- Placement: static logo mark family
- Component: src/app/sites/answerlattice/components/AnswerlatticeLogoMark.tsx
- Destination: public/answerlattice-logo-mark.png

## Output Contract

- primary: png, icon, max 260 KB
- fallback: svg, icon, max 50 KB

## Existing Files

- primary: public/answerlattice-logo-mark.png
- fallback: public/answerlattice-logo.svg
- wide: public/answerlattice-logo-mark-wide.png

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

## Mobile Requirements

- Mobile required: yes
- Mobile max KB: 260
- Notes: Logo assets must stay crisp in favicon, PWA, and mobile metadata surfaces.

## Source Files To Inspect

- packages/asset-factory/brand/answerlattice.asset-context.md: Answerlattice Asset Context
- __docs__/answerlattice/answerlattice-website/README.md: AnswerLattice Website (answerlattice.com)
- src/app/sites/answerlattice/components/AnswerlatticeLogoMark.tsx: Source file
- src/components/atoms/answerlatticeLogoMark/index.tsx: Source file
- public/answerlattice-logo.svg: Source file
- scripts/website-assets/generate-answerlattice-logo-assets.js: Source file

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

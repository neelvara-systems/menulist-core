# Asset Brief - menulist.industry.service-list-businesses.proof-placeholder

**Generated:** 2026-07-10
**Brand:** menulist
**Status:** approved
**Approval:** automatic
**Autonomy level:** 2
**Output file:** packages/asset-factory/briefs/menulist.industry.service-list-businesses.proof-placeholder.md

## Intent

Show the shape of fictional service-list categories while routed demo screenshots remain pending.

## Placement

- Page: Service-list businesses industry page
- Route: /industries/service-list-businesses
- Placement: bounded multi-category demo proof
- Component: src/content/websiteIndustries.ts
- Destination: public/images/website/demo-placeholders/service-list-proof-grid-placeholder.svg

## Output Contract

- primary: svg, 16:9, max 10 KB

## Existing Files

- primary: public/images/website/demo-placeholders/service-list-proof-grid-placeholder.svg

## Narrative Rules

- Use concrete MenuList product surfaces, not generic restaurant stock visuals.
- Reinforce one owner-approved public source for menu and business truth.
- Use fictional or founder-approved demo data only.
- Keep customer-facing proof calm, direct, and implementation-backed.

## Rejection Rules

- No fake customer testimonials, logos, metrics, or reviews.
- No automatic Google, Instagram, WhatsApp, POS, payroll, CRM, or delivery-platform sync claims unless the source page implements that exact capability.
- No visible private tenant IDs, owner emails, phone numbers, or real customer data.
- No AI-themed visual language, prompt bubbles, robots, or generic glowing dashboards.
- No campaign/canvas/post-workbench UI inside MenuList.
- Temporary placeholder only; do not reuse as customer proof, Product Hunt proof, paid media, or final campaign creative.

## Mobile Requirements

- Mobile required: yes
- Mobile max KB: 10
- Notes: Preserve the sample-business boundary and category hierarchy on mobile.

## Source Files To Inspect

- packages/asset-factory/brand/menulist.asset-context.md: MenuList Asset Context
- __docs__/menulist-marketing-distribution/menulist-marketing-distribution_demo-placeholder-assets.md: MenuList Marketing Distribution - Demo Placeholder Assets
- src/content/websiteIndustries.ts: Source file

## Brand Context Snapshot

# MenuList Asset Context

**Product boundary:** MenuList customer-facing business truth infrastructure  
**Asset-system role:** Internal input for Website Asset Operating System  
**Public-product status:** Do not expose this as a MenuList owner feature

## Narrative

MenuList assets should show that the business owner has one approved public source and that customers see the current menu and business details everywhere that matters.

Assets must feel operational, calm, and concrete. Use product surfaces, public menu views, Official Business Page proof, QR/share surfaces, and setup relief. Avoid decorative technology metaphors.

## Approved Directions

- Official public source for menu and business truth.
- Owner-approved publishing.
- Public menu and Official Business Page visibility.
- Setup, review, and publish as a low-effort workflow.
- Customer browsing on mobile.
- Public surfaces staying consistent.

## Rejection Rules

- No fake customer testimonials, logos, metrics, or reviews.
- No real customer screenshots unless founder-approved and scrubbed.
- No owner emails, tenant IDs, private phone numbers, debug panels, or hidden environment details.
- No POS, payroll, CRM, inventory, accounting, ordering, delivery, or marketing-campaign claims.
- No automatic external-platform sync visuals unless the source implementation supports the exact claim.
- No generic AI visuals.

## Source Docs

- `__docs__/main-website/main-website_image-assets.md`
- `__docs__/main-website/README.md`
- `__docs__/constitution/11-product-evolution-doctrine.md`
- `__docs__/constitution/12-product-separation-doctrine.md`

## Safe Next Action

Safe deterministic generation is allowed if all rejection rules pass.

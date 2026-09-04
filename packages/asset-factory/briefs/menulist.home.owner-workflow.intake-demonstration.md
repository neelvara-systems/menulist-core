# Asset Brief - menulist.home.owner-workflow.intake-demonstration

**Generated:** 2026-08-31
**Brand:** menulist
**Status:** approved
**Approval:** automatic
**Autonomy level:** 2
**Output file:** packages/asset-factory/briefs/menulist.home.owner-workflow.intake-demonstration.md

## Intent

Show a small-business owner starting from an existing printed menu without presenting illustrative material as customer UGC.

## Placement

- Page: MenuList homepage
- Route: /
- Placement: post-hero owner workflow gallery intake demonstration
- Component: src/components/website/home/OwnerWorkflowGallerySection.tsx
- Destination: public/images/website/owner-workflow-intake-demo.webp

## Output Contract

- primary: webp, 4:5, max 180 KB

## Existing Files

- primary: public/images/website/owner-workflow-intake-demo.webp

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
- This is generated illustrative material; never label it as customer UGC, a testimonial, or a real MenuList customer.
- Do not include a readable business name, customer identity, platform logo, metric, or automatic-publishing implication.

## Mobile Requirements

- Mobile required: yes
- Mobile max KB: 180
- Notes: Keep the owner, phone, and existing printed menu recognizable in the single-column mobile sequence.

## Source Files To Inspect

- packages/asset-factory/brand/menulist.asset-context.md: MenuList Asset Context
- __docs__/main-website/main-website_content.md: Website Content — MenuList Main Website (menulist.ai)
- __docs__/main-website/main-website_image-assets.md: Website Image & Asset Requirements
- public/locales/menulist.ai/en-US.json: Source file
- src/components/website/home/OwnerWorkflowGallerySection.tsx: Source file

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

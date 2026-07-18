# Pricing Integrity Runtime Verification - July 16, 2026

**Local status:** Source complete
**Release status:** Pending external/owner evidence; not current launch certification

## Audited flows

1. Desktop and MobileShell base/option editing, validation, blank handling, owner feedback, and persistence.
2. Desktop/mobile bulk preview/apply, AI Menu Manager exact/relative commands, category bulk changes, and text/range preservation.
3. Extraction/review schemas plus standalone, publish, linked-outlet, and override normalization.
4. Owner quality summaries, missing-price filters, category reorder, numeric range filters, and variant-only pricing.
5. Public list/PDP, share cards, Decision Block analytics, Digital Screens highlights/menu board, Menu Card Export, and fresh PDF generation.
6. Public cache/OBP revalidation, configured-screen version propagation, dormant engine/queue isolation, pricing-plan public/rules boundary, Firebase cost, and failure behavior.

## Fixes retained

- Added one 40-character canonical persisted value boundary and in-memory project normalization.
- Removed mobile numeric coercion and stale numeric-only linked/extraction schemas.
- Prevented relative bulk/assistant arithmetic from parsing the first number of a range or overwriting a text price.
- Made owner quality/filter/reorder surfaces count valid text and active option prices.
- Preserved active option price truth across customer, screen, owner share, and print/PDF paths.
- Kept dormant pricing engine/queue exports out of the active pricing barrel.

## Firebase and scale

No read, write, delete, collection, index, Storage object, Function, scheduler, queue, or polling path was added. Validation is linear over already loaded mutation data. Existing project writes, cache revalidation, and configured-screen summary touches remain unchanged.

## Verification commands

- `npm run test:menu-price-boundary`
- `npm run verify:pricing-integrity-boundary`
- `npm run verify:ai-menu-manager`
- `npm run verify:menu-project-editor-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:public-customer-delivery`
- `npm run verify:digital-screens-boundary`
- `npm run verify:menu-card-export`
- `npm run verify:multi-location-boundary`
- `npm run test:pricing-plans:rules`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:mobile-shell-route-map`
- `npm run verify:dependency-freeze`
- exact TypeScript, scoped ESLint, documentation-link, and diff checks

## Pending evidence

External Certification Runbook evidence, authenticated desktop/MobileShell/browser/device checks, public menu and PDF artifact QA, configured-screen QA, approved app deployment, and production-host smoke remain pending. Re-run `npm run verify:agent-readiness` and all release-candidate gates after approved integration.

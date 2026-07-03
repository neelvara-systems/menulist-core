# Pricing Integrity System - Website Content Boundary

**Status:** Source-backed website copy boundary, not current launch certification

## Current Source Boundary

This is not active public website copy for a launch-certified automatic pricing engine. Use only source-backed claims:

- MenuList keeps saved menu data as the source for prices.
- Customer menu links and staff-facing views read saved project truth.
- Public cache is revalidated after project saves.
- Configured Digital Screens receive a content-version refresh signal.
- PDF downloads are generated from current menu data on demand.
- Background PDF regeneration is not active runtime.

## Approved Hero Direction

- **Headline:** Keep saved prices consistent across MenuList surfaces
- **Subheadline:** Edit prices in MenuList, then use the saved menu as the source for customer links, staff views, configured screens, and fresh PDF downloads.
- **CTA Text:** Review menu output
- **CTA Link:** /use-menulist

## Approved Copy

MenuList keeps price changes tied to the saved menu source. Customer menu links and staff-facing views use that saved truth, configured Digital Screens get a refresh signal, and PDF downloads are generated from the current menu data.

## Current Release Gate

Do not publish this as launch-certified feature copy without the active production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/mobile price-change QA, public menu and PDF artifact QA, configured-screen QA where applicable, target deploy evidence, and production-host smoke.

## Do Not Say

- "Background PDF refresh runs after every edit."
- "All surfaces are always certified within seconds."
- "Background PDF regeneration is live."
- "The dormant pricing engine runs on every editor save."

## SEO Meta

- **Page Title:** Menu Price Consistency | MenuList
- **Meta Description:** Keep MenuList price changes tied to saved menu truth for customer links, staff views, configured screens, and current PDF downloads.
- **Target Keywords:** menu price consistency, restaurant menu prices, digital menu price update, menu PDF download

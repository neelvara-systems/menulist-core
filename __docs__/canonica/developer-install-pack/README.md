# Canonica Developer Install Pack

## Purpose

The Developer Install Pack turns Canonica's existing widget/runtime, product surfaces, KB ingestion, and public website into a day-one buyer/developer package for AI-built SaaS founders.

## Implemented Pieces

- Typed web SDK source package: `packages/canonica-web/src/index.ts`
- Framework quickstarts: `src/app/sites/canonica/quickstarts/page.tsx`
- Install/context verifier upgrade: `src/components/templates/canonica/widgetManagement/CanonicaWidgetManagement.tsx`
- Product surface starter templates: `src/data/canonica/surfaceTemplates.ts`
- Importer starter pack: `src/components/templates/platform/KBGeneration/UploadModal.tsx`
- Public ROI calculator: `src/app/sites/canonica/roi-calculator/page.tsx`
- Proof pack: `src/app/sites/canonica/proof/page.tsx`
- Security/ops one-pager: `src/app/sites/canonica/security-one-pager/page.tsx`

## Product Boundary

This pack does not create a second widget, a second ingestion pipeline, or a separate support product. It packages the existing Canonica runtime so buyers can install, verify, seed, and evaluate it faster.

## Cost Position

Most additions are static website/client UI. Firebase cost only changes when an authenticated owner chooses to apply starter surfaces or upload/import starter knowledge.

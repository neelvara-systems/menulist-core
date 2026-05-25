# Developer Install Pack Firebase Notes

## Reads

- Public quickstarts, ROI, proof, and security one-pager are static website pages and add no Firestore reads.
- Dashboard install verifier reuses the existing widget-config GET response and existing `runtimeStatus`; no extra collection read was added.
- Product surface template UI reuses the existing `getProductSurfacesForSession()` and `getProductSurfaceContentSummaryForSession()` reads already needed by the Product Surfaces screen.

## Writes

- Applying one surface template writes one `canonica_product_surfaces` document and marks compiled context source changed through the existing DAL.
- Applying all six default templates writes up to six surface documents and triggers one summary rebuild.
- Import starter pack writes no data until the owner starts a generation job; then it follows the existing source upload + ingestion job write path.

## Cost Guardrails

- No new scheduler was added.
- No real-time listener was added.
- No unbounded query was added.
- No URL crawling was added.
- Public calculator/proof/security pages are static and cacheable.

## Expected Cost Impact

Static website additions: no Firebase cost.

Dashboard verifier: no additional Firebase cost beyond the existing widget settings read.

Surface templates: bounded owner-triggered writes only, maximum six surface writes plus one summary rebuild per initial starter-template application.

Importer starter pack: same cost profile as existing KB generation; added templates only change user-provided source text.

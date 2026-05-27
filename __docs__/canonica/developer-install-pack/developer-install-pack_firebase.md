# Canonica Developer Install Pack v1 Firebase Notes

## Reads

- Public quickstarts, ROI, proof, security one-pager, install contract pages, Markdown mirrors, llms files, and public agent files are static website/route-handler output and add no Firestore reads.
- Dashboard `/canonica/install-center` reuses the existing widget-config GET response and existing `runtimeStatus`; it may also read the existing activation summary for workspace name/readiness. No new collection scan, listener, scheduled job, or telemetry collection was added.
- Dashboard `/api/canonica/widget-agent-packet` and `/api/canonica/widget-agent-kit` each perform one authenticated `stores/{sId}` read when the owner requests or downloads the workspace-specific packet/kit.
- Product surface template UI reuses the existing `getProductSurfacesForSession()` and `getProductSurfaceContentSummaryForSession()` reads already needed by the Product Surfaces screen.

## Writes

- Applying one surface template writes one `canonica_product_surfaces` document and marks compiled context source changed through the existing DAL.
- Applying all six default templates writes up to six surface documents and triggers one summary rebuild.
- Import starter pack writes no data until the owner starts a generation job; then it follows the existing source upload + ingestion job write path.
- Agent packet, agent kit, public Markdown docs, and v1 script alias routes do not write Firestore.

## Cost Guardrails

- No new scheduler was added.
- No real-time listener was added.
- No unbounded query was added.
- No new telemetry collection was added.
- No URL crawling was added.
- No extra widget beacon write was added; install verification still uses the existing runtime config handshake and throttled `widgetRuntimeStatus` write path.
- Public calculator/proof/security pages are static and cacheable.

## Expected Cost Impact

Static website and public agent install additions: no Firebase cost.

Dashboard Install Center: one existing widget settings read when opened, plus the existing activation summary read when available.

Dashboard packet/ZIP: one store read per owner-triggered packet or ZIP request.

Surface templates: bounded owner-triggered writes only, maximum six surface writes plus one summary rebuild per initial starter-template application.

Importer starter pack: same cost profile as existing KB generation; added templates only change user-provided source text.

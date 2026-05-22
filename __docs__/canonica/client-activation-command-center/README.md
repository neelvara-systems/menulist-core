# Canonica Client Activation Command Center

The Activation Command Center is the Canonica client launch surface. It tells a SaaS product owner whether their Canonica workspace is ready to serve customers without scanning the operational collections.

It also includes the Content Control workbench and Test-as-Customer checklist shared with Readiness Metrics. These give owners one path into product profile, knowledge import, article management, product surfaces, changelog, signal queue, widget configuration, ticket fallback, and launch verification using the existing activation summary. They do not add new page-load reads.

## Scope

- Route: `/canonica/activation`
- API: `GET /api/canonica/activation/summary`
- Summary doc: `platformSummary/activation_{tId}_{sId}`
- Runtime source docs: `stores/{sId}`, `platformSummary/contextContent_{tId}_{sId}`, `platformSummary/coverage_{tId}_{sId}`, `platformSummary/trustMetrics_{tId}_{sId}`
- Notification verification: `POST /api/canonica/notifications/test`
- Content Control workbench: `src/components/templates/canonica/content/CanonicaContentWorkbench.tsx`
- Test-as-Customer checklist: `src/components/templates/canonica/content/CanonicaCustomerFlowChecklist.tsx`
- Surface readiness matrix: `src/components/templates/canonica/content/CanonicaSurfaceReadinessMatrix.tsx`

## Cost Contract

The page reads compact documents only:

1. `stores/{sId}`
2. `platformSummary/activation_{tId}_{sId}`
3. `platformSummary/contextContent_{tId}_{sId}`
4. `platformSummary/coverage_{tId}_{sId}`
5. `platformSummary/trustMetrics_{tId}_{sId}`

Legacy subscription lookup is capped to 5 documents and only runs when `stores/{sId}.canonicaSubscription` is missing.

The activation snapshot writes only when the readiness signature changes or when the cached snapshot is older than 30 minutes.

Ticket notification readiness is computed from feature flag + SMTP environment + workspace support email. It does not scan notification logs. The Send Test Email action reads the workspace store once, then writes one Canonica notification log only when a test send is attempted.

The Content Control workbench, Test-as-Customer checklist, and Surface Readiness matrix reuse the activation summary already loaded by the page. Counts and readiness labels come from `summary.content`, `summary.workspace`, `summary.widget`, and the compact surface readiness data derived from `platformSummary/contextContent_{tId}_{sId}`; none of these components read KB, changelog, ticket, entity, or widget collections directly.

## Files

- `src/app/(canonica)/canonica/activation/page.tsx`
- `src/components/templates/canonica/activation/CanonicaActivationCommandCenter.tsx`
- `src/components/templates/canonica/content/CanonicaContentWorkbench.tsx`
- `src/components/templates/canonica/content/CanonicaCustomerFlowChecklist.tsx`
- `src/components/templates/canonica/content/CanonicaSurfaceReadinessMatrix.tsx`
- `src/app/api/canonica/activation/summary/route.ts`
- `src/lib/canonica/activationSummary.ts`
- `src/lib/canonica/widgetRuntimeStatus.ts`
- `public/widget/canonica-widget.js`
- `src/app/api/canonica/notifications/test/route.ts`

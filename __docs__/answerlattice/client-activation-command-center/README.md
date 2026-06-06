# Answerlattice Client Activation Command Center

The Activation Command Center is the Answerlattice client launch surface. It tells a SaaS product owner whether their Answerlattice workspace is ready to serve customers without scanning the operational collections.

It also includes the First-client launch proof, Content Control workbench, and Test-as-Customer checklist shared with Readiness Metrics. These give owners one path into product profile, knowledge import, article management, product surfaces, governance summaries, signal queue, widget configuration, ticket fallback, and launch verification using the existing activation summary. They do not add new page-load reads.

## Scope

- Route: `/answerlattice/activation`
- API: `GET /api/answerlattice/activation/summary`
- Summary doc: `platformSummary/activation_{tId}_{sId}`
- Runtime source docs: `stores/{sId}`, `platformSummary/contextContent_{tId}_{sId}`, `platformSummary/coverage_{tId}_{sId}`, `platformSummary/trustMetrics_{tId}_{sId}`, `platformSummary/bundleManifest_{tId}_{sId}`
- Notification verification: `POST /api/answerlattice/notifications/test`
- Launch proof summary: `summary.launchProof`
- Content Control workbench: `src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`
- Test-as-Customer checklist: `src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`
- Surface readiness matrix: `src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx`

## Cost Contract

The page reads compact documents only:

1. `stores/{sId}`
2. `platformSummary/activation_{tId}_{sId}`
3. `platformSummary/contextContent_{tId}_{sId}`
4. `platformSummary/coverage_{tId}_{sId}`
5. `platformSummary/trustMetrics_{tId}_{sId}`
6. `platformSummary/bundleManifest_{tId}_{sId}`

Legacy subscription lookup is capped to 5 documents and only runs when `stores/{sId}.answerlatticeSubscription` is missing.

The activation snapshot writes only when the readiness signature changes or when the cached snapshot is older than 30 minutes.

Ticket notification readiness is computed from feature flag + SMTP environment + workspace support email. It does not scan notification logs. The Send Test Email action reads the workspace store once, then writes one Answerlattice notification log only when a test send is attempted.

The First-client launch proof, Content Control workbench, Test-as-Customer checklist, and Surface Readiness matrix reuse the activation summary already loaded by the page. Counts and readiness labels come from `summary.content`, `summary.workspace`, `summary.widget`, `summary.governance`, `summary.compiledContext`, and the compact surface readiness data derived from `platformSummary/contextContent_{tId}_{sId}`; none of these components read KB, changelog, ticket, entity, signal, or widget collections directly.

## Files

- `src/app/(answerlattice)/answerlattice/activation/page.tsx`
- `src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx`
- `src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`
- `src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`
- `src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx`
- `src/app/api/answerlattice/activation/summary/route.ts`
- `src/lib/answerlattice/activationSummary.ts`
- `src/lib/answerlattice/widgetRuntimeStatus.ts`
- `public/widget/answerlattice-widget.js`
- `src/app/api/answerlattice/notifications/test/route.ts`

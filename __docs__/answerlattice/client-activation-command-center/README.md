# Answerlattice Client Activation Command Center

The Activation Command Center is the Answerlattice client launch surface. It tells a SaaS product owner whether the workspace has enough current configuration and retained evidence for controlled customer-path testing without scanning the operational collections.

It also includes the First-client launch proof, Content Control workbench, and Test-as-Customer checklist shared with Readiness Metrics. These give owners one path into product profile, knowledge import, article management, product surfaces, governance summaries, signal queue, widget configuration, ticket fallback, and launch verification using the existing activation summary. The checklist labels prerequisites as **Ready to test**; it does not claim that a customer task or fallback was successfully resolved. These projections do not add new page-load reads.

## Scope

- Route: `/answerlattice/activation`
- API: `GET /api/answerlattice/activation/summary`
- Summary doc: `platformSummary/activation_{tId}_{sId}`
- Runtime source docs: `stores/{sId}`, `platformSummary/activation_{tId}_{sId}`, `platformSummary/contextContent_{tId}_{sId}`, `platformSummary/coverage_{tId}_{sId}`, `platformSummary/trustMetrics_{tId}_{sId}`, `platformSummary/bundleManifest_{tId}_{sId}`, `platformSummary/answerTests_{tId}_{sId}`, and `platformSummary/sourceVersions_{tId}_{sId}`
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
7. `platformSummary/answerTests_{tId}_{sId}`
8. `platformSummary/sourceVersions_{tId}_{sId}`

Legacy subscription lookup is capped to 5 documents and only runs when `stores/{sId}.answerlatticeSubscription` is missing.

The activation snapshot writes only when the readiness signature changes or when the cached snapshot is older than 30 minutes.

Ticket notification readiness is computed from feature flag + SMTP environment + workspace support email. It does not scan notification logs. The Send Test Email action reads the workspace store once, then writes one Answerlattice notification log only when a test send is attempted.

The First-client launch proof, Content Control workbench, Test-as-Customer checklist, and Surface Readiness matrix reuse the activation summary already loaded by the page. Counts and readiness labels come from `summary.content`, `summary.workspace`, `summary.widget`, `summary.governance`, `summary.compiledContext`, and the compact surface readiness data derived from `platformSummary/contextContent_{tId}_{sId}`; none of these components read KB, changelog, ticket, entity, signal, or widget collections directly.

The summary route reads and validates `stores/{sId}` first. A missing or cross-product/cross-scope store stops after that one read; only a valid store can trigger the remaining seven compact summary reads. Coverage, trust, context, source-version, Answer Test, and compiled-manifest inputs are parsed against exact Answerlattice scope before they can advance readiness. Legacy subscriptions require exact `AL` product plus tenant/store identity.

Widget install and page-context proof expire after seven days without current sanitized runtime telemetry. A stale marker remains visible as **Needs review**, but cannot complete launch proof or select the internal `live` stage. The browser accepts only a bounded 64 KiB, deeply shape-validated summary whose counts, statuses, timestamps, proof totals, and `live` state are mutually consistent.

Readiness Metrics displays `readinessScore` as **Setup readiness** only. Success styling and controlled-customer-testing copy require `summary.launchProof.ready`; an 85% or higher setup percentage cannot independently claim launch readiness. Notification-test recipients and compiled-context rebuild results are also validated before success copy is shown, and these management responses are private/no-store.

## Files

- `src/app/(answerlattice)/answerlattice/activation/page.tsx`
- `src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx`
- `src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`
- `src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`
- `src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx`
- `src/app/api/answerlattice/activation/summary/route.ts`
- `src/lib/answerlattice/activationSummary.ts`
- `src/lib/answerlattice/activationDashboardResponseClient.ts`
- `src/lib/answerlattice/widgetRuntimeStatus.ts`
- `public/widget/answerlattice-widget.js`
- `src/app/api/answerlattice/notifications/test/route.ts`
- `src/app/api/answerlattice/bundles/rebuild/route.ts`
- `scripts/verification/test-answerlattice-activation-contracts.ts`

# Answerlattice Client Activation Command Center

The Activation Command Center is the Answerlattice client launch surface. It tells a SaaS product owner whether the workspace has enough current configuration and retained evidence for controlled customer-path testing without scanning the operational collections. The primary path is compressed into four progressive owner goals, while the exact diagnostics remain available under technical details.

It also includes the First-client launch proof, Content Control workbench, and Test-as-Customer checklist shared with Setup Status. These give owners one path into product profile, knowledge import, article management, Product Pages & Flows, Answer Quality summaries, Suggested Updates, widget configuration, ticket fallback, and launch verification using the existing activation summary. The checklist labels prerequisites as **Ready to test**; it does not claim that a customer task or fallback was successfully resolved. These projections do not add new page-load reads.

The owner presentation uses the shared customer-language contract: **Get Live**, **Run Support**, **Answer Quality**, **Trusted Answers**, **Product Topics**, **Suggested Updates**, and **Setup Status**. Routes, summary fields, stored schemas, and engineering diagnostics retain their established technical names.

The authenticated shell now presents a compact default toolset. Get Live shows Activation, First 10 Answers, Install Support, and Setup Status; Run Support shows Daily Brief and Ticket Inbox; Answer Quality shows Trusted Answers. **All tools** reveals the remaining authorized workflows locally, and a directly opened deeper route stays visible while active. No route or capability was removed.

## Scope

- Route: `/answerlattice/activation`
- API: `GET /api/answerlattice/activation/summary`
- Summary doc: `platformSummary/activation_{tId}_{sId}`
- Runtime source docs: `stores/{sId}`, `platformSummary/activation_{tId}_{sId}`, `platformSummary/contextContent_{tId}_{sId}`, `platformSummary/coverage_{tId}_{sId}`, `platformSummary/trustMetrics_{tId}_{sId}`, `platformSummary/bundleManifest_{tId}_{sId}`, `platformSummary/answerTests_{tId}_{sId}`, and `platformSummary/sourceVersions_{tId}_{sId}`
- Notification verification: `POST /api/answerlattice/notifications/test`
- Launch proof summary: `summary.launchProof`
- First-value evidence: `summary.firstValueEvidence`
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

The separately bounded Daily Governance request is deferred until the owner first opens **Technical evidence and setup details**. Closing and reopening that disclosure keeps the already-mounted panel for the page session instead of issuing another request.

Legacy subscription lookup is capped to 5 documents and only runs when `stores/{sId}.answerlatticeSubscription` is missing.

The activation snapshot writes only when the readiness signature changes, a first-value threshold is observed for the first time, or the cached snapshot is older than 30 minutes. First-value evidence is monotonic: it preserves the first valid observation of knowledge readiness, a Trusted Answer, an Answer Test proof, current widget runtime proof, and complete launch proof. It is stored inside the same activation summary document and adds no document, listener, route, or model call. Ordinary loads remain eight reads; establishing or advancing first-value evidence transactionally rereads only the activation snapshot, normally for nine total reads. The bounded read model counts each retry if Firestore contention causes the transaction callback to run again.

Ticket notification readiness is computed from feature flag + SMTP environment + workspace support email. It does not scan notification logs. The Send Test Email action reads the workspace store once, then writes one Answerlattice notification log only when a test send is attempted.

The four-group launch path, First-client launch proof, Content Control workbench, Test-as-Customer checklist, and Surface Readiness matrix reuse the activation summary already loaded by the page. Counts and readiness labels come from `summary.content`, `summary.workspace`, `summary.widget`, `summary.governance`, `summary.compiledContext`, and the compact surface readiness data derived from `platformSummary/contextContent_{tId}_{sId}`; none of these components read KB, changelog, ticket, entity, signal, or widget collections directly. Accordion state is local and is never persisted.

Sidebar All tools state is also component-local and session-only. It adds no route request, Firestore operation, browser-storage write, listener, summary rebuild, or AI call.

The summary route reads and validates `stores/{sId}` first. A missing or cross-product/cross-scope store stops after that one read; only a valid store can trigger the remaining seven compact summary reads. Coverage, trust, context, source-version, Answer Test, and compiled-manifest inputs are parsed against exact Answerlattice scope before they can advance readiness. Legacy subscriptions require exact `AL` product plus tenant/store identity.

Widget install and page-context proof expire after seven days without current sanitized runtime telemetry. A stale marker remains visible as **Needs review**, but cannot complete launch proof or select the internal `live` stage. The browser accepts only a bounded 64 KiB, deeply shape-validated summary whose counts, statuses, timestamps, proof totals, and `live` state are mutually consistent.

First-value timestamps mean **first observed by the activation summary**, not the exact historical moment an action happened. They never claim that a customer was resolved. If a current check later regresses, its original first-observed timestamp remains historical evidence while the live launch status correctly returns to Needs review.

Setup Status displays `readinessScore` as **Setup readiness** only. Success styling and controlled-customer-testing copy require `summary.launchProof.ready`; an 85% or higher setup percentage cannot independently claim launch readiness. Notification-test recipients and compiled-context rebuild results are also validated before success copy is shown, and these management responses are private/no-store.

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

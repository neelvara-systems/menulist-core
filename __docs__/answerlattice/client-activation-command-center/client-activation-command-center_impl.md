# Client Activation Command Center Implementation

## Routing

`/answerlattice/activation` renders `AnswerlatticeActivationCommandCenter`.

Answerlattice management navigation presents the primary owner groups as Get Live, Run Support, Widget & Hosted Help, Team & Access, Billing, and Answer Quality. Activation sits under Get Live. Internal route keys and technical docs retain the established launch, support, entity, canonical-answer, drift, and signal terminology. The Answerlattice base route reads only `platformSummary/activation_{tId}_{sId}` after access resolution: an owner whose factual launch proof is ready enters Daily Brief, while incomplete, missing, inaccessible, or malformed proof fails safely to Activation. Restricted roles retain their permission-based fallback route. The snapshot time remains visible in Daily Brief; age alone does not send an already-launched owner back into onboarding.

The shared sidebar applies permissions and feature flags first, then projects a compact list. Get Live keeps Activation, First 10 Answers, Install Support, and Setup Status visible; Run Support keeps Daily Brief and Ticket Inbox visible; Answer Quality keeps Trusted Answers visible. A synthetic **All tools** item toggles the remaining authorized children in component-local state. It does not navigate or close the mobile drawer. Selecting a real destination uses the existing router and drawer-close behavior. If the current route is a secondary tool, the group shows its complete authorized list so the active destination is never lost. Governance's in-page tab bar uses the same contract: Trusted Answers stays primary and its existing dropdown exposes all other permitted tabs.

Run Support's parent route now points to Daily Brief, matching the post-launch operating-home rule. This changes only the navigation target; the existing Support Assistant route, permissions, response contract, and summary reads remain unchanged.

Activation links directly into:

- `/answerlattice/settings` for product/license details
- `/answerlattice/launch-answers` for the First 10 launch questions and retained proof status
- `/answerlattice/kb-generation` for knowledge import
- `/answerlattice/docs` for public documentation preview
- `/answerlattice/product-surfaces` for route/workflow context mapping
- `/answerlattice/widget/install` and `/answerlattice/widget/access` for install snippets, env handoff, allowed origins, blocked routes, and keys
- `/answerlattice/governance/entities` and `/answerlattice/governance/answers` for product ontology and canonical answer review
- `/answerlattice/governance/signal-queue` for support signals that should become knowledge
- `/answerlattice/knowledge-base`, `/answerlattice/changelog`, and `/answerlattice/tickets` through the shared Content Control workbench

The Content Control workbench (`src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`) is shared by Activation and Setup Status. It reuses the loaded activation summary to give product owners one practical map for profile, import, articles, surfaces, changelog, signal queue, widget, and tickets without adding collection reads.

Install Support promotes the existing coding-agent packet as the primary technical handoff. The packet still contains the saved widget-key identifier, script and dashboard origins, blocked routes, safe context rules, accepted agent-file formats, and acceptance tests. Only its owner-facing label and placement changed; no install schema, credential handling, script contract, or runtime call was added.

The First-client launch proof is computed in `src/lib/answerlattice/activationSummary.ts` as `summary.launchProof`. It does not replace the existing detailed readiness diagnostics; it is the factual rollout gate for the first sellable account. It groups self-serve setup, knowledge/surfaces, ontology/canonical answers, First 10 answer proof, widget runtime, governance summaries, and signal-source testing.

The Activation UI projects that same truth into four owner-goal groups:

1. **Add product knowledge** - workspace/current-plan evidence, product profile, bounded knowledge import/help content, and Product Pages & Flows.
2. **Approve your first answers** - the First 10, reviewed Product Topics, and active Trusted Answers.
3. **Connect customer support** - secure widget access, recent widget/page-context evidence, and ticket-notification readiness.
4. **Verify and go live** - the strict launch-proof gate plus the manual public-help, contextual widget, and unresolved-fallback checks.

Only the first incomplete group is open by default and the accordion permits one open group at a time. The accordion key changes only when workspace scope or the first incomplete group changes, so a successful evidence refresh advances the owner without overriding ordinary open/close choices. Each group computes its status and next route in memory from `summary.steps` or `summary.launchProof.items`. The primary header shows the exact launch-check count and a single progress bar. The detailed proof list, setup percentage, full launch checklist, Content Control workbench, Daily Governance, widget/runtime details, compiled-context controls, notifications, license, profile, and Answer Evidence remain available inside the collapsed **Technical evidence and setup details** disclosure. The technical children are deferred until the first open and then remain mounted for the page session; this avoids the separate Daily Governance request on the normal first paint without refetching when the owner closes and reopens the disclosure. A workspace-scope load resets the deferred state. This is a presentation projection only; it does not persist accordion state or create another completion model.

When an existing activation step intentionally routes back to `/answerlattice/activation` because its control lives in technical details, the group CTA opens the disclosure and focuses the notification card after deferred children mount instead of pushing the current route and appearing inert. The retained Launch Setup mode uses the same disclosure helper but focuses the technical-details entry. This covers the notification test path without inventing a second action contract.

The Test-as-Customer checklist (`src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`) turns the same summary into three launch-critical manual checks: preview approved public help, ask a contextual question from the installed widget, and submit an unresolved question through ticket fallback. Release notes and later signal review stay visible in the detailed activation evidence and their owning product surfaces instead of expanding the launch-critical checklist. Summary-derived statuses say **Ready to test**, not resolved. The component supports an embedded presentation inside the final accordion group and its existing standalone card presentation on Setup Status. It remains a checklist, not an automation or outcome-claim layer, so owners keep control over what goes live.

Setup Status also renders the Surface Readiness matrix (`src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx`). It uses compact `summary.content.surfaceReadiness` status/count fields, derived from the context summary, to show each mapped surface as Ready, Needs mapping, Needs content, or Open signals. UI recommendations and action labels stay in the component so the persisted activation snapshot does not duplicate long copy.

The Daily Governance panel (`src/components/templates/answerlattice/activation/AnswerlatticeOperationsPanel.tsx`) loads `GET /api/answerlattice/operations/status` separately from the activation summary. It shows scheduler status, workspace-local support-day timing, last completion, and recent workspace-filtered governance runs. It links to Settings for timezone/EOD edits and does not expose the full manual scheduler trigger.

Activation, Daily Governance, Workspace Settings, and Weekly Digest failure notices use fixed local dashboard copy. Route response errors, stored scheduler/integration error detail, and browser exceptions must not be copied into owner-visible messages.

Activation, Setup Status, Daily Governance, Weekly Digest, and the Install Center's optional activation-summary snapshot parse dashboard route responses through a shared 64 KB bounded response reader before updating local state or success copy. These browser calls also apply the shared activation dashboard request policy: no browser cache, same-origin credentials only, and manual redirect handling before the bounded reader runs. The reader validates activation-summary, notification-test, and compiled-context rebuild response shapes; Daily Governance additionally validates every nested schedule, scheduler task, workspace detail, run, timestamp, status, count and read-model consistency field before state mutation. The route projects persisted counts and durations only from exact nonnegative safe integers, so strings, fractions, negative values and unsafe values become neutral zero rather than plausible owner metrics. Fixed `answerlattice_activation_dashboard_response_*` diagnostics cover malformed, oversized, rejected, or wrong-shape responses.

Setup Status treats `readinessScore` as setup diagnostics. It uses `summary.launchProof.ready` for success styling and the controlled-customer-testing message, so a high setup percentage cannot overstate an incomplete First 10, governance, widget, or signal proof. The notification-test response requires a bounded valid email, and the compiled-context response requires an allowlisted status, safe integer versions/stats, and agreement between `ok` and `manifest.status`. Non-ready rebuild results show fixed **needs review** copy rather than a success toast.

## Server API

`GET /api/answerlattice/activation/summary`:

1. Resolves tenant/store from `productAccounts.AL` through `resolveAnswerlatticeSessionScope`, which accepts only exact positive numeric Firestore document IDs for tenant/store scope.
2. Reads `stores/{sId}` first and requires exact Answerlattice product, tenant, store, and document identity before any compact-summary fan-out.
3. Reads the remaining seven compact platform summary docs in parallel only for a valid store.
4. Normalizes the bounded Answer Tests summary and current compact source-version summary, then derives active-case count, First 10 count, current/stale proof state, critical failures, and last run time.
5. Builds an `AnswerlatticeActivationSummary`, including `summary.launchProof` from the compact inputs.
6. Merges monotonic `summary.firstValueEvidence` from the current proof and the existing activation snapshot. Existing canonical timestamps survive regressions; newly observed thresholds use the current summary timestamp.
7. When first-value evidence is missing, malformed, cross-scope, or advancing, transactionally rereads only the activation snapshot and merges against its latest committed evidence before writing. Existing snapshots use a top-level `update` so the bounded evidence map is replaced exactly; the first snapshot uses `create`. This prevents concurrent refreshes from replacing an earlier first observation or preserving unknown nested evidence fields.
8. For ordinary signature or staleness writes, omits the unchanged nested evidence object so a concurrent non-milestone refresh cannot erase it.

The API response includes an internal `readModel` so platform audits can verify Firebase cost behavior. The client-facing dashboard does not show Firebase or cache terminology to Answerlattice customers.

Every response path, including disabled, rate-limited, denied, unavailable, malformed-scope, missing-store, and failed responses, carries `private, no-store` plus `nosniff`. Coverage and trust docs use their current schema/scope parsers. The context summary and Answer Test/source-version docs use their existing exact parsers. A compiled-context manifest must pass exact product/scope/schema/version validation, and only individually valid bundle references can mark public/private bundles ready. Legacy subscription fallback accepts only exact `AL` product and numeric tenant/store scope.

Entity readiness and canonical-answer readiness are derived from `platformSummary/trustMetrics_{tId}_{sId}`. Activation does not scan `answerlattice_entities` or `answerlattice_canonicalAnswers`.

Surface readiness is derived in `src/lib/answerlattice/activationSummary.ts` from the already-read `platformSummary/contextContent_{tId}_{sId}` document. The readiness signature includes the compact per-surface status so the persisted activation snapshot refreshes when a product area changes from missing content to ready, or when open ticket signals appear.

Launch proof status is also derived in `src/lib/answerlattice/activationSummary.ts`. It adds no independent collection scan. The Activation read model includes one exact compact source-version summary so a First 10 pass becomes stale after a question or governed knowledge change. The persisted activation signature includes each launch-proof group status so the cached activation snapshot refreshes when a first-client proof blocker changes. The signal-source proof uses the compact context summary; generated proposal quality is still confirmed in Signal Queue and scheduler smoke tests, not by adding mutation-proposal scans to Activation.

First-value evidence is derived by `buildAnswerlatticeActivationFirstValueEvidence()` from the already-built launch-proof groups. Existing evidence is admitted only when its parent activation snapshot has exact `AL` product plus tenant/store scope. It then accepts only canonical ISO timestamps no later than the bounded activation clock and preserves the first valid observation. A separate exact evidence comparison admits the rare transactional write; the normal readiness signature remains current-state-only. The technical disclosure renders the compact evidence list without another fetch. Because the object is part of the existing summary DTO, response size remains bounded and legacy workspaces require no migration job.

Answer Test readiness is read from the existing bounded `platformSummary/answerTests_{tId}_{sId}` document and compared server-side with `platformSummary/sourceVersions_{tId}_{sId}`. Activation does not execute tests, call a model, or read canonical answers. A retained run must cover the current First 10, be newer than their edits, and match the six relevant governed-source counters. Legacy runs without version evidence require one rerun. The counters do not enter the browser response; the launch-proof signature includes only compact derived facts so the stage-aware base-route redirect changes only after a refreshed activation snapshot records the new proof state.

Security note: the API must not fall back to the generic MenuList `session.user.tenantId/storeId`. A user needs a real Answerlattice product scope (`productAccounts.AL` or a native Answerlattice session) before any Answerlattice workspace summary is loaded.

Activation management route persisted scope checks fail closed. Activation summary uses `isAnswerlatticeStoreInScope()` for exact store ownership and the shared exact subscription read projector for both the embedded store summary and legacy billing records. An invalid/foreign embedded summary cannot complete the license step and no longer suppresses the bounded scoped fallback. Subscription status is canonical and case-sensitive, financial/history fields are noncoercing, and browser/Admin lifecycle timestamps use the same exact boundary as Billing. The earliest elapsed end boundary presents an otherwise `active` row as `expired`, so it cannot complete License or launch proof. Daily Governance, tenant-summary sync, and manual compiled-context rebuild routes use the already-normalized Answerlattice session scope and their maintained exact-scope boundaries. Malformed persisted or body scope returns forbidden/invalid responses instead of passing through loose numeric coercion.

`GET /api/answerlattice/operations/status`:

1. Resolves the same Answerlattice tenant/store scope.
2. Reads `stores/{sId}` to verify workspace ownership and timezone settings.
3. Reads `platformSummary/answerlatticeSchedulerState` and `platformSummary/answerlatticeNightlyState_{tId}_{sId}`.
4. Reads five capped `answerlattice_schedulerRunLogs` and filters results to the current workspace.
5. Returns Daily Governance status without scanning source collections or running scheduler work.

## Widget Runtime Telemetry

The public widget config request passes sanitized route/context hints:

- `path`
- `contextKey`
- `feature`
- `page`

`/api/widget/config` stores only the sanitized last-seen runtime marker on `stores/{sId}.widgetRuntimeStatus`. Writes are throttled to 15 minutes unless the route/context changes.

No user text, search query, answer text, chat transcript, email, or visitor identity is stored. Activation converts the sanitized marker to a bounded browser-safe projection. Install and page-context proof are current for seven days; stale or implausibly future telemetry cannot complete launch proof. Runtime freshness participates in the activation signature so the persisted snapshot changes when current proof becomes stale.

## Subscription Summary

Onboarding mirrors the created Answerlattice subscription into `stores/{sId}.answerlatticeSubscription`. This lets Activation avoid scanning subscriptions on normal loads only while the mirror passes the exact active/current lifecycle projector.

If an older workspace does not yet have a current-valid store-level subscription mirror, the API uses a bounded legacy fallback query (`limit(5)`) and reports that fallback in the read model. Every result is exactly projected; current active truth is selected before terminal rows, then by latest exact end and document ID. Saving onboarding/settings should remove that fallback for future loads.

## Focused Verification

`npm run test:answerlattice-activation-contracts` proves that a setup score above 85 cannot produce `stage: live` while launch proof is blocked. It also covers the notification email boundary and compiled-context status/version consistency. Dashboard enum fields require literal strings rather than coercible objects, and the manual rebuild acknowledgement rejects uncontracted top-level, manifest, or stats fields while containing malformed object inspection. The aggregate `verify:answerlattice-runtime-truth` gate runs this test.

## Signal-to-Knowledge Queue

The Governance hub supports deep-link tabs. The Signal Queue tab renders generated mutation proposals from existing `answerlattice_mutationProposals` docs.

When a proposal contains a generated draft, the owner can review/edit the draft and publish it as an active canonical answer. Publishing creates the canonical answer, updates the entity search index, marks the proposal implemented, and writes an audit log. Proposals without generated drafts can still be approved or rejected for manual implementation.

The ticket detail drawer now surfaces a lightweight Knowledge Loop card for operators. It does not read additional documents; it only evaluates the current ticket status, context keys, and latest support replies already loaded in the drawer. The card explains when a resolved ticket has enough evidence for future Signal Queue proposals and gives owners a direct path to the queue.

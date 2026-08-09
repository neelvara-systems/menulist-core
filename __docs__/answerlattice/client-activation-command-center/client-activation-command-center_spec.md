# Client Activation Command Center Spec

## Product Goal

Give Answerlattice clients one operational home for launch readiness: license, widget key, allowed origins, knowledge, Product Pages & Flows, route context, release notes, and the ticket evidence loop.

The screen is organized around Answerlattice's product-owner workflow groups:

- Get Live: workspace, product details, knowledge import, Product Pages & Flows, widget install, Suggested Topics, and Trusted Answer drafts.
- Run Support: help center, docs, knowledge base, changelog, tickets, conversations, and widget operations.
- Widget & Hosted Help: UI configuration, install/env handoff, hosted help domains, allowed origins, blocked routes, and key security.
- Team & Access: workspace members and Answerlattice roles.
- Billing: subscription and transactions.
- Answer Quality: Topic Coverage, Answers to Recheck, Product Topics, Trusted Answers, Suggested Updates, and trust metrics.

These are presentation labels. Internal routes, summary fields, types, and stored data retain their established surface, entity, canonical-answer, drift, and signal names.

## User

Answerlattice client owner or admin. This is not a MenuList platform-owner surface.

## Functional Requirements

- Show current activation score from required launch steps.
- Show the next incomplete required action.
- Link directly to the relevant Answerlattice management surface.
- Show widget runtime status from sanitized last-seen telemetry, and require telemetry from the last seven days for current install/page-context proof.
- Show content counts from the product-surface context summary.
- Show license status from the store subscription summary.
- Show whether the help center has published content.
- Show whether Product Topics and active Trusted Answers exist, using explicit answer-evidence summary counts.
- Show whether the founder's First 10 answer set exists and whether its latest retained proof is ready, needs review, or is blocked.
- Show a first-client launch proof that groups setup, knowledge/surfaces, ontology/canonical answers, widget runtime, governance summaries, and signal-source test status.
- Compress the owner journey into four progressive groups: Add product knowledge, Approve your first answers, Connect customer support, and Verify and go live.
- Keep the default navigation bounded to the first owner jobs: Activation, First 10 Answers, Install Support, Setup Status, Daily Brief, Ticket Inbox, and Trusted Answers.
- Provide one permission-aware **All tools** reveal inside groups with secondary workflows. Preserve direct-route access and keep the selected secondary route visible while active.
- Treat the compact list as presentation only. Do not add a workspace mode, saved preference, onboarding persona, maturity score, or separate entitlement.
- Expand only the first incomplete group by default. Completed groups remain available but collapsed, the owner can open one group at a time, and refreshed evidence re-anchors the accordion when the first incomplete group changes.
- Show one factual launch-check count and one progress indicator in the primary path. Keep the broader setup percentage inside technical details so two progress models do not compete for attention.
- Give each group one next action derived from the first incomplete required step or launch-proof item. Do not add a generic recommendations inbox or parallel task state.
- Derive completion from the existing activation summary. Do not provide a manual **Mark as done** control for machine-verifiable checks.
- Keep optional release notes and later signal-review work outside required group completion and outside the launch gate.
- Keep the exact launch-proof list, full readiness checklist, content workbench, runtime evidence, notifications, license, profile, Answer Evidence, and Daily Governance available under a collapsed **Technical evidence and setup details** disclosure.
- Keep the final customer-path group explicit that **Ready to test** proves prerequisites only; it must not claim a known answer or fallback was resolved.
- Avoid reading source KB, changelog, ticket, and signal collections.
- Keep Firebase/cache implementation details out of the client-facing UI.
- Select the internal `live` stage only when every launch-proof group is complete; a readiness percentage alone is not a launch gate.
- Present the readiness percentage as setup diagnostics on Setup Status; launch-ready success copy and styling require `launchProof.ready`.
- Label checklist prerequisites as ready to test, then require the owner to manually exercise a known answer, contextual widget question, unresolved fallback, and resulting signal.
- Reject malformed notification-test recipients and malformed or internally inconsistent compiled-context rebuild responses before showing success copy.

## Non-Goals

- No billing checkout redesign.
- No replacement for governance dashboard metrics.
- No per-event analytics collection.
- No MenuList-specific hardcoding.
- No claim that configuration readiness proves customer resolution, task completion, or correct escalation.
- No new onboarding collection, persisted accordion state, manual completion document, maturity score, or recommendation queue.
- No removed routes or hidden permission bypass. Authorization and feature flags must be applied before All tools is offered.

## Readiness Steps

- Workspace created
- Product details captured
- License active
- Knowledge imported
- Help center ready
- Product Topics reviewed
- Trusted Answers reviewed
- Priority answers tested
- Product Pages & Flows mapped
- Widget key ready
- Allowed origins locked
- Widget seen in product
- Page context received
- Changelog published
- Support signal loop tested

## First-Client Launch Proof

`summary.launchProof` is separate from the readiness score. It is stricter than basic setup because it is the gate for widening into connectors and distribution.

Proof groups:

- Self-serve setup: workspace, product profile, and license.
- Knowledge and surfaces: imported content, help center, and product-surface mapping.
- Ontology and canonical answers: product entities and active canonical answers.
- Priority answer checks: ten launch questions exist, the latest retained proof is ready, and no critical test is failing.
- Widget runtime proof: widget key, allowed origins, install telemetry seen within seven days, and context attached to that current telemetry.
- Governance summaries: coverage, trust, and compiled context summaries.
- Signal source test: fallback or ticket signal source visible before broader rollout; Suggested Updates remains the owner-facing confirmation surface for proposal quality.

## Founder Entry Rule

The Answerlattice base route is stage-aware:

- before launch proof is ready, management owners enter Activation;
- after launch proof is ready, owners with Run Support access enter Daily Brief when the Daily Brief flags are enabled;
- a missing, malformed, inaccessible, or unavailable activation snapshot fails safely to Activation;
- support, knowledge, widget, and other restricted roles retain their existing permission-based fallback routes.

The entry decision may read only the compact activation summary. It must not rebuild readiness or scan source collections.

## Proof Semantics

`readinessScore` is a diagnostic percentage over required setup steps. `launchProof.ready` is the stricter configuration/evidence gate and is the only condition that can produce `stage: live`. Neither field proves a customer received a correct answer or completed a support task. The Test-as-Customer checklist remains a manual workflow until Answerlattice has explicit, verified outcome evidence.

# Client Activation Command Center Spec

## Product Goal

Give Answerlattice clients one operational home for launch readiness: license, widget key, allowed origins, knowledge, product surfaces, route context, release notes, and ticket signal loop.

The screen is organized around Answerlattice's product-owner workflow groups:

- Launch Setup: workspace, product details, knowledge import, product surfaces, widget install, generated entity candidates, and generated canonical answer drafts.
- Support Control: help center, docs, knowledge base, changelog, tickets, conversations, and widget operations.
- Widget & Hosted Help: UI configuration, install/env handoff, hosted help domains, allowed origins, blocked routes, and key security.
- Team & Access: workspace members and Answerlattice roles.
- Billing: subscription and transactions.
- Knowledge Governance: coverage, drift, entities, canonical answers, signal-to-knowledge queue, and trust metrics.

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
- Show whether product entities and active canonical answers exist, using explicit answer-evidence summary counts.
- Show whether the founder's First 10 answer set exists and whether its latest retained proof is ready, needs review, or is blocked.
- Show a first-client launch proof that groups setup, knowledge/surfaces, ontology/canonical answers, widget runtime, governance summaries, and signal-source test status.
- Present one ordered founder journey above the detailed diagnostics: product details, product knowledge, First 10, approved support truth, product surfaces, secure install, and launch verification.
- Avoid reading source KB, changelog, ticket, and signal collections.
- Keep Firebase/cache implementation details out of the client-facing UI.
- Select the internal `live` stage only when every launch-proof group is complete; a readiness percentage alone is not a launch gate.
- Present the readiness percentage as setup diagnostics on Readiness Metrics; launch-ready success copy and styling require `launchProof.ready`.
- Label checklist prerequisites as ready to test, then require the owner to manually exercise a known answer, contextual widget question, unresolved fallback, and resulting signal.
- Reject malformed notification-test recipients and malformed or internally inconsistent compiled-context rebuild responses before showing success copy.

## Non-Goals

- No billing checkout redesign.
- No replacement for governance dashboard metrics.
- No per-event analytics collection.
- No MenuList-specific hardcoding.
- No claim that configuration readiness proves customer resolution, task completion, or correct escalation.

## Readiness Steps

- Workspace created
- Product details captured
- License active
- Knowledge imported
- Help center ready
- Product entities reviewed
- Canonical answers reviewed
- Priority answers tested
- Product surfaces mapped
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
- Signal source test: fallback or ticket signal source visible before broader rollout; Signal Queue remains the confirmation surface for proposal quality.

## Founder Entry Rule

The Answerlattice base route is stage-aware:

- before launch proof is ready, management owners enter Activation;
- after launch proof is ready, owners with Support Control access enter Daily Brief when the Daily Brief flags are enabled;
- a missing, malformed, inaccessible, or unavailable activation snapshot fails safely to Activation;
- support, knowledge, widget, and other restricted roles retain their existing permission-based fallback routes.

The entry decision may read only the compact activation summary. It must not rebuild readiness or scan source collections.

## Proof Semantics

`readinessScore` is a diagnostic percentage over required setup steps. `launchProof.ready` is the stricter configuration/evidence gate and is the only condition that can produce `stage: live`. Neither field proves a customer received a correct answer or completed a support task. The Test-as-Customer checklist remains a manual workflow until Answerlattice has explicit, verified outcome evidence.

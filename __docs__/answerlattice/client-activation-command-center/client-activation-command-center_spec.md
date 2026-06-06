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
- Show widget runtime status from sanitized last-seen telemetry.
- Show content counts from the product-surface context summary.
- Show license status from the store subscription summary.
- Show whether the help center has published content.
- Show whether product entities and active canonical answers exist, using trust summary counts.
- Show a first-client launch proof that groups setup, knowledge/surfaces, ontology/canonical answers, widget runtime, governance summaries, and signal-source test status.
- Avoid reading source KB, changelog, ticket, and signal collections.
- Keep Firebase/cache implementation details out of the client-facing UI.

## Non-Goals

- No billing checkout redesign.
- No replacement for governance dashboard metrics.
- No per-event analytics collection.
- No MenuList-specific hardcoding.

## Readiness Steps

- Workspace created
- Product details captured
- License active
- Knowledge imported
- Help center ready
- Product entities reviewed
- Canonical answers reviewed
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
- Widget runtime proof: widget key, allowed origins, install telemetry, and page context.
- Governance summaries: coverage, trust, and compiled context summaries.
- Signal source test: fallback or ticket signal source visible before broader rollout; Signal Queue remains the confirmation surface for proposal quality.

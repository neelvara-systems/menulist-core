# First Trusted Answers Spec

**Status:** Implemented workflow contract
**Updated:** 2026-07-16

## Goal

Reduce solo-founder support setup to one bounded outcome: define ten important questions, make the expected behavior explicit, approve the required support truth, test it, install it, and observe whether users confirm resolution.

## Primary User

An early-stage SaaS founder or small product team that has product material but no dedicated support-operations or knowledge-management role.

## Owner Workflow

1. Complete a Knowledge Intake job with readable product sources.
2. Open `Launch Setup -> First 10 Answers` and select that intake.
3. Generate one product-specific pack. Answerlattice prepares exactly ten editable test questions and ten draft canonical-answer review items from the bounded source sample.
4. Review source references, missing evidence, applicability, risk, and suggested answer text in Knowledge Intake. Generated text is never authoritative.
5. Approve and publish accepted review items into the existing Governance proposal queue; canonical-answer authority still requires Governance approval.
6. Adjust each test question, context, expected source, risk, and evidence requirement.
7. Run canonical-only checks at no provider cost.
8. Use failures to fix the required canonical answer, FAQ, article, context, or safe escalation rule in its existing governed screen.
9. Re-run until the saved questions have acceptable proof status, then verify the widget through the existing Install Center.
10. Review explicit `Solved` and `Still need help` outcomes in Trust Metrics.

The generic editable starter set remains available when a founder has not completed Knowledge Intake. It is a fallback, not the preferred activation path.

## Starter Question Contract

The starter set covers common support risk areas rather than asserting product behavior:

- getting started;
- account access;
- billing and charges;
- plan limits;
- team invitations and permissions;
- importing or adding data;
- integrations;
- common errors;
- cancellation and export;
- recent product changes.

Every starter item is editable and starts as an expected canonical-answer route. A founder must change or remove items that do not apply.

## Product-Specific Pack Contract

- The owner selects one existing intake job; no source is connected implicitly.
- Generation reads at most 30 ready source documents and sends a compact source packet capped at 32,000 characters to one text-model request.
- Source content is treated as untrusted evidence. Returned source and entity identifiers must match the supplied allowlists.
- The model returns exactly ten bounded candidates. Unsupported questions remain visible as missing-evidence or safe-no-answer cases instead of receiving invented product behavior.
- Each candidate becomes a draft `canonical_proposal` review item in the existing Intake review collection and an editable Answer Test case in the existing summary.
- The same job and generation-input hash return the stored pack without another model request, credit charge, or draft write.
- Product-pack test IDs replace the previous product pack rather than growing the Answer Tests summary on every refresh.
- One newly generated pack uses one Answerlattice support credit. Cached retrieval and canonical-only test runs use no provider credit.
- A draft cannot be accepted as a canonical proposal without a related entity and non-empty answer evidence.

## Outcome Contract

The public widget asks whether an answer solved the issue. The stored outcome is one of:

- `resolved`;
- `not_resolved`.

Legacy helpful/not-helpful feedback remains readable. Only explicit outcome responses count as confirmed resolution. A later query in the same widget session after a confirmed resolution is counted as a recontact signal, not silently treated as durable resolution.

## Proof Contract

Public proof entries are one of:

- `example`: a clearly labelled workload illustration;
- `verified`: evidence-backed customer proof with explicit public consent.

A verified entry requires a public-safe label, evidence date, consent date, measurement method, and approved claims. Missing any required evidence keeps it out of the verified section.

## Daily Brief Action Contract

Daily Brief may prepare a Support Board card only when the action rollout flag is enabled. The shortcut:

- carries bounded generic title, description, and tags in the URL;
- opens the existing Support Board create form;
- performs no write before owner confirmation;
- uses the existing Support Board DAL and rules after submission.

## Non-Goals

- Full helpdesk replacement
- Autonomous ticket replies
- Auto-approved canonical answers
- Generic project management
- Generic RAG setup wizard
- Fabricated customer proof
- Automatic partner recruitment
- Deflection claims without confirmed outcomes

## Feature Flags

- `ENABLE_ANSWERLATTICE_ANSWER_TESTS`
- `ENABLE_ANSWERLATTICE_PRODUCT_STARTER_PACK`
- `ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE`
- `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`
- `ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF`
- `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS`

The action flag remains off until founder testing confirms the prefilled-card handoff reduces work without creating duplicate cards.

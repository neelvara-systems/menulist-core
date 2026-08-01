# Answerlattice - AI Failure Escalation

> **Status:** PARTIALLY ACTIVE - explicit widget support requests are implemented; automatic evaluator-driven suggestions remain disabled by default
> **Version:** 2.3.1
> **Created:** 2026-03-09
> **Last Updated:** 2026-07-29
> **Feature Flag:** `ENABLE_ANSWERLATTICE_AI_ESCALATION` controls automatic failure evaluation only

## Current Product Truth

Answerlattice has two distinct escalation paths:

1. **Explicit widget support request - active when the widget is enabled.** A user can mark an answer as unresolved, provide a reply email, and create one idempotent support ticket from the stored widget search record.
2. **Automatic AI-failure suggestion - source-hardened but rollout-gated.** `coreSearch()` can evaluate bounded final-answer evidence, missing-entity evidence, refusals, and low-similarity cited evidence. It does not create a Help Chat ticket or expose retrieval debug to the browser. It remains off while `ENABLE_ANSWERLATTICE_AI_ESCALATION` is `false`.

Feature 16 audits the active widget answer, feedback, and explicit fallback path. Feature 40 retains the separate audit of automatic evaluator behavior and rollout readiness.

## Active Widget Flow

```text
Widget question
-> authenticated and origin-authorized search
-> canonical / FAQ / RAG answer or safe fallback
-> bounded aiSearchHistory record
-> user selects Solved or Still need help
-> authoritative feedback acknowledgement
-> user explicitly submits reply email and optional details
-> deterministic support ticket transaction
-> search-history linkage and unresolved outcome
-> best-effort deterministic ESCALATION signal
```

The active path:

- creates a normal asynchronous support ticket with `source: 'ai_escalation'` and `knowledgeCandidate: true`;
- derives query, answer evidence, scope, and product context from the persisted widget search record rather than client-supplied debug fields;
- rejects records outside the exact `AL + tId + sId + mountContext: widget` scope;
- refuses escalation after the answer has been marked solved;
- returns the existing deterministic ticket on a replay instead of creating duplicates;
- does not auto-publish knowledge, promise a response time, send a notification, or provide live-agent routing.

## Automatic Evaluator Boundary

The repository contains `escalationEvaluator.ts`, `escalationTypes.ts`, an internal `coreSearch()` result, a minimal Help Center suggestion projection, and enriched ticket display. The automatic path is not a current public product promise while the flag is off, and Help Chat has no automatic ticket-creation callback.

The evaluator now:

- accepts only bounded, finite, normalized evidence;
- evaluates only references actually used by the final answer, then sorts those references before applying the five-result context cap;
- returns no escalation when required decision evidence is malformed, while
  omitting malformed optional entity-debug telemetry without suppressing an
  otherwise valid empty/refusal escalation;
- does not trust a browser-supplied repeated-failure count;
- does not interrupt a useful source-backed RAG answer merely because canonical retrieval missed;
- treats an empty answer or safe refusal as insufficient evidence;
- uses only insufficient final-answer evidence, missing entity evidence, and low cited-evidence similarity for automatic classification.

Do not add or enable an automatic Help Chat handoff until it uses a **server-authoritative handoff contract** that derives ticket evidence from persisted search history, requires explicit confirmation, creates a deterministic/idempotent ticket, and passes representative false-interruption and usefulness tests. The previous browser DAL authority path was removed.

## Privacy And Authority

- Public widget callers cannot submit retrieval logs, entity traces, tenant IDs, source URLs, or arbitrary ticket fields.
- Browser ticket creation is denied from setting `source`, `knowledgeCandidate`, `escalationContext`, or `widgetEscalation`; those fields are server-reserved in the DAL and both Firestore rule sets.
- Stored server escalation context must pass the bounded trigger, query, product-context, canonical/RAG/entity, and timestamp schema before the ticket is consumed.
- The server reads bounded evidence already stored by the widget search runtime.
- Public citations are projected through the public citation boundary; unsafe or private URLs are omitted.
- Historical tickets and escalation signals are evidence for review, not approved truth.
- Signal creation is non-blocking and cannot make ticket creation appear to fail after the ticket is persisted.

## Non-Goals

- live chat or workforce routing;
- automatic account actions;
- auto-approval or auto-publication of answers;
- guaranteed response or resolution time;
- unrestricted transcript, DOM, screenshot, or private-source capture;
- using escalation volume or lack of escalation as proof of resolution.

## Verification

- `npm run test:answerlattice-widget-answer-contracts`
- `npm run test:answerlattice-widget-escalation:emulator`
- `npm run test:answerlattice-ai-failure-escalation`
- `npm run test:answerlattice-ticket-contracts`
- `npm run test:answerlattice-tickets:rules`
- `npm run test:answerlattice-tickets:shared-rules`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run verify:answerlattice-runtime-truth`

Hosted allowed-origin, denied-origin, real inbox handling, automatic Help Chat handoff, and measured customer-resolution evidence remain external validation work.

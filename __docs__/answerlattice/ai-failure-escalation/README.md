# Answerlattice - AI Failure Escalation

> **Status:** PARTIALLY ACTIVE - explicit widget support requests are implemented; automatic evaluator-driven suggestions remain disabled by default
> **Version:** 2.1.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-07-18
> **Feature Flag:** `ENABLE_ANSWERLATTICE_AI_ESCALATION` controls automatic failure evaluation only

## Current Product Truth

Answerlattice has two distinct escalation paths:

1. **Explicit widget support request - active when the widget is enabled.** A user can mark an answer as unresolved, provide a reply email, and create one idempotent support ticket from the stored widget search record.
2. **Automatic AI-failure suggestion - implemented but rollout-gated.** `coreSearch()` can evaluate low-confidence, missing-evidence, repeated-failure, and explicit-intent signals, but the evaluator and its Help Chat UI remain off while `ENABLE_ANSWERLATTICE_AI_ESCALATION` is `false`.

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

The repository contains `escalationEvaluator.ts`, `escalationTypes.ts`, Help Center response projection, Help Chat ticket creation, and enriched ticket display. These paths require `ENABLE_ANSWERLATTICE_AI_ESCALATION` and are not a current public product promise while the flag is off.

## Privacy And Authority

- Public widget callers cannot submit retrieval logs, entity traces, tenant IDs, source URLs, or arbitrary ticket fields.
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
- `npm run verify:answerlattice-feedback-boundary`
- `npm run verify:answerlattice-runtime-truth`

Hosted allowed-origin, denied-origin, real inbox handling, and measured customer-resolution evidence remain external validation work.

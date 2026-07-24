# SignalDesk AI Intelligence - Documentation Hub

**Feature:** SignalDesk AI Intelligence
**Status:** Local source complete; QA index deployment and live Gemini certification pending
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

## Purpose

AI Intelligence turns approved target and evidence truth into internal review material. It has three distinct paths:

1. deterministic rules scoring with no provider cost;
2. idempotent, provider-backed AI Assist for one target and task;
3. founder-only AI Volume Mode for up to five eligible targets and three tasks.

AI is never source-rights, consent, approval, send, publish, commercial, or MenuList-truth authority. Provider output remains review material and provider sending remains disabled.

## Current Contract

- Only active Gemini routes execute. OpenAI and Anthropic route records remain held configuration, not executable adapters.
- Target, evidence, operator instruction, prior output, and critic candidate are untrusted prompt data.
- Generation and critic responses are JSON-only, schema-strict, and capped at 4,096 output tokens.
- Paid work is claimed and budget-reserved before provider calls; exact retries reuse durable results.
- Source, policy, evidence, provider, and budget authority is revalidated before settlement.
- AI detail is scrubbed after 90 days while compact identity, cost, confidence, review, and lifecycle evidence remains.
- Desktop exposes run/review controls. Mobile is read-only and cannot run, retry, review, configure, or pause the AI worker.
- The AI workspace loads separate bounded lists for provider runs, volume parents, and rules scores so one run type cannot hide another.

## Documents

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-ai-intelligence_spec.md) | Frozen behavior and authority boundaries. |
| [Implementation](./signaldesk-ai-intelligence_impl.md) | Current runtime, idempotency, provider, review, and recovery flow. |
| [Firebase](./signaldesk-ai-intelligence_firebase.md) | Collections, queries, indexes, writes, retention, and cost. |
| [Compliance](./signaldesk-ai-intelligence_compliance.md) | Prompt, evidence, consent, output, and human-review controls. |
| [Mobile Support](./signaldesk-ai-intelligence_mobile-support.md) | Read-only mobile decision. |
| [Test Cases](./signaldesk-ai-intelligence_test-cases.md) | Source, emulator, failure, accounting, and release matrix. |

## Verification

```bash
npm run verify:signaldesk
npm run test:signaldesk:ai-intelligence-boundary
npm run test:signaldesk:fresh-lineage
npm run test:signaldesk:source-data-lifecycle
npm run typecheck
```

The focused AI emulator covers provider budget races, deterministic replay, unresolved outcomes, critic/escalation, volume recovery, workspace category fairness, founder-review replacement, and no outbound side effects.

## Release Boundary

Codebase completion does not certify provider behavior. Before activation on a hosted environment, deploy the SignalDesk index, confirm Gemini credentials and budgets in the dedicated QA project, run attributed test-mode provider calls, inspect stored redaction/retention behavior, and verify desktop review UX. Do not enable outbound provider sending as part of AI certification.

## History

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-06-23 | Initial documentation. |
| 0.2 | 2026-07-11 | Added measurable shadow review and bounded AI Volume Mode. |
| 0.3 | 2026-07-11 | Added expired-volume recovery and retry persistence. |
| 1.0 | 2026-07-21 | Rebuilt from code truth; added prompt hardening, output bounds, category-fair history, exact review replay, eligible-target UI, retention truth, and release gates. |

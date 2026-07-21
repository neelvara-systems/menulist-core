# Autonomous Browser and Account-Changing Actions - Specification

> **Status:** Deliberate non-goal
> **Last Updated:** 2026-07-20

## Customer Job

The end user needs to complete a product task safely. Answerlattice should reduce translation effort by explaining the applicable approved procedure, pointing to the correct declared control, waiting for matching client-reported workflow evidence, and preserving context when escalation is required.

Autonomous browser control is not required for that job.

## Existing Safe Workflow

```text
approved canonical procedure
-> safe page/workflow context
-> exact semantic target highlight
-> user remains in control
-> client reports an exact payload-free instrumented event
-> guide advances, completes, stops, or escalates
-> bounded outcome becomes review evidence
```

The matched event proves only that the connected client reported the expected transition for the active step. It does not independently prove backend state, authorization success, or customer resolution.

## Permanent Prohibitions

- arbitrary selectors, raw DOM capture, screenshots, or visual control guessing as authority;
- `.click()`, form submission, synthetic events, script evaluation, or arbitrary callbacks;
- cross-origin or non-widget message authority;
- actions invented by a model;
- unauthenticated or cross-tenant actions;
- silent refunds, charges, plan changes, permission changes, invitations, deletion, publication, or security changes;
- secrets, passwords, recovery codes, payment instruments, or tokens in guidance/action payloads;
- automatic canonical-answer approval or publication.

## Separate Future Admission

A narrow reversible assist action requires a new docs-first feature and cannot be enabled through the existing procedure action vocabulary. It must prove customer demand, task-completion benefit, authorization, confirmation, idempotency, verification, audit, rollback, and support recovery.

## Rejection Rule

Reject any action that can be represented as guidance, requires broad browser control, handles sensitive data, lacks reliable result verification, cannot be rolled back, or primarily expands Answerlattice into an autonomous support agent.

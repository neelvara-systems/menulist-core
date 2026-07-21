# Answerlattice Guided Workflows Specification

> **Status:** Implemented, workspace opt-in
> **Version:** 2.2.0
> **Last verified:** 2026-07-20

## Problem

Static support instructions still make an end user translate a generic answer into the live product. The user may be on the correct screen but not know which control applies, whether the interface has changed, or whether the expected result occurred.

Answerlattice already owns approved canonical answers and safe page context. Guided Workflows use those existing contracts to help a user complete an approved linear procedure without giving Answerlattice arbitrary control of the client product.

## Users

- **SaaS founder or support owner:** approves the procedure and enables guidance for the workspace.
- **Client engineer:** adds stable semantic target attributes and emits verified workflow events.
- **End user:** starts a guide from an approved procedure answer and remains in control of every product action.
- **Support operator:** receives an escalation after a guide cannot resolve the task.

## Functional Contract

### Owner

1. Create or edit a canonical answer.
2. Choose `procedure`.
3. Add 1-12 ordered steps.
4. Optionally add a semantic target, expected event, expected result, and troubleshooting text.
5. Approve the canonical answer through existing governance.
6. Enable Guided Resolution in Widget Management.
7. Install semantic target/event instrumentation for selected workflows.

### End User

1. Ask a question in the Answerlattice widget.
2. Receive an approved canonical procedure.
3. Select **Guide me**.
4. See the current target highlighted when it exists.
5. Perform the product action.
6. Continue manually only when the step has no expected event. Event-gated steps advance only after the matching client-reported event for the active session and step.
7. Complete, report a missing target, or escalate.

## Procedure Contract

| Field | Required | Constraint |
|---|---|---|
| `procedureSlug` | No | Lowercase alphanumeric/underscore, max 60 |
| `steps` | Yes | 1-12 ordered steps |
| `stepOrder` | Yes | Positive, unique integer |
| `action` | Yes | Existing approved action vocabulary |
| `instruction` | Yes | Max 80 characters |
| `target` | No | Semantic ID, max 120 |
| `expectedEvent` | No | Semantic ID, max 120 |
| `expectedResult` | No | Max 120 characters |
| `troubleshootingHint` | No | Max 200 characters |
| `warnings` | No | Maximum 5 |
| `prerequisites` | No | Maximum 5 |

A semantic ID matches:

```text
^[a-z0-9]+(?:[._:-][a-z0-9]+)*$
```

Examples: `billing.change_plan`, `slack.oauth.started`.

## Trust Invariants

1. Guidance is returned only with an approved canonical widget result.
2. The client declares targets through `data-answerlattice-target`; Answerlattice does not store CSS selectors.
3. The client declares successful state changes by emitting an allowlisted event.
4. The runtime never invokes `.click()`, `eval()`, arbitrary callbacks, or product mutations.
5. No raw DOM, form values, tokens, screenshots, or unrestricted application state are collected.
6. The public outcome endpoint derives product/workspace scope from the validated widget credential.
7. The endpoint requires an exact scoped widget search-history document with `canonical === true`.
8. The endpoint is byte-bounded, strict-schema validated, origin/runtime-token protected, rate-limited, and idempotent.
9. Terminal evidence must match the exact validated procedure snapshot, context key, and widget session retained with the canonical widget search record.
10. Expired search-history evidence is not accepted even when Firestore TTL cleanup has not deleted it yet.
11. Terminal outcomes are client interaction evidence, not independent proof of product correctness or product truth.
12. Human approval remains required for every canonical answer change.

## Outcome States

| State | Meaning | Write behavior |
|---|---|---|
| `completed` | Every manual step was confirmed and every event-gated step received its matching client-reported event | One deduplicated guided-resolution signal; not independent backend-state proof |
| `abandoned` | The user explicitly stopped before completion | One deduplicated guided-resolution signal |
| `target_missing` | A declared semantic target was not found | One deduplicated guided-resolution signal |
| `escalated` | The explicit support request was created from a blocked step | One deduplicated escalation signal |

Closing, hiding, navigating, or changing context clears the in-memory guide without creating an outcome. If signal mutation is disabled, the endpoint acknowledges the request with `recorded: false` and performs no Firestore write.

## Success Measures

The first proof should use:

- task completion rate;
- target-missing rate;
- median steps completed;
- escalation rate;
- time to completion measured by the client product;
- repeated issue reduction after an approved knowledge update.

Chat volume and raw answer count are not success measures.

## MenuList Reference Scope

The first reference implementation is deliberately narrow:

| Workflow | Semantic completion evidence |
|---|---|
| Import first menu | accepted job, review ready, acknowledged apply |
| Recover failed import | visible retry control, accepted retry job, acknowledged apply |
| Publish and check menu | acknowledged publish, optional verified health result, Share/open intent |

Events contain only fixed semantic names. They do not contain menu content, owner/customer identifiers, URLs, job IDs, form values, or errors.

MenuList mobile controls use the same target/event vocabulary for parity. This does not enable the currently suppressed mobile widget.

## Out of Scope

- arbitrary browser control;
- branching or sub-procedures;
- registered write actions;
- sensitive account actions;
- automatic target discovery;
- visual control recognition;
- DOM/screenshot capture;
- automatic approval or publication;
- proactive guidance;
- dedicated owner analytics that require raw event scans.
- automatic publication of reference procedure drafts.

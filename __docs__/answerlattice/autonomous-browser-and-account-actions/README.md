# Answerlattice - Autonomous Browser and Account-Changing Actions

> **Status:** DO NOT BUILD
> **Feature:** 44 of 44
> **Version:** 1.1.0
> **Last Updated:** 2026-07-20
> **Runtime:** Deliberately absent

## Current Product Truth

Answerlattice implements controlled **Explain + Guide** behavior. An approved canonical procedure may display human-readable steps, highlight an exact client-declared semantic target, scroll it into view, wait for an exact payload-free client-reported event, and open explicit support handoff.

The runtime binds that event to the active widget iframe, session, step, expected semantic event, and served procedure. It is useful completion evidence, but it is not independent proof of backend state or customer resolution.

It does not:

- click a host control;
- register or execute client actions;
- evaluate JavaScript;
- inspect unrestricted DOM or application state;
- fill or submit forms;
- change subscriptions, payments, roles, permissions, security settings, or customer data;
- approve or publish knowledge automatically.

The procedure `action` field is an instructional verb shown to a person. It is not an executable command.

## Decision

Do not build autonomous browser control or account-changing actions. They increase authorization, privacy, recovery, and liability risk without strengthening the governed-answer lifecycle. The near-term client value is trusted explanation, guided task completion, error recovery, and context-complete human handoff.

## Future Boundary

A future narrow assist action is a separate feature, not an extension implied by Guided Resolution. It may be considered only after trustworthy answering and guided completion are proven and must use one explicitly registered reversible operation with:

- authenticated user context;
- server-verified role and permission;
- exact product/workspace scope;
- current-state eligibility;
- explicit confirmation;
- deterministic idempotency;
- execution result verification;
- audit history;
- timeout, retry, rollback, and human recovery.

Refunds, charges, subscription changes, role/permission changes, credential handling, destructive deletion, and irreversible actions remain out of scope.

## Verification

- `npm run verify:answerlattice-autonomous-action-boundary`
- `npm run test:answerlattice-guided-resolution`
- `npm run verify:answerlattice-runtime-truth`

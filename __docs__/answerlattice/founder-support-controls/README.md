# Founder Support Controls

> **Status:** Implementation source of truth
> **Product:** Answerlattice
> **Updated:** 2026-07-18

Founder Support Controls add the missing safety workflows around Answerlattice's existing governed support layer. They let owners test answers, check release impact, publish temporary known-issue notices, verify visitor context, attach bounded debugging evidence, and export approved support truth without turning Answerlattice into a helpdesk, status platform, session-replay product, or project manager.

## Included Controls

1. Approved Answer Proof Loop with canonical-only and full-runtime checks, evidence requirements, critical-case blocking status, and legacy-safe defaults.
2. Owner-triggered proposal impact previews plus release-scoped answer checks and owner-reviewed rollback proposals.
3. Temporary known-issue notices delivered through existing predictive/context infrastructure.
4. Optional signed visitor context for trusted plan, role, locale, and requester identity claims.
5. Bounded external evidence links on private widget-search activity.
6. Owner-triggered support-truth export.

The private Owner Support Assistant remains documented separately under `__docs__/answerlattice/owner-support-assistant/`. Its shipped runtime is read-only and uses six existing compact summaries, including activation proof; it does not execute these controls.

## Documents

| Document | Purpose |
| --- | --- |
| `founder-support-controls_spec.md` | Product behavior and invariants |
| `founder-support-controls_impl.md` | Technical architecture and file plan |
| `founder-support-controls_firebase.md` | Read, write, storage, and cost contract |
| `founder-support-controls_mobile-support.md` | Responsive owner and widget behavior |
| `founder-support-controls_test-cases.md` | Acceptance and failure-path matrix |
| `founder-support-controls_marketing.md` | Internal positioning boundaries |
| `founder-support-controls_website.md` | Public copy allowed after runtime verification |
| `founder-support-controls_helpdoc.md` | Owner-facing operating guide |

## Locked Boundaries

- Canonical answers remain authoritative before fallback.
- Test runs never create production analytics, signals, tickets, or mutation proposals unless the owner explicitly converts a failed result.
- Proof status is advisory: critical failures mark the retained run `blocked`, standard failures mark it `review`, and passing suites mark it `ready`; Answerlattice never deploys, publishes, or changes product state from a test result.
- Proposal impact previews compare current and proposed deterministic outcomes for at most 10 explicitly linked active tests. They are read-only, use no fallback model, retain no run, and never replace the authoritative governance approval checks.
- Rollback is a mutation proposal, never a direct answer overwrite.
- Known issues do not change canonical retrieval priority and do not create a public status platform.
- Unsigned visitor data is informational only and never authorizes private data or tenant scope.
- Evidence links are owner-visible metadata only; Answerlattice does not record sessions.
- Exports exclude secrets, raw widget keys, private integration credentials, and internal tenant implementation details.

## Version History

| Date | Change |
| --- | --- |
| 2026-07-18 | Added and hardened the bounded Proposal Impact Preview contract: current-versus-proposed deterministic checks for explicitly linked tests before governance approval, complete old/new entity linkage, fail-closed cost limiting, bounded browser wait, and no provider call, persistence, scheduler, listener, or automatic publication. |
| 2026-07-16 | Extended Answer Tests into the Approved Answer Proof Loop with deterministic reference checks, critical-case proof status, bounded retained evidence, responsive owner controls, and backward-compatible schema defaults. |
| 2026-07-11 | Created the coordinated production contract for founder answer QA, release safety, known issues, verified context, evidence links, and support-truth export. |

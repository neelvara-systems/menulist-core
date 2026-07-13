# Founder Support Controls

> **Status:** Implementation source of truth
> **Product:** Answerlattice
> **Updated:** 2026-07-11

Founder Support Controls add the missing safety workflows around Answerlattice's existing governed support layer. They let owners test answers, check release impact, publish temporary known-issue notices, verify visitor context, attach bounded debugging evidence, and export approved support truth without turning Answerlattice into a helpdesk, status platform, session-replay product, or project manager.

## Included Controls

1. Answer Test Suite with canonical-only and full-runtime checks.
2. Release-scoped answer checks and owner-reviewed rollback proposals.
3. Temporary known-issue notices delivered through existing predictive/context infrastructure.
4. Optional signed visitor context for trusted plan, role, locale, and requester identity claims.
5. Bounded external evidence links on private widget-search activity.
6. Owner-triggered support-truth export.

The private Owner Support Assistant remains documented separately under `__docs__/answerlattice/owner-support-assistant/`. Its shipped runtime is read-only and uses five existing compact summaries; it does not execute these controls.

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
- Rollback is a mutation proposal, never a direct answer overwrite.
- Known issues do not change canonical retrieval priority and do not create a public status platform.
- Unsigned visitor data is informational only and never authorizes private data or tenant scope.
- Evidence links are owner-visible metadata only; Answerlattice does not record sessions.
- Exports exclude secrets, raw widget keys, private integration credentials, and internal tenant implementation details.

## Version History

| Date | Change |
| --- | --- |
| 2026-07-11 | Created the coordinated production contract for founder answer QA, release safety, known issues, verified context, evidence links, and support-truth export. |

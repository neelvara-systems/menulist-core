# Founder Support Controls

> **Status:** Implementation source of truth
> **Product:** Answerlattice
> **Updated:** 2026-07-28

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
| `founder-support-controls_validation.md` | Feature 5 external-proposal validation and admitted scope |
| `founder-support-controls_marketing.md` | Internal positioning boundaries |
| `founder-support-controls_website.md` | Public copy allowed after runtime verification |
| `founder-support-controls_helpdoc.md` | Owner-facing operating guide |

## Locked Boundaries

- Canonical answers remain authoritative before fallback.
- Deterministic Answer Tests verify the configured source, answer IDs, phrases, confidence, abstention, and evidence contract. They are regression evidence, not an independent factual-correctness or completeness guarantee.
- The current implementation permits a critical case to expect provider-backed RAG. The admitted hardening is narrower: a critical case must never receive `ready` proof from an actual `rag` route, even when an older saved case expected that route. Existing cases remain readable and become blocked evidence until the owner selects canonical, FAQ, escalation, or no-answer behavior.
- Test runs never create production analytics, signals, tickets, or mutation proposals unless the owner explicitly converts a failed result.
- Proof status is advisory: critical failures mark the retained run `blocked`, standard failures mark it `review`, and passing suites mark it `ready`; Answerlattice never deploys, publishes, or changes product state from a test result.
- A retained run is current only for the exact suite revision it executed. Reused request IDs are accepted only for the same mode, selected cases, suite revision, and release identity.
- Proposal impact previews compare current and proposed deterministic outcomes for at most 10 explicitly linked active tests. They are read-only, use no fallback model, retain no run, and never replace the authoritative governance approval checks.
- Rollback is a mutation proposal, never a direct answer overwrite.
- Known issues do not change canonical retrieval priority and do not create a public status platform.
- Unsigned visitor data is informational only and never authorizes private data or tenant scope.
- Evidence links are owner-visible metadata only; Answerlattice does not record sessions.
- Exports include bounded approved canonical source IDs/citations but exclude raw source bodies/context, secrets, raw widget keys, private integration credentials, private support conversations, and internal tenant implementation details.
- Successful export generation appends one metadata-only audit event; the audit never duplicates exported knowledge.

## Version History

| Date | Change |
| --- | --- |
| 2026-07-28 | Validated the proposed Critical Answer Test Suite against the shipped Answer Tests runtime. Kept the existing bounded proof loop, admitted only deterministic critical-RAG blocking for a later code pass, and rejected duplicate suites, multi-turn simulation, model judging, scheduled runs, and Storage-backed artifacts. |
| 2026-07-26 | Made every Answer Test mutation/provider admission fail closed on limiter outage and moved rollback answer/audit/entity authority into the proposal transaction with strict procedure and acknowledgement contracts. |
| 2026-07-20 | Hardened Support Truth Export with projected approved evidence, fail-closed rate enforcement, one metadata-only audit write, executable cap/redaction/completeness tests, and an explicit portability-not-legal-export boundary. |
| 2026-07-18 | Hardened Answer Tests schema version 4 with exact persisted identity, fail-closed case admission, input-bound request fingerprints, suite-revision freshness, strict release parsing, transactional rollback proposal/audit repair, and truthful deterministic-proof wording. |
| 2026-07-18 | Added and hardened the bounded Proposal Impact Preview contract: current-versus-proposed deterministic checks for explicitly linked tests before governance approval, complete old/new entity linkage, fail-closed cost limiting, bounded browser wait, and no provider call, persistence, scheduler, listener, or automatic publication. |
| 2026-07-16 | Extended Answer Tests into the Approved Answer Proof Loop with deterministic reference checks, critical-case proof status, bounded retained evidence, responsive owner controls, and backward-compatible schema defaults. |
| 2026-07-11 | Created the coordinated production contract for founder answer QA, release safety, known issues, verified context, evidence links, and support-truth export. |

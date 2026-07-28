# Founder Support Controls - Feature 5 Validation

> **External proposal:** Critical Answer Test Suite
> **Decision:** Keep the existing Answer Tests feature; admit one bounded hardening
> **Reviewed:** 2026-07-28
> **Stage:** Documentation complete; focused code hardening pending

## Owner Problem

A solo SaaS founder needs evidence that billing, cancellation, access, privacy, deletion, plan, permission, and integration answers still follow the intended governed route before users depend on them. The useful outcome is not a larger testing platform. It is a short, current, explainable proof loop that identifies exactly which critical question failed and sends the owner to the governed source that must be corrected.

## Current Product Truth

Answerlattice already has the core feature proposed by the external response:

- bounded owner-authored Answer Tests;
- page, surface, role, and plan context;
- canonical, FAQ, RAG, escalation, and no-answer route expectations;
- expected canonical/FAQ identity, required and blocked phrases, confidence, and bounded evidence-reference checks;
- canonical-only and full-runtime execution;
- test-traffic isolation from production analytics and support signals;
- standard and critical risk;
- advisory ready, review, and blocked proof;
- suite and governed-source freshness;
- retained run evidence with strict scope and idempotency;
- release-linked checks;
- in-memory current-versus-proposed answer checks;
- owner-reviewed rollback proposals;
- deterministic evaluation with no LLM judge.

Creating another Critical Answer Test Suite would duplicate routes, data, proof semantics, permissions, cost controls, and owner navigation.

## Verified Gap

The current case schema allows `expected.source = rag` regardless of risk level. The evaluator compares actual and expected source but does not add a failure when a critical case resolves through RAG. Therefore, a critical-RAG case can pass and an otherwise passing run can become `ready`.

This conflicts with Answerlattice's authority model: provider-backed RAG may be useful fallback evidence, but it is not approved support truth and should not certify a business-critical answer.

## Admitted Change

The later code pass should make one deterministic rule universal:

> An actual `rag` route cannot pass a critical Answer Test.

Implementation remains inside the current evaluator and form:

1. Fail critical-RAG results explicitly.
2. Prevent new/edited critical cases from choosing RAG.
3. Keep legacy critical-RAG cases readable and block them on the next run.
4. Reuse the rule across normal, First 10, release, and proposal-preview checks.
5. Add focused source, API, UI, and legacy tests.

This needs no model call, Firestore migration, new summary field, collection, scheduler, Storage object, or mobile-specific data path.

## Proposal Decision Matrix

| External recommendation | Decision | Reason |
| --- | --- | --- |
| Build a Critical Answer Test Suite | Already satisfied | Existing Answer Tests is the bounded proof feature. |
| Do not compare complete exact wording | Keep | Current evaluator checks route, IDs, selected phrases, confidence, and references rather than one full answer string. |
| Block uncontrolled RAG for critical support | Adopt narrowly | This is the one verified implementation gap. |
| Rich scenario object | Do not add | Current test case plus safe context, assertions, risk, and entity links covers the immediate owner job. |
| Multiple variants per scenario | Do not add | Separate bounded cases are clearer and avoid hidden aggregation rules. |
| Bounded multi-turn scenarios | Validate first | No real founder evidence currently justifies a conversation simulator. |
| Critical, important, standard, exploratory levels | Do not add | Standard/critical plus active state expresses the current decision without extra lifecycle burden. |
| Semantic fact extraction and model judge | Do not add | It adds cost and uncertain authority. Existing deterministic proof must remain primary. |
| Production, candidate, and release environments | Keep current bounded forms | Production runs, in-memory proposal preview, and release-linked checks already cover admitted decisions. |
| Automatic change-triggered runs | Do not add | Source-version staleness already invalidates old proof without paid background execution. |
| Nightly and weekly suites | Do not add | Explicit owner-triggered checks and stale proof avoid recurring Firebase/provider cost. |
| Firestore suite/test/run collections | Do not add | The capped summary document is sufficient for the founder ICP. |
| Storage-backed immutable artifacts | Do not add | Ten compact retained runs provide bounded diagnosis without artifact lifecycle cost. |
| Runtime manifest platform | Do not add | Current six-counter source snapshot and suite revision provide the needed freshness contract. |
| Product Map and Friction Map integrations | Validate later | Show links only when real owner workflows prove they reduce repair time. |
| Averaged support-quality score | Reject | One critical failure must remain visible, not averaged away. |

## Validation Before Further Expansion

Do not expand the assertion language from speculation. First collect:

- 5 founder-reviewed launch suites;
- 50 to 100 representative customer questions;
- owner labels for correct route, approved source, required facts, forbidden claims, and safe fallback;
- false-pass and false-fail reasons from current deterministic checks;
- time required to repair a failed test;
- cases that materially cannot be represented with current answer/FAQ identity, context, phrase, reference, confidence, escalation, or no-answer assertions.

Only evidence of repeated, material unexpressible facts should reopen a small typed fact-assertion design. It should not reopen a general semantic judge or multi-turn scenario engine.

## Owner Experience

Keep the existing **Answer Tests** route and language. A founder should:

1. Save a representative critical question.
2. Select approved truth or a safe fallback.
3. Run the current bounded check.
4. See the exact failed contract and current evidence.
5. Open the governed source or proposal path.
6. Rerun after correction.

The feature remains advisory. Passing proof does not deploy, publish, approve, or independently guarantee factual completeness or customer resolution.

## Cost And Safety Verdict

The admitted hardening is zero-read and zero-write beyond the existing run because it checks the already-resolved route in memory. The rejected scheduler, Storage artifacts, per-assertion persistence, generated variants, and model judge would add recurring cost and operational burden without evidence that they improve founder decisions.

## Final Verdict

Feature 5 is not a new build. It is an existing, substantial Answer Tests capability with one important authority correction pending: critical proof must fail closed when the runtime reaches provider-backed RAG. Complete that bounded hardening before making the public claim, then gather real founder test evidence before considering any richer assertion model.

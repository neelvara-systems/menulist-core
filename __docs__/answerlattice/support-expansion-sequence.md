# Answerlattice Support Expansion Sequence

> **Status:** Active planning sequence  
> **Created:** 2026-06-06  
> **Source:** SupportLayer comparison review + Answerlattice doctrine + runtime code audit  
> **Rule:** Improve the governed answer loop before adding queue, inbox, or connector behavior.

---

## Purpose

This note preserves the validated "later ideas" sequence so the team can finish one item, return here, and pick the next item without reopening the whole competitor review.

SupportLayer is useful as a helpdesk completeness benchmark, but Answerlattice should not become queue-first support software. The useful expansion path is:

1. Convert repeated founder replies into approved-answer drafts.
2. Route review ownership only when the governance queue becomes noisy.
3. Turn support gaps into product work only after the signal/governance loop is proven.
4. Intake support email history through export/import before native email connectors.

---

## Current Sequence

| Order | Idea | Decision | Why |
| --- | --- | --- | --- |
| 1 | Repeated reply import to approved-answer draft | Implemented first | Fits Knowledge Intake, creates canonical proposals, and avoids helpdesk scope. |
| 2 | Soft role-based answer approval | Build after repeated reply import | Staff roles exist; routing should stay advisory until queue volume proves it is needed. |
| 3 | Support gap to product task | Build after integrations are deliberately enabled | Useful only when gaps are entity-bound and one-way product-work handoff stays sanitized. |
| 4 | Email-to-support-gap | Start later as export/import, not inbox sync | Email contains private customer data and can become helpdesk scope too quickly. |

---

## Guardrails

- Do not add SLA clocks, queue assignment, agent workload reporting, or live-chat behavior.
- Do not create native helpdesk or email OAuth/API connectors until export/import proof works.
- Do not auto-publish canonical answers, KB articles, FAQs, product tasks, or support macros.
- Do not create new Firebase collections when an existing governed collection can hold the work.
- Prefer summary-backed dashboards and bounded owner-triggered actions over realtime listeners.
- Keep all generated drafts tenant-scoped with `pId`, `tId`, and `sId`.

---

## Firebase Cost Rule

Every item in this sequence must state:

- exact new Firestore reads
- exact new Firestore writes
- whether Storage is used
- whether a Cloud Function or scheduler is used
- whether AI/provider calls are used
- retry behavior
- dedupe behavior
- summary impact

If a proposal cannot stay bounded, it does not start.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Completed item 1: repeated reply import now runs through Knowledge Intake and creates FAQ/canonical proposal drafts without new Firebase infrastructure. |
| 2026-06-06 | Recorded validated post-SupportLayer expansion order and Firebase-cost guardrails. |

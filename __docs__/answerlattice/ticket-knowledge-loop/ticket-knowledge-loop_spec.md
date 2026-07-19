# Ticket-to-Knowledge Loop - Specification

> **Status:** Implemented and locally hardened
> **Last verified:** 2026-07-18

## Problem

Resolved support tickets contain useful evidence about confusing product behavior and successful recovery steps. Copying each ticket into documentation is slow, but automatically treating a ticket as truth is unsafe. The product must preserve useful resolution evidence while keeping answer authority, scope, and publication under human control.

## Functional Requirements

1. Emit only when a persisted ticket status actually changes to Resolved or Closed.
2. Give each resolution lifecycle event a deterministic identity that changes after reopen/re-resolve.
3. Propagate a known canonical retrieval entity when available; otherwise retain `unresolved` for later resolution.
4. Capture at most five non-system messages and require at least 50 characters of substantive resolution context.
5. Do not persist resolver identity in ticket-knowledge signal metadata.
6. Bound and sanitize subjects/messages before persistence and again before provider use.
7. Require three unique ticket IDs for the same resolved entity in the rolling 14-day window.
8. Fail closed when more than 500 ticket signals occupy the extraction window.
9. Select only a safe canonical mutation target: none, one, or ambiguous multiple.
10. Merge only into an exact compatible pending proposal and cap tracked ticket IDs at 100.
11. On merge, write an audit record and remove generated content that no longer reflects the evidence set.
12. Block automatic creation when another pending proposal already owns the entity.
13. Treat all ticket text as untrusted prompt evidence and validate any generated procedure against the guided-workflow contract.
14. Show ticket count and extractor score without claiming answer correctness.
15. Require owner review and server-owned governance before canonical publication.

## Proposal Outcomes

| Existing active answers for entity | Automatic outcome |
|---:|---|
| 0 | `new_answer_required` candidate |
| 1 | `content_refinement` candidate targeting that answer |
| 2 or more | No automatic proposal; owner triage required |

## Human Review

The reviewer must verify the correct resolution from authoritative sources. Ticket frequency can indicate a gap, confusing behavior, product defect, customer-specific exception, or stale documentation. It does not prove the answer.

## Non-Goals

- Ingest every ticket as truth.
- Publish a generated article automatically.
- Preserve raw ticket transcripts indefinitely for drafting.
- Store resolver identity as evidence quality.
- Build ticket routing, SLA, or help-desk replacement features.
- Claim extractor score is factual accuracy.

## Success Measures

- Percentage of ticket-derived proposals accepted, edited, and rejected.
- Median review time versus writing from scratch.
- Repeat ticket rate for the same entity after approved implementation.
- Human correction rate.
- Stale draft invalidation rate after evidence merges.
- Context-complete escalation and ticket-resolution coverage.

## Stop Rule

Pause expansion if ticket-derived drafts frequently combine unrelated cases, expose sensitive data, or require as much factual reconstruction as manual authoring.

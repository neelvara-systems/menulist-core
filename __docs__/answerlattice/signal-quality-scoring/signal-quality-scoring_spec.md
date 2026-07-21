# Signal-Quality Scoring - Specification

> **Status:** Validate before implementation
> **Last Updated:** 2026-07-20

## Problem

Founders need the most useful knowledge gaps near the top of a small review queue. They do not need an unexplained score that implies correctness.

## Current Requirements

1. The reserved scoring flag remains false and has no runtime consumer.
2. Signal creation remains governed by `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`.
3. Production clustering remains tenant/store scoped, bounded, entity based, and human reviewed.
4. Signal-cluster proposals expose ticket, negative-chat, and escalation counts.
5. The owner UI must not label generic proposal confidence as signal quality, correctness, or signal strength.
6. Tickets, chats, escalations, fallbacks, and feedback remain evidence rather than approved truth.
7. No score may auto-approve, suppress, publish, or mutate a canonical answer.
8. Serve count, missing negative feedback, proposal count, or extractor score must not auto-increase canonical validation confidence.
9. Human approval must not copy a proposal or extractor score into canonical-answer validation.
10. Notifications and owner surfaces must name an extractor score precisely or omit it; they must not present it as answer confidence.

## Future Admission Requirements

A future ranker must define:

- exact input factors;
- source and time-window applicability;
- treatment of repeated actors and deterministic replays;
- missing-data behavior;
- factor-level explanation;
- calibration dataset and reviewer labels;
- false-priority and hidden-high-risk thresholds;
- version and rollback behavior.

## Non-Goals

- answer correctness scoring;
- LLM-based opaque prioritization;
- autonomous knowledge mutation;
- a new analytics dashboard;
- a new collection, connector, or model call without measured need;
- assuming escalation is always more useful than a ticket.

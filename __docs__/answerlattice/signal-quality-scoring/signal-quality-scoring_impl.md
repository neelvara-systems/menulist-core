# Signal-Quality Scoring - Implementation

> **Status:** Reserved scoring feature; evidence and confidence-authority hardening implemented
> **Last Updated:** 2026-07-20

## Runtime Truth

- `ENABLE_ANSWERLATTICE_SIGNAL_QUALITY` exists only as a reserved false app flag.
- `functions-answerlattice/src/constants/features.ts` intentionally has no matching flag.
- `src/lib/answerlattice/signalMutation.ts` is a legacy/manual reference utility with no caller.
- Production clustering is implemented in `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`.
- Production proposal creation is bounded by its existing 14-day window, input cap, three-signal threshold, ten-proposal cap, entity validation, pending-proposal dedupe, and human review.

## Implemented Hardening

- Signal-cluster proposal summaries now store optional `escalationCount`.
- The stored proposal parser accepts only a bounded non-negative escalation count.
- The review queue shows ticket, negative-chat, and escalation evidence.
- Generic signal proposals no longer display the opaque `confidenceScore` as "Signal strength."
- Ticket-resolution extraction may show an explicitly named `Extractor score` as a review aid.
- The nightly usage-based confidence mutation is retired and emits a skipped-task diagnostic instead of querying or updating canonical answers.
- Proposal scores no longer flow into canonical-answer validation when a human approves a proposal.
- Approved proposal content uses manual validation authority under the current canonical-answer contract.
- Slack, email, GitHub, and Linear mutation-proposal notifications no longer call the proposal score confidence.

Proposal-generation formulas remain stored review aids for backward compatibility. They do not set canonical correctness, approve content, change sort order, or publish answers. Existing stored answers are not silently migrated; records previously stamped by `system:confidence_auto_adjust` require explicit verification.

## Future Implementation Order

1. Collect labeled proposal review outcomes.
2. Prove current ordering causes material founder waste.
3. Specify transparent factors and rejection thresholds.
4. Test offline against held-out reviewed proposals.
5. Shadow-rank without changing owner order.
6. Compare top-queue usefulness and hidden-high-risk rate.
7. Roll out behind a real server and app contract only after calibration.

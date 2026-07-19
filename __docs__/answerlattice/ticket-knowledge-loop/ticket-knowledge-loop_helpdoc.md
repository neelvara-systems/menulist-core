# Review Ticket-Derived Knowledge

Answerlattice can use repeated resolved-ticket evidence to prepare a knowledge proposal. It does not publish ticket content as an answer.

## What You Will See

- the proposed answer type and target;
- the linked product entity;
- the number of tracked resolved tickets;
- a generated draft or a pending/failed draft state;
- an extractor score used for drafting triage.

## Review Checklist

1. Confirm the tickets describe the same customer problem.
2. Verify the resolution against approved documentation, product behavior, policy, and release information.
3. Remove customer-specific details and exceptions.
4. Add missing plan, role, version, state, region, prerequisite, and warning details.
5. Regenerate when new evidence has reset the draft to pending.
6. Approve only when the answer is safe to become canonical; otherwise edit, reject, or leave it pending.

## Important Limits

- Three similar tickets show repeated friction, not necessarily the correct answer.
- The extractor score is not an accuracy score.
- A ticket may describe a defect or edge case rather than a documentation gap.
- Obvious credential/contact redaction is applied, but complete PII removal is not guaranteed.
- Ambiguous canonical targets are left for human triage.

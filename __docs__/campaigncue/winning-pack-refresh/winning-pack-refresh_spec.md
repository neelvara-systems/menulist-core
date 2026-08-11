# Winning Pack Refresh - Spec

## Owner Job

An owner should be able to answer: “This campaign helped before. Can I prepare it again with today’s correct details?”

## Candidate Contract

A source campaign is eligible only when:

- it is not archived;
- trust is not `blocked` or `needs_fix`;
- its recipe ID still exists in the current recipe registry;
- useful owner-reported results exceed not-useful results; and
- at least one useful result or bounded owner-entered response exists.

The owner sees whether the recipe is the current recommendation or only available after review, the evidence confidence, the latest result timing, and any current owner-entered local/seasonal moment.

## Refresh Contract

Refresh creates a new campaign. It may preserve:

- recipe;
- channels;
- source template identity when present; and
- compact source/root provenance.

Refresh must reconstruct from current Business Brain, source inputs, source hash, commercial policy, asset readiness, and trust checks. It must reset approval and result state.

## Non-Goals

- No automatic recurring campaign.
- No winner or performance prediction.
- No copying stale output text or media binaries.
- No holiday inference from locale alone.
- No provider posting or scheduling.

# Winning Pack Refresh - Test Cases

## Candidate Selection

- Positive owner result nominates a source campaign.
- More negative than useful results excludes it.
- Blocked, needs-fix, archived, missing-recipe, and retired-recipe campaigns are excluded.
- Current recommended recipe wins a tie before raw result score.
- Repeated evidence gets a stronger confidence label; mixed evidence stays early.
- Owner-entered current local moment appears; expired pulse context does not.

## Creation

- Current facts, trust, approval, and freshness are rebuilt.
- Immediate source, root source, generation, and source template provenance are correct.
- Generation is bounded.
- Old result memory and approval state are not copied.
- Missing current inputs block refresh without campaign/trust/event/summary writes.

## Cost And Security

- No collection, Storage path, provider call, or overview read is introduced.
- Cross-workspace/unavailable source IDs fail closed.
- Replayed idempotency key returns the same new campaign.

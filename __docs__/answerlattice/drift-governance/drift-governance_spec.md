# Drift Governance Specification

## Customer job

Tell a SaaS founder which approved answers may have become stale or contradictory, explain why they need review, and prevent automated signals from silently changing approved truth.

## Frozen drift classes

| Class | Trigger | Runtime owner |
| --- | --- | --- |
| A - Version drift | A newly activated release affects a bound entity and is newer than the answer's last validated product version | Release activation transaction |
| B - Negative-feedback drift | At least five `chat_negative` signals exist for any bound entity after the last human validation within the bounded 14-day signal window | Manual server evaluation and nightly Function |
| C - Scope-conflict drift | Another active answer shares a bound entity and has overlapping plan, role, state, and product-version applicability | Manual server evaluation and nightly Function |
| D - Ticket-volume or deprecation drift | At least eleven ticket signals exist for any bound entity after validation, or a bound entity is deprecated | Manual server evaluation and nightly Function |

No fifth drift class may be introduced without a separate product and data-contract decision.

## Required behavior

1. All evaluation inputs are exact `AL` workspace data.
2. Evaluation covers every bound entity, not only the first entity.
3. Conflict reasons are deterministic and use sorted answer identifiers.
4. Automated evaluation is monotonic: it can add deduplicated reasons but cannot clear an existing flag.
5. A release can activate while affected answers are marked for review; drift is advisory and does not invent replacement content.
6. A human reviewer must explicitly attest that current content, scope, product version, and evidence were reviewed before clearing drift.
7. Revalidation records an audit event and updates the answer's validation timestamp/version state.
8. Missing, malformed, cross-scope, or over-cap inputs fail closed.

## Non-goals

- Automatic correction or publication of canonical answers.
- Treating ticket volume or negative feedback as proof of the correct answer.
- A vague overall health score that hides the specific drift reason.
- Client-submitted authoritative drift reasons.
- Unbounded source scanning or a new scheduler.

## Success measures

- Percentage of drifted answers reviewed within the target window.
- Median time from release or signal threshold to review.
- Repeated drift after revalidation.
- False-positive review rate, recorded through reviewer outcomes.
- Stale-answer rate in representative Answer Tests and human review.

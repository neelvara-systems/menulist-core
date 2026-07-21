# Signal-Quality Scoring - Validation Record

> **Date:** 2026-07-20
> **Decision:** Validate before development

## Verified

- The reserved flag has no runtime consumer and no Functions mirror.
- Production nightly clustering does not use the legacy severity/time-decay utility.
- Existing deterministic signal identity, entity normalization, retention, bounded clustering, proposal dedupe, and human approval remain active under other contracts.
- The owner review surface previously displayed a generic signal-strength percentage derived from heterogeneous proposal confidence values.
- Signal-cluster proposal summaries omitted their escalation count even though production clustering counted escalations.
- The nightly scheduler treated 30 recorded serves and no negative feedback as evidence sufficient to raise canonical validation confidence to `0.95`.
- Human proposal approval copied heterogeneous proposal scores and non-manual draft sources into canonical validation.
- Outbound proposal notifications labeled the same heterogeneous field as confidence.

## Changed

- Added transparent escalation evidence to new signal-cluster proposals.
- Removed generic signal-strength display.
- Renamed the ticket-resolution review aid to `Extractor score`.
- Retired usage-based nightly canonical-confidence adjustment.
- Prevented proposal or extractor scores from becoming canonical-answer confidence after human approval.
- Restored manual validation authority for human-approved proposal content.
- Removed misleading confidence labels from Slack, email, GitHub, and Linear proposal notifications.
- Added a source gate and current-truth dossier.

## Still Unproven

- proposal queue precision;
- founder review time;
- acceptance and material-edit rates;
- duplicate actor concentration;
- whether source weighting improves ordering;
- whether time decay hides persistent high-risk gaps.

These unknowns block scoring implementation.

Historical canonical answers previously modified by `system:confidence_auto_adjust` remain an internal data-verification requirement. No remote tenant data was inspected or rewritten during this source audit.

## Verification And Deployment

Focused source, governance-contract, governance-emulator, integration-adapter, Functions build, root and Answerlattice TypeScript, ESLint, runtime aggregate, dependency-freeze, documentation-link, package-parse, and diff-integrity gates passed. The scoped `answerlattice-qa` deployment for `answerlatticeNightly` and `triggerAnswerlatticeNightly` stopped before upload because Firebase CLI authentication is unavailable. No remote revision changed.

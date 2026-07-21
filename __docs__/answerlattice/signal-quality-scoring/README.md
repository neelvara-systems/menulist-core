# Answerlattice - Signal-Quality Scoring

> **Status:** VALIDATE FIRST - RESERVED SCORING PLACEHOLDER
> **Feature:** 42 of 44
> **Version:** 1.1.0
> **Last Updated:** 2026-07-20
> **Flag:** `ENABLE_ANSWERLATTICE_SIGNAL_QUALITY: false`

## Current Product Truth

Answerlattice has a working signal-to-knowledge loop, but no separately activated signal-quality scoring feature. The reserved app flag has no runtime consumer and no matching Functions flag. Turning it on enables nothing.

The production path is:

```text
bounded ticket, negative-chat, escalation, fallback, or feedback evidence
-> normalized workspace and entity identity
-> deterministic replay protection and retained signal
-> bounded nightly entity cluster
-> transparent evidence counts and proposal threshold
-> human-reviewed mutation proposal
```

The production scheduler uses recent evidence counts. A legacy/manual app utility contains severity and time-decay calculations, but no runtime calls it. Those calculations are not production scoring evidence.

The audit also retired a separate nightly path that increased canonical-answer confidence after 30 recorded serves with no negative feedback. Usage volume and the absence of a recorded complaint do not prove correctness, completeness, freshness, or applicability. The nightly task now records `unsafe_usage_proxy_retired` and performs no canonical-answer read or write.

## Hardening Decision

Do not create an overall "signal quality" percentage. A number can look authoritative while hiding:

- which source types contributed;
- whether multiple events came from one person;
- whether the issue is a product defect, user error, or knowledge gap;
- how old the evidence is;
- whether previous proposals from the same pattern were approved, edited, or rejected.

New signal-cluster proposals now preserve an explicit escalation count. The review queue shows ticket, negative-chat, and escalation counts and no longer presents the generic proposal confidence field as "Signal strength." Ticket-resolution drafts may show a clearly named `Extractor score`, which remains a drafting aid only.

Human approval no longer copies a proposal score into canonical-answer validation. Approved proposal content is recorded with manual validation authority. Slack, email, GitHub, and Linear proposal notifications no longer label the heterogeneous proposal score as confidence.

Existing stored canonical answers previously stamped by `system:confidence_auto_adjust` require a controlled data review. This source change does not silently rewrite historical tenant data.

## Reconsideration Gate

Calibrated ranking may be considered only after real workspace evidence shows that the current bounded queue creates unusable review work. Required evidence:

1. At least 100 reviewed proposals across at least three active workspaces.
2. Approval, material-edit, rejection, and duplicate rates segmented by proposal source.
3. Evidence that founders repeatedly review low-value proposals before high-value proposals.
4. A labeled reason taxonomy separating knowledge gaps, product defects, customer-specific cases, spam, and user error.
5. A proposed ranker that improves top-queue precision without suppressing high-risk evidence.
6. A visible factor breakdown, calibration test, rollback path, and no auto-publication.

## Smallest Future Scope

If the gate passes, start with a deterministic queue rank that exposes its factors. Do not call it answer quality, correctness, or confidence. Keep raw evidence accessible and human review mandatory.

## Verification

- `npm run verify:answerlattice-signal-quality`
- `npm run test:answerlattice-governance-contracts`
- `npm run verify:answerlattice-runtime-truth`

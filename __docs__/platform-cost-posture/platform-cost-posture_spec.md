# Platform Cost Posture Spec

## Purpose

Give platform operators one screen that answers:

- Which existing cost signals are active today?
- Which surfaces are creating known internal AI/provider cost?
- Is SAFE_MODE or alerting currently changing the operating posture?
- What is still missing before a real Firebase bill forecast can be trusted?

## User

Platform user with `platformRole === "PLATFORM"`.

This is not shown to SMB owners, staff users, customers, or public visitors.

## Entry Points

- `/platform/cost-posture`
- Ops Control Room button from `/ops`
- Platform settings tab

## Required Behavior

- The screen must require platform auth.
- The API must validate query input before Firestore reads.
- Reads must be bounded by explicit limits.
- The UI must label totals as known internal cost signals, not total Firebase spend.
- Billing export must appear as a prerequisite until production setup confirms it.
- The UI must link to the detailed source screens instead of duplicating every workflow.

## Data Shown

- Status summary:
  - `healthy`
  - `watch`
  - `action_required`
  - `setup_required`
- Known internal cost total for the selected lookback period.
- Known owner charge total for the selected lookback period.
- Provider call count where available.
- Observed Firestore read count where available.
- Source coverage and read budget notes.
- Guardrails and next actions.

## Long-Term Contract

The first version is intentionally additive and conservative. Future cost sources should plug into the posture response as bounded source adapters. They should not create dashboard-specific Firestore mirrors unless the production architecture explicitly approves them.

## Rejection Gate

Reject or redesign changes that:

- Make owners responsible for interpreting platform cost.
- Add hot-path reads to owner/customer runtime just for monitoring.
- Scan tenant/store subcollections across the fleet on demand.
- Claim bill-level accuracy without billing export.
- Add a standalone scheduler for routine cost posture work.

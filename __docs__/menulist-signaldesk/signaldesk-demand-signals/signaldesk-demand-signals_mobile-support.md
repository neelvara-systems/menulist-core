# SignalDesk Demand Signals - Mobile Support

**Status:** Initial mobile assessment
**Created:** June 23, 2026

## Decision

Mobile support is read-only summary viewing. Demand signal review, referral approval, source-hook configuration, and target creation stay desktop workflows.

## Allowed Mobile Views

| View | Allowed actions |
| --- | --- |
| Demand summary | View signal counts by market pod and signal type. |
| Referral alert | See new partner/referral count. |
| Surface health | See whether hooks are healthy, stale, or rejecting payloads. |

## Blocked Mobile Actions

- Create target from signal.
- Approve referral.
- Edit hook policy.
- Export signal data.
- View raw signal event streams.
- Link anonymous demand to a person.

## UX Requirements

- Compact counts only.
- No customer-level identifiers.
- Clear labels for `Warm signal`, `Referral`, `Claim/setup`, and `Needs desktop review`.
- Any stale or rejected hook state should show as an alert, not a detailed debug feed.

## Mobile Acceptance

Mobile succeeds when an admin can see whether demand is rising or whether a hook needs desktop review, without exposing raw event data.

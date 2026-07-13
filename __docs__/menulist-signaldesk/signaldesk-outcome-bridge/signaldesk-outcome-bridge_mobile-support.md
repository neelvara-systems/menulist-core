# SignalDesk Outcome Bridge - Mobile Support

**Status:** Enforced mobile read-only contract
**Created:** June 23, 2026
**Runtime reconciled:** July 13, 2026

## Decision

Mobile support is read-only for outcome visibility. Route-token creation, manual outcome entry, correction, and attribution edits stay desktop/admin workflows.

## Allowed Mobile Views

| View | Allowed actions |
| --- | --- |
| Outcome summary | View current counts by market pod, source, and channel. |
| Target outcome snapshot | View latest outcome event and attribution state. |
| Route health alert | See expired/rejected token counts. |

## Blocked Mobile Actions

- Create route tokens.
- Record paid-plan outcome.
- Correct attribution.
- Link/unlink MenuList records.
- Export outcome data.
- Override duplicate detection.

## UX Requirements

- Use compact counts and latest-event labels.
- Avoid exposing raw route token values.
- Keep MenuList record links behind desktop/admin workflow.
- Show stale/unknown outcomes as `Needs desktop review`.

## Mobile Acceptance

Mobile succeeds when an admin can check whether growth is producing real MenuList outcomes without editing attribution or route state.

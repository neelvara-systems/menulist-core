# SignalDesk Control Room - Mobile Support

**Status:** Initial mobile assessment
**Created:** June 23, 2026

## Decision

Mobile support is limited to emergency visibility and tightly scoped pause controls for admins. Full incident management, threshold edits, and cost review stay desktop workflows.

## Allowed Mobile Views

| View | Allowed actions |
| --- | --- |
| System status | See healthy, paused, stale, or incident state. |
| Open incidents | View severity, owner, and latest status. |
| Kill-switch status | Admin can activate emergency global pause with confirmation. |
| Cost alert summary | View daily overrun alert. |

## Blocked Mobile Actions

- Clear incidents.
- Edit thresholds.
- Edit kill-switch expiry.
- Export reports.
- Drill into raw events.
- Change source/channel configuration.

## Emergency Pause Rules

Mobile global pause requires:

- admin role,
- confirmation,
- reason text,
- audit event,
- visible desktop follow-up requirement.

## UX Requirements

- First screen must show system state and active pause status.
- Emergency pause must be clear but not easy to trigger accidentally.
- Stale summaries must be visible.
- No dense table views on mobile.

## Mobile Acceptance

Mobile succeeds when an admin can detect a serious issue and pause activity quickly, then complete investigation on desktop.

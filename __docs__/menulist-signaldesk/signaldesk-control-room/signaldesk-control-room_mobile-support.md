# SignalDesk Control Room - Mobile Support

**Status:** Implemented bounded support
**Revalidated:** July 21, 2026

SignalDesk mobile remains dashboard-only. The dedicated Controls workspace is
rejected server-side on mobile and is not a separate MobileShell feature.

## Available

- Summary metrics, operating state, active pauses and the bounded unresolved
  incident list from the shared dashboard overview.
- Emergency activation of `global-outbound` when the user has
  `kill-switch.activate` and confirms the action.

## Blocked

- Clearing any pause.
- Activating a scoped pause.
- Incident acknowledge/resolve.
- Threshold, connector, source, AI, channel, content or partner configuration.
- Research, lead, approval, send, export, raw-event and audit workflows.

The client adds `MOBILE_EMERGENCY_PAUSE`, and the server independently requires
mobile mode, active status, global scope and that exact confirmation token. A
rejected mobile mutation is audited only after the write rate limit.

Desktop remains required for diagnosis, scoped recovery and advanced controls.

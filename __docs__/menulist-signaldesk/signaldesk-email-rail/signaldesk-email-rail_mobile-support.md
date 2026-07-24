# SignalDesk Email Rail - Mobile Support

**Status:** Observe-only
**Last Updated:** July 21, 2026

SignalDesk uses the same responsive workspace, but mobile mode is read-only for
Email Rail. The compact viewport may show channel, sender, approval, handoff,
step, and webhook summaries. It does not expose a separate mobile mutation path.

## Mobile Blocked

- export or assisted handoff;
- owned sequence creation or send;
- direct provider send;
- recipient reveal;
- approval/rejection;
- sender-domain or connector changes;
- email-specific pause/resume.

The shared emergency global-pause control follows the separate Kill-Switch
mobile contract. This document does not grant a mobile email-channel pause.

## Verification

- `actionDisabled` includes `mobileReadOnly` for all workspace actions.
- Email action buttons also require their desktop permission and runtime gate.
- Server/API permission and authority checks remain mandatory regardless of UI.

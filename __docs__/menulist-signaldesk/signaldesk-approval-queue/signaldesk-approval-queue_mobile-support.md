# SignalDesk Approval Queue - Mobile Support

**Status:** Observe-only by design
**Last Updated:** July 21, 2026

## Decision

Mobile reuses the responsive SignalDesk workspace and projected approval data,
but the shared `mobileReadOnly` boundary disables every action. It may show
queue rows, packets, risk context, and status. It cannot refresh packets,
approve, reject, export, reveal contact, hand off, or send.

## Why

Approval requires comparing source rights, evidence, rejected facts, message
copy, route, sender, suppression, and prior-contact state. This is deliberate
desktop review work, not an emergency mobile action. Emergency pause remains a
separate Kill Switch flow.

## Acceptance

- Mobile renders the same strict projected records without a separate data path.
- All approval controls are disabled through the shared action boundary.
- The protected API independently rejects mobile mutation attempts.
- No mobile route bypass, direct Firestore write, or provider action exists.

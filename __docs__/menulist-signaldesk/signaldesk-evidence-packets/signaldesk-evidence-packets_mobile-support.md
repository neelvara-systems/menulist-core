# SignalDesk Evidence Packets - Mobile Support

**Status:** Observe-only by design
**Last Updated:** July 21, 2026

SignalDesk mobile mode is intentionally read-only except for the separately
governed global outbound emergency pause. Evidence work requires careful source
review and stays on desktop.

## Mobile Behavior

| Capability | Mobile |
| --- | --- |
| See high-level target/workspace state | Allowed through protected workspace summaries. |
| Create or regenerate evidence | Blocked by action classification and disabled UI. |
| Read private evidence detail | Not exposed. |
| Edit facts or allowed use | Not implemented on any surface. |
| Advance to draft/approval | Blocked. |
| Trigger provider or external action | Blocked. |

The same protected API/session resolver applies to desktop and mobile. Hiding or
disabling the control is not the security boundary; the action route rejects the
mobile mutation.

## Release Check

Authenticated physical-device QA remains release-controlled. It must confirm no
Evidence action can be invoked from mobile and no full evidence detail or raw
source/contact value appears in the mobile response or UI.

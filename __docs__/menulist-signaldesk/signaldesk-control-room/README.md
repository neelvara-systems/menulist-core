# SignalDesk Control Room

**Status:** Feature 15 locally source-complete
**Revalidated:** July 21, 2026
**Parent:** [MenuList SignalDesk](../README.md)

## Purpose

Control Room is SignalDesk's private, summary-first safety surface. It shows the
current operating summary, exact active pauses, unresolved incidents, today's
recorded cost estimates, queue pressure, bounded run timelines, provider/budget
holds, and links to the advanced control surfaces.

It does not run research, score leads, create evidence or drafts, resolve every
incident generically, send messages, publish content, mutate MenuList truth, or
enable provider sending.

## Current Contract

- `ENABLE_MENULIST_SIGNALDESK_CONTROL_ROOM` gates the dedicated Controls routes,
  workspace read, and navigation item.
- Kill-switch enforcement and the emergency global-pause endpoint remain safety
  infrastructure even if the dedicated page is hidden.
- Eleven deterministic scope documents hold current pause state.
- Pause activation/clear requires the matching permission, a bounded reason,
  explicit UI confirmation, rate limiting, and actor-bound idempotency.
- Mobile is dashboard-only and may activate only `global-outbound`; it cannot
  clear or change scoped pauses.
- Open and acknowledged incidents are both unresolved. The UI lists at most 50
  and shows the exact unresolved count up to the fail-closed 500-row ceiling.
- Control and cost timestamps are visible. Individual producers own their health
  statuses; no unsupported universal freshness timer is inferred.

## Documents

- [Specification](./signaldesk-control-room_spec.md)
- [Implementation](./signaldesk-control-room_impl.md)
- [Firebase](./signaldesk-control-room_firebase.md)
- [Compliance](./signaldesk-control-room_compliance.md)
- [Mobile support](./signaldesk-control-room_mobile-support.md)
- [Test cases](./signaldesk-control-room_test-cases.md)

## External Gates

Provider sending remains disabled. Hosted authentication, mobile-device pause
confirmation, and real incident/provider smoke remain release-environment work.

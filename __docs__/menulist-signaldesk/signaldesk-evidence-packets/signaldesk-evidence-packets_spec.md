# SignalDesk Evidence Packets - Specification

**Status:** Implemented
**Last Updated:** July 21, 2026

## Purpose

An Evidence Packet records what SignalDesk can currently and safely say about
one target from its approved source lineage. It makes uncertainty explicit and
provides the evidence boundary used by later internal workflows.

## Admission

Creation requires:

- authenticated SignalDesk access with `target.review`;
- a desktop request;
- a current, strictly shaped target with active source-data lifecycle;
- the target's current source policy;
- policy status and retention that are still usable for `evidence`;
- `allowedUse.evidence === true`.

The server remains authoritative. The desktop disables the Evidence action when
the loaded policy is predictably unusable, but this is only an owner-experience
guard.

## Stored Summary

| Field | Contract |
| --- | --- |
| `evidencePacketId` | Deterministic `evidence_<32 hex>` identity. |
| `targetId`, `targetName` | Current target identity and display name. |
| `confidence` | High only for high source confidence; blocked becomes low; other values become medium. |
| `allowedUse` | Always includes `evidence`; includes `draft-personalization` only when current policy permits personalization. |
| `summary` | Bounded classification of current approved target facts. |
| `rejectedFacts` | Explicit unverified or unsupported claims. |
| `currentMenuPresence` | Versioned `current-menu-presence-v1` diagnostic with observed format, truth gap, source references, contradictions, and unverified owner/mobile states. |
| timestamps | Server-owned creation and update time. |

The private detail adds only category, city, current-list URL, website, and
source-lifecycle lineage. It does not store raw contact values, provider payloads,
free-form operator notes, or inferred commercial impact.

## Deterministic Identity

Identity includes the target, approved uses, source policy/run/observation,
display and location facts, current-list facts, opportunity, confidence,
diagnostic version, and suppression state. Exact retries return the existing
summary without duplicate writes. A relevant source or suppression change
creates a new immutable packet instead of mutating the old one.

## Next Action

Evidence creation advances a target to `draft` only when personalization is
allowed and the target is otherwise draft-eligible. Evidence-only, suppressed,
held, or rejected targets move to `hold`; the UI must not promise a draft action
the server will reject.

## Downstream Authority

- Draft creation requires the latest valid summary, current personalization
  authority, current source policy, target readiness, contact authority, sender,
  CTA, and template.
- Approval packets and approval decisions re-read evidence in their transaction.
- AI Assist binds evidence and source authority before and after provider work.
- Outcome and route-token flows require current target/evidence lineage.
- Evidence alone never approves, exports, contacts, sends, publishes, or writes
  MenuList truth.

## Retention

Target expiry scrubs evidence detail and summary in the consolidated source-data
lifecycle. Historical evidence details are also queried by their own expiry so a
later target refresh cannot extend an older packet's retention. The paired
summary is scrubbed in the same transaction.

## Acceptance Criteria

- Exact/concurrent creation converges on one packet and one summary.
- Policy expiry, missing evidence rights, inactive source lifecycle, and malformed
  authority fail before packet writes.
- Suppression-sensitive diagnostics cannot reuse an older clear-state identity.
- Evidence-only authority cannot advance to draft.
- Detail and summary expire together even after target refresh.
- Mobile and unauthorized callers cannot mutate evidence.

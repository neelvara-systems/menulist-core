# SignalDesk Demand Signals - Specification

**Status:** Implemented internal capture and summary contract
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

## Objective

Retain compact business-demand evidence for internal prioritization and attribution while preventing anonymous-customer identity, automatic outreach, or MenuList truth mutation.

## Signal Vocabulary

| Signal | Current meaning |
| --- | --- |
| `qr_scan` | Operator-confirmed QR demand observation. |
| `link_click` | Operator-confirmed link demand observation. |
| `share` | Operator-confirmed sharing demand observation. |
| `claim_attempt` | Operator-confirmed business claim/setup intent. |
| `referral` | Operator or an approved internal metric workflow observed referral/owner intent. |

Every capture also carries one bounded source surface: `menu`, `qr`, `website`, `manual`, or `other`.

## Requirements

| ID | Requirement |
| --- | --- |
| DEM-001 | Capture requires `target.review`, desktop mode, feature enablement, a bounded actor operation key, and a strict payload. |
| DEM-002 | A target ID must resolve to current strict `SD` target truth; caller target names never override it. |
| DEM-003 | General signals store both target ID and target name as null; free-text identity without a target is rejected. |
| DEM-004 | Event, daily source summary, idempotency claim, audit, control count, and cost count settle atomically. |
| DEM-005 | Existing deterministic summaries must pass strict product, identity, field, and lineage validation before increment. |
| DEM-006 | Exact replay must prove its actor-bound claim, immutable event, and event-day summary; changed intent fails closed. |
| DEM-007 | Demand never creates a target, clears suppression, authorizes contact, sends, publishes, or writes MenuList truth. |
| DEM-008 | Raw demand events are server authority only; clients receive bounded summary projections. |

## Non-Goals

- No public MenuList event hook in the current runtime.
- No customer identity, IP, device fingerprint, or cross-business graph.
- No automatic target/prospect creation.
- No referral review queue or hook-health collection.
- No public analytics or MenuList owner setting.
- No mobile demand-detail screen or mutation.

## Acceptance Criteria

- Concurrent identical captures produce one six-write effect set and one durable replay.
- A retry after UTC day rollover returns the original event-day summary.
- Foreign/malformed targets or deterministic summaries fail before partial writes.
- Suppressed targets can contribute aggregate learning without changing suppression or outreach authority.
- Content/trust owner-signal aggregates project with null target identity and obey the Demand Signals feature flag.

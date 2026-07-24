# SignalDesk Demand Signals - Firebase

**Status:** Implemented app-server persistence contract
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

## Collections

| Collection | Purpose | Client read pattern |
| --- | --- | --- |
| `signaldeskDemandSignals` | Immutable operator-capture events. | None; server authority and outcome-source validation only. |
| `signaldeskDemandSignalSummaries` | Daily source/surface/target-or-general counters. | Strict bounded workspace summary reads. |
| `signaldeskIdempotencyKeys` | Actor/key capture claims. | None; transaction point reads only. |
| `signaldeskAuditEvents` | Stable capture classification. | Authorized Audit workspace. |
| `signaldeskControlRoomSummaries` | Aggregate demand count. | Existing overview read. |
| `signaldeskCostDailySummaries` | Firestore write estimate. | Existing overview/cost read. |

There are no `signaldeskSurfaceHookEvents`, `signaldeskReferralSignals`, or `signaldeskViralRouteAttributions` collections.

## Exact Records

| Record | Required authority |
| --- | --- |
| Event | `demandSignalId`, `pId=SD`, signal type, source surface, nullable paired target ID/name, `createdAt`, `createdBy` |
| Summary | document-matching `demandSignalId`, `pId=SD`, count, UTC day, signal type, source surface, nullable paired target ID/name, `updatedAt` |
| Claim | actor, event entity ID, `operation=demand_signal_capture`, `pId=SD`, request fingerprint, timestamp |

## Cost

A new operator capture writes exactly six records in one transaction: event, summary, claim, audit, control summary, and daily cost summary. Exact replay reads claim, event, and original event-day summary and writes zero.

Content-performance and trust-partner workflows use their own transactions. With owner-quality demand and the feature enabled, each adds two demand effects: one summary and one control count. Their daily cost estimates include those two effects. No additional read, listener, Function, index, Storage object, or provider call was added.

## Indexes And Scale

- Workspace summary ordering uses the automatic single-field `updatedAt` index.
- Deterministic event, summary, and claim records use point reads.
- The summary workspace read is capped and fill-through bounded; no raw event scan is used.
- Current manual/internal volume does not justify a queue or sharded counter.

## Retention

No dedicated Demand Signals cleanup task exists today. Raw capture volume is operator-bounded because no public hook is wired. Before any public/high-volume producer is approved, retention for raw events and claims must be decided and added to the consolidated SignalDesk lifecycle scheduler; summaries may remain longer for aggregate learning.

# SignalDesk Outcome Bridge - Firebase Plan

**Status:** Initial Firebase design
**Created:** June 23, 2026

## Collections

| Collection | Purpose | Read Pattern |
| --- | --- | --- |
| `signaldeskRouteTokens` | Scoped, expiring route references for approved actions. | Token lookup and admin review. |
| `signaldeskOutcomeEvents` | Append-only events from routes, MenuList hooks, or operators. | Event stream by target/action. |
| `signaldeskAttributionTouches` | Normalized first/last/assisted touch records. | Reporting and detail view. |
| `signaldeskOutcomeSummaries` | Derived target/campaign/source/channel outcome totals. | Dashboard reads. |
| `signaldeskBridgeAuditEvents` | Rejected tokens, manual edits, dedupe decisions. | Audit/debug only. |

## Required Fields

| Object | Required fields |
| --- | --- |
| Route token | `tokenId`, `tokenHash`, `targetId`, `actionId`, `channel`, `scope`, `expiresAt`, `revokedAt`, `createdAt` |
| Outcome event | `eventId`, `targetId`, `eventType`, `source`, `menuListRef`, `routeTokenId`, `occurredAt`, `createdAt` |
| Attribution touch | `touchId`, `targetId`, `eventId`, `actionId`, `touchType`, `weight`, `method`, `createdAt` |
| Summary | `summaryId`, `scope`, `metricKey`, `counts`, `lastEventAt`, `updatedAt` |

## Indexes

| Query | Index |
| --- | --- |
| Token lookup | `tokenHash` |
| Target outcomes | `targetId`, `occurredAt desc` |
| Action attribution | `actionId`, `occurredAt desc` |
| Summary scope | `scope`, `metricKey`, `updatedAt desc` |
| Bridge audit | `eventType`, `createdAt desc` |

## Cost Rules

- Dashboards read `signaldeskOutcomeSummaries`, not raw events.
- Token lookup reads one hashed token record.
- Outcome event writes are append-only and idempotent.
- Attribution recalculation should be bounded to the target/action affected.
- Manual reporting exports should use summaries unless raw evidence is explicitly needed.

## Retention

Route token records may be retained after expiry as hashed audit references. Outcome events and attribution touches should retain enough history for growth learning and compliance audit, with later archival once the runtime policy is set.

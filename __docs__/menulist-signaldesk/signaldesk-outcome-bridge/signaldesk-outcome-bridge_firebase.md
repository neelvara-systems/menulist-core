# SignalDesk Outcome Bridge - Firebase Plan

**Status:** Implemented persistence contract; local emulator verified
**Created:** June 23, 2026
**Runtime reconciled:** July 13, 2026

## Collections

| Collection | Purpose | Read Pattern |
| --- | --- | --- |
| `signaldeskRouteTokens` | Scoped, expiring route references for approved actions. | Token lookup and admin review. |
| `signaldeskOutcomeEvents` | Append-only events from routes, MenuList hooks, or operators. | Event stream by target/action. |
| `signaldeskAttributionTouches` | Normalized first/last/assisted touch records. | Reporting and detail view. |
| `signaldeskOutcomeSummaries` | Derived target/campaign/source/channel outcome totals. | Dashboard reads. |
| `signaldeskIdempotencyKeys` | Request fingerprint and accepted outcome link. | Server transaction point read only. |
| `signaldeskAuditEvents` | Token creation/revocation and accepted outcome audit. | Platform-admin audit view. |

## Required Fields

| Object | Required fields |
| --- | --- |
| Route token | `routeTokenId`, `tokenHash`, `targetId`, `sourceActionId`, `channel`, `scope`, `status`, `expiresAt`, `revokedAt`, `createdAt` |
| Outcome event | `outcomeEventId`, `targetId`, `outcomeType`, `source`, `evidenceRef`, `routeTokenId`, `integrityStatus`, `createdAt` |
| Attribution touch | `touchId`, `targetId`, `eventId`, `actionId`, `touchType`, `weight`, `method`, `createdAt` |
| Summary | `outcomeSummaryId`, `targetId`, `outcomeType`, `source`, `channel`, `count`, `day`, `updatedAt` |

## Indexes

| Query | Index |
| --- | --- |
| Token lookup | Deterministic document ID derived from token hash; no query index. |
| Latest target outcomes | `targetId`, `updatedAt desc` on `signaldeskOutcomeSummaries`. |
| Earliest target outcomes | `targetId`, `updatedAt asc` on `signaldeskOutcomeSummaries`. |

## Cost Rules

- Dashboards read `signaldeskOutcomeSummaries`, not raw events.
- Token lookup reads one hashed token record.
- Outcome event, idempotency key, summary, target projection, direct attribution touch, route-use projection, audit, control summary, and cost estimate commit atomically.
- One accepted signed target outcome adds one attribution-touch write and one route-use write. Exact retries add no outcome-side writes.
- Token revocation uses one route write, one audit write, and one cost-summary write.
- Manual reporting exports should use summaries unless raw evidence is explicitly needed.

## Retention

Route token records may be retained after expiry as hashed audit references. Outcome events and attribution touches should retain enough history for growth learning and compliance audit, with later archival once the runtime policy is set.

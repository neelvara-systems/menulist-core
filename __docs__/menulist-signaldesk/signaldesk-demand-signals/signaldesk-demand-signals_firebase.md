# SignalDesk Demand Signals - Firebase Plan

**Status:** Initial Firebase design
**Created:** June 23, 2026

## Collections

| Collection | Purpose | Read Pattern |
| --- | --- | --- |
| `signaldeskDemandSignals` | Compact append-only demand events. | Bounded detail/debug reads. |
| `signaldeskDemandSignalSummaries` | Derived counts by surface, market, target, source, and day. | Dashboard/default reads. |
| `signaldeskSurfaceHookEvents` | Hook health and rejected payload events. | Control-room diagnostics. |
| `signaldeskReferralSignals` | Operator/partner referral records. | Review queue reads. |
| `signaldeskViralRouteAttributions` | Route/share signal attribution references. | Outcome detail and reporting. |

## Required Fields

| Object | Required fields |
| --- | --- |
| Demand signal | `signalId`, `signalType`, `surface`, `scope`, `targetId`, `routeTokenId`, `sourcePolicyId`, `occurredAt`, `createdAt` |
| Summary | `summaryId`, `scope`, `signalType`, `bucket`, `counts`, `lastSignalAt`, `updatedAt` |
| Referral | `referralId`, `referrerType`, `targetHint`, `status`, `operatorId`, `evidenceNote`, `createdAt` |
| Hook event | `hookEventId`, `surface`, `status`, `reason`, `createdAt` |

## Indexes

| Query | Index |
| --- | --- |
| Demand by target | `targetId`, `occurredAt desc` |
| Demand summary | `scope`, `signalType`, `bucket desc` |
| Referral review queue | `status`, `createdAt desc` |
| Hook diagnostics | `surface`, `status`, `createdAt desc` |
| Route attribution | `routeTokenId`, `createdAt desc` |

## Cost Rules

- Dashboards read summaries only.
- Public-surface hooks write compact payloads only.
- Reject invalid payloads before expensive enrichment.
- Aggregate scan/link activity by bucket where possible.
- Do not read MenuList customer/session data into SignalDesk.

## Retention

| Data | Default |
| --- | --- |
| Anonymous aggregate signals | Retain as aggregate summaries; raw compact events can be shorter-lived. |
| Business-facing claim/referral signals | Retain while target/opportunity is active. |
| Hook diagnostics | Retain short term for debugging and audit. |
| Route attributions | Retain with outcome bridge policy. |

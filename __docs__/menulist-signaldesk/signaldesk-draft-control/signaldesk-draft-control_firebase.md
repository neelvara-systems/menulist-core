# SignalDesk Draft Control - Firebase And Cost

**Status:** Implemented; no new Firebase infrastructure in this feature pass
**Last Updated:** July 21, 2026

## Collections

| Collection | Role |
| --- | --- |
| `signaldeskTemplateSummaries` | Server-seeded template authority and workspace list. |
| `signaldeskDraftSummaries` | Exact message plus evidence/CTA/sender/template lineage. |
| `signaldeskApprovalQueue` | Pending human decision. |
| `signaldeskApprovalPackets` | Exact review snapshot and action fingerprint. |
| `signaldeskTargetSummaries` / `signaldeskTargets` | Current target, lifecycle, and private contact authority. |
| `signaldeskSourcePolicies` | Current source/contact/personalization rights. |
| `signaldeskEvidencePacketSummaries` | Current reviewed evidence summary. |
| `signaldeskSelfServiceCtas` | Authoritative current preview CTA. |
| `signaldeskSenderDomains` | Sender readiness and risk authority. |
| `signaldeskAuditEvents`, `signaldeskRunTimelines` | Durable action evidence. |
| `signaldeskQueueSummaries`, `signaldeskCostDailySummaries` | Compact operational summaries. |

There is no `signaldeskDrafts`, template-detail, draft-guardrail-event, or
Storage collection in the current implementation.

## Cost Shape

- Admission uses bounded point reads and bounded queries. It never scans MenuList data.
- A new draft writes eight bounded records: draft, approval, approval packet,
  target merge, audit, timeline, queue summary, and daily cost summary.
- Exact/concurrent replay performs bounded reads and zero writes.
- Rejected admission performs no draft/approval/packet/queue/cost writes.
- Workspace reads remain section-limited and use strict summary projection.

The existing approval-queue composite index supports queue ordering. Draft
creation itself uses point reads and needs no new index.

## Security

- API admission requires SignalDesk access and `target.review` permission.
- Mobile mutation is rejected by the shared API guard.
- Firestore client writes are denied.
- Contact identity and authority fingerprints are not exposed through workspace
  or mutation response projectors.
- SignalDesk uses the separate SignalDesk Firebase project and `SD` product marker.

## Retention

The consolidated source-data lifecycle scrubs unsent source-derived drafts and
holds linked approvals when their source authority expires. Sent communication
is marked for legal-retention review instead of being silently destroyed. No
standalone scheduler was added.

## Deployment

This Draft Control pass changes only root application/runtime code, docs, and
local verification. It changes no SignalDesk Function, rule, index, or Storage
rule, so it requires no new Firebase deployment. Vercel deployment remains an
owner-controlled release step.

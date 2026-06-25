# SignalDesk Foundation - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Firebase Posture

Foundation must use the dedicated SignalDesk Firebase target, not MenuList's default target.

Required before database-backed implementation:

- `menulist-signaldesk-qa` Firebase project for local/QA;
- `menulist-signaldesk` Firebase project for production;
- `firebase-signaldesk.json`;
- `firestore-signaldesk.rules`;
- `firestore-signaldesk.indexes.json`;
- `storage-signaldesk.rules`;
- `signaldeskFirebaseClient` and `signaldeskFirebaseAdmin`.

No foundation collection may be created in `menulist-qa` or `menulist` except a narrow auth/account bridge if explicitly documented.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskTeamMembers` | Internal user role assignments | Login/session bootstrap |
| `signaldeskRolePolicies` | Role-permission matrix | Small policy list |
| `signaldeskAuditEvents` | Mutation/contact reveal/action audit | Admin audit page only |
| `signaldeskKillSwitches` | Emergency controls | Control room and pre-action checks |
| `signaldeskFoundationSummaries` | Control room summary | Dashboard read |
| `signaldeskIncidents` | Foundation/security/channel incidents | Control room list |
| `signaldeskIdempotencyKeys` | Retry, webhook, and mutation dedupe | Point lookup only |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Load dashboard | 3-6 | 0 | Reads summaries, kill switches, incidents. |
| Check permission | 1-2 | 0 | Cache role policy in server/runtime where safe. |
| Add/update team member | 1-2 | 2 | Server action writes `signaldeskTeamMembers`, audit, and cost summary. |
| Contact reveal | 2-4 | 1-2 | Reads role and contact state; writes audit. |
| Activate kill switch | 2-4 | 2 | Writes kill switch and audit. |
| Deactivate kill switch | 2-4 | 2 | Writes kill switch and audit. |
| Audit search | Paginated query | 0 | Admin only, page size capped. |

## Cost Rules

- No real-time listener on audit events.
- Audit pages must paginate.
- Dashboard reads summary docs.
- Role policies should be small.
- Kill-switch checks should read compact docs.
- Contact reveal must not write multiple audit records for one action.
- Role policy reads should be cached per server request where safe.
- No real-time listener on team members, role policies, or incidents.
- No foundation dashboard may read raw audit events by default.

## Indexes

Minimum indexes:

- `signaldeskAuditEvents` by `actorId` + `createdAt`;
- `signaldeskAuditEvents` by `entityType` + `entityId` + `createdAt`;
- `signaldeskIncidents` by `status` + `severity` + `updatedAt`;
- `signaldeskKillSwitches` by `scope` + `status`.

Do not index:

- reason text;
- user agent hash;
- IP hash;
- raw request payloads.

## Retention

| Data | Default |
| --- | --- |
| Role policy | Until changed, keep version history |
| Kill-switch audit | 24 months minimum |
| Contact reveal audit | 24 months minimum |
| Incident records | 24 months minimum |

Exact retention needs legal/compliance confirmation before production.

# Agency Workspace - Implementation

## Runtime Contract

Agency Workspace must use explicit account/workspace/client mappings. It must never rely only on UI filtering for client separation.

## Flow

1. Agency account creates or joins client workspace.
2. Assigned agency users create campaign cues or packs.
3. Client owner/reviewer receives approval request.
4. Campaign output is approved, rejected, or commented.
5. Agency schedules, exports, or publishes according to role.
6. Report snapshot is generated from analytics summaries.

## Current Runtime

- The workspace has an Agency screen.
- Campaign packs can record `request_approval` through `/api/campaigncue/campaigns/[campaignId]/actions`.
- Approval request records are server-written under the CampaignCue workspace and tied to campaign/output ids.
- Structured campaign outputs include approval notes and manual handoff steps so agency users can pass a reviewed pack without starting connected publishing.
- The current runtime supports approval request logging, a bounded current-thread comment inbox on the existing Campaign Pack, authorized comment resolution, and manual handoff. External client portal links, notifications, and report shares remain disabled until the CampaignCue Firebase project and external delivery surface are provisioned.

## Data Objects

| Object | Purpose |
| --- | --- |
| `agencyAccounts` | Agency-level identity and settings. |
| `agencyClientLinks` | Mapping between agency account and client workspace. |
| `agencyTemplates` | Reusable campaign structures. |
| `approvalRequests` | Deterministic approval record mirrored atomically from the current Campaign Pack approval inbox. |
| `clientReportShares` | Shareable report snapshots and expiry. |

## Security Rules

- A user must have both agency membership and client link to access client workspace data.
- Client approval links require token, expiry, and target output version.
- Template application must strip source facts before applying to another client.

## Acceptance

- Agency users cannot enumerate unassigned workspaces.
- Approval applies to a specific output version.
- Client report share can be revoked.

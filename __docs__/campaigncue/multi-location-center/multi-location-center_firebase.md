# Multi-Location Center - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/locations` | Location profile and channel metadata. |
| `campaigncueWorkspaces/{workspaceId}/locationGroups` | Grouping and rollup metadata. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/locationDrafts` | Location-specific output. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/locationApprovalStates` | Approval by location and version. |
| `campaigncueWorkspaces/{workspaceId}/locationResultSummaries` | Location-level analytics summaries. |

## Cost Guardrails

- Create location-specific docs only for selected locations.
- Do not fan out to every location by default.
- Use batch writes for group campaign draft creation.
- Use summary docs for rollup reports.
- Paginate location status tables.
- `GET /api/campaigncue/locations` uses a workspace-only guard read plus a bounded location query instead of loading the full CampaignCue overview.
- Adding a location writes one location document plus one event and then merges the response locally in the owner workspace UI.

## Security

- Role checks must support workspace-level and location-level permissions.
- Local managers can access only assigned locations unless given broader role.
- Bulk actions require elevated permission and audit log entry.

# Agency Workspace - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueAgencyAccounts/{agencyId}` | Agency account metadata. |
| `campaigncueAgencyAccounts/{agencyId}/members` | Agency user roles. |
| `campaigncueAgencyAccounts/{agencyId}/clientLinks` | Assigned client workspaces. |
| `campaigncueAgencyAccounts/{agencyId}/templates` | Reusable campaign templates. |
| `campaigncueWorkspaces/{workspaceId}/approvalRequests` | Client approval state and comments. |
| `campaigncueWorkspaces/{workspaceId}/clientReportShares` | Report share records. |

## Cost Guardrails

- Agency dashboard should read compact client summaries.
- Do not query all client campaign collections on agency dashboard load.
- Store report snapshots for sharing instead of recomputing from raw events per view.
- Paginate approval requests and client history.

## Security

- Agency and client roles must be checked server-side and in Firestore rules.
- Approval share tokens must expire.
- Client report shares must be revocable.
- Cross-client template reuse must strip source refs.


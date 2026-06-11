# Creative Trust Center - Firebase Notes

## Collections

Current runtime:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/trustReports/{trustReportId}` | Deterministic campaign trust report and findings array. |

Logical expansion:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/trustReports` | Output-version trust result. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/trustFindings` | Individual issue records. |
| `campaigncueWorkspaces/{workspaceId}/trustAcknowledgements` | Owner/agency acknowledgements. |
| `campaigncueTrustRuleVersions` | Product-level trust rule metadata. |

## Cost Guardrails

- Do not recompute trust reports for unchanged output versions.
- Store compact findings and source refs.
- Keep deterministic checks client/server local where possible.
- Use model-assisted review only for ambiguous claim checks.
- Batch report and finding writes.

## Security

- Trust reports can include sensitive campaign or source context and must remain workspace-scoped.
- Acknowledgements require actor id and role.
- Rule-version records should be read-only to normal workspace users.

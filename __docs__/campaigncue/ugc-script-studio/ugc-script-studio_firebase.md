# UGC Script Studio - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/ugcBriefs` | Canonical brief records. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/ugcBriefVersions` | Versioned scripts and edits. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/ugcTrustReports` | Claim and disclosure checks. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/ugcExports` | Export and agency handoff events. |

## Cost Guardrails

- Current active export/download runtime adds no new Firestore collection, read, write, Storage object, Cloud Function, provider call, model call, creator CRM record, contract record, or payment record for creator-fit checks, lightweight creator briefs, 3-test plans, or dialogue/action beat sheets. The fields are derived from the existing campaign output and Business Brain data.
- The `local_creator_test_brief` output intent creates a normal campaign pack through the existing guarded campaign API. Cost remains the existing campaign-create write path plus existing action/export logging; no extra read path is introduced for creator testing.
- Store script text and metadata in Firestore; avoid large embedded media payloads.
- Reuse campaign facts already loaded by Campaign Studio.
- Re-run trust checks only when script content or source references change.
- Paginate version history.

## Security

- Workspace role checks required for all reads and writes.
- Agency handoff requires explicit permission.
- Export history should record actor id, timestamp, and approved version id.

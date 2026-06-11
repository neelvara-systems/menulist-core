# Video Reel Studio - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/videoBriefs` | Script, shot list, overlays, and CTA. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/videoRenders` | Provider attempts and render status. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/videoTrustReports` | Trust checks for scripts and renders. |
| `campaigncueWorkspaces/{workspaceId}/usageEvents` | Credit usage and provider attempt accounting. |

## Storage

Rendered video files should live under:

`campaigncue/{workspaceId}/campaigns/{campaignId}/video/{videoId}/`

## Cost Guardrails

- Do not render automatically after brief generation.
- Require explicit credit confirmation before video rendering.
- Store render status and avoid polling loops without backoff.
- Use signed access patterns for private render files.
- Retain failed provider payloads only as compact diagnostics, not full media blobs.

## Security

- Render files are private by default.
- Workspace role checks apply before viewing, approving, or exporting.
- Provider callbacks must validate signature and workspace/campaign ownership.


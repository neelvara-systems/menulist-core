# WhatsApp Sales Studio - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/whatsappCampaigns` | WhatsApp campaign mode and status. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/whatsappMessageVariants` | Draft and approved message variants. |
| `campaigncueWorkspaces/{workspaceId}/audiences/{audienceId}/consentStates` | Consent posture and exclusions. |
| `campaigncueWorkspaces/{workspaceId}/whatsappEvents` | Export, send, reply, delivery, and opt-out events. |

## Cost Guardrails

- Do not store raw contact lists inside campaign documents.
- Use compact recipient references and consent summaries.
- Batch event writes when provider webhooks arrive in bursts.
- Avoid per-recipient Firestore reads at send time; precompute eligible recipient refs.
- Keep direct-send jobs rate-limited and retry-bounded.

## Security

- Contact and consent data is sensitive.
- Workspace role checks required before audience access.
- Provider webhooks must validate signature and map to a known workspace.
- Raw message payloads should be minimized in logs.


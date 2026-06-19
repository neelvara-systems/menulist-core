# API Boundaries - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/providerConnections` | Connected provider metadata. |
| `campaigncueWorkspaces/{workspaceId}/providerJobs` | Publish, import, export, and generation jobs. |
| `campaigncueWorkspaces/{workspaceId}/webhookEvents` | Idempotent provider callback records. |
| `campaigncueWorkspaces/{workspaceId}/apiUsageSummaries` | API and provider usage summaries. |
| `campaigncueApiClients/{clientId}` | Partner/API client metadata when enabled. |

## Cost Guardrails

- Reject malformed JSON before schema validation or any Firestore read/write path.
- Store webhook receipts compactly and dedupe by provider event id.
- Avoid storing raw provider payloads unless needed for short retention diagnostics.
- Summarize API usage by day/workspace/provider.
- Rate-limit expensive provider actions before Firestore fanout.
- Keep partner APIs disabled unless there is a defined use case and support owner.

## Security

- Webhook secrets and provider tokens must not live in plain Firestore documents.
- All protected APIs require workspace role checks.
- Partner API keys require rotation, scopes, rate limits, and audit logs.
- Logs must not include tokens, secrets, raw contact data, or payment payloads.

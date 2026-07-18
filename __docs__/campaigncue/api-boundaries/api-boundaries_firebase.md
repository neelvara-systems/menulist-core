# API Boundaries - Firebase Notes

## Active Runtime

- `/api/campaigncue/integrations` performs the existing workspace guard read and returns static posture.
- It does not read or write provider-connection, provider-job, webhook, usage, or API-client documents.
- CampaignCue has no active provider token, MCP session, provider metric import, provider webhook, partner API client, or provider scheduler.

## Future Logical Objects

These names are architecture candidates, not deployed/current collections:

| Logical object | Purpose | Admission rule |
| --- | --- | --- |
| Provider connection | Account mapping and revocation metadata. | Create only when a real provider connector is approved; secrets remain outside Firestore. |
| Provider job | Idempotent provider mutation attempt. | Mutation-only future layer; not needed for read-first owner refresh. |
| Provider webhook receipt | Replay/deduplication receipt. | Create only where provider webhooks are required and cheaper/safer than bounded refresh. |
| Provider metric summary | Compact normalized read evidence. | One lazy summary per workspace/provider, capped and hash-deduplicated. |
| Partner API client | External client identity and scopes. | Disabled until a supported partner use case exists. |

## Cost Guardrails

- Reject malformed JSON before schema validation or any Firestore read/write path.
- Store webhook receipts compactly and dedupe by provider event id.
- Avoid storing raw provider payloads unless needed for short retention diagnostics.
- Summarize API usage by day/workspace/provider.
- Rate-limit expensive provider actions before Firestore fanout.
- Keep partner APIs disabled unless there is a defined use case and support owner.
- Keep Meta provider summaries out of the default overview and avoid one-document-per-metric or activity-row designs.

## Security

- Webhook secrets and provider tokens must not live in plain Firestore documents.
- All protected APIs require workspace role checks.
- Partner API keys require rotation, scopes, rate limits, and audit logs.
- Logs must not include tokens, secrets, raw contact data, or payment payloads.

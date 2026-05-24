# Canonica Public API

> **Status:** Implemented, feature-flagged
> **Feature Flag:** `ENABLE_CANONICA_PUBLIC_API`
> **Auth:** `X-API-Key` with a `cn_*` key stored as `store.publicApi.apiKeyHash`
> **Scope:** Pillar 5 API & Integration layer

---

## Purpose

The Canonica Public API lets external SaaS systems retrieve governed canonical knowledge and send structured support signals without using the Canonica dashboard or widget UI.

It is intentionally narrow:

- Read canonical answers
- Read the entity registry
- Ingest structured signals

It does not expose raw KB article editing, ticket workflow automation, outbound workflow adapters, or direct canonical answer mutation.

---

## Endpoints

| Endpoint | Method | Purpose | Firebase behavior |
| --- | --- | --- | --- |
| `/api/canonica/public/v1/answers` | `POST` | Canonical-first answer retrieval using query, version, scope, and optional context | Reads entity index, latest release, and active canonical answers from Canonica Firestore |
| `/api/canonica/public/v1/entities` | `GET` | Read-only entity registry for stable ontology IDs | Reads capped tenant entity list from Canonica Firestore |
| `/api/canonica/public/v1/signals` | `POST` | Ingest external ticket/chat/escalation signals | Writes one `canonica_signalEvents` document through the server signal emitter |

All endpoints:

- Require `ENABLE_CANONICA_PUBLIC_API`
- Require a valid `cn_*` API key
- Rate-limit per API key
- Resolve `tId` and `sId` from the key's store record
- Never trust tenant/store IDs from the request body
- Reject non-Canonica keys

---

## Answer Retrieval

Request:

```json
{
  "query": "How do webhook retries work?",
  "currentVersion": 2004001,
  "planId": "pro",
  "roleId": "admin",
  "context": {
    "contextVersion": 1,
    "feature": "webhooks",
    "page": "webhook_settings",
    "workflow": "configure_webhook"
  }
}
```

Response:

```json
{
  "schemaVersion": "canonica.public.v1",
  "canonical": true,
  "confidence": "high",
  "matchedEntityIds": ["webhooks"],
  "fallbackReason": null,
  "answer": {
    "id": "answer_webhook_retries",
    "title": "Webhook retry behavior",
    "answerType": "explanation",
    "content": {
      "structuredSummary": "Webhook deliveries are retried on transient failures.",
      "detailedExplanation": "..."
    }
  }
}
```

The API does not run RAG fallback. If no governed answer matches, it returns `canonical: false` with a deterministic fallback reason. This keeps the external API predictable and cost-controlled.

---

## Signal Ingestion

Request:

```json
{
  "type": "ticket",
  "entityId": "webhooks",
  "externalId": "zendesk_123",
  "metadata": {
    "severity": "high",
    "surface": "webhook_settings"
  }
}
```

Response:

```json
{
  "schemaVersion": "canonica.public.v1",
  "accepted": true
}
```

Signal ingestion requires `ENABLE_CANONICA_SIGNAL_MUTATION` because signals feed the mutation governance loop.

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-16 | 1.0.0 | Implemented flag-gated public answers, entities, and signal ingestion API |

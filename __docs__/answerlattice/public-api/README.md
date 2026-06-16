# Answerlattice Public API

> **Status:** Implemented, feature-flagged
> **Feature Flag:** `ENABLE_ANSWERLATTICE_PUBLIC_API`
> **Auth:** `X-API-Key` with a `al_*` key stored as `store.publicApi.apiKeyHash`
> **Scope:** Pillar 5 API & Integration layer

---

## Purpose

The Answerlattice Public API lets external SaaS systems retrieve governed canonical knowledge and send structured support signals without using the Answerlattice dashboard or widget UI.

It is intentionally narrow:

- Read canonical answers
- Read the entity registry
- Ingest structured signals

It does not expose raw KB article editing, ticket workflow automation, outbound workflow adapters, or direct canonical answer mutation.

---

## Endpoints

| Endpoint | Method | Purpose | Firebase behavior |
| --- | --- | --- | --- |
| `/api/answerlattice/public/v1/answers` | `POST` | Canonical-first answer retrieval using query, version, scope, and optional context | Reads entity index, latest release, and active canonical answers from Answerlattice Firestore |
| `/api/answerlattice/public/v1/entities` | `GET` | Read-only entity registry for stable ontology IDs | Reads capped tenant entity list from Answerlattice Firestore |
| `/api/answerlattice/public/v1/signals` | `POST` | Ingest external ticket/chat/escalation signals | Writes one `answerlattice_signalEvents` document through the server signal emitter |

All endpoints:

- Require `ENABLE_ANSWERLATTICE_PUBLIC_API`
- Require a valid `al_*` API key
- Rate-limit per API key
- Resolve `tId` and `sId` from the key's store record
- Never trust tenant/store IDs from the request body
- Reject non-Answerlattice keys

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
  "schemaVersion": "answerlattice.public.v1",
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

Production responses do not include internal entity-resolution debug traces. Retrieval debug stays inside owner-controlled escalation/ticket diagnostics; `includeDebug` is ignored in production public API payloads.

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
  "schemaVersion": "answerlattice.public.v1",
  "accepted": true
}
```

Signal ingestion requires `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` because signals feed the mutation governance loop.

`externalId` acts as an idempotency key for server-side signal ingestion. Retries with the same key for the same workspace and signal type do not append duplicate signal-event documents.

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-06-16 | 1.0.1 | Hardened production answers to suppress internal debug traces and made explicit external signal IDs idempotent |
| 2026-05-16 | 1.0.0 | Implemented flag-gated public answers, entities, and signal ingestion API |

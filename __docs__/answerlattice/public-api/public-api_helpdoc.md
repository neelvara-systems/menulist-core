# Use the Answerlattice Public API

> **Availability:** Account-gated. The Public API page is hidden unless enabled for the workspace.

## Before You Start

You need:

- permission to manage integrations;
- a trusted backend or serverless function;
- an approved set of canonical answers for the intended workflow; and
- a secure secret store.

Do not put an Answerlattice Public API key in browser JavaScript, a mobile application, a public repository, analytics events, support messages, or screenshots.

## Create a Key

1. Open **Public API** in the Answerlattice workspace.
2. Keep **Read answers and entities** selected.
3. Select **Send support signals** only when the integration must report unresolved support friction.
4. Choose **Create Key**.
5. Store the displayed `al_*` key immediately. Answerlattice will not show it again.

Creating another key rotates the current key. The previous key stops working immediately.

## Request an Answer

Call from your backend:

```bash
curl -X POST 'https://YOUR_ANSWERLATTICE_HOST/api/answerlattice/public/v1/answers' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: al_REDACTED' \
  -d '{
    "query": "How do webhook retries work?",
    "currentVersion": 2004001,
    "planId": "pro",
    "roleId": "admin",
    "stateId": "delivery_failed"
  }'
```

Check `canonical`, `fallbackReason`, `clarification`, and `citations` before presenting the result. A response with `canonical: false` is not permission to generate an unsupported answer. Ask the user for clarification or use your approved human fallback.

## Read Public Entities

```bash
curl 'https://YOUR_ANSWERLATTICE_HOST/api/answerlattice/public/v1/entities?status=active&limit=100' \
  -H 'X-API-Key: al_REDACTED'
```

Store the returned ETag and send it through `If-None-Match` on the next request. A `304` response means the projected entity data did not change.

Check `truncated` in every entity response. When it is `true`, the bounded result is partial. Narrow the request by type or status; Public API v1 does not provide a cursor for fetching the remainder.

## Send a Support Signal

The key must include `signals:write`.

```bash
curl -X POST 'https://YOUR_ANSWERLATTICE_HOST/api/answerlattice/public/v1/signals' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: al_REDACTED' \
  -H 'Idempotency-Key: ticket_zendesk_123' \
  -d '{
    "type": "ticket",
    "entityId": "webhooks",
    "metadata": {
      "severity": "high",
      "surface": "webhook_settings"
    }
  }'
```

Signals create review evidence. They do not publish or change answers automatically.

## Rotate or Revoke

- **Rotate:** select scopes and choose **Rotate Key**. Update your backend secret immediately.
- **Revoke:** choose **Revoke Key**. The active key stops working immediately.

Use rotation when a key may have been exposed, ownership changes, or your normal secret-rotation policy requires it. Revoke when the integration is removed.

## Troubleshooting

| Response | Meaning | Action |
| --- | --- | --- |
| `404 FEATURE_DISABLED` | Public API is not enabled. | Keep the integration off and contact the workspace owner. |
| `401 INVALID_API_KEY` | Key is missing, malformed, revoked, wrong product/purpose, or lacks scope. | Verify the server secret and rotate if uncertain. |
| `403 BROWSER_ACCESS_NOT_SUPPORTED` | The request came from a browser origin. | Move the request to a trusted backend. |
| `429 RATE_LIMIT_EXCEEDED` | Request limit reached. | Honor `Retry-After`; do not retry in a tight loop. |
| `503 RATE_LIMIT_UNAVAILABLE` | Admission provider unavailable. | Retry later; Answerlattice fails closed. |
| `canonical: false` | No approved applicable answer was found. | Clarify or escalate; do not invent an answer. |
| `409 IDEMPOTENCY_KEY_CONFLICT` | `externalId` and `Idempotency-Key` differ. | Send one key or make both values identical. |
| `409 IDEMPOTENCY_REPLAY_CONFLICT` | An idempotency key was reused with different signal content. | Use the original payload or a new unique key for a genuinely new event. |

Do not send secrets, passwords, tokens, payment data, or unnecessary ticket PII in signal metadata.

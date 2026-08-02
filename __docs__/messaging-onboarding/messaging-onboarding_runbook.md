# Messaging Onboarding — Operational Runbook

**Feature:** Messaging Onboarding  
**Status:** ACTIVE SOURCE RUNBOOK — provider processing remains disabled in checked-in targets
**Last Updated:** July 16, 2026

> **Launch boundary:** Not current launch certification or deploy approval. Current source registers WhatsApp only, while checked-in Functions environments keep provider processing disabled. `/whatsapp` is informational and routes its actions to the signed-in `/create-menu` photo or public-link intake. Execute provider operations only after the final owned account, real Meta secrets, webhook registration, explicit target enablement and scoped deploy approval are documented.

---

## Provider Stance

MenuList uses the official Meta WhatsApp Cloud API for messaging onboarding.

Do not replace this path with OpenWA, `whatsapp-web.js`, QR-scanned WhatsApp Web sessions, or browser automation. Those tools are useful as architecture references for dashboards and runbooks, not as the messaging provider for MenuList.

---

## Required Runtime Inputs

| Input | Storage | Notes |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Firebase Secret Manager | Required for outbound provider calls |
| `WHATSAPP_ACCESS_TOKEN` | Firebase Secret Manager | Required for Graph API calls |
| `WHATSAPP_APP_SECRET` | Firebase Secret Manager | Required for HMAC verification |
| `WHATSAPP_VERIFY_TOKEN` | Firebase Secret Manager | Required for Meta webhook registration |
| `ENABLE_MESSAGING_ONBOARDING` | Function runtime env | Checked-in MenuList Functions env files default `false`; set `true` only on a target with real provider credentials and webhook registration |
| `MESSAGING_ONBOARDING_PROVIDERS` | Function runtime env | Default `whatsapp` |
| `NEXT_PUBLIC_MSG_PREVIEW_BASE_URL` | Function runtime env | Required preview host; dev/staging uses `https://qa.menulist.digital`; production uses `https://menulist.ai` unless a later approved preview host changes it |

Do not create dummy WhatsApp secrets to satisfy deploy checks. Dummy secrets hide the real operational blocker and make provider behavior unreliable.

---

## Monitor

Use `/ops/messaging-onboarding`.

This screen shows:

- Latest messaging onboarding health snapshot
- HMAC invalid-signature count
- Inbound queue backlog
- Recent webhook events
- Recent sessions
- Messaging-specific alerts

Access is platform-only. Owners do not receive API keys or dashboard controls for this pipeline.

---

## Triage

| Signal | First Check | Likely Fix |
|---|---|---|
| Invalid HMAC > 0 | Meta app secret and webhook app configuration | Confirm `WHATSAPP_APP_SECRET` and webhook subscription |
| Inbound queue pending grows | Maintenance scheduler intake task and queue drain logs | Check `menulistMaintenanceScheduler` task `messaging_intake`, provider API health, Firestore index health |
| Inbound failed grows | Recent event errors | Check media type/size, provider download errors, session state transitions |
| Preview link send failed | Sessions with `previewMessagePending=true` | Check Meta send API health; `menulistMaintenanceScheduler` retries `messaging_intake` every 2 minutes |
| Preview link opens wrong domain | `NEXT_PUBLIC_MSG_PREVIEW_BASE_URL` on `msgExtractionWatcher` | Set it to the active preview host and redeploy the function |
| Message send failed grows | `WHATSAPP_PHONE_NUMBER_ID` and access token | Rotate real token or check Graph API response |
| Graph API returns `3xx` | Meta endpoint/account configuration and captured bounded status metadata | The adapter intentionally refuses redirects so bearer credentials are not forwarded. Correct the provider endpoint/configuration; do not enable redirect following. |
| Graph lookup/send aborts near 15 seconds, or media download near 30 seconds | Meta service health, DNS/egress, and bounded provider failure code | Treat as a provider/network incident and let the existing durable retry boundary handle it. Do not increase timeouts without measured provider evidence. |
| Meta Graph API returns OAuth `190` | Temporary `WHATSAPP_ACCESS_TOKEN` expired | Generate a fresh token in Meta Developer app, update the Firebase secret, and redeploy affected WhatsApp functions |
| Cost per publish high | Processing runs per session | Review duplicate uploads, low publish rate, and extraction retry behavior |
| No sessions after enabling | Webhook registration URL and function env | Confirm Meta webhook URL and `ENABLE_MESSAGING_ONBOARDING=true` |

---

## Safe Actions

| Action | Safe Scope |
|---|---|
| Mute alerts | Use Ops Control Room during deploy windows |
| Disable processing | Set runtime `ENABLE_MESSAGING_ONBOARDING=false` |
| Review recent sessions | Use `/ops/messaging-onboarding`; phone numbers are masked |
| Inspect raw docs | Platform/Firebase Console only when dashboard evidence is insufficient |

---

## Non-Actions

- Do not use WhatsApp Web automation for production owner onboarding.
- Do not enable bulk messaging from this pipeline.
- Do not expose provider access tokens or API keys to owners.
- Do not log raw provider payloads, full phone numbers, or access tokens.

---

_Document Status: ACTIVE RUNBOOK. May 17, 2026._

# Messaging Onboarding — Operational Runbook

**Feature:** Messaging Onboarding  
**Status:** ACTIVE RUNBOOK  
**Last Updated:** May 17, 2026

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
| `ENABLE_MESSAGING_ONBOARDING` | Function runtime env | Must stay false until real provider credentials exist |
| `MESSAGING_ONBOARDING_PROVIDERS` | Function runtime env | Default `whatsapp` |

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
| Inbound queue pending grows | Intake processor and queue drain logs | Check `msgIntakeProcessor`, provider API health, Firestore index health |
| Inbound failed grows | Recent event errors | Check media type/size, provider download errors, session state transitions |
| Preview link send failed | Sessions with `previewMessagePending=true` | Check Meta send API health; `msgIntakeProcessor` retries every 2 minutes |
| Message send failed grows | `WHATSAPP_PHONE_NUMBER_ID` and access token | Rotate real token or check Graph API response |
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

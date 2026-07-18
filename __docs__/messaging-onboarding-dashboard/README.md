# Messaging Onboarding Dashboard — Internal Monitoring

**Feature:** Internal founder-facing dashboard for monitoring the messaging onboarding pipeline
**Status:** IMPLEMENTED — Lean v1 using existing runtime telemetry
**Route:** `/ops/messaging-onboarding`
**Access:** signed `platformRole === "PLATFORM"`, fail-closed DATA_READ limit, then exact current persisted platform-user authorization
**Feature Flag:** `ENABLE_MESSAGING_ONBOARDING_DASHBOARD`
**Last Updated:** June 29, 2026

---

## Purpose

Founder-facing dashboard to answer three questions quickly:

1. Is messaging onboarding working right now?
2. Are webhook, queue, or provider failures increasing?
3. Is AI cost or retained source-file storage drifting?

This is not a customer analytics surface and not an owner-facing setting. It is an internal ops monitor for the official WhatsApp Cloud API onboarding path.

---

## Documents

| Document | Purpose |
|---|---|
| `README.md` | This file — current dashboard contract |
| `messaging-onboarding-dashboard_spec.md` | Product specification |
| `messaging-onboarding-dashboard_impl.md` | Technical implementation blueprint |
| `messaging-onboarding-dashboard_firebase.md` | Firebase cost tracking |

Related runbook: [`../messaging-onboarding/messaging-onboarding_runbook.md`](../messaging-onboarding/messaging-onboarding_runbook.md)

---

## Current Architecture

```
Meta WhatsApp Cloud API
        │
        ▼
messagingOnboarding/whatsapp webhook
        │ HMAC verification
        ▼
messagingOnboardingInboundMessages
        │ durable queue + dedup
        ▼
messagingOnboardingSessions + messagingOnboardingEvents
        │ hourly health snapshot
        ▼
systemHealth/messaging_onboarding_{YYYYMMDDHH}
systemAlerts
        │ protected Admin SDK API
        ▼
/ops/messaging-onboarding
```

The dashboard intentionally does not add OpenWA, `whatsapp-web.js`, QR-scanned sessions, or owner-managed API keys.

---

## Key Design Decisions

1. **Official provider only** — WhatsApp Cloud API remains the provider. WhatsApp Web automation is not adopted.
2. **No new aggregation collection** — Lean v1 reuses `systemHealth`, `systemAlerts`, `messagingOnboardingEvents`, `messagingOnboardingInboundMessages`, and `messagingOnboardingSessions`.
3. **Server-only reads** — The dashboard calls `/api/ops/messaging-onboarding`, protected with signed PLATFORM admission, a fail-closed limiter and `getCurrentPlatformUser()` before Admin reads.
4. **No owner API-key model** — OpenWA's API-key idea maps to our existing platform role gate. Messaging provider credentials stay in Firebase Secret Manager.
5. **Webhook observability from existing events** — Invalid HMAC, queue, processing, provider media, and send failures are surfaced from the existing event log.
6. **Manual refresh only** — No realtime listeners and no polling loop.
7. **Bounded browser response** — The monitor caps API response JSON at 256KB and validates the snapshot shape before updating UI state.

---

## Dashboard Sections

| Section | Purpose | Data Source |
|---|---|---|
| Provider & Access | Confirms Cloud API path and platform-only access | Static contract + API route auth |
| Pipeline Health | Sessions, publish rate, failures, AI cost, storage sample | `systemHealth` snapshot |
| Webhook Delivery | HMAC failures, queue events, replies, media/send failures | `messagingOnboardingEvents` |
| Inbound Queue | Pending, processing, failed queue backlog | `messagingOnboardingInboundMessages` count queries |
| Sessions By State | Active/problem session counts | `messagingOnboardingSessions` count queries |
| Recent Sessions | Last updated sessions without full phone exposure | `messagingOnboardingSessions` |
| Recent Events | PII-safe operational event timeline | `messagingOnboardingEvents` |
| Messaging Alerts | Existing alert feed filtered to this subsystem | `systemAlerts` |

---

## Implemented Files

| File | Purpose |
|---|---|
| `src/app/(main)/ops/messaging-onboarding/page.tsx` | Route shell |
| `src/app/api/ops/messaging-onboarding/route.ts` | Platform-only Admin SDK snapshot API |
| `src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx` | Dashboard UI |
| `src/lib/ops/messagingOnboardingTypes.ts` | Shared UI/API response types |
| `src/config/features.ts` | `ENABLE_MESSAGING_ONBOARDING_DASHBOARD` |
| `src/constants/database.ts` | `SYSTEM_HEALTH` collection constant |
| `firestore.rules` | Explicit client deny for `systemHealth` |

---

## What Was Rejected From OpenWA

| OpenWA idea | Decision |
|---|---|
| `whatsapp-web.js` gateway | Rejected. Not aligned with policy/compliance risk. |
| QR-scanned sessions | Rejected. Wrong operational model for SMB trust. |
| Bulk messaging | Rejected. Outside MenuList messaging onboarding scope. |
| API-key permission model | Not adopted as a user feature. Platform role gate is sufficient. |

---

_Document Status: IMPLEMENTED. June 29, 2026._

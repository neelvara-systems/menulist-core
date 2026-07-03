# Messaging Onboarding Dashboard — Product Specification

**Feature:** Internal Monitoring Dashboard for Messaging Onboarding Pipeline
**Status:** IMPLEMENTED — Lean v1
**Last Updated:** June 29, 2026

---

## Executive Summary

Internal ops dashboard for monitoring the messaging onboarding pipeline. Designed for founder operation: answer "is WhatsApp onboarding healthy?" quickly without opening Firebase Console across multiple collections.

This dashboard is platform-only and supports the official WhatsApp Cloud API path. It does not introduce OpenWA, WhatsApp Web automation, owner API keys, or bulk messaging.

---

## Goals

| Goal | Metric |
|---|---|
| Pipeline health visibility | Latest `systemHealth` status visible on load |
| Webhook safety visibility | Invalid HMAC and provider failure counters visible |
| Queue reliability visibility | Pending/processing/failed inbound queue counts visible |
| Cost control | AI cost per publish from health snapshot visible |
| Source retention control | Retained source-file sample visible |

---

## Route & Access

| Field | Value |
|---|---|
| Route | `/ops/messaging-onboarding` |
| API | `/api/ops/messaging-onboarding` |
| Access | `platformRole === "PLATFORM"` |
| Feature Flag | `ENABLE_MESSAGING_ONBOARDING_DASHBOARD` |
| Navigation | Ops Control Room button |

---

## Response Safety

- The browser monitor caps `/api/ops/messaging-onboarding` response JSON at 256KB.
- UI state updates only after the response matches the expected dashboard snapshot shape.
- Rejected, oversized, malformed, or invalid responses show fixed platform failure copy and emit bounded runtime diagnostics.

---

## Dashboard Layout

```
Provider + Access Contract
Pipeline Health
Webhook Delivery
Inbound Queue + Sessions By State
Recent Sessions
Recent Webhook Events
Messaging Alerts
```

---

## Section Requirements

### Provider + Access Contract

Show:

- Provider mode: Meta Cloud API
- Access model: platform role
- Owner API keys: not used

This keeps the OpenWA review outcome visible in the operational surface without creating a new owner-facing setting.

### Pipeline Health

Show from latest hourly `systemHealth` snapshot:

- Sessions started
- Published sessions
- Publish rate
- Processing runs
- Failed events
- Estimated cost per publish in INR
- Retained source-file sample size

### Webhook Delivery

Show 24h count-based webhook counters plus a small recent-event sample:

- Recent events shown
- Invalid HMAC signatures
- Inbound queued
- Inbound processed
- Inbound failed
- Replies sent
- Reply send failures
- Provider media download failures

### Inbound Queue

Show Admin SDK count queries:

- `PENDING`
- `PROCESSING`
- `FAILED`

### Sessions By State

Show count queries for active/problem states:

- `COLLECTING_INPUT`
- `VALIDATING_ASSETS`
- `AWAITING_MORE_UPLOADS`
- `PROCESSING_MENU`
- `PREVIEW_READY`
- `AWAITING_APPROVAL`
- `PUBLISHING`
- `FAILED`

### Recent Sessions

Show recent session rows with:

- Masked owner identifier
- State
- Upload count
- Processing runs
- Last update

### Recent Webhook Events

Show recent events with allowlisted metadata only. Do not expose raw provider payloads, full phone numbers, request IPs, provider access tokens, or storage URLs.

### Messaging Alerts

Show recent `systemAlerts` where `metadata.subsystem === "messaging_onboarding"`.

---

## Non-Goals

| Non-Goal | Reason |
|---|---|
| Real-time listener | Manual refresh is enough for platform-only ops use |
| New daily metrics collection | Existing hourly health snapshots are enough for current scale |
| Owner-facing API keys | Existing platform role gate is the right permission model |
| WhatsApp Web gateway | Not aligned with MenuList reliability/security posture |
| Bulk messaging analytics | Messaging onboarding is intake, not campaigns |

---

_Document Status: IMPLEMENTED. June 29, 2026._

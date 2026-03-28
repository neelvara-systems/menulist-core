# Messaging Onboarding Dashboard — Internal Monitoring

**Feature:** Internal founder-facing dashboard for monitoring the messaging onboarding pipeline
**Status:** DOCUMENTED — Ready for Implementation
**Route:** `/ops/messaging-onboarding` (platform-only access)
**Feature Flag:** `ENABLE_MESSAGING_ONBOARDING_DASHBOARD` (new, default: false)
**Last Updated:** March 12, 2026
**Source:** ChatGPT strategic analysis + Cascade codebase validation + hardening review

---

## Purpose

Founder-facing dashboard to answer three questions in 10 seconds:
1. **Is onboarding working right now?**
2. **Are failures increasing?**
3. **Is cost drifting?**

This dashboard does NOT provide analytics for customers. It is an **ops monitoring surface** for the solo founder to ensure the messaging onboarding pipeline runs reliably.

---

## Documents

| Document | Purpose |
|---|---|
| `README.md` | This file — index + architecture |
| `messaging-onboarding-dashboard_spec.md` | Full dashboard specification |
| `messaging-onboarding-dashboard_impl.md` | Technical implementation blueprint |
| `messaging-onboarding-dashboard_firebase.md` | Firebase cost tracking |

---

## Architecture Overview

```
Event Sources                    Aggregation              Dashboard
─────────────                    ───────────              ─────────
messagingOnboardingEvents  ──►  onDocumentCreated CF  ──►  messagingOnboardingMetrics/{date}
  (already exists, ~20/session)     (NEW: aggregateOnboardingMetrics)       │
                                                                             ▼
messagingOnboardingSessions ──►  checkStuckSessions  ──►  systemAlerts collection
  (active session queries)          (NEW: every 10 min)        │
                                                                ▼
                                 monitorOnboardingHealth  ──►  Dashboard UI
                                    (NEW: every 15 min)        /ops/messaging-onboarding
```

---

## Key Design Decisions

1. **Zero external analytics** — Uses Firestore event logs → daily aggregation → dashboard reads. No Mixpanel/Amplitude/BigQuery.
2. **Aggregation via Cloud Function trigger** — `onDocumentCreated` on existing `messagingOnboardingEvents` collection. No polling.
3. **One metrics doc per day** — `messagingOnboardingMetrics/{YYYY-MM-DD}`. Atomic increments via `FieldValue.increment(1)`.
4. **5 alerts only** — Minimal alerting: sessions=0/1h, preview_rate<40%, publish_failures>5/h, processing_time>5min, cost/publish>₹20.
5. **Existing data only** — All metrics derived from existing `messagingOnboardingEvents` collection. No new event logging needed.
6. **Platform-only access** — Same pattern as Scheduler Monitor (`/ops/scheduler`). Requires `platformRole === 'PLATFORM'`.

---

## Dashboard Sections (5)

| Section | Purpose | Data Source |
|---|---|---|
| **System Health** | Is the pipeline alive? | `messagingOnboardingMetrics/{today}` |
| **Onboarding Funnel** | Where users drop off | Same metrics doc (derived rates) |
| **Reliability** | Failures & stuck sessions | Metrics + active session query |
| **Cost & AI Usage** | Gemini cost control | Metrics (gemini calls, images) |
| **Growth Signals** | Is system self-propagating? | Metrics (acquisitionSource breakdown) |

Plus: **Alert Panel** (top), **Session Debug Tool** (bottom), **Cleanup Status** (footer).

---

## New Cloud Functions (3)

| Function | Trigger | Purpose |
|---|---|---|
| `aggregateOnboardingMetrics` | `onDocumentCreated(messagingOnboardingEvents)` | Increment daily metrics counters |
| `checkStuckSessions` | `onSchedule(every 10 minutes)` | Detect & recover stuck sessions |
| `monitorOnboardingHealth` | `onSchedule(every 15 minutes)` | Check thresholds, create alerts |

---

## New Collections (1)

| Collection | Purpose | Doc ID Format |
|---|---|---|
| `messagingOnboardingMetrics` | Daily aggregated counters | `YYYY-MM-DD` |

Alerts use existing `systemAlerts` collection (from ops monitoring system).

---

## Relationship to Existing Systems

- **Reuses:** `messagingOnboardingEvents` (already written by all CFs)
- **Reuses:** `messagingOnboardingSessions` (for active session queries)
- **Reuses:** `systemAlerts` collection (from ops monitoring)
- **Follows:** Same pattern as Scheduler Monitor (`/ops/scheduler`)
- **Follows:** Same platform-only access pattern

---

## Implementation Order

1. Create `messagingOnboardingMetrics` collection + aggregation CF
2. Create `checkStuckSessions` CF (stuck session recovery)
3. Create `monitorOnboardingHealth` CF (threshold alerts)
4. Build dashboard page (`/ops/messaging-onboarding`)
5. Wire to navigation (Ops Control Room)

---

_Document Status: DOCUMENTED — Ready for Implementation. March 12, 2026._

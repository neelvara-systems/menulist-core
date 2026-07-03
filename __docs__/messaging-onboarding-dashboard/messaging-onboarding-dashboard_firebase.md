# Messaging Onboarding Dashboard — Firebase Cost Tracking

**Feature:** Internal Monitoring Dashboard
**Status:** IMPLEMENTED — Lean v1
**Last Updated:** June 29, 2026

---

## Collections Used

| Collection | Operation | Frequency | Cost Impact |
|---|---|---|---|
| `systemHealth` | Read `messaging_onboarding_control.lastSnapshotId`, then read the latest hourly messaging snapshot directly | Per dashboard load | 2 reads max; platform-only |
| `systemAlerts` | Read recent alerts, filter subsystem in memory | Per dashboard load | 30 reads max |
| `messagingOnboardingEvents` | Count 24h webhook event types and read recent event sample | Per dashboard load | 7 count queries + 12 reads max |
| `messagingOnboardingInboundMessages` | Count by status | Per dashboard load | 3 count queries |
| `messagingOnboardingSessions` | Count by active/problem state | Per dashboard load | 8 count queries |
| `messagingOnboardingSessions` | Read recent sessions | Per dashboard load | 8 reads max |

No new write path is introduced.

---

## Monthly Cost Estimate

Assumption: founder opens dashboard 3 times/day.

| Component | Reads / count queries per load | Monthly usage | Estimated cost |
|---|---:|---:|---:|
| Health snapshots | 2 reads max | 180 reads | Low |
| Alerts | 30 reads max | 2,700 reads | Low |
| Webhook event counts + sample | 12 reads + 7 count queries | 1,080 reads + 630 count queries | Low; platform-only |
| Sessions | 8 reads + 8 count queries | 720 reads + 720 count queries | Low |
| Inbound queue | 3 count queries | 270 count queries | Low |

This route is intentionally manual-refresh and platform-only. Do not add auto-refresh without rechecking cumulative Firebase cost across all ops dashboards.

---

## Firestore Rules

Messaging onboarding collections remain server-only:

```javascript
match /messagingOnboardingSessions/{sessionId} {
  allow read, write: if false;
}

match /messagingOnboardingInboundMessages/{messageId} {
  allow read, write: if false;
}

match /messagingOnboardingRateLimits/{userHash} {
  allow read, write: if false;
}

match /messagingOnboardingEvents/{eventId} {
  allow read, write: if false;
}

match /systemHealth/{docId} {
  allow read, write: if false;
}
```

The dashboard reads these collections only through `/api/ops/messaging-onboarding`, which uses the Admin SDK, requires platform access, applies the shared `DATA_READ` gate before health, queue, session-state, webhook, recent-session, or alert reads, and stores only HMAC-hashed platform user key material in the limiter key. Route failures log `ops_messaging_onboarding_route_failed` through bounded Ops diagnostics with operator/request-path presence metadata only. The browser monitor uses no-store cache policy, same-origin credentials, and manual redirect handling, then caps the route response JSON at 256KB and validates the returned snapshot before rendering; this adds no Firestore reads/writes/deletes, rules, indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action.

---

## Deferred Aggregation

The earlier design proposed:

- `messagingOnboardingMetrics/{YYYY-MM-DD}`
- `aggregateOnboardingMetrics`
- dedicated dashboard DAL reads

Lean v1 does not need that yet. Existing hourly health snapshots, count aggregations, and a small recent-event sample provide enough operator visibility without adding a second telemetry pipeline.

---

_Document Status: IMPLEMENTED. June 29, 2026._

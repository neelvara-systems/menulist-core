# Messaging Onboarding Dashboard — Firebase Cost Tracking

**Feature:** Internal Monitoring Dashboard
**Status:** IMPLEMENTED — Lean v1
**Last Updated:** May 17, 2026

---

## Collections Used

| Collection | Operation | Frequency | Cost Impact |
|---|---|---|---|
| `systemHealth` | Query latest hourly messaging snapshot by document ID prefix | Per dashboard load | 1 read max; platform-only |
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
| Health snapshots | 1 read max | 90 reads | Low |
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

The dashboard reads these collections only through `/api/ops/messaging-onboarding`, which uses the Admin SDK and requires platform access.

---

## Deferred Aggregation

The earlier design proposed:

- `messagingOnboardingMetrics/{YYYY-MM-DD}`
- `aggregateOnboardingMetrics`
- dedicated dashboard DAL reads

Lean v1 does not need that yet. Existing hourly health snapshots, count aggregations, and a small recent-event sample provide enough operator visibility without adding a second telemetry pipeline.

---

_Document Status: IMPLEMENTED. May 17, 2026._

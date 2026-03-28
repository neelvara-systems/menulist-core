# Messaging Onboarding Dashboard — Firebase Cost Tracking

**Feature:** Internal Monitoring Dashboard
**Status:** DOCUMENTED
**Last Updated:** March 12, 2026

---

## Collections Used

| Collection | Operation | Frequency | Cost Impact |
|---|---|---|---|
| `messagingOnboardingMetrics` | Write (increment) | Per event (~20/session) | ₹3.00/month at 1K sessions |
| `messagingOnboardingMetrics` | Read | Per dashboard load | Negligible |
| `messagingOnboardingSessions` | Read | checkStuckSessions (every 10 min) | ₹0.22/month |
| `messagingOnboardingMetrics` | Read | monitorOnboardingHealth (every 15 min) | ₹0.14/month |
| `messagingOnboardingEvents` | Read | Session debug tool (on-demand) | Negligible |
| `systemAlerts` | Write | On alert trigger (rare) | Negligible |

---

## Cloud Function Costs

| Function | Trigger | Invocations/month | Avg Duration | Memory | Monthly Cost |
|---|---|---|---|---|---|
| `aggregateOnboardingMetrics` | onDocumentCreated | 20,000 | 1s | 256MB | ~₹2 |
| `checkStuckSessions` | every 10 min | 4,320 | 5s | 256MB | ~₹1 |
| `monitorOnboardingHealth` | every 15 min | 2,880 | 3s | 256MB | ~₹0.50 |

---

## Total Monthly Cost

| Component | Cost (₹) |
|---|---|
| Firestore reads | 0.41 |
| Firestore writes | 3.00 |
| Cloud Functions | 3.50 |
| **Total** | **~₹6.91/month** |

At 1,000 sessions/month. Scales linearly — 10K sessions ≈ ₹35/month.

---

## Firestore Rules

```javascript
// messagingOnboardingMetrics — Admin SDK only (Cloud Functions write, Dashboard reads via admin)
match /messagingOnboardingMetrics/{date} {
  allow read, write: if false;
}
```

Dashboard reads via server component or admin SDK API route.

---

## DAL Functions

| Function | Collection | Operation | Reads | Writes |
|---|---|---|---|---|
| `getOnboardingMetricsToday` | messagingOnboardingMetrics | 1 doc read | 1R | 0W |
| `getOnboardingMetricsRange` | messagingOnboardingMetrics | N doc reads | 7R (7 days) | 0W |
| `getActiveSessions` | messagingOnboardingSessions | Query | 1-50R | 0W |
| `getSessionTimeline` | messagingOnboardingEvents | Query | 1-20R | 0W |
| `incrementMetric` (CF) | messagingOnboardingMetrics | Atomic increment | 0R | 1W |

---

_Document Status: DOCUMENTED. March 12, 2026._

# Messaging Onboarding Dashboard — Implementation Blueprint

**Feature:** Internal Monitoring Dashboard for Messaging Onboarding Pipeline
**Status:** IMPLEMENTED — Lean v1
**Last Updated:** June 29, 2026

---

## 1. Runtime Boundary

The dashboard is an observation surface only. It does not process WhatsApp messages, mutate onboarding sessions, retry provider calls, or expose owner-facing controls.

```
/ops/messaging-onboarding
        │ client fetch
        ▼
/api/ops/messaging-onboarding
        │ withAuth(requiredPlatformRole: "PLATFORM")
        ▼
Admin SDK reads server-only collections
```

---

## 2. Data Sources

| Source | Usage |
|---|---|
| `systemHealth/messaging_onboarding_control` + latest snapshot doc | Latest hourly health/cost/source-retention snapshot, resolved by `lastSnapshotId` then one direct snapshot read |
| `systemAlerts` | Recent alerts where `metadata.subsystem === "messaging_onboarding"` |
| `messagingOnboardingEvents` | Recent webhook/event timeline and count-based 24h delivery counters |
| `messagingOnboardingInboundMessages` | Queue backlog counts by status |
| `messagingOnboardingSessions` | Active/problem state counts and recent sessions |

No `messagingOnboardingMetrics` collection is created in lean v1. The route uses count aggregations and small recent samples so the per-load read path stays bounded without a second telemetry pipeline.

---

## 3. API Route

**File:** `src/app/api/ops/messaging-onboarding/route.ts`
**Method:** `GET`
**Access:** `withAuth(..., { requiredPlatformRole: "PLATFORM" })`
**Cache:** `no-store`

Route failures use bounded Ops diagnostics (`ops_messaging_onboarding_route_failed`) with operator/request-path presence metadata only. Raw `buildSecurityContext()` output and raw `logger.error()` route context are not used for the snapshot catch path.

### Response Shape

```typescript
interface MessagingOnboardingOpsSnapshot {
  generatedAt: string;
  feature: {
    dashboardEnabled: boolean;
    providerMode: "official_cloud_api";
    accessModel: "platform_role";
  };
  health: MessagingOnboardingOpsHealth;
  webhookWindow: {
    hours: number;
    recentEventsShown: number;
    invalidSignatures: number;
    inboundQueued: number;
    inboundProcessed: number;
    inboundFailed: number;
    messageSent: number;
    messageSendFailed: number;
    providerMediaDownloadFailed: number;
  };
  inboundQueue: {
    pending: number;
    processing: number;
    failed: number;
  };
  sessionsByState: Record<string, number>;
  recentSessions: MessagingOnboardingOpsSession[];
  recentEvents: MessagingOnboardingOpsEvent[];
  recentAlerts: MessagingOnboardingOpsAlert[];
}
```

The browser monitor parses this response through a 256KB bounded JSON reader and validates the top-level feature, health, webhook-window, queue, session-state, recent-session, event, and alert shapes before updating UI state. Rejected, oversized, malformed, or invalid responses show fixed platform failure copy and log bounded `messaging_onboarding_monitor_response_*` diagnostics.

The browser monitor sends the dashboard request with no-store cache policy, same-origin credentials, and manual redirect handling before response parsing. Auth or API redirects are treated as failed monitor responses instead of being followed by the browser.

### PII Rules

- Full phone numbers are not returned.
- `providerDisplayId` is masked to last four digits.
- Event metadata is allowlisted; request IP and raw provider payloads are not returned.
- Messaging collections remain denied to client Firestore in `firestore.rules`.

---

## 4. UI

**File:** `src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx`

Sections:

1. Provider and access contract
2. Pipeline health
3. Webhook delivery
4. Inbound queue
5. Sessions by state
6. Recent sessions
7. Recent webhook events
8. Messaging alerts

The UI follows the existing Scheduler/Ops Control Room pattern: platform-only, manual refresh, dense cards, no charts in v1.

---

## 5. Security Model

| Concern | Implementation |
|---|---|
| Route protection | Signed `withAuth` PLATFORM admission, fail-closed DATA_READ limit, then exact current persisted platform-user check |
| Client collection access | `messagingOnboarding*` collections remain `allow read, write: if false` |
| Health collection access | `systemHealth` explicitly `allow read, write: if false` |
| Provider credentials | Firebase Secret Manager only |
| API keys | No owner-facing API keys; platform role is the permission model |
| HMAC visibility | Invalid signature events are counted and shown, not retried |

---

## 6. OpenWA-Inspired Items Adopted

| Item | Adopted Form |
|---|---|
| Webhook dashboard ideas | Platform-only dashboard for webhook/queue/session health |
| HMAC/webhook delivery observability | Invalid signature, queue, provider media, and send counters |
| API-key permission model inspiration | Rejected as a product feature; mapped to existing platform-role gate |
| Operational docs/runbook structure | Added messaging onboarding runbook and updated dashboard docs |

---

## 7. Files

| File | Status |
|---|---|
| `src/app/(main)/ops/messaging-onboarding/page.tsx` | New |
| `src/app/api/ops/messaging-onboarding/route.ts` | New |
| `src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx` | New |
| `src/lib/ops/messagingOnboardingTypes.ts` | New |
| `src/config/features.ts` | Updated |
| `src/constants/database.ts` | Updated |
| `firestore.rules` | Updated |
| `__docs__/messaging-onboarding/messaging-onboarding_runbook.md` | New |

---

_Document Status: IMPLEMENTED. June 29, 2026._

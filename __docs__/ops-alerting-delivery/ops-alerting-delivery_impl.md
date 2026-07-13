# Ops Alerting Delivery — Implementation Blueprint

**Status:** ✅ IMPLEMENTED — Ops alerts plus platform notification dashboard
**Created:** February 20, 2026  
**Last Updated:** July 13, 2026
**Audience:** Developers

---

## Architecture Overview

July 13 route audit: `/api/ops/safe-mode`, `/api/ops/mute-alerts`, and `/api/ops/platform-notifications` retain signed platform admission and now require one exact current-user authorization read after a fail-closed HMAC-keyed limiter. Platform notification GET uses a bounded newest-first `systemAlerts` scan (maximum 150) for both rows and recent counts; it no longer runs five collection-wide aggregation queries. The API omits stored operator identity from the browser DTO and keeps unsafe stored metadata as presence/length summaries. SAFE_MODE transitions are transactional/idempotent, and a secondary alert-write failure is logged without turning a committed toggle into a false failure response.

Replay follow-up: acknowledgement skips its update when the selected alert is already acknowledged. Manual handoff and manual-alert actions require a bounded action ID created when the operator opens the action surface. Handoff persists the action-ID hash and skips an identical repeat; manual alert creation uses a deterministic document ID with atomic Firestore `create`, returning the existing alert ID before any delivery work when the action is replayed.

```
createAlert() [EXISTING in alerts.ts]
  └─→ Write alert to systemAlerts collection [EXISTING]
  └─→ Check deploy mute window
  └─→ sendTelegramAlert(alert)
      ├─ Check ENABLE_OPS_ALERTS flag
      ├─ Validate TELEGRAM_BOT_TOKEN shape
      ├─ URL-encode bot-token path segment
      ├─ Format message (severity + title + details)
      └─ HTTP POST to Telegram Bot API
  └─→ sendPlatformAlertDelivery(alert)
      ├─ Classify alert by metadata.platformTriggerType or registry fallback
      ├─ Send email when trigger defaults include email
      └─ Send WhatsApp template/text when trigger defaults include whatsapp_web
```

## Current Platform Notification Layer

Platform notifications are internal founder/operator alerts, separate from owner notifications and customer-facing messages.

### Trigger Registry

`src/data/shared/platformNotificationRegistry.ts` defines the platform-owner trigger catalog:

- Cost: SAFE_MODE activated/deactivated and GCP budget alerts.
- Public output: public menu, OBP, and publish verification failures.
- Schedulers: scheduler failure, missing dead-man signals, and unresolved critical alerts.
- Payments: webhook failures and payment/subscription state mismatches.
- Owner notification delivery: owner notification failure plus email/WhatsApp provider failures.
- Security: critical tenant isolation, auth, webhook signature, or abuse events.
- AI/extraction: AI cost runaway, accounting failure, extraction spikes, stuck jobs, and WhatsApp onboarding queue stalls.
- POS: repeated sync or connector delivery failure.
- Answerlattice: widget/runtime failure, critical coverage gaps, and integration delivery failure.
- Manual/system: manual platform alerts and unclassified legacy alerts.

The file is mirrored to `functions/src/sharedData/platformNotificationRegistry.ts` for future Cloud Functions emitters. App-side emitters can already attach `metadata.platformTriggerType`, `metadata.productId`, and `metadata.category` through `src/lib/ops/alerts.ts`.

### Dashboard

`/ops/platform-notifications` is platform-role only and uses `src/app/api/ops/platform-notifications/route.ts`.

June 30 follow-up: route-side query validation, rate-limit, and action-validation security logs use bounded route metadata instead of raw session/request context. Invalid attempted action text is summarized as presence/length metadata.

Capabilities:

- Manual refresh, no realtime listener.
- POST actions keep the platform-role gate, apply a per-operator limiter with HMAC-hashed key material, and reject bodies above 8KB before alert reads, writes, or manual handoff work.
- Filters by active/acknowledged/all, severity, and trigger type.
- Detail drawer for runbook, channels, metadata preview, scope, and status.
- Acknowledge button writes `acknowledged`, `acknowledgedAt`, and `acknowledgedBy`.
- Browser responses are capped at 256KB and validated before UI state or action success copy changes. Load responses must match the feature/filter/count/event/registry/cost snapshot shape, and action responses must return `ok: true` with a supported action and fixed message text.
- Browser requests use no-store cache policy, same-origin credentials, and manual redirect handling before response validation. Auth or API redirects are handled as failed monitor responses instead of being followed by the browser.
- Email and WhatsApp Web buttons open a prefilled message for manual sending. WhatsApp Web opens check the returned browser window and log `platform_notification_monitor_whatsapp_open_failed` with bounded destination/message/link presence-length metadata only when the browser blocks or rejects the handoff. Message copy feedback waits for Clipboard API success or an acknowledged textarea fallback; failed copy diagnostics include clipboard/fallback support booleans and bounded destination, subject, body, channel, status, severity, trigger, and selected-event metadata only.
- Record Manual marks `actionTaken` and stores masked handoff metadata on the alert document.
- Manual Alert can create a classified alert for operator-created incidents.

### SAFE_MODE Wiring

`POST /api/ops/safe-mode` now writes a classified platform notification after successful SAFE_MODE activation or deactivation:

- `SAFE_MODE_ACTIVATED` is critical, product `PLATFORM`, category `cost`.
- `SAFE_MODE_DEACTIVATED` is warning, product `PLATFORM`, category `cost`.

The route is rate limited with HMAC-hashed operator key material, rejects bodies above 2KB before validation or writes, and remains protected by `withAuth(..., { requiredPlatformRole: 'PLATFORM' })`. Its security events use bounded route metadata, and activation reason text is summarized as presence/length in security logs. `POST /api/ops/mute-alerts` follows the same platform-role, bounded security-log context, and hashed per-operator limiter boundary with a 1KB body cap before the mute-window write.

## Automatic Platform Email/WhatsApp Delivery

Platform-owner delivery now runs from both alert helpers:

- App-side alerts use `src/lib/ops/platformNotificationDelivery.ts`.
- Cloud Functions alerts use `functions/src/monitoring/platformNotificationDelivery.ts`.
- Both helpers resolve trigger metadata from `metadata.platformTriggerType`, `metadata.productId`, and `metadata.category`.
- Unknown legacy alerts stay visible in `systemAlerts` but are not automatically sent to Email/WhatsApp.
- `metadata.platformDeliverySuppressed: true` keeps low-value events, such as scheduler heartbeats, out of automatic delivery while preserving the alert record when needed.
- Email/WhatsApp delivery stays best-effort and non-blocking, but failed/skipped provider results and thrown delivery exceptions are no longer silent. The helpers log `ops_platform_alert_email_delivery_failed` or `ops_platform_alert_whatsapp_delivery_failed` with bounded alert, tenant, store, trigger, product, channel-error, and skipped-reason presence/length metadata only.
- Cloud Functions platform WhatsApp delivery treats non-2xx Meta Graph responses as `whatsapp_send_failed` and logs the bounded status code without reading or storing the provider response body.

Required runtime configuration:

| Purpose | Variable |
|---------|----------|
| Platform email recipient | `PLATFORM_ALERT_EMAIL_TO` or `INTERNAL_NOTIFICATION_EMAIL` |
| Platform WhatsApp recipient | `PLATFORM_ALERT_WHATSAPP_TO` or `INTERNAL_NOTIFICATION_WHATSAPP` |
| WhatsApp template delivery | `PLATFORM_ALERT_WHATSAPP_TEMPLATE_NAME` and optional `PLATFORM_ALERT_WHATSAPP_TEMPLATE_LANGUAGE` |
| Session text fallback | `PLATFORM_ALERT_WHATSAPP_SESSION_ACTIVE=true` |
| SMTP provider | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| WhatsApp provider | Existing WhatsApp secrets in `SECRET_GROUPS.WHATSAPP_OUTBOUND` |

Feature flags:

- App: `ENABLE_PLATFORM_ALERT_EMAIL`, `ENABLE_PLATFORM_ALERT_WHATSAPP`.
- Functions: `ENABLE_PLATFORM_ALERT_EMAIL`, `ENABLE_PLATFORM_ALERT_WHATSAPP`.

Deployment note: `functions/src/config/secrets.ts` keeps `SECRET_GROUPS.PLATFORM_ALERT_DELIVERY` limited to deploy-safe WhatsApp secrets until Telegram/SMTP Secret Manager values exist in `menulist-qa`. Functions Email delivery is implemented and runtime-gated, but it requires the SMTP secrets to be created and added to the platform delivery secret group before production Functions can send email automatically.

Before production launch, complete [Step 7B in the Launch Prerequisites guide](../production-readiness/launch-prerequisites.md#step-7b-platform-alert-emailwhatsapp-go-live-checklist-10-minutes): set the missing Secret Manager values, platform recipient envs, WhatsApp template/session config, redeploy the affected Functions, and verify dashboard, Email, WhatsApp, and manual fallback delivery.

## Telegram Bot API URL Guard

App-side alerts in `src/lib/ops/alerts.ts` and Cloud Functions alerts in `functions/src/monitoring/telegramAlert.ts` keep the fixed `https://api.telegram.org` provider host, but no longer interpolate the raw `TELEGRAM_BOT_TOKEN` into the request path. Both helpers trim the configured chat ID, validate the bot token against the expected Telegram `digits:token` shape, and build `/bot.../sendMessage` with `encodeURIComponent(normalizedToken)`. App-side Telegram sends use manual redirect handling and log bounded `ops_alert_telegram_delivery_failed` diagnostics for non-2xx provider responses, including 3xx redirects, without blocking alert creation.

If the token is missing or malformed, Telegram delivery is skipped and only bounded setup diagnostics are logged. The alert write, mute check, platform email/WhatsApp delivery, fire-and-forget behavior, provider payload shape, and owner/customer surfaces are unchanged.

## Direct Trigger Wiring

The registry is wired into the main platform alert emitters so the dashboard and automatic delivery no longer depend only on title/message heuristics:

- SAFE_MODE activation/deactivation.
- Razorpay payment/subscription failures and webhook processing failures.
- SMTP/email provider failures.
- Owner notification delivery failures.
- Publish verification failures.
- Extraction stuck jobs and extraction failure spikes.
- WhatsApp onboarding health failures and AI cost warnings.
- MenuList maintenance scheduler failures and unresolved critical alert escalation.
- Decision Blocks scheduler failure runs, with successful hourly heartbeats suppressed from automatic delivery.
- GCP budget webhook alerts.

Alert-rule evaluation keeps the existing fail-open behavior for monitoring callers. Individual rule condition failures are logged with bounded tenant/store context. When a rule condition triggers but `createAlert()` later rejects, `evaluateAlertRules()` now logs `[Alerts] Rule alert creation failed` with failed/triggered counts, the first failed rule ID, and bounded source error metadata instead of discarding the `Promise.allSettled()` result.

## Telegram Bot Setup (Prerequisites)

1. Create Telegram bot via @BotFather → get `TELEGRAM_BOT_TOKEN`
2. Create private channel/group for alerts
3. Add bot to channel → get `TELEGRAM_CHAT_ID`
4. Store both as Firebase Functions secrets in QA first:
   ```bash
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist-qa
   firebase functions:secrets:set TELEGRAM_CHAT_ID --project menulist-qa
   ```
   Production values require QA alert-delivery evidence and explicit production secret approval before repeating the same commands with `--project menulist`.

## File Structure

```
functions/src/
├── monitoring/
│   ├── alerts.ts                  # MODIFY — Wire sendTelegramAlert into createAlert()
│   ├── telegramAlert.ts           # NEW — Telegram delivery utility
│   └── deployMute.ts              # NEW — Deploy mute window logic
└── index.ts                       # No changes needed (alerts.ts already imported)
```

## New File: `functions/src/monitoring/telegramAlert.ts`

```typescript
/**
 * Telegram Alert Delivery
 *
 * Simple HTTP POST to Telegram Bot API.
 * No Telegram library needed — just fetch().
 *
 * @see __docs__/ops-alerting-delivery/
 */

import { defineSecret } from "firebase-functions/params";

const telegramBotToken = defineSecret("TELEGRAM_BOT_TOKEN");
const telegramChatId = defineSecret("TELEGRAM_CHAT_ID");

interface AlertPayload {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

const SEVERITY_EMOJI = {
  info: "ℹ️",
  warning: "⚠️",
  critical: "🚨",
};

/**
 * Send alert to Telegram channel.
 * Fire-and-forget — failure does NOT block alert creation.
 */
export async function sendTelegramAlert(alert: AlertPayload): Promise<void> {
  const token = telegramBotToken.value();
  const chatId = telegramChatId.value();

  if (!token || !chatId) {
    console.warn(
      "[Telegram] Bot token or chat ID not configured. Skipping alert delivery.",
    );
    return;
  }

  const emoji = SEVERITY_EMOJI[alert.severity] || "ℹ️";
  const text = formatAlertMessage(emoji, alert);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000), // 10s timeout
      },
    );

    if (!response.ok) {
      console.error(
        "[Telegram] Failed to send alert:",
        response.status,
        await response.text(),
      );
    }
  } catch (error) {
    // Fire-and-forget — log but don't throw
    console.error("[Telegram] Error sending alert:", error);
  }
}

function formatAlertMessage(emoji: string, alert: AlertPayload): string {
  const lines = [
    `${emoji} <b>[${alert.severity.toUpperCase()}] ${alert.title}</b>`,
    "",
    alert.message,
  ];

  if (alert.metadata) {
    lines.push("");
    if (alert.metadata.storeId) lines.push(`Store: ${alert.metadata.storeId}`);
    if (alert.metadata.failureCode)
      lines.push(`Code: ${alert.metadata.failureCode}`);
    if (alert.metadata.consecutiveFailures)
      lines.push(`Consecutive: ${alert.metadata.consecutiveFailures}`);
  }

  lines.push("");
  lines.push(`Time: ${new Date().toISOString()}`);

  return lines.join("\n");
}
```

## New File: `functions/src/monitoring/deployMute.ts`

```typescript
/**
 * Deploy Mute Window
 *
 * Suppresses alerts during deployments to prevent false alarms.
 * Uses ops_config/system Firestore doc.
 *
 * @see __docs__/ops-alerting-delivery/
 */

import { Timestamp } from "firebase-admin/firestore";
import { firestoreAdmin as db } from "../firebaseAdmin";

const OPS_CONFIG_DOC = "ops_config/system";

/**
 * Check if alerts are currently muted (deploy window active).
 */
export async function isAlertsMuted(): Promise<boolean> {
  try {
    const doc = await db.doc(OPS_CONFIG_DOC).get();
    if (!doc.exists) return false;

    const data = doc.data();
    const mutedUntil = data?.alertsMutedUntil;

    if (!mutedUntil) return false;

    // Check if mute window has expired
    const now = Timestamp.now();
    return mutedUntil.toMillis() > now.toMillis();
  } catch (error) {
    console.error("[DeployMute] Error checking mute status:", error);
    return false; // On error, allow alerts (fail open)
  }
}

/**
 * Mute alerts for a specified duration (called before deploys).
 * @param durationMinutes - How long to mute (default: 20 min)
 */
export async function muteAlerts(durationMinutes: number = 20): Promise<void> {
  const mutedUntil = Timestamp.fromMillis(
    Date.now() + durationMinutes * 60 * 1000,
  );

  await db
    .doc(OPS_CONFIG_DOC)
    .set({ alertsMutedUntil: mutedUntil }, { merge: true });
}
```

## Modification to `functions/src/monitoring/alerts.ts`

Wire delivery into the existing `createAlert()` function:

```typescript
// Add to createAlert() function, after writing to Firestore:

// Import at top of file
import { sendTelegramAlert } from "./telegramAlert";
import { isAlertsMuted } from "./deployMute";

// Inside createAlert(), after the Firestore write succeeds:
// Send Telegram notification (fire-and-forget)
if (FEATURE_FLAGS.ENABLE_OPS_ALERTS) {
  const muted = await isAlertsMuted();
  if (!muted) {
    sendTelegramAlert({
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
    }).catch((err) => console.error("[Alerts] Telegram delivery failed:", err));
  }
}
```

## Alert Types (Start with 4)

Per ChatGPT review decision: Start with 4 critical types, expand later.

| Type                 | Trigger                                  | Severity         | Source                        |
| -------------------- | ---------------------------------------- | ---------------- | ----------------------------- |
| Menu Publish Failure | verifyPublish() detects failure          | critical/warning | menu-health-monitor           |
| Function Crash Loop  | Same function crashes >10 times in 5 min | critical         | Sentry (manual check for now) |
| SAFE_MODE Activated  | Cost protection triggers SAFE_MODE       | critical         | cost-self-protection          |
| Manual Alert         | Admin triggers from ops dashboard        | varies           | ops-control-room              |

## Implementation Phases

### Phase 1: Telegram Delivery (est. 1-2 hours)

| Task                    | File                                        | Description                              |
| ----------------------- | ------------------------------------------- | ---------------------------------------- |
| Create telegramAlert.ts | `functions/src/monitoring/telegramAlert.ts` | HTTP POST utility                        |
| Create deployMute.ts    | `functions/src/monitoring/deployMute.ts`    | Mute window logic                        |
| Wire into createAlert() | `functions/src/monitoring/alerts.ts`        | Call sendTelegramAlert                   |
| Add feature flag        | `src/config/features.ts`                    | `ENABLE_OPS_ALERTS: false`               |
| Add secrets             | Firebase Functions secrets                  | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

### Phase 2: Testing (est. 30 min)

| Task                 | Description                                           |
| -------------------- | ----------------------------------------------------- |
| Create Telegram bot  | @BotFather → get token                                |
| Create alert channel | Private channel → get chat ID                         |
| Test alert delivery  | Manually call createAlert() → verify Telegram message |
| Test mute window     | Mute → create alert → verify suppressed               |

## Security Checklist

- [x] Telegram tokens stored as Firebase Functions secrets (not hardcoded)
- [x] Alert messages don't include sensitive data (no passwords, tokens, PII)
- [x] Fire-and-forget delivery (failure doesn't block alert creation)
- [x] Deploy mute window prevents false alarms
- [x] Feature flag gated

## ADRs

### ADR-1: Why Telegram, not email/Slack/FCM?

**Decision:** Telegram as primary alert channel.  
**Reason:**

- Free, instant push notifications to phone
- No email setup/deliverability issues
- Solo founder — single channel sufficient
- Simple HTTP POST — no library dependency
- Can add email/Slack later if team grows

### ADR-2: Why NOT build a custom ops_runtime_events collection?

**Decision:** Use existing Sentry for error tracking, Telegram for alerts.  
**Reason:** Sentry already captures all errors with full context, stack traces, and user identification. Building a parallel Firestore event collection duplicates this at Firebase cost. The alert framework (`systemAlerts` collection) is sufficient for actionable alerts.

---

**Implementation Status:** ✅ IMPLEMENTED (verified Feb 24, 2026)

**Codebase Evidence:**

- `src/lib/ops/alerts.ts` — Alert sending logic (Telegram integration)
- `src/app/api/ops/mute-alerts/route.ts` — Alert mute/unmute API
- `src/database/ops/index.ts` — `systemAlerts` collection DAL
- `src/lib/ops/types.ts` — Alert type definitions
- `src/components/templates/main-app/platform/opsControlRoom/index.tsx` — Alert UI in Ops Control Room
- `src/constants/internalRecipients.ts` — Recipient config
- `src/lib/messaging/index.ts` — Messaging infrastructure

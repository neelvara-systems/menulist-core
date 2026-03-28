# Ops Alerting Delivery — Implementation Blueprint

**Status:** ✅ IMPLEMENTED — Feature flag OFF by default  
**Created:** February 20, 2026  
**Last Updated:** February 20, 2026  
**Audience:** Developers

---

## Architecture Overview

```
createAlert() [EXISTING in alerts.ts]
  └─→ Write alert to systemAlerts collection [EXISTING]
  └─→ NEW: sendTelegramAlert(alert)
      ├─ Check ENABLE_OPS_ALERTS flag
      ├─ Check deploy mute window
      ├─ Format message (severity + title + details)
      └─ HTTP POST to Telegram Bot API
```

## Telegram Bot Setup (Prerequisites)

1. Create Telegram bot via @BotFather → get `TELEGRAM_BOT_TOKEN`
2. Create private channel/group for alerts
3. Add bot to channel → get `TELEGRAM_CHAT_ID`
4. Store both as Firebase Functions secrets:
   ```bash
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
   firebase functions:secrets:set TELEGRAM_CHAT_ID
   ```

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

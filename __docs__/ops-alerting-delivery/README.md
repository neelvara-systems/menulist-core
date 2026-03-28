# Ops Alerting Delivery

**Status:** ✅ IMPLEMENTED — Feature flag OFF by default  
**Feature Flag:** `ENABLE_OPS_ALERTS: false`  
**Priority:** 🔴 P0 — Build before launch  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review

---

## Quick Navigation

| Document                                                                             | Audience     | Purpose                                   |
| ------------------------------------------------------------------------------------ | ------------ | ----------------------------------------- |
| [ops-alerting-delivery_impl.md](./ops-alerting-delivery_impl.md)                     | Developers   | Technical blueprint, Telegram integration |
| [ops-alerting-delivery_firebase.md](./ops-alerting-delivery_firebase.md)             | Cost Control | Firebase cost estimates                   |
| [ops-alerting-delivery_mobile-support.md](./ops-alerting-delivery_mobile-support.md) | Mobile       | Admission test (BACKEND ONLY)             |

---

## One-Liner

Delivers system alerts via Telegram to the founder's phone when critical failures occur (publish failures, menu down, function crashes).

## Architecture Overview (60-second summary)

```
Existing alert framework (functions/src/monitoring/alerts.ts)
  └─→ createAlert() — already writes to systemAlerts collection
      └─→ NEW: sendTelegramAlert() — HTTP POST to Telegram Bot API
          └─→ Founder receives push notification on phone
```

**Key Insight:** The alert rules, cooldown logic, and severity classification already exist in `functions/src/monitoring/alerts.ts`. What's missing is the **delivery mechanism** — the code that actually sends the alert somewhere. Currently there are `// TODO: Send notification` comments.

## What Already Exists

| Component             | Status     | Location                             |
| --------------------- | ---------- | ------------------------------------ |
| Alert rules (5 types) | ✅ BUILT   | `functions/src/monitoring/alerts.ts` |
| Alert cooldown logic  | ✅ BUILT   | `checkCooldown()` in alerts.ts       |
| Alert creation        | ✅ BUILT   | `createAlert()` in alerts.ts         |
| Alert acknowledgment  | ✅ BUILT   | `acknowledgeAlert()` in alerts.ts    |
| **Alert delivery**    | ❌ MISSING | `// TODO: Send notification`         |

## What We're Building

1. Telegram Bot API integration (simple HTTP POST)
2. Deploy mute window (suppress alerts during deploys)
3. Wire `createAlert()` to call `sendTelegramAlert()`

## Key Files

| File                                        | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `functions/src/monitoring/telegramAlert.ts` | NEW — Telegram delivery utility           |
| `functions/src/monitoring/alerts.ts`        | MODIFY — Wire delivery into createAlert() |

## Feature Flag

```typescript
ENABLE_OPS_ALERTS: false; // in src/config/features.ts
```

## Dependencies

- Telegram Bot Token (env variable: `TELEGRAM_BOT_TOKEN`)
- Telegram Chat ID (env variable: `TELEGRAM_CHAT_ID`)
- Existing alert framework in `functions/src/monitoring/alerts.ts`

---

**Version History:**

| Version | Date              | Changes                                   |
| ------- | ----------------- | ----------------------------------------- |
| 1.0     | February 20, 2026 | Initial documentation from ChatGPT review |

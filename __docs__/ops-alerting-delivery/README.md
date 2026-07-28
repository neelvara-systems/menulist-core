# Ops Alerting Delivery

**Status:** ✅ IMPLEMENTED — Provider configuration/live smoke still required
**Feature Flag:** `ENABLE_OPS_ALERTS: true` in current app source
**Priority:** 🔴 P0 — Verify configured delivery before launch
**Created:** February 20, 2026  
**Last Updated:** July 28, 2026
**Source:** ChatGPT launch infra review → Cascade critical review

---

## Quick Navigation

| Document                                                                             | Audience     | Purpose                                   |
| ------------------------------------------------------------------------------------ | ------------ | ----------------------------------------- |
| [ops-alerting-delivery_impl.md](./ops-alerting-delivery_impl.md)                     | Developers   | Technical blueprint, Telegram integration |
| [ops-alerting-delivery_firebase.md](./ops-alerting-delivery_firebase.md)             | Cost Control | Firebase cost estimates                   |
| [ops-alerting-delivery_mobile-support.md](./ops-alerting-delivery_mobile-support.md) | Mobile       | Alert delivery plus current platform-mobile control boundary |

July 13 ops-boundary audit: SAFE_MODE, deploy-mute, and platform-notification APIs now re-prove current persisted platform authority after fail-closed per-operator limits. Platform alert monitor rows/counts come from one bounded recent window, and repeated SAFE_MODE state requests do not create duplicate config/alert writes.

The clean-room replay follow-up also makes acknowledgement no-write when already acknowledged and requires stable action IDs for manual handoff/manual alert creation. An identical manual-alert request resolves to the deterministic existing `systemAlerts` document and does not repeat external delivery.

July 28 alert-contract audit: Cloud Functions alert creation now claims one deterministic rolling-cooldown bucket transactionally, including the previous bucket at the time boundary. Concurrent/retried emitters therefore create and deliver at most one identical alert in the configured trigger window. Every current app/Functions writer stores the canonical alert shape plus a 90-day `expiresAt`; critical system errors use that same writer instead of a partial legacy document.

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

**Key Insight:** Trigger classification and cooldowns are owned by the byte-identical platform-notification registry. Functions atomically claim cooldown identity before writing and delivery; the app helper accepts deterministic document IDs for replay-sensitive API actions.

## What Already Exists

| Component             | Status     | Location                             |
| --------------------- | ---------- | ------------------------------------ |
| Trigger classification | ✅ BUILT | Shared platform-notification registry |
| Alert cooldown logic | ✅ BUILT | Transactional current/previous bucket claim in `alerts.ts` |
| Alert creation | ✅ BUILT | App and Functions alert helpers |
| Alert acknowledgment | ✅ BUILT | Platform notification ops route/helper |
| Alert delivery | ✅ BUILT / configuration-gated | Telegram plus configured platform email/WhatsApp delivery helpers |

## Current Runtime

1. Telegram Bot API delivery is wired through validated fixed endpoints.
2. Deploy mute uses `ops_config/system.alertsMutedUntil`.
3. Classified platform alerts can use dashboard, Telegram, email, and WhatsApp channels when their flags/secrets are configured.

## Key Files

| File                                        | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `functions/src/monitoring/telegramAlert.ts` | Telegram delivery utility |
| `functions/src/monitoring/alerts.ts` | Functions alert creation and delivery |
| `src/lib/ops/alerts.ts` | Next.js alert creation and delivery |
| `src/app/api/ops/platform-notifications/route.ts` | Current-authorized bounded monitor/recovery API |

## Feature Flag

```typescript
ENABLE_OPS_ALERTS: true; // current app source; delivery still requires provider configuration
```

## Dependencies

- Telegram Bot Token (env variable: `TELEGRAM_BOT_TOKEN`)
- Telegram Chat ID (env variable: `TELEGRAM_CHAT_ID`)
- Existing alert framework in `functions/src/monitoring/alerts.ts`

---

**Version History:**

| Version | Date              | Changes                                   |
| ------- | ----------------- | ----------------------------------------- |
| 1.1     | July 13, 2026     | Reconciled implemented delivery state and documented current authorization, bounded monitor counts, and idempotent SAFE_MODE interaction |
| 1.0     | February 20, 2026 | Initial documentation from ChatGPT review |

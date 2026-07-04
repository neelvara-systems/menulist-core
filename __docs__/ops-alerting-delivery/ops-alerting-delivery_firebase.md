# Ops Alerting Delivery — Firebase Cost Analysis

**Created:** February 20, 2026
**Last Updated:** June 30, 2026

---

## Cost Model

### Per Alert Sent

| Operation | Count | Cost |
|-----------|-------|------|
| Read ops_config/system (mute check) | 1 | ~₹0.003 |
| Telegram HTTP POST | 0 Firestore cost | ₹0 |
| Platform email delivery | 0 Firestore cost | Provider cost only |
| Platform WhatsApp delivery | 0 Firestore cost | Provider/conversation cost only |
| **Total per alert delivery** | | **~₹0.003** |

Note: The alert creation itself (writing to `systemAlerts` collection) is already accounted for in the existing alert framework. Email/WhatsApp delivery uses existing provider integrations and does not create an extra Firestore collection or retry queue.

Deployment note: WhatsApp outbound secrets are currently included in `SECRET_GROUPS.PLATFORM_ALERT_DELIVERY`. SMTP and Telegram stay runtime-gated until their Secret Manager values are created in `menulist-qa`; adding them to the function `secrets:` option before the values exist blocks Firebase deploy validation.

### Platform Notification Dashboard

`/ops/platform-notifications` reuses `systemAlerts` and does not add a new collection.

| Operation | Count | When |
|-----------|-------|------|
| Recent alert query | Up to 150 document reads | Manual refresh only |
| Count aggregations | 5 count queries | Manual refresh only |
| Direct alert read | 1 document read | Only when opening one detail row |
| Acknowledge | 1 document write | Operator action |
| Record manual handoff | 1 document write | Operator action |
| Create manual alert | 1 alert write + mute-check read when alert delivery is enabled | Operator action |

Dashboard filters are applied over the bounded recent-alert window to avoid composite indexes and avoid unbounded scans. The dashboard does not open realtime listeners.

The browser monitor caps `/api/ops/platform-notifications` load and action response JSON at 256KB and validates the returned snapshot/action envelope before updating UI state. This adds no Firestore reads/writes/deletes, provider calls, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action.

The June 30 platform notification Ops security-log boundary cleanup adds no Firestore reads/writes/deletes, provider calls, API routes, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action. `/api/ops/platform-notifications` query validation, action rate-limit, and action-validation security events now use bounded route metadata, and invalid attempted action text is summarized as presence/length metadata.

The June 30 platform notification message-copy acknowledgement is browser-local only. It adds no Firestore reads/writes/deletes, provider calls, API routes, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action. Prefilled Email/WhatsApp message copy feedback waits for Clipboard API success or acknowledged textarea fallback success, and failed copy diagnostics record only bounded support metadata.

The June 30 platform notification dashboard request-boundary hardening is browser-local only. It adds no Firestore reads/writes/deletes, provider calls, API routes, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action. Existing load/action response caps stay unchanged; browser requests now use no-store cache policy, same-origin credentials, and manual redirect handling before response validation.

### SAFE_MODE Alert Emission

`POST /api/ops/safe-mode` writes both `ops_config/system` and a classified `systemAlerts` record after a successful toggle. Classified platform alerts can also fan out to platform email and WhatsApp when the trigger registry includes those default channels and recipient envs are configured.

| Operation | Count | Notes |
|-----------|-------|-------|
| `ops_config/system` write | 1 | SAFE_MODE state |
| `systemAlerts` write | 1 | Platform notification event |
| `ops_config/system` read | 1 | Alert mute check when alert delivery is enabled |

SAFE_MODE toggles are rare emergency actions and are platform-role protected plus rate limited.

### Monthly Estimates

| Scenario | Alerts/month | Monthly Cost |
|----------|-------------|-------------|
| Stable system (few failures) | 5-10 | ~₹0.03 + provider cost |
| Early launch (some issues) | 30-50 | ~₹0.15 + provider cost |
| Worst case (many failures) | 200 | ~₹0.60 + provider cost |

**Verdict:** Firebase cost stays essentially free. Telegram API is free; Email/WhatsApp use external provider pricing. The only added Firebase read is the existing mute check per delivered alert.

---

## Collections Affected

| Collection | Operation | Frequency |
|------------|-----------|-----------|
| `systemAlerts` | Read | Platform notification dashboard manual refresh/detail |
| `systemAlerts` | Write | Alert creation, acknowledgement, manual handoff |
| `ops_config/system` | Read (mute check) | Per alert |
| `ops_config/system` | Write (mute activation) | Before deploys only |

**No new collections created.** Uses existing `systemAlerts` (from alerts.ts) + `ops_config/system` doc for mute window and SAFE_MODE state.

---

## External API Cost

| Service | Cost | Notes |
|---------|------|-------|
| Telegram Bot API | FREE | No limits for bot messages to private channels |
| Slack webhook | 0 Firestore cost | Daily chat aggregation and dormant negative-feedback alerts use the configured legacy Slack webhook only when present |
| SMTP email | Provider cost | Requires SMTP Secret Manager values before Functions can send automatically |
| WhatsApp Cloud API | Provider/conversation cost | Sends approved template by default; text fallback only when an active session is configured |

---

## Cost Safety

- Feature flag: `ENABLE_OPS_ALERTS` — instant alert fan-out disable for ops alert paths
- Feature flags: `ENABLE_PLATFORM_ALERT_EMAIL` and `ENABLE_PLATFORM_ALERT_WHATSAPP` — channel-specific disable
- Alert cooldown in existing framework prevents spam
- Deploy mute window prevents false alarm writes
- SAFE_MODE, mute-alerts, and platform notification action APIs keep platform-role gates and store only HMAC-hashed operator key material in rate-limit keys. SAFE_MODE and mute-alerts security events use bounded route metadata instead of raw session/request context, and SAFE_MODE reason text is summarized as presence/length in security logs. This changes no Firestore read/write count and adds no rules, indexes, provider calls, Cloud Function logic, or deploy requirement.
- Fire-and-forget delivery — Telegram, Email, and WhatsApp failures do not cause retries
- Platform Email/WhatsApp failure diagnostics log bounded channel failure codes and presence/length context only. This adds no Firestore reads/writes, no retry queue, no provider payload changes, and no new collections; the Functions helper change requires a scoped Firebase Functions deploy after validation.
- Alert-rule creation failure diagnostics inspect existing `createAlert()` promise results and log bounded failed/triggered counts only. This adds no Firestore reads/writes/deletes, retry queue, provider calls, alert schema fields, rules, or indexes; the Functions helper change requires a scoped Firebase Functions deploy after validation.
- `metadata.platformDeliverySuppressed` prevents low-value scheduler heartbeat events from sending Email/WhatsApp
- Telegram alert delivery validates the configured bot-token shape and URL-encodes the bot-token path segment before calling the fixed Telegram Bot API endpoint. This adds no Firestore reads/writes, new provider calls, retry queue, alert collection changes, or new secrets; invalid Telegram token configuration skips only Telegram delivery with bounded diagnostics. The Functions source change requires a scoped Firebase Functions deploy after validation.
- App-side Telegram alert delivery uses manual redirect handling and logs bounded non-2xx provider status diagnostics. This adds no Firestore reads/writes, new provider calls, retry queue, alert collection changes, Cloud Function logic, Firebase deploy requirement, or Firebase deploy action. No Vercel deploy was run.
- Platform WhatsApp delivery URL-encodes the configured phone-number ID before the existing Meta Graph `/messages` request. This adds no Firebase reads/writes, provider calls, new retry queue, or alert collection changes, but the Functions source change requires a scoped Firebase Functions deploy after validation.
- Configured Slack webhook delivery validates the webhook URL with the shared Functions public HTTPS/DNS target guard before outbound fetch. This adds one DNS lookup when Slack is configured, no Firestore reads/writes, no retry queue, and no provider payload changes, but the Functions source change requires a scoped Firebase Functions deploy after validation.

Historical June 28-29, 2026 deploy attempts for the Telegram bot-token guard, Meta endpoint-ID encoding, Slack webhook target validation, platform Email/WhatsApp failure diagnostics, and alert-rule creation diagnostics reached Firebase predeploy lint/build and then failed before upload because Firebase could not read `menulist-qa` project metadata through Cloud Resource Manager: HTTP 403, caller does not have permission.

Do not reuse the older command shapes from those historical attempts. Current ops-alerting retry evidence must start with `npm run verify:functions-deploy-preflight`, then use the scoped MenuList QA platform-alert command from the launch prerequisites:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring,functions:verifyMenuPublish,functions:forceRepublish,functions:gcpBudgetAlertWebhook,functions:messagingOnboarding,functions:msgExtractionWatcher --non-interactive
```

Production deploys require QA evidence and explicit production deploy approval.

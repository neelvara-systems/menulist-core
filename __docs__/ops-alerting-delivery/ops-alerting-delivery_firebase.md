# Ops Alerting Delivery — Firebase Cost Analysis

**Created:** February 20, 2026
**Last Updated:** June 2, 2026

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

Deployment note: WhatsApp outbound secrets are currently included in `SECRET_GROUPS.PLATFORM_ALERT_DELIVERY`. SMTP and Telegram stay runtime-gated until their Secret Manager values are created in `ecomsai`; adding them to the function `secrets:` option before the values exist blocks Firebase deploy validation.

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
| SMTP email | Provider cost | Requires SMTP Secret Manager values before Functions can send automatically |
| WhatsApp Cloud API | Provider/conversation cost | Sends approved template by default; text fallback only when an active session is configured |

---

## Cost Safety

- Feature flag: `ENABLE_OPS_ALERTS` — instant alert fan-out disable for ops alert paths
- Feature flags: `ENABLE_PLATFORM_ALERT_EMAIL` and `ENABLE_PLATFORM_ALERT_WHATSAPP` — channel-specific disable
- Alert cooldown in existing framework prevents spam
- Deploy mute window prevents false alarm writes
- Fire-and-forget delivery — Telegram, Email, and WhatsApp failures do not cause retries
- `metadata.platformDeliverySuppressed` prevents low-value scheduler heartbeat events from sending Email/WhatsApp

# Ops Alerting Delivery — Firebase Cost Analysis

**Created:** February 20, 2026

---

## Cost Model

### Per Alert Sent

| Operation | Count | Cost |
|-----------|-------|------|
| Read ops_config/system (mute check) | 1 | ~₹0.003 |
| Telegram HTTP POST | 0 Firestore cost | ₹0 |
| **Total per alert delivery** | | **~₹0.003** |

Note: The alert creation itself (writing to `systemAlerts` collection) is already accounted for in the existing alert framework. This feature only adds the delivery mechanism.

### Monthly Estimates

| Scenario | Alerts/month | Monthly Cost |
|----------|-------------|-------------|
| Stable system (few failures) | 5-10 | ~₹0.03 |
| Early launch (some issues) | 30-50 | ~₹0.15 |
| Worst case (many failures) | 200 | ~₹0.60 |

**Verdict:** Essentially free. Telegram API is free. Only cost is 1 Firestore read per alert for mute check.

---

## Collections Affected

| Collection | Operation | Frequency |
|------------|-----------|-----------|
| `ops_config/system` | Read (mute check) | Per alert |
| `ops_config/system` | Write (mute activation) | Before deploys only |

**No new collections created.** Uses existing `systemAlerts` (from alerts.ts) + new `ops_config/system` doc for mute window.

---

## External API Cost

| Service | Cost | Notes |
|---------|------|-------|
| Telegram Bot API | FREE | No limits for bot messages to private channels |

---

## Cost Safety

- Feature flag: `ENABLE_OPS_ALERTS` — instant disable
- Alert cooldown in existing framework prevents spam
- Deploy mute window prevents false alarm writes
- Fire-and-forget delivery — Telegram failure doesn't cause retries

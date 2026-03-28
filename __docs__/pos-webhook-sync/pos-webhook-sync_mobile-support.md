# POS Webhook Sync — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ DESKTOP-ONLY — Feature-flagged backend sync, no operational mobile UI needed

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | POS sync is automatic after setup |
| **Speed** | ❌ FAIL | Webhook URL configuration is a setup task |
| **Touch** | ❌ FAIL | URL input and testing needs precision |
| **Value** | ❌ FAIL | Integration setup done at desk |

**Decision:** Desktop-only. POS sync triggers automatically on menu data changes. Mobile edits (via `updateProject`) trigger `triggerPosSyncDebounced` server-side — no separate mobile UI needed.

# GBP Sync — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ DESKTOP-ONLY — Feature-flagged backend sync, no operational mobile UI needed

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | GBP sync is automatic (server-side), no daily owner action |
| **Speed** | ❌ FAIL | Configuration is multi-step OAuth + mapping |
| **Touch** | ❌ FAIL | Google account linking needs full browser flow |
| **Value** | ❌ FAIL | Setup done once at desk |

**Decision:** Desktop-only. GBP sync runs server-side after initial setup. Menu data changes from mobile propagate to GBP automatically.

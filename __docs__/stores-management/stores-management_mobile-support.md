# Stores Management — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ DESKTOP-ONLY — Internal admin tool for platform operators

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | Store creation is rare (new chain setup) |
| **Speed** | ❌ FAIL | Multi-step admin flow |
| **Touch** | ❌ FAIL | Form-heavy admin interface |
| **Value** | ❌ FAIL | Admin work done at desk |

**Decision:** Desktop-only. This is an internal platform admin tool restricted to `ECOMSAI_PLATFORM_USER_ROLE`. Regular owners never see this. Store settings that owners DO manage (name, address, hours) are available via MobileBasicSettingsScreen, MobilePublicInfoScreen, and MobileHoursScreen.

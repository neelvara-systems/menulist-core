# Stores Management — Mobile Support

**Last Updated:** June 11, 2026
**Decision:** ❌ DESKTOP-ONLY — Internal admin tool for platform operators

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | Store creation is rare (new chain setup) |
| **Speed** | ❌ FAIL | Multi-step admin flow |
| **Touch** | ❌ FAIL | Form-heavy admin interface |
| **Value** | ❌ FAIL | Admin work done at desk |

**Decision:** Desktop-only for platform store CRUD. This is an internal platform admin tool restricted to `ECOMSAI_PLATFORM_USER_ROLE`. Regular owners never see platform store creation/edit tables.

Owner-managed store settings have mobile parity through the mobile PWA shell:

- Basic business profile: `MobileBasicSettingsScreen`
- Public address and map coordinates: `MobilePublicInfoScreen`
- Official Business Page fields/media/actions: `MobileOfficialPageScreen`
- Business attributes: `MobileBusinessAttributesScreen`
- Customer app/PWA settings: `MobileCustomerAppScreen`
- Domain and subdomain settings: `MobileDomainSettingsScreen` / `MobileSubdomainScreen`
- Locale, timezone, and business-day cutoff: `MobileLocaleSettingsScreen`
- Working hours and temporary status: `MobileHoursScreen`, `MobileWorkingHoursEditScreen`, `MobileTempStatusScreen`
- Time-slot presets: `MobileTimeSlotsScreen`
- SEO/analytics/verification: `MobileSeoAnalyticsScreen`

These owner mobile screens reuse the same `updateStore()`, `/api/domain`, `/api/store/temp-status`, `updateTimeSlotPresets()`, `updatePresetInAllCategories()`, and `removePresetFromAllCategories()` write paths as desktop, so public cache invalidation and category time-window cleanup stay aligned.

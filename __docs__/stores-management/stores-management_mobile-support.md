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

- Basic business profile, public address, and map coordinates: `MobileBasicSettingsScreen`
- Official Business Page fields/media/actions: `MobileOfficialPageScreen`
- Business attributes: `MobileBusinessAttributesScreen`
- Customer app/PWA settings: `MobileCustomerAppScreen`
- Domain and subdomain settings: `MobileDomainSettingsScreen`
- Locale, timezone, and business-day cutoff: `MobileLocaleSettingsScreen`
- Working hours and temporary status: `MobileHoursScreen`, `MobileWorkingHoursEditScreen`, `MobileTempStatusScreen`
- Time-slot presets: `MobileTimeSlotsScreen`
- SEO/analytics/verification: `MobileSeoAnalyticsScreen`

These owner mobile screens reuse the same `updateStore()`, `/api/domain`, `/api/store/temp-status`, `updateTimeSlotPresets()`, `updatePresetInAllCategories()`, and `removePresetFromAllCategories()` write paths as desktop, so public cache invalidation and category time-window cleanup stay aligned.

Domain Settings failure boundary: `MobileDomainSettingsScreen` uses fixed owner-facing failure copy and bounded store diagnostics for status/check/save/add/remove paths plus browser-local custom-domain copy/open and DNS-record copy failures. It must not log raw domains, DNS values, generated public URLs, provider messages, or browser exception text.

Brand Settings failure boundary: `MobileBasicSettingsScreen` keeps optimistic local updates for brand/profile changes, but failed `updateStore()` or `updateTenant()` saves must log `mobile_basic_settings_save_failed` through bounded mobile owner diagnostics before restoring local state. Owner-facing failure copy stays fixed.

Advanced Settings failure boundary: `MobileAdvancedSettingsScreen` saves social profile links and feedback collection defaults through `updateStore()`. Failed saves must log `mobile_advanced_settings_save_failed` with bounded update-shape metadata before showing fixed owner-facing copy.

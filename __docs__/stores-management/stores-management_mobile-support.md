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

Brand Settings is partitioned by exact tenant/store. `MobileBasicSettingsScreen` remounts drafts on scope change, admits one save, guards optimistic context and rollback by both identifiers plus exact attempt ownership, and discards obsolete logo preparation or completion effects. A failed store write restores only attempt-owned fields. If the store write succeeds but the later tenant-name mirror fails, the screen keeps acknowledged store truth, logs `mobile_basic_settings_tenant_sync_failed`, reports the partial result truthfully, and leaves only brand-name synchronization dirty for retry.

Business Attributes also remounts by exact tenant/store and admits one save. Global context changes only after `updateStore()` acknowledgement and only while the same scope still owns the prior attribute leaves; `publicPresence.customAttributes` merges over current same-store siblings. Failed saves leave global context untouched.

Advanced Settings is partitioned by exact tenant/store/mode. `MobileAdvancedSettingsScreen` remounts its social-profile and feedback-default drafts on a scope change, admits one save synchronously, captures the source scope for `updateStore()`, and settles only unchanged source leaves into the same current tenant/store. A delayed acknowledgement cannot replace another store or a newer same-store social/feedback update. Failed saves log `mobile_advanced_settings_save_failed` with bounded update-shape metadata before fixed owner-facing copy; obsolete mounts suppress copy and loading settlement.

# SEO/AEO Discovery Infrastructure — Mobile Support

**Date:** February 16, 2026  
**Status:** Informational SEO settings card is live on desktop and mobile
**Last Updated:** June 29, 2026

---

## Mobile Surface Update

The AEO infrastructure itself remains automatic and owner-config-free, but the product now includes a read-only explanation card inside SEO Settings so owners can see that this layer is already active.

- Desktop SEO Settings includes the AEO explanation card
- Mobile SEO Settings includes the same AEO explanation card
- No AEO controls, toggles, or dashboards were added
- Public-page schema enrichment still runs automatically at render time

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Result |
|------|----------|--------|--------|
| Frequency | Daily or multiple times/day? | No — schema is auto-generated at render time. Zero owner interaction. | ❌ FAIL |
| Speed | Completes in <5 seconds? | N/A — no user action | ❌ FAIL |
| Touch | Works with thumb-only? | N/A — no UI | ❌ FAIL |
| Value | Needed away from desk? | No — schema enrichment is invisible infrastructure | ❌ FAIL |

**Result: The infrastructure is still automatic, but the explanation is now visible in both desktop and mobile SEO settings.**

---

## Rationale

SEO/AEO Discovery Infrastructure is **invisible infrastructure** — it enriches schema.org structured data on public pages (OBP + menu) at render time. There is:

- No owner-facing configuration UI for AEO itself
- No settings to configure (geo/priceRange are set via Business Settings, which already has mobile support)
- No dashboards or analytics
- No user interaction with the infrastructure itself

The schema enrichment runs on server-rendered public pages that customers view on any device. The SEO Settings card is informational only, and exists so the end user knows this infrastructure is already in place.

## Mobile SEO Settings Failure Boundary

`MobileSeoAnalyticsScreen` also owns the phone surface for public search metadata, canonical URL, localized SEO copy, owner analytics IDs, and analytics tracking preferences. These settings continue to save through the shared `updateStore()` path.

Failed mobile SEO or analytics saves must log bounded diagnostics before showing fixed owner-facing copy:

- `mobile_seo_analytics_field_save_failed` for field-level saves, with field/value-shape metadata only.
- `mobile_analytics_settings_save_failed` for full analytics saves, with external-ID presence/length, enabled-tracking counts, previous-analytics presence, and changed-field booleans.
- `mobile_seo_settings_save_failed` for full SEO saves, with canonical URL presence/length, selected-language presence/length, managed/localized language counts, previous-state presence, and changed-field booleans.

Do not log raw SEO copy, canonical URLs, analytics IDs, Search Console values, Pixel IDs, provider responses, or exception text.

---

**Last Updated:** June 29, 2026

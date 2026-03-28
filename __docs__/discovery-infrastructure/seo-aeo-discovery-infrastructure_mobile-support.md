# SEO/AEO Discovery Infrastructure — Mobile Support

**Date:** February 16, 2026  
**Status:** Desktop Only (by design)

---

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Result |
|------|----------|--------|--------|
| Frequency | Daily or multiple times/day? | No — schema is auto-generated at render time. Zero owner interaction. | ❌ FAIL |
| Speed | Completes in <5 seconds? | N/A — no user action | ❌ FAIL |
| Touch | Works with thumb-only? | N/A — no UI | ❌ FAIL |
| Value | Needed away from desk? | No — schema enrichment is invisible infrastructure | ❌ FAIL |

**Result: 0/4 — Desktop only (no mobile UI needed)**

---

## Rationale

SEO/AEO Discovery Infrastructure is **invisible infrastructure** — it enriches schema.org structured data on public pages (OBP + menu) at render time. There is:

- No owner-facing UI
- No settings to configure (geo/priceRange are set via Business Settings, which already has mobile support)
- No dashboards or analytics
- No user interaction of any kind

The schema enrichment runs on server-rendered public pages that customers view on any device. The implementation itself has zero mobile surface.

---

**Last Updated:** February 16, 2026

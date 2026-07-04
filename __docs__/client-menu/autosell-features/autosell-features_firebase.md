# AutoSell Features — Firebase Cost Tracking

**Feature:** Automatic Menu Behaviors (Live Indicator, Availability State, Time-Based Categories)
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** February 7, 2026
**Priority:** LOW — Zero incremental Firebase cost. All features use existing data.

---

## Current Launch Boundary

This Firebase cost document is customer-facing menu-output cost evidence; it is not current production certification. Current AutoSell/public-menu launch approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, physical/mobile browser QA, public cache/deploy evidence, and target production smoke.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (existing), `stores` (existing)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **$0.00** — All AutoSell features read from existing project/store data

---

## AutoSell Features & Their Firebase Impact

### 1. Live Indicator ("🟢 Live · updated just now")
- **Data Source:** `project.modifiedOn` timestamp (already in project doc)
- **Firebase Cost:** $0 — reads existing field from already-loaded project doc

### 2. Availability State (sold-out items fade after public menu refresh)
- **Data Source:** `item.available` boolean (already in project doc)
- **Firebase Cost:** $0 — reads existing field from already-loaded project doc

### 3. Time-Based Categories (show/hide by time of day)
- **Data Source:** `category.timeSlot` config (already in project doc)
- **Firebase Cost:** $0 — client-side time comparison, no Firestore reads

---

## Cost Estimate

**$0.00/month** — All AutoSell features are client-side behaviors using data already loaded for menu rendering. Zero incremental Firebase operations.

# AutoSell Features — Firebase Cost Tracking

**Feature:** Automatic Menu Behaviors (Live Indicator, Instant Availability, Time-Based Categories)  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** LOW — Zero incremental Firebase cost. All features use existing data.

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

### 2. Instant Availability (sold-out items fade)
- **Data Source:** `item.available` boolean (already in project doc)
- **Firebase Cost:** $0 — reads existing field from already-loaded project doc

### 3. Time-Based Categories (show/hide by time of day)
- **Data Source:** `category.timeSlot` config (already in project doc)
- **Firebase Cost:** $0 — client-side time comparison, no Firestore reads

---

## Cost Estimate

**$0.00/month** — All AutoSell features are client-side behaviors using data already loaded for menu rendering. Zero incremental Firebase operations.

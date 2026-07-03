# Menu Quality Signals — Firebase Cost Tracking

> **Version:** 1.2
> **Last Updated:** June 29, 2026

---

## Collections Affected

| Collection                         | Operation                   | When                                                                      | Cost       |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------- | ---------- |
| `projects/{tId}/{sId}/{projectId}` | READ (1 per dashboard load) | Desktop: `getProjectData()` to fetch extractedData for signal computation | **~$0.00** |
| (mobile)                           | READ (0 additional)         | Mobile: reuses project data already fetched by MobileMenuScreen           | **$0.00**  |

## New Fields

None. Reads existing `extractedData` from the project document.

## New Collections

None.

## Cost Estimate

| Scenario                           | Additional Reads | Additional Writes | Monthly Cost |
| ---------------------------------- | ---------------- | ----------------- | ------------ |
| 100 owners, 1 dashboard load/day   | 3,000/month      | 0                 | **~$0.0018** |
| 1,000 owners, 1 dashboard load/day | 30,000/month     | 0                 | **~$0.018**  |

**Total incremental cost: negligible** at any scale.

## Cost Details

- **Desktop:** 1 additional `getProjectData()` read when the dashboard overview mounts the Menu Quality panel. The `useOwnerDashboard` hook fetches analytics data but not the project document itself.
- **Mobile:** Zero additional reads — MobileMenuScreen already fetches the full project via `getProjectData()`, and the quality signals component receives `menuData.files` as a prop.
- **Action routing:** Dashboard-to-editor handoff uses browser `sessionStorage`. No Firestore writes, listeners, indexes, Storage operations, API routes, or Cloud Functions.
- **Dashboard diagnostics:** Failed dashboard project load/signal computation and failed browser `sessionStorage` handoff log bounded project/signal metadata only. No Firestore reads/writes/deletes are added beyond the already-counted dashboard project read attempt.
- **Editor banner routing:** Reuses already-loaded editor project data and the existing editor action router. No extra Firestore read or write.
- **Publish-intercept diagnostics:** `menu_editor_quality_signals_publish_intercept_failed` logs only bounded project/count metadata when the publish intercept cannot compute signals. No Firestore reads/writes/deletes, Storage operations, API routes, Cloud Functions, cache invalidations, rules, indexes, or schema fields are added.
- **Computation:** Pure client-side.

## Firestore Indexes

None needed. No new queries.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026

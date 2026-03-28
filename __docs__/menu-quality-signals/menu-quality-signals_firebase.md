# Menu Quality Signals — Firebase Cost Tracking

> **Version:** 1.0
> **Last Updated:** March 15, 2026

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

- **Desktop:** 1 additional `getProjectData()` read per dashboard load. The `useOwnerDashboard` hook fetches analytics data but not the project document itself.
- **Mobile:** Zero additional reads — MobileMenuScreen already fetches the full project via `getProjectData()`, and the quality signals component receives `menuData.files` as a prop.
- **Computation:** Pure client-side. No Firestore writes. No Cloud Functions.

## Firestore Indexes

None needed. No new queries.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026

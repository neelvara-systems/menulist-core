# Menu Quality Signals — Mobile Support Assessment

> **Version:** 1.1
> **Last Updated:** June 1, 2026

---

## Mobile Relevance Decision: **PARTIAL**

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily or multiple times per day? | Weekly at most | ✗ Fail |
| **Speed** | Completes in <5 seconds? | View signals = instant, but acting on them (generate descriptions/images) is desktop-class work | ⚠ Borderline |
| **Touch** | Works with thumb-only? | Viewing signals = yes. Generating content = needs editor | ⚠ Borderline |
| **Value** | Needed away from desk? | Viewing is useful anywhere. Acting requires editor access. | ⚠ Borderline |

**Result:** SUPPORTED — Show the Menu Check panel on mobile. Repairable issues open the existing mobile Repair Menu sheet, and manual issues filter the mobile item list. The signal computation itself is lightweight and works on mobile.

## Mobile Implementation

- **Screen:** Menu Check panel in MobileMenuScreen
- **Component:** `src/components/mobile/components/MenuQualitySignals.tsx`
- **UI Library:** antd-mobile `Collapse` + `List`
- **Primary action:** One button appears before the issue list.
  - Repairable issues open `BulkActionsSheet` with `action="aiRepair"`.
  - Manual issues apply mobile filters such as missing price, missing photo, hidden item, translation missing, category icon missing, or unusual price.
- **False positive handling:** Price outliers can be marked reviewed on mobile. The reviewed price is stored on the item `qualityReview` metadata and no longer counts as an outlier while the price is unchanged.

## Localization

Inherits from desktop — same `next-intl`, RTL support.

## Auth

Same NextAuth session, same RBAC.

---

**Created:** March 15, 2026
**Updated:** June 1, 2026 — mobile Menu Check now routes to Repair Menu and issue filters

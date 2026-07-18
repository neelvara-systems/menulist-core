# Menu Trust Signals — Implementation Plan

> **Version:** 2.1
> **Last Updated:** July 16, 2026
> **Audience:** Developers

---

## 1. Architecture Overview

Menu Trust Signals is a pure render component in the existing customer-menu client bundle. It displays four factual signals using the store/project payload already loaded by the public route. It adds zero reads and zero API routes.

```
Public route payload → customer menu renderer
  ↓
storeDetails (area, city, workingHours, timeZone, businessType)
+ rawProjectData.lastPublishedAt
  ↓
TrustSignals.tsx
  ├── getLocationText(area, city)
  ├── getStoreStatus(workingHours, timeZone) — from @lib/hours
  ├── getOfferingLabels(businessType, businessCategory).offeringTitle
  └── getFreshnessText(lastPublishedAt)
  ↓
Rendered in the bottom menu metadata section
```

---

## 2. File Structure

```
src/components/atoms/
└── TrustSignals.tsx             # Factual public metadata + freshness boundary

src/components/templates/main-app/projects/b2cView/menuPage/
└── menuPageNew.tsx              # Current customer-menu placement

src/config/features.ts           # Modified — ENABLE_MENU_TRUST_SIGNALS flag
```

> **Note:** Component lives in `@atoms/` instead of `[[...slug]]/` because TypeScript cannot resolve relative imports inside bracket-named Next.js route directories.

---

## 3. Signal Computation

### 3.1 Location

```typescript
function getLocationText(
  area?: string | null,
  city?: string | null,
): string | null {
  if (area && city && area !== city) return `${area}, ${city}`;
  if (area) return area;
  if (city) return city;
  return null;
}
```

### 3.2 Operational Status

Uses existing `getStoreStatus()` from `@lib/hours` — pure function, SSR-safe.

```typescript
const status =
  workingHours && Object.keys(workingHours).length > 0
    ? getStoreStatus(workingHours, timeZone)
    : null;
```

### 3.3 Offering Label

```typescript
const offeringLabel = getOfferingLabels(businessType, businessCategory).offeringTitle;
// "Menu" | "Services" | "Catalog" | "Programs" | "Offerings"
```

### 3.4 Freshness (Exact Dates)

```typescript
function getTrustSignalFreshnessText(lastPublishedAt: any): string | null {
  const date = normalizeDate(lastPublishedAt);
  if (!date || isMateriallyFuture(date, now)) return null;

  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Updated today";
  if (diffDays <= 30) return `Updated ${month} ${day}`; // e.g., "Updated Mar 12"
  return null; // Stale — hide
}
```

---

## 4. Component API

```typescript
interface TrustSignalsProps {
    businessType: string;
    lastPublishedAt: any;
    locationArea?: string | null;
    city?: string | null;
    workingHours?: Record<string, string>;
    timeZone?: string;
}

// Usage in page.tsx:
{FEATURE_FLAGS.ENABLE_MENU_TRUST_SIGNALS && (
    <TrustSignals
        businessType={storeDetails?.businessType || ''}
        lastPublishedAt={rawProjectData?.lastPublishedAt || null}
        locationArea={storeDetails?.area || null}
        city={storeDetails?.city || null}
        workingHours={storeDetails?.workingHours}
        timeZone={storeDetails?.timeZone}
    />
)}
```

---

## 5. Render Layout

Two-row centered layout:

```
Row 1: Location · Status (green/red)
Row 2: Offering Label · Freshness Date
```

Example output:

```
Bandra West · Open · Closes at 11:00 PM
Restaurant Menu · Updated Mar 17
```

Styling: 11px, slate-500 (#64748b), system-ui font, flexbox centered, no icons, no badges.

---

## 6. Degradation Rules

| Missing Data       | Behavior                   |
| ------------------ | -------------------------- |
| No area/city       | Location line hidden       |
| No workingHours    | Status hidden              |
| No lastPublishedAt | Freshness hidden           |
| Stale >30 days     | Freshness hidden           |
| All missing        | Offering label alone shows |

---

## 7. Security

- **No auth required** — customer-facing public page
- **No new reads** — uses data already supplied to the customer renderer
- **No PII** — only displays area, city, hours status, business type, publish date
- **No new network work** — the existing client bundle performs pure local computation

---

## 8. Testing Guide

1. Set `ENABLE_MENU_TRUST_SIGNALS: true`
2. Open a published menu as a customer
3. See location + open/closed status on first line
4. See offering label + "Updated Mar 17" or "Updated today" on second line
5. Check a menu not published for >30 days → freshness hidden
6. Check business with no working hours → status hidden
7. Check business with no area/city → location hidden
8. Check a salon → see "Services" instead of "Menu"
9. Check responsive: works on mobile/tablet/desktop (flexbox wrap)
10. Set flag to `false` → trust signals hidden

---

## 9. v2 Changes (March 17, 2026 — ChatGPT Feedback)

| v1                                       | v2                                  | Reason                                                               |
| ---------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Badge-style official wording             | "Restaurant Menu" label             | Self-declared authority is weak; neutral labels feel factual         |
| Vague freshness wording                  | "Updated Mar 12" (exact date)       | Specific dates feel like evidence, vague phrases feel like marketing |
| No location                              | `area, city` displayed              | Location anchors page to real physical business                      |
| No status                                | Open/Closed from `getStoreStatus()` | Real-time status communicates living system                          |
| Checkmark SVG icon                       | No icon                             | Icons make it feel like a badge/promotion                            |

---

**Document Signature:** Technical Implementation Plan v2.0
**Created:** March 15, 2026
**Updated:** July 16, 2026

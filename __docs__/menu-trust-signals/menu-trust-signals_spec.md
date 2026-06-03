# Menu Trust Signals — Spec

> **Version:** 2.0
> **Last Updated:** March 17, 2026
> **Audience:** CEO, PM, Business stakeholders

---

## 1. Executive Summary

**What:** Factual trust indicators on the customer-facing digital menu/service/catalog page: location, operational status (Open/Closed), offering type, and freshness date. Evidence of truth, not badges.

**Why:** When customers scan a QR code and see a digital page, they subconsciously judge whether it's reliable. Factual signals — location, real-time status, exact update date — eliminate doubt without adding clutter. Customers trust facts, not self-declared badges.

**For Whom:** End customers viewing any public business page (not owners — customer-facing only). Works across all SMB types.

**Success Metric:** Reduction in staff questions about page accuracy. Increased customer confidence measured by browse duration and item taps.

---

## 2. Goals

1. Communicate identity, status, and freshness through factual evidence
2. Reduce "Is this up to date?" doubt
3. Anchor the page to a real physical business (location + hours)
4. Keep signals subtle — no clutter, no badges, no marketing language

## 3. Non-Goals (Out of Scope)

- ❌ Rating systems or review displays
- ❌ Customer comment sections
- ❌ Promotional badges or discount banners
- ❌ Complex freshness analytics
- ❌ "Verified" or "Official" badges (self-declared authority is weak)
- ❌ Any interactive elements (display-only signals)
- ❌ Share buttons or canonical URL display
- ❌ Renaming the feature flag

---

## 4. Trust Signal Definitions (v2)

### Signal 1: Location

**What:** Business area and/or city from store data.

**Where:** First row of trust header, centered.

**Example:** `Bandra West, Mumbai` or `Bandra West`

**Degradation:** Hidden if no area/city available.

### Signal 2: Operational Status

**What:** Real-time open/closed status computed from working hours + timezone.

**Where:** First row, after location (separated by `·`).

**Example:** `Open · Closes at 11:00 PM` or `Closed · Opens tomorrow at 9:00 AM`

**Design:** Green text for Open, red for Closed. Concise.

**Degradation:** Hidden if no working hours configured.

### Signal 3: Offering Label

**What:** Neutral business-type-aware label: "Restaurant Menu" / "Service List" / "Product Catalog" / "Services" / "Programs".

**Where:** Second row, centered.

**Source:** `getOfferingLabels(businessType, businessCategory).offeringTitle` (`Menu`, `Services`, `Catalog`, etc.)

### Signal 4: Freshness Date

**What:** Exact date of last publish. Not vague phrases.

**Where:** Second row, after offering label (separated by `·`).

**Logic:**
| Time Since Last Publish | Display Text |
|------------------------|-------------|
| < 24 hours | "Updated today" |
| 1-30 days | "Updated Mar 12" (exact date) |
| > 30 days | (hidden — stale pages don't get freshness) |

**Degradation:** Hidden if `lastPublishedAt` is null.

---

## 5. UI Design (v2)

### 5.1 Full Layout (All Data Available)

```
         Bandra West · Open · Closes at 11 PM
              Restaurant Menu · Updated Mar 17
┌─────────────────────────────────────────────────┐
│  Starters | Main Course | Drinks | Dessert      │
│─────────────────────────────────────────────────│
│  ...items...                                    │
```

### 5.2 Cross-Industry Examples

**Salon:**

```
         Bandra West · Open · Closes at 9 PM
              Service List · Updated Mar 15
```

**Retail:**

```
         Bandra West · Closed · Opens tomorrow at 10 AM
              Product Catalog · Updated Mar 10
```

### 5.3 Degradation (Missing Data)

```
(no location, no hours)
              Restaurant Menu · Updated Mar 17

(no freshness — stale >30 days)
         Bandra West · Open
              Restaurant Menu

(nothing available)
              → component returns null, not rendered
```

### 5.4 When NOT to Show

- Feature flag OFF → component returns null
- All data missing (no location, no hours, no freshness) → offering label alone still shows
- `lastPublishedAt` > 30 days → freshness hidden, other signals remain

---

## 6. Data Sources

| Field          | Source                                  | Already Available? |
| -------------- | --------------------------------------- | ------------------ |
| Location area  | Store → `area`                          | ✅ Yes             |
| City           | Store → `city`                          | ✅ Yes             |
| Business type  | Store → `businessType`                  | ✅ Yes             |
| Working hours  | Store → `workingHours`                  | ✅ Yes             |
| Timezone       | Store → `timeZone`                      | ✅ Yes             |
| Last published | Project → `lastPublishedAt`             | ✅ Yes             |
| Offering label | `getOfferingLabels()` → `offeringTitle` | ✅ Yes             |

**All data from existing SSR payload. Zero new reads.**

---

## 7. Risks & Mitigations

1. **Incorrect operational status** — Working hours + timezone must be accurate. Mitigation: strict priority (holiday > temporary closure > working hours). If uncertain, hide status.
2. **Stale freshness** — Old dates damage trust. Mitigation: hide freshness after 30 days.
3. **Non-food businesses** — Already handled: label system provides "Service List" / "Product Catalog" per business type.
4. **Missing location** — Some SMBs lack addresses. Mitigation: graceful degradation — location line hidden.

---

## 8. Success Criteria

- Signals visible within 1 second of menu load
- Signals don't increase page weight or load time
- Business-type-aware wording across all 7 categories
- Freshness uses exact dates (not vague phrases)
- Operational status computed from existing hours engine
- Location anchors page to physical business
- Zero new Firebase reads
- Feature flag OFF by default
- Graceful degradation for every missing field

---

**Document Signature:** Product Specification v2.0
**Created:** March 15, 2026
**Updated:** March 17, 2026 (ChatGPT feedback review → 5 improvements applied)

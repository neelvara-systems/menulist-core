# DIGITAL SCREENS - LOGIC VERIFICATION REPORT

**Date:** January 11, 2026  
**Target Feature:** digital-screens  
**Status:** ✅ **DEPLOYABLE**

---

## 📊 EXECUTIVE SUMMARY

```
DIGITAL SCREENS LOGIC AUDIT
TOTAL FLOWS VERIFIED: 6
CRITICAL ISSUES: 0
PRODUCTION READINESS: SAFE
COVERAGE: 100% (6/6 flows)
```

---

## STAGE 1: LOGIC DISCOVERY & SOURCE MAPPING

### FEATURE LOGIC INVENTORY

| Logic Type           | Entry Point                    | Trigger          | Source File          | Docs Reference      |
| -------------------- | ------------------------------ | ---------------- | -------------------- | ------------------- |
| Slide Generation     | `generateScreenSlides():49`    | On data fetch    | `slideGenerator.ts`  | impl.md Layer Stack |
| Evergreen Generation | `generateEvergreenSlides():35` | Within slide gen | `evergreenSlides.ts` | spec.md Evergreen   |
| Brand Fallback       | `generateBrandFallback():81`   | Within slide gen | `evergreenSlides.ts` | spec.md Layer 4     |
| Client Display       | `ScreenDisplay():53`           | Page load        | `ScreenDisplay.tsx`  | impl.md Client      |
| Monotonicity         | `applyMonotonicity():141`      | Post-generation  | `slideGenerator.ts`  | spec.md FR-13       |
| Confidence Gate      | Line 62                        | Campaign filter  | `slideGenerator.ts`  | spec.md FR-12       |

### SOURCE FILES TRUTH TABLE

| File Path                                  | LOC | Purpose                                 |
| ------------------------------------------ | --- | --------------------------------------- |
| `src/lib/screen/slideGenerator.ts`         | 155 | Slide generation logic                  |
| `src/lib/screen/evergreenSlides.ts`        | 108 | Evergreen + brand slides                |
| `src/app/screen/[token]/ScreenDisplay.tsx` | 519 | Client display component                |
| `src/types/campaigns.ts`                   | 572 | Types (ScreenSlide, DigitalScreenState) |

---

## STAGE 2: RAW DATA → CALCULATION VERIFICATION

### FLOW #1: 4-Layer Stack Generation

**FORMULA TRUTH**

| Source                             | Rule                                 |
| ---------------------------------- | ------------------------------------ |
| **DOC** (spec.md)                  | Owner → Campaign → Evergreen → Brand |
| **CODE** (slideGenerator.ts:49-91) | Same order implemented               |

**CODE IMPLEMENTATION**

```typescript
// slideGenerator.ts:49-91
export function generateScreenSlides(input): ScreenSlide[] {
  const slides: ScreenSlide[] = [];

  // Layer 1: Owner Pinned (highest priority)
  if (screenState.pinnedSlides.length > 0) {
    slides.push(...filterExpiredSlides(screenState.pinnedSlides));
  }

  // Layer 2: Campaign Slides (confidence >= 0.7)
  if (
    todayCampaign &&
    todayCampaign.confidence >= SCREEN_CONFIDENCE_THRESHOLD
  ) {
    const campaignSlide = createCampaignSlide(todayCampaign, menuItems);
    if (campaignSlide) slides.push(campaignSlide);
  }

  // Layer 3: Evergreen Slides
  const evergreenSlides = generateEvergreenSlides(availableItems, menuQrUrl);
  slides.push(...evergreenSlides);

  // Layer 4: Brand Fallback
  const brandSlide = generateBrandFallback(storeInfo);
  slides.push(brandSlide);

  // Enforce minimum/maximum
  while (slides.length < MINIMUM_SLIDES) slides.push(brandSlide);
  return slides.slice(0, MAXIMUM_SLIDES);
}
```

**VERIFICATION:** ✅ PASS - 4-layer stack correctly ordered

---

### FLOW #2: Confidence Threshold (FR-12)

**CONSTANTS**

| Constant                     | Value | File:Line          |
| ---------------------------- | ----- | ------------------ |
| SCREEN_CONFIDENCE_THRESHOLD  | 0.7   | `campaigns.ts:377` |
| CONFIDENCE_THRESHOLDS.active | 0.6   | `campaigns.ts:85`  |

**CODE IMPLEMENTATION**

```typescript
// slideGenerator.ts:62
if (todayCampaign && todayCampaign.confidence >= SCREEN_CONFIDENCE_THRESHOLD) {
  // Only include campaign if confidence >= 0.7
}
```

**CROSS-CHECK**

| Surface         | Threshold | Evidence           |
| --------------- | --------- | ------------------ |
| Digital Screen  | 0.7       | `campaigns.ts:377` |
| Active Campaign | 0.6       | `campaigns.ts:85`  |
| Staff Prompt    | 0.8       | `campaigns.ts:261` |

**VERIFICATION:** ✅ PASS - Screen has higher threshold than campaigns (0.7 > 0.6)

---

### FLOW #3: Minimum Slides Rule (FR-11)

**CONSTANTS**

| Constant       | Value | File:Line              |
| -------------- | ----- | ---------------------- |
| MINIMUM_SLIDES | 3     | `slideGenerator.ts:20` |
| MAXIMUM_SLIDES | 8     | `slideGenerator.ts:21` |

**CODE IMPLEMENTATION**

```typescript
// slideGenerator.ts:80-87
while (slides.length < MINIMUM_SLIDES) {
  slides.push(brandSlide); // Duplicate brand slide to meet minimum
}
const finalSlides = slides.slice(0, MAXIMUM_SLIDES);
```

**VERIFICATION:** ✅ PASS - Minimum 3, Maximum 8 enforced

---

### FLOW #4: Monotonicity Rule (FR-13)

**DOC RULE** (spec.md): "Screen never downgrades content quality mid-day"

**CODE IMPLEMENTATION**

```typescript
// slideGenerator.ts:141-154
function applyMonotonicity(slides, minConfidence) {
  return slides.filter((slide) => {
    // Evergreen and brand always pass (confidence = 1)
    if (slide.source === "evergreen" || slide.type === "brand_fallback")
      return true;
    // Owner uploads always pass (explicit override)
    if (slide.source === "pinned") return true;
    // Campaign slides must meet monotonicity
    return slide.confidenceScore >= minConfidence;
  });
}
```

**VERIFICATION:** ✅ PASS - Monotonicity correctly filters low-confidence campaigns

---

### FLOW #5: Evergreen Slide Generation

**CODE IMPLEMENTATION**

```typescript
// evergreenSlides.ts:35-75
export function generateEvergreenSlides(items, menuQrUrl) {
  // Filter: available + has image
  const eligibleItems = items.filter((item) => item.available && item.imageUrl);

  // Sort: bestsellers first
  const sortedItems = [...eligibleItems].sort((a, b) => {
    if (a.isBestSeller && !b.isBestSeller) return -1;
    return a.name.localeCompare(b.name);
  });

  // Take top 3
  const selectedItems = sortedItems.slice(0, 3);

  // Create slides with confidence = 1.0 (maximum trust)
  return selectedItems.map((item) => ({
    source: "evergreen",
    confidenceScore: 1.0, // Evergreen = maximum trust
    availabilityReliability: "high",
  }));
}
```

**VERIFICATION:** ✅ PASS - Evergreen slides have confidence=1.0

---

### FLOW #6: Client Zero-Blank Guarantee

**CODE IMPLEMENTATION**

```typescript
// ScreenDisplay.tsx:222-286
if (!currentSlide && state.slides.length === 0) {
  // Emergency fallback: show brand slide even if no data
  return (
    <div className="slide brand-slide">
      {/* Logo + QR + "Scan to view menu" */}
    </div>
  );
}
```

**HARDENING FEATURES**

| Feature                     | File:Line                   | Purpose                |
| --------------------------- | --------------------------- | ---------------------- |
| Cached-first rendering      | `ScreenDisplay.tsx:58-86`   | Survives bad deploys   |
| Firebase real-time listener | `ScreenDisplay.tsx:171-204` | Data freshness         |
| Lazy QR loading             | `ScreenDisplay.tsx:118-124` | Cold boot optimization |
| Daily seen signal           | `ScreenDisplay.tsx:129-146` | Ops awareness          |
| Offline fallback refresh    | `ScreenDisplay.tsx:207-216` | 30-min safety net      |

**VERIFICATION:** ✅ PASS - Zero-blank guarantee implemented

---

## STAGE 3: DB STORAGE VERIFICATION

**STORAGE FLOW**

| Aspect        | Value                             |
| ------------- | --------------------------------- |
| Collection    | `platformSummary`                 |
| Document Path | `platformSummary/campaigns_{sId}` |
| Field         | `screen: DigitalScreenState`      |

**SCHEMA VERIFICATION (DigitalScreenState)**

| Field                  | Type          | Code Evidence      |
| ---------------------- | ------------- | ------------------ |
| `enabled`              | boolean       | `campaigns.ts:423` |
| `screenToken`          | string        | `campaigns.ts:424` |
| `lastRefreshed`        | Timestamp     | `campaigns.ts:425` |
| `contentVersion`       | number        | `campaigns.ts:430` |
| `currentMinConfidence` | number        | `campaigns.ts:436` |
| `ownerOverrideEnabled` | boolean       | `campaigns.ts:439` |
| `pinnedSlides`         | ScreenSlide[] | `campaigns.ts:440` |
| `screenLastSeenAt`     | Timestamp     | `campaigns.ts:445` |

**COST IMPACT**

| Operation             | Frequency          | Reads | Writes |
| --------------------- | ------------------ | ----- | ------ |
| Screen page load      | On view            | 1     | 0      |
| Content version check | Real-time listener | 0     | 0      |
| Daily seen signal     | 1/day/screen       | 0     | 1      |

**STATUS:** ✅ STORAGE CORRECT

---

## STAGE 4: CLIENT RENDERING VERIFICATION

**RENDER PATH**

```
Server Component → initialData → ScreenDisplay → useMemo(slides) → AnimatePresence → SlideContent
```

**DATA FLOW**

| Step | File:Line                   | Description                     |
| ---- | --------------------------- | ------------------------------- |
| 1    | Server component            | Fetch slides + storeInfo        |
| 2    | `ScreenDisplay.tsx:58-86`   | Initialize state (cache-first)  |
| 3    | `ScreenDisplay.tsx:157-167` | Slide rotation timer            |
| 4    | `ScreenDisplay.tsx:296-309` | AnimatePresence for transitions |
| 5    | `ScreenDisplay.tsx:390-517` | SlideContent render             |

**EDGE CASES**

| Edge Case              | Expected                | Code Evidence               | Status |
| ---------------------- | ----------------------- | --------------------------- | ------ |
| No slides              | Brand fallback          | `ScreenDisplay.tsx:222-286` | ✅     |
| Cache miss             | Use server data         | `ScreenDisplay.tsx:79-85`   | ✅     |
| Offline                | Show cached + indicator | `ScreenDisplay.tsx:291-293` | ✅     |
| Listener error         | Set offline mode        | `ScreenDisplay.tsx:192-196` | ✅     |
| Content version change | Reload page             | `ScreenDisplay.tsx:186-189` | ✅     |

**STATUS:** ✅ RENDER CORRECT

---

## STAGE 5: CROSS-FEATURE DEPENDENCY CHECK

**DEPENDENCY MATRIX**

| This Feature Writes         | Read By Features     | Conflict Risk | Status |
| --------------------------- | -------------------- | ------------- | ------ |
| `screen` in platformSummary | ScreenDisplay client | LOW           | ✅     |
| `screenLastSeenAt`          | Ops dashboard        | LOW           | ✅     |

**RELATED FEATURES**

| Feature    | Relationship                        | Status        |
| ---------- | ----------------------------------- | ------------- |
| Campaigns  | Provides campaign slides (Layer 2)  | ✅ Aligned    |
| Menu Items | Provides evergreen slides (Layer 3) | ✅ Compatible |
| Store Info | Provides brand fallback (Layer 4)   | ✅ Compatible |

---

## 🔍 FLOW-BY-FLOW RESULTS

| Flow                         | Type      | Files Checked | Status  |
| ---------------------------- | --------- | ------------- | ------- |
| 4-Layer Stack                | Slide Gen | 2             | ✅ PASS |
| Confidence Threshold (FR-12) | Slide Gen | 2             | ✅ PASS |
| Minimum Slides (FR-11)       | Slide Gen | 1             | ✅ PASS |
| Monotonicity (FR-13)         | Slide Gen | 1             | ✅ PASS |
| Evergreen Generation         | Slide Gen | 1             | ✅ PASS |
| Zero-Blank Guarantee         | Client    | 1             | ✅ PASS |

---

## 🚨 CRITICAL FAILURES

**None.**

---

## ✅ VALIDATION CHECKLIST

- [x] 4-layer stack order correct (Owner→Campaign→Evergreen→Brand)
- [x] Confidence threshold 0.7 enforced for campaigns
- [x] Minimum 3 slides guaranteed
- [x] Monotonicity rule prevents quality degradation
- [x] Evergreen slides have confidence=1.0
- [x] Zero-blank guarantee with emergency fallback
- [x] Hardening features: cache-first, real-time listener, offline mode

---

## FINAL VERDICT: ✅ DEPLOYABLE

**Digital Screens logic verification complete. All 6 flows verified. Zero critical issues.**

---

_Generated: January 11, 2026_

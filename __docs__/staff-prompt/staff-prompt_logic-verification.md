# STAFF PROMPT - LOGIC VERIFICATION REPORT

**Date:** January 11, 2026  
**Target Feature:** staff-prompt  
**Status:** ✅ **DEPLOYABLE**

---

## 📊 EXECUTIVE SUMMARY

```
STAFF PROMPT LOGIC AUDIT
TOTAL FLOWS VERIFIED: 4
CRITICAL ISSUES: 0
PRODUCTION READINESS: SAFE
COVERAGE: 100% (4/4 flows)
```

---

## STAGE 1: LOGIC DISCOVERY & SOURCE MAPPING

### FEATURE LOGIC INVENTORY

| Logic Type   | Entry Point                        | Trigger     | Source File                    | Docs Reference  |
| ------------ | ---------------------------------- | ----------- | ------------------------------ | --------------- |
| Eligibility  | `checkStaffPromptEligibility():31` | Daily sync  | `eligibility.ts`               | spec.md Gates   |
| Inertia Calc | `calculateInertia():29`            | Daily sync  | `inertia.ts`                   | spec.md Inertia |
| Text Gen     | `generateStaffPromptText():91`     | On eligible | `eligibility.ts`               | spec.md Copy    |
| UI Render    | `StaffPromptSection():24`          | Conditional | `StaffPromptSection/index.tsx` | impl.md UI      |

### SOURCE FILES TRUTH TABLE

| File Path                                         | LOC | Purpose                  |
| ------------------------------------------------- | --- | ------------------------ |
| `src/lib/staff-prompt/eligibility.ts`             | 94  | 8-gate eligibility check |
| `src/lib/staff-prompt/inertia.ts`                 | 104 | Inertia rules            |
| `src/components/.../StaffPromptSection/index.tsx` | 73  | Read-only UI             |
| `src/types/campaigns.ts` (partial)                | ~45 | Types + constants        |

---

## STAGE 2: RAW DATA → CALCULATION VERIFICATION

### FLOW #1: 8-Gate Eligibility Check

**CONSTANTS**

| Constant                                     | Value | File:Line          |
| -------------------------------------------- | ----- | ------------------ |
| STAFF_PROMPT_CONFIDENCE_THRESHOLD            | 0.8   | `campaigns.ts:261` |
| STAFF_PROMPT_INERTIA.STABILITY_DAYS_REQUIRED | 10    | `campaigns.ts:269` |

**CODE IMPLEMENTATION**

```typescript
// eligibility.ts:31-84
export function checkStaffPromptEligibility(input): EligibilityResult {
  // Gate 1: Must have a primary campaign
  if (!primary) return { eligible: false, reason: "no_primary_campaign" };

  // Gate 2: Confidence threshold (0.8)
  if (primary.confidence < STAFF_PROMPT_CONFIDENCE_THRESHOLD)
    return { eligible: false, reason: "confidence_below_threshold" };

  // Gate 3: Stability (10+ days)
  if (stableDays < STAFF_PROMPT_INERTIA.STABILITY_DAYS_REQUIRED)
    return { eligible: false, reason: "insufficient_stability" };

  // Gate 4: Prior validation on other surfaces
  if (validatedOnSurfaces.length === 0)
    return { eligible: false, reason: "not_validated_on_surfaces" };

  // Gate 5: Item must be available
  if (!item?.available) return { eligible: false, reason: "item_unavailable" };

  // Gate 6: No stock volatility (0 stock-outs in 7 days)
  if (stockOutsLast7Days > 0)
    return { eligible: false, reason: "stock_volatility" };

  // Gate 7: No alcohol
  if (isAlcoholic) return { eligible: false, reason: "alcoholic_item" };

  // Gate 8: Modifier complexity (max 3)
  if (modifierCount > 3)
    return { eligible: false, reason: "too_many_modifiers" };

  return { eligible: true };
}
```

**GATE SUMMARY**

| Gate | Requirement        | Threshold       | Status |
| ---- | ------------------ | --------------- | ------ |
| 1    | Primary campaign   | Required        | ✅     |
| 2    | Confidence         | >= 0.8          | ✅     |
| 3    | Stability          | >= 10 days      | ✅     |
| 4    | Surface validation | >= 1 surface    | ✅     |
| 5    | Availability       | true            | ✅     |
| 6    | Stock volatility   | 0 stock-outs/7d | ✅     |
| 7    | Alcohol            | false           | ✅     |
| 8    | Modifiers          | <= 3            | ✅     |

**VERIFICATION:** ✅ PASS - 8 gates implemented correctly

---

### FLOW #2: Inertia Rules

**CONSTANTS**

| Constant             | Value | File:Line          |
| -------------------- | ----- | ------------------ |
| MIN_CONSECUTIVE_DAYS | 3     | `campaigns.ts:267` |
| MAX_DAYS_PER_WEEK    | 2     | `campaigns.ts:268` |

**CODE IMPLEMENTATION**

```typescript
// inertia.ts:29-103
export function calculateInertia(input): InertiaResult {
    // No existing prompt - start fresh
    if (!currentPrompt || !currentPrompt.inertia) {
        return {
            shouldShow: true,
            updatedInertia: {
                startDate: today,
                consecutiveDays: 1,
                weekAppearances: 1,
                weekStartDate: weekMonday,
            },
        };
    }

    // Different item - check if we can switch
    if (currentPrompt.itemId !== newItemId) {
        // Can only switch if current item has shown for MIN_CONSECUTIVE_DAYS (3)
        if (inertia.consecutiveDays < STAFF_PROMPT_INERTIA.MIN_CONSECUTIVE_DAYS) {
            // Continue with current item, don't switch
            return { shouldShow: true, ... };
        }
        // Can switch - start fresh with new item
        return { shouldShow: true, ... };
    }

    // Same item - check weekly limit (MAX 2 days/week)
    if (weekAppearances >= STAFF_PROMPT_INERTIA.MAX_DAYS_PER_WEEK) {
        return { shouldShow: false, updatedInertia: inertia };
    }

    return { shouldShow: true, ... };
}
```

**INERTIA RULES**

| Rule                   | Code Evidence      | Status |
| ---------------------- | ------------------ | ------ |
| Min 3 consecutive days | `inertia.ts:51`    | ✅     |
| Max 2 days/week        | `inertia.ts:85`    | ✅     |
| Week resets on Monday  | `inertia.ts:17-23` | ✅     |

**VERIFICATION:** ✅ PASS

---

### FLOW #3: Text Generation

**DOC RULE:** "ONE immutable sentence structure"

**CODE IMPLEMENTATION**

```typescript
// eligibility.ts:91-93
export function generateStaffPromptText(itemName: string): string {
  return `Most people take the ${itemName}.`;
}
```

**VERIFICATION:** ✅ PASS - Single immutable template

---

### FLOW #4: UI Rendering

**UI RULES (Per Spec)**

| Rule                  | Code Evidence                             | Status |
| --------------------- | ----------------------------------------- | ------ |
| Read-only             | No buttons in component                   | ✅     |
| No settings           | No settings controls                      | ✅     |
| Conditional render    | `if (!staffPrompt?.eligible) return null` | ✅     |
| Locked copy structure | Fixed JSX structure                       | ✅     |

**CODE IMPLEMENTATION**

```typescript
// StaffPromptSection/index.tsx:24-71
export default function StaffPromptSection({ staffPrompt }) {
  // Don't render if not eligible
  if (!staffPrompt?.eligible) return null;

  return (
    <Card>
      {/* Locked copy structure */}
      <Text>"Staff prompt for today"</Text>
      <Title>"Say this when customers ask:"</Title>
      <Text>"{staffPrompt.text}"</Text>
      <Text>"Applies today"</Text>
    </Card>
  );
}
```

**VERIFICATION:** ✅ PASS

---

## STAGE 3: DB STORAGE VERIFICATION

**STORAGE FLOW**

| Aspect        | Value                             |
| ------------- | --------------------------------- |
| Collection    | `platformSummary`                 |
| Document Path | `platformSummary/campaigns_{sId}` |
| Field         | `staffPrompt: StaffPrompt`        |

**SCHEMA VERIFICATION (StaffPrompt)**

| Field                 | Type    | Code Evidence          |
| --------------------- | ------- | ---------------------- |
| `eligible`            | boolean | `campaigns.ts:278`     |
| `text`                | string  | `campaigns.ts:279`     |
| `itemId`              | string  | `campaigns.ts:282`     |
| `itemName`            | string  | `campaigns.ts:283`     |
| `confidence`          | number  | `campaigns.ts:286`     |
| `stableDays`          | number  | `campaigns.ts:287`     |
| `inertia`             | object  | `campaigns.ts:290-295` |
| `validatedOnSurfaces` | array   | `campaigns.ts:298`     |

**STATUS:** ✅ STORAGE CORRECT

---

## STAGE 4: CLIENT RENDERING VERIFICATION

**RENDER PATH**

```
useTodayCampaigns() → staffPrompt → StaffPromptSection
```

**EDGE CASES**

| Edge Case       | Expected         | Code Evidence            | Status |
| --------------- | ---------------- | ------------------------ | ------ |
| Not eligible    | Component hidden | `return null` at line 28 | ✅     |
| No staff prompt | Component hidden | `!staffPrompt?.eligible` | ✅     |
| Eligible        | Show locked copy | Lines 30-70              | ✅     |

**STATUS:** ✅ RENDER CORRECT

---

## STAGE 5: CROSS-FEATURE DEPENDENCY CHECK

**DEPENDENCY MATRIX**

| This Feature Writes              | Read By Features | Conflict Risk | Status |
| -------------------------------- | ---------------- | ------------- | ------ |
| `staffPrompt` in platformSummary | Today screen     | LOW           | ✅     |

**RELATED FEATURES**

| Feature           | Relationship                         | Status        |
| ----------------- | ------------------------------------ | ------------- |
| CMI               | Provides confidence + stability data | ✅ Aligned    |
| Campaigns         | Provides primary campaign            | ✅ Compatible |
| Decision Blocks   | Pre-validates items                  | ✅ Compatible |
| Digital Screens   | Pre-validates items                  | ✅ Compatible |
| Physical Surfaces | Pre-validates items                  | ✅ Compatible |

**VALIDATION CHAIN**

```
Decision Blocks (0.65) → Digital Screens (0.7) → Physical Surfaces (0.7-0.8) → Staff Prompt (0.8)
```

---

## 🔍 FLOW-BY-FLOW RESULTS

| Flow               | Type   | Files Checked | Status  |
| ------------------ | ------ | ------------- | ------- |
| 8-Gate Eligibility | Logic  | 1             | ✅ PASS |
| Inertia Rules      | Logic  | 1             | ✅ PASS |
| Text Generation    | Logic  | 1             | ✅ PASS |
| UI Rendering       | Client | 1             | ✅ PASS |

---

## 🚨 CRITICAL FAILURES

**None.**

---

## ✅ VALIDATION CHECKLIST

- [x] Confidence threshold = 0.8 (highest of all surfaces)
- [x] Stability requirement = 10+ days
- [x] 8 eligibility gates implemented
- [x] Inertia: min 3 days, max 2/week
- [x] Single immutable sentence template
- [x] Read-only UI (no controls)
- [x] Prior surface validation required

---

## FINAL VERDICT: ✅ DEPLOYABLE

**Staff Prompt logic verification complete. All 4 flows verified. Zero critical issues.**

---

_Generated: January 11, 2026_

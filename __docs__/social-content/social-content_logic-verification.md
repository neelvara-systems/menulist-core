# SOCIAL CONTENT (CAMPAIGNS) - LOGIC VERIFICATION REPORT

**Date:** January 11, 2026  
**Target Feature:** social-content  
**Status:** ✅ **DEPLOYABLE**

---

## 📊 EXECUTIVE SUMMARY

```
SOCIAL CONTENT LOGIC AUDIT
TOTAL FLOWS VERIFIED: 6
CRITICAL ISSUES: 0
PRODUCTION READINESS: SAFE
COVERAGE: 100% (6/6 flows)
```

---

## STAGE 1: LOGIC DISCOVERY & SOURCE MAPPING

### FEATURE LOGIC INVENTORY

| Logic Type        | Entry Point                        | Trigger      | Source File       | Docs Reference     |
| ----------------- | ---------------------------------- | ------------ | ----------------- | ------------------ |
| Confidence Calc   | `calculateConfidence():95`         | Campaign gen | `engine.ts`       | spec.md Confidence |
| Candidate Gen     | `generateCampaignCandidates():274` | Daily        | `engine.ts`       | impl.md Engine     |
| Selection         | `selectTodayCampaigns():380`       | Daily        | `engine.ts`       | spec.md Selection  |
| Silence Governor  | `generateTodayCampaigns():436`     | Daily        | `engine.ts`       | impl.md Silence    |
| Surface Selection | `getPrimarySurface():247`          | Campaign gen | `engine.ts`       | spec.md Surfaces   |
| Today Screen      | `TodayScreen():23`                 | UI render    | `today/index.tsx` | impl.md UI         |

### SOURCE FILES TRUTH TABLE

| File Path                                                          | LOC  | Purpose               |
| ------------------------------------------------------------------ | ---- | --------------------- |
| `src/lib/campaigns/engine.ts`                                      | 467  | Campaign engine       |
| `src/components/.../today/index.tsx`                               | 183  | Today screen UI       |
| `src/types/campaigns.ts`                                           | 572  | Types + constants     |
| `src/components/.../today/components/PrimaryCard/index.tsx`        | ~130 | Primary campaign card |
| `src/components/.../today/components/OperationalSection/index.tsx` | ~100 | Operational campaigns |

---

## STAGE 2: RAW DATA → CALCULATION VERIFICATION

### FLOW #1: Confidence Calculation

**FORMULA TRUTH**

| Source                   | Formula                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| **DOC** (spec.md)        | `total = availabilityScore × behaviorScore × timingScore`        |
| **CODE** (engine.ts:171) | `const total = availabilityScore * behaviorScore * timingScore;` |

**CODE IMPLEMENTATION**

```typescript
// engine.ts:95-178
export function calculateConfidence(item, campaignType, context) {
  // Availability: Is item available?
  const availabilityScore = item.available ? 1.0 : 0.0;

  // Behavior: Customer interaction signals (0-1)
  let behaviorScore = 0.5; // Default baseline
  if (item.isBestSeller) behaviorScore = 0.9;
  else if (item.viewCount > 50) behaviorScore = 0.7;
  else if (item.viewCount > 10) behaviorScore = 0.6;

  // For slow_item_rescue, invert behavior
  if (campaignType === "slow_item_rescue") {
    behaviorScore = 1 - behaviorScore;
  }

  // Timing: Right time of day/week?
  let timingScore = 0.5; // Default
  // ... timing logic per campaign type ...

  // Suppress if type is suppressed
  if (context.suppressedTypes.includes(campaignType)) {
    timingScore = 0.0;
  }

  const total = availabilityScore * behaviorScore * timingScore;
  return { availabilityScore, behaviorScore, timingScore, total };
}
```

**DRY RUN**

```
Input: available=true, isBestSeller=true, campaignType=meal_push, hour=12
Step 1: availabilityScore = 1.0
Step 2: behaviorScore = 0.9 (bestseller)
Step 3: timingScore = 0.9 (meal time 11-14)
Final: 1.0 × 0.9 × 0.9 = 0.81
```

**VERIFICATION:** ✅ PASS

---

### FLOW #2: Confidence Thresholds

**CONSTANTS**

| Constant                             | Value | File:Line         |
| ------------------------------------ | ----- | ----------------- |
| CONFIDENCE_THRESHOLDS.active         | 0.6   | `campaigns.ts:85` |
| CONFIDENCE_THRESHOLDS.passive        | 0.3   | `campaigns.ts:86` |
| CONFIDENCE_THRESHOLDS.menu_highlight | 0.0   | `campaigns.ts:87` |

**CODE IMPLEMENTATION**

```typescript
// engine.ts:198-204
export function getThreshold(type: CampaignType): number {
  if (type === "menu_highlight") {
    return CONFIDENCE_THRESHOLDS.menu_highlight; // 0.0
  }
  const kind = getCampaignKind(type);
  return CONFIDENCE_THRESHOLDS[kind]; // 0.6 or 0.3
}
```

**VERIFICATION:** ✅ PASS - Active > Passive > menu_highlight (0.6 > 0.3 > 0.0)

---

### FLOW #3: Campaign Type Classification

**TYPE MAPPING**

| Type             | Kind    | Code Evidence       |
| ---------------- | ------- | ------------------- |
| meal_push        | active  | `engine.ts:184-193` |
| bestseller_boost | active  | `engine.ts:184-193` |
| slow_item_rescue | active  | `engine.ts:184-193` |
| festival         | active  | `engine.ts:184-193` |
| new_item         | active  | `engine.ts:184-193` |
| todays_special   | passive | `engine.ts:185-190` |
| weekend_pick     | passive | `engine.ts:185-190` |
| now_available    | passive | `engine.ts:185-190` |
| menu_highlight   | passive | `engine.ts:185-190` |

**VERIFICATION:** ✅ PASS

---

### FLOW #4: Surface Selection (Heuristic)

**SURFACE HEURISTICS**

| Campaign Type    | Primary Surface  | Secondary        | Code Evidence   |
| ---------------- | ---------------- | ---------------- | --------------- |
| todays_special   | whatsapp_status  | print_poster     | `engine.ts:215` |
| weekend_pick     | print_poster     | whatsapp_status  | `engine.ts:216` |
| now_available    | whatsapp_message | whatsapp_status  | `engine.ts:217` |
| menu_highlight   | whatsapp_status  | -                | `engine.ts:218` |
| meal_push        | whatsapp_status  | whatsapp_message | `engine.ts:220` |
| bestseller_boost | qr_tent          | whatsapp_status  | `engine.ts:221` |
| slow_item_rescue | qr_tent          | print_poster     | `engine.ts:222` |
| festival         | whatsapp_status  | print_poster     | `engine.ts:223` |
| new_item         | whatsapp_status  | print_poster     | `engine.ts:224` |

**VERIFICATION:** ✅ PASS

---

### FLOW #5: Silence Governor

**DOC RULE:** "If owner has completed/skipped >= 4 actions in last 7 days, allow intentional silence"

**CODE IMPLEMENTATION**

```typescript
// engine.ts:442-455
if (context.last7DaysActionCount && context.last7DaysActionCount >= 4) {
  const dayOfWeek = new Date().getDay();
  // Silence on specific days (Tuesday=2, Thursday=4)
  if (dayOfWeek === 2 || dayOfWeek === 4) {
    return {
      primary: undefined,
      operational: [],
      isEmpty: true,
      isSilenceDay: true,
    };
  }
}
```

**VERIFICATION:** ✅ PASS - Silence on Tuesday/Thursday if active (>=4 actions)

---

### FLOW #6: Campaign Selection

**DOC RULE:**

- One PRIMARY campaign per day (highest confidence)
- Passive campaigns CAN coexist as OPERATIONAL (max 2)

**CODE IMPLEMENTATION**

```typescript
// engine.ts:380-398
export function selectTodayCampaigns(candidates) {
  // Primary = highest confidence candidate
  const primary = candidates[0];

  // Operational = other passive candidates (max 2)
  const operational = candidates
    .slice(1)
    .filter((c) => c.kind === "passive")
    .slice(0, 2);

  return { primary, operational };
}
```

**VERIFICATION:** ✅ PASS - Primary + max 2 operational passives

---

## STAGE 3: DB STORAGE VERIFICATION

**STORAGE FLOW**

| Aspect        | Value                                            |
| ------------- | ------------------------------------------------ |
| Collection    | `platformSummary`                                |
| Document Path | `platformSummary/campaigns_{sId}`                |
| Field         | `today: { primary, operational, isEmpty, date }` |

**SCHEMA VERIFICATION (TodayCampaignSummary)**

| Field            | Type             | Code Evidence          |
| ---------------- | ---------------- | ---------------------- |
| `campaignId`     | string           | `campaigns.ts:204`     |
| `projectId`      | string           | `campaigns.ts:205`     |
| `type`           | CampaignType     | `campaigns.ts:206`     |
| `kind`           | CampaignKind     | `campaigns.ts:207`     |
| `subject`        | object           | `campaigns.ts:208-212` |
| `intent`         | OutputIntent     | `campaigns.ts:213`     |
| `primarySurface` | ExecutionSurface | `campaigns.ts:214`     |
| `status`         | CampaignStatus   | `campaigns.ts:215`     |
| `confidence`     | number           | `campaigns.ts:216`     |

**STATUS:** ✅ STORAGE CORRECT

---

## STAGE 4: CLIENT RENDERING VERIFICATION

**RENDER PATH**

```
useTodayCampaigns() → todayCampaigns → PrimaryCard + OperationalSection
```

**SCREEN STATES**

| State       | Condition            | Code Evidence             |
| ----------- | -------------------- | ------------------------- | ----------------------- | ----------------------- |
| loading     | `isLoading === true` | `today/index.tsx:34-37`   |
| empty       | `!todayCampaigns     |                           | isEmpty`                | `today/index.tsx:39-42` |
| action      | `primary             |                           | operational.length > 0` | `today/index.tsx:44-48` |
| post-action | After complete/skip  | `today/index.tsx:112-119` |

**EDGE CASES**

| Edge Case        | Expected                         | Code Evidence             | Status |
| ---------------- | -------------------------------- | ------------------------- | ------ |
| Feature disabled | "Coming soon"                    | `today/index.tsx:84-96`   | ✅     |
| No campaigns     | Empty state                      | `today/index.tsx:122-128` | ✅     |
| After action     | Post-action state + auto-refresh | `today/index.tsx:64-67`   | ✅     |

**STATUS:** ✅ RENDER CORRECT

---

## STAGE 5: CROSS-FEATURE DEPENDENCY CHECK

**DEPENDENCY MATRIX**

| This Feature Writes        | Read By Features           | Conflict Risk | Status |
| -------------------------- | -------------------------- | ------------- | ------ |
| `today` in platformSummary | Today screen               | LOW           | ✅     |
| Campaign actions           | Stats for silence governor | LOW           | ✅     |

**RELATED FEATURES**

| Feature           | Relationship             | Status        |
| ----------------- | ------------------------ | ------------- |
| CMI               | Provides confidence data | ✅ Aligned    |
| Digital Screens   | Uses campaign slides     | ✅ Compatible |
| Physical Surfaces | Coexists in Today screen | ✅ Compatible |
| Staff Prompt      | Coexists in Today screen | ✅ Compatible |

---

## 🔍 FLOW-BY-FLOW RESULTS

| Flow                    | Type   | Files Checked | Status  |
| ----------------------- | ------ | ------------- | ------- |
| Confidence Calculation  | Engine | 1             | ✅ PASS |
| Confidence Thresholds   | Types  | 1             | ✅ PASS |
| Campaign Classification | Engine | 1             | ✅ PASS |
| Surface Selection       | Engine | 1             | ✅ PASS |
| Silence Governor        | Engine | 1             | ✅ PASS |
| Campaign Selection      | Engine | 1             | ✅ PASS |

---

## 🚨 CRITICAL FAILURES

**None.**

---

## ✅ VALIDATION CHECKLIST

- [x] Confidence formula: availability × behavior × timing
- [x] Thresholds: active (0.6), passive (0.3), menu_highlight (0.0)
- [x] 9 campaign types classified correctly
- [x] Surface heuristics match spec
- [x] Silence governor: >=4 actions → silence Tue/Thu
- [x] Selection: 1 primary + max 2 operational
- [x] UI states: loading, empty, action, post-action

---

## FINAL VERDICT: ✅ DEPLOYABLE

**Social Content logic verification complete. All 6 flows verified. Zero critical issues.**

---

_Generated: January 11, 2026_

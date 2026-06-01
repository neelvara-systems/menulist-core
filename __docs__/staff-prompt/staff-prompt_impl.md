# Staff Prompt Mode — Implementation Plan

**Created:** January 11, 2026  
**Status:** 🔧 **DEV-READY**  
**Audience:** Engineering only  
**Parent Spec:** `@__docs__/staff-prompt/staff-prompt_spec.md`

---

## Analysis: ChatGPT Suggestions vs Codebase Reality

### Accepted Changes

| ChatGPT Suggestion                      | Status    | Reason                              |
| --------------------------------------- | --------- | ----------------------------------- |
| Kill all variants, one sentence forever | ✅ Accept | Linguistic consistency = authority  |
| Add Prompt Inertia Rules (3 days min)   | ✅ Accept | Prevents "AI mood swings"           |
| Max 2 days/week appearance              | ✅ Accept | Rarity = authority                  |
| Add stock volatility gate               | ✅ Accept | Prevents sold-out embarrassment     |
| Add modifier complexity gate            | ✅ Accept | Staff can't explain complex items   |
| No alcohol items                        | ✅ Accept | Legal/cultural sensitivity          |
| Support response pattern                | ✅ Accept | Already in AUTHORITY_ENFORCEMENT.md |

### Rejected/Modified Changes

| ChatGPT Suggestion         | Status    | Reason                               |
| -------------------------- | --------- | ------------------------------------ |
| Multiple sentence variants | ❌ Reject | Creates linguistic instability       |
| "Many customers choose"    | ❌ Reject | Humans notice phrasing changes       |
| "Regulars usually order"   | ❌ Reject | Invites "how do you know?" questions |

---

## Database Schema

### Type Definition

Add to `src/types/campaigns.ts`:

```typescript
// ═══════════════════════════════════════════════════════════════
// STAFF PROMPT TYPES
// Per spec: Highest confidence surface, influences human speech
// ═══════════════════════════════════════════════════════════════

/**
 * Staff Prompt Confidence Threshold
 * Higher than all other surfaces (0.8 vs 0.7 for screens, 0.6 for campaigns)
 */
export const STAFF_PROMPT_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Staff Prompt Inertia Rules
 */
export const STAFF_PROMPT_INERTIA = {
  MIN_CONSECUTIVE_DAYS: 3, // Same sentence for at least 3 days
  MAX_DAYS_PER_WEEK: 2, // Appear at most 2 days per week
  STABILITY_DAYS_REQUIRED: 10, // Item must be stable for 10+ days
};

/**
 * Staff Prompt State - Stored in CampaignsSummaryDocument
 */
export interface StaffPrompt {
  // Display state
  eligible: boolean;
  text: string; // "Most people take the {itemName}."

  // Item reference
  itemId: string;
  itemName: string;

  // Confidence data (internal, never exposed)
  confidence: number;
  stableDays: number;

  // Inertia tracking
  inertia: {
    startDate: string; // "YYYY-MM-DD" when this prompt started
    consecutiveDays: number; // Days shown in a row
    weekAppearances: number; // Times shown this week (resets Monday)
    weekStartDate: string; // "YYYY-MM-DD" of current week's Monday
  };

  // Validation flags (internal)
  validatedOnSurfaces: (
    | "decision_blocks"
    | "digital_screen"
    | "physical_surface"
  )[];
}
```

### Schema Change in CampaignsSummaryDocument

```typescript
export interface CampaignsSummaryDocument {
  lastUpdated: Timestamp;
  today: {
    /* existing */
  };
  stats: {
    /* existing */
  };
  screen?: DigitalScreenState;

  // NEW: Staff Prompt State
  staffPrompt?: StaffPrompt;
}
```

---

## File Structure

### Files to Create

| File                                                                        | Purpose                       |
| --------------------------------------------------------------------------- | ----------------------------- |
| Standalone staff-prompt helper code                                         | Removed; active UI reads Today summary data only |
| `src/components/templates/main-app/today/components/StaffPromptSection.tsx` | UI component                  |

### Files to Modify

| File                                                | Changes                                 |
| --------------------------------------------------- | --------------------------------------- |
| `src/types/campaigns.ts`                            | Add `StaffPrompt` interface + constants |
| `src/database/campaigns/index.ts`                   | Add to sync function                    |
| `src/components/templates/main-app/today/index.tsx` | Render StaffPromptSection               |

---

## Implementation Phases

### Phase 1: Types & Eligibility (Day 1)

| Task                                             | Status | Notes                       |
| ------------------------------------------------ | ------ | --------------------------- |
| Add `StaffPrompt` interface to campaigns.ts      | [ ]    | Include inertia tracking    |
| Add `STAFF_PROMPT_CONFIDENCE_THRESHOLD` constant | [ ]    | 0.8                         |
| Add `STAFF_PROMPT_INERTIA` constants             | [ ]    | 3 days min, 2 days/week max |
| Standalone staff-prompt helper code              | Removed | Deleted June 1, 2026 because it was not used by active runtime |

### Phase 2: Backend Integration (Day 2)

| Task                                     | Status | Notes                        |
| ---------------------------------------- | ------ | ---------------------------- |
| Add `staffPrompt` field to sync function | [ ]    | In campaign daily sync       |
| Implement eligibility check in sync      | [ ]    | Call eligibility.ts          |
| Implement inertia enforcement            | [ ]    | Call inertia.ts              |
| Add runtime availability check           | [ ]    | Before returning to frontend |

### Phase 3: Frontend (Day 3)

| Task                            | Status | Notes              |
| ------------------------------- | ------ | ------------------ |
| Create `StaffPromptSection.tsx` | [ ]    | Read-only display  |
| Integrate into Today tab        | [ ]    | Below primary card |
| Test eligibility gates          | [ ]    | Manual testing     |
| Test inertia rules              | [ ]    | Multi-day testing  |

---

## Code Implementation

### 1. Eligibility Logic (historical, removed from active code)

```typescript
type MenuItemForCampaign = {
  available: boolean;
  name: string;
  price?: number | string;
};

import {
  TodayCampaignSummary,
  STAFF_PROMPT_CONFIDENCE_THRESHOLD,
  STAFF_PROMPT_INERTIA,
} from "@type/campaigns";

interface EligibilityInput {
  primary: TodayCampaignSummary | undefined;
  item: MenuItemForCampaign | undefined;
  stableDays: number;
  validatedOnSurfaces: (
    | "decision_blocks"
    | "digital_screen"
    | "physical_surface"
  )[];
  stockOutsLast7Days: number;
  modifierCount: number;
  isAlcoholic: boolean;
}

interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Check if an item qualifies for Staff Prompt
 * Per spec: Highest confidence gate of all surfaces
 */
export function checkStaffPromptEligibility(
  input: EligibilityInput
): EligibilityResult {
  const {
    primary,
    item,
    stableDays,
    validatedOnSurfaces,
    stockOutsLast7Days,
    modifierCount,
    isAlcoholic,
  } = input;

  // Gate 1: Must have a primary campaign
  if (!primary) {
    return { eligible: false, reason: "no_primary_campaign" };
  }

  // Gate 2: Confidence threshold (0.8)
  if (primary.confidence < STAFF_PROMPT_CONFIDENCE_THRESHOLD) {
    return { eligible: false, reason: "confidence_below_threshold" };
  }

  // Gate 3: Stability (10+ days)
  if (stableDays < STAFF_PROMPT_INERTIA.STABILITY_DAYS_REQUIRED) {
    return { eligible: false, reason: "insufficient_stability" };
  }

  // Gate 4: Prior validation on other surfaces
  if (validatedOnSurfaces.length === 0) {
    return { eligible: false, reason: "not_validated_on_surfaces" };
  }

  // Gate 5: Item must be available
  if (!item?.available) {
    return { eligible: false, reason: "item_unavailable" };
  }

  // Gate 6: No stock volatility (0 stock-outs in 7 days)
  if (stockOutsLast7Days > 0) {
    return { eligible: false, reason: "stock_volatility" };
  }

  // Gate 7: No alcohol
  if (isAlcoholic) {
    return { eligible: false, reason: "alcoholic_item" };
  }

  // Gate 8: Modifier complexity (max 3)
  if (modifierCount > 3) {
    return { eligible: false, reason: "too_many_modifiers" };
  }

  return { eligible: true };
}

/**
 * Generate the staff prompt text
 * Per spec: ONE immutable sentence structure
 */
export function generateStaffPromptText(itemName: string): string {
  return `Most people take the ${itemName}.`;
}
```

### 2. Inertia Logic (historical, removed from active code)

```typescript
import { StaffPrompt, STAFF_PROMPT_INERTIA } from "@type/campaigns";

interface InertiaInput {
  currentPrompt: StaffPrompt | undefined;
  newItemId: string;
  today: string; // "YYYY-MM-DD"
}

interface InertiaResult {
  shouldShow: boolean;
  updatedInertia: StaffPrompt["inertia"];
}

/**
 * Get Monday of the week for a given date
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Calculate if prompt should show based on inertia rules
 * Per spec: 3 days min, max 2 days/week
 */
export function calculateInertia(input: InertiaInput): InertiaResult {
  const { currentPrompt, newItemId, today } = input;
  const weekMonday = getWeekMonday(today);

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

  const inertia = currentPrompt.inertia;

  // Different item - check if we can switch
  if (currentPrompt.itemId !== newItemId) {
    // Can only switch if current item has shown for MIN_CONSECUTIVE_DAYS
    if (inertia.consecutiveDays < STAFF_PROMPT_INERTIA.MIN_CONSECUTIVE_DAYS) {
      // Continue with current item, don't switch
      return {
        shouldShow: true,
        updatedInertia: {
          ...inertia,
          consecutiveDays: inertia.consecutiveDays + 1,
          weekAppearances:
            inertia.weekStartDate === weekMonday
              ? inertia.weekAppearances + 1
              : 1,
          weekStartDate: weekMonday,
        },
      };
    }
    // Can switch - start fresh with new item
    return {
      shouldShow: true,
      updatedInertia: {
        startDate: today,
        consecutiveDays: 1,
        weekAppearances:
          inertia.weekStartDate === weekMonday
            ? inertia.weekAppearances + 1
            : 1,
        weekStartDate: weekMonday,
      },
    };
  }

  // Same item - check weekly limit
  const weekAppearances =
    inertia.weekStartDate === weekMonday ? inertia.weekAppearances : 0;

  if (weekAppearances >= STAFF_PROMPT_INERTIA.MAX_DAYS_PER_WEEK) {
    // Already shown max times this week
    return {
      shouldShow: false,
      updatedInertia: inertia, // Keep as-is
    };
  }

  // Can show
  return {
    shouldShow: true,
    updatedInertia: {
      ...inertia,
      consecutiveDays: inertia.consecutiveDays + 1,
      weekAppearances: weekAppearances + 1,
      weekStartDate: weekMonday,
    },
  };
}
```

### 3. Frontend Component (`StaffPromptSection.tsx`)

```typescript
"use client";

import { StaffPrompt } from "@type/campaigns";
import { Card, Typography } from "antd";
import { LuMessageCircle } from "react-icons/lu";

const { Text, Title } = Typography;

interface StaffPromptSectionProps {
  staffPrompt: StaffPrompt | undefined;
}

/**
 * Staff Prompt Section
 * Per spec: Read-only, no buttons, no settings
 * Appears only when eligible
 */
export default function StaffPromptSection({
  staffPrompt,
}: StaffPromptSectionProps) {
  // Don't render if not eligible
  if (!staffPrompt?.eligible) return null;

  return (
    <Card
      size="small"
      style={{
        marginTop: 16,
        background: "#fafafa",
        borderLeft: "3px solid #1890ff",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <LuMessageCircle size={20} style={{ color: "#1890ff", marginTop: 2 }} />
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Staff prompt for today
          </Text>
          <Title level={5} style={{ margin: "4px 0 0 0" }}>
            Say this when customers ask:
          </Title>
          <Text
            strong
            style={{
              fontSize: 16,
              display: "block",
              marginTop: 8,
              fontStyle: "italic",
            }}
          >
            &quot;{staffPrompt.text}&quot;
          </Text>
          <Text
            type="secondary"
            style={{ fontSize: 11, marginTop: 8, display: "block" }}
          >
            Applies today
          </Text>
        </div>
      </div>
    </Card>
  );
}
```

### 4. Integration in Today Tab

Add to `src/components/templates/main-app/today/index.tsx`:

```typescript
import StaffPromptSection from "./components/StaffPromptSection";

// In the render function, after PrimaryCard:
{
  todayCampaigns?.staffPrompt && (
    <StaffPromptSection staffPrompt={todayCampaigns.staffPrompt} />
  );
}
```

---

## Security & Validation

### Security Checklist

| Check                  | Implementation                        |
| ---------------------- | ------------------------------------- |
| No staff-facing data   | ✅ Data stays in owner's Today tab    |
| No confidence exposure | ✅ Never shown in UI                  |
| No override capability | ✅ Read-only component, no buttons    |
| Session required       | ✅ Today tab requires authentication  |
| Tenant isolation       | ✅ Uses existing campaign summary doc |

### Rate Limiting

No new rate limiting needed — uses existing campaign sync.

---

## Firebase Cost Impact

| Operation          | Frequency    | Cost Impact |
| ------------------ | ------------ | ----------- |
| Staff prompt read  | 1/day (sync) | Zero        |
| Staff prompt write | 1/day (sync) | Zero        |
| Additional storage | ~200 bytes   | Negligible  |

**Total:** Zero additional cost — reuses existing `CampaignsSummaryDocument`.

---

## Testing Guide

### Manual Test Cases

| Test Case                           | Expected Result                     |
| ----------------------------------- | ----------------------------------- |
| Item confidence < 0.8               | Prompt does not appear              |
| Item stable for 5 days              | Prompt does not appear (needs 10)   |
| Item stable for 10+ days, conf 0.8+ | Prompt appears                      |
| Same item for 3 days                | Same prompt text                    |
| New item eligible on day 2          | Old prompt continues (inertia)      |
| Shown 2 times this week             | Does not appear rest of week        |
| Item becomes unavailable            | Prompt disappears (no substitution) |
| Owner asks support "why this?"      | Support uses standard response      |

### Testing Commands

```bash
# Verify types compile
npm run type-check

# Run dev server and check Today tab
npm run dev
```

---

## Validation Report

| Requirement                  | Status | Evidence                             |
| ---------------------------- | ------ | ------------------------------------ |
| Uses existing campaign types | ✅     | Extends CampaignsSummaryDocument     |
| Frontend-first approach      | ✅     | Backend only for eligibility calc    |
| No new API routes            | ✅     | Uses existing campaign sync          |
| Read-only UI                 | ✅     | No buttons in StaffPromptSection     |
| Follows DAL patterns         | ✅     | Uses existing database functions     |
| Follows component patterns   | ✅     | Matches existing Today tab structure |

---

## Progress Tracking

| Phase                 | Status      | Completion Date |
| --------------------- | ----------- | --------------- |
| Types & Constants     | [ ] Pending | —               |
| Eligibility Logic     | [ ] Pending | —               |
| Inertia Logic         | [ ] Pending | —               |
| Backend Integration   | [ ] Pending | —               |
| Frontend Component    | [ ] Pending | —               |
| Integration Testing   | [ ] Pending | —               |
| Support Team Training | [ ] Pending | —               |

---

**Document Status:** 🔧 DEV-READY  
**Estimated Effort:** 3 days  
**Priority:** P1

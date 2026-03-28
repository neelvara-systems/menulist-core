# 📄 DOCUMENT 4: IMPLEMENTATION BLUEPRINT

**File Name:** 04-IMPLEMENTATION-BLUEPRINT.md  
**Last Updated:** 2026-01-11  
**Status:** 🔒 LOCKED — Production Ready  
**Audience:** Engineers (Day-to-Day Reference)

---

## 1. FILE STRUCTURE (CANONICAL)

```
src/
├── app/
│   ├── (main)/
│   │   ├── today/
│   │   │   └── page.tsx
│   │   ├── projects/
│   │   └── dashboard/
│   └── api/
│       ├── today/
│       ├── campaigns/
│       ├── decision-blocks/
│       └── screens/
│
├── components/
│   └── templates/
│       └── main-app/
│           ├── today/
│           │   ├── index.tsx
│           │   ├── CampaignCard.tsx
│           │   ├── StaffPrompt.tsx
│           │   └── ExecutionSurface.tsx
│           ├── screens/
│           └── physical-surfaces/
│
├── lib/
│   ├── campaigns/
│   │   ├── engine.ts
│   │   ├── scoring.ts
│   │   ├── selection.ts
│   │   └── types.ts
│   ├── staff-prompt/
│   │   ├── eligibility.ts
│   │   ├── inertia.ts
│   │   └── generator.ts
│   ├── physical-surfaces/
│   │   ├── generator.ts
│   │   └── templates.ts
│   └── screens/
│       ├── slideBuilder.ts
│       └── cache.ts
│
├── database/
│   ├── campaigns/
│   │   └── index.ts
│   ├── analytics/
│   └── summary/
│
├── types/
│   ├── campaigns.ts
│   ├── staffPrompt.ts
│   └── screens.ts
│
└── config/
    ├── features.ts
    ├── thresholds.ts
    └── constants.ts
```

---

## 2. CONSTANTS & THRESHOLDS (EXACT)

### Confidence Thresholds

```typescript
// config/thresholds.ts

export const CONFIDENCE_THRESHOLDS = {
  CAMPAIGNS: 0.6,
  DECISION_BLOCKS: 0.65,
  DIGITAL_SCREENS: 0.7,
  PHYSICAL_SURFACES_TENT: 0.7,
  PHYSICAL_SURFACES_STICKER: 0.8,
  STAFF_PROMPT: 0.8,
} as const;

export const CONFIDENCE_TIERS = {
  VERY_HIGH: 0.8,
  HIGH: 0.65,
  MODERATE: 0.5,
  LOW: 0.35,
  VERY_LOW: 0.0,
} as const;
```

### Staff Prompt Constants

```typescript
// config/staffPrompt.ts

export const STAFF_PROMPT_CONFIG = {
  MIN_STABILITY_DAYS: 10,
  MIN_CONSECUTIVE_DAYS: 3,
  MAX_DAYS_PER_WEEK: 2,
  MAX_MODIFIERS: 3,
  PROMPT_TEMPLATE: "Most people take the ___.",
} as const;
```

### Digital Screen Constants

```typescript
// config/screens.ts

export const SCREEN_CONFIG = {
  SLIDE_DURATION_MS: 8000,
  MAX_CAMPAIGN_SLIDES: 5,
  MAX_OWNER_UPLOADS: 3,
  UPLOAD_EXPIRY_DAYS: 14,
  CACHE_TTL_MS: 300000, // 5 minutes
} as const;
```

### Physical Surface Constants

```typescript
// config/physicalSurfaces.ts

export const PHYSICAL_SURFACE_CONFIG = {
  TENT_CARD: {
    SIZE: "A5",
    MIN_CONFIDENCE: 0.7,
  },
  COUNTER_STICKER: {
    SIZE: "8x8cm",
    MIN_CONFIDENCE: 0.8,
  },
} as const;
```

---

## 3. TYPE DEFINITIONS (CANONICAL)

### Campaign Types

```typescript
// types/campaigns.ts

export interface Campaign {
  id: string;
  type: CampaignType;
  itemId: string;
  confidence: number;
  status: "eligible" | "active" | "skipped" | "completed";
  eligibleSurfaces: ExecutionSurface[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export type CampaignType =
  | "meal_push"
  | "bestseller_boost"
  | "slow_item_rescue"
  | "festival_spike"
  | "new_item_launch"
  | "todays_special"
  | "weekend_pick"
  | "now_available"
  | "menu_highlight";

export type ExecutionSurface =
  | "whatsapp_status"
  | "whatsapp_message"
  | "printable_poster"
  | "qr_tent"
  | "digital_screen";
```

### Staff Prompt Types

```typescript
// types/staffPrompt.ts

export interface StaffPrompt {
  itemId: string;
  itemName: string;
  promptText: string; // "Most people take the ___."
  confidence: number;
  stabilityDays: number;
  consecutiveDays: number;
  availableNow: boolean;
  lastUpdated: Timestamp;
}

export interface StaffPromptEligibility {
  eligible: boolean;
  gates: {
    confidence: boolean;
    stability: boolean;
    priorValidation: boolean;
    availability: boolean;
    stockVolatility: boolean;
    alcoholRestriction: boolean;
    modifierCount: boolean;
    runtimeCheck: boolean;
  };
  failedGate?: string;
}
```

### Summary Document Type

```typescript
// types/summary.ts

export interface CampaignsSummaryDocument {
  storeId: string;
  today: {
    primary: Campaign | null;
    operational: Campaign[];
  };
  staffPrompt: StaffPrompt | null;
  screen: {
    slides: ScreenSlide[];
    lastUpdated: Timestamp;
  };
  stats: {
    totalCampaigns: number;
    activeStreak: number;
    lastActivity: Timestamp;
  };
  updatedAt: Timestamp;
}
```

---

## 4. SCORING FORMULAS (EXACT)

### Decision Blocks

```typescript
// lib/campaigns/scoring.ts

export function calculatePopularScore(item: MenuItemForCampaign): number {
  return (
    0.4 * normalize(item.clicks7d) +
    0.3 * normalize(item.pageViews7d) +
    0.2 * normalize(item.engagementRate) +
    0.1 * normalize(item.decisionBlockClicks7d)
  );
}

export function calculateQuickPickScore(item: MenuItemForCampaign): number {
  return (
    0.35 * normalize(item.prepTimeFactor) +
    0.35 * normalize(item.orderFrequency) +
    0.15 * normalize(item.clicks7d) +
    0.15 * normalize(item.engagementRate)
  );
}

export function calculateBestValueScore(item: MenuItemForCampaign): number {
  return (
    0.4 * normalize(item.valueRatio) +
    0.3 * normalize(item.orderVolume) +
    0.2 * normalize(item.clicks7d) +
    0.1 * normalize(item.engagementRate)
  );
}
```

### Confidence Calculation

```typescript
// lib/campaigns/engine.ts

export function calculateConfidence(
  item: MenuItemForCampaign,
  context: ProjectContext
): number {
  const recencyDecay = getProjectRecencyDecay(context);

  const rawScore =
    0.35 * normalize(item.clicks7d) +
    0.25 * normalize(item.pageViews7d) +
    0.2 * normalize(item.engagementRate) +
    0.1 * normalize(item.orderFrequency) +
    0.1 * stabilityBonus(item.stabilityDays);

  return rawScore * recencyDecay;
}
```

### Staff Prompt Eligibility

```typescript
// lib/staff-prompt/eligibility.ts

export function checkStaffPromptEligibility(
  item: MenuItemWithIntelligence,
  context: StaffPromptContext
): StaffPromptEligibility {
  const gates = {
    confidence: item.confidence >= CONFIDENCE_THRESHOLDS.STAFF_PROMPT,
    stability: item.stabilityDays >= STAFF_PROMPT_CONFIG.MIN_STABILITY_DAYS,
    priorValidation: item.validatedOnSurfaces.length > 0,
    availability: item.available,
    stockVolatility: !item.hasStockVolatility7d,
    alcoholRestriction: !item.isAlcoholic,
    modifierCount: item.modifierCount <= STAFF_PROMPT_CONFIG.MAX_MODIFIERS,
    runtimeCheck: checkRuntimeAvailability(item, context),
  };

  const failedGate = Object.entries(gates).find(([, v]) => !v)?.[0];

  return {
    eligible: Object.values(gates).every(Boolean),
    gates,
    failedGate,
  };
}
```

---

## 5. API CONTRACTS (EXACT)

### GET /api/today

**Request:**

```
GET /api/today
Authorization: Bearer {token}
```

**Response:**

```typescript
{
  today: {
    primary: Campaign | null,
    operational: Campaign[]
  },
  staffPrompt: StaffPrompt | null,
  stats: {
    totalCampaigns: number,
    activeStreak: number
  }
}
```

### POST /api/campaigns/{id}/complete

**Request:**

```typescript
{
  surface: ExecutionSurface,
  exportedAt: string // ISO timestamp
}
```

**Response:**

```typescript
{
  success: boolean,
  campaignId: string,
  status: 'completed'
}
```

### POST /api/campaigns/{id}/skip

**Request:**

```typescript
{
  reason?: string // Optional, not exposed
}
```

**Response:**

```typescript
{
  success: boolean,
  campaignId: string,
  status: 'skipped'
}
```

---

## 6. DATABASE ACCESS PATTERNS

### Summary Document Read (Most Common)

```typescript
// database/summary/index.ts

export async function getTodaySummary(
  storeId: string
): Promise<CampaignsSummaryDocument> {
  const docRef = doc(db, "platformSummary", `campaigns_${storeId}`);
  const snapshot = await getDoc(docRef);
  return snapshot.data() as CampaignsSummaryDocument;
}
```

### Campaign Write

```typescript
// database/campaigns/index.ts

export async function updateCampaignStatus(
  tenantId: string,
  storeId: string,
  campaignId: string,
  status: CampaignStatus
): Promise<void> {
  const docRef = doc(db, "campaigns", tenantId, storeId, campaignId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}
```

---

## 7. FEATURE FLAGS

```typescript
// config/features.ts

export const FEATURE_FLAGS = {
  // Core features (locked ON)
  CMI_ENABLED: true,
  DECISION_BLOCKS_ENABLED: true,
  DIGITAL_SCREENS_ENABLED: true,
  PHYSICAL_SURFACES_ENABLED: true,
  STAFF_PROMPT_ENABLED: true,
  SOCIAL_CONTENT_ENABLED: true,

  // Capability toggles (allowed to change)
  DIRECT_POSTING_ENABLED: false,
  OUTCOME_FRAMING_ENABLED: false,
  LEARNED_MODEL_ENABLED: false, // vs heuristic

  // Debug (dev only)
  DEBUG_CONFIDENCE_SCORES: false,
  DEBUG_ELIGIBILITY_GATES: false,
} as const;
```

---

## 8. ENVIRONMENT SETUP

### Required Environment Variables

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT=

# Gemini AI
GEMINI_API_KEY=

# Vercel
VERCEL_ENV=production

# Sentry
SENTRY_DSN=
```

### Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

---

## 9. DEPLOYMENT CHECKLIST

### Pre-Deploy

- [ ] All tests pass
- [ ] Feature flags verified
- [ ] Environment variables set
- [ ] Summary document schema unchanged

### Deploy

```bash
# Production deployment
vercel --prod
```

### Post-Deploy

- [ ] Smoke test Today tab
- [ ] Verify summary document reads
- [ ] Check Sentry for errors
- [ ] Monitor Firebase usage

---

## 10. ROLLBACK PROCEDURE

### Immediate Rollback

```bash
# Revert to previous deployment
vercel rollback
```

### Feature Flag Rollback

```typescript
// Disable specific feature
STAFF_PROMPT_ENABLED: false;
```

### Data Rollback

```
❌ NOT ALLOWED
Data rollbacks require CEO approval and manual intervention.
```

---

## 11. MONITORING HOOKS

### Sentry Integration

```typescript
// All API routes
try {
  // ...
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: "today", storeId },
  });
  throw error;
}
```

### Firebase Logs

```typescript
// Cloud Functions
functions.logger.info("CMI run complete", {
  storesProcessed: count,
  duration: ms,
});
```

---

## 12. ANTI-PATTERNS (DO NOT DO)

| Anti-Pattern        | Correct Approach         |
| ------------------- | ------------------------ |
| Join queries        | Summary doc pattern      |
| Runtime AI calls    | Precomputed intelligence |
| Expose confidence   | Render decisions only    |
| Add new collections | Use existing collections |
| Client-side scoring | Server-side precompute   |

---

## Cross-References

- Features → [DOC2-FEATURE-CATALOG]
- Architecture → [DOC3-ARCHITECTURE-BLUEPRINT]
- Verification → [DOC5-PRODUCTION-VERIFICATION]
- Operations → [DOC7-OPERATIONAL-RUNBOOK]

---

_Document Status: ✅ COMPLETE_

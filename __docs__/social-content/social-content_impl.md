# Social Content Implementation Plan

> **Document Status:** Implemented source evidence; not current launch certification
> **Created:** Jan 3, 2026  
> **Strategy Doc:** [social-content-product-strategy.md](./social-content-product-strategy.md) (FROZEN)
> **3-Year Architecture Freeze:** YES - No re-architecture for 3+ years after launch  
> **Implementation Status:** August 1, 2026 - Today live. Weekly Growth Pack code exists but is paused behind a disabled flag. Today action and weekly-pack copy diagnostics are bounded, campaign copy success requires Clipboard API success or acknowledged textarea fallback success, and campaign caption generation requires menu output permission plus exact supplied-project ownership before AI capacity/provider work. Caption provider output is projected to the declared public DTO.

> **Launch boundary:** This implementation note is social-content source evidence, not current production certification. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, target feature-flag/provider review, Today/mobile/browser QA, campaign AI provider smoke where enabled, and deploy evidence for the target environment.

## July 29, 2026 - Weekly Growth Pack Runtime Input Boundary

The paused Weekly Growth Pack now runtime-projects the already-loaded
store/project/campaign truth before constructing owner copy. Business, project,
campaign subject, staff, status, timing, inactive-item and URL values accept
only their governed scalar/array shapes; persisted accessors are not executed,
strings and counts are bounded, and only credential-free public HTTPS menu URLs
reach WhatsApp, Google, Instagram or public-link output. Malformed state falls
back to the existing neutral copy instead of throwing or exposing object
coercions. Clipboard input containing only whitespace fails as `empty_text`.

Verification: `npm run test:today-weekly-growth-pack-boundary`,
`npm run verify:owner-dashboard-today-boundary`, and
`npm run verify:public-business-truth`.

Firebase cost impact: `$0.00`. The repair remains a pure already-loaded
projection/browser copy path and adds no read, write, provider, cache, rule,
index, Function or deployment behavior.

## June 29, 2026 - Today WhatsApp Handoff Hardening

Today campaign WhatsApp actions keep the same owner flow: build the generated WhatsApp message, try to open WhatsApp, and fall back to copying the message. The handoff opens the generated URL with `noopener,noreferrer` and records a bounded `today_campaign_whatsapp_open_failed` diagnostic if the browser blocks or throws before the clipboard fallback completes. Copy success requires Clipboard API success or acknowledged textarea fallback success; browsers that expose Clipboard API but reject writes fall through to the textarea fallback before failure.

| Layer | File | Diagnostic contract |
| --- | --- | --- |
| Surface executor | `src/lib/campaigns/todayActionExecutor.ts` | Opens generated WhatsApp URLs with `noopener,noreferrer`; logs blocked/thrown opens with bounded surface/item/message/share-URL metadata only; copy failures add clipboard/fallback support booleans. |

Verification: `npm run verify:public-business-truth`.

Firebase cost impact: `$0.00`. This changes only browser-local WhatsApp handoff flags and failure diagnostics, and adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, provider calls, or owner-facing settings.

## June 29, 2026 - Weekly Growth Pack Copy Diagnostics

The Weekly Growth Pack remains paused, but its desktop and mobile copy actions now use the shared campaign diagnostic boundary when copying fully fails.

| Layer | File | Diagnostic contract |
| --- | --- | --- |
| Shared copy helper | `src/lib/today/weeklyGrowthPack.ts` | Contains Clipboard API and textarea-copy failures, reports controlled failure stage, and builds bounded copy context. |
| Desktop weekly pack | `src/components/templates/main-app/today/components/WeeklyGrowthPack/index.tsx` | Logs `today_weekly_growth_pack_copy_failed` before showing the existing manual-copy fallback. |
| Mobile weekly pack | `src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx` | Logs `today_weekly_growth_pack_copy_failed` before showing the existing manual-copy fallback. |

The diagnostic context records only asset id/title/destination/copy and primary-subject presence/length metadata, counts, clipboard/fallback support booleans, controlled failure stage, and normalized source error name/code/status. It must not log raw generated copy, menu links, owner-entered text, or browser exception payloads.

Verification: `npm run verify:public-business-truth`.

Firebase cost impact: `$0.00`. This changes only failed browser-local copy diagnostics and adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, provider calls, or owner-facing settings.

## June 27, 2026 - Today Campaign Diagnostic Hardening

The Today action flow keeps the same owner behavior and data flow, but failure diagnostics are no longer raw browser console output.

| Layer | File | Diagnostic contract |
| --- | --- | --- |
| Shared helper | `src/lib/campaigns/campaignDiagnostics.ts` | Normalized failure codes, bounded presence/length metadata, source error name/code/status. |
| Desktop action screen | `src/components/templates/main-app/today/index.tsx` | Bounds action-flow and skip-flow failures. |
| Action hook | `src/components/templates/main-app/today/hooks/useCampaignActions.ts` | Bounds complete/skip DAL failures. |
| Mobile Today host | `src/components/mobile/screens/MobileHoursScreen.tsx` | Bounds mobile campaign complete/skip, close-today, hours update, temporary-status set/clear, tent-card, and sticker failures. |
| Mobile owner helper | `src/components/mobile/utils/mobileOwnerDiagnostics.ts` | Bounds mobile owner mutation and download failures outside the campaign helper. |
| Surface executor | `src/lib/campaigns/todayActionExecutor.ts` | Bounds project-link build and WhatsApp clipboard fallback failures. |
| Export/download surfaces | `src/lib/campaigns/executionSurfaces.ts` | Bounds WhatsApp status, message copy, poster, QR tent, and digital-screen download failures. Image share/download reads use one browser helper that allows expected image URL shapes, fetches with manual redirect handling, and checks response status, content type, content length, blob type, and blob size before file creation. Copy helpers fall through from rejected Clipboard API writes to acknowledged textarea fallback and record clipboard/fallback support booleans on failed copy diagnostics. |

The diagnostics must not include raw campaign IDs, project IDs, item names, menu links, image URLs, captions, owner-entered text, or browser/provider exception objects.

### Verification

- `npm run verify:public-business-truth` checks the helper, failure codes, no direct `console.*` calls, removal of old raw diagnostic strings, and the campaign image fetch helper contract.
- Targeted raw-console sweeps should stay clean for `src/components/templates/main-app/today`, `src/components/mobile/screens/MobileHoursScreen.tsx`, and `src/lib/campaigns` after this pass.

### Cost Impact

Firebase cost impact: `$0.00`. This changes only failed owner campaign diagnostics and adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, provider calls, or owner-facing settings.

## May 31, 2026 - Weekly Growth Pack Wedge

The GrowthOS planning review was implemented only as a MenuList Today enhancement. It does not create GrowthOS as a separate product.

### Product Pause

Do not freeze or roll out this wedge as a main feature yet.

The owner-value review found that the idea is directionally useful but not proven enough to become a launch feature. It may help owners only if it behaves as a small optional action after Today confirms the business truth is ready. As a standalone weekly pack, it risks feeling like a side marketing feature.

Revisit gate:

- A pilot group of real owners uses it without explanation.
- Owners copy/share at least one output during the session.
- The feature remains secondary to Today truth readiness.
- Critical fixes still outrank growth copy.
- The feature stays inside Today unless GrowthOS Stage 2 is explicitly unlocked.

| Layer | File | Decision |
| --- | --- | --- |
| Feature flag | `src/config/features.ts` | `ENABLE_TODAY_WEEKLY_GROWTH_PACK` defaults to `false` and remains paused. |
| Shared builder | `src/lib/today/weeklyGrowthPack.ts` | Deterministic copy from current MenuList truth. |
| Desktop UI | `src/components/templates/main-app/today/components/WeeklyGrowthPack/` | Shows ready actions plus copy-ready outputs inside `/today`. |
| Mobile UI | `src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx` | Same pack in the real mobile Today tab. |
| Mobile host | `src/components/mobile/screens/MobileHoursScreen.tsx` | Current mobile Today tab surface. |

### Boundaries

- No new route or product shell.
- No direct publishing.
- No provider call.
- No scheduler.
- No new Firestore write path.
- No public truth changes outside existing MenuList-owned flows.

### Cost Impact

Firebase cost impact: `$0.00`. The pack uses already-loaded Today/store/project data and browser clipboard copy only.

## Pre-Launch Fixes Applied (Jan 4, 2026)

| Fix                     | Before               | After                                     |
| ----------------------- | -------------------- | ----------------------------------------- |
| mealName in PrimaryCard | Hardcoded "Lunch"    | Time-based (Breakfast/Lunch/Snack/Dinner) |
| festivalName            | Hardcoded "Festival" | Generic "the occasion"                    |

**File Modified:** `src/components/.../today/components/PrimaryCard/index.tsx`

### License/Status Handling

Digital screen feature checks `active`/`blocked` flags on every request:

- If store is inactive or blocked → Screen returns 404
- Simple fetch approach (no caching complexity)

See: `__docs__/digital-screens/digital-screens_impl.md` for full details.

---

## Table of Contents

1. [Analysis: ChatGPT vs Strategy Doc](#analysis-chatgpt-vs-strategy-doc)
2. [My Recommendations & Disagreements](#my-recommendations--disagreements)
3. [Final Architecture Decisions](#final-architecture-decisions)
4. [Database Schema](#database-schema)
5. [UI/UX Implementation](#uiux-implementation)
6. [Implementation Phases](#implementation-phases)
7. [File Structure](#file-structure)
8. [Implementation Checklist](#implementation-checklist)
9. [Progress Tracking](#progress-tracking)

---

## Analysis: ChatGPT vs Strategy Doc

### Summary of ChatGPT's Recommendations

| Area                     | ChatGPT Recommendation                                                                | ChatGPT Part |
| ------------------------ | ------------------------------------------------------------------------------------- | ------------ |
| Navigation               | "Today" as top-level sidebar item                                                     | Part 4       |
| Navigation (conflicting) | Feature lives inside Project as "Today" tab                                           | Part 1       |
| Today Screen             | Single action, silence allowed, one card                                              | Part 2       |
| Backend                  | 5 collections: campaigns, campaign_steps, social_assets, exports, menu_activity_daily | Part 3       |
| Attribution              | Tag menu links with campaignId, but never expose to owner                             | Part 3       |
| History                  | Read-only activity log, no metrics                                                    | Part 3       |
| Firebase Cost            | 1 read for Today; complete uses 3 atomic writes and skip uses 2 atomic writes, with idempotent retry guards | Part 3       |

### Our Frozen Strategy Doc Has (ChatGPT Missed)

| Feature                       | Strategy Doc                                                 | ChatGPT Addressed? |
| ----------------------------- | ------------------------------------------------------------ | ------------------ |
| **Capability Flags**          | Full system with modes (heuristic/learned, minimal/standard) | ❌ No              |
| **Output Intent Abstraction** | 3 intents → surface mapping                                  | ❌ No              |
| **Menu Highlight Fallback**   | 4th passive campaign (evergreen)                             | ❌ No              |
| **Confidence Gate**           | Formalized thresholds (0.6, 0.3, 0.0)                        | ⚠️ Partial         |
| **4 Passive Campaigns**       | todays_special, weekend_pick, now_available, menu_highlight  | ⚠️ Only 3          |
| **5 Execution Surfaces**      | All 5 defined                                                | ✅ Yes             |
| **Non-Comparative Outcomes**  | "Compared to what?" test                                     | ❌ No              |

---

## My Recommendations & Disagreements

### 1️⃣ Navigation: TOP-LEVEL "TODAY" ✅ AGREE (with ChatGPT Part 4)

**ChatGPT contradicted itself:**

- Part 1: "Feature lives inside Project"
- Part 4: "Today gets its own first-class slot"

**My Decision:** **TOP-LEVEL "Today" in sidebar** (Part 4 wins)

**Reasoning:**

- "Today" is a daily decision entry point, not a project feature
- Aligns with "What should I do today?" philosophy
- Our sidebar already has Dashboard, Projects, Help at top level
- Adding "Today" between Dashboard and Projects makes sense

**Implementation:**

```typescript
// src/constants/navigations.ts
export const SIDEBAR_DASHBOARD_LAYOUT: NavItemType[] = [
  {
    label: "Dashboard",
    route: NAVIGARIONS_ROUTINGS.DASHBOARD,
    icon: LuLayoutDashboard,
  },
  { label: "Today", route: NAVIGARIONS_ROUTINGS.TODAY, icon: LuCalendarCheck2 }, // NEW
  {
    label: "Projects",
    route: NAVIGARIONS_ROUTINGS.PROJECTS,
    icon: LuFolderHeart,
  },
  // ... rest unchanged
];
```

---

### 2️⃣ Database: DISAGREE with ChatGPT's 5 Collections

**ChatGPT suggested 5 collections:**

- campaigns
- campaign_steps
- social_assets
- exports
- menu_activity_daily

**My Concern:** This creates many Firebase reads.

**My Recommendation:** Use **Summary Document Pattern** (like we do for Projects)

**Our Pattern (from projects DAL):**

```typescript
// Single document holds summary for all campaigns
// Path: platformSummary/campaigns_{sId}
// 1 read to get all today's campaigns
```

**Proposed Collections (3 instead of 5):**

| Collection                               | Purpose                          | Read Pattern                |
| ---------------------------------------- | -------------------------------- | --------------------------- |
| `campaigns/{tId}/{sId}/{campaignId}`     | Full campaign data               | On-demand (editor, history) |
| `platformSummary/campaigns_{sId}`        | Today's active campaigns summary | 1 read for Today screen     |
| `campaignExports/{tId}/{sId}/complete_{campaignId}` | Deterministic completion marker and export ground truth | Same transaction as campaign + summary |

**Firebase Cost Savings:**

- Today screen: 1 read (vs potential N reads)
- History: 1 query with pagination
- No separate social_assets collection (embed in campaign)
- No separate campaign_steps collection (embed in campaign)

---

### 3️⃣ UI Hierarchy: AGREE with ChatGPT's States

**ChatGPT's 3 states are perfect:**

1. **Action Available** - One primary card + optional operational section
2. **No Action** - "Nothing to do right now." (silence = trust)
3. **Post-Action** - "You're done for today."

**My Addition:** Must implement Mobile-First with Ant Design

```tsx
// Use Ant Design Card, Button, Typography
// NOT plain HTML
<Card bordered={false} className={styles.todayCard}>
  <Typography.Title level={4}>Today's Special is ready</Typography.Title>
  <Typography.Text type="secondary">Butter Chicken</Typography.Text>
  <Typography.Text type="secondary">Available today</Typography.Text>

  <Button type="primary" block size="large">
    Share on WhatsApp Status
  </Button>
  <Button type="text" block>
    Skip
  </Button>
</Card>
```

---

### 4️⃣ Campaign Engine: MERGE ChatGPT + Strategy Doc

**ChatGPT's simplified Campaign type is good, but missing:**

- Output Intent abstraction
- Menu Highlight fallback
- Formalized confidence gate

**My Final Campaign Interface:**

```typescript
interface Campaign {
  id: string;
  projectId: string;

  // Kind + Type
  kind: "active" | "passive";
  type: CampaignType;

  // Subject
  subject: {
    itemId?: string;
    categoryId?: string;
  };

  // Output Intent (from strategy doc)
  intent: OutputIntent;
  primarySurface: ExecutionSurface;
  secondarySurfaces?: ExecutionSurface[];

  // Status
  status: "suggested" | "completed" | "skipped" | "suppressed";

  // Confidence Gate (formalized)
  confidence: {
    availabilityScore: number; // 0-1
    behaviorScore: number; // 0-1
    timingScore: number; // 0-1
    total: number; // product of above
  };

  // Timing
  createdOn: Timestamp;
  suggestedFor: string; // YYYY-MM-DD
  resolvedOn?: Timestamp;

  // Assets (embedded, not separate collection)
  assets?: {
    imageUrl?: string;
    caption?: string;
    generatedOn: Timestamp;
    source: "existing_image" | "generated_image";
  };

  // Outcome (active only, optional)
  outcome?: {
    signal: "positive" | "neutral" | "insufficient_data";
    observation: string; // Non-comparative!
    closure: string;
  };
}

type CampaignType =
  // Active (5)
  | "meal_push"
  | "bestseller_boost"
  | "slow_item_rescue"
  | "festival"
  | "new_item"
  // Passive (4)
  | "todays_special"
  | "weekend_pick"
  | "now_available"
  | "menu_highlight"; // IMPORTANT: Evergreen fallback

type OutputIntent =
  | "broadcast_attention" // WhatsApp Status, Instagram Story
  | "in_store_reinforcement" // Poster, QR Tent, Digital Screen
  | "direct_customer_notify"; // WhatsApp Message

type ExecutionSurface =
  | "whatsapp_status"
  | "whatsapp_message"
  | "print_poster"
  | "qr_tent"
  | "digital_screen";
```

---

### 5️⃣ Copy: AGREE - No Marketing Language

**ChatGPT's forbidden phrases are correct. Add to our list:**

```markdown
# Forbidden Phrases (from ChatGPT + Strategy Doc)

## Never Use:

- worked, boosted, increased, decreased
- analytics, AI, algorithm, model
- recommended, suggested, optimal
- best time, best performing
- compared to, more than usual (non-comparative rule!)
- campaign (in UI copy)

## Always Use:

- "is ready", "prepared", "available"
- "noticed", "interacted"
- "Good to note", "Nothing unusual"
```

---

### 6️⃣ Passive + Active Coexistence: AGREE with Strategy Doc

**ChatGPT said:** "Cannot coexist same day"

**Strategy Doc (corrected) says:** "One PRIMARY per day, passive can coexist as OPERATIONAL"

**My Implementation:**

```tsx
// Today screen structure
<div>
  {/* PRIMARY SECTION - Above the fold */}
  <PrimaryCard campaign={primaryCampaign} />

  {/* OPERATIONAL SECTION - Below the fold, smaller */}
  {operationalCampaigns.length > 0 && (
    <OperationalSection campaigns={operationalCampaigns} />
  )}

  {/* EMPTY STATE */}
  {!primaryCampaign && !operationalCampaigns.length && <EmptyState />}
</div>
```

---

## Final Architecture Decisions

### Navigation

```
Sidebar:
├── Dashboard
├── Today ⭐ (NEW - with dot indicator)
├── Projects
├── Users
├── QR Code
├── Business Settings
├── Transactions
├── Billing
├── Help
└── ...
```

### Database Collections

| Collection        | Path                                     | Purpose                   |
| ----------------- | ---------------------------------------- | ------------------------- |
| `campaigns`       | `campaigns/{tId}/{sId}/{campaignId}`     | Full campaign data        |
| `platformSummary` | `platformSummary/campaigns_{sId}`        | Today's campaigns summary |
| `campaignExports` | `campaignExports/{tId}/{sId}/{exportId}` | Export events             |

### Firebase Cost Strategy

| Operation         | Reads         | Writes                 |
| ----------------- | ------------- | ---------------------- |
| Load Today screen | 1             | 0                      |
| Complete campaign | 0             | 2 (campaign + summary) |
| Skip campaign     | 0             | 2 (campaign + summary) |
| View history      | 1 (paginated) | 0                      |
| Generate asset    | 0             | 1                      |

### Feature Flag Integration

```typescript
// src/config/features.ts
export const FEATURE_FLAGS = {
  // ... existing flags

  // Social Content Feature
  SOCIAL_CONTENT_ENABLED: true,
  SOCIAL_CONTENT_SMART_DISTRIBUTION: "heuristic" as "heuristic" | "learned",
  SOCIAL_CONTENT_OUTCOME_FRAMING: "minimal" as "minimal" | "standard",
  SOCIAL_CONTENT_IMAGE_GENERATION: "on_demand" as "off" | "on_demand",
  SOCIAL_CONTENT_DIRECT_POSTING: "disabled" as
    | "disabled"
    | "whatsapp_only"
    | "full",
} as const;
```

---

## Database Schema

### 1. Campaign Document

```typescript
// Path: campaigns/{tId}/{sId}/{campaignId}

interface CampaignDocument {
  // Identity
  id: string;
  projectId: string;
  tId: number;
  sId: number;

  // Type
  kind: "active" | "passive";
  type: CampaignType;

  // Subject
  subject: {
    itemId?: string;
    itemName?: string;
    categoryId?: string;
    categoryName?: string;
  };

  // Intent & Surface
  intent: OutputIntent;
  primarySurface: ExecutionSurface;
  secondarySurfaces: ExecutionSurface[];

  // Status
  status: CampaignStatus;

  // Confidence (internal)
  confidence: CampaignConfidence;

  // Timing
  suggestedFor: string; // "2026-01-03"
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;

  // Assets (embedded)
  assets?: {
    imageUrl?: string;
    caption?: string;
    whatsappMessage?: string;
    posterPdfUrl?: string;
    generatedAt?: Timestamp;
    source: "existing_image" | "generated_image";
  };

  // Outcome (active only)
  outcome?: CampaignOutcome;

  // Sequencing (for multi-day campaigns)
  sequence?: {
    totalSteps: number;
    currentStep: number;
    parentCampaignId?: string;
  };

  // Suppression
  skipCount: number;
  suppressedUntil?: Timestamp;
}
```

### 2. Campaign Summary Document

```typescript
// Path: platformSummary/campaigns_{sId}

interface CampaignsSummaryDocument {
  lastUpdated: Timestamp;

  // Today's campaigns (what Today screen needs)
  today: {
    primary?: TodayCampaignSummary;
    operational: TodayCampaignSummary[];
    isEmpty: boolean;
  };

  // Stats for confidence calculation
  stats: {
    totalCompleted: number;
    totalSkipped: number;
    lastCampaignDate?: string;
    typeSkipCounts: Record<CampaignType, number>;
  };
}

interface TodayCampaignSummary {
  campaignId: string;
  projectId: string;
  type: CampaignType;
  kind: "active" | "passive";
  subject: {
    itemId?: string;
    itemName?: string;
  };
  primarySurface: ExecutionSurface;
  status: CampaignStatus;
  confidence: number; // Just the total
}
```

### 3. Export Event Document

```typescript
// Path: campaignExports/{tId}/{sId}/{exportId}

interface CampaignExportDocument {
  id: string;
  campaignId: string;
  projectId: string;
  tId: number;
  sId: number;

  surface: ExecutionSurface;
  method: "whatsapp_share" | "download" | "copy_text";

  // Attribution (internal use only)
  menuLinkWithTracking?: string;

  exportedAt: Timestamp;
}
```

### Atomic complete and skip contract

`completeCampaign()` reads the scoped campaign, Today summary, and deterministic completion marker before writing. It rejects mismatched persisted tenant/store/project/type/surface data. The campaign status, export marker, and Today summary/stats then commit in one Firestore transaction. A matching completed campaign/marker is acknowledged without another export or counter increment; a completed legacy record with no marker fails closed for manual reconciliation.

`skipCampaign()` reads the campaign and summary in one transaction, validates tenant/store/type identity, and atomically updates campaign status/suppression plus Today summary/stats. Retrying an already skipped/suppressed campaign returns the persisted result without incrementing `skipCount`, `totalSkipped`, or `typeSkipCounts`. Non-suppressed writes explicitly delete any stale `suppressedUntil` field.

---

## UI/UX Implementation

### Component Structure

```
src/components/templates/main-app/today/
├── index.tsx                    # Main Today page
├── types.ts                     # TypeScript interfaces
├── styles.module.scss           # Styles
├── hooks/
│   ├── useTodayCampaigns.ts    # SWR hook for today's campaigns
│   └── useCampaignActions.ts   # Actions (complete, skip)
├── components/
│   ├── PrimaryCard/
│   │   ├── index.tsx
│   │   └── styles.module.scss
│   ├── OperationalSection/
│   │   ├── index.tsx
│   │   └── styles.module.scss
│   ├── EmptyState/
│   │   ├── index.tsx
│   │   └── styles.module.scss
│   ├── PostActionState/
│   │   ├── index.tsx
│   │   └── styles.module.scss
│   └── PastActivity/
│       ├── index.tsx
│       └── styles.module.scss
└── utils/
    ├── surfaceActions.ts        # WhatsApp share, poster download, etc.
    └── copyTemplates.ts         # Button copy per surface
```

### Today Screen States

#### State 1: Action Available (Primary)

```tsx
<div className={styles.todayContainer}>
  <Typography.Title level={2}>Today</Typography.Title>

  <Card className={styles.primaryCard}>
    <div className={styles.actionTitle}>
      <LuCheck /> Today's Special is ready
    </div>

    <Typography.Title level={3} className={styles.itemName}>
      Butter Chicken
    </Typography.Title>

    <Typography.Text type="secondary">Available today</Typography.Text>

    <Button type="primary" size="large" block onClick={handlePrimaryAction}>
      Share on WhatsApp Status
    </Button>

    <Button type="text" block onClick={handleSkip}>
      Skip
    </Button>
  </Card>

  {/* Operational section if exists */}
  {operational.length > 0 && <OperationalSection campaigns={operational} />}

  <Button type="link" className={styles.historyLink}>
    View past activity →
  </Button>
</div>
```

#### State 2: No Action (Empty)

```tsx
<div className={styles.todayContainer}>
  <Typography.Title level={2}>Today</Typography.Title>

  <div className={styles.emptyState}>
    <Typography.Text>Nothing to do right now.</Typography.Text>
  </div>
</div>
```

#### State 3: Post-Action

```tsx
<div className={styles.todayContainer}>
  <Typography.Title level={2}>Today</Typography.Title>

  <div className={styles.postActionState}>
    <LuCheck className={styles.checkIcon} />
    <Typography.Title level={4}>Shared</Typography.Title>
    <Typography.Text type="secondary">You're done for today.</Typography.Text>
  </div>
</div>
```

### Mobile Responsiveness

```scss
// styles.module.scss

.todayContainer {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.primaryCard {
  border-radius: 12px;

  :global(.ant-btn) {
    height: 48px;
    border-radius: 8px;
  }
}

.itemName {
  font-size: 28px;
  margin: 16px 0 8px;

  @media (max-width: 768px) {
    font-size: 24px;
  }
}
```

---

## Implementation Phases

### Week 1: Foundation (Days 1-3)

| Task                                                     | Priority | Status |
| -------------------------------------------------------- | -------- | ------ |
| Add `TODAY` route to navigations.ts                      | P0       | ⬜     |
| Create `src/app/(main)/today/page.tsx`                   | P0       | ⬜     |
| Add `CAMPAIGNS` and `CAMPAIGN_EXPORTS` to DB_COLLECTIONS | P0       | ⬜     |
| Create `src/database/campaigns/index.ts` (DAL)           | P0       | ⬜     |
| Create `src/types/campaigns.ts` (interfaces)             | P0       | ⬜     |
| Add feature flags to `src/config/features.ts`            | P0       | ⬜     |

### Week 1: Today Screen UI (Days 4-5)

| Task                                  | Priority | Status |
| ------------------------------------- | -------- | ------ |
| Create Today page component structure | P0       | ⬜     |
| Implement PrimaryCard component       | P0       | ⬜     |
| Implement EmptyState component        | P0       | ⬜     |
| Implement PostActionState component   | P0       | ⬜     |
| Add sidebar dot indicator for Today   | P1       | ⬜     |
| Mobile responsiveness                 | P0       | ⬜     |

### Week 2: Campaign Engine (Days 6-8)

| Task                                | Priority | Status |
| ----------------------------------- | -------- | ------ |
| Create campaign generation logic    | P0       | ⬜     |
| Implement confidence scoring        | P0       | ⬜     |
| Implement suppression logic         | P0       | ⬜     |
| Create `useTodayCampaigns` SWR hook | P0       | ⬜     |
| Create `useCampaignActions` hook    | P0       | ⬜     |

### Week 2: Execution Surfaces (Days 9-10)

| Task                              | Priority | Status |
| --------------------------------- | -------- | ------ |
| WhatsApp Status share (deep link) | P0       | ⬜     |
| WhatsApp Message copy             | P0       | ⬜     |
| Poster PDF generation             | P1       | ⬜     |
| QR Tent generation                | P2       | ⬜     |
| Digital Screen image              | P2       | ⬜     |

### Week 3: Polish (Days 11-14)

| Task                           | Priority | Status |
| ------------------------------ | -------- | ------ |
| Implement PastActivity screen  | P1       | ⬜     |
| Outcome closure (minimal mode) | P1       | ⬜     |
| Caption generation (Gemini)    | P1       | ⬜     |
| Image generation integration   | P2       | ⬜     |
| Menu link attribution tracking | P2       | ⬜     |

---

## File Structure

```
src/
├── app/
│   └── (main)/
│       └── today/
│           └── page.tsx
│
├── components/
│   └── templates/
│       └── main-app/
│           └── today/
│               ├── index.tsx
│               ├── types.ts
│               ├── styles.module.scss
│               ├── hooks/
│               │   ├── useTodayCampaigns.ts
│               │   └── useCampaignActions.ts
│               ├── components/
│               │   ├── PrimaryCard/
│               │   ├── OperationalSection/
│               │   ├── EmptyState/
│               │   ├── PostActionState/
│               │   └── PastActivity/
│               └── utils/
│                   ├── surfaceActions.ts
│                   └── copyTemplates.ts
│
├── constants/
│   ├── navigations.ts           # Add TODAY route
│   └── database.ts              # Add CAMPAIGNS, CAMPAIGN_EXPORTS
│
├── config/
│   └── features.ts              # Add SOCIAL_CONTENT_* flags
│
├── database/
│   └── campaigns/
│       └── index.ts             # Campaign DAL
│
├── types/
│   └── campaigns.ts             # Campaign interfaces
│
└── lib/
    └── campaigns/
        ├── engine.ts            # Campaign generation logic
        ├── confidence.ts        # Confidence scoring
        └── suppression.ts       # Suppression rules
```

---

## Implementation Checklist

### Pre-Implementation

- [x] Strategy doc frozen and reviewed
- [x] This implementation doc approved
- [x] Feature flags defined
- [x] Database collections added to constants

### Core (Must Ship Together)

- [x] Today screen with 3 states
- [x] Campaign DAL with Summary Document Pattern
- [x] Skip functionality (immediate, no resurface same day)
- [x] At least 3 campaign types working
- [x] At least 2 execution surfaces working (WhatsApp, Poster)
- [x] Empty state implemented
- [x] Mobile responsive

### UX Checklist (From ChatGPT)

- [x] Can owner complete action in <20 seconds?
- [x] Does empty state feel calm, not broken?
- [x] No explanations on Today screen
- [x] No metrics on Today screen
- [x] No "campaign" word in UI copy
- [x] Skip removes immediately (no confirmation)

### Copy Governance

- [x] No forbidden phrases used (phraseGuard.ts added)
- [x] Non-comparative outcome language only
- [x] Action titles are affirmative, present tense
- [x] Button copy follows surface mapping

### Firebase Cost

- [x] Today screen: 1 read max
- [x] Action: 2 writes max
- [x] No unnecessary reads
- [x] SWR caching implemented

---

## Progress Tracking

### Week 1 Progress

| Day           | Completed              | Notes                                                               |
| ------------- | ---------------------- | ------------------------------------------------------------------- |
| Day 1 (Jan 3) | ✅ Foundation complete | Types, DB constants, feature flags, navigation, DAL, page structure |
| Day 2         |                        |                                                                     |
| Day 3         |                        |                                                                     |
| Day 4         |                        |                                                                     |
| Day 5         |                        |                                                                     |

### Files Created (Day 1)

| File                                                                              | Status     | Description                                |
| --------------------------------------------------------------------------------- | ---------- | ------------------------------------------ |
| `src/types/campaigns.ts`                                                          | ✅         | Campaign interfaces, types, copy templates |
| `src/constants/database.ts`                                                       | ✅ Updated | Added CAMPAIGNS, CAMPAIGN_EXPORTS          |
| `src/config/features.ts`                                                          | ✅ Updated | Added SOCIAL*CONTENT*\* flags              |
| `src/constants/navigations.ts`                                                    | ✅ Updated | Added TODAY route + sidebar                |
| `src/database/campaigns/index.ts`                                                 | ✅ Updated | Read/action DAL with Summary Pattern; generation-era helper exports removed |
| `src/app/(main)/today/page.tsx`                                                   | ✅         | Today page route                           |
| `src/components/templates/main-app/today/index.tsx`                               | ✅         | Main Today component                       |
| `src/components/templates/main-app/today/styles.module.scss`                      | ✅         | Styles                                     |
| `src/components/templates/main-app/today/hooks/useTodayCampaigns.ts`              | ✅ Updated | Re-exports shared read hook only           |
| `src/components/templates/main-app/today/hooks/useCampaignActions.ts`             | ✅         | Actions hook                               |
| `src/components/templates/main-app/today/components/PrimaryCard/index.tsx`        | ✅         | Primary card                               |
| `src/components/templates/main-app/today/components/OperationalSection/index.tsx` | ✅         | Operational section                        |
| `src/components/templates/main-app/today/components/EmptyState/index.tsx`         | ✅         | Empty state                                |
| `src/components/templates/main-app/today/components/PostActionState/index.tsx`    | ✅         | Post-action state                          |
| `src/app/(main)/today/history/page.tsx`                                           | ✅         | Past Activity page route                   |
| `src/components/templates/main-app/today/PastActivity/index.tsx`                  | ✅         | Past Activity screen                       |
| Social Content generation engine                                                  | Removed   | Old owner-generation engine deleted after GrowthOS took over new generated actions |
| `src/lib/campaigns/executionSurfaces.ts`                                          | ✅         | Execution surfaces (WhatsApp, Poster)      |
| `src/providers/TodayActionProvider.tsx`                                           | Removed   | Old global polling provider deleted        |
| `src/providers/clientProviders.tsx`                                               | ✅ Updated | No Today polling wrapper                   |
| `src/components/organisms/sidebar/horizontalSidebar.tsx`                          | ✅ Updated | Today dot removed to avoid background summary reads |

### Files Created (Day 2 - AI Integration)

| File                                                                 | Status     | Description                               |
| -------------------------------------------------------------------- | ---------- | ----------------------------------------- |
| `src/services/gemini/prompts/v1/campaignCaption.prompt.ts`           | ✅         | Campaign caption Gemini prompt (v1) with prompt-field normalization |
| `src/services/gemini/prompts/index.ts`                               | ✅ Updated | Added campaignCaption to registry         |
| `src/lib/validation/apiSchemas.ts`                                   | ✅ Updated | Added campaign Zod schemas                |
| `src/app/api/campaigns/caption/route.ts`                             | ✅         | Caption generation API with auth, Safe Mode, rate limit, bounded body, validation, menu output permission, exact optional-project ownership, capacity reservation, exact output projection, phrase guard, and accounting |
| `src/lib/ai/campaignCaptionOutput.ts`                                | ✅         | Exact bounded `caption` / `shortCaption` / hashtag provider-output DTO |
| Social Content generation API                                        | Removed   | Old route deleted; no hidden flag or dead endpoint remains |
| `src/components/templates/main-app/today/hooks/useTodayCampaigns.ts` | ✅ Updated | Re-exports shared read hook only |

### Week 2 Progress

| Day    | Completed | Notes |
| ------ | --------- | ----- |
| Day 6  |           |       |
| Day 7  |           |       |
| Day 8  |           |       |
| Day 9  |           |       |
| Day 10 |           |       |

### Week 3 Progress

| Day    | Completed | Notes |
| ------ | --------- | ----- |
| Day 11 |           |       |
| Day 12 |           |       |
| Day 13 |           |       |
| Day 14 |           |       |

---

## Open Questions - RESOLVED

| Question                 | Decision                                | Status         |
| ------------------------ | --------------------------------------- | -------------- |
| Navigation dot indicator | Removed after old owner-generation path was retired | ✅ Removed |
| Default landing behavior | Dashboard default (Today is optional)   | ✅ Decided     |
| Multi-project handling   | Highest confidence across projects      | ✅ Implemented |
| WhatsApp sharing         | Deep link + fallback to copy on desktop | ✅ Implemented |

---

**Document End**

_Last Updated: July 1, 2026_
_Author: Cascade AI_

---

## Implementation Summary (Jan 4, 2026)

### ✅ COMPLETED

| Feature               | Files                                                       | Status |
| --------------------- | ----------------------------------------------------------- | ------ |
| Today Tab UI          | `today/index.tsx`, PrimaryCard, EmptyState, PostActionState | ✅     |
| Campaign Engine       | Old `engine.ts`                                             | Removed |
| Campaign DAL          | `database/campaigns/index.ts`                               | ✅ Read/action path only |
| WhatsApp Execution    | Deep link + desktop fallback                                | ✅     |
| Poster/QR Tent        | Download button                                             | ✅     |
| Caption Generation    | `campaigns/caption/route.ts` + phraseGuard + normalized prompt inputs | ✅     |
| Sidebar Dot Indicator | TodayActionProvider                                         | Removed |

### ✅ OWNER FEATURES (Completed Jan 4, 2026)

| Feature                  | Files                                 | Status                   |
| ------------------------ | ------------------------------------- | ------------------------ |
| Owner Upload for Screens | `OwnerUploads.tsx`                    | ✅ Max 3, 14-day expiry  |
| Screen Settings UI       | `ScreenLink.tsx`, `CurrentSlides.tsx` | ✅ Copy link, preview    |
| Owner Override Toggle    | `index.tsx`                           | ✅ "Use my designs only" |

### ❌ REMOVED (Over-Engineering)

| Feature                  | Reason                     |
| ------------------------ | -------------------------- |
| Offline Service Worker   | Browser cache sufficient   |
| Screen Health Monitoring | Owner can see their own TV |
| Counter Tent Card        | Nice-to-have, not MVP      |
| Attribution Tracking     | Build when needed          |

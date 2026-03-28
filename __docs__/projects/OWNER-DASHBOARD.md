# Owner Dashboard - Single Source of Truth

> **Version:** 2.1  
> **Last Updated:** January 2, 2026  
> **Status:** Production Ready (with localStorage caching)

---

## Table of Contents

1. [Why We Built This](#1-why-we-built-this)
2. [Core Philosophy](#2-core-philosophy)
3. [Target Users](#3-target-users)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Flow](#5-data-flow)
6. [File Structure](#6-file-structure)
7. [Firebase Structure](#7-firebase-structure)
8. [Types & Interfaces](#8-types--interfaces)
9. [Data Access Layer (DAL)](#9-data-access-layer-dal)
10. [React Hook](#10-react-hook)
11. [UI Components](#11-ui-components)
12. [Guardrails & Configuration](#12-guardrails--configuration)
13. [Cost Optimization](#13-cost-optimization)
14. [Testing Checklist](#14-testing-checklist)
15. [Future Considerations](#15-future-considerations)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Why We Built This

### The Problem

SMB owners (restaurant owners, salon owners, spa owners) were asking:

- "Is my digital menu working?"
- "Are customers actually using it?"
- "Is my subscription worth it?"

They were NOT asking:

- "What's my click-through rate?"
- "Show me conversion funnels"
- "I need A/B testing data"

### The Solution

A **confirmation dashboard** - not an analytics dashboard. The owner opens it, sees "Your menu is working!", and closes it. Done. Peace of mind delivered.

### Key Insight

> "The owner dashboard is NOT analytics. It is confirmation."
>
> Owners don't want to analyze data. They want to know their business tool is functioning.

---

## 2. Core Philosophy

### Guiding Principles

| Principle                       | What It Means                                                 |
| ------------------------------- | ------------------------------------------------------------- |
| **Confirmation, not analytics** | Answer "Is it working?" not "What's the data?"                |
| **Answers, not data**           | "Your menu is working!" not "247 page views"                  |
| **Confidence, not insight**     | Build trust, don't demand interpretation                      |
| **Glanceable**                  | 3 seconds to understand status                                |
| **No jargon**                   | "Menu Scans" not "Page Views", "Item Taps" not "Click Events" |

### UI Language Rules

| ❌ Don't Say               | ✅ Say Instead          |
| -------------------------- | ----------------------- |
| "High engagement detected" | "Your menu is working!" |
| "Page Views"               | "Menu Scans"            |
| "Click Events"             | "Item Taps"             |
| "Conversion Rate"          | (Don't show this)       |
| "Smart Picks Rendered"     | "Suggestions Shown"     |
| "Smart Picks Clicks"       | "Suggestions Selected"  |
| "Analytics"                | "Summary" or "Overview" |

---

## 3. Target Users

### Primary: Indian SMB Owners

**Profile:**

- Restaurant, salon, spa, café owners
- Age 35-55
- Not tech-savvy
- Opens dashboard once a week (if that)
- Just wants to know "is it working?"

**Context:**

- Using MenuListAi for digital QR menu
- Paying monthly subscription
- English may be second language
- Mobile-first usage

### What They Need

| Need                       | Solution                           |
| -------------------------- | ---------------------------------- |
| Quick status check         | Hero card: "Your menu is working!" |
| Subscription justification | "This month: 1,247 menu scans"     |
| Proof it's working         | Historical comparison chart        |
| Simple language            | No analytics jargon                |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OWNER DASHBOARD v2                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Types     │───▶│    DAL      │───▶│    React Hook (SWR)     │ │
│  │  (306 lines)│    │ (741 lines) │    │      (231 lines)        │ │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘ │
│                                                     │               │
│                                                     ▼               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     UI Components                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Overview │  │  Daily   │  │  Weekly  │  │   Monthly    │  │  │
│  │  │ (PRIMARY)│  │  View    │  │   View   │  │    View      │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │  │
│  │                      ┌──────────────┐                         │  │
│  │                      │ Overall Footer│                        │  │
│  │                      └──────────────┘                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FIREBASE (Firestore)                         │
├─────────────────────────────────────────────────────────────────────┤
│  Collection: analytics                                               │
│                                                                      │
│  Documents:                                                          │
│  ├── {tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}                     │
│  ├── {tId}_{sId}_{projectId}_weekly_{YYYY-Wxx}                      │
│  ├── {tId}_{sId}_{projectId}_monthly_{YYYY-MM}                      │
│  └── {tId}_{sId}_{projectId}_overall_summary                        │
│                                                                      │
│  Written by: Nightly Scheduler (Cloud Functions)                     │
│  Read by: Owner Dashboard (Frontend - READ ONLY)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer          | File                               | Responsibility                                   |
| -------------- | ---------------------------------- | ------------------------------------------------ |
| **Types**      | `ownerDashboard.types.ts`          | All interfaces, guardrails, constants            |
| **DAL**        | `database/ownerDashboard/index.ts` | Firebase reads, data transformation, aggregation |
| **Hook**       | `hooks/useOwnerDashboard.ts`       | SWR caching, view state, lazy loading            |
| **Components** | `OwnerDashboard/*.tsx`             | UI rendering, user interaction                   |

---

## 5. Data Flow

### Initial Load (Overview Mode)

```
User opens Owner Dashboard
         │
         ▼
┌─────────────────────────────┐
│ useOwnerDashboard hook      │
│ viewMode = 'overview'       │
└────────────┬────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌────────────┐   ┌────────────┐
│ Overview   │   │ Overall    │
│ SWR Fetch  │   │ SWR Fetch  │
└─────┬──────┘   └─────┬──────┘
      │                │
      ▼                ▼
┌─────────────────────────────┐
│ getOwnerDashboardOverview() │──▶ Parallel fetch:
│                             │    - getOwnerDashboardWTD()
│                             │    - getOwnerDashboardMTD()
│                             │    - getOwnerDashboardDaily()
│                             │    - getOwnerDashboardHistoricalWeeks()
│                             │    - getOwnerDashboardWeekly() (for AI summary)
└─────────────────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ OverviewView Component      │
│ - Hero status card          │
│ - Quick stats               │
│ - Expandable sections       │
└─────────────────────────────┘
```

### WTD/MTD Aggregation Flow

```
WTD (Week-to-Date) - Rolling 7 Days
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  getLast7Days() → [2025-12-26, 2025-12-27, ..., 2026-01-01]   │
│                           │                                     │
│                           ▼                                     │
│  fetchDailyDocs() → Batch fetch (10 at a time)                 │
│                           │                                     │
│                           ▼                                     │
│  aggregateDailyDocs() → Sum metrics, merge top items           │
│                           │                                     │
│                           ▼                                     │
│  Return WTDViewData                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

MTD (Month-to-Date) - 1st of month to yesterday
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  getMonthToDateDates() → [2026-01-01, ..., yesterday]          │
│                           │                                     │
│                           ▼                                     │
│  fetchDailyDocs() → Batch fetch (10 at a time)                 │
│                           │                                     │
│                           ▼                                     │
│  aggregateDailyDocs() → Sum metrics + calculate avgDailyScans  │
│                           │                                     │
│                           ▼                                     │
│  Return MTDViewData                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Lazy Loading (Tab Switch)

```
User clicks "This Week" tab
         │
         ▼
┌─────────────────────────────┐
│ setViewMode('weekly')       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ SWR key becomes active:     │
│ ['ownerDashboard', 'weekly',│
│  tId, sId, projectId]       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ getOwnerDashboardWeekly()   │
│ Fetches summary document    │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ WeeklyView renders          │
│ (with loading state)        │
└─────────────────────────────┘
```

---

## 6. File Structure

```
src/
├── components/
│   └── templates/
│       └── main-app/
│           ├── dashboard/
│           │   └── OwnerDashboard/
│           │       ├── index.tsx              # Main container (~165 lines)
│           │       ├── DashboardProjectSelector.tsx  # Project switcher
│           │       ├── OverviewView.tsx       # PRIMARY view (351 lines)
│           │       ├── DailyView.tsx          # Yesterday view
│           │       ├── WeeklyView.tsx         # This week view
│           │       ├── MonthlyView.tsx        # This month view
│           │       ├── OverallFooter.tsx      # Lifetime footer
│           │       ├── ViewModeTabs.tsx       # Tab navigation (85 lines)
│           │       ├── LoadingState.tsx       # Skeleton loader
│           │       ├── EmptyState.tsx         # No data message
│           │       └── OwnerDashboard.module.scss  # Styles (841 lines)
│           │
│           └── projects/
│               └── types/
│                   └── ownerDashboard.types.ts  # All types (306 lines)
│
├── database/
│   └── ownerDashboard/
│       └── index.ts                           # DAL (~900 lines)
│
├── lib/
│   └── cache/
│       └── swrLocalStorageProvider.ts         # localStorage cache (200 lines)
│
└── hooks/
    └── useOwnerDashboard.ts                   # SWR hook (~290 lines)
```

### Line Count Summary

| File                               | Lines  | Purpose                                     |
| ---------------------------------- | ------ | ------------------------------------------- |
| `ownerDashboard.types.ts`          | 306    | Types, interfaces, guardrails, constants    |
| `database/ownerDashboard/index.ts` | ~900   | Firebase reads, aggregation, transformation |
| `swrLocalStorageProvider.ts`       | ~200   | localStorage cache for cost optimization    |
| `useOwnerDashboard.ts`             | ~290   | SWR caching, state management               |
| `OverviewView.tsx`                 | 351    | Primary hero view                           |
| `OwnerDashboard.module.scss`       | ~850   | Responsive styles                           |
| **Total**                          | ~2,900 | Complete feature                            |

---

## 7. Firebase Structure

### Collection: `analytics`

All Owner Dashboard data lives in the `analytics` collection.

### Document ID Patterns

```typescript
const getDocId = {
  daily: (tId, sId, projectId, date) =>
    `${tId}_${sId}_${projectId}_daily_${date}`,
  // Example: "14_15_abc123_daily_2026-01-01"

  weekly: (tId, sId, projectId, week) =>
    `${tId}_${sId}_${projectId}_weekly_${week}`,
  // Example: "14_15_abc123_weekly_2026-W01"

  monthly: (tId, sId, projectId, month) =>
    `${tId}_${sId}_${projectId}_monthly_${month}`,
  // Example: "14_15_abc123_monthly_2026-01"

  summary: (tId, sId, projectId) =>
    `${tId}_${sId}_${projectId}_overall_summary`,
  // Example: "14_15_abc123_overall_summary"
};
```

### Daily Document Structure

```typescript
// Document: analytics/{tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}
{
    // Core metrics
    totalViews: number,           // Menu page loads
    totalClicks: number,          // Any item clicks
    totalDecisionBlocksRendered: number,  // Smart picks shown
    totalRecommendationClicks: number,    // Smart picks clicked

    // Decision blocks breakdown
    decisionBlocksRendered: {
        popular: number,
        quickPick: number,
        bestValue: number,
    },

    // Recommendation clicks breakdown
    recommendationClicks: {
        popular: number,
        quickPick: number,
        bestValue: number,
    },

    // Top items tracking
    recommendationClicksByItem: {
        [itemId: string]: number,  // Click count per item
    },
    itemNames: {
        [itemId: string]: string,  // Item ID to name mapping
    },

    // AI Summary (optional - generated by scheduler)
    aiSummary?: {
        markdown: string,
        bulletPoints: string[],
        generatedAt: Timestamp,
        promptVersion: string,
    },

    // Metadata
    createdOn: Timestamp,
    modifiedOn: Timestamp,
}
```

### Summary Document Structure

```typescript
// Document: analytics/{tId}_{sId}_{projectId}_overall_summary
{
    // Weekly aggregates (updated by scheduler)
    weekly: {
        totalViews: number,
        totalClicks: number,
        totalDecisionBlocksRendered: number,
        totalRecommendationClicks: number,
        menuVisitsChange: number,  // % change from prev week
        decisionBlocksRendered: { ... },
        recommendationClicks: { ... },
        recommendationClicksByItem: { ... },
        itemNames: { ... },
    },

    // Lifetime aggregates
    lifetime: {
        totalViews: number,
        totalClicks: number,
        totalDecisionBlocksRendered: number,
        totalRecommendationClicks: number,
    },

    // AI Summary for owner dashboard
    ownerDashboardSummary: {
        markdown: string,
        bulletPoints: string[],
        generatedAt: Timestamp,
        promptVersion: string,
        period: {
            start: string,  // YYYY-MM-DD
            end: string,    // YYYY-MM-DD
        },
    },

    // Metadata
    firstDataDate: string,  // When tracking started
    createdOn: Timestamp,
    modifiedOn: Timestamp,
}
```

### Firebase Read Operations

#### Optimized (Current Implementation - Single Fetch Strategy)

| View                   | Documents Read           | Max Reads |
| ---------------------- | ------------------------ | --------- |
| **Overview** (initial) | Unique daily + 1 summary | ~37       |
| **Daily** (lazy)       | 1 daily doc              | 1         |
| **Weekly** (lazy)      | 1 summary doc            | 1         |
| **Monthly** (lazy)     | 1 monthly doc            | 1         |

**How it works:** All unique dates (MTD + historical weeks beyond MTD) are fetched ONCE, then aggregated into WTD, MTD, Daily, and Historical from the cached data.

#### Worst Case Calculation (Jan 31st)

```
Unique dates needed:
- MTD: Jan 1-30 = 30 dates
- Historical Week 4 (oldest): Dec 16-22 = 7 dates (5 unique, 2 overlap)
Total unique dates: ~35 daily docs + 1 summary = 36 reads

BEFORE optimization: 69 reads (duplicate fetches)
AFTER optimization:  36 reads (single fetch)
SAVINGS: 48% reduction
```

#### Old Implementation (Before Optimization)

| Component  | Reads  | Notes                          |
| ---------- | ------ | ------------------------------ |
| WTD        | 7      | Last 7 daily docs              |
| MTD        | 31     | Full month (overlaps with WTD) |
| Daily      | 1      | Yesterday (duplicate)          |
| Historical | 28     | 4 weeks × 7 (overlaps)         |
| Weekly     | 1      | Summary doc                    |
| **TOTAL**  | **69** | Many duplicates!               |

---

## 8. Types & Interfaces

### View Modes

```typescript
// Primary type for view switching
export type OwnerDashboardViewMode =
  | "overview"
  | "daily"
  | "weekly"
  | "monthly";

// Configuration for each view
export const VIEW_MODE_CONFIG = {
  overview: {
    label: "Overview",
    description: "Quick status check - is everything working?",
    isPrimary: true,
  },
  daily: {
    label: "Yesterday",
    description: "Quick check - what happened yesterday",
    isPrimary: false,
  },
  weekly: {
    label: "This Week",
    description: "Last 7 days performance",
    isPrimary: false,
  },
  monthly: {
    label: "This Month",
    description: "Month so far - subscription value",
    isPrimary: false,
  },
} as const;
```

### Core Metrics

```typescript
// Base metrics interface (used everywhere)
export interface OwnerDashboardMetrics {
  menuVisits: number; // Total menu page loads
  itemClicks: number; // Total item clicks
  smartPicksRendered: number; // Decision blocks shown
  smartPicksClicks: number; // Decision block clicks
}

// Decision block performance
export interface BlockPerformance {
  popular: { rendered: number; clicks: number };
  quickPick: { rendered: number; clicks: number };
  bestValue: { rendered: number; clicks: number };
}

// Top performing item
export interface TopItem {
  itemId: string;
  name?: string;
  clicks: number;
}
```

### View Data Interfaces

```typescript
// Overview (PRIMARY) - Hero view
export interface OverviewData {
  status: "working" | "low_activity" | "no_data";
  statusMessage: string;
  wtd: WTDViewData | null;
  mtd: MTDViewData | null;
  yesterday: DailyViewData | null;
  historicalWeeks: HistoricalWeek[];
  aiSummary?: WeeklyAISummary;
}

// Week-to-Date (Rolling 7 days)
export interface WTDViewData {
  startDate: string; // 7 days ago
  endDate: string; // yesterday
  daysWithData: number;
  metrics: OwnerDashboardMetrics;
  blockPerformance: BlockPerformance;
  topItems: TopItem[];
}

// Month-to-Date (1st → yesterday)
export interface MTDViewData {
  monthName: string; // "January 2026"
  startDate: string; // 1st of month
  endDate: string; // yesterday
  daysWithData: number;
  daysInMonth: number;
  metrics: OwnerDashboardMetrics;
  blockPerformance: BlockPerformance;
  topItems: TopItem[];
  avgDailyScans: number; // Calculated
}

// Historical week (for comparison chart)
export interface HistoricalWeek {
  weekStart: string;
  weekEnd: string;
  weekLabel: string; // "Dec 23-29"
  metrics: OwnerDashboardMetrics;
  isCurrentWeek: boolean;
}

// Daily view
export interface DailyViewData {
  date: string;
  metrics: OwnerDashboardMetrics;
  blockPerformance: BlockPerformance;
  topItems: TopItem[];
  aiSummary?: AISummary;
  isLowActivity: boolean; // < 20 views
}

// Weekly view
export interface WeeklyViewData {
  weekStart: string;
  weekEnd: string;
  metrics: OwnerDashboardMetrics;
  metricsChange?: { menuVisitsChange: number };
  blockPerformance: BlockPerformance;
  topItems: TopItem[];
  aiSummary?: WeeklyAISummary;
}

// Monthly view
export interface MonthlyViewData {
  monthStart: string;
  monthEnd: string;
  daysWithData: number;
  metrics: OwnerDashboardMetrics;
  blockPerformance: BlockPerformance;
  topItems: TopItem[];
  aiSummary?: AISummary;
}
```

### Combined Dashboard Data

```typescript
export interface OwnerDashboardData {
  // Overview (primary view)
  overview: OverviewData | null;

  // Period views
  daily: DailyViewData | null;
  weekly: WeeklyViewData | null;
  monthly: MonthlyViewData | null;

  // Rolling aggregates
  wtd: WTDViewData | null;
  mtd: MTDViewData | null;

  // Historical comparison
  historicalWeeks: HistoricalWeek[];

  // Lifetime footer
  overall: OverallData | null;

  // Meta
  projectId: string;
  lastFetched: Date;
}
```

### Hook Return Type

```typescript
export interface UseOwnerDashboardReturn {
  data: OwnerDashboardData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;

  // Convenience getters
  currentViewData:
    | OverviewData
    | DailyViewData
    | WeeklyViewData
    | MonthlyViewData
    | null;
  viewMode: OwnerDashboardViewMode;
  setViewMode: (mode: OwnerDashboardViewMode) => void;

  // Lazy loading states
  loadingDaily: boolean;
  loadingWeekly: boolean;
  loadingMonthly: boolean;
}
```

---

## 9. Data Access Layer (DAL)

### Location

```
src/database/ownerDashboard/index.ts
```

### Exported Functions

| Function                             | Purpose           | Returns              |
| ------------------------------------ | ----------------- | -------------------- |
| `getOwnerDashboardOverview()`        | Primary view data | `OverviewData`       |
| `getOwnerDashboardDaily()`           | Yesterday's data  | `DailyViewData`      |
| `getOwnerDashboardWeekly()`          | This week data    | `WeeklyViewData`     |
| `getOwnerDashboardMonthly()`         | Last month data   | `MonthlyViewData`    |
| `getOwnerDashboardWTD()`             | Rolling 7 days    | `WTDViewData`        |
| `getOwnerDashboardMTD()`             | Month-to-date     | `MTDViewData`        |
| `getOwnerDashboardHistoricalWeeks()` | Last 4 weeks      | `HistoricalWeek[]`   |
| `getOwnerDashboardOverall()`         | Lifetime data     | `OverallData`        |
| `getOwnerDashboardData()`            | All data combined | `OwnerDashboardData` |

### Key Implementation Details

#### Document ID Generation

```typescript
const getDocId = {
  daily: (tId: string, sId: string, projectId: string, date: string) =>
    `${tId}_${sId}_${projectId}_daily_${date}`,
  weekly: (tId: string, sId: string, projectId: string, week: string) =>
    `${tId}_${sId}_${projectId}_weekly_${week}`,
  monthly: (tId: string, sId: string, projectId: string, month: string) =>
    `${tId}_${sId}_${projectId}_monthly_${month}`,
  summary: (tId: string, sId: string, projectId: string) =>
    `${tId}_${sId}_{projectId}_overall_summary`,
};
```

#### Date Helpers

```typescript
// Yesterday's date in YYYY-MM-DD format
function getYesterdayDate(): string;

// Current ISO week (e.g., "2026-W01")
function getCurrentWeekId(): string;

// Last ISO week
function getLastWeekId(): string;

// Current month (e.g., "2026-01")
function getCurrentMonthId(): string;

// Last month
function getLastMonthId(): string;

// Generate array of dates between start and end
function getDateRange(startDate: Date, endDate: Date): string[];

// Get last 7 days as date strings
function getLast7Days(): string[];

// Get 1st of current month to yesterday
function getMonthToDateDates(): string[];

// Get Monday-Sunday range for a date
function getWeekStartEnd(date: Date): { start: Date; end: Date };

// Format week label (e.g., "Dec 23-29")
function formatWeekLabel(start: Date, end: Date): string;

// Get last 4 weeks with date ranges
function getLast4WeeksRanges(): Array<{
  start: Date;
  end: Date;
  weekId: string;
}>;

// ISO week number calculation
function getISOWeek(date: Date): number;
```

#### Batch Fetching

```typescript
// Fetch multiple daily documents in batches of 10
async function fetchDailyDocs(
  tId: string,
  sId: string,
  projectId: string,
  dates: string[]
): Promise<DailyDocData[]>;
```

#### Aggregation

```typescript
// Aggregate multiple daily docs into combined metrics
function aggregateDailyDocs(docs: DailyDocData[]): {
  metrics: OwnerDashboardMetrics;
  blockPerformance: BlockPerformance;
  topItems: TopItem[];
};
```

#### Status Detection

```typescript
// In getOwnerDashboardOverview()
let status: "working" | "low_activity" | "no_data" = "no_data";

if (wtd) {
  if (wtd.metrics.menuVisits >= OVERVIEW_GUARDRAILS.LOW_ACTIVITY_THRESHOLD) {
    status = "working"; // >= 50 scans in 7 days
  } else if (wtd.metrics.menuVisits > 0) {
    status = "low_activity"; // 1-49 scans
  }
} else if (yesterday && yesterday.metrics.menuVisits > 0) {
  status = "low_activity"; // Has yesterday data but no WTD
}
```

---

## 10. React Hook

### Location

```
src/hooks/useOwnerDashboard.ts
```

### Usage

```typescript
import { useOwnerDashboard } from "@hook/useOwnerDashboard";

function MyComponent() {
  const {
    data,
    loading,
    error,
    refetch,
    viewMode,
    setViewMode,
    currentViewData,
    loadingDaily,
    loadingWeekly,
    loadingMonthly,
  } = useOwnerDashboard({ projectId: "abc123" });

  // Handle loading
  if (loading) return <LoadingState />;

  // Handle error
  if (error) return <ErrorState error={error} />;

  // Render based on viewMode
  return <OverviewView data={currentViewData} />;
}
```

### SWR Configuration

```typescript
const SWR_CONFIG = {
  revalidateOnFocus: false, // Don't refetch when tab gains focus
  revalidateOnReconnect: false, // Don't refetch on reconnect
  dedupingInterval: 60000, // 1 minute deduping
};
```

### SWR Keys

```typescript
// Overview data (fetched on initial load)
["ownerDashboard", "overview", tId, sId, projectId][
  // Overall data (fetched on initial load)
  ("ownerDashboard", "overall", tId, sId, projectId)
][
  // Daily data (lazy - only when viewMode === 'daily')
  ("ownerDashboard", "daily", tId, sId, projectId)
][
  // Weekly data (lazy - only when viewMode === 'weekly')
  ("ownerDashboard", "weekly", tId, sId, projectId)
][
  // Monthly data (lazy - only when viewMode === 'monthly')
  ("ownerDashboard", "monthly", tId, sId, projectId)
];
```

### Lazy Loading Pattern

```typescript
// Only fetch when viewMode matches
const { data: weeklyData } = useSWR(
  canFetch && viewMode === "weekly"
    ? ["ownerDashboard", "weekly", tId, sId, projectId]
    : null, // null key = no fetch
  () => getOwnerDashboardWeekly(tId!, sId!, projectId!),
  SWR_CONFIG
);
```

---

## 11. UI Components

### Component Hierarchy

```
OwnerDashboard (index.tsx)
├── Dashboard Header
│   ├── DashboardProjectSelector  # Project switcher dropdown
│   └── ViewModeTabs              # View mode tabs
├── AnimatePresence (Framer Motion)
│   └── [Current View]
│       ├── OverviewView (PRIMARY)
│       ├── DailyView
│       ├── WeeklyView
│       └── MonthlyView
└── OverallFooter
```

### DashboardProjectSelector

**Purpose:** Allows owners to switch between multiple catalogs/projects.

**Features:**

- Dropdown with all available projects
- Avatar initials with consistent colors
- Auto-selects default/first project on mount
- SWR-cached project list (60s deduping)

**Props:**

```typescript
interface DashboardProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string, projectName: string) => void;
}
```

**Behavior:**

- Fetches projects via `getMetadataProjectsList()`
- Shows loading skeleton while fetching
- Displays "No catalogs" if none exist
- Current project shown in header with checkmark in dropdown

### OverviewView (PRIMARY)

**Purpose:** Default hero view for quick status confirmation.

**Sections:**

1. **Hero Status Card** - "Your menu is working!" with color-coded background
2. **Quick Stats Row** - This Week / This Month / Top Item
3. **AI Summary Card** - Weekly insights (if available)
4. **Expandable Details** - WTD, MTD, Historical comparison

**Status Colors:**

| Status         | Background              | Icon Color         |
| -------------- | ----------------------- | ------------------ |
| `working`      | `#f6ffed` (green tint)  | `#52c41a` (green)  |
| `low_activity` | `#fffbe6` (yellow tint) | `#faad14` (yellow) |
| `no_data`      | `#fafafa` (gray tint)   | `#8c8c8c` (gray)   |

**Status Messages:**

| Status         | Title                    | Message                                                          |
| -------------- | ------------------------ | ---------------------------------------------------------------- |
| `working`      | "Your menu is working!"  | "Customers are scanning and exploring."                          |
| `low_activity` | "Getting started"        | "Some activity this week. Things are getting started."           |
| `no_data`      | "Waiting for first scan" | "Your menu analytics will appear once customers start scanning." |

### ViewModeTabs

**Purpose:** Tab navigation between views.

**Tabs:**

1. Overview (PRIMARY - default selected)
2. Yesterday (secondary)
3. This Week (secondary)
4. This Month (secondary)

### DailyView, WeeklyView, MonthlyView

**Purpose:** Detailed views for specific time periods.

**Common Elements:**

- Metrics cards (scans, clicks, suggestions)
- Block performance breakdown
- Top items list
- AI summary (if available)

### OverallFooter

**Purpose:** Lifetime metrics anchor.

**Shows:**

- Total lifetime scans
- Total lifetime clicks
- First data date ("Tracking since...")
- Last updated timestamp

---

## 12. Guardrails & Configuration

### Overview Guardrails

```typescript
export const OVERVIEW_GUARDRAILS = {
  LOW_ACTIVITY_THRESHOLD: 50, // WTD < 50 = "low activity"
  SHOW_HISTORICAL_WEEKS: 4, // Show last 4 weeks
  SHOW_TOP_ITEMS: 3, // Show top 3 items only
  SHOW_FULL_AI_SUMMARY: false, // Abbreviated summary
  MAX_AI_BULLETS: 3, // Max 3 bullet points
} as const;
```

### Daily Guardrails

```typescript
export const DAILY_GUARDRAILS = {
  LOW_ACTIVITY_THRESHOLD: 20, // < 20 views = "low activity"
  MAX_METRICS_SHOWN: 4,
  MAX_AI_BULLETS: 2,
  SHOW_PERCENTAGE_CHANGE: false,
  SHOW_COMPARISONS: false,
  SHOW_ARROWS: false,
} as const;
```

### Weekly Guardrails

```typescript
export const WEEKLY_GUARDRAILS = {
  MIN_DAYS_FOR_SUMMARY: 7,
  MAX_AI_BULLETS: 5,
  SHOW_PERCENTAGE_CHANGE: true,
} as const;
```

### Monthly Guardrails

```typescript
export const MONTHLY_GUARDRAILS = {
  MAX_AI_BULLETS: 3,
  SHOW_WEEK_BREAKDOWN: false,
  SHOW_COMPARISONS: false,
  USE_NEUTRAL_COLORS: true, // No red/green
} as const;
```

### Empty State Messages

```typescript
export const EMPTY_STATE_MESSAGES = {
  noData: {
    title: "No data yet",
    description:
      "Your menu analytics will appear here once customers start scanning.",
  },
  lowActivity: {
    title: "Low activity yesterday",
    description: "Not enough menu scans to show detailed insights.",
  },
  noWeeklyData: {
    title: "Building your weekly summary",
    description: "Check back on Monday for your first weekly summary.",
  },
  noMonthlyData: {
    title: "Monthly summary coming soon",
    description: "Check back on the 1st of next month.",
  },
} as const;
```

---

## 13. Cost Optimization

### Strategy: Single-Fetch + localStorage Cache (Jan 2026)

**Two-Level Optimization:**

1. **Single-Fetch Strategy** - Fetch all unique dates ONCE per request
2. **localStorage Cache** - Persist data across sessions, only fetch if date changed

**Key Insight:** Scheduler generates data once per day. No need to refetch if data hasn't changed.

### localStorage Cache Implementation

**File:** `src/lib/cache/swrLocalStorageProvider.ts`

```typescript
// Cache logic
if (!shouldRevalidate(cacheKey)) {
  return getCachedData(cacheKey); // 0 Firebase reads
}
// Only fetch if date changed
const data = await fetcher();
setCachedData(cacheKey, data); // Store for next visit
```

**Cache Behavior:**

| Scenario               | Firebase Reads           |
| ---------------------- | ------------------------ |
| First visit of the day | ~37 reads                |
| Same day, revisit      | **0 reads** (cached)     |
| Same day, page refresh | **0 reads** (cached)     |
| Next day               | ~37 reads (date changed) |

### Read Cost Analysis (OPTIMIZED with localStorage)

| Operation      | First Visit     | Same Day Revisits |
| -------------- | --------------- | ----------------- |
| Overview       | ~37 reads       | **0**             |
| Yesterday tab  | 0 (in overview) | **0**             |
| This Week tab  | 1 read          | **0**             |
| This Month tab | 1 read          | **0**             |

### Cost Calculation: 100 Users (₹ INR)

**Firebase Pricing:**

- Free tier: 50,000 reads/day = 1,500,000 reads/month
- After free tier: $0.06 per 100,000 reads = ₹5 per 100,000 reads

**Before localStorage Cache:**

- 100 stores × 4 visits × 2 loads × 37 reads = 29,600 reads/month

**After localStorage Cache:**

- 100 stores × 30 days × 1 fetch/day × 37 reads = ~3,000 reads/month
- **90% reduction!**

```
Monthly reads = 100 users × 30 days × 37 reads (only once per day)
             = ~3,000 reads/month

Daily average = 29,600 ÷ 30 = 987 reads/day

Cost: ₹0 (well within free tier)
```

### Scaling Projections (₹ INR) - With localStorage Cache

| Users      | Monthly Reads | Daily Avg  | Monthly Cost |
| ---------- | ------------- | ---------- | ------------ |
| 100        | ~3,000        | 100        | **₹0**       |
| 500        | ~15,000       | 500        | **₹0**       |
| 1,000      | ~30,000       | 1,000      | **₹0**       |
| 5,000      | ~150,000      | 5,000      | **₹0**       |
| 10,000     | ~300,000      | 10,000     | **₹0**       |
| 50,000     | 1,500,000     | 50,000     | **₹0**       |
| **51,000** | **1,530,000** | **51,000** | **₹0.15**    |
| 100,000    | 3,000,000     | 100,000    | **₹7.50**    |

**Break-even point:** ~51,000 users before any cost incurred!

### Optimization Techniques Applied

1. **localStorage Cache** - Persist data across sessions, 0 reads on revisit
2. **Date-based Invalidation** - Only fetch when scheduler has new data
3. **Single-Fetch Strategy** - Fetch unique dates once, aggregate from cache
4. **SWR Caching** - 24hr deduping + focus throttle
5. **Lazy Loading** - Detail views only fetch when needed
6. **Batch Fetching** - Daily docs fetched 10 at a time

### Comparison: Before vs After All Optimizations

| Metric                    | Before (No Cache) | After (localStorage) | Improvement |
| ------------------------- | ----------------- | -------------------- | ----------- |
| Reads per visit           | 37                | 0-37 (avg ~3.7)      | **-90%**    |
| Monthly reads (100 users) | 29,600            | ~3,000               | **-90%**    |
| Break-even users          | ~5,100            | ~51,000              | **+900%**   |
| Monthly cost @ 10K users  | ₹7.30             | ₹0                   | **-100%**   |

---

## 14. Testing Checklist

### Manual Testing

- [ ] **Overview loads** with hero status card
- [ ] **Status detection** works:
  - [ ] "Your menu is working!" when WTD >= 50
  - [ ] "Getting started" when WTD 1-49
  - [ ] "Waiting for first scan" when no data
- [ ] **Quick stats** show This Week, This Month, Top Item
- [ ] **Expandable sections** work (WTD, MTD, Historical)
- [ ] **Historical chart** renders 4 weeks comparison
- [ ] **Tab switching** works (Overview → Daily → Weekly → Monthly)
- [ ] **Lazy loading** shows loading state when switching tabs
- [ ] **Overall footer** shows lifetime metrics
- [ ] **Error state** renders on API failure
- [ ] **Empty state** renders when no data
- [ ] **Mobile responsive** - hero stacks vertically on small screens

### Edge Cases

- [ ] First day of month (MTD has 1 day)
- [ ] Week boundary (historical weeks span year boundary)
- [ ] No daily docs exist
- [ ] Only partial data (some days missing)
- [ ] AI summary not generated yet

---

## 15. Future Considerations

### When to Revisit

| Trigger                            | Action                                        |
| ---------------------------------- | --------------------------------------------- |
| Firebase reads > ₹500/month        | Consider pre-aggregating WTD/MTD in scheduler |
| Users request date picker          | Add custom date range fetch                   |
| Performance issues with 100+ items | Add pagination to top items                   |
| Need real-time updates             | Add SWR revalidation interval                 |

### Potential Enhancements

1. **Custom date range** - Let users pick specific dates
2. **Export to PDF** - "Share with partner" feature
3. **Push notifications** - Weekly summary push to mobile
4. **Comparison mode** - This week vs last week side-by-side
5. **Goal setting** - "Target: 500 scans/week"

### Not Recommended

- ❌ Adding more metrics (keep it simple)
- ❌ Conversion funnels (owners don't care)
- ❌ A/B testing data (too complex)
- ❌ Hourly breakdown (too granular)

---

## 16. Troubleshooting

### Common Issues

#### "No data yet" even though menu has scans

**Cause:** Scheduler hasn't run yet or document ID mismatch.

**Debug:**

1. Check Firebase Console for document existence
2. Verify document ID pattern: `{tId}_{sId}_{projectId}_daily_{date}`
3. Check scheduler logs for errors

#### WTD shows fewer days than expected

**Cause:** Some daily documents don't exist.

**Solution:** `daysWithData` field shows actual days with data.

#### AI Summary not showing

**Cause:** Summary generated weekly, may not exist yet.

**Solution:** Wait until Monday scheduler run.

#### Slow initial load

**Cause:** Fetching many daily documents for WTD/MTD.

**Debug:**

1. Check network tab for parallel requests
2. Verify batch size (should be 10)
3. Consider pre-aggregating if > 3s load time

### Debug Commands

```typescript
// In browser console
localStorage.setItem("debug", "swr"); // Enable SWR debug logs

// Check SWR cache
console.log(window.__SWR_DEVTOOLS_CACHE__);
```

---

## Appendix: Related Documentation

- `DECISION-BLOCKS-SCHEDULER.md` - How analytics data is generated
- `SCHEDULER-ANALYTICS-EXPLAINED.md` - Scheduler architecture
- `CUSTOMER-FACING-ANALYTICS.md` - End-user analytics (different from owner dashboard)

---

**Document maintained by:** Development Team  
**Last reviewed:** January 1, 2026  
**Next review:** March 2026

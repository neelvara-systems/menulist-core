/**
 * Owner Dashboard Types v2
 * 
 * Types for the SMB Owner Dashboard - focused on Decision Intelligence.
 * NOT analytics. This is CONFIRMATION for business owners.
 * 
 * Target: Indian SMB owners (restaurants, salons, spas)
 * Philosophy: "The owner dashboard is NOT analytics. It is confirmation."
 * 
 * v2 Changes:
 * - Added WTD (Week-to-Date) rolling view
 * - Added MTD (Month-to-Date) current month view
 * - Added Historical Weeks (last 4 weeks comparison)
 * - Simplified default view with expandable detail
 * - Optimized for single document read where possible
 */

// ================================================================
// VIEW MODES
// ================================================================

export type OwnerDashboardViewMode = 'overview' | 'daily' | 'weekly' | 'monthly';

export const VIEW_MODE_CONFIG = {
    overview: {
        label: 'Overview',
        description: 'Quick status check - is everything working?',
        isPrimary: true,
    },
    daily: {
        label: 'Yesterday',
        description: 'Quick check - what happened yesterday',
        isPrimary: false,
    },
    weekly: {
        label: 'This Week',
        description: 'Last 7 days performance',
        isPrimary: false,
    },
    monthly: {
        label: 'This Month',
        description: 'Month so far - subscription value',
        isPrimary: false,
    },
} as const;

// ================================================================
// AI SUMMARY
// ================================================================

export interface AISummary {
    markdown: string;
    bulletPoints: string[];
    generatedAt: Date;
    promptVersion: string;
}

export interface WeeklyAISummary extends AISummary {
    period: {
        start: string; // YYYY-MM-DD
        end: string;   // YYYY-MM-DD
    };
}

// ================================================================
// METRICS
// ================================================================

export interface OwnerDashboardMetrics {
    menuVisits: number;
    itemClicks: number;
    menuSessions?: number;
    engagedSessions?: number;
    intentSessions?: number;
    actionSessions?: number;
    engagedSessionRate?: number;
    intentRate?: number;
    actionRate?: number;
    smartPicksRendered: number;
    smartPicksClicks: number;
    searches?: number;
    unavailableItemTaps?: number;
    menuActionClicks?: number;
    zeroResultSearches?: number;
}

export interface MenuActionBreakdown {
    call: number;
    whatsapp: number;
    directions: number;
    reserve: number;
    order: number;
}

export interface SearchTerm {
    term: string;
    count: number;
}

export interface BlockPerformance {
    popular: { rendered: number; clicks: number };
    quickPick: { rendered: number; clicks: number };
    bestValue: { rendered: number; clicks: number };
}

export interface TopItem {
    itemId: string;
    name?: string;
    clicks: number;
}

export interface TopCategory {
    categoryId: string;
    name?: string;
    views: number;
    clicks: number;
}

export interface LanguageUsage {
    language: string;
    label: string;
    menuViews: number;
    menuSessions: number;
    adoptions: number;
}

export interface SourceQuality {
    source: string;
    label: string;
    menuSessions: number;
    actionSessions: number;
    actionClicks: number;
    actionRate: number;
}

export interface AttributeFilterInterest {
    filterId: string;
    label: string;
    interactions: number;
    itemViews: number;
    itemTaps: number;
    searches: number;
    unavailableTaps: number;
    actionClicks: number;
}

export interface OwnerConfidence {
    status: 'stable' | 'watch' | 'no_data';
    label: string;
    message: string;
}

export interface OwnerActionSuggestion {
    id: string;
    type: string;
    title: string;
    description: string;
    reason: string;
    actionLabel: string;
    metricLabel?: string;
    priority: 'high' | 'medium' | 'low';
}

export interface OwnerActionPlan {
    generatedBy?: 'rules' | 'ai';
    actions: OwnerActionSuggestion[];
    fingerprint?: string;
}

export interface AnalyticsAiEntitlement {
    enabled: boolean;
    activePlanType?: string | null;
    requiredPlanType: 'pro';
    reason: 'eligible' | 'feature_flag_disabled' | 'missing_plan' | 'plan_not_eligible';
}

// ================================================================
// DAILY VIEW DATA
// ================================================================

export interface DailyViewData {
    date: string; // YYYY-MM-DD
    metrics: OwnerDashboardMetrics;
    blockPerformance: BlockPerformance;
    topItems: TopItem[];
    topCategories?: TopCategory[];
    topLanguages?: LanguageUsage[];
    topAttributeFilters?: AttributeFilterInterest[];
    menuActions?: MenuActionBreakdown;
    topSearchTerms?: SearchTerm[];
    topZeroResultSearchTerms?: SearchTerm[];
    unavailableItems?: TopItem[];
    sourceQuality?: SourceQuality[];
    ownerConfidence?: OwnerConfidence;
    aiSummary?: AISummary;
    isLowActivity: boolean; // < 20 views
    isPartial?: boolean; // true for live "today so far" data
    lastUpdated?: Date;
}

// ================================================================
// WEEKLY VIEW DATA (PRIMARY)
// ================================================================

export interface WeeklyViewData {
    weekStart: string; // YYYY-MM-DD
    weekEnd: string;   // YYYY-MM-DD
    metrics: OwnerDashboardMetrics;
    metricsChange?: {
        menuVisitsChange: number; // % change from previous week
    };
    blockPerformance: BlockPerformance;
    topItems: TopItem[];
    topCategories?: TopCategory[];
    topLanguages?: LanguageUsage[];
    topAttributeFilters?: AttributeFilterInterest[];
    menuActions?: MenuActionBreakdown;
    topSearchTerms?: SearchTerm[];
    topZeroResultSearchTerms?: SearchTerm[];
    unavailableItems?: TopItem[];
    sourceQuality?: SourceQuality[];
    ownerConfidence?: OwnerConfidence;
    aiSummary?: WeeklyAISummary;
}

// ================================================================
// MONTHLY VIEW DATA
// ================================================================

export interface MonthlyViewData {
    monthStart: string; // YYYY-MM-DD
    monthEnd: string;   // YYYY-MM-DD
    daysWithData: number;
    metrics: OwnerDashboardMetrics;
    blockPerformance: BlockPerformance;
    topItems: TopItem[];
    topCategories?: TopCategory[];
    topLanguages?: LanguageUsage[];
    topAttributeFilters?: AttributeFilterInterest[];
    menuActions?: MenuActionBreakdown;
    topSearchTerms?: SearchTerm[];
    topZeroResultSearchTerms?: SearchTerm[];
    unavailableItems?: TopItem[];
    sourceQuality?: SourceQuality[];
    ownerConfidence?: OwnerConfidence;
    aiSummary?: AISummary;
}

// ================================================================
// WEEK-TO-DATE (Rolling 7 days)
// ================================================================

export interface WTDViewData {
    startDate: string; // 7 days ago
    endDate: string;   // yesterday
    daysWithData: number;
    metrics: OwnerDashboardMetrics;
    blockPerformance: BlockPerformance;
    topItems: TopItem[];
    topCategories?: TopCategory[];
    topLanguages?: LanguageUsage[];
    topAttributeFilters?: AttributeFilterInterest[];
    menuActions?: MenuActionBreakdown;
    topSearchTerms?: SearchTerm[];
    topZeroResultSearchTerms?: SearchTerm[];
    unavailableItems?: TopItem[];
    sourceQuality?: SourceQuality[];
    ownerConfidence?: OwnerConfidence;
}

// ================================================================
// MONTH-TO-DATE (1st → yesterday)
// ================================================================

export interface MTDViewData {
    monthName: string; // "January 2026"
    startDate: string; // 1st of month
    endDate: string;   // yesterday
    daysWithData: number;
    daysInMonth: number;
    metrics: OwnerDashboardMetrics;
    blockPerformance: BlockPerformance;
    topItems: TopItem[];
    topCategories?: TopCategory[];
    topLanguages?: LanguageUsage[];
    topAttributeFilters?: AttributeFilterInterest[];
    menuActions?: MenuActionBreakdown;
    topSearchTerms?: SearchTerm[];
    topZeroResultSearchTerms?: SearchTerm[];
    unavailableItems?: TopItem[];
    sourceQuality?: SourceQuality[];
    ownerConfidence?: OwnerConfidence;
    avgDailyScans: number;
}

// ================================================================
// HISTORICAL WEEK (for comparison)
// ================================================================

export interface HistoricalWeek {
    weekStart: string;
    weekEnd: string;
    weekLabel: string; // "Dec 23-29"
    metrics: OwnerDashboardMetrics;
    isCurrentWeek: boolean;
}

// ================================================================
// OVERVIEW DATA (Hero view - single glance)
// ================================================================

export interface OverviewData {
    status: 'working' | 'low_activity' | 'no_data';
    statusMessage: string;
    wtd: WTDViewData | null;
    mtd: MTDViewData | null;
    yesterday: DailyViewData | null;
    historicalWeeks: HistoricalWeek[];
    aiSummary?: WeeklyAISummary;
    ownerActionPlan?: OwnerActionPlan;
    ownerConfidence?: OwnerConfidence;
    sourceQuality?: SourceQuality[];
    analyticsAiEntitlement?: AnalyticsAiEntitlement;
    catalogInsightCount?: number;
    catalogInsightGeneratedAt?: Date;
}

// ================================================================
// OVERALL (LIFETIME) DATA - FOOTER
// ================================================================

export interface OverallData {
    lifetimeMetrics: {
        totalViews: number;
        totalClicks: number;
        totalSmartPicksRendered: number;
        totalSmartPicksClicks: number;
        menuSessions?: number;
        engagedSessions?: number;
        intentSessions?: number;
        actionSessions?: number;
        engagedSessionRate?: number;
        intentRate?: number;
        actionRate?: number;
        totalSearches?: number;
        totalZeroResultSearches?: number;
        totalUnavailableItemTaps?: number;
        totalMenuActionClicks?: number;
    };
    topCategories?: TopCategory[];
    topLanguages?: LanguageUsage[];
    topAttributeFilters?: AttributeFilterInterest[];
    menuActions?: MenuActionBreakdown;
    sourceQuality?: SourceQuality[];
    ownerConfidence?: OwnerConfidence;
    firstDataDate?: string; // When tracking started
    lastUpdated?: Date;
}

// ================================================================
// COMBINED DASHBOARD DATA
// ================================================================

export interface OwnerDashboardData {
    // Overview (primary view)
    overview: OverviewData | null;

    // Period views
    today: DailyViewData | null;
    daily: DailyViewData | null;
    weekly: WeeklyViewData | null;
    monthly: MonthlyViewData | null;

    // WTD/MTD rolling aggregates
    wtd: WTDViewData | null;
    mtd: MTDViewData | null;

    // Historical comparison
    historicalWeeks: HistoricalWeek[];

    // Lifetime footer
    overall: OverallData | null;

    // Owner-facing action read model
    ownerActionPlan?: OwnerActionPlan;
    ownerConfidence?: OwnerConfidence;
    sourceQuality?: SourceQuality[];
    analyticsAiEntitlement?: AnalyticsAiEntitlement;
    catalogInsightCount?: number;
    catalogInsightGeneratedAt?: Date;

    // Meta
    projectId: string;
    lastFetched: Date;
}

// ================================================================
// HOOK RETURN TYPE
// ================================================================

export interface UseOwnerDashboardReturn {
    data: OwnerDashboardData | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;

    // Convenience getters
    currentViewData: OverviewData | DailyViewData | WeeklyViewData | MonthlyViewData | null;
    viewMode: OwnerDashboardViewMode;
    setViewMode: (mode: OwnerDashboardViewMode) => void;

    // Loading states for lazy-loaded data
    loadingToday: boolean;
    loadingDaily: boolean;
    loadingWeekly: boolean;
    loadingMonthly: boolean;
}

// ================================================================
// GUARDRAILS
// ================================================================

export const OVERVIEW_GUARDRAILS = {
    LOW_ACTIVITY_THRESHOLD: 50, // Show "Low activity" if WTD < 50 views
    SHOW_HISTORICAL_WEEKS: 4,   // Show last 4 weeks
    SHOW_TOP_ITEMS: 3,          // Show top 3 items only
    SHOW_FULL_AI_SUMMARY: false, // Show abbreviated summary
    MAX_AI_BULLETS: 3,
} as const;

export const DAILY_GUARDRAILS = {
    LOW_ACTIVITY_THRESHOLD: 20, // Show "Low activity" if < 20 views
    MAX_METRICS_SHOWN: 4,
    MAX_AI_BULLETS: 2,
    SHOW_PERCENTAGE_CHANGE: false,
    SHOW_COMPARISONS: false,
    SHOW_ARROWS: false,
} as const;

export const WEEKLY_GUARDRAILS = {
    MIN_DAYS_FOR_SUMMARY: 7,
    MAX_AI_BULLETS: 5,
    SHOW_PERCENTAGE_CHANGE: true,
} as const;

export const MONTHLY_GUARDRAILS = {
    MAX_AI_BULLETS: 3,
    SHOW_WEEK_BREAKDOWN: false,
    SHOW_COMPARISONS: false,
    USE_NEUTRAL_COLORS: true, // No red/green
} as const;

// ================================================================
// EMPTY STATE MESSAGES
// ================================================================

export const EMPTY_STATE_MESSAGES = {
    noData: {
        title: 'No data yet',
        description: 'Your analytics will appear here once customers start visiting.',
    },
    lowActivity: {
        title: 'Low activity yesterday',
        description: 'Not enough visits to show detailed insights.',
    },
    noWeeklyData: {
        title: 'Building your weekly summary',
        description: 'Check back on Monday for your first weekly summary.',
    },
    noMonthlyData: {
        title: 'Monthly summary coming soon',
        description: 'Check back on the 1st of next month.',
    },
} as const;

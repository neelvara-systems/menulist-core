/**
 * CONTINUOUS MENU INTELLIGENCE - SHARED TYPES
 * ═══════════════════════════════════════════════════════════════
 * 
 * Shared TypeScript types for Menu Intelligence feature.
 * Used by both frontend (DAL, components) and can be synced with Cloud Functions.
 * 
 * Note: Cloud Functions have their own copies in functions/src/intelligence/menuIntelligence.ts
 * using Firestore Timestamp instead of Date. These types should stay structurally in sync.
 * The DAL (src/lib/intelligence/dal.ts) converts Timestamps → Dates on read.
 */

export interface ConfidenceData {
    score: number;                          // 0-1 confidence score
    trend: 'rising' | 'stable' | 'falling';
    lastUpdated: Date;
    stableDays: number;
    views7d: number;
    clicks7d: number;
    engagementRate: number;
}

export interface SuppressionWindow {
    suppressedAt: Date;
    suppressUntil: Date;
    reason: 'fatigue' | 'low_confidence' | 'owner_skip' | 'time_window';
}

export interface TimeEligibility {
    breakfast: boolean;    // 06:00-10:00
    lunch: boolean;        // 11:00-14:00
    dinner: boolean;       // 18:00-22:00
    lateNight: boolean;    // 22:00-02:00
}

export interface ProjectCalibration {
    locked: boolean;
    lockedAt?: Date;
    baselineConfidence: number;
    fatigueThreshold: number;
    autoActionsEnabled: boolean;
}

export interface ReasonFactors {
    clicks7d: number;
    pageViews7d: number;
    engagementRate: number;
    decisionBlockClicks7d: number;
    ownerBoost: number;
    isBestSeller: boolean;
    previousScore?: number;
    scoreDelta?: number;
    stableDays: number;
    rankInCategory?: number;
    categoryItemCount?: number;
    percentileInProject?: number;
}

export interface AuditLogEntry {
    action:
    | 'AUTO_HIDE'
    | 'AUTO_DEMOTE'
    | 'AUTO_PROMOTE'
    | 'AUTO_SUPPRESS'
    | 'AUTO_ADJUST_TIME'
    | 'AUTO_STABILIZE'
    | 'CALIBRATION_LOCKED'
    | 'STABILITY_MODE_ON'
    | 'STABILITY_MODE_OFF';
    itemId?: string;
    itemName?: string;
    previousValue?: any;
    newValue?: any;
    timestamp: Date;
    reversible: boolean;
    reversed: boolean;
    reversedAt?: Date;
    reason: {
        primary: string;
        factors: ReasonFactors;
        comparison?: string;
        threshold?: string;
    };
    // Enriched debugging fields (Item 4: Enrich Audit Logs)
    source?: 'nightly_job' | 'manual_trigger' | 'real_time' | 'owner_action';
    correlationId?: string;     // Links related actions in same run
    runNumber?: number;         // Which nightly run this was
    surfaceAffected?: 'decision_blocks' | 'campaigns' | 'digital_screen' | 'staff_prompt' | 'all';
    confidenceAtAction?: number; // Item confidence when action was taken
    analyticsSnapshot?: {       // Quick snapshot of analytics at action time
        views7d: number;
        clicks7d: number;
        orders7d: number;
    };
}

export interface MenuIntelligenceState {
    tId: string;
    sId: string;
    projectId: string;
    itemConfidence: Record<string, ConfidenceData>;
    itemPriority: Record<string, number>;
    previousItemRanks: Record<string, number>;
    suppressionWindows: Record<string, SuppressionWindow>;
    timeEligibility: Record<string, TimeEligibility>;
    projectCalibration: ProjectCalibration;
    computedAt: Date;
    validUntil: Date;
    runCount: number;
    daysSinceCreation: number;
    lastAnalyticsDate?: string;
    recentAuditLog: AuditLogEntry[];
    stabilityMode: boolean;
    stabilityModeReason?: string;
    healthSummary?: HealthSummary;
    statsUsed: {
        totalItems: number;
        itemsWithViews: number;
        itemsWithConfidence: number;
    };
}

export interface HealthSummary {
    rankVolatility: number;
    maxShift: number;
    avgPriority: number;
    lowDataMode: boolean;
    topItemDays: number;
    topItemId?: string;
    status: 'healthy' | 'warning' | 'critical';
}

export interface ItemPresentation {
    visible: true;
    priority: number;
    highlight: boolean;
    eligibleForRecommendation: boolean;
    confidence?: number;
    tier?: ConfidenceTier;
}

/**
 * Confidence tier based on score
 */
export type ConfidenceTier = 'CONFIDENT' | 'CAUTIOUS' | 'LOW_DATA' | 'UNKNOWN';

/**
 * Get confidence tier from score
 */
export function getConfidenceTier(score: number | undefined): ConfidenceTier {
    if (score === undefined) return 'UNKNOWN';
    if (score >= 0.65) return 'CONFIDENT';
    if (score >= 0.35) return 'CAUTIOUS';
    return 'LOW_DATA';
}

/**
 * Check if item is suppressed
 */
export function isItemSuppressed(
    suppression: SuppressionWindow | undefined
): boolean {
    if (!suppression) return false;
    return new Date() < new Date(suppression.suppressUntil);
}

/**
 * Check if item is eligible for current time slot
 */
export function isItemEligibleNow(
    eligibility: TimeEligibility | undefined
): boolean {
    if (!eligibility) return true; // No data = assume eligible

    const hour = new Date().getHours();

    if (hour >= 6 && hour < 10) return eligibility.breakfast;
    if (hour >= 11 && hour < 14) return eligibility.lunch;
    if (hour >= 18 && hour < 22) return eligibility.dinner;
    if (hour >= 22 || hour < 2) return eligibility.lateNight;

    return true; // Off-peak hours = eligible
}

// ═══════════════════════════════════════════════════════════════
// CMI V1.1 CONSTRAINT CONSTANTS
// "MenuList can annotate truth, but not withhold truth."
// ═══════════════════════════════════════════════════════════════

export const CMI_CONSTRAINTS = {
    MAX_SHIFT_PER_DAY: 2,
    MAX_ITEMS_CHANGED_RATIO: 0.3,
    DAMPENING_OLD_WEIGHT: 0.7,
    DAMPENING_NEW_WEIGHT: 0.3,
    MIN_PRIORITY: 0.1,
    MAX_PRIORITY: 1.0,
    MIN_PRIORITY_CHANGE: 0.05,
    NEW_ITEM_BOOST: 0.1,
    NEW_ITEM_BOOST_DAYS: 7,
    RECENCY_BOOST_MAX: 0.05,
    RECENCY_MIN_CLICKS_7D: 10,
    LOW_DATA_VIEWS_THRESHOLD: 100,
    TIME_WEIGHT_OFF_PEAK: 0.7,
    FATIGUE_WEIGHT: 0.6,
    HIGHLIGHT_THRESHOLD: 0.7,
    RECOMMENDATION_THRESHOLD: 0.6,
} as const;

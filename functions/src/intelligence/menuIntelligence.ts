/**
 * CONTINUOUS MENU INTELLIGENCE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Computes menu intelligence state for a project based on 7-day analytics.
 * Runs nightly as part of the Decision Blocks scheduler (2:30 AM UTC).
 * 
 * Key Concepts:
 * - Confidence: 0-1 score representing system trust in an item
 * - Priority: 0-1 ranking score (items are NEVER hidden, only ranked)
 * - Suppression Detection: Fatigue signal capture (reduces priority, never hides)
 * - Time Eligibility: Item performance varies by time of day (soft weight, never binary)
 * - Calibration: Project-specific baselines after 21 days
 * - Health Monitoring: 5 internal metrics for detecting system drift
 * 
 * Authority Principle:
 * - Trust builds slowly (max +0.05/day)
 * - Trust breaks fast (immediate on poor performance)
 * - No explanations to owners (never show confidence)
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { AggregatedAnalytics } from './shared/analyticsAggregator';
import { ExtractedItem } from './shared/itemExtractor';
import { calculateEngagementRate } from './shared/scoreNormalizer';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ConfidenceData {
    score: number;                          // 0-1 confidence score
    trend: 'rising' | 'stable' | 'falling';
    lastUpdated: Timestamp;
    stableDays: number;
    views7d: number;
    clicks7d: number;
    engagementRate: number;
}

export interface SuppressionWindow {
    suppressedAt: Timestamp;
    suppressUntil: Timestamp;
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
    lockedAt?: Timestamp;
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
    timestamp: Timestamp;
    reversible: boolean;
    reversed: boolean;
    reversedAt?: Timestamp;
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

export interface HealthSummary {
    rankVolatility: number;
    maxShift: number;
    avgPriority: number;
    lowDataMode: boolean;
    topItemDays: number;
    topItemId?: string;
    status: 'healthy' | 'warning' | 'critical';
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
    computedAt: FieldValue;
    validUntil: Date;
    runCount: number;
    daysSinceCreation: number;
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

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CONFIDENCE_THRESHOLDS = {
    CONFIDENT: 0.65,      // High confidence - can auto-promote
    CAUTIOUS: 0.35,       // Low confidence - reduces priority (never hides)
    MIN_VIEWS: 10,        // Minimum views for meaningful confidence
    MIN_STABLE_DAYS: 3,   // Days required for auto-promote
};

const TIME_SLOTS = {
    breakfast: { start: 6, end: 10 },
    lunch: { start: 11, end: 14 },
    dinner: { start: 18, end: 22 },
    lateNight: { start: 22, end: 2 }  // Wraps around midnight
};

const TTL_HOURS = 48;
const MAX_AUDIT_LOG_ENTRIES = 50;
const CALIBRATION_LOCK_DAY = 21;
const FATIGUE_THRESHOLD_DAYS = 5;  // Days of consecutive high exposure before suppression
const SUPPRESSION_DURATION_DAYS = 2;  // How long to suppress fatigued items

// CMI V1.1 Priority Constraints — "MenuList can annotate truth, but not withhold truth."
const CMI = {
    DAMPENING_OLD: 0.7,
    DAMPENING_NEW: 0.3,
    MIN_PRIORITY: 0.1,
    MAX_PRIORITY: 1.0,
    MIN_CHANGE: 0.05,
    NEW_ITEM_BOOST: 0.1,
    NEW_ITEM_BOOST_DAYS: 7,
    RECENCY_BOOST_MAX: 0.05,
    RECENCY_MIN_7D: 10,
    LOW_DATA_VIEWS: 100,
    TIME_OFF_PEAK_WEIGHT: 0.7,
    FATIGUE_WEIGHT: 0.6,
    MAX_SHIFT: 2,
    MAX_CHANGED_RATIO: 0.3,
    HIGHLIGHT_THRESHOLD: 0.7,
    RECOMMENDATION_THRESHOLD: 0.6,
};

// ═══════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate confidence for a single item
 * 
 * Trust builds slowly (+0.05/day max)
 * Trust breaks fast (immediate)
 */
function calculateConfidence(
    item: ExtractedItem,
    analytics: AggregatedAnalytics,
    previousConfidence?: ConfidenceData
): ConfidenceData {
    const views = item.views;
    const clicks = item.clicks;
    const engagementRate = calculateEngagementRate(clicks, views);
    const dbClicks = item.decisionBlockClicks;

    // Base score from engagement
    let score = 0.5; // Default baseline

    if (views >= 50 && engagementRate >= 0.15) {
        score = 0.8; // High engagement
    } else if (views >= 20 && engagementRate >= 0.1) {
        score = 0.65; // Good engagement
    } else if (views >= CONFIDENCE_THRESHOLDS.MIN_VIEWS) {
        score = 0.5; // Baseline
    } else {
        score = 0.4; // Low data
    }

    // Bonus for decision block clicks (high-value interaction)
    if (dbClicks > 5) {
        score = Math.min(1, score + 0.1);
    } else if (dbClicks > 0) {
        score = Math.min(1, score + 0.05);
    }

    // Owner boost influence (subtle)
    const boostInfluence = ((item.ownerBoost || 0) / 40) * 0.1;
    score = Math.max(0, Math.min(1, score + boostInfluence));

    // Best seller bonus
    if (item.isBestSeller) {
        score = Math.min(1, score + 0.1);
    }

    // Apply slow build / fast break
    if (previousConfidence) {
        const delta = score - previousConfidence.score;
        if (delta > 0) {
            // Trust builds slowly: max +0.05/day
            score = Math.min(previousConfidence.score + 0.05, score);
        }
        // Trust breaks fast: immediate (no clamping on decrease)
    }

    // Determine trend
    const trend = !previousConfidence
        ? 'stable'
        : score > previousConfidence.score + 0.02
            ? 'rising'
            : score < previousConfidence.score - 0.02
                ? 'falling'
                : 'stable';

    // Track stable days
    const stableDays = trend === 'stable'
        ? (previousConfidence?.stableDays || 0) + 1
        : 0;

    return {
        score,
        trend,
        lastUpdated: Timestamp.now(),
        stableDays,
        views7d: views,
        clicks7d: clicks,
        engagementRate
    };
}

/**
 * Calculate time eligibility based on hourly performance
 */
function calculateTimeEligibility(item: ExtractedItem): TimeEligibility {
    const hourlyClicks = item.hourlyClicks || {};

    // Count clicks in each time slot
    const slotClicks = {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        lateNight: 0
    };

    for (const [hourStr, clicks] of Object.entries(hourlyClicks)) {
        const hour = parseInt(hourStr);

        if (hour >= TIME_SLOTS.breakfast.start && hour < TIME_SLOTS.breakfast.end) {
            slotClicks.breakfast += clicks;
        }
        if (hour >= TIME_SLOTS.lunch.start && hour < TIME_SLOTS.lunch.end) {
            slotClicks.lunch += clicks;
        }
        if (hour >= TIME_SLOTS.dinner.start && hour < TIME_SLOTS.dinner.end) {
            slotClicks.dinner += clicks;
        }
        if (hour >= TIME_SLOTS.lateNight.start || hour < TIME_SLOTS.lateNight.end) {
            slotClicks.lateNight += clicks;
        }
    }

    // Total clicks for comparison
    const totalClicks = Object.values(slotClicks).reduce((a, b) => a + b, 0);

    // If no hourly data, all slots are eligible
    if (totalClicks === 0) {
        return { breakfast: true, lunch: true, dinner: true, lateNight: true };
    }

    // Item is eligible if it has at least 10% of its clicks in that slot
    const threshold = totalClicks * 0.1;

    return {
        breakfast: slotClicks.breakfast >= threshold || slotClicks.breakfast > 0,
        lunch: slotClicks.lunch >= threshold || slotClicks.lunch > 0,
        dinner: slotClicks.dinner >= threshold || slotClicks.dinner > 0,
        lateNight: slotClicks.lateNight >= threshold || slotClicks.lateNight > 0
    };
}

/**
 * Calculate suppression windows based on fatigue detection
 * FR-3: Suppression windows auto-applied on fatigue detection
 */
function calculateSuppressionWindows(
    items: ExtractedItem[],
    currentState: MenuIntelligenceState | null,
    newConfidence: Record<string, ConfidenceData>,
    analytics: AggregatedAnalytics,
    newAuditLog: AuditLogEntry[]
): Record<string, SuppressionWindow> {
    const newSuppressionWindows: Record<string, SuppressionWindow> = {};
    const now = new Date();

    for (const item of items) {
        const existingSuppression = currentState?.suppressionWindows?.[item.itemId];
        const confidence = newConfidence[item.itemId];

        // Check if existing suppression is still active
        if (existingSuppression) {
            const suppressUntil = existingSuppression.suppressUntil instanceof Date
                ? existingSuppression.suppressUntil
                : (existingSuppression.suppressUntil as any).toDate?.() || new Date(0);

            if (now < suppressUntil) {
                // Keep existing active suppression
                newSuppressionWindows[item.itemId] = existingSuppression;
                continue;
            }
        }

        // Check for fatigue: high exposure (stable days >= threshold) with declining trend
        if (confidence &&
            confidence.stableDays >= FATIGUE_THRESHOLD_DAYS &&
            confidence.trend === 'falling') {

            const suppressUntil = new Date();
            suppressUntil.setDate(suppressUntil.getDate() + SUPPRESSION_DURATION_DAYS);

            newSuppressionWindows[item.itemId] = {
                suppressedAt: Timestamp.now(),
                suppressUntil: Timestamp.fromDate(suppressUntil),
                reason: 'fatigue'
            };

            newAuditLog.push({
                action: 'AUTO_SUPPRESS',
                itemId: item.itemId,
                itemName: item.itemName,
                previousValue: { stableDays: confidence.stableDays },
                newValue: { suppressedFor: SUPPRESSION_DURATION_DAYS },
                timestamp: Timestamp.now(),
                reversible: true,
                reversed: false,
                reason: {
                    primary: `Item fatigue detected after ${confidence.stableDays} stable days with falling trend`,
                    factors: {
                        clicks7d: item.clicks,
                        pageViews7d: analytics.totalViews,
                        engagementRate: confidence.engagementRate,
                        decisionBlockClicks7d: item.decisionBlockClicks,
                        ownerBoost: item.ownerBoost || 0,
                        isBestSeller: item.isBestSeller || false,
                        stableDays: confidence.stableDays
                    },
                    threshold: `Fatigue: ${FATIGUE_THRESHOLD_DAYS}+ stable days with falling trend`
                }
            });
        }

        // Check for low confidence suppression
        if (confidence && confidence.score < CONFIDENCE_THRESHOLDS.CAUTIOUS) {
            const suppressUntil = new Date();
            suppressUntil.setDate(suppressUntil.getDate() + 1); // Suppress for 1 day

            newSuppressionWindows[item.itemId] = {
                suppressedAt: Timestamp.now(),
                suppressUntil: Timestamp.fromDate(suppressUntil),
                reason: 'low_confidence'
            };
        }
    }

    return newSuppressionWindows;
}

/**
 * Check and update calibration lock
 */
function checkCalibrationLock(
    currentState: MenuIntelligenceState | null,
    newConfidence: Record<string, ConfidenceData>
): ProjectCalibration {
    const daysSinceCreation = currentState?.daysSinceCreation || 0;

    // Already locked
    if (currentState?.projectCalibration?.locked) {
        return currentState.projectCalibration;
    }

    // Check for lock at day 21
    if (daysSinceCreation >= CALIBRATION_LOCK_DAY) {
        // Calculate baseline from average confidence
        const scores = Object.values(newConfidence).map(c => c.score);
        const avgScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0.5;

        return {
            locked: true,
            lockedAt: Timestamp.now(),
            baselineConfidence: avgScore,
            fatigueThreshold: 5,
            autoActionsEnabled: true
        };
    }

    return currentState?.projectCalibration || {
        locked: false,
        baselineConfidence: 0.5,
        fatigueThreshold: 5,
        autoActionsEnabled: true
    };
}

/**
 * Generate correlation ID for linking related audit log entries
 */
function generateCorrelationId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Module-level run context for audit log enrichment
let currentRunContext: {
    correlationId: string;
    runNumber: number;
    source: 'nightly_job' | 'manual_trigger' | 'real_time' | 'owner_action';
} | null = null;

/**
 * Set run context for audit log enrichment
 * Called at start of each intelligence computation
 */
export function setAuditLogRunContext(
    runNumber: number,
    source: 'nightly_job' | 'manual_trigger' | 'real_time' | 'owner_action' = 'nightly_job'
): void {
    currentRunContext = {
        correlationId: generateCorrelationId(),
        runNumber,
        source,
    };
}

/**
 * Generate audit log entry for an action
 * Enriched with debugging fields (Item 4: Enrich Audit Logs)
 */
function createAuditLogEntry(
    action: AuditLogEntry['action'],
    item: ExtractedItem | null,
    analytics: AggregatedAnalytics,
    previousScore: number | undefined,
    newScore: number,
    primaryReason: string
): AuditLogEntry {
    return {
        action,
        itemId: item?.itemId,
        itemName: item?.itemName,
        previousValue: previousScore !== undefined ? { score: previousScore } : undefined,
        newValue: { score: newScore },
        timestamp: Timestamp.now(),
        reversible: true,
        reversed: false,
        reason: {
            primary: primaryReason,
            factors: {
                clicks7d: item?.clicks || 0,
                pageViews7d: analytics.totalViews,
                engagementRate: item ? calculateEngagementRate(item.clicks, item.views) : 0,
                decisionBlockClicks7d: item?.decisionBlockClicks || 0,
                ownerBoost: item?.ownerBoost || 0,
                isBestSeller: item?.isBestSeller || false,
                previousScore,
                scoreDelta: previousScore !== undefined ? newScore - previousScore : undefined,
                stableDays: 0
            }
        },
        // Enriched debugging fields
        source: currentRunContext?.source || 'nightly_job',
        correlationId: currentRunContext?.correlationId,
        runNumber: currentRunContext?.runNumber,
        surfaceAffected: 'all',
        confidenceAtAction: newScore,
        analyticsSnapshot: {
            views7d: item?.views || 0,
            clicks7d: item?.clicks || 0,
            orders7d: item?.orders || 0,
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// CMI V1.1: PRIORITY COMPUTATION (RANKING, NEVER HIDING)
// "MenuList can annotate truth, but not withhold truth."
// ═══════════════════════════════════════════════════════════════

/**
 * Compute priority score for each item.
 * Priority determines ranking order — items are NEVER hidden.
 * 
 * Formula: priority = confidence + newItemBoost + recencyBoost
 * Then apply: dampening → min change threshold → clamp bounds
 */
function computeItemPriority(
    items: ExtractedItem[],
    analytics: AggregatedAnalytics,
    confidence: Record<string, ConfidenceData>,
    suppressionWindows: Record<string, SuppressionWindow>,
    timeEligibility: Record<string, TimeEligibility>,
    currentState: MenuIntelligenceState | null,
    stabilityMode: boolean
): Record<string, number> {
    const result: Record<string, number> = {};

    // In stability mode or low data, flatten all priorities
    if (stabilityMode || analytics.totalViews < CMI.LOW_DATA_VIEWS) {
        for (const item of items) {
            result[item.itemId] = 0.5;
        }
        return result;
    }

    for (const item of items) {
        const conf = confidence[item.itemId];
        const prevPriority = currentState?.itemPriority?.[item.itemId] ?? 0.5;

        // Base priority from confidence score
        let rawPriority = conf?.score ?? 0.5;

        // New item boost: if item has no previous confidence, it's likely new
        const isNewItem = !currentState?.itemConfidence?.[item.itemId];
        if (isNewItem) {
            rawPriority += CMI.NEW_ITEM_BOOST;
        }

        // Recency boost (reacts to short-term trends, capped)
        const clicks7d = analytics.clicksByItem[item.itemId] || 0;
        if (clicks7d >= CMI.RECENCY_MIN_7D) {
            // Use engagement rate relative to average as recency signal
            const avgClicks = analytics.totalClicks / Math.max(items.length, 1);
            const recencyRatio = avgClicks > 0 ? clicks7d / avgClicks : 0;
            const recencyBoost = Math.min(CMI.RECENCY_BOOST_MAX, (recencyRatio - 1) * 0.03);
            if (recencyBoost > 0) {
                rawPriority += recencyBoost;
            }
        }

        // Soft influence from suppression (reduce, never hide)
        const suppression = suppressionWindows[item.itemId];
        if (suppression) {
            const suppressUntil = suppression.suppressUntil instanceof Date
                ? suppression.suppressUntil
                : (suppression.suppressUntil as any).toDate?.() || new Date(0);
            if (new Date() < suppressUntil) {
                rawPriority *= CMI.FATIGUE_WEIGHT;
            }
        }

        // Soft influence from time eligibility (reduce, never hide)
        const elig = timeEligibility[item.itemId];
        if (elig) {
            const hour = new Date().getHours();
            let isCurrentSlot = true;
            if (hour >= 6 && hour < 10) isCurrentSlot = elig.breakfast;
            else if (hour >= 11 && hour < 14) isCurrentSlot = elig.lunch;
            else if (hour >= 18 && hour < 22) isCurrentSlot = elig.dinner;
            else if (hour >= 22 || hour < 2) isCurrentSlot = elig.lateNight;
            if (!isCurrentSlot) {
                rawPriority *= CMI.TIME_OFF_PEAK_WEIGHT;
            }
        }

        // Apply dampening (slow, stable changes)
        let priority = (prevPriority * CMI.DAMPENING_OLD) + (rawPriority * CMI.DAMPENING_NEW);

        // Ignore changes below minimum threshold (prevents noise)
        if (Math.abs(priority - prevPriority) < CMI.MIN_CHANGE) {
            priority = prevPriority;
        }

        // Clamp to valid range — nothing disappears (min 0.1)
        priority = Math.max(CMI.MIN_PRIORITY, Math.min(CMI.MAX_PRIORITY, priority));

        result[item.itemId] = priority;
    }

    return result;
}

/**
 * Convert priority map to rank map (1-based, descending by priority)
 */
function computeRanksFromPriority(itemPriority: Record<string, number>): Record<string, number> {
    const sorted = Object.entries(itemPriority)
        .sort(([, a], [, b]) => b - a);

    const ranks: Record<string, number> = {};
    sorted.forEach(([itemId], index) => {
        ranks[itemId] = index + 1;
    });
    return ranks;
}

/**
 * Compute health summary for internal monitoring.
 * Detects system drift before users feel it.
 */
function computeHealthSummary(
    newPriority: Record<string, number>,
    newRanks: Record<string, number>,
    currentState: MenuIntelligenceState | null,
    totalItems: number,
    lowDataMode: boolean
): HealthSummary {
    const prevRanks = currentState?.previousItemRanks || {};
    const prevHealth = currentState?.healthSummary;

    let changedCount = 0;
    let maxShift = 0;

    for (const [itemId, newRank] of Object.entries(newRanks)) {
        const prevRank = prevRanks[itemId];
        if (prevRank !== undefined) {
            const shift = Math.abs(newRank - prevRank);
            if (shift > 0) changedCount++;
            if (shift > maxShift) maxShift = shift;
        }
    }

    const priorityValues = Object.values(newPriority);
    const avgPriority = priorityValues.length > 0
        ? priorityValues.reduce((a, b) => a + b, 0) / priorityValues.length
        : 0.5;

    const rankVolatility = totalItems > 0 ? changedCount / totalItems : 0;

    // Track top item stability
    const topItemId = Object.entries(newRanks)
        .find(([, rank]) => rank === 1)?.[0];
    const prevTopItemId = prevHealth?.topItemId;
    const topItemDays = (topItemId && topItemId === prevTopItemId)
        ? (prevHealth?.topItemDays || 0) + 1
        : 1;

    // Determine health status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (rankVolatility > 0.4 || maxShift > 3) {
        status = 'critical';
    } else if (rankVolatility > 0.2 || maxShift > 2) {
        status = 'warning';
    }

    return {
        rankVolatility,
        maxShift,
        avgPriority,
        lowDataMode,
        topItemDays,
        topItemId,
        status,
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Compute complete intelligence state for a project
 * 
 * @param items Extracted items with analytics
 * @param analytics Aggregated 7-day analytics
 * @param currentState Previous intelligence state (if exists)
 * @param identity Project identity (tId, sId, projectId)
 * @returns New intelligence state
 */
export function computeIntelligenceState(
    items: ExtractedItem[],
    analytics: AggregatedAnalytics,
    currentState: MenuIntelligenceState | null,
    identity: { tId: string; sId: string; projectId: string }
): MenuIntelligenceState {
    const newConfidence: Record<string, ConfidenceData> = {};
    const newTimeEligibility: Record<string, TimeEligibility> = {};
    const newAuditLog: AuditLogEntry[] = [...(currentState?.recentAuditLog || [])];

    // Calculate confidence and time eligibility for each item
    for (const item of items) {
        const previousConf = currentState?.itemConfidence?.[item.itemId];
        const confidence = calculateConfidence(item, analytics, previousConf);
        newConfidence[item.itemId] = confidence;

        // Calculate time eligibility
        newTimeEligibility[item.itemId] = calculateTimeEligibility(item);

        // Check for auto-actions (only if calibration allows)
        if (currentState?.projectCalibration?.autoActionsEnabled !== false) {
            // Auto-promote: high confidence + stable
            if (
                confidence.score >= CONFIDENCE_THRESHOLDS.CONFIDENT &&
                confidence.stableDays >= CONFIDENCE_THRESHOLDS.MIN_STABLE_DAYS &&
                (!previousConf || previousConf.score < CONFIDENCE_THRESHOLDS.CONFIDENT)
            ) {
                const rate = (confidence.engagementRate * 100).toFixed(1);
                newAuditLog.push(createAuditLogEntry(
                    'AUTO_PROMOTE',
                    item,
                    analytics,
                    previousConf?.score,
                    confidence.score,
                    `High engagement (${rate}%) for ${confidence.stableDays}+ stable days`
                ));
            }

            // Auto-demote: falling below cautious threshold
            if (
                confidence.score < CONFIDENCE_THRESHOLDS.CAUTIOUS &&
                previousConf && previousConf.score >= CONFIDENCE_THRESHOLDS.CAUTIOUS
            ) {
                const rate = (confidence.engagementRate * 100).toFixed(1);
                newAuditLog.push(createAuditLogEntry(
                    'AUTO_DEMOTE',
                    item,
                    analytics,
                    previousConf?.score,
                    confidence.score,
                    `Low engagement (${rate}%) - below ${CONFIDENCE_THRESHOLDS.CAUTIOUS * 100}% threshold`
                ));
            }
        }
    }

    // Check calibration lock
    const newCalibration = checkCalibrationLock(currentState, newConfidence);

    // Log calibration lock if just happened
    if (newCalibration.locked && !currentState?.projectCalibration?.locked) {
        newAuditLog.push({
            action: 'CALIBRATION_LOCKED',
            timestamp: Timestamp.now(),
            reversible: false,
            reversed: false,
            reason: {
                primary: `Project baseline locked at day ${CALIBRATION_LOCK_DAY}`,
                factors: {
                    clicks7d: 0,
                    pageViews7d: analytics.totalViews,
                    engagementRate: 0,
                    decisionBlockClicks7d: 0,
                    ownerBoost: 0,
                    isBestSeller: false,
                    stableDays: 0
                },
                threshold: `Baseline confidence: ${(newCalibration.baselineConfidence * 100).toFixed(0)}%`
            }
        });
    }

    // Calculate suppression windows (FR-3: fatigue detection)
    const newSuppressionWindows = calculateSuppressionWindows(
        items,
        currentState,
        newConfidence,
        analytics,
        newAuditLog
    );

    // Check for stability mode (low data)
    const itemsWithViews = items.filter(i => i.views > 0).length;
    const stabilityMode = analytics.daysWithData < 3 || itemsWithViews < 3;

    // Log stability mode transitions
    if (stabilityMode && !currentState?.stabilityMode) {
        newAuditLog.push({
            action: 'STABILITY_MODE_ON',
            timestamp: Timestamp.now(),
            reversible: true,
            reversed: false,
            reason: {
                primary: 'Insufficient data - evergreen only mode',
                factors: {
                    clicks7d: 0,
                    pageViews7d: analytics.totalViews,
                    engagementRate: 0,
                    decisionBlockClicks7d: 0,
                    ownerBoost: 0,
                    isBestSeller: false,
                    stableDays: 0
                },
                threshold: `Required: 3+ days with data, 3+ items with views`
            }
        });
    } else if (!stabilityMode && currentState?.stabilityMode) {
        // Exiting stability mode - data is now sufficient
        newAuditLog.push({
            action: 'STABILITY_MODE_OFF',
            timestamp: Timestamp.now(),
            reversible: false,
            reversed: false,
            reason: {
                primary: 'Sufficient data - normal intelligence mode resumed',
                factors: {
                    clicks7d: 0,
                    pageViews7d: analytics.totalViews,
                    engagementRate: 0,
                    decisionBlockClicks7d: 0,
                    ownerBoost: 0,
                    isBestSeller: false,
                    stableDays: 0
                },
                threshold: `Met: ${analytics.daysWithData} days with data, ${itemsWithViews} items with views`
            }
        });
    }

    // Trim audit log to max entries
    const trimmedAuditLog = newAuditLog.slice(-MAX_AUDIT_LOG_ENTRIES);

    // Calculate TTL
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + TTL_HOURS);

    // ═══════════════════════════════════════════════════════════════
    // CMI V1.1: Compute item priority (ranking, never hiding)
    // "MenuList can annotate truth, but not withhold truth."
    // ═══════════════════════════════════════════════════════════════
    const newItemPriority = computeItemPriority(
        items, analytics, newConfidence, newSuppressionWindows, newTimeEligibility,
        currentState, stabilityMode
    );

    // Compute previous ranks for shift limiting on next run
    const newPreviousRanks = computeRanksFromPriority(newItemPriority);

    // Compute health summary (internal monitoring only)
    const healthSummary = computeHealthSummary(
        newItemPriority, newPreviousRanks,
        currentState, items.length, stabilityMode
    );

    return {
        tId: identity.tId,
        sId: identity.sId,
        projectId: identity.projectId,
        itemConfidence: newConfidence,
        itemPriority: newItemPriority,
        previousItemRanks: newPreviousRanks,
        suppressionWindows: newSuppressionWindows,
        timeEligibility: newTimeEligibility,
        projectCalibration: newCalibration,
        computedAt: FieldValue.serverTimestamp(),
        validUntil,
        runCount: (currentState?.runCount || 0) + 1,
        daysSinceCreation: (currentState?.daysSinceCreation || 0) + 1,
        recentAuditLog: trimmedAuditLog,
        stabilityMode,
        stabilityModeReason: stabilityMode ? 'Insufficient analytics data' : undefined,
        healthSummary,
        statsUsed: {
            totalItems: items.length,
            itemsWithViews: itemsWithViews,
            itemsWithConfidence: Object.keys(newConfidence).length
        }
    };
}

/**
 * Fetch current intelligence state from Firestore
 */
export async function fetchCurrentIntelligence(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    collectionName: string
): Promise<MenuIntelligenceState | null> {
    const docId = `${tId}_${sId}_${projectId}`;
    const doc = await db.collection(collectionName).doc(docId).get();

    if (!doc.exists) {
        return null;
    }

    return doc.data() as MenuIntelligenceState;
}

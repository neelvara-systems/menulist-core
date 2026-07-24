/**
 * CONTINUOUS MENU INTELLIGENCE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Computes menu intelligence state for a project based on 7-day analytics.
 * Runs from the store-local hourly scheduler after analytics settlement.
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

import { Timestamp } from 'firebase-admin/firestore';
import { AggregatedAnalytics, parseAggregatedAnalytics } from './shared/analyticsAggregator';
import { ExtractedItem, isSafeIntelligenceItemId, parseExtractedItems } from './shared/itemExtractor';
import { calculateEngagementRate } from './shared/scoreNormalizer';
import { isValidAnalyticsDateKey } from '../utils/analyticsDate';

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
    previousValue?: unknown;
    newValue?: unknown;
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
    computedAt: Timestamp;
    validUntil: Timestamp;
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
    RECENCY_BOOST_MAX: 0.05,
    RECENCY_MIN_7D: 10,
    LOW_DATA_VIEWS: 100,
    FATIGUE_WEIGHT: 0.6,
};

const MENU_INTELLIGENCE_ACTIONS = new Set<AuditLogEntry['action']>([
    'AUTO_HIDE', 'AUTO_DEMOTE', 'AUTO_PROMOTE', 'AUTO_SUPPRESS',
    'AUTO_ADJUST_TIME', 'AUTO_STABILIZE', 'CALIBRATION_LOCKED',
    'STABILITY_MODE_ON', 'STABILITY_MODE_OFF',
]);
const MENU_INTELLIGENCE_MAX_ITEMS = 2000;
const FIRESTORE_DOCUMENT_ID_MAX_BYTES = 1500;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isSafeInteger(value: unknown, min = 0): value is number {
    return Number.isSafeInteger(value) && Number(value) >= min;
}

function isCanonicalNumericId(value: unknown): value is string {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return false;
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && String(numeric) === value;
}

function isSafeProjectDocumentId(value: unknown): value is string {
    return isSafeIntelligenceItemId(value) && !value.includes('/');
}

function isSafeMenuIntelligenceDocumentId(tId: string, sId: string, projectId: string): boolean {
    return Buffer.byteLength(`${tId}_${sId}_${projectId}`, 'utf8') <= FIRESTORE_DOCUMENT_ID_MAX_BYTES;
}

function getMenuIntelligenceDocumentId(identity: { tId: string; sId: string; projectId: string }): string {
    if (!isCanonicalNumericId(identity.tId)
        || !isCanonicalNumericId(identity.sId)
        || !isSafeProjectDocumentId(identity.projectId)
        || !isSafeMenuIntelligenceDocumentId(identity.tId, identity.sId, identity.projectId)) {
        throw new Error('menu_intelligence_invalid_identity');
    }
    return `${identity.tId}_${identity.sId}_${identity.projectId}`;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
    return Object.keys(value).every((key) => allowed.includes(key));
}

function parseConfidenceMap(value: unknown): Record<string, ConfidenceData> | null {
    if (!isRecord(value) || Object.keys(value).length > MENU_INTELLIGENCE_MAX_ITEMS) return null;
    const output: Record<string, ConfidenceData> = {};
    for (const [itemId, raw] of Object.entries(value)) {
        if (!isSafeIntelligenceItemId(itemId) || !isRecord(raw)) return null;
        if (!hasOnlyKeys(raw, ['score', 'trend', 'lastUpdated', 'stableDays', 'views7d', 'clicks7d', 'engagementRate'])) return null;
        if (!isFiniteNumber(raw.score, 0, 1)
            || typeof raw.trend !== 'string'
            || !['rising', 'stable', 'falling'].includes(raw.trend)
            || !(raw.lastUpdated instanceof Timestamp)
            || !isSafeInteger(raw.stableDays)
            || !isSafeInteger(raw.views7d)
            || !isSafeInteger(raw.clicks7d)
            || !isFiniteNumber(raw.engagementRate, 0, 1)) return null;
        output[itemId] = {
            score: raw.score,
            trend: raw.trend as ConfidenceData['trend'],
            lastUpdated: raw.lastUpdated,
            stableDays: raw.stableDays,
            views7d: raw.views7d,
            clicks7d: raw.clicks7d,
            engagementRate: raw.engagementRate,
        };
    }
    return output;
}

function parseNumberMap(value: unknown, min: number, max: number): Record<string, number> | null {
    if (!isRecord(value) || Object.keys(value).length > MENU_INTELLIGENCE_MAX_ITEMS) return null;
    const output: Record<string, number> = {};
    for (const [itemId, raw] of Object.entries(value)) {
        if (!isSafeIntelligenceItemId(itemId) || !isFiniteNumber(raw, min, max)) return null;
        output[itemId] = raw;
    }
    return output;
}

function parseRankMap(value: unknown): Record<string, number> | null {
    const output = parseNumberMap(value, 1, MENU_INTELLIGENCE_MAX_ITEMS);
    if (!output || Object.values(output).some((rank) => !Number.isSafeInteger(rank))) return null;
    const ranks = Object.values(output).sort((a, b) => a - b);
    return ranks.every((rank, index) => rank === index + 1) ? output : null;
}

function parseSuppressionMap(value: unknown): Record<string, SuppressionWindow> | null {
    if (!isRecord(value) || Object.keys(value).length > MENU_INTELLIGENCE_MAX_ITEMS) return null;
    const output: Record<string, SuppressionWindow> = {};
    for (const [itemId, raw] of Object.entries(value)) {
        if (!isSafeIntelligenceItemId(itemId) || !isRecord(raw)
            || !hasOnlyKeys(raw, ['suppressedAt', 'suppressUntil', 'reason'])
            || !(raw.suppressedAt instanceof Timestamp)
            || !(raw.suppressUntil instanceof Timestamp)
            || raw.suppressUntil.toMillis() <= raw.suppressedAt.toMillis()
            || typeof raw.reason !== 'string'
            || !['fatigue', 'low_confidence', 'owner_skip', 'time_window'].includes(raw.reason)) return null;
        output[itemId] = {
            suppressedAt: raw.suppressedAt,
            suppressUntil: raw.suppressUntil,
            reason: raw.reason as SuppressionWindow['reason'],
        };
    }
    return output;
}

function parseTimeMap(value: unknown): Record<string, TimeEligibility> | null {
    if (!isRecord(value) || Object.keys(value).length > MENU_INTELLIGENCE_MAX_ITEMS) return null;
    const output: Record<string, TimeEligibility> = {};
    for (const [itemId, raw] of Object.entries(value)) {
        if (!isSafeIntelligenceItemId(itemId) || !isRecord(raw)
            || Object.keys(raw).sort().join('|') !== 'breakfast|dinner|lateNight|lunch'
            || !Object.values(raw).every((entry) => typeof entry === 'boolean')) return null;
        output[itemId] = {
            breakfast: raw.breakfast as boolean,
            lunch: raw.lunch as boolean,
            dinner: raw.dinner as boolean,
            lateNight: raw.lateNight as boolean,
        };
    }
    return output;
}

function parseAuditValue(value: unknown): Record<string, number> | undefined | null {
    if (value === undefined) return undefined;
    if (!isRecord(value) || Object.keys(value).length !== 1) return null;
    if (isFiniteNumber(value.score, 0, 1)) return { score: value.score };
    if (isSafeInteger(value.stableDays)) return { stableDays: value.stableDays };
    if (isSafeInteger(value.suppressedFor, 1) && value.suppressedFor <= 365) {
        return { suppressedFor: value.suppressedFor };
    }
    return null;
}

function parseAuditLog(value: unknown): AuditLogEntry[] | null {
    if (!Array.isArray(value) || value.length > MAX_AUDIT_LOG_ENTRIES) return null;
    const output: AuditLogEntry[] = [];
    for (const raw of value) {
        if (!isRecord(raw)
            || !hasOnlyKeys(raw, [
                'action', 'itemId', 'itemName', 'previousValue', 'newValue',
                'timestamp', 'reversible', 'reversed', 'reversedAt', 'reason',
                'source', 'correlationId', 'runNumber', 'surfaceAffected',
                'confidenceAtAction', 'analyticsSnapshot',
            ])
            || !MENU_INTELLIGENCE_ACTIONS.has(raw.action as AuditLogEntry['action'])
            || !(raw.timestamp instanceof Timestamp)
            || typeof raw.reversible !== 'boolean'
            || typeof raw.reversed !== 'boolean'
            || !isRecord(raw.reason)
            || typeof raw.reason.primary !== 'string'
            || raw.reason.primary.length > 500
            || !hasOnlyKeys(raw.reason, ['primary', 'factors', 'comparison', 'threshold'])
            || (raw.reason.comparison !== undefined && (typeof raw.reason.comparison !== 'string' || raw.reason.comparison.length > 500))
            || (raw.reason.threshold !== undefined && (typeof raw.reason.threshold !== 'string' || raw.reason.threshold.length > 500))
            || !isRecord(raw.reason.factors)) return null;
        const factors = raw.reason.factors;
        if (!hasOnlyKeys(factors, [
            'clicks7d', 'pageViews7d', 'engagementRate', 'decisionBlockClicks7d',
            'ownerBoost', 'isBestSeller', 'previousScore', 'scoreDelta',
            'stableDays', 'rankInCategory', 'categoryItemCount', 'percentileInProject',
        ])) return null;
        if (!isSafeInteger(factors.clicks7d)
            || !isSafeInteger(factors.pageViews7d)
            || !isFiniteNumber(factors.engagementRate, 0, 1)
            || !isSafeInteger(factors.decisionBlockClicks7d)
            || !isFiniteNumber(factors.ownerBoost, -20, 20)
            || !isSafeInteger(factors.stableDays)) return null;
        if (typeof factors.isBestSeller !== 'boolean') return null;
        if (raw.itemId !== undefined && !isSafeIntelligenceItemId(raw.itemId)) return null;
        if (raw.itemName !== undefined && (typeof raw.itemName !== 'string' || raw.itemName.length > 500)) return null;
        if (raw.reversedAt !== undefined && !(raw.reversedAt instanceof Timestamp)) return null;
        if (raw.reversed !== (raw.reversedAt instanceof Timestamp)) return null;
        if (raw.source !== undefined && (typeof raw.source !== 'string'
            || !['nightly_job', 'manual_trigger', 'real_time', 'owner_action'].includes(raw.source))) return null;
        if (raw.correlationId !== undefined && (typeof raw.correlationId !== 'string' || raw.correlationId.length > 200)) return null;
        if (raw.runNumber !== undefined && !isSafeInteger(raw.runNumber, 1)) return null;
        if (raw.surfaceAffected !== undefined && (typeof raw.surfaceAffected !== 'string'
            || !['decision_blocks', 'campaigns', 'digital_screen', 'staff_prompt', 'all'].includes(raw.surfaceAffected))) return null;
        if (raw.confidenceAtAction !== undefined && !isFiniteNumber(raw.confidenceAtAction, 0, 1)) return null;
        if (factors.previousScore !== undefined && !isFiniteNumber(factors.previousScore, 0, 1)) return null;
        if (factors.scoreDelta !== undefined && !isFiniteNumber(factors.scoreDelta, -1, 1)) return null;
        if (factors.rankInCategory !== undefined && !isSafeInteger(factors.rankInCategory, 1)) return null;
        if (factors.categoryItemCount !== undefined && !isSafeInteger(factors.categoryItemCount, 1)) return null;
        if (factors.percentileInProject !== undefined && !isFiniteNumber(factors.percentileInProject, 0, 100)) return null;
        const previousValue = parseAuditValue(raw.previousValue);
        const newValue = parseAuditValue(raw.newValue);
        if (previousValue === null || newValue === null) return null;
        if (raw.analyticsSnapshot !== undefined && (!isRecord(raw.analyticsSnapshot)
            || Object.keys(raw.analyticsSnapshot).sort().join('|') !== 'clicks7d|orders7d|views7d'
            || !isSafeInteger(raw.analyticsSnapshot.views7d)
            || !isSafeInteger(raw.analyticsSnapshot.clicks7d)
            || !isSafeInteger(raw.analyticsSnapshot.orders7d))) return null;
        output.push({
            action: raw.action as AuditLogEntry['action'],
            itemId: raw.itemId as string | undefined,
            itemName: raw.itemName as string | undefined,
            previousValue,
            newValue,
            timestamp: raw.timestamp,
            reversible: raw.reversible,
            reversed: raw.reversed,
            reversedAt: raw.reversedAt as Timestamp | undefined,
            reason: {
                primary: raw.reason.primary,
                factors: {
                    clicks7d: factors.clicks7d as number,
                    pageViews7d: factors.pageViews7d as number,
                    engagementRate: factors.engagementRate as number,
                    decisionBlockClicks7d: factors.decisionBlockClicks7d as number,
                    ownerBoost: factors.ownerBoost as number,
                    isBestSeller: factors.isBestSeller,
                    previousScore: typeof factors.previousScore === 'number' ? factors.previousScore : undefined,
                    scoreDelta: typeof factors.scoreDelta === 'number' ? factors.scoreDelta : undefined,
                    stableDays: factors.stableDays as number,
                    rankInCategory: typeof factors.rankInCategory === 'number' ? factors.rankInCategory : undefined,
                    categoryItemCount: typeof factors.categoryItemCount === 'number' ? factors.categoryItemCount : undefined,
                    percentileInProject: typeof factors.percentileInProject === 'number' ? factors.percentileInProject : undefined,
                },
                comparison: typeof raw.reason.comparison === 'string' ? raw.reason.comparison : undefined,
                threshold: typeof raw.reason.threshold === 'string' ? raw.reason.threshold : undefined,
            },
            source: typeof raw.source === 'string'
                && ['nightly_job', 'manual_trigger', 'real_time', 'owner_action'].includes(raw.source)
                ? raw.source as AuditLogEntry['source'] : undefined,
            correlationId: typeof raw.correlationId === 'string' ? raw.correlationId : undefined,
            runNumber: isSafeInteger(raw.runNumber, 1) ? raw.runNumber : undefined,
            surfaceAffected: typeof raw.surfaceAffected === 'string'
                && ['decision_blocks', 'campaigns', 'digital_screen', 'staff_prompt', 'all'].includes(raw.surfaceAffected)
                ? raw.surfaceAffected as AuditLogEntry['surfaceAffected'] : undefined,
            confidenceAtAction: isFiniteNumber(raw.confidenceAtAction, 0, 1) ? raw.confidenceAtAction : undefined,
            analyticsSnapshot: isRecord(raw.analyticsSnapshot)
                && isSafeInteger(raw.analyticsSnapshot.views7d)
                && isSafeInteger(raw.analyticsSnapshot.clicks7d)
                && isSafeInteger(raw.analyticsSnapshot.orders7d)
                ? {
                    views7d: raw.analyticsSnapshot.views7d,
                    clicks7d: raw.analyticsSnapshot.clicks7d,
                    orders7d: raw.analyticsSnapshot.orders7d,
                }
                : undefined,
        });
    }
    return output;
}

export function parseMenuIntelligenceState(
    value: unknown,
    documentId: string,
): MenuIntelligenceState | null {
    if (!isRecord(value) || !hasOnlyKeys(value, [
        'tId', 'sId', 'projectId', 'itemConfidence', 'itemPriority',
        'previousItemRanks', 'suppressionWindows', 'timeEligibility',
        'projectCalibration', 'computedAt', 'validUntil', 'runCount',
        'daysSinceCreation', 'lastAnalyticsDate', 'recentAuditLog',
        'stabilityMode', 'stabilityModeReason', 'healthSummary', 'statsUsed',
    ])) return null;
    if (!isCanonicalNumericId(value.tId) || !isCanonicalNumericId(value.sId)
        || !isSafeProjectDocumentId(value.projectId)
        || documentId !== `${value.tId}_${value.sId}_${value.projectId}`
        || !isSafeMenuIntelligenceDocumentId(value.tId, value.sId, value.projectId)
        || !(value.computedAt instanceof Timestamp)
        || !(value.validUntil instanceof Timestamp)
        || value.validUntil.toMillis() <= value.computedAt.toMillis()
        || value.validUntil.toMillis() > value.computedAt.toMillis() + (7 * 24 * 60 * 60 * 1000)
        || !isSafeInteger(value.runCount, 1)
        || !isSafeInteger(value.daysSinceCreation)
        || value.daysSinceCreation > value.runCount
        || (value.lastAnalyticsDate !== undefined && !isValidAnalyticsDateKey(value.lastAnalyticsDate))
        || typeof value.stabilityMode !== 'boolean'
        || (value.stabilityModeReason !== undefined && (typeof value.stabilityModeReason !== 'string'
            || value.stabilityModeReason.trim().length === 0
            || value.stabilityModeReason.length > 200))
        || value.stabilityMode !== (typeof value.stabilityModeReason === 'string')) return null;

    const itemConfidence = parseConfidenceMap(value.itemConfidence);
    const itemPriority = parseNumberMap(value.itemPriority, CMI.MIN_PRIORITY, CMI.MAX_PRIORITY);
    const previousItemRanks = parseRankMap(value.previousItemRanks);
    const suppressionWindows = parseSuppressionMap(value.suppressionWindows);
    const timeEligibility = parseTimeMap(value.timeEligibility);
    const recentAuditLog = parseAuditLog(value.recentAuditLog);
    if (!itemConfidence || !itemPriority || !previousItemRanks || !suppressionWindows || !timeEligibility || !recentAuditLog) return null;
    const itemKeys = Object.keys(itemConfidence).sort().join('|');
    if (Object.keys(itemPriority).sort().join('|') !== itemKeys
        || Object.keys(previousItemRanks).sort().join('|') !== itemKeys
        || Object.keys(timeEligibility).sort().join('|') !== itemKeys
        || Object.keys(suppressionWindows).some((itemId) => !Object.prototype.hasOwnProperty.call(itemConfidence, itemId))) return null;

    const computedAtMillis = value.computedAt.toMillis();
    const daysSinceCreation = value.daysSinceCreation;
    if (computedAtMillis > Date.now() + (5 * 60 * 1000)
        || Object.values(itemConfidence).some((entry) => (
            entry.lastUpdated.toMillis() > computedAtMillis
            || entry.stableDays > daysSinceCreation
        ))
        || Object.values(suppressionWindows).some((entry) => entry.suppressedAt.toMillis() > computedAtMillis)
        || recentAuditLog.some((entry) => (
            entry.timestamp.toMillis() > computedAtMillis
            || (entry.reversedAt?.toMillis() || 0) > computedAtMillis
            || (entry.reversedAt !== undefined && entry.reversedAt.toMillis() < entry.timestamp.toMillis())
        ))) return null;

    if (!isRecord(value.projectCalibration) || typeof value.projectCalibration.locked !== 'boolean'
        || !hasOnlyKeys(value.projectCalibration, ['locked', 'lockedAt', 'baselineConfidence', 'fatigueThreshold', 'autoActionsEnabled'])
        || !isFiniteNumber(value.projectCalibration.baselineConfidence, 0, 1)
        || !isSafeInteger(value.projectCalibration.fatigueThreshold, 1)
        || value.projectCalibration.fatigueThreshold > 365
        || typeof value.projectCalibration.autoActionsEnabled !== 'boolean'
        || (value.projectCalibration.locked && !(value.projectCalibration.lockedAt instanceof Timestamp))
        || (!value.projectCalibration.locked && value.projectCalibration.lockedAt !== undefined)
        || (value.projectCalibration.lockedAt !== undefined && !(value.projectCalibration.lockedAt instanceof Timestamp))
        || (value.projectCalibration.lockedAt instanceof Timestamp
            && value.projectCalibration.lockedAt.toMillis() > computedAtMillis)) return null;
    if (!isRecord(value.statsUsed)
        || Object.keys(value.statsUsed).sort().join('|') !== 'itemsWithConfidence|itemsWithViews|totalItems'
        || !isSafeInteger(value.statsUsed.totalItems)
        || !isSafeInteger(value.statsUsed.itemsWithViews)
        || !isSafeInteger(value.statsUsed.itemsWithConfidence)
        || value.statsUsed.totalItems !== Object.keys(itemConfidence).length
        || value.statsUsed.itemsWithConfidence !== Object.keys(itemConfidence).length
        || value.statsUsed.itemsWithViews > value.statsUsed.totalItems
        || value.statsUsed.itemsWithViews !== Object.values(itemConfidence).filter((entry) => entry.views7d > 0).length) return null;

    let healthSummary: HealthSummary | undefined;
    if (value.healthSummary !== undefined) {
        if (!isRecord(value.healthSummary)) return null;
        const topItemId = value.healthSummary.topItemId;
        if (!hasOnlyKeys(value.healthSummary, ['rankVolatility', 'maxShift', 'avgPriority', 'lowDataMode', 'topItemDays', 'topItemId', 'status'])
            || !isFiniteNumber(value.healthSummary.rankVolatility, 0, 1)
            || !isSafeInteger(value.healthSummary.maxShift)
            || !isFiniteNumber(value.healthSummary.avgPriority, 0, 1)
            || typeof value.healthSummary.lowDataMode !== 'boolean'
            || !isSafeInteger(value.healthSummary.topItemDays)
            || value.healthSummary.topItemDays > daysSinceCreation
            || (topItemId !== undefined && !isSafeIntelligenceItemId(topItemId))
            || typeof value.healthSummary.status !== 'string'
            || !['healthy', 'warning', 'critical'].includes(value.healthSummary.status)) return null;
        if ((topItemId === undefined && value.healthSummary.topItemDays !== 0)
            || (typeof topItemId === 'string' && previousItemRanks[topItemId] !== 1)
            || value.healthSummary.lowDataMode !== value.stabilityMode
            || value.healthSummary.maxShift >= MENU_INTELLIGENCE_MAX_ITEMS) return null;
        healthSummary = {
            rankVolatility: value.healthSummary.rankVolatility,
            maxShift: value.healthSummary.maxShift,
            avgPriority: value.healthSummary.avgPriority,
            lowDataMode: value.healthSummary.lowDataMode,
            topItemDays: value.healthSummary.topItemDays,
            topItemId: topItemId as string | undefined,
            status: value.healthSummary.status as HealthSummary['status'],
        };
    }

    return {
        tId: value.tId,
        sId: value.sId,
        projectId: value.projectId,
        itemConfidence,
        itemPriority,
        previousItemRanks,
        suppressionWindows,
        timeEligibility,
        projectCalibration: {
            locked: value.projectCalibration.locked,
            lockedAt: value.projectCalibration.lockedAt instanceof Timestamp
                ? value.projectCalibration.lockedAt : undefined,
            baselineConfidence: value.projectCalibration.baselineConfidence,
            fatigueThreshold: value.projectCalibration.fatigueThreshold,
            autoActionsEnabled: value.projectCalibration.autoActionsEnabled,
        },
        computedAt: value.computedAt,
        validUntil: value.validUntil,
        runCount: value.runCount,
        daysSinceCreation: value.daysSinceCreation,
        lastAnalyticsDate: value.lastAnalyticsDate as string | undefined,
        recentAuditLog,
        stabilityMode: value.stabilityMode,
        stabilityModeReason: typeof value.stabilityModeReason === 'string' ? value.stabilityModeReason : undefined,
        healthSummary,
        statsUsed: {
            totalItems: value.statsUsed.totalItems,
            itemsWithViews: value.statsUsed.itemsWithViews,
            itemsWithConfidence: value.statsUsed.itemsWithConfidence,
        },
    };
}

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
    previousConfidence: ConfidenceData | undefined,
    advanceAnalyticsDay: boolean,
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

    // Manual recovery can recompute the same settled snapshot. It must not
    // mature confidence or stable-day counters more than once for that date.
    if (previousConfidence && !advanceAnalyticsDay) {
        return {
            ...previousConfidence,
            lastUpdated: Timestamp.now(),
            views7d: views,
            clicks7d: clicks,
            engagementRate,
        };
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
        ? previousConfidence
            ? previousConfidence.stableDays + 1
            : advanceAnalyticsDay ? 1 : 0
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
        breakfast: slotClicks.breakfast >= threshold,
        lunch: slotClicks.lunch >= threshold,
        dinner: slotClicks.dinner >= threshold,
        lateNight: slotClicks.lateNight >= threshold
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
    newAuditLog: AuditLogEntry[],
    advanceAnalyticsDay: boolean,
): Record<string, SuppressionWindow> {
    const newSuppressionWindows: Record<string, SuppressionWindow> = {};
    const now = new Date();

    for (const item of items) {
        const existingSuppression = currentState?.suppressionWindows?.[item.itemId];
        const confidence = newConfidence[item.itemId];

        // Check if existing suppression is still active
        if (existingSuppression) {
            const suppressUntil = existingSuppression.suppressUntil.toDate();

            if (now < suppressUntil) {
                // Keep existing active suppression
                newSuppressionWindows[item.itemId] = existingSuppression;
                continue;
            }
        }

        if (!advanceAnalyticsDay) continue;

        // A falling trend resets the newly computed stable-day counter. Use
        // the preceding settled-day streak to decide whether the decline is
        // fatigue after sustained exposure.
        const priorStableDays = currentState?.itemConfidence?.[item.itemId]?.stableDays || 0;
        if (confidence &&
            priorStableDays >= FATIGUE_THRESHOLD_DAYS &&
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
                previousValue: { stableDays: priorStableDays },
                newValue: { suppressedFor: SUPPRESSION_DURATION_DAYS },
                timestamp: Timestamp.now(),
                reversible: true,
                reversed: false,
                reason: {
                    primary: `Item fatigue detected after ${priorStableDays} stable days with falling trend`,
                    factors: {
                        clicks7d: item.clicks,
                        pageViews7d: analytics.totalViews,
                        engagementRate: confidence.engagementRate,
                        decisionBlockClicks7d: item.decisionBlockClicks,
                        ownerBoost: item.ownerBoost || 0,
                        isBestSeller: item.isBestSeller || false,
                        stableDays: priorStableDays
                    },
                    threshold: `Fatigue: ${FATIGUE_THRESHOLD_DAYS}+ stable days with falling trend`
                }
            });
        }

        // Check for low confidence suppression
        if (
            !newSuppressionWindows[item.itemId]
            && confidence
            && confidence.score < CONFIDENCE_THRESHOLDS.CAUTIOUS
        ) {
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
    newConfidence: Record<string, ConfidenceData>,
    processedAnalyticsDays: number,
): ProjectCalibration {
    // Already locked
    if (currentState?.projectCalibration?.locked) {
        return currentState.projectCalibration;
    }

    // Check for lock at day 21
    if (processedAnalyticsDays >= CALIBRATION_LOCK_DAY) {
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

export interface AuditLogRunContext {
    correlationId: string;
    runNumber: number;
    source: 'nightly_job' | 'manual_trigger' | 'real_time' | 'owner_action';
}

/**
 * Create request-local run context for audit log enrichment.
 */
export function createAuditLogRunContext(
    runNumber: number,
    source: 'nightly_job' | 'manual_trigger' | 'real_time' | 'owner_action' = 'nightly_job'
): AuditLogRunContext {
    return {
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
    primaryReason: string,
    runContext?: AuditLogRunContext,
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
        source: runContext?.source || 'nightly_job',
        correlationId: runContext?.correlationId,
        runNumber: runContext?.runNumber,
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
    currentState: MenuIntelligenceState | null,
    stabilityMode: boolean
): Record<string, number> {
    const result: Record<string, number> = {};
    const activeItemClicks = items.reduce((sum, item) => sum + item.clicks, 0);

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
        const clicks7d = item.clicks;
        if (clicks7d >= CMI.RECENCY_MIN_7D) {
            // Use engagement rate relative to average as recency signal
            const avgClicks = activeItemClicks / Math.max(items.length, 1);
            const recencyRatio = avgClicks > 0 ? clicks7d / avgClicks : 0;
            const recencyBoost = Math.min(CMI.RECENCY_BOOST_MAX, (recencyRatio - 1) * 0.03);
            if (recencyBoost > 0) {
                rawPriority += recencyBoost;
            }
        }

        // Soft influence from suppression (reduce, never hide)
        const suppression = suppressionWindows[item.itemId];
        if (suppression) {
            const suppressUntil = suppression.suppressUntil.toDate();
            if (new Date() < suppressUntil) {
                rawPriority *= CMI.FATIGUE_WEIGHT;
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
        .sort(([itemIdA, priorityA], [itemIdB, priorityB]) => (
            priorityB - priorityA || (itemIdA < itemIdB ? -1 : itemIdA > itemIdB ? 1 : 0)
        ));

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
    lowDataMode: boolean,
    advanceAnalyticsDay: boolean,
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
    const topItemDays = !topItemId
        ? 0
        : !advanceAnalyticsDay
        ? (prevHealth?.topItemDays || 0)
        : topItemId === prevTopItemId
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
    identity: { tId: string; sId: string; projectId: string },
    runContext?: AuditLogRunContext,
): MenuIntelligenceState {
    const documentId = getMenuIntelligenceDocumentId(identity);
    const trustedCurrentState = currentState
        ? parseMenuIntelligenceState(currentState, documentId)
        : null;
    if (currentState && !trustedCurrentState) {
        throw new Error('menu_intelligence_invalid_persisted_state');
    }
    if (analytics.lastSettledLocalDate !== undefined
        && !isValidAnalyticsDateKey(analytics.lastSettledLocalDate)) {
        throw new Error('menu_intelligence_invalid_analytics_date');
    }
    const trustedAnalytics = parseAggregatedAnalytics(analytics);
    if (!trustedAnalytics) throw new Error('menu_intelligence_invalid_analytics');
    if (trustedAnalytics.lastSettledLocalDate
        && trustedCurrentState?.lastAnalyticsDate
        && trustedAnalytics.lastSettledLocalDate < trustedCurrentState.lastAnalyticsDate) {
        throw new Error('menu_intelligence_out_of_order_analytics');
    }
    const scoreableItems = parseExtractedItems(items);
    if (!scoreableItems) throw new Error('menu_intelligence_invalid_item_set');
    const newConfidence: Record<string, ConfidenceData> = {};
    const newTimeEligibility: Record<string, TimeEligibility> = {};
    const newAuditLog: AuditLogEntry[] = [...(trustedCurrentState?.recentAuditLog || [])];
    const analyticsDate = trustedAnalytics.lastSettledLocalDate;
    const previousAnalyticsDate = trustedCurrentState?.lastAnalyticsDate;
    const advanceAnalyticsDay = Boolean(analyticsDate && analyticsDate !== previousAnalyticsDate);
    const processedAnalyticsDays = (trustedCurrentState?.daysSinceCreation || 0)
        + (advanceAnalyticsDay ? 1 : 0);

    // Calculate confidence and time eligibility for each item
    for (const item of scoreableItems) {
        const previousConf = trustedCurrentState?.itemConfidence[item.itemId];
        const confidence = calculateConfidence(item, trustedAnalytics, previousConf, advanceAnalyticsDay);
        newConfidence[item.itemId] = confidence;

        // Calculate time eligibility
        newTimeEligibility[item.itemId] = calculateTimeEligibility(item);

        // Check for auto-actions (only if calibration allows)
        if (advanceAnalyticsDay && trustedCurrentState?.projectCalibration.autoActionsEnabled !== false) {
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
                    trustedAnalytics,
                    previousConf?.score,
                    confidence.score,
                    `High engagement (${rate}%) for ${confidence.stableDays}+ stable days`,
                    runContext,
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
                    trustedAnalytics,
                    previousConf?.score,
                    confidence.score,
                    `Low engagement (${rate}%) - below ${CONFIDENCE_THRESHOLDS.CAUTIOUS * 100}% threshold`,
                    runContext,
                ));
            }
        }
    }

    // Check calibration lock
    const newCalibration = checkCalibrationLock(trustedCurrentState, newConfidence, processedAnalyticsDays);

    // Log calibration lock if just happened
    if (newCalibration.locked && !trustedCurrentState?.projectCalibration.locked) {
        newAuditLog.push({
            action: 'CALIBRATION_LOCKED',
            timestamp: Timestamp.now(),
            reversible: false,
            reversed: false,
            reason: {
                primary: `Project baseline locked at day ${CALIBRATION_LOCK_DAY}`,
                factors: {
                    clicks7d: 0,
                    pageViews7d: trustedAnalytics.totalViews,
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
        scoreableItems,
        trustedCurrentState,
        newConfidence,
        trustedAnalytics,
        newAuditLog,
        advanceAnalyticsDay,
    );

    // Check for stability mode (low data)
    const itemsWithViews = scoreableItems.filter(i => i.views > 0).length;
    const stabilityMode = trustedAnalytics.daysWithData < 3 || itemsWithViews < 3;

    // Log stability mode transitions
    if (stabilityMode && !trustedCurrentState?.stabilityMode) {
        newAuditLog.push({
            action: 'STABILITY_MODE_ON',
            timestamp: Timestamp.now(),
            reversible: true,
            reversed: false,
            reason: {
                primary: 'Insufficient data - evergreen only mode',
                factors: {
                    clicks7d: 0,
                    pageViews7d: trustedAnalytics.totalViews,
                    engagementRate: 0,
                    decisionBlockClicks7d: 0,
                    ownerBoost: 0,
                    isBestSeller: false,
                    stableDays: 0
                },
                threshold: `Required: 3+ days with data, 3+ items with views`
            }
        });
    } else if (!stabilityMode && trustedCurrentState?.stabilityMode) {
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
                    pageViews7d: trustedAnalytics.totalViews,
                    engagementRate: 0,
                    decisionBlockClicks7d: 0,
                    ownerBoost: 0,
                    isBestSeller: false,
                    stableDays: 0
                },
                threshold: `Met: ${trustedAnalytics.daysWithData} days with data, ${itemsWithViews} items with views`
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
        scoreableItems, trustedAnalytics, newConfidence, newSuppressionWindows,
        trustedCurrentState, stabilityMode
    );

    // Compute current ranks for health comparison on the next run
    const newPreviousRanks = computeRanksFromPriority(newItemPriority);

    // Compute health summary (internal monitoring only)
    const healthSummary = computeHealthSummary(
        newItemPriority, newPreviousRanks,
        trustedCurrentState, scoreableItems.length, stabilityMode, advanceAnalyticsDay
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
        computedAt: Timestamp.now(),
        validUntil: Timestamp.fromDate(validUntil),
        runCount: (trustedCurrentState?.runCount || 0) + 1,
        daysSinceCreation: processedAnalyticsDays,
        lastAnalyticsDate: analyticsDate || previousAnalyticsDate,
        recentAuditLog: trimmedAuditLog,
        stabilityMode,
        stabilityModeReason: stabilityMode ? 'Insufficient analytics data' : undefined,
        healthSummary,
        statsUsed: {
            totalItems: scoreableItems.length,
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
    const docId = getMenuIntelligenceDocumentId({ tId, sId, projectId });
    const doc = await db.collection(collectionName).doc(docId).get();

    if (!doc.exists) {
        return null;
    }

    const parsed = parseMenuIntelligenceState(doc.data(), docId);
    if (!parsed) {
        throw new Error('menu_intelligence_invalid_persisted_state');
    }
    return parsed;
}

export async function computeAndPersistMenuIntelligence(
    db: FirebaseFirestore.Firestore,
    collectionName: string,
    items: ExtractedItem[],
    analytics: AggregatedAnalytics,
    identity: { tId: string; sId: string; projectId: string },
    source: AuditLogRunContext['source'],
): Promise<MenuIntelligenceState> {
    const documentId = getMenuIntelligenceDocumentId(identity);
    const documentRef = db.collection(collectionName).doc(documentId);

    return db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(documentRef);
        const currentState = currentSnapshot.exists
            ? parseMenuIntelligenceState(currentSnapshot.data(), documentId)
            : null;
        if (currentSnapshot.exists && !currentState) {
            throw new Error('menu_intelligence_invalid_persisted_state');
        }
        const runContext = createAuditLogRunContext((currentState?.runCount || 0) + 1, source);
        const nextState = computeIntelligenceState(items, analytics, currentState, identity, runContext);
        transaction.set(documentRef, nextState);
        return nextState;
    });
}

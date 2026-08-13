import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getAnalyticsErrorContext, getAnalyticsIdContext } from './analytics/analyticsDiagnostics';
import { processAuthorityMaturationForAllStores } from './analytics/authorityMaturation';
import { processGuestFeedbackRetention } from './analytics/guestFeedbackRetention';
import { processMenuDriftMetricsForAllStores } from './analytics/menuDriftMetrics';
import { FUNCTION_MAX_INSTANCES, SECRET_GROUPS, SECRETS } from './config/secrets';
import { DB_COLLECTIONS } from './constants/database';
import { FUNCTION_FLAGS, FUNCTION_RETENTION_CONFIG, isFunctionFeatureEnabled } from './constants/features';
import { MENULIST_PLATFORM_USER_ROLE } from './constants/user';
import { firestoreAdmin } from './firebaseAdmin';
import { flush as flushSentry, initSentry } from './lib/sentry';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from './sharedData/platformNotificationRegistry';
import { resolveNextSpecialMenuTransitionAt } from './sharedData/specialMenuSchedule';
import { computeAndPersistMenuIntelligence } from './intelligence/menuIntelligence';
import { AggregatedAnalytics, fetch7DayAnalytics } from './intelligence/shared/analyticsAggregator';
import { extractActiveItems } from './intelligence/shared/itemExtractor';
import { compareDecisionScores, getQuickPickThreshold, isQuickPickEnabledForCategory, normalize, WEIGHTS } from './intelligence/shared/scoreNormalizer';
import { revalidatePublicClientCacheForStore } from './logic/publicCacheRevalidation';
import { transitionScheduledSpecialMenu } from './schedulers/specialMenuLifecycle';
import { getSchedulerTaskStatus } from './schedulers/taskStatus';
import { resolveBusinessCategoryOrFallback } from './sharedData/businessTypes';
import { DEFAULT_DECISION_BLOCK_CATEGORY } from './sharedData/decisionBlockConfig';
import {
    normalizeOwnerNotificationDocumentId,
    normalizeOwnerNotificationNumericScopeAliases,
} from './sharedData/ownerNotificationDeliveryBoundary';
import { parsePlatformStoreSummary, type PlatformStoreSummaryData } from './sharedData/storeSummaryBoundary';
import { addDaysToAnalyticsDateKey, getAnalyticsDateRange } from './utils/analyticsDate';
import { getBusinessAnalyticsDateKey, isAnalyticsSettlementDue, resolveBusinessDayEndTime } from './utils/businessDay';
import type { OwnerBusinessHealthBuildResult } from './ownerBusinessAssistant/types';
import {
    getBoundedFunctionsErrorCode,
    getBoundedFunctionsErrorName,
} from './utils/boundedErrorContext';

const GUEST_FEEDBACK_RETENTION_TASK_FAILED = 'GUEST_FEEDBACK_RETENTION_TASK_FAILED';
const SCHEDULER_TASK_FAILED_MESSAGE = 'Scheduler task failed';
const SCHEDULER_ANALYTICS_SETTLEMENT_FAILED = 'SCHEDULER_ANALYTICS_SETTLEMENT_FAILED';
const SCHEDULER_OWNER_BUSINESS_HEALTH_FAILED = 'SCHEDULER_OWNER_BUSINESS_HEALTH_FAILED';
const SCHEDULER_PROJECT_INTELLIGENCE_FAILED = 'SCHEDULER_PROJECT_INTELLIGENCE_FAILED';
const SCHEDULER_PROJECT_SCORING_FAILED = 'SCHEDULER_PROJECT_SCORING_FAILED';
const SCHEDULER_STORE_RECOVERY_FAILED = 'SCHEDULER_STORE_RECOVERY_FAILED';
const SCHEDULER_STORE_SUMMARY_ENRICHMENT_FAILED = 'SCHEDULER_STORE_SUMMARY_ENRICHMENT_FAILED';
const SCHEDULER_AUTHORITY_MATURATION_FAILED = 'SCHEDULER_AUTHORITY_MATURATION_FAILED';
const SCHEDULER_MENU_DRIFT_FAILED = 'SCHEDULER_MENU_DRIFT_FAILED';
const SCHEDULER_LIFECYCLE_MESSAGING_FAILED = 'SCHEDULER_LIFECYCLE_MESSAGING_FAILED';
const SCHEDULER_SPECIAL_MENU_ACTIVATE_FAILED = 'SCHEDULER_SPECIAL_MENU_ACTIVATE_FAILED';
const SCHEDULER_SPECIAL_MENU_DEACTIVATE_FAILED = 'SCHEDULER_SPECIAL_MENU_DEACTIVATE_FAILED';
const SCHEDULER_SPECIAL_MENU_STORE_CHECK_FAILED = 'SCHEDULER_SPECIAL_MENU_STORE_CHECK_FAILED';
const SCHEDULER_SPECIAL_MENU_TASK_FAILED = 'SCHEDULER_SPECIAL_MENU_TASK_FAILED';
const SCHEDULER_EXTRACTION_LEARNING_FAILED = 'SCHEDULER_EXTRACTION_LEARNING_FAILED';
const SCHEDULER_STORE_TRUTH_CONFIDENCE_FAILED = 'SCHEDULER_STORE_TRUTH_CONFIDENCE_FAILED';
const SCHEDULER_STALENESS_CHECK_FAILED = 'SCHEDULER_STALENESS_CHECK_FAILED';
const SCHEDULER_RUN_LOG_PERSIST_FAILED = 'SCHEDULER_RUN_LOG_PERSIST_FAILED';
const SCHEDULER_STORE_LEASE_FINALIZE_FAILED = 'SCHEDULER_STORE_LEASE_FINALIZE_FAILED';
const SCHEDULER_NO_STORES_RUN_LOG_PERSIST_FAILED = 'SCHEDULER_NO_STORES_RUN_LOG_PERSIST_FAILED';
const SCHEDULER_LIFECYCLE_MESSAGE_RETRY_FAILED = 'SCHEDULER_LIFECYCLE_MESSAGE_RETRY_FAILED';
const SCHEDULER_LIFECYCLE_MESSAGE_DIGEST_FAILED = 'SCHEDULER_LIFECYCLE_MESSAGE_DIGEST_FAILED';
const SCHEDULER_DECISION_BLOCKS_FATAL_FAILED = 'SCHEDULER_DECISION_BLOCKS_FATAL_FAILED';
const SCHEDULER_COMPLETION_ALERT_FAILED = 'SCHEDULER_COMPLETION_ALERT_FAILED';
const SCHEDULER_MANUAL_STORE_NOT_FOUND = 'SCHEDULER_MANUAL_STORE_NOT_FOUND';
const SCHEDULER_MANUAL_STORE_TENANT_MISMATCH = 'SCHEDULER_MANUAL_STORE_TENANT_MISMATCH';
const MANUAL_STORE_NOT_FOUND_MESSAGE = 'Store was not found in storesSummary.';
const MANUAL_STORE_TENANT_MISMATCH_MESSAGE = 'Store does not match the requested tenant.';

/**
 * UNIFIED NIGHTLY SCHEDULER (Timezone-Aware)
 * ═══════════════════════════════════════════════════
 * 
 * Runs every hour at :30. Filters stores by schedulerHour (timezone-aware).
 * Only processes stores whose schedulerHour matches the current UTC hour.
 * This enables fast client-side rendering of Decision Blocks without real-time computation.
 * 
 * ARCHITECTURE:
 * - 1 Tenant → Multiple Stores
 * - 1 Store → Multiple Projects
 * - Each Project gets its own project-embedded Decision Blocks projection
 * 
 * SCORING LOGIC:
 * - Popular Right Now: views + clicks + recommendation clicks + owner signals
 * - Quick Pick: duration score (60%) + popularity (30%) + ownerBoost (10%)
 * - Best Value: popularity/price ratio + owner signals
 * 
 * OUTPUT:
 * Creates/updates project field:
 * projects/{tId}/{sId}/{projectId}.publicDecisionBlocks
 * Contains precomputed top items for each block type with reasons.
 * 
 * Deployment:
 * 1. firebase deploy --only functions:computeDecisionBlocksScores
 * 2. Verify in Firebase Console → Functions
 * 3. Check Cloud Scheduler → Job should show hourly runs
 * 
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */

// Types
function getStoreSummaryString(storeInfo: PlatformStoreSummaryData, field: string): string | undefined {
    const value = storeInfo[field];
    return typeof value === 'string' && value.trim() ? value : undefined;
}

function getStoreSummarySchedulerHour(storeInfo: PlatformStoreSummaryData): number | undefined {
    const value = storeInfo.schedulerHour;
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
        ? value
        : undefined;
}

interface ItemStats {
    itemId: string;
    itemName: string;
    category: string;
    views: number;
    clicks: number;
    decisionBlockClicks: number;
    orders: number;
    price: number;
    duration?: number;
    ownerBoost?: number;
    isBestSeller?: boolean;
}

interface ScoredItem {
    itemId: string;
    itemName: string;
    category: string;
    score: number;
    reason: string;                      // i18n key (e.g., "decision.popular.food.favorite")
    reasonParams?: Record<string, any>;  // Optional params for interpolation { minutes: 5 }
    price?: number;
    duration?: number;
}

// Number of fallback candidates to store per block
const CANDIDATES_PER_BLOCK = 3;

// TTL for decision blocks (48 hours - gives buffer if scheduler fails one night)
const DECISION_BLOCKS_TTL_HOURS = 48;
const NIGHTLY_STATE_PREFIX = 'nightlyState';
const NIGHTLY_LOCK_PREFIX = 'nightlyLock';
const NIGHTLY_LOCK_LEASE_MS = 8 * 60 * 1000;
const PLATFORM_DAILY_TASK_STATE_ID = 'decisionBlocksPlatformDaily';
const PLATFORM_DAILY_TASK_LEASE_MS = 10 * 60 * 1000;
const STORE_NIGHTLY_SCHEDULER_LEASE_MS = 10 * 60 * 1000;
const PLATFORM_DAILY_TASK_RETRY_MS = 55 * 60 * 1000;
const PLATFORM_DAILY_TASK_LEASE_LOST = 'PLATFORM_DAILY_TASK_LEASE_LOST';
const PLATFORM_DAILY_TASK_NAMES = new Set([
    'authority_maturation',
    'menu_drift',
    'guest_feedback_retention',
    'lifecycle_messaging',
    'extraction_learning',
    'store_truth_confidence',
    'staleness_check',
]);
const MAX_CATCH_UP_DAYS_PER_RUN = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

interface DecisionBlocksDocument {
    tId: string;
    sId: string;
    projectId: string;          // Each project gets its own Decision Blocks projection
    // Store array of candidates for runtime fallback selection
    popular: ScoredItem[];      // Top 3 candidates, sorted by score
    quickPick: ScoredItem[];    // Top 3 candidates, sorted by score
    bestValue: ScoredItem[];    // Top 3 candidates, sorted by score
    computedAt: FieldValue;
    validUntil: Date;           // TTL - client should fallback to local computation if expired
    statsUsed: {
        totalItems: number;
        itemsWithViews: number;
        itemsWithDuration: number;
        // Hardening fields — used by runtime for lifecycle gating + block eligibility
        totalViews: number;
        totalClicks: number;
        itemsWithClicks: number;
        itemsWithPrice: number;
        durationCoverage: number;  // 0-1, itemsWithDuration / totalItems
        priceCoverage: number;     // 0-1, itemsWithPrice / totalItems
        daysWithData: number;      // Analytics days available (max 7)
    };
}

interface ActiveProjectEntry {
    projectId: string;
    data: FirebaseFirestore.DocumentData;
}

interface NightlyAnalyticsCounters {
    storesAttempted: number;
    storesSucceeded: number;
    storesFailed: number;
    menuProjects: number;
    menuErrors: number;
    obpStoresWithData: number;
    intelligenceSnapshotMissing: number;
}

interface StoreNightlySchedulerResult {
    tId: string;
    sId: string;
    totalProjects: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    intelligenceSuccess: number;
    intelligenceFailed: number;
    errors: SchedulerFailureDiagnostic[];
    analytics: NightlyAnalyticsCounters;
    ownerBusinessHealth?: OwnerBusinessHealthBuildResult;
    enrichment?: { lastPublishedAt: any; projectCount: number };
}

interface SchedulerFailureDiagnostic {
    tId?: string;
    sId?: string;
    projectId?: string;
    phase: string;
    operation?: string;
    error: string;
    code?: string;
    name?: string;
    settlementDate?: string;
    details?: Record<string, any>;
}

function getProjectDocRef(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
) {
    return db.collection(DB_COLLECTIONS.PROJECTS).doc(tId).collection(sId).doc(projectId);
}

function getProjectCollectionRef(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
) {
    return db.collection(DB_COLLECTIONS.PROJECTS).doc(tId).collection(sId);
}

const UNSAFE_SUMMARY_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function isSummaryRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeSummaryPathSegment(value: string): boolean {
    return value.length > 0 && !UNSAFE_SUMMARY_PATH_SEGMENTS.has(value);
}

function createSafeSummaryRecord(source?: Record<string, unknown>): Record<string, unknown> {
    const result = Object.create(null) as Record<string, unknown>;
    if (!source) return result;
    for (const [key, value] of Object.entries(source)) {
        if (isSafeSummaryPathSegment(key)) result[key] = value;
    }
    return result;
}

function parseSummaryProjects(data: unknown): Record<string, Record<string, unknown>> {
    if (!isSummaryRecord(data)) return Object.create(null) as Record<string, Record<string, unknown>>;

    const result = Object.create(null) as Record<string, Record<string, unknown>>;
    if (isSummaryRecord(data.projects)) {
        for (const [projectId, projectData] of Object.entries(data.projects)) {
            if (isSafeSummaryPathSegment(projectId) && isSummaryRecord(projectData)) {
                result[projectId] = createSafeSummaryRecord(projectData);
            }
        }
    }

    for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith('projects.')) continue;
        const rest = key.slice('projects.'.length);
        const [projectId, ...fieldPath] = rest.split('.');
        if (![projectId, ...fieldPath].every(isSafeSummaryPathSegment)) continue;

        if (!result[projectId]) result[projectId] = createSafeSummaryRecord();
        if (fieldPath.length === 0) {
            if (isSummaryRecord(value)) {
                result[projectId] = Object.assign(
                    createSafeSummaryRecord(),
                    result[projectId],
                    createSafeSummaryRecord(value),
                );
            }
            continue;
        }

        let target = result[projectId];
        for (let i = 0; i < fieldPath.length - 1; i++) {
            const segment = fieldPath[i];
            const next = isSummaryRecord(target[segment])
                ? createSafeSummaryRecord(target[segment])
                : createSafeSummaryRecord();
            target[segment] = next;
            target = next;
        }
        target[fieldPath[fieldPath.length - 1]] = value;
    }

    return result;
}

function hasProjectSummaryShape(data: unknown): boolean {
    if (!isSummaryRecord(data)) return false;
    if (Object.prototype.hasOwnProperty.call(data, 'projects')) {
        return isSummaryRecord(data.projects);
    }
    return Object.keys(data).some((key) => key.startsWith('projects.'));
}

async function loadActiveProjectsForScheduler(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
): Promise<{ projectEntries: ActiveProjectEntry[]; activeProjectIds: string[]; source: 'summary' | 'query' }> {
    const summarySnap = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${sId}`).get();
    const summaryData = summarySnap.exists ? summarySnap.data() : undefined;
    const summaryProjects = parseSummaryProjects(summaryData);
    const hasUsableSummary = summarySnap.exists && hasProjectSummaryShape(summaryData);
    const activeProjectIds = Object.entries(summaryProjects)
        .filter(([, project]) => {
            return project.active !== false && project.deleted !== true;
        })
        .map(([projectId]) => projectId);

    if (hasUsableSummary) {
        if (activeProjectIds.length === 0) {
            return { projectEntries: [], activeProjectIds: [], source: 'summary' };
        }

        const refs = activeProjectIds.map((projectId) => getProjectDocRef(db, tId, sId, projectId));
        const projectSnaps = await db.getAll(...refs);
        const projectEntries = projectSnaps
            .filter((snap) => snap.exists)
            .map((snap) => {
                const data = snap.data() || {};
                return {
                    projectId: snap.id,
                    data,
                };
            })
            .filter(({ data }) => data.deleted !== true && data.active !== false);

        return { projectEntries, activeProjectIds, source: 'summary' };
    }

    const projectsQuery = await getProjectCollectionRef(db, tId, sId).get();

    const projectEntries = projectsQuery.docs
        .map((doc) => {
            const data = doc.data();
            return {
                projectId: doc.id,
                data,
            };
        })
        .filter(({ data }) => data.deleted !== true && data.active !== false);

    return {
        projectEntries,
        activeProjectIds: projectEntries.map((entry) => entry.projectId),
        source: 'query',
    };
}

function getNightlyStateRef(db: FirebaseFirestore.Firestore, tId: string, sId: string) {
    return db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`${NIGHTLY_STATE_PREFIX}_${tId}_${sId}`);
}

function getNightlyLockRef(db: FirebaseFirestore.Firestore, tId: string, sId: string, settlementDate: string) {
    return db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`${NIGHTLY_LOCK_PREFIX}_${tId}_${sId}_${settlementDate}`);
}

async function getPendingSettlementDates(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    now: Date,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<string[]> {
    const targetDate = addDaysToAnalyticsDateKey(getBusinessAnalyticsDateKey(now, timeZone, businessDayEndTime), -1);
    const stateSnap = await getNightlyStateRef(db, tId, sId).get();
    const lastSettledLocalDate = stateSnap.exists
        ? String(stateSnap.data()?.lastSettledLocalDate || '')
        : '';
    const firstDate = lastSettledLocalDate
        ? addDaysToAnalyticsDateKey(lastSettledLocalDate, 1)
        : targetDate;

    if (firstDate > targetDate) return [];
    return getAnalyticsDateRange(firstDate, targetDate).slice(0, MAX_CATCH_UP_DAYS_PER_RUN);
}

async function updateNightlyState(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
    status: 'running' | 'completed' | 'failed' | 'skipped',
    phase: string,
    error?: string,
    extra?: Record<string, any>,
): Promise<void> {
    const payload: Record<string, any> = {
        status,
        phase,
        lastAttemptedLocalDate: settlementDate,
        updatedAt: FieldValue.serverTimestamp(),
        ...(extra || {}),
    };

    if (status === 'completed') {
        payload.lastSettledLocalDate = settlementDate;
        payload.lastCompletedAt = FieldValue.serverTimestamp();
        payload.error = FieldValue.delete();
    } else if (error) {
        payload.error = error;
    }

    await getNightlyStateRef(db, tId, sId).set(payload, { merge: true });
}

async function acquireNightlyDateLock(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
): Promise<FirebaseFirestore.DocumentReference | null> {
    const lockRef = getNightlyLockRef(db, tId, sId, settlementDate);
    const nowMs = Date.now();

    return await db.runTransaction(async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists) {
            const data = lockSnap.data() || {};
            const leaseExpiresAtMs = data.leaseExpiresAt?.toMillis?.() || 0;
            if (data.status === 'completed') return null;
            if (data.status === 'running' && leaseExpiresAtMs > nowMs) return null;
        }

        transaction.set(lockRef, {
            tId,
            sId,
            settlementDate,
            status: 'running',
            attempts: FieldValue.increment(1),
            leaseExpiresAt: Timestamp.fromMillis(nowMs + NIGHTLY_LOCK_LEASE_MS),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return lockRef;
    });
}

async function completeNightlyDateLock(
    lockRef: FirebaseFirestore.DocumentReference,
    status: 'completed' | 'failed',
    error?: string,
): Promise<void> {
    await lockRef.set({
        status,
        error: error || FieldValue.delete(),
        leaseExpiresAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

function getPlatformDailyTaskDayKey(now: Date): string {
    return now.toISOString().slice(0, 10);
}

interface PlatformDailyTaskLease {
    stateRef: FirebaseFirestore.DocumentReference;
    leaseOwner: string;
    dayKey: string;
}

async function acquirePlatformDailyTaskLease(
    db: FirebaseFirestore.Firestore,
    now: Date,
): Promise<PlatformDailyTaskLease | null> {
    const stateRef = db.collection(DB_COLLECTIONS.SYSTEM).doc(PLATFORM_DAILY_TASK_STATE_ID);
    const dayKey = getPlatformDailyTaskDayKey(now);
    const nowMs = now.getTime();
    const leaseOwner = `${dayKey}_${nowMs}_${Math.random().toString(36).slice(2, 10)}`;

    const acquired = await db.runTransaction(async (transaction) => {
        const stateSnapshot = await transaction.get(stateRef);
        const state = stateSnapshot.data() || {};
        const leaseExpiresAtMs = state.leaseExpiresAt?.toMillis?.() || 0;
        const lastAttemptAtMs = state.lastAttemptAt?.toMillis?.() || 0;

        if (state.lastCompletedDayKey === dayKey) return null;
        if (state.status === 'running' && leaseExpiresAtMs > nowMs) return null;
        if (
            state.status === 'failed'
            && state.lastAttemptDayKey === dayKey
            && lastAttemptAtMs > nowMs - PLATFORM_DAILY_TASK_RETRY_MS
        ) {
            return null;
        }

        transaction.set(stateRef, {
            status: 'running',
            leaseOwner,
            lastAttemptDayKey: dayKey,
            lastAttemptAt: Timestamp.fromDate(now),
            leaseExpiresAt: Timestamp.fromMillis(nowMs + PLATFORM_DAILY_TASK_LEASE_MS),
            attempts: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return true;
    });

    return acquired ? { stateRef, leaseOwner, dayKey } : null;
}

async function completePlatformDailyTaskLease(
    lease: PlatformDailyTaskLease,
    status: 'completed' | 'failed',
): Promise<boolean> {
    return lease.stateRef.firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(lease.stateRef);
        if (snapshot.data()?.leaseOwner !== lease.leaseOwner) {
            return false;
        }

        transaction.set(lease.stateRef, {
            status,
            leaseOwner: FieldValue.delete(),
            leaseExpiresAt: FieldValue.delete(),
            lastCompletedDayKey: status === 'completed' ? lease.dayKey : FieldValue.delete(),
            lastCompletedAt: status === 'completed' ? FieldValue.serverTimestamp() : FieldValue.delete(),
            lastFailedAt: status === 'failed' ? FieldValue.serverTimestamp() : FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
}

export const acquirePlatformDailyTaskLeaseForTest = acquirePlatformDailyTaskLease;
export const completePlatformDailyTaskLeaseForTest = completePlatformDailyTaskLease;
export const getPlatformDailyTaskDayKeyForTest = getPlatformDailyTaskDayKey;

interface StoreNightlySchedulerLease {
    stateRef: FirebaseFirestore.DocumentReference;
    leaseOwner: string;
}

async function acquireStoreNightlySchedulerLease(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    runLogId: string,
    now: Date,
): Promise<StoreNightlySchedulerLease | null> {
    const stateRef = db.collection(DB_COLLECTIONS.SYSTEM).doc(`storeNightlyScheduler_${tId}_${sId}`);
    const nowMs = now.getTime();
    const leaseOwner = runLogId;

    const acquired = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(stateRef);
        const state = snapshot.data() || {};
        const leaseExpiresAtMs = state.leaseExpiresAt?.toMillis?.() || 0;
        if (state.status === 'running' && leaseExpiresAtMs > nowMs) return false;

        transaction.set(stateRef, {
            tId,
            sId,
            status: 'running',
            leaseOwner,
            runLogId,
            leaseExpiresAt: Timestamp.fromMillis(nowMs + STORE_NIGHTLY_SCHEDULER_LEASE_MS),
            startedAt: Timestamp.fromDate(now),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });

    return acquired ? { stateRef, leaseOwner } : null;
}

async function completeStoreNightlySchedulerLease(
    lease: StoreNightlySchedulerLease,
    status: 'completed' | 'failed',
): Promise<boolean> {
    return lease.stateRef.firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(lease.stateRef);
        if (snapshot.data()?.leaseOwner !== lease.leaseOwner) return false;
        transaction.set(lease.stateRef, {
            status,
            leaseOwner: FieldValue.delete(),
            leaseExpiresAt: FieldValue.delete(),
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
}

export const acquireStoreNightlySchedulerLeaseForTest = acquireStoreNightlySchedulerLease;
export const completeStoreNightlySchedulerLeaseForTest = completeStoreNightlySchedulerLease;

// Scoring weights, duration thresholds, and normalize() imported from
// functions/src/intelligence/shared/scoreNormalizer.ts (single source of truth)

/**
 * Calculate Popular Right Now score
 */
function calculatePopularScore(item: ItemStats, maxViews: number, maxClicks: number, maxOrders: number): number {
    const viewScore = normalize(item.views, maxViews) * WEIGHTS.popular.views;
    const clickScore = normalize(getWeightedClickCount(item), maxClicks) * WEIGHTS.popular.clicks;
    const orderScore = normalize(item.orders, maxOrders) * WEIGHTS.popular.orders;
    const boostScore = ((item.ownerBoost || 0) + 20) / 40 * 100 * WEIGHTS.popular.ownerBoost; // Normalize -20 to +20 to 0-100

    // Bonus for isBestSeller flag
    const bestSellerBonus = item.isBestSeller ? 10 : 0;

    return viewScore + clickScore + orderScore + boostScore + bestSellerBonus;
}

function getBehavioralClickCount(item: ItemStats): number {
    return item.clicks + item.decisionBlockClicks;
}

function getWeightedClickCount(item: ItemStats): number {
    return item.clicks + item.decisionBlockClicks * 2;
}

/**
 * Calculate Quick Pick score (lower duration = higher score)
 */
function calculateQuickPickScore(item: ItemStats, businessCategory: string, maxPopularity: number): number {
    if (item.duration === undefined) return -1;
    const threshold = getQuickPickThreshold(businessCategory);
    const duration = item.duration;

    // If duration exceeds threshold, item is not eligible for Quick Pick
    if (duration > threshold) return -1;

    // Duration score: lower is better (inverted)
    const durationScore = Math.max(0, 100 - (duration / threshold) * 50) * WEIGHTS.quickPick.duration;

    // Popularity component
    const popularity = item.views + getWeightedClickCount(item) * 2 + item.orders * 5;
    const popularityScore = normalize(popularity, maxPopularity) * WEIGHTS.quickPick.popularity;

    // Owner boost
    const boostScore = ((item.ownerBoost || 0) + 20) / 40 * 100 * WEIGHTS.quickPick.ownerBoost;

    return durationScore + popularityScore + boostScore;
}

/**
 * Calculate Best Value score (high popularity relative to price)
 */
function calculateBestValueScore(item: ItemStats, maxPopularity: number, avgPrice: number): number {
    if (!item.price || item.price <= 0) return -1;

    const popularity = item.views + getWeightedClickCount(item) * 2 + item.orders * 5;

    // Value ratio: popularity per dollar (normalized)
    const valueRatio = popularity / item.price;
    const maxValueRatio = maxPopularity / (avgPrice * 0.5); // Assume best value at half avg price
    const valueScore = normalize(valueRatio, maxValueRatio) * WEIGHTS.bestValue.valueRatio;

    // Popularity component
    const popularityScore = normalize(popularity, maxPopularity) * WEIGHTS.bestValue.popularity;

    // Owner boost
    const boostScore = ((item.ownerBoost || 0) + 20) / 40 * 100 * WEIGHTS.bestValue.ownerBoost;

    return valueScore + popularityScore + boostScore;
}

/**
 * i18n Reason Keys for Decision Blocks
 * 
 * These keys match the translations in:
 * - public/locales/menulist.ai/en-US.json
 * - public/locales/menulist.ai/hi-IN.json
 * 
 * Client translates at runtime using next-intl
 */
const REASON_KEYS = {
    popular: {
        food: { favorite: 'decision.popular.food.favorite', trending: 'decision.popular.food.trending' },
        service: { mostBooked: 'decision.popular.service.mostBooked', topChoice: 'decision.popular.service.topChoice' },
        retail: { bestSeller: 'decision.popular.retail.bestSeller', trending: 'decision.popular.retail.trending' },
        health: { topRated: 'decision.popular.health.topRated' },
        default: { favorite: 'decision.popular.default.favorite', popular: 'decision.popular.default.popular' },
    },
    quickPick: {
        food: { readyIn: 'decision.quickPick.food.readyIn', instant: 'decision.quickPick.food.instant' },
        service: { express: 'decision.quickPick.service.express', quick: 'decision.quickPick.service.quick' },
        health: { express: 'decision.quickPick.health.express' },
        retail: { ready: 'decision.quickPick.default.ready', instant: 'decision.quickPick.default.instant' }, // Retail rarely uses Quick Pick
        default: { ready: 'decision.quickPick.default.ready', instant: 'decision.quickPick.default.instant' },
    },
    bestValue: {
        food: { greatValue: 'decision.bestValue.food.greatValue' },
        service: { greatValue: 'decision.bestValue.service.greatValue' },
        retail: { bestDeal: 'decision.bestValue.retail.bestDeal' },
        health: { worthInvestment: 'decision.bestValue.health.worthInvestment' },
        default: { greatValue: 'decision.bestValue.default.greatValue' },
    },
    pinned: { ownerPick: 'decision.pinned.ownerPick' },
} as const;

interface ReasonResult {
    reason: string;                      // i18n key
    reasonParams?: Record<string, any>;  // Optional params for interpolation
}

/**
 * Generate i18n reason key for decision block
 * Returns key + optional params for client-side translation
 */
function generateReason(
    blockType: 'popular' | 'quickPick' | 'bestValue',
    item: ItemStats,
    businessCategory: string
): ReasonResult {
    const category = businessCategory as keyof typeof REASON_KEYS.popular;

    switch (blockType) {
        case 'popular': {
            // Automatic popular choices require behavioral evidence. Keep the
            // public reason neutral instead of inferring favorites, ratings,
            // bookings, orders, or a trend from owner-authored flags.
            return { reason: REASON_KEYS.popular.default.popular };
        }

        case 'quickPick': {
            const keys = REASON_KEYS.quickPick[category] || REASON_KEYS.quickPick.default;
            const duration = item.duration ?? 0;

            if (duration <= 5) {
                return { reason: 'instant' in keys ? keys.instant : REASON_KEYS.quickPick.default.instant };
            }

            // Key with {minutes} interpolation
            const key = category === 'service' || category === 'health'
                ? ('express' in keys ? keys.express : REASON_KEYS.quickPick.default.ready)
                : ('readyIn' in keys ? keys.readyIn : REASON_KEYS.quickPick.default.ready);

            return { reason: key, reasonParams: { minutes: duration } };
        }

        case 'bestValue': {
            const keys = REASON_KEYS.bestValue[category] || REASON_KEYS.bestValue.default;
            return { reason: 'greatValue' in keys ? keys.greatValue : REASON_KEYS.bestValue.default.greatValue };
        }
    }
}

/**
 * Compute Decision Blocks for a single PROJECT
 * 
 * ARCHITECTURE: Each project gets its own Decision Blocks projection
 * - 1 Tenant → Multiple Stores
 * - 1 Store → Multiple Projects
 * - Analytics are queried per project (or store-level as fallback)
 */
async function computeForProject(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    projectData: FirebaseFirestore.DocumentData,
    businessCategory: string = DEFAULT_DECISION_BLOCK_CATEGORY,
    prefetchedAnalytics?: AggregatedAnalytics,  // OPTIMIZATION: Reuse analytics if already fetched
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<DecisionBlocksDocument | null> {
    const logger = functions.logger;

    const analyticsForScoring = prefetchedAnalytics || await fetch7DayAnalytics(
        db,
        tId,
        sId,
        projectId,
        timeZone,
        businessDayEndTime,
    );
    if (!prefetchedAnalytics) {
        if (analyticsForScoring.source === 'missing_or_stale') {
            logSchedulerWarn(logger, '[DecisionBlocks] Missing or stale intelligence snapshot; manual scoring without analytics', {
                tId,
                sId,
                projectId,
                phase: 'project_scoring',
                operation: 'fetch_analytics_snapshot',
                source: analyticsForScoring.source,
            });
        }
    }

    // The live project catalog is authoritative. The shared extractor only
    // enriches current active items, including retained extraction aliases;
    // deleted or stale analytics-only IDs cannot become candidates.
    const items: ItemStats[] = extractActiveItems(projectData, analyticsForScoring).map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        views: item.views,
        clicks: item.clicks,
        decisionBlockClicks: item.decisionBlockClicks,
        orders: item.orders,
        price: item.price,
        duration: item.duration,
        ownerBoost: item.ownerBoost,
        isBestSeller: item.isBestSeller,
    }));

    if (items.length === 0) {
        logSchedulerInfo(logger, '[DecisionBlocks] No items found for scoring', {
            tId,
            sId,
            phase: 'project_scoring',
            operation: 'extract_active_items',
        });
        return null;
    }

    // Calculate maximums for normalization
    const maxViews = Math.max(...items.map(i => i.views), 1);
    const maxClicks = Math.max(...items.map(getWeightedClickCount), 1);
    const maxOrders = Math.max(...items.map(i => i.orders), 1);
    const maxPopularity = Math.max(...items.map(i => i.views + getWeightedClickCount(i) * 2 + i.orders * 5), 1);
    const pricedItems = items.filter((item) => item.price > 0);
    const avgPrice = pricedItems.length > 0
        ? pricedItems.reduce((sum, item) => sum + item.price, 0) / pricedItems.length
        : 1;

    // Score items for each block type
    const popularScores = items.filter((item) => getBehavioralClickCount(item) >= 3).map(item => ({
        item,
        score: calculatePopularScore(item, maxViews, maxClicks, maxOrders)
    })).sort(compareDecisionScores);

    const quickPickScores = isQuickPickEnabledForCategory(businessCategory) ? items.map(item => ({
        item,
        score: calculateQuickPickScore(item, businessCategory, maxPopularity)
    })).filter(i => i.score >= 0).sort(compareDecisionScores) : [];

    const bestValueScores = items.filter((item) => item.price > 0 && item.price <= avgPrice).map(item => ({
        item,
        score: calculateBestValueScore(item, maxPopularity, avgPrice)
    })).filter(i => i.score >= 0).sort(compareDecisionScores);

    // Get top N candidates for each block
    // Note: We do NOT exclude duplicates across blocks here
    // Runtime will handle deduplication based on what's actually available
    // This gives more fallback options if primary choice is unavailable

    const getTopCandidates = (
        scores: Array<{ item: ItemStats; score: number }>,
        blockType: 'popular' | 'quickPick' | 'bestValue',
        count: number = CANDIDATES_PER_BLOCK
    ): ScoredItem[] => {
        const candidates: ScoredItem[] = [];
        const seenIds = new Set<string>();

        for (const { item, score } of scores) {
            if (candidates.length >= count) break;
            if (seenIds.has(item.itemId)) continue;

            seenIds.add(item.itemId);
            const reasonResult = generateReason(blockType, item, businessCategory);
            candidates.push({
                itemId: item.itemId,
                itemName: item.itemName,
                category: item.category,
                score,
                reason: reasonResult.reason,
                reasonParams: reasonResult.reasonParams,
                price: item.price,
                duration: item.duration
            });
        }
        return candidates;
    };

    const popular = getTopCandidates(popularScores, 'popular');
    const quickPick = getTopCandidates(quickPickScores, 'quickPick');
    const bestValue = getTopCandidates(bestValueScores, 'bestValue');

    // Create decision blocks projection with TTL
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + DECISION_BLOCKS_TTL_HOURS);

    return {
        tId,
        sId,
        projectId,
        popular,
        quickPick,
        bestValue,
        computedAt: FieldValue.serverTimestamp(),
        validUntil,
        statsUsed: {
            totalItems: items.length,
            itemsWithViews: items.filter(i => i.views > 0).length,
            itemsWithDuration: items.filter(i => i.duration !== undefined).length,
            // Hardening fields — used by runtime for lifecycle gating + block eligibility
            totalViews: items.reduce((sum, i) => sum + i.views, 0),
            totalClicks: items.reduce((sum, i) => sum + getBehavioralClickCount(i), 0),
            itemsWithClicks: items.filter(i => getBehavioralClickCount(i) >= 3).length,
            itemsWithPrice: items.filter(i => i.price > 0).length,
            durationCoverage: items.length > 0 ? items.filter(i => i.duration !== undefined).length / items.length : 0,
            priceCoverage: items.length > 0 ? items.filter(i => i.price > 0).length / items.length : 0,
            daysWithData: analyticsForScoring.daysWithData,
        }
    };
}

async function saveDecisionBlocksForProject(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    blocks: DecisionBlocksDocument,
): Promise<string> {
    const projectRef = getProjectDocRef(db, String(tId), String(sId), String(projectId));
    await projectRef.set({
        publicDecisionBlocks: blocks,
    }, { merge: true });

    return projectRef.path;
}

export async function clearStaleDecisionBlocksForProject(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    projectData: FirebaseFirestore.DocumentData,
): Promise<string | null> {
    if (!Object.prototype.hasOwnProperty.call(projectData, 'publicDecisionBlocks')) return null;
    const projectRef = getProjectDocRef(db, String(tId), String(sId), String(projectId));
    await projectRef.set({ publicDecisionBlocks: FieldValue.delete() }, { merge: true });
    return projectRef.path;
}

async function computeAndSaveMenuIntelligence(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    projectData: FirebaseFirestore.DocumentData,
    analytics: AggregatedAnalytics,
    source: 'nightly_job' | 'manual_trigger',
): Promise<boolean> {
    if (!isFunctionFeatureEnabled('ENABLE_CONTINUOUS_MENU_INTELLIGENCE')) return false;

    const items = extractActiveItems(projectData, analytics);
    if (items.length === 0) return false;

    // This document is a complete scheduler-owned projection. Replacing it
    // prunes deleted item keys and keeps map growth bounded. The prior-state
    // read is in the same transaction so scheduled/manual overlap cannot lose
    // run count, maturity, or audit lineage.
    await computeAndPersistMenuIntelligence(
        db,
        DB_COLLECTIONS.MENU_INTELLIGENCE,
        items,
        analytics,
        { tId, sId, projectId },
        source,
    );
    return true;
}

async function assertCurrentPlatformOwner(
    db: FirebaseFirestore.Firestore,
    auth: {
        uid: string;
        token: Record<string, any>;
    },
    action: string,
): Promise<string> {
    const userDocumentId = normalizeOwnerNotificationDocumentId(auth.uid);
    if (!userDocumentId) {
        throw new HttpsError('permission-denied', 'Account is not allowed to perform this action.');
    }

    const userSnap = await db.collection(DB_COLLECTIONS.USERS).doc(userDocumentId).get();
    const userData = userSnap.exists ? userSnap.data() : undefined;
    const tokenRole = String(auth.token.platformRole || auth.token.role || '');
    const currentRole = String(userData?.platformRole || userData?.role || '');
    if (
        tokenRole !== MENULIST_PLATFORM_USER_ROLE
        || currentRole !== MENULIST_PLATFORM_USER_ROLE
        || userData?.active === false
        || userData?.deleted === true
        || userData?.authDisabled === true
        || userData?.blocked === true
        || userData?.isVerified === false
    ) {
        throw new HttpsError('permission-denied', `Only active platform owners can ${action}.`);
    }
    return currentRole;
}

function assertActiveStoreScope(
    storeData: FirebaseFirestore.DocumentData | undefined,
    tId: string,
    sId: string,
): void {
    const storedTenantScope = normalizeOwnerNotificationNumericScopeAliases([
        storeData?.tId,
        storeData?.tenantId,
    ]);
    const storedStoreAliases = [storeData?.storeId, storeData?.sId];
    if (
        !storeData
        || storeData.active === false
        || storeData.deleted === true
        || storedTenantScope?.documentId !== tId
        || (
            storedStoreAliases.some((value) => value !== undefined && value !== null)
            && normalizeOwnerNotificationNumericScopeAliases(storedStoreAliases)?.documentId !== sId
        )
    ) {
        throw new HttpsError('failed-precondition', 'Store is not active in the requested tenant.');
    }
}

function normalizeCallableDocumentId(value: unknown, fieldName: string): string {
    if (value === undefined || value === null || value === '') return '';
    const normalized = normalizeOwnerNotificationDocumentId(value);
    if (!normalized) {
        throw new HttpsError('invalid-argument', `${fieldName} is invalid.`);
    }
    return normalized;
}

function createNightlyAnalyticsCounters(): NightlyAnalyticsCounters {
    return {
        storesAttempted: 0,
        storesSucceeded: 0,
        storesFailed: 0,
        menuProjects: 0,
        menuErrors: 0,
        obpStoresWithData: 0,
        intelligenceSnapshotMissing: 0,
    };
}

function getSchedulerErrorCode(error: unknown): string {
    return getBoundedFunctionsErrorCode(error) || 'unknown';
}

function getSchedulerErrorMessage(_error: unknown): string {
    return SCHEDULER_TASK_FAILED_MESSAGE;
}

function buildSchedulerFailureDiagnostic(
    error: unknown,
    context: Omit<SchedulerFailureDiagnostic, 'error' | 'code' | 'name'>,
): SchedulerFailureDiagnostic {
    return {
        ...context,
        error: getSchedulerErrorMessage(error),
        code: getSchedulerErrorCode(error),
        name: getBoundedFunctionsErrorName(error),
    };
}

function createSchedulerTaskError(code: string): Error & { code?: string } {
    const error = new Error(SCHEDULER_TASK_FAILED_MESSAGE) as Error & { code?: string };
    error.code = code;
    return error;
}

function getSchedulerIdLogContext(label: string, value: unknown): Record<string, boolean | number> {
    const context = getAnalyticsIdContext(value);
    return {
        [`${label}Present`]: context.present,
        [`${label}Length`]: context.length,
    };
}

function getSchedulerSourceErrorContext(error: unknown): {
    sourceErrorName?: string;
    sourceErrorCode?: string;
    sourceStatusCode?: number;
} {
    const context = getAnalyticsErrorContext(error);
    return {
        sourceErrorName: context.name,
        sourceErrorCode: context.code,
        sourceStatusCode: context.status,
    };
}

function logSchedulerFailure(
    logger: typeof functions.logger,
    message: string,
    failureCode: string,
    error: unknown,
    context: {
        operation?: string;
        phase?: string;
        jobId?: unknown;
        projectId?: unknown;
        resellerProfileId?: unknown;
        runLogId?: unknown;
        sId?: unknown;
        settlementDate?: string;
        subscriptionId?: unknown;
        tId?: unknown;
    } = {},
): void {
    logger.error(message, {
        failureCode,
        phase: context.phase,
        operation: context.operation,
        settlementDate: context.settlementDate,
        ...getSchedulerIdLogContext('jobId', context.jobId),
        ...getSchedulerIdLogContext('tId', context.tId),
        ...getSchedulerIdLogContext('sId', context.sId),
        ...getSchedulerIdLogContext('projectId', context.projectId),
        ...getSchedulerIdLogContext('resellerProfileId', context.resellerProfileId),
        ...getSchedulerIdLogContext('runLogId', context.runLogId),
        ...getSchedulerIdLogContext('subscriptionId', context.subscriptionId),
        ...getSchedulerSourceErrorContext(error),
    });
}

function getSchedulerProgressLogContext(context: {
    metrics?: Record<string, boolean | number | string | null | undefined>;
    operation?: string;
    phase?: string;
    projectId?: unknown;
    runLogId?: unknown;
    sId?: unknown;
    settlementDate?: string;
    source?: unknown;
    specialMenuDisplayName?: unknown;
    storeName?: unknown;
    subscriptionId?: unknown;
    tId?: unknown;
} = {}): Record<string, boolean | number | string | null | undefined> {
    const metrics = Object.fromEntries(
        Object.entries(context.metrics || {}).filter(([, value]) => value !== undefined),
    );

    return {
        phase: context.phase,
        operation: context.operation,
        settlementDate: context.settlementDate,
        source: typeof context.source === 'string' ? context.source.slice(0, 60) : undefined,
        ...metrics,
        ...getSchedulerIdLogContext('tId', context.tId),
        ...getSchedulerIdLogContext('sId', context.sId),
        ...getSchedulerIdLogContext('projectId', context.projectId),
        ...getSchedulerIdLogContext('runLogId', context.runLogId),
        ...getSchedulerIdLogContext('subscriptionId', context.subscriptionId),
        ...getSchedulerIdLogContext('storeName', context.storeName),
        ...getSchedulerIdLogContext('specialMenuDisplayName', context.specialMenuDisplayName),
    };
}

function logSchedulerInfo(
    logger: typeof functions.logger,
    message: string,
    context?: Parameters<typeof getSchedulerProgressLogContext>[0],
): void {
    logger.info(message, getSchedulerProgressLogContext(context));
}

function logSchedulerWarn(
    logger: typeof functions.logger,
    message: string,
    context?: Parameters<typeof getSchedulerProgressLogContext>[0],
): void {
    logger.warn(message, getSchedulerProgressLogContext(context));
}

async function runNightlySchedulerForStore(
    db: FirebaseFirestore.Firestore,
    sId: string,
    storeInfo: FirebaseFirestore.DocumentData,
    analyticsRunAt: Date,
    intelligenceSource: 'nightly_job' | 'manual_trigger' = 'nightly_job',
): Promise<StoreNightlySchedulerResult> {
    const logger = functions.logger;
    const tId = storeInfo?.tId != null ? String(storeInfo.tId) : '';
    const businessDayEndTime = resolveBusinessDayEndTime(storeInfo?.businessType, storeInfo?.businessDayEndTime, storeInfo?.businessCategory);
    const businessCategory = resolveBusinessCategoryOrFallback(storeInfo?.businessType, storeInfo?.businessCategory);
    const storeRun: StoreNightlySchedulerResult = {
        tId,
        sId,
        totalProjects: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        intelligenceSuccess: 0,
        intelligenceFailed: 0,
        errors: [],
        analytics: createNightlyAnalyticsCounters(),
    };

    if (storeInfo?.active === false) {
        logSchedulerInfo(logger, '[DecisionBlocks] Store inactive, skipping', {
            tId,
            sId,
            phase: 'store_scheduler',
            operation: 'skip_inactive_store',
        });
        storeRun.skippedCount++;
        return storeRun;
    }

    if (!tId) {
        logSchedulerWarn(logger, '[DecisionBlocks] Store missing tenant, skipping', {
            sId,
            phase: 'store_scheduler',
            operation: 'skip_missing_tenant',
        });
        storeRun.skippedCount++;
        return storeRun;
    }

    try {
        logSchedulerInfo(logger, '[DecisionBlocks] Processing store', {
            tId,
            sId,
            phase: 'store_scheduler',
            operation: 'process_store',
        });

        const { projectEntries, activeProjectIds, source } = await loadActiveProjectsForScheduler(db, tId, sId);

        if (projectEntries.length === 0) {
            logSchedulerInfo(logger, '[DecisionBlocks] No active projects found; analytics settlement still runs', {
                tId,
                sId,
                phase: 'store_scheduler',
                operation: 'load_active_projects',
                source,
            });
            storeRun.skippedCount++;
        } else {
            logSchedulerInfo(logger, '[DecisionBlocks] Active projects loaded', {
                tId,
                sId,
                phase: 'store_scheduler',
                operation: 'load_active_projects',
                source,
                metrics: { projectCount: projectEntries.length },
            });
        }

        storeRun.totalProjects += projectEntries.length;

        storeRun.analytics.storesAttempted++;
        try {
            const [
                { aggregateCustomerAnalyticsForStoreDate },
                { aggregateOBPAnalyticsForStoreDate },
                { resolveAnalyticsAiEntitlement },
            ] = await Promise.all([
                import('./aggregateCustomerAnalytics'),
                import('./analytics/obpAnalyticsAggregation'),
                import('./analytics/analyticsAiEntitlements'),
            ]);
            const settlementDates = await getPendingSettlementDates(db, tId, sId, analyticsRunAt, storeInfo.timeZone, businessDayEndTime);
            const knownAnalyticsProjectIds = Array.from(new Set([...activeProjectIds, 'customerApp']));
            const projectCatalogById = Object.fromEntries(
                projectEntries.map((entry) => [entry.projectId, entry.data]),
            );

            if (settlementDates.length === 0) {
                logSchedulerInfo(logger, '[NightlyAnalytics] Analytics already settled', {
                    tId,
                    sId,
                    phase: 'analytics_settlement',
                    operation: 'get_pending_settlement_dates',
                });
            }

            for (const settlementDate of settlementDates) {
                const lockRef = await acquireNightlyDateLock(db, tId, sId, settlementDate);
                if (!lockRef) {
                    logSchedulerInfo(logger, '[NightlyAnalytics] Settlement already locked or completed', {
                        tId,
                        sId,
                        settlementDate,
                        phase: 'analytics_settlement',
                        operation: 'acquire_settlement_lock',
                    });
                    continue;
                }

                try {
                    await updateNightlyState(db, tId, sId, settlementDate, 'running', 'obp_analytics');
                    const obpHadData = FUNCTION_FLAGS.ENABLE_OBP_ANALYTICS
                        ? await aggregateOBPAnalyticsForStoreDate(db, tId, sId, settlementDate)
                        : false;

                    await updateNightlyState(db, tId, sId, settlementDate, 'running', 'customer_analytics');
                    const customerAggregation = await aggregateCustomerAnalyticsForStoreDate(
                        db,
                        tId,
                        sId,
                        settlementDate,
                        knownAnalyticsProjectIds,
                        resolveAnalyticsAiEntitlement(storeInfo),
                        projectCatalogById,
                    );

                    storeRun.analytics.menuProjects += customerAggregation.totalProjects;
                    storeRun.analytics.menuErrors += customerAggregation.errors.length;
                    if (obpHadData) storeRun.analytics.obpStoresWithData++;

                    if (customerAggregation.errors.length > 0) {
                        logger.error('[NightlyAnalytics] Project aggregation errors detected', {
                            failureCode: SCHEDULER_ANALYTICS_SETTLEMENT_FAILED,
                            ...getSchedulerProgressLogContext({
                                tId,
                                sId,
                                settlementDate,
                                phase: 'analytics_settlement',
                                operation: 'aggregate_customer_analytics',
                                metrics: { projectErrorCount: customerAggregation.errors.length },
                            }),
                        });
                        throw new Error(`Customer analytics aggregation had ${customerAggregation.errors.length} project errors`);
                    }

                    await updateNightlyState(db, tId, sId, settlementDate, 'completed', 'completed', undefined, {
                        analyticsIndex: {
                            activeProjectIds,
                            customerAnalyticsProjectIds: knownAnalyticsProjectIds,
                            menuProjectCount: activeProjectIds.length,
                            surfaces: {
                                menu: activeProjectIds.length > 0,
                                obp: FUNCTION_FLAGS.ENABLE_OBP_ANALYTICS,
                                customerApp: true,
                            },
                            summaryDocIds: [
                                ...activeProjectIds.map((projectId) => `${tId}_${sId}_${projectId}_dashboard_summary`),
                                `${tId}_${sId}_customerApp_dashboard_summary`,
                                ...(FUNCTION_FLAGS.ENABLE_OBP_ANALYTICS ? [`${tId}_${sId}_obp_dashboard_summary`] : []),
                            ],
                            lastSettledLocalDate: settlementDate,
                            businessDayEndTime,
                        },
                    });
                    await completeNightlyDateLock(lockRef, 'completed');
                } catch (settlementError: any) {
                    const message = SCHEDULER_TASK_FAILED_MESSAGE;
                    storeRun.errors.push(buildSchedulerFailureDiagnostic(settlementError, {
                        tId,
                        sId,
                        phase: 'analytics_settlement',
                        operation: 'settle_store_date',
                        settlementDate,
                    }));
                    logSchedulerFailure(logger, '[NightlyAnalytics] Store settlement failed', SCHEDULER_ANALYTICS_SETTLEMENT_FAILED, settlementError, {
                        tId,
                        sId,
                        settlementDate,
                        phase: 'analytics_settlement',
                        operation: 'settle_store_date',
                    });
                    await updateNightlyState(db, tId, sId, settlementDate, 'failed', 'failed', message);
                    await completeNightlyDateLock(lockRef, 'failed', message);
                    throw settlementError;
                }
            }

            storeRun.analytics.storesSucceeded++;
        } catch (analyticsError: any) {
            storeRun.analytics.storesFailed++;
            throw createSchedulerTaskError(SCHEDULER_ANALYTICS_SETTLEMENT_FAILED);
        }

        if (FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH) {
            try {
                const { buildAndWriteOwnerBusinessHealthSnapshot } = await import('./ownerBusinessAssistant/buildOwnerBusinessHealthSnapshot');
                storeRun.ownerBusinessHealth = await buildAndWriteOwnerBusinessHealthSnapshot({
                    db,
                    tId,
                    sId,
                    storeInfo,
                    activeProjects: projectEntries,
                    runAt: analyticsRunAt,
                    businessDayEndTime,
                });
            } catch (ownerBusinessHealthError: any) {
                logSchedulerFailure(logger, '[OwnerBusinessAssistant] Business Health build failed', SCHEDULER_OWNER_BUSINESS_HEALTH_FAILED, ownerBusinessHealthError, {
                    tId,
                    sId,
                    phase: 'owner_business_health',
                    operation: 'build_snapshot',
                });
                storeRun.ownerBusinessHealth = {
                    enabled: true,
                    builderReadCount: 0,
                    builderWriteCount: 0,
                };
                storeRun.errors.push(buildSchedulerFailureDiagnostic(ownerBusinessHealthError, {
                    tId,
                    sId,
                    phase: 'owner_business_health',
                    operation: 'build_snapshot',
                }));
            }
        }

        let publicDecisionBlocksChanged = false;
        for (const { projectId, data: projectData } of projectEntries) {
            try {
                const analytics = await fetch7DayAnalytics(db, tId, sId, projectId, storeInfo.timeZone, businessDayEndTime);
                if (analytics.source === 'missing_or_stale') {
                    storeRun.analytics.intelligenceSnapshotMissing++;
                    logSchedulerWarn(logger, '[NightlyAnalytics] Missing or stale intelligence snapshot; scoring without analytics', {
                        tId,
                        sId,
                        projectId,
                        phase: 'project_scoring',
                        operation: 'fetch_analytics_snapshot',
                        source: analytics.source,
                        metrics: {
                            expectedLocalDate: addDaysToAnalyticsDateKey(getBusinessAnalyticsDateKey(analyticsRunAt, storeInfo.timeZone, businessDayEndTime), -1),
                            lastSettledLocalDate: analytics.lastSettledLocalDate || null,
                        },
                    });
                }

                if (isFunctionFeatureEnabled('ENABLE_DECISION_BLOCKS_SCORING')) {
                    const blocks = await computeForProject(
                        db,
                        tId,
                        sId,
                        projectId,
                        projectData,
                        businessCategory,
                        analytics,
                        storeInfo.timeZone,
                        businessDayEndTime,
                    );

                    if (blocks) {
                        await saveDecisionBlocksForProject(db, tId, sId, projectId, blocks);
                        publicDecisionBlocksChanged = true;
                        logSchedulerInfo(logger, '[DecisionBlocks] Computed decision blocks', {
                            tId,
                            sId,
                            projectId,
                            phase: 'project_scoring',
                            operation: 'save_decision_blocks',
                        });
                        storeRun.successCount++;
                    } else {
                        const clearedPath = await clearStaleDecisionBlocksForProject(
                            db, tId, sId, projectId, projectData,
                        );
                        if (clearedPath) publicDecisionBlocksChanged = true;
                        logSchedulerInfo(logger, '[DecisionBlocks] Project has no items to score', {
                            tId,
                            sId,
                            projectId,
                            phase: 'project_scoring',
                            operation: 'compute_project_blocks',
                            metrics: { clearedStaleProjection: Boolean(clearedPath) },
                        });
                        storeRun.skippedCount++;
                    }
                }

                try {
                    const intelligenceSaved = await computeAndSaveMenuIntelligence(
                        db,
                        tId,
                        sId,
                        projectId,
                        projectData,
                        analytics,
                        intelligenceSource,
                    );
                    if (intelligenceSaved) {
                        logSchedulerInfo(logger, '[DecisionBlocks] Computed menu intelligence', {
                            tId,
                            sId,
                            projectId,
                            phase: 'project_intelligence',
                            operation: 'compute_intelligence_state',
                        });
                        storeRun.intelligenceSuccess++;
                    }
                } catch (intError: any) {
                    logSchedulerFailure(logger, '[DecisionBlocks] Project intelligence failed', SCHEDULER_PROJECT_INTELLIGENCE_FAILED, intError, {
                        tId,
                        sId,
                        projectId,
                        phase: 'project_intelligence',
                        operation: 'compute_intelligence_state',
                    });
                    storeRun.intelligenceFailed++;
                }
            } catch (error: any) {
                logSchedulerFailure(logger, '[DecisionBlocks] Project scoring failed', SCHEDULER_PROJECT_SCORING_FAILED, error, {
                    tId,
                    sId,
                    projectId,
                    phase: 'project_scoring',
                    operation: 'decision_blocks_menu_intelligence',
                });
                storeRun.failedCount++;
                storeRun.errors.push(buildSchedulerFailureDiagnostic(error, {
                    tId,
                    sId,
                    projectId,
                    phase: 'project_scoring',
                    operation: 'decision_blocks_menu_intelligence',
                }));
            }
        }

        if (publicDecisionBlocksChanged) {
            await revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:store');
        }

        if (FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE) {
            try {
                let latestModifiedOn: any = null;

                for (const { data: pData } of projectEntries) {
                    const modOn = pData.modifiedOn || pData.updatedAt;
                    if (modOn && (!latestModifiedOn || modOn > latestModifiedOn)) {
                        latestModifiedOn = modOn;
                    }
                }

                storeRun.enrichment = {
                    lastPublishedAt: latestModifiedOn || null,
                    projectCount: projectEntries.length,
                };
            } catch (enrichmentError) {
                logSchedulerFailure(logger, '[DecisionBlocks] Store enrichment collection failed', SCHEDULER_STORE_SUMMARY_ENRICHMENT_FAILED, enrichmentError, {
                    tId,
                    sId,
                    phase: 'store_summary_enrichment',
                    operation: 'collect_store_enrichment',
                });
            }
        }
    } catch (error: any) {
        logSchedulerFailure(logger, '[DecisionBlocks] Store scheduler failed', SCHEDULER_STORE_RECOVERY_FAILED, error, {
            tId,
            sId,
            phase: 'store_scheduler',
            operation: 'store_nightly_recovery',
        });
        storeRun.failedCount++;
        storeRun.errors.push(buildSchedulerFailureDiagnostic(error, {
            tId,
            sId,
            phase: 'store_scheduler',
            operation: 'store_nightly_recovery',
        }));
    }

    return storeRun;
}

/**
 * Unified nightly scheduler — runs every hour at :30 (timezone-aware)
 * 
 * ARCHITECTURE:
 * - Reads storesSummary (1 Firestore read)
 * - Filters stores by schedulerHour === currentUTCHour
 * - Only processes stores in their local "night window"
 * - Per-store tasks: DI scoring, menu intelligence
 * - Platform tasks: analytics, messaging, billing, and infra compounding
 * - Persists run log + sends telegram alert
 * 
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */
export const computeDecisionBlocksScores = onSchedule({
    schedule: '30 * * * *', // Runs every hour at :30 (timezone-aware scheduling)
    timeZone: 'UTC',
    region: 'us-central1',
    timeoutSeconds: 540,
    maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
    secrets: [
        SECRETS.GEMINI_AI_KEY,
        SECRETS.GEMINI_AI_KEY_2,
        SECRETS.GEMINI_AI_KEY_3,
        SECRETS.SENTRY_DSN,
        ...SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
        ...SECRET_GROUPS.PUBLIC_CACHE_REVALIDATION,
    ],
}, async (event) => {
    initSentry();
    const logger = functions.logger;
    const currentUTCHour = new Date().getUTCHours();
    logger.info('[DecisionBlocks] Nightly scheduler started', {
        currentUTCHour,
        triggeredAt: new Date().toISOString(),
    });

    const db = firestoreAdmin;
    const runStartTime = Date.now();
    let platformDailyTaskLease: PlatformDailyTaskLease | null = null;
    const taskResults: Array<{ name: string; status: 'success' | 'failed' | 'skipped'; durationMs?: number; details?: Record<string, any>; error?: string }> = [];
    const results = {
        totalStores: 0,
        totalProjects: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        intelligenceSuccess: 0,
        intelligenceFailed: 0,
        errors: [] as SchedulerFailureDiagnostic[]
    };

    try {
        // COST OPTIMIZATION: Use storesSummary instead of fetching all store documents
        // This reduces N reads to 1 read. See: __docs__/patterns/summary-document-pattern.md
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
        const allStoreIds = Object.keys(storesSummary);

        // DST-safe business-day scheduling. Owners configure "Business day ends at";
        // the scheduler runs after EOD + buffer, using runtime timezone math instead
        // of a static UTC hour where possible.
        // @see __docs__/patterns/nightly-scheduler-architecture.md
        const DEFAULT_SCHEDULER_HOUR = 2; // Legacy UTC fallback when no timezone/cutoff metadata exists
        const now = new Date();

        const storeIds = allStoreIds.filter(sId => {
            const storeInfo = storesSummary[sId];
            const businessType = getStoreSummaryString(storeInfo, 'businessType');
            const businessCategory = getStoreSummaryString(storeInfo, 'businessCategory');
            const configuredDayEnd = getStoreSummaryString(storeInfo, 'businessDayEndTime');
            const timeZone = getStoreSummaryString(storeInfo, 'timeZone');
            const businessDayEndTime = resolveBusinessDayEndTime(businessType, configuredDayEnd, businessCategory);

            // Primary: runtime settlement computation. Missing/invalid timezone
            // safely falls back to UTC inside isAnalyticsSettlementDue.
            if (timeZone || configuredDayEnd || businessType) {
                try {
                    return isAnalyticsSettlementDue(now, timeZone, businessDayEndTime);
                } catch {
                    // Fall through to legacy schedulerHour fallback.
                }
            }

            // Fallback: stored schedulerHour (for stores without timeZone)
            const storeHour = getStoreSummarySchedulerHour(storeInfo) ?? DEFAULT_SCHEDULER_HOUR;
            return storeHour === currentUTCHour;
        });

        results.totalStores = storeIds.length;
        platformDailyTaskLease = await acquirePlatformDailyTaskLease(db, now);
        const runPlatformDailyTasks = platformDailyTaskLease !== null;

        if (storeIds.length === 0 && !runPlatformDailyTasks) {
            logger.info('[DecisionBlocks] No stores scheduled for current hour', {
                currentUTCHour,
                totalStoresInPlatform: allStoreIds.length,
            });
            // Persist minimal run log for audit trail (no telegram — would be 22 alerts/day noise)
            try {
                await db.collection(DB_COLLECTIONS.SCHEDULER_RUN_LOGS).add({
                    trigger: 'scheduled',
                    triggeredBy: 'system',
                    startedAt: Timestamp.fromMillis(runStartTime),
                    completedAt: Timestamp.now(),
                    expiresAt: Timestamp.fromMillis(
                        runStartTime + FUNCTION_RETENTION_CONFIG.SCHEDULER_RUN_LOG_RETENTION_DAYS * DAY_MS,
                    ),
                    durationMs: Date.now() - runStartTime,
                    status: 'skipped',
                    schedulerHour: currentUTCHour,
                    totalStoresInPlatform: allStoreIds.length,
                    totalStores: 0,
                    reason: 'no_stores_for_hour',
                });
            } catch (runLogError) {
                logSchedulerFailure(logger, '[DecisionBlocks] No-stores run log failed', SCHEDULER_NO_STORES_RUN_LOG_PERSIST_FAILED, runLogError, {
                    phase: 'scheduler_run',
                    operation: 'persist_no_stores_run_log',
                });
            }
            return;
        }

        logger.info('[DecisionBlocks] Processing scheduled stores', {
            currentUTCHour,
            runPlatformDailyTasks,
            scheduledStoreCount: storeIds.length,
            totalStoresInPlatform: allStoreIds.length,
        });

        const analyticsTaskStart = Date.now();
        const analyticsRunAt = new Date(analyticsTaskStart);
        const analyticsResults = {
            storesAttempted: 0,
            storesSucceeded: 0,
            storesFailed: 0,
            menuProjects: 0,
            menuErrors: 0,
            obpStoresWithData: 0,
            intelligenceSnapshotMissing: 0,
        };
        const ownerBusinessHealthResults = {
            storesAttempted: 0,
            storesSucceeded: 0,
            storesFailed: 0,
            builderReadCount: 0,
            builderWriteCount: 0,
        };
        const { aggregateCustomerAnalyticsForStoreDate } = await import('./aggregateCustomerAnalytics');
        const { aggregateOBPAnalyticsForStoreDate } = await import('./analytics/obpAnalyticsAggregation');
        const { resolveAnalyticsAiEntitlement } = await import('./analytics/analyticsAiEntitlements');
        const ownerBusinessHealthBuilder = FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
            ? (await import('./ownerBusinessAssistant/buildOwnerBusinessHealthSnapshot')).buildAndWriteOwnerBusinessHealthSnapshot
            : null;

        // Infrastructure Compounding 10.3: Collect enrichment data during loop,
        // write once at end (replaces per-store writes — saves N-1 writes)
        const storeEnrichment: Record<string, { lastPublishedAt: any; projectCount: number }> = {};

        for (const sId of storeIds) {
            const storeInfo = storesSummary[sId];
            const tId = storeInfo.tId;
            const businessType = getStoreSummaryString(storeInfo, 'businessType');
            const configuredBusinessCategory = getStoreSummaryString(storeInfo, 'businessCategory');
            const configuredDayEnd = getStoreSummaryString(storeInfo, 'businessDayEndTime');
            const timeZone = getStoreSummaryString(storeInfo, 'timeZone');
            const businessDayEndTime = resolveBusinessDayEndTime(businessType, configuredDayEnd, configuredBusinessCategory);
            const businessCategory = resolveBusinessCategoryOrFallback(businessType, configuredBusinessCategory);

            // Skip inactive stores
            if (storeInfo.active === false) {
                logSchedulerInfo(logger, '[DecisionBlocks] Store inactive, skipping', {
                    tId,
                    sId,
                    phase: 'store_scheduler',
                    operation: 'skip_inactive_store',
                });
                results.skippedCount++;
                continue;
            }

            if (!tId) {
                logSchedulerWarn(logger, '[DecisionBlocks] Store missing tenant, skipping', {
                    sId,
                    phase: 'store_scheduler',
                    operation: 'skip_missing_tenant',
                });
                results.skippedCount++;
                continue;
            }

            const storeSchedulerLease = await acquireStoreNightlySchedulerLease(
                db,
                tId,
                sId,
                `scheduled_store_${runStartTime}_${tId}_${sId}`,
                new Date(),
            );
            if (!storeSchedulerLease) {
                logSchedulerInfo(logger, '[DecisionBlocks] Store scheduler already running, skipping', {
                    tId,
                    sId,
                    phase: 'store_scheduler_lease',
                    operation: 'skip_concurrent_store_scheduler',
                });
                results.skippedCount++;
                continue;
            }
            let storeSchedulerLeaseStatus: 'completed' | 'failed' = 'failed';
            try {
                logSchedulerInfo(logger, '[DecisionBlocks] Processing store', {
                    tId,
                    sId,
                    phase: 'store_scheduler',
                    operation: 'process_store',
                });

                const { projectEntries, activeProjectIds, source } = await loadActiveProjectsForScheduler(db, tId, sId);

                if (projectEntries.length === 0) {
                    logSchedulerInfo(logger, '[DecisionBlocks] No active projects found; analytics settlement still runs', {
                        tId,
                        sId,
                        phase: 'store_scheduler',
                        operation: 'load_active_projects',
                        source,
                    });
                    results.skippedCount++;
                } else {
                    logSchedulerInfo(logger, '[DecisionBlocks] Active projects loaded', {
                        tId,
                        sId,
                        phase: 'store_scheduler',
                        operation: 'load_active_projects',
                        source,
                        metrics: { projectCount: projectEntries.length },
                    });
                }

                results.totalProjects += projectEntries.length;

                analyticsResults.storesAttempted++;
                try {
                    const settlementDates = await getPendingSettlementDates(db, tId, sId, analyticsRunAt, timeZone, businessDayEndTime);
                    const knownAnalyticsProjectIds = Array.from(new Set([...activeProjectIds, 'customerApp']));
                    const projectCatalogById = Object.fromEntries(
                        projectEntries.map((entry) => [entry.projectId, entry.data]),
                    );

                    if (settlementDates.length === 0) {
                        logSchedulerInfo(logger, '[NightlyAnalytics] Analytics already settled', {
                            tId,
                            sId,
                            phase: 'analytics_settlement',
                            operation: 'get_pending_settlement_dates',
                        });
                    }

                    for (const settlementDate of settlementDates) {
                        const lockRef = await acquireNightlyDateLock(db, tId, sId, settlementDate);
                        if (!lockRef) {
                            logSchedulerInfo(logger, '[NightlyAnalytics] Settlement already locked or completed', {
                                tId,
                                sId,
                                settlementDate,
                                phase: 'analytics_settlement',
                                operation: 'acquire_settlement_lock',
                            });
                            continue;
                        }

                        try {
                            await updateNightlyState(db, tId, sId, settlementDate, 'running', 'obp_analytics');
                            const obpHadData = FUNCTION_FLAGS.ENABLE_OBP_ANALYTICS
                                ? await aggregateOBPAnalyticsForStoreDate(db, tId, sId, settlementDate)
                                : false;

                            await updateNightlyState(db, tId, sId, settlementDate, 'running', 'customer_analytics');
                            const customerAggregation = await aggregateCustomerAnalyticsForStoreDate(
                                db,
                                tId,
                                sId,
                                settlementDate,
                                knownAnalyticsProjectIds,
                                resolveAnalyticsAiEntitlement(storeInfo),
                                projectCatalogById,
                            );

                            analyticsResults.menuProjects += customerAggregation.totalProjects;
                            analyticsResults.menuErrors += customerAggregation.errors.length;
                            if (obpHadData) analyticsResults.obpStoresWithData++;

                            if (customerAggregation.errors.length > 0) {
                                logger.error('[NightlyAnalytics] Project aggregation errors detected', {
                                    failureCode: SCHEDULER_ANALYTICS_SETTLEMENT_FAILED,
                                    ...getSchedulerProgressLogContext({
                                        tId,
                                        sId,
                                        settlementDate,
                                        phase: 'analytics_settlement',
                                        operation: 'aggregate_customer_analytics',
                                        metrics: { projectErrorCount: customerAggregation.errors.length },
                                    }),
                                });
                                throw new Error(`Customer analytics aggregation had ${customerAggregation.errors.length} project errors`);
                            }

                            await updateNightlyState(db, tId, sId, settlementDate, 'completed', 'completed', undefined, {
                                analyticsIndex: {
                                    activeProjectIds,
                                    customerAnalyticsProjectIds: knownAnalyticsProjectIds,
                                    menuProjectCount: activeProjectIds.length,
                                    surfaces: {
                                        menu: activeProjectIds.length > 0,
                                        obp: FUNCTION_FLAGS.ENABLE_OBP_ANALYTICS,
                                        customerApp: true,
                                    },
                                    summaryDocIds: [
                                        ...activeProjectIds.map((projectId) => `${tId}_${sId}_${projectId}_dashboard_summary`),
                                        `${tId}_${sId}_customerApp_dashboard_summary`,
                                        ...(FUNCTION_FLAGS.ENABLE_OBP_ANALYTICS ? [`${tId}_${sId}_obp_dashboard_summary`] : []),
                                    ],
                                    lastSettledLocalDate: settlementDate,
                                    businessDayEndTime,
                                },
                            });
                            await completeNightlyDateLock(lockRef, 'completed');
                        } catch (settlementError: any) {
                            const message = SCHEDULER_TASK_FAILED_MESSAGE;
                            logSchedulerFailure(logger, '[NightlyAnalytics] Store settlement failed', SCHEDULER_ANALYTICS_SETTLEMENT_FAILED, settlementError, {
                                tId,
                                sId,
                                settlementDate,
                                phase: 'analytics_settlement',
                                operation: 'settle_store_date',
                            });
                            results.errors.push(buildSchedulerFailureDiagnostic(settlementError, {
                                tId,
                                sId,
                                settlementDate,
                                phase: 'analytics_settlement',
                                operation: 'settle_store_date',
                            }));
                            await updateNightlyState(db, tId, sId, settlementDate, 'failed', 'failed', message);
                            await completeNightlyDateLock(lockRef, 'failed', message);
                            throw settlementError;
                        }
                    }

                    analyticsResults.storesSucceeded++;
                } catch (analyticsError: any) {
                    analyticsResults.storesFailed++;
                    throw createSchedulerTaskError(SCHEDULER_ANALYTICS_SETTLEMENT_FAILED);
                }

                if (ownerBusinessHealthBuilder) {
                    ownerBusinessHealthResults.storesAttempted++;
                    try {
                        const ownerBusinessHealthResult = await ownerBusinessHealthBuilder({
                            db,
                            tId,
                            sId,
                            storeInfo,
                            activeProjects: projectEntries,
                            runAt: analyticsRunAt,
                            businessDayEndTime,
                        });
                        ownerBusinessHealthResults.storesSucceeded++;
                        ownerBusinessHealthResults.builderReadCount += ownerBusinessHealthResult.builderReadCount;
                        ownerBusinessHealthResults.builderWriteCount += ownerBusinessHealthResult.builderWriteCount;
                    } catch (ownerBusinessHealthError: any) {
                        ownerBusinessHealthResults.storesFailed++;
                        logSchedulerFailure(logger, '[OwnerBusinessAssistant] Business Health build failed', SCHEDULER_OWNER_BUSINESS_HEALTH_FAILED, ownerBusinessHealthError, {
                            tId,
                            sId,
                            phase: 'owner_business_health',
                            operation: 'build_snapshot',
                        });
                        results.errors.push(buildSchedulerFailureDiagnostic(ownerBusinessHealthError, {
                            tId,
                            sId,
                            phase: 'owner_business_health',
                            operation: 'build_snapshot',
                        }));
                    }
                }

                // Process EACH project
                let publicDecisionBlocksChanged = false;
                for (const { projectId, data: projectData } of projectEntries) {
                    try {
                        // OPTIMIZATION: Fetch the scheduler-written 7-day
                        // intelligence snapshot once, reuse for both DI + CMI.
                        // Missing/stale snapshots are visible in ops and score
                        // as empty for the run instead of opening daily reads.
                        const analytics = await fetch7DayAnalytics(db, tId, sId, projectId, timeZone, businessDayEndTime);
                        if (analytics.source === 'missing_or_stale') {
                            analyticsResults.intelligenceSnapshotMissing++;
                            logSchedulerWarn(logger, '[NightlyAnalytics] Missing or stale intelligence snapshot; scoring without analytics', {
                                tId,
                                sId,
                                projectId,
                                phase: 'project_scoring',
                                operation: 'fetch_analytics_snapshot',
                                source: analytics.source,
                                metrics: {
                                    expectedLocalDate: addDaysToAnalyticsDateKey(getBusinessAnalyticsDateKey(analyticsRunAt, timeZone, businessDayEndTime), -1),
                                    lastSettledLocalDate: analytics.lastSettledLocalDate || null,
                                },
                            });
                        }

                        if (isFunctionFeatureEnabled('ENABLE_DECISION_BLOCKS_SCORING')) {
                            const blocks = await computeForProject(
                                db,
                                tId,
                                sId,
                                projectId,
                                projectData,
                                businessCategory,
                                analytics,
                                timeZone,
                                businessDayEndTime,
                            );

                            if (blocks) {
                                await saveDecisionBlocksForProject(db, tId, sId, projectId, blocks);
                                publicDecisionBlocksChanged = true;
                                logSchedulerInfo(logger, '[DecisionBlocks] Computed decision blocks', {
                                    tId,
                                    sId,
                                    projectId,
                                    phase: 'project_scoring',
                                    operation: 'save_decision_blocks',
                                });
                                results.successCount++;
                            } else {
                                const clearedPath = await clearStaleDecisionBlocksForProject(
                                    db, tId, sId, projectId, projectData,
                                );
                                if (clearedPath) publicDecisionBlocksChanged = true;
                                logSchedulerInfo(logger, '[DecisionBlocks] Project has no items to score', {
                                    tId,
                                    sId,
                                    projectId,
                                    phase: 'project_scoring',
                                    operation: 'compute_project_blocks',
                                    metrics: { clearedStaleProjection: Boolean(clearedPath) },
                                });
                                results.skippedCount++;
                            }
                        }

                        try {
                            const intelligenceSaved = await computeAndSaveMenuIntelligence(
                                db,
                                tId,
                                sId,
                                projectId,
                                projectData,
                                analytics,
                                'nightly_job',
                            );
                            if (intelligenceSaved) {
                                logSchedulerInfo(logger, '[DecisionBlocks] Computed menu intelligence', {
                                    tId,
                                    sId,
                                    projectId,
                                    phase: 'project_intelligence',
                                    operation: 'compute_intelligence_state',
                                });
                                results.intelligenceSuccess++;
                            }
                        } catch (intError: any) {
                            logSchedulerFailure(logger, '[DecisionBlocks] Project intelligence failed', SCHEDULER_PROJECT_INTELLIGENCE_FAILED, intError, {
                                tId,
                                sId,
                                projectId,
                                phase: 'menu_intelligence',
                                operation: 'compute_intelligence_state',
                            });
                            results.intelligenceFailed++;
                        }
                    } catch (error: any) {
                        logSchedulerFailure(logger, '[DecisionBlocks] Project scoring failed', SCHEDULER_PROJECT_SCORING_FAILED, error, {
                            tId,
                            sId,
                            projectId,
                            phase: 'decision_blocks',
                            operation: 'compute_project_blocks',
                        });
                        results.failedCount++;
                        results.errors.push(buildSchedulerFailureDiagnostic(error, {
                            tId,
                            sId,
                            projectId,
                            phase: 'decision_blocks',
                            operation: 'compute_project_blocks',
                        }));
                    }
                }
                if (publicDecisionBlocksChanged) {
                    await revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:scheduled');
                }
                // Infrastructure Compounding 10.3: Collect freshness data for batch write
                // Piggybacked on existing project reads — zero extra Firestore reads
                if (FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE) {
                    try {
                        let latestModifiedOn: any = null;

                        for (const { data: pData } of projectEntries) {
                            const modOn = pData.modifiedOn || pData.updatedAt;
                            if (modOn && (!latestModifiedOn || modOn > latestModifiedOn)) {
                                latestModifiedOn = modOn;
                            }
                        }

                        storeEnrichment[sId] = {
                            lastPublishedAt: latestModifiedOn || null,
                            projectCount: projectEntries.length,
                        };
                    } catch (enrichmentError) {
                        logSchedulerFailure(logger, '[DecisionBlocks] Store enrichment collection failed', SCHEDULER_STORE_SUMMARY_ENRICHMENT_FAILED, enrichmentError, {
                            tId,
                            sId,
                            phase: 'store_summary_enrichment',
                            operation: 'collect_store_enrichment',
                        });
                    }
                }

                storeSchedulerLeaseStatus = 'completed';
            } catch (error: any) {
                logSchedulerFailure(logger, '[DecisionBlocks] Store scoring failed', SCHEDULER_STORE_RECOVERY_FAILED, error, {
                    tId,
                    sId,
                    phase: 'store_scheduler',
                    operation: 'score_store',
                });
                results.failedCount++;
                results.errors.push(buildSchedulerFailureDiagnostic(error, {
                    tId,
                    sId,
                    phase: 'store_scheduler',
                    operation: 'score_store',
                }));
            } finally {
                try {
                    const finalized = await completeStoreNightlySchedulerLease(
                        storeSchedulerLease,
                        storeSchedulerLeaseStatus,
                    );
                    if (!finalized) {
                        logSchedulerWarn(logger, '[DecisionBlocks] Store scheduler lease ownership changed before finalization', {
                            tId,
                            sId,
                            phase: 'store_scheduler_lease',
                            operation: 'finalize_store_scheduler_lease',
                        });
                    }
                } catch (leaseError) {
                    logSchedulerFailure(
                        logger,
                        '[DecisionBlocks] Failed to finalize store scheduler lease',
                        SCHEDULER_STORE_LEASE_FINALIZE_FAILED,
                        leaseError,
                        {
                            tId,
                            sId,
                            phase: 'store_scheduler_lease',
                            operation: 'finalize_store_scheduler_lease',
                        },
                    );
                }
            }
        }

        // Infrastructure Compounding 10.3: Single batch write for all store enrichment data
        // This replaces N per-store writes with 1 merge write — saves ~99 writes at 100 stores
        if (FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE && Object.keys(storeEnrichment).length > 0) {
            try {
                const enrichmentUpdate: Record<string, any> = { stores: {} };
                for (const [enrichSId, enrichData] of Object.entries(storeEnrichment)) {
                    enrichmentUpdate.stores[enrichSId] = {
                        lastPublishedAt: enrichData.lastPublishedAt,
                        projectCount: enrichData.projectCount,
                    };
                }
                await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set(
                    enrichmentUpdate,
                    { merge: true }
                );
                logger.info(`[10.3] Enriched storesSummary with freshness data for ${Object.keys(storeEnrichment).length} stores (1 write)`);
            } catch (enrichError: any) {
                logger.warn('[10.3] storesSummary enrichment failed (non-blocking)', {
                    failureCode: SCHEDULER_STORE_SUMMARY_ENRICHMENT_FAILED,
                    phase: 'store_summary_enrichment',
                    operation: 'persist_enrichment_batch',
                    ...getSchedulerSourceErrorContext(enrichError),
                });
            }
        }

        logger.info('=== Decision Blocks Scoring Complete ===');
        logger.info(`Results: ${results.totalProjects} projects processed, ${results.successCount} success, ${results.skippedCount} skipped, ${results.failedCount} failed`);
        logger.info(`Intelligence: ${results.intelligenceSuccess} success, ${results.intelligenceFailed} failed`);

        // Track core DI + CMI task results
        taskResults.push({
            name: 'decision_blocks',
            status: results.failedCount > 0 ? (results.successCount > 0 ? 'success' : 'failed') : 'success',
            durationMs: Date.now() - runStartTime,
            details: { totalStores: results.totalStores, totalProjects: results.totalProjects, success: results.successCount, failed: results.failedCount, skipped: results.skippedCount },
        });
        taskResults.push({
            name: 'menu_intelligence',
            status: getSchedulerTaskStatus(results.intelligenceFailed),
            details: { success: results.intelligenceSuccess, failed: results.intelligenceFailed },
        });
        taskResults.push({
            name: 'customer_obp_analytics',
            status: analyticsResults.storesFailed > 0 ? (analyticsResults.storesSucceeded > 0 ? 'success' : 'failed') : 'success',
            durationMs: Date.now() - analyticsTaskStart,
            details: {
                storesAttempted: analyticsResults.storesAttempted,
                storesSucceeded: analyticsResults.storesSucceeded,
                storesFailed: analyticsResults.storesFailed,
                menuProjects: analyticsResults.menuProjects,
                menuErrors: analyticsResults.menuErrors,
                obpStoresWithData: analyticsResults.obpStoresWithData,
                intelligenceSnapshotMissing: analyticsResults.intelligenceSnapshotMissing,
            },
        });
        taskResults.push({
            name: 'owner_business_health',
            status: !FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
                ? 'skipped'
                : getSchedulerTaskStatus(ownerBusinessHealthResults.storesFailed),
            durationMs: Date.now() - analyticsTaskStart,
            details: ownerBusinessHealthResults,
        });

        // Authority Maturation Analysis (Item 3: Expand Nightly Job Coverage)
        // Analyzes owner control usage patterns for Phase 1 → Phase 2 → Phase 3 progression
        if (runPlatformDailyTasks) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Authority Maturation Analysis ===');
                const maturationResult = await processAuthorityMaturationForAllStores();
                logger.info(`Authority Maturation: ${maturationResult.processed} stores analyzed`);
                logger.info(`  Phase 1 (Active): ${maturationResult.phase1Count}`);
                logger.info(`  Phase 2 (Passive): ${maturationResult.phase2Count}`);
                logger.info(`  Phase 3 (Dormant): ${maturationResult.phase3Count}`);
                taskResults.push({ name: 'authority_maturation', status: 'success', durationMs: Date.now() - taskStart, details: { processed: maturationResult.processed, invalidDocuments: maturationResult.invalidDocuments, phase1: maturationResult.phase1Count, phase2: maturationResult.phase2Count, phase3: maturationResult.phase3Count } });
            } catch (maturationError: any) {
                // Non-blocking - log but continue
                logSchedulerFailure(logger, 'Authority Maturation analysis failed', SCHEDULER_AUTHORITY_MATURATION_FAILED, maturationError, {
                    phase: 'authority_maturation',
                    operation: 'process_authority_maturation',
                });
                taskResults.push({ name: 'authority_maturation', status: 'failed', error: SCHEDULER_TASK_FAILED_MESSAGE });
            }
        } else {
            taskResults.push({ name: 'authority_maturation', status: 'skipped', details: { reason: 'daily_cadence' } });
        }

        // MOL v0: Menu Drift Metrics (Category D & E of Internal Tracking System)
        // Computes 30-day rolling drift counters from menu change logs
        // @see __docs__/internal-tracking/mol-v0-implementation-plan.md
        if (runPlatformDailyTasks) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Menu Drift Metrics Computation ===');
                const driftResult = await processMenuDriftMetricsForAllStores();
                logger.info(`Menu Drift Metrics: ${driftResult.itemsProcessed} items processed`);
                logger.info(`  Stores: ${driftResult.storesProcessed}, Projects: ${driftResult.projectsProcessed}`);
                logger.info(`  Reads: ${driftResult.readsCount}, Writes: ${driftResult.writesCount}`);
                if (driftResult.errors.length > 0) {
                    logger.warn(`  Errors: ${driftResult.errors.length}`);
                }
                taskResults.push({ name: 'menu_drift', status: getSchedulerTaskStatus(driftResult.errors.length), durationMs: Date.now() - taskStart, details: { items: driftResult.itemsProcessed, stores: driftResult.storesProcessed, projects: driftResult.projectsProcessed, reads: driftResult.readsCount, writes: driftResult.writesCount, errors: driftResult.errors.length } });
            } catch (driftError: any) {
                // Non-blocking - log but continue
                logSchedulerFailure(logger, 'Menu Drift Metrics computation failed', SCHEDULER_MENU_DRIFT_FAILED, driftError, {
                    phase: 'menu_drift',
                    operation: 'process_menu_drift_metrics',
                });
                taskResults.push({ name: 'menu_drift', status: 'failed', error: SCHEDULER_TASK_FAILED_MESSAGE });
            }
        } else {
            taskResults.push({ name: 'menu_drift', status: 'skipped', details: { reason: 'daily_cadence' } });
        }

        // Guest Feedback Retention (Internal Feedback System)
        // Deletes expired guest feedback documents (90-day retention)
        // @see __docs__/projects/internal-feedback-system/internal-feedback-system_spec.md
        if (runPlatformDailyTasks && FUNCTION_FLAGS.ENABLE_GUEST_FEEDBACK_RETENTION) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Guest Feedback Retention ===');
                const retentionResult = await processGuestFeedbackRetention();
                logger.info(`Guest Feedback Retention: ${retentionResult.deleted} documents deleted`);
                if (retentionResult.errors > 0) {
                    logger.warn(`  Errors: ${retentionResult.errors}`);
                    throw new Error(GUEST_FEEDBACK_RETENTION_TASK_FAILED);
                }
                taskResults.push({ name: 'guest_feedback_retention', status: 'success', durationMs: Date.now() - taskStart, details: { deleted: retentionResult.deleted, errors: retentionResult.errors } });
            } catch (retentionError: unknown) {
                // Non-blocking - log but continue
                logger.error('Guest Feedback Retention failed', {
                    failureCode: GUEST_FEEDBACK_RETENTION_TASK_FAILED,
                    error: getAnalyticsErrorContext(retentionError),
                });
                taskResults.push({
                    name: 'guest_feedback_retention',
                    status: 'failed',
                    error: GUEST_FEEDBACK_RETENTION_TASK_FAILED,
                });
            }
        } else {
            taskResults.push({
                name: 'guest_feedback_retention',
                status: 'skipped',
                details: { reason: runPlatformDailyTasks ? 'feature_disabled' : 'daily_cadence' },
            });
        }

        // Lifecycle Messaging — Renewal Reminders + Suspension Warnings
        // Scans subscriptions renewing in 3 days and past-due 7+ days
        // @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
        let messagingTasksOk = true;
        if (runPlatformDailyTasks) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Lifecycle Messaging Tasks ===');
                const { checkRenewalReminders, checkSuspensionWarnings, retryFailedMessages, getDailyMessageDigest } = await import('./messaging/messagingEngine');
                await checkRenewalReminders();
                await checkSuspensionWarnings();

                // Retry failed messages from last 24h (max 1 retry per message)
                // Industry best practice: transient SMTP failures should be retried
                let retryDetails = { retried: 0, succeeded: 0, ambiguous: 0 };
                try {
                    retryDetails = await retryFailedMessages();
                    if (retryDetails.retried > 0) {
                        logger.info(`Message Retry: ${retryDetails.retried} retried, ${retryDetails.succeeded} succeeded`);
                    }
                    if (retryDetails.ambiguous > 0) {
                        logger.error(`Message Retry: ${retryDetails.ambiguous} ambiguous processing outcomes require manual review`);
                    }
                } catch (retryError) {
                    logSchedulerFailure(logger, 'Lifecycle Messaging retry task failed', SCHEDULER_LIFECYCLE_MESSAGE_RETRY_FAILED, retryError, {
                        phase: 'lifecycle_messaging',
                        operation: 'retry_failed_messages',
                    });
                }

                // Daily messaging digest — solo founder visibility
                let digestDetails = { sent: 0, failed: 0, total: 0 };
                try {
                    digestDetails = await getDailyMessageDigest();
                    if (digestDetails.total > 0) {
                        logger.info(`Messaging Digest: ${digestDetails.sent} sent, ${digestDetails.failed} failed, ${digestDetails.total} total`);
                    }
                } catch (digestError) {
                    logSchedulerFailure(logger, 'Lifecycle Messaging digest task failed', SCHEDULER_LIFECYCLE_MESSAGE_DIGEST_FAILED, digestError, {
                        phase: 'lifecycle_messaging',
                        operation: 'daily_message_digest',
                    });
                }

                logger.info('Lifecycle Messaging tasks completed');
                taskResults.push({ name: 'lifecycle_messaging', status: 'success', durationMs: Date.now() - taskStart, details: { retry: retryDetails, digest: digestDetails } });
            } catch (msgError: any) {
                messagingTasksOk = false;
                // Non-blocking - log but continue
                logSchedulerFailure(logger, 'Lifecycle Messaging tasks failed', SCHEDULER_LIFECYCLE_MESSAGING_FAILED, msgError, {
                    phase: 'lifecycle_messaging',
                    operation: 'run_lifecycle_messaging_tasks',
                });
                taskResults.push({ name: 'lifecycle_messaging', status: 'failed', error: SCHEDULER_TASK_FAILED_MESSAGE });
            }
        } else {
            taskResults.push({ name: 'lifecycle_messaging', status: 'skipped', details: { reason: 'daily_cadence' } });
        }

        // ═══════════════════════════════════════════════════════════════
        // SPECIAL MENU SWITCHING — Nightly Recovery/Marker Backfill
        // The two-minute maintenance task is the precise path. This existing
        // store pass repairs legacy/missing markers and any missed transition.
        // @see __docs__/special-menu-switching/special-menu-switching_impl.md
        // ═══════════════════════════════════════════════════════════════
        if (storeIds.length > 0 && FUNCTION_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Special Menu Switching Recovery ===');
                const smResult = { activated: 0, blocked: 0, deactivated: 0, checked: 0, errors: 0 };
                const now = new Date();

                for (const sId of storeIds) {
                    const storeInfo = storesSummary[sId];
                    if (storeInfo.active === false) continue;
                    const specialMenuTId = typeof storeInfo.tId === 'number' || typeof storeInfo.tId === 'string'
                        ? String(storeInfo.tId)
                        : '';

                    try {
                        // Read projectsSummary for this store
                        const summaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                            .doc(`projects_${sId}`).get();
                        if (!summaryDoc.exists) continue;

                        const parsedSummaryProjects = parseSummaryProjects(summaryDoc.data());
                        const specialMenus = Object.entries(parsedSummaryProjects)
                            .filter(([, project]) => project.isSpecialMenu === true)
                            .map(([projectId, project]) => ({
                                projectId,
                                startsAt: typeof project.specialMenuStartsAt === 'string'
                                    ? Date.parse(project.specialMenuStartsAt)
                                    : Number.NaN,
                                endsAt: typeof project.specialMenuEndsAt === 'string'
                                    ? Date.parse(project.specialMenuEndsAt)
                                    : Number.NaN,
                                status: project.specialMenuStatus,
                            }));
                        smResult.checked += specialMenus.length;

                        const nextTransitionAt = resolveNextSpecialMenuTransitionAt(parsedSummaryProjects);
                        const currentTransitionAt = typeof summaryDoc.data()?.specialMenuNextTransitionAt === 'string'
                            ? summaryDoc.data()?.specialMenuNextTransitionAt
                            : null;
                        if (currentTransitionAt !== nextTransitionAt) {
                            await summaryDoc.ref.set({
                                specialMenuNextTransitionAt: nextTransitionAt || FieldValue.delete(),
                                lastUpdated: FieldValue.serverTimestamp(),
                            }, { merge: true });
                        }

                        const transitions = [
                            ...specialMenus
                                .filter((menu) => (
                                    (menu.status === 'active' || menu.status === 'scheduled')
                                    && Number.isFinite(menu.endsAt)
                                    && menu.endsAt <= now.getTime()
                                ))
                                .sort((a, b) => a.endsAt - b.endsAt)
                                .map((menu) => ({ action: 'expire' as const, ...menu })),
                            ...specialMenus
                                .filter((menu) => (
                                    menu.status === 'scheduled'
                                    && Number.isFinite(menu.startsAt)
                                    && Number.isFinite(menu.endsAt)
                                    && menu.startsAt <= now.getTime()
                                    && menu.endsAt > now.getTime()
                                ))
                                .sort((a, b) => a.startsAt - b.startsAt || a.projectId.localeCompare(b.projectId))
                                .map((menu) => ({ action: 'activate' as const, ...menu })),
                        ];

                        for (const transition of transitions) {
                            try {
                                const result = await transitionScheduledSpecialMenu({
                                    action: transition.action,
                                    db,
                                    enableTempStatus: FUNCTION_FLAGS.ENABLE_TEMP_STATUS,
                                    now,
                                    projectId: transition.projectId,
                                    sId,
                                    tId: specialMenuTId,
                                });
                                if (result.outcome === 'blocked') {
                                    smResult.blocked++;
                                    continue;
                                }
                                if (result.outcome === 'noop') continue;

                                await revalidatePublicClientCacheForStore(
                                    sId,
                                    `specialMenuSwitching:${result.outcome}`,
                                    { touchDigitalScreen: true },
                                );
                                if (result.outcome === 'activated') smResult.activated++;
                                if (result.outcome === 'expired') smResult.deactivated++;
                                logSchedulerInfo(logger, '[SpecialMenuSwitching] Lifecycle transition completed', {
                                    tId: specialMenuTId,
                                    sId,
                                    projectId: transition.projectId,
                                    phase: 'special_menu_switching',
                                    operation: result.outcome === 'activated'
                                        ? 'activate_special_menu'
                                        : result.outcome === 'expired'
                                            ? 'expire_special_menu'
                                            : 'repair_special_menu_state',
                                });
                            } catch (error: any) {
                                const failureCode = transition.action === 'activate'
                                    ? SCHEDULER_SPECIAL_MENU_ACTIVATE_FAILED
                                    : SCHEDULER_SPECIAL_MENU_DEACTIVATE_FAILED;
                                logSchedulerFailure(logger, '[SpecialMenuSwitching] Lifecycle transition failed', failureCode, error, {
                                    tId: specialMenuTId,
                                    sId,
                                    projectId: transition.projectId,
                                    phase: 'special_menu_switching',
                                    operation: transition.action === 'activate'
                                        ? 'activate_special_menu'
                                        : 'expire_special_menu',
                                });
                                smResult.errors++;
                            }
                        }
                    } catch (e: any) {
                        logSchedulerFailure(logger, '[SpecialMenuSwitching] Store check failed', SCHEDULER_SPECIAL_MENU_STORE_CHECK_FAILED, e, {
                            tId: specialMenuTId,
                            sId,
                            phase: 'special_menu_switching',
                            operation: 'check_store_special_menus',
                        });
                        smResult.errors++;
                    }
                }

                logger.info(`Special Menu Switching: checked ${smResult.checked}, activated ${smResult.activated}, deactivated ${smResult.deactivated}, errors ${smResult.errors}`);
                taskResults.push({ name: 'special_menu_switching', status: getSchedulerTaskStatus(smResult.errors), durationMs: Date.now() - taskStart, details: smResult });
            } catch (smError: any) {
                logSchedulerFailure(logger, 'Special Menu Switching check failed', SCHEDULER_SPECIAL_MENU_TASK_FAILED, smError, {
                    phase: 'special_menu_switching',
                    operation: 'run_special_menu_switching',
                });
                taskResults.push({ name: 'special_menu_switching', status: 'failed', error: SCHEDULER_TASK_FAILED_MESSAGE });
            }
        } else {
            taskResults.push({
                name: 'special_menu_switching',
                status: 'skipped',
                details: {
                    reason: FUNCTION_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING
                        ? 'no_due_stores'
                        : 'feature_disabled',
                },
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // INFRASTRUCTURE COMPOUNDING — MenuList Truth Engine
        // 3 tasks that form a self-improving data quality loop.
        // Order matters: Learning → Truth Score → Staleness Check
        // @see __docs__/infrastructure-compounding/
        // ═══════════════════════════════════════════════════════════════

        // 10.2: Extraction Learning Loop — Aggregate owner corrections
        if (runPlatformDailyTasks && FUNCTION_FLAGS.ENABLE_EXTRACTION_LEARNING) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Extraction Learning Aggregation ===');
                const { processExtractionLearningForAllStores } = await import('./analytics/extractionLearning');
                const learningResult = await processExtractionLearningForAllStores();
                logger.info(`Extraction Learning: ${learningResult.totalCorrections} corrections aggregated from ${learningResult.storesWithCorrections} stores`);
                taskResults.push({ name: 'extraction_learning', status: getSchedulerTaskStatus(learningResult.storesFailed), durationMs: Date.now() - taskStart, details: { corrections: learningResult.totalCorrections, storesProcessed: learningResult.storesProcessed, storesWithCorrections: learningResult.storesWithCorrections, storesFailed: learningResult.storesFailed, reads: learningResult.readsCount, writes: learningResult.writesCount } });
            } catch (learningError: any) {
                logSchedulerFailure(logger, 'Extraction Learning aggregation failed', SCHEDULER_EXTRACTION_LEARNING_FAILED, learningError, {
                    phase: 'extraction_learning',
                    operation: 'aggregate_owner_corrections',
                });
                taskResults.push({ name: 'extraction_learning', status: 'failed', error: SCHEDULER_TASK_FAILED_MESSAGE });
            }
        } else {
            taskResults.push({
                name: 'extraction_learning',
                status: 'skipped',
                details: { reason: runPlatformDailyTasks ? 'feature_disabled' : 'daily_cadence' },
            });
        }

        // 10.3: Store Truth Confidence Score — Composite reliability per store
        if (runPlatformDailyTasks && FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Store Truth Confidence Computation ===');
                const { computeStoreTruthConfidenceForAllStores } = await import('./analytics/storeTruthConfidence');
                const truthResult = await computeStoreTruthConfidenceForAllStores();
                logger.info(`Store Truth Confidence: ${truthResult.processed} stores, avg score: ${truthResult.averageScore.toFixed(1)}, stale: ${truthResult.staleCount}`);
                taskResults.push({ name: 'store_truth_confidence', status: 'success', durationMs: Date.now() - taskStart, details: { processed: truthResult.processed, avgScore: truthResult.averageScore, staleCount: truthResult.staleCount, reads: truthResult.readsCount, writes: truthResult.writesCount } });
            } catch (truthError: any) {
                logSchedulerFailure(logger, 'Store Truth Confidence computation failed', SCHEDULER_STORE_TRUTH_CONFIDENCE_FAILED, truthError, {
                    phase: 'store_truth_confidence',
                    operation: 'compute_store_truth_confidence',
                });
                taskResults.push({ name: 'store_truth_confidence', status: 'failed', error: SCHEDULER_TASK_FAILED_MESSAGE });
            }
        } else {
            taskResults.push({
                name: 'store_truth_confidence',
                status: 'skipped',
                details: { reason: runPlatformDailyTasks ? 'feature_disabled' : 'daily_cadence' },
            });
        }

        // 10.4: Periodic Staleness Check — Detect stale stores for lifecycle messaging
        if (runPlatformDailyTasks && FUNCTION_FLAGS.ENABLE_STALENESS_CHECK) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Periodic Staleness Check ===');
                const { checkStalenessForAllStores } = await import('./analytics/stalenessCheck');
                const stalenessResult = await checkStalenessForAllStores();
                logger.info(`Staleness Check: ${stalenessResult.staleFound} stale, ${stalenessResult.newStalenessDetected} new detections, ${stalenessResult.skippedRecent} skipped (recent)`);
                taskResults.push({ name: 'staleness_check', status: getSchedulerTaskStatus(stalenessResult.errors), durationMs: Date.now() - taskStart, details: { checked: stalenessResult.checked, staleFound: stalenessResult.staleFound, newDetections: stalenessResult.newStalenessDetected, skippedRecent: stalenessResult.skippedRecent, errors: stalenessResult.errors, reads: stalenessResult.readsCount, writes: stalenessResult.writesCount } });
            } catch (stalenessError: any) {
                logSchedulerFailure(logger, 'Staleness Check failed', SCHEDULER_STALENESS_CHECK_FAILED, stalenessError, {
                    phase: 'staleness_check',
                    operation: 'check_store_staleness',
                });
                taskResults.push({ name: 'staleness_check', status: 'failed', error: SCHEDULER_TASK_FAILED_MESSAGE });
            }
        } else {
            taskResults.push({
                name: 'staleness_check',
                status: 'skipped',
                details: { reason: runPlatformDailyTasks ? 'feature_disabled' : 'daily_cadence' },
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // Help-center intelligence moved to the isolated Answerlattice project.
        // Keep explicit task records so old run-log consumers do not interpret
        // the absence of these names as an interrupted MenuList scheduler run.
        // ═══════════════════════════════════════════════════════════════
        ['feedback_intelligence', 'kb_quality', 'weekly_narrative', 'health_signals'].forEach((name) => {
            taskResults.push({
                name,
                status: 'skipped',
                details: { reason: 'moved_to_answerlattice_runtime' },
            });
        });

        taskResults.push({
            name: 'kb_generation_watchdog',
            status: 'skipped',
            details: { reason: 'moved_to_answerlattice_runtime' },
        });

        // ═══════════════════════════════════════════════════════════════
        // ANSWERLATTICE — MOVED TO SEPARATE FIREBASE PROJECT
        // Answerlattice nightly now runs independently in functions-answerlattice/
        // @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md
        // @see __docs__/answerlattice/doctrine/08-product-separation-playbook.md
        // ═══════════════════════════════════════════════════════════════

        if (platformDailyTaskLease) {
            const platformDailyTaskFailed = taskResults.some(
                (task) => PLATFORM_DAILY_TASK_NAMES.has(task.name) && task.status === 'failed',
            );
            const completed = await completePlatformDailyTaskLease(
                platformDailyTaskLease,
                platformDailyTaskFailed ? 'failed' : 'completed',
            );
            if (!completed) {
                logSchedulerFailure(
                    logger,
                    'Platform daily task outcome rejected after lease ownership changed',
                    PLATFORM_DAILY_TASK_LEASE_LOST,
                    Object.assign(new Error(PLATFORM_DAILY_TASK_LEASE_LOST), {
                        code: PLATFORM_DAILY_TASK_LEASE_LOST,
                    }),
                    {
                        phase: 'platform_daily_tasks',
                        operation: 'complete_platform_daily_task_lease',
                    },
                );
            }
            platformDailyTaskLease = null;
        }

        // ═══════════════════════════════════════════════════════════════
        // PERSIST RUN LOG (for Scheduler Monitor Dashboard)
        // Stores full run results in Firestore so the dashboard can display
        // run history, per-task breakdown, and error details.
        // ═══════════════════════════════════════════════════════════════
        const totalDurationMs = Date.now() - runStartTime;
        const hasAnyFailure = results.failedCount > 0 || !messagingTasksOk || taskResults.some(t => t.status === 'failed');
        const runStatus = hasAnyFailure
            ? (results.successCount > 0 ? 'partial' : 'failed')
            : 'success';

        // Mismatch telemetry: detect if expected stores weren't fully processed
        const expectedStoreCount = storeIds.length;
        const processedStoreCount = results.successCount + results.failedCount + results.skippedCount;
        const storeMismatch = expectedStoreCount !== processedStoreCount;
        if (storeMismatch) {
            logger.warn(`[Scheduler] STORE MISMATCH: expected=${expectedStoreCount}, processed=${processedStoreCount}. Possible filtering bug or early exit.`);
        }

        try {
            await db.collection(DB_COLLECTIONS.SCHEDULER_RUN_LOGS).add({
                trigger: 'scheduled',
                triggeredBy: 'system',
                startedAt: Timestamp.fromMillis(runStartTime),
                completedAt: Timestamp.now(),
                expiresAt: Timestamp.fromMillis(
                    runStartTime + FUNCTION_RETENTION_CONFIG.SCHEDULER_RUN_LOG_RETENTION_DAYS * DAY_MS,
                ),
                durationMs: totalDurationMs,
                status: runStatus,
                schedulerHour: currentUTCHour,
                totalStoresInPlatform: allStoreIds.length,
                totalStores: results.totalStores,
                totalProjects: results.totalProjects,
                successCount: results.successCount,
                failedCount: results.failedCount,
                skippedCount: results.skippedCount,
                intelligenceSuccess: results.intelligenceSuccess,
                intelligenceFailed: results.intelligenceFailed,
                storeMismatch,
                tasks: taskResults,
                errors: results.errors.slice(0, 50), // Cap errors to prevent large docs
            });
        } catch (logError) {
            logSchedulerFailure(logger, '[Scheduler] Failed to persist run log', SCHEDULER_RUN_LOG_PERSIST_FAILED, logError, {
                phase: 'run_log_persist',
                operation: 'persist_scheduled_run_log',
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // SCHEDULER COMPLETION SUMMARY (Dead Man's Switch pattern)
        // If this Telegram alert doesn't arrive, the scheduler didn't complete.
        // Solo founder needs this — no QA, no ops team, just you and Telegram.
        // ═══════════════════════════════════════════════════════════════
        try {
            const { createAlert } = await import('./monitoring/alerts');
            const duration = Math.round((Date.now() - new Date(event.scheduleTime || Date.now()).getTime()) / 1000);
            const hasErrors = results.failedCount > 0 || !messagingTasksOk || storeMismatch;
            await createAlert({
                type: 'health',
                severity: hasErrors ? 'warning' : 'info',
                title: hasErrors ? '⚠️ Nightly Scheduler Done (with errors)' : '✅ Nightly Scheduler Complete',
                message: [
                    `Hour: ${currentUTCHour} UTC | Stores: ${results.totalStores}/${allStoreIds.length} | Projects: ${results.totalProjects}`,
                    `Success: ${results.successCount} | Failed: ${results.failedCount} | Skipped: ${results.skippedCount}`,
                    `Intelligence: ${results.intelligenceSuccess}✓ ${results.intelligenceFailed}✗`,
                    `Messaging: ${messagingTasksOk ? 'OK' : 'FAILED'}`,
                    storeMismatch ? `⚠️ STORE MISMATCH: expected=${expectedStoreCount} processed=${processedStoreCount}` : '',
                    `Duration: ~${duration}s`,
                ].filter(Boolean).join('\n'),
                tId: 'system',
                sId: 'scheduler',
                metadata: { schedulerRun: true, hasErrors, duration, schedulerHour: currentUTCHour, storeMismatch },
                ...(hasErrors
                    ? {
                        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SCHEDULER_FAILURE,
                        productId: 'PLATFORM',
                        category: 'scheduler',
                    }
                    : { suppressPlatformDelivery: true }),
            });
        } catch (alertError) {
            logSchedulerFailure(logger, '[DecisionBlocks] Completion alert failed', SCHEDULER_COMPLETION_ALERT_FAILED, alertError, {
                phase: 'scheduled_run',
                operation: 'create_completion_alert',
            });
        }

    } catch (error: any) {
        logSchedulerFailure(logger, '[DecisionBlocks] Fatal scheduler error', SCHEDULER_DECISION_BLOCKS_FATAL_FAILED, error, {
            phase: 'scheduled_run',
            operation: 'compute_decision_blocks_scores',
        });
        throw error;
    } finally {
        await flushSentry();
    }
});

/**
 * Manual store-level nightly recovery.
 *
 * Runs the same store scheduler path used by the hourly job for one selected
 * store: analytics settlement, Decision Blocks, and Menu Intelligence for all
 * active projects under that store. It does not require or accept a project ID.
 */
export const triggerStoreNightlyScheduler = onCall({
    region: 'us-central1',
    timeoutSeconds: 540,
    maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
    secrets: [
        SECRETS.GEMINI_AI_KEY,
        SECRETS.GEMINI_AI_KEY_2,
        SECRETS.GEMINI_AI_KEY_3,
        SECRETS.SENTRY_DSN,
        ...SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
        ...SECRET_GROUPS.PUBLIC_CACHE_REVALIDATION,
    ],
}, async (request) => {
    initSentry();
    const logger = functions.logger;

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to trigger nightly scheduler recovery');
    }

    const db = firestoreAdmin;
    const requesterRole = await assertCurrentPlatformOwner(
        db,
        request.auth,
        'trigger nightly scheduler recovery',
    );

    const tId = normalizeCallableDocumentId(request.data?.tId, 'tId');
    const sId = normalizeCallableDocumentId(request.data?.sId, 'sId');
    if (!tId || !sId) {
        throw new HttpsError('invalid-argument', 'tId and sId are required');
    }

    const runStartTime = Date.now();
    const runLogId = `manual_store_${tId}_${sId}_${runStartTime}`;
    const runLogRef = db.collection(DB_COLLECTIONS.SCHEDULER_RUN_LOGS).doc(runLogId);
    const triggeredBy = request.auth.uid;
    const manualScope = { tId, sId };
    let recoveryLease: StoreNightlySchedulerLease | null = null;
    let recoveryLeaseStatus: 'completed' | 'failed' = 'failed';

    const writeRunLog = async (payload: Record<string, any>) => {
        await runLogRef.set({
            runLogId,
            trigger: 'manual',
            triggerKind: 'store_nightly_recovery',
            triggeredBy,
            manualScope,
            expiresAt: Timestamp.fromMillis(
                runStartTime + FUNCTION_RETENTION_CONFIG.SCHEDULER_RUN_LOG_RETENTION_DAYS * DAY_MS,
            ),
            updatedAt: FieldValue.serverTimestamp(),
            ...payload,
        }, { merge: true });
    };

    try {
        recoveryLease = await acquireStoreNightlySchedulerLease(
            db,
            tId,
            sId,
            runLogId,
            new Date(runStartTime),
        );
        if (!recoveryLease) {
            throw new HttpsError(
                'already-exists',
                'A nightly recovery is already running for this store.',
            );
        }

        await writeRunLog({
            startedAt: Timestamp.fromMillis(runStartTime),
            completedAt: null,
            durationMs: 0,
            status: 'running',
            phase: 'stores_summary_lookup',
            totalStores: 1,
            totalProjects: 0,
            successCount: 0,
            failedCount: 0,
            skippedCount: 0,
            intelligenceSuccess: 0,
            intelligenceFailed: 0,
            tasks: [],
            errors: [],
            metadata: {
                source: 'platform_ui',
                callable: 'triggerStoreNightlyScheduler',
                requesterRole,
            },
        });

        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
        const storeInfo = storesSummary[sId] || null;

        if (!storeInfo) {
            const diagnostic = buildSchedulerFailureDiagnostic(createSchedulerTaskError(SCHEDULER_MANUAL_STORE_NOT_FOUND), {
                tId,
                sId,
                phase: 'stores_summary_lookup',
                operation: 'load_store_from_stores_summary',
            });
            await writeRunLog({
                completedAt: Timestamp.now(),
                durationMs: Date.now() - runStartTime,
                status: 'failed',
                phase: 'stores_summary_lookup',
                failedCount: 1,
                errors: [diagnostic],
            });
            throw new HttpsError('not-found', MANUAL_STORE_NOT_FOUND_MESSAGE, { runLogId, diagnostic });
        }

        if (storeInfo.tId !== tId) {
            const diagnostic = buildSchedulerFailureDiagnostic(createSchedulerTaskError(SCHEDULER_MANUAL_STORE_TENANT_MISMATCH), {
                tId,
                sId,
                phase: 'stores_summary_validation',
                operation: 'validate_store_tenant_match',
                details: { storesSummaryTenantId: storeInfo.tId },
            });
            await writeRunLog({
                completedAt: Timestamp.now(),
                durationMs: Date.now() - runStartTime,
                status: 'failed',
                phase: 'stores_summary_validation',
                failedCount: 1,
                errors: [diagnostic],
            });
            throw new HttpsError('failed-precondition', MANUAL_STORE_TENANT_MISMATCH_MESSAGE, { runLogId, diagnostic });
        }

        const canonicalStoreSnap = await db.collection(DB_COLLECTIONS.STORES).doc(sId).get();
        try {
            assertActiveStoreScope(canonicalStoreSnap.exists ? canonicalStoreSnap.data() : undefined, tId, sId);
        } catch (scopeError) {
            const diagnostic = buildSchedulerFailureDiagnostic(scopeError, {
                tId,
                sId,
                phase: 'canonical_store_validation',
                operation: 'validate_active_store_scope',
            });
            await writeRunLog({
                completedAt: Timestamp.now(),
                durationMs: Date.now() - runStartTime,
                status: 'failed',
                phase: diagnostic.phase,
                failedCount: 1,
                errors: [diagnostic],
            });
            throw scopeError;
        }

        logSchedulerInfo(logger, 'Manual store nightly scheduler recovery started', {
            tId,
            sId,
            runLogId,
            phase: 'store_nightly_recovery',
            operation: 'start_manual_recovery',
            storeName: storeInfo.name || null,
            metrics: { active: storeInfo.active !== false },
        });
        await writeRunLog({
            phase: 'store_nightly_recovery',
            metadata: {
                source: 'platform_ui',
                callable: 'triggerStoreNightlyScheduler',
                requesterRole,
                storeName: storeInfo.name || '',
                storeActive: storeInfo.active !== false,
                timeZone: storeInfo.timeZone || '',
                businessDayEndTime: storeInfo.businessDayEndTime || '',
            },
        });

        const storeRun = await runNightlySchedulerForStore(
            db,
            sId,
            storeInfo,
            new Date(runStartTime),
            'manual_trigger',
        );

        if (FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE && storeRun.enrichment) {
            await writeRunLog({ phase: 'stores_summary_enrichment' });
            await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
                stores: {
                    [sId]: {
                        lastPublishedAt: storeRun.enrichment.lastPublishedAt,
                        projectCount: storeRun.enrichment.projectCount,
                    },
                },
            }, { merge: true });
        }

        const ownerBusinessHealthFailed = FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
            && !storeRun.ownerBusinessHealth?.currentDocId;
        const status = storeRun.failedCount > 0
            || storeRun.intelligenceFailed > 0
            || storeRun.analytics.storesFailed > 0
            || ownerBusinessHealthFailed
            ? (storeRun.successCount > 0 || storeRun.analytics.storesSucceeded > 0 ? 'partial' : 'failed')
            : 'success';
        const taskResults = [
            {
                name: 'decision_blocks',
                status: storeRun.failedCount > 0 ? (storeRun.successCount > 0 ? 'success' : 'failed') : 'success',
                details: {
                    totalStores: 1,
                    totalProjects: storeRun.totalProjects,
                    success: storeRun.successCount,
                    failed: storeRun.failedCount,
                    skipped: storeRun.skippedCount,
                },
            },
            {
                name: 'menu_intelligence',
                status: getSchedulerTaskStatus(storeRun.intelligenceFailed),
                details: {
                    success: storeRun.intelligenceSuccess,
                    failed: storeRun.intelligenceFailed,
                },
            },
            {
                name: 'customer_obp_analytics',
                status: storeRun.analytics.storesFailed > 0 ? (storeRun.analytics.storesSucceeded > 0 ? 'success' : 'failed') : 'success',
                details: storeRun.analytics,
            },
            {
                name: 'owner_business_health',
                status: !FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
                    ? 'skipped'
                    : getSchedulerTaskStatus(ownerBusinessHealthFailed ? 1 : 0),
                details: storeRun.ownerBusinessHealth || { enabled: FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH },
            },
        ];

        await writeRunLog({
            completedAt: Timestamp.now(),
            durationMs: Date.now() - runStartTime,
            status,
            phase: 'completed',
            manualScope: { tId, sId },
            totalStores: 1,
            totalProjects: storeRun.totalProjects,
            successCount: storeRun.successCount,
            failedCount: storeRun.failedCount,
            skippedCount: storeRun.skippedCount,
            intelligenceSuccess: storeRun.intelligenceSuccess,
            intelligenceFailed: storeRun.intelligenceFailed,
            tasks: taskResults,
            errors: storeRun.errors,
        });

        logSchedulerInfo(logger, 'Manual store nightly scheduler recovery completed', {
            tId,
            sId,
            runLogId,
            phase: 'store_nightly_recovery',
            operation: 'complete_manual_recovery',
            metrics: {
                status,
                totalProjects: storeRun.totalProjects,
                successCount: storeRun.successCount,
                failedCount: storeRun.failedCount,
                intelligenceSuccess: storeRun.intelligenceSuccess,
                intelligenceFailed: storeRun.intelligenceFailed,
                analyticsStoresAttempted: storeRun.analytics.storesAttempted,
                analyticsStoresSucceeded: storeRun.analytics.storesSucceeded,
                analyticsStoresFailed: storeRun.analytics.storesFailed,
                ownerBusinessHealthEnabled: storeRun.ownerBusinessHealth?.enabled,
                ownerBusinessHealthReadCount: storeRun.ownerBusinessHealth?.builderReadCount,
                ownerBusinessHealthWriteCount: storeRun.ownerBusinessHealth?.builderWriteCount,
                errorCount: storeRun.errors.length,
            },
        });

        recoveryLeaseStatus = 'completed';
        return {
            success: status !== 'failed',
            runLogId,
            status,
            totalStores: 1,
            totalProjects: storeRun.totalProjects,
            successCount: storeRun.successCount,
            failedCount: storeRun.failedCount,
            skippedCount: storeRun.skippedCount,
            intelligenceSuccess: storeRun.intelligenceSuccess,
            intelligenceFailed: storeRun.intelligenceFailed,
            analytics: storeRun.analytics,
            ownerBusinessHealth: storeRun.ownerBusinessHealth,
            errors: storeRun.errors,
        };
    } catch (error: any) {
        const diagnostic = buildSchedulerFailureDiagnostic(error, {
            tId,
            sId,
            phase: 'manual_recovery_callable',
            operation: 'triggerStoreNightlyScheduler',
        });

        logSchedulerFailure(logger, '[ManualSchedulerRecovery] Failed', SCHEDULER_STORE_RECOVERY_FAILED, error, {
            tId,
            sId,
            runLogId,
            phase: 'manual_recovery_callable',
            operation: 'triggerStoreNightlyScheduler',
        });

        if (!(error instanceof HttpsError)) {
            try {
                await writeRunLog({
                    completedAt: Timestamp.now(),
                    durationMs: Date.now() - runStartTime,
                    status: 'failed',
                    phase: diagnostic.phase,
                    failedCount: 1,
                    errors: [diagnostic],
                });
            } catch (logError) {
                logSchedulerFailure(logger, '[ManualSchedulerRecovery] Failed to persist failure run log', SCHEDULER_RUN_LOG_PERSIST_FAILED, logError, {
                    runLogId,
                    tId,
                    sId,
                    phase: 'run_log_persist',
                    operation: 'persist_manual_failure_run_log',
                });
            }
        }

        if (error instanceof HttpsError) {
            throw error;
        }

        throw new HttpsError('internal', diagnostic.error, { runLogId, diagnostic });
    } finally {
        if (recoveryLease) {
            try {
                const finalized = await completeStoreNightlySchedulerLease(recoveryLease, recoveryLeaseStatus);
                if (!finalized) {
                    logSchedulerWarn(logger, '[ManualSchedulerRecovery] Lease ownership changed before finalization', {
                        tId,
                        sId,
                        runLogId,
                        phase: 'manual_recovery_lease',
                        operation: 'finalize_manual_recovery_lease',
                    });
                }
            } catch (leaseError) {
                logSchedulerFailure(
                    logger,
                    '[ManualSchedulerRecovery] Failed to finalize recovery lease',
                    SCHEDULER_STORE_LEASE_FINALIZE_FAILED,
                    leaseError,
                    {
                        tId,
                        sId,
                        runLogId,
                        phase: 'manual_recovery_lease',
                        operation: 'finalize_manual_recovery_lease',
                    },
                );
            }
        }
        await flushSentry();
    }
});

/**
 * Manual trigger for testing/backfill (callable function)
 * 
 * Supports a single project or one store. Platform-wide recovery belongs to
 * the scheduled function so one callable cannot open an unbounded scan.
 */
export const triggerDecisionBlocksScoring = onCall({
    region: 'us-central1',
    timeoutSeconds: 540,
    maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
    secrets: [
        SECRETS.GEMINI_AI_KEY,
        SECRETS.GEMINI_AI_KEY_2,
        SECRETS.GEMINI_AI_KEY_3,
        SECRETS.SENTRY_DSN,
        ...SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
        ...SECRET_GROUPS.PUBLIC_CACHE_REVALIDATION,
    ],
}, async (request) => {
    initSentry();
    const logger = functions.logger;

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to trigger Decision Blocks scoring');
    }

    const db = firestoreAdmin;
    await assertCurrentPlatformOwner(db, request.auth, 'trigger Decision Blocks scoring');
    if (!isFunctionFeatureEnabled('ENABLE_DECISION_BLOCKS_SCORING')) {
        throw new HttpsError('failed-precondition', 'Decision Blocks scoring is currently disabled.');
    }

    const data = request.data || {};
    const tId = normalizeCallableDocumentId(data.tId, 'tId');
    const sId = normalizeCallableDocumentId(data.sId, 'sId');
    const projectId = normalizeCallableDocumentId(data.projectId, 'projectId');
    const runAll = data.runAll === true || data.scope === 'all';
    if (runAll) {
        throw new HttpsError('invalid-argument', 'Platform-wide manual scoring is not supported; run one store or project at a time.');
    }

    if (!tId && !sId && !projectId) {
        throw new HttpsError('invalid-argument', 'Provide tId and sId; projectId is optional.');
    }

    if ((tId && !sId) || (!tId && sId) || (projectId && (!tId || !sId))) {
        throw new HttpsError('invalid-argument', 'Scoped Decision Blocks scoring requires tId and sId; projectId is optional');
    }

    // Case 1: Process single project
    if (tId && sId && projectId) {
        logSchedulerInfo(logger, '[DecisionBlocks] Manual trigger for project', {
            tId,
            sId,
            projectId,
            phase: 'manual_decision_blocks_trigger',
            operation: 'score_single_project',
        });

        const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(sId).get();
        if (!storeDoc.exists) {
            throw new HttpsError('not-found', `Store ${sId} not found`);
        }

        const projectDoc = await getProjectDocRef(db, String(tId), String(sId), String(projectId)).get();
        if (!projectDoc.exists) {
            throw new HttpsError('not-found', `Project ${projectId} not found`);
        }

        const storeData = storeDoc.data();
        const projectData = projectDoc.data()!;
        assertActiveStoreScope(storeData, tId, sId);
        if (projectData.deleted === true || projectData.active === false) {
            throw new HttpsError('failed-precondition', 'Project is not active.');
        }
        const businessCategory = resolveBusinessCategoryOrFallback(storeData?.businessType, storeData?.businessCategory);

        const blocks = await computeForProject(
            db,
            tId,
            sId,
            projectId,
            projectData,
            businessCategory,
            undefined,
            storeData?.timeZone,
            storeData?.businessDayEndTime,
        );

        if (blocks) {
            const projectPath = await saveDecisionBlocksForProject(db, tId, sId, projectId, blocks);
            await revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-project');
            return {
                success: true,
                projectId,
                projectPath,
                candidateCounts: {
                    popular: blocks.popular.length,
                    quickPick: blocks.quickPick.length,
                    bestValue: blocks.bestValue.length,
                },
            };
        }

        const clearedPath = await clearStaleDecisionBlocksForProject(
            db, tId, sId, projectId, projectData,
        );
        if (clearedPath) {
            await revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-project-clear');
            return { success: true, projectId, projectPath: clearedPath, cleared: true };
        }
        return { success: false, message: 'No items to score' };
    }

    // Case 2: Process all projects in a single store
    if (tId && sId) {
        logSchedulerInfo(logger, '[DecisionBlocks] Manual trigger for store projects', {
            tId,
            sId,
            phase: 'manual_decision_blocks_trigger',
            operation: 'score_store_projects',
        });

        const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(sId).get();
        if (!storeDoc.exists) {
            throw new HttpsError('not-found', `Store ${sId} not found`);
        }

        const storeData = storeDoc.data();
        assertActiveStoreScope(storeData, tId, sId);
        const businessCategory = resolveBusinessCategoryOrFallback(storeData?.businessType, storeData?.businessCategory);

        const { projectEntries } = await loadActiveProjectsForScheduler(db, tId, sId);
        if (projectEntries.length === 0) {
            return { success: false, message: 'No projects found for this store' };
        }

        let successCount = 0;
        let clearedCount = 0;
        let failedCount = 0;

        for (const { projectId: pId, data: projectData } of projectEntries) {
            try {
                const blocks = await computeForProject(
                    db,
                    tId,
                    sId,
                    pId,
                    projectData,
                    businessCategory,
                    undefined,
                    storeData?.timeZone,
                    storeData?.businessDayEndTime,
                );

                if (blocks) {
                    await saveDecisionBlocksForProject(db, tId, sId, pId, blocks);
                    successCount++;
                } else if (await clearStaleDecisionBlocksForProject(db, tId, sId, pId, projectData)) {
                    clearedCount++;
                }
            } catch (error) {
                failedCount++;
                logSchedulerFailure(logger, '[DecisionBlocks] Manual project scoring failed', SCHEDULER_PROJECT_SCORING_FAILED, error, {
                    tId,
                    sId,
                    projectId: pId,
                    phase: 'manual_decision_blocks_trigger',
                    operation: 'score_store_project',
                });
            }
        }

        if (successCount + clearedCount > 0) {
            await revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-store');
        }
        const status = failedCount === 0
            ? 'success'
            : successCount + clearedCount > 0 ? 'partial' : 'failed';
        return {
            success: status !== 'failed',
            status,
            successCount,
            clearedCount,
            failedCount,
            total: projectEntries.length,
        };
    }

    throw new HttpsError('invalid-argument', 'Provide a valid store or project scope.');
});

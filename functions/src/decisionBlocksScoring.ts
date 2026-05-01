import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { processAuthorityMaturationForAllStores } from './analytics/authorityMaturation';
import { processGuestFeedbackRetention } from './analytics/guestFeedbackRetention';
import { processMenuDriftMetricsForAllStores } from './analytics/menuDriftMetrics';
import { reconcileSubscriptions } from './billing/reconcileSubscriptions';
import { SECRETS } from './config/secrets';
import { DB_COLLECTIONS, getDecisionBlocksDocId, getMenuIntelligenceDocId } from './constants/database';
import { FUNCTION_FLAGS } from './constants/features';
import { firestoreAdmin } from './firebaseAdmin';
import { logger as appLogger } from './lib/logger';
import { flush as flushSentry, initSentry } from './lib/sentry';
import { computeIntelligenceState, fetchCurrentIntelligence, setAuditLogRunContext } from './intelligence/menuIntelligence';
import { AggregatedAnalytics, fetch7DayAnalytics } from './intelligence/shared/analyticsAggregator';
import { extractActiveItems } from './intelligence/shared/itemExtractor';
import { DEFAULT_DURATIONS, normalize, QUICK_PICK_THRESHOLDS, WEIGHTS } from './intelligence/shared/scoreNormalizer';
import { addDaysToAnalyticsDateKey, getAnalyticsDateKey, getAnalyticsDateRange } from './utils/analyticsDate';

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
 * - Each Project gets its own Decision Blocks document
 * 
 * SCORING LOGIC:
 * - Popular Right Now: views (40%) + clicks (30%) + orders (20%) + ownerBoost (10%)
 * - Quick Pick: duration score (60%) + popularity (30%) + ownerBoost (10%)
 * - Best Value: popularity/price ratio (70%) + ownerBoost (10%) + reviews (20%)
 * 
 * OUTPUT:
 * Creates/updates document: decisionBlocks/{tId}_{sId}_{projectId}
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
interface ItemStats {
    itemId: string;
    itemName: string;
    category: string;
    views: number;
    clicks: number;
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
const MAX_CATCH_UP_DAYS_PER_RUN = 7;

interface DecisionBlocksDocument {
    tId: string;
    sId: string;
    projectId: string;          // Each project gets its own Decision Blocks
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

function parseSummaryProjects(data: any): Record<string, any> {
    if (!data || typeof data !== 'object') return {};

    const result: Record<string, any> = {};
    if (data.projects && typeof data.projects === 'object' && !Array.isArray(data.projects)) {
        Object.assign(result, data.projects);
    }

    for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith('projects.')) continue;
        const rest = key.slice('projects.'.length);
        const [projectId, ...fieldPath] = rest.split('.');
        if (!projectId) continue;

        if (!result[projectId]) result[projectId] = {};
        if (fieldPath.length === 0) {
            if (value && typeof value === 'object') {
                result[projectId] = { ...result[projectId], ...(value as Record<string, any>) };
            }
            continue;
        }

        let target = result[projectId] as Record<string, any>;
        for (let i = 0; i < fieldPath.length - 1; i++) {
            const segment = fieldPath[i];
            if (!target[segment] || typeof target[segment] !== 'object') {
                target[segment] = {};
            }
            target = target[segment];
        }
        target[fieldPath[fieldPath.length - 1]] = value;
    }

    return result;
}

async function loadActiveProjectsForScheduler(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
): Promise<{ projectEntries: ActiveProjectEntry[]; activeProjectIds: string[]; source: 'summary' | 'query' }> {
    const summarySnap = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${sId}`).get();
    const summaryProjects = summarySnap.exists ? parseSummaryProjects(summarySnap.data()) : {};
    const activeProjectIds = Object.entries(summaryProjects)
        .filter(([, project]) => {
            const projectData = project as Record<string, any>;
            return projectData?.active !== false && projectData?.deleted !== true;
        })
        .map(([projectId]) => projectId);

    if (activeProjectIds.length > 0) {
        const refs = activeProjectIds.map((projectId) => db.collection(DB_COLLECTIONS.PROJECTS).doc(projectId));
        const projectSnaps = await db.getAll(...refs);
        const projectEntries = projectSnaps
            .filter((snap) => snap.exists)
            .map((snap) => {
                const data = snap.data() || {};
                return {
                    projectId: String(data.projectId || snap.id),
                    data,
                };
            })
            .filter(({ data }) => data.deleted !== true && data.active !== false);

        return { projectEntries, activeProjectIds, source: 'summary' };
    }

    const projectsQuery = await db.collection(DB_COLLECTIONS.PROJECTS)
        .where('tId', '==', parseInt(tId))
        .where('sId', '==', parseInt(sId))
        .get();

    const projectEntries = projectsQuery.docs
        .map((doc) => {
            const data = doc.data();
            return {
                projectId: String(data.projectId || doc.id),
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
): Promise<string[]> {
    const targetDate = addDaysToAnalyticsDateKey(getAnalyticsDateKey(now, timeZone), -1);
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

// Scoring weights, duration thresholds, and normalize() imported from
// functions/src/intelligence/shared/scoreNormalizer.ts (single source of truth)

/**
 * Calculate Popular Right Now score
 */
function calculatePopularScore(item: ItemStats, maxViews: number, maxClicks: number, maxOrders: number): number {
    const viewScore = normalize(item.views, maxViews) * WEIGHTS.popular.views;
    const clickScore = normalize(item.clicks, maxClicks) * WEIGHTS.popular.clicks;
    const orderScore = normalize(item.orders, maxOrders) * WEIGHTS.popular.orders;
    const boostScore = ((item.ownerBoost || 0) + 20) / 40 * 100 * WEIGHTS.popular.ownerBoost; // Normalize -20 to +20 to 0-100

    // Bonus for isBestSeller flag
    const bestSellerBonus = item.isBestSeller ? 10 : 0;

    return viewScore + clickScore + orderScore + boostScore + bestSellerBonus;
}

/**
 * Calculate Quick Pick score (lower duration = higher score)
 */
function calculateQuickPickScore(item: ItemStats, businessCategory: string, maxPopularity: number): number {
    const threshold = QUICK_PICK_THRESHOLDS[businessCategory] || QUICK_PICK_THRESHOLDS.default;
    const defaultDuration = DEFAULT_DURATIONS[businessCategory] || DEFAULT_DURATIONS.default;

    const duration = item.duration || defaultDuration;

    // If duration exceeds threshold, item is not eligible for Quick Pick
    if (duration > threshold * 2) return -1;

    // Duration score: lower is better (inverted)
    const durationScore = Math.max(0, 100 - (duration / threshold) * 50) * WEIGHTS.quickPick.duration;

    // Popularity component
    const popularity = item.views + item.clicks * 2 + item.orders * 5;
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

    const popularity = item.views + item.clicks * 2 + item.orders * 5;

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
            const keys = REASON_KEYS.popular[category] || REASON_KEYS.popular.default;
            if (item.isBestSeller || item.orders > 10) {
                return { reason: 'favorite' in keys ? keys.favorite : REASON_KEYS.popular.default.favorite };
            }
            return { reason: 'trending' in keys ? keys.trending : REASON_KEYS.popular.default.popular };
        }

        case 'quickPick': {
            const keys = REASON_KEYS.quickPick[category] || REASON_KEYS.quickPick.default;
            const duration = item.duration || DEFAULT_DURATIONS[businessCategory] || 15;

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
 * ARCHITECTURE: Each project gets its own Decision Blocks document
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
    businessCategory: string = 'specialty',
    prefetchedAnalytics?: AggregatedAnalytics,  // OPTIMIZATION: Reuse analytics if already fetched
    timeZone?: string,
): Promise<DecisionBlocksDocument | null> {
    const logger = functions.logger;

    // Aggregate item stats from analytics
    const itemStatsMap = new Map<string, ItemStats>();
    let standaloneDaysWithData = 0; // Track days when using standalone query path

    if (prefetchedAnalytics) {
        // OPTIMIZATION: Use pre-fetched analytics (avoids duplicate Firestore reads)
        // Build itemStatsMap from AggregatedAnalytics
        for (const [itemId, views] of Object.entries(prefetchedAnalytics.viewsByItem)) {
            itemStatsMap.set(itemId, {
                itemId,
                itemName: prefetchedAnalytics.itemNames[itemId] || itemId,
                category: '',
                views,
                clicks: prefetchedAnalytics.clicksByItem[itemId] || 0,
                orders: 0,
                price: 0
            });
        }
        // Add items with clicks but no views
        for (const [itemId, clicks] of Object.entries(prefetchedAnalytics.clicksByItem)) {
            if (!itemStatsMap.has(itemId)) {
                itemStatsMap.set(itemId, {
                    itemId,
                    itemName: prefetchedAnalytics.itemNames[itemId] || itemId,
                    category: '',
                    views: 0,
                    clicks,
                    orders: 0,
                    price: 0
                });
            }
        }
        // Apply 2x weight for recommendation clicks (high-value interactions)
        for (const [itemId, clicks] of Object.entries(prefetchedAnalytics.recommendationClicksByItem)) {
            const existing = itemStatsMap.get(itemId);
            if (existing) {
                existing.clicks += clicks * 2;
            }
        }
    } else {
        // Standalone mode (manual triggers): Query analytics directly
        const dateStr = addDaysToAnalyticsDateKey(getAnalyticsDateKey(new Date(), timeZone), -7);

        const analyticsQuery = await db.collection(DB_COLLECTIONS.ANALYTICS)
            .where('__name__', '>=', `${tId}_${sId}_${projectId}_daily_${dateStr}`)
            .where('__name__', '<=', `${tId}_${sId}_${projectId}_daily_9999`)
            .get();

        standaloneDaysWithData = analyticsQuery.size;

        for (const doc of analyticsQuery.docs) {
            const data = doc.data();

            if (data.viewsByItem) {
                for (const [itemId, views] of Object.entries(data.viewsByItem)) {
                    const existing = itemStatsMap.get(itemId) || {
                        itemId,
                        itemName: data.itemNames?.[itemId] || itemId,
                        category: '',
                        views: 0,
                        clicks: 0,
                        orders: 0,
                        price: 0
                    };
                    existing.views += (views as number);
                    itemStatsMap.set(itemId, existing);
                }
            }

            if (data.clicksByItem) {
                for (const [itemId, clicks] of Object.entries(data.clicksByItem)) {
                    const existing = itemStatsMap.get(itemId) || {
                        itemId,
                        itemName: data.itemNames?.[itemId] || itemId,
                        category: '',
                        views: 0,
                        clicks: 0,
                        orders: 0,
                        price: 0
                    };
                    existing.clicks += (clicks as number);
                    itemStatsMap.set(itemId, existing);
                }
            }

            if (data.recommendationClicksByItem) {
                for (const [itemId, clicks] of Object.entries(data.recommendationClicksByItem)) {
                    const existing = itemStatsMap.get(itemId);
                    if (existing) {
                        existing.clicks += (clicks as number) * 2;
                    }
                }
            }
        }
    }

    // Extract items from project files
    // IMPORTANT: Only check permanent state (active), NOT temporary state (available)
    // Availability is volatile - item available at 2 AM may be sold out at lunch
    // Runtime gate owns availability filtering, not the scheduler
    const files = projectData.files || [];
    for (const file of files) {
        const items = file.extractedData?.data?.items || [];
        for (const item of items) {
            // Only skip permanently disabled items (active=false)
            // DO NOT check 'available' - that's temporary state for runtime
            if (item.active === false) continue;

            const existing = itemStatsMap.get(item.id) || {
                itemId: item.id,
                itemName: '',
                category: item.category || '',
                views: 0,
                clicks: 0,
                orders: 0,
                price: 0,
                duration: 0,
                ownerBoost: 0,
                isBestSeller: false
            };

            // Get item name (first language)
            const nameObj = item.name || {};
            existing.itemName = Object.values(nameObj)[0] as string || item.id;
            existing.category = item.category || '';
            existing.price = parseFloat(item.price?.replace(/[^0-9.]/g, '') || '0');
            existing.duration = item.duration;
            existing.ownerBoost = item.ownerBoost;
            existing.isBestSeller = item.isBestSeller;

            // Add base view count for active items
            if (!itemStatsMap.has(item.id)) {
                existing.views = 1; // Minimum view count
            }

            itemStatsMap.set(item.id, existing);
        }
    }

    const items = Array.from(itemStatsMap.values()).filter(i => i.itemName);

    if (items.length === 0) {
        logger.info(`[${tId}_${sId}] No items found`);
        return null;
    }

    // Calculate maximums for normalization
    const maxViews = Math.max(...items.map(i => i.views), 1);
    const maxClicks = Math.max(...items.map(i => i.clicks), 1);
    const maxOrders = Math.max(...items.map(i => i.orders), 1);
    const maxPopularity = Math.max(...items.map(i => i.views + i.clicks * 2 + i.orders * 5), 1);
    const avgPrice = items.reduce((sum, i) => sum + (i.price || 0), 0) / items.length || 1;

    // Score items for each block type
    const popularScores = items.map(item => ({
        item,
        score: calculatePopularScore(item, maxViews, maxClicks, maxOrders)
    })).sort((a, b) => b.score - a.score);

    const quickPickScores = items.map(item => ({
        item,
        score: calculateQuickPickScore(item, businessCategory, maxPopularity)
    })).filter(i => i.score >= 0).sort((a, b) => b.score - a.score);

    const bestValueScores = items.map(item => ({
        item,
        score: calculateBestValueScore(item, maxPopularity, avgPrice)
    })).filter(i => i.score >= 0).sort((a, b) => b.score - a.score);

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
    const quickPick = businessCategory !== 'retail' ? getTopCandidates(quickPickScores, 'quickPick') : [];
    const bestValue = getTopCandidates(bestValueScores, 'bestValue');

    // Create decision blocks document with TTL
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
            itemsWithDuration: items.filter(i => i.duration !== undefined && i.duration > 0).length,
            // Hardening fields — used by runtime for lifecycle gating + block eligibility
            totalViews: items.reduce((sum, i) => sum + i.views, 0),
            totalClicks: items.reduce((sum, i) => sum + i.clicks, 0),
            itemsWithClicks: items.filter(i => i.clicks >= 3).length,
            itemsWithPrice: items.filter(i => i.price > 0).length,
            durationCoverage: items.length > 0 ? items.filter(i => i.duration !== undefined && i.duration > 0).length / items.length : 0,
            priceCoverage: items.length > 0 ? items.filter(i => i.price > 0).length / items.length : 0,
            daysWithData: prefetchedAnalytics?.daysWithData ?? standaloneDaysWithData,
        }
    };
}

/**
 * Unified nightly scheduler — runs every hour at :30 (timezone-aware)
 * 
 * ARCHITECTURE:
 * - Reads storesSummary (1 Firestore read)
 * - Filters stores by schedulerHour === currentUTCHour
 * - Only processes stores in their local "night window"
 * - Per-store tasks: DI scoring, menu intelligence
 * - Platform tasks: analytics, messaging, Canonica, infra compounding
 * - Persists run log + sends telegram alert
 * 
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */
export const computeDecisionBlocksScores = onSchedule({
    schedule: '30 * * * *', // Runs every hour at :30 (timezone-aware scheduling)
    timeZone: 'UTC',
    region: 'us-central1',
    timeoutSeconds: 540,
    secrets: [
        SECRETS.GEMINI_AI_KEY,
        SECRETS.GEMINI_AI_KEY_2,
        SECRETS.GEMINI_AI_KEY_3,
        SECRETS.GEMINI_AI_KEY_4,
        SECRETS.RAZORPAY_KEY_ID,
        SECRETS.RAZORPAY_KEY_SECRET,
        SECRETS.SENTRY_DSN,
    ],
}, async (event) => {
    initSentry();
    const logger = functions.logger;
    const currentUTCHour = new Date().getUTCHours();
    logger.info(`=== Nightly Scheduler (Hour ${currentUTCHour} UTC) ===`);
    logger.info('Triggered at:', new Date().toISOString());

    const db = firestoreAdmin;
    const runStartTime = Date.now();
    const taskResults: Array<{ name: string; status: 'success' | 'failed' | 'skipped'; durationMs?: number; details?: Record<string, any>; error?: string }> = [];
    const results = {
        totalStores: 0,
        totalProjects: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        intelligenceSuccess: 0,
        intelligenceFailed: 0,
        errors: [] as Array<{ tId: string; sId: string; projectId?: string; error: string }>
    };

    try {
        // COST OPTIMIZATION: Use storesSummary instead of fetching all store documents
        // This reduces N reads to 1 read. See: __docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        const storesSummary = storesSummaryDoc.exists ? storesSummaryDoc.data()?.stores || {} : {};
        const allStoreIds = Object.keys(storesSummary);

        // DST-SAFE TIMEZONE-AWARE SCHEDULING
        // Instead of comparing a stored static UTC hour (which drifts with DST),
        // we compute the LOCAL hour for each store at runtime using its IANA timeZone.
        // A store is processed when its local hour === TARGET_LOCAL_HOUR (2 = 2:30 AM local).
        // Fallback: stores without timeZone use stored schedulerHour (default 2 UTC).
        // @see __docs__/patterns/nightly-scheduler-architecture.md
        const TARGET_LOCAL_HOUR = 2; // 2:30 AM local time
        const DEFAULT_SCHEDULER_HOUR = 2; // UTC fallback for stores without timeZone
        const now = new Date();

        const storeIds = allStoreIds.filter(sId => {
            const storeInfo = storesSummary[sId];

            // Primary: runtime timezone computation (DST-safe)
            if (storeInfo.timeZone) {
                try {
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: storeInfo.timeZone,
                        hour: 'numeric',
                        hour12: false,
                    });
                    const parts = formatter.formatToParts(now);
                    const hourPart = parts.find(p => p.type === 'hour');
                    const localHour = hourPart ? parseInt(hourPart.value, 10) : -1;
                    return localHour === TARGET_LOCAL_HOUR;
                } catch {
                    // Invalid timezone — fall through to schedulerHour fallback
                }
            }

            // Fallback: stored schedulerHour (for stores without timeZone)
            const storeHour = storeInfo.schedulerHour ?? DEFAULT_SCHEDULER_HOUR;
            return storeHour === currentUTCHour;
        });

        results.totalStores = storeIds.length;

        if (storeIds.length === 0) {
            logger.info(`No stores scheduled for hour ${currentUTCHour} UTC (${allStoreIds.length} total stores). Exiting.`);
            // Persist minimal run log for audit trail (no telegram — would be 22 alerts/day noise)
            try {
                await db.collection(DB_COLLECTIONS.SCHEDULER_RUN_LOGS).add({
                    trigger: 'scheduled',
                    triggeredBy: 'system',
                    startedAt: Timestamp.fromMillis(runStartTime),
                    completedAt: Timestamp.now(),
                    durationMs: Date.now() - runStartTime,
                    status: 'skipped',
                    schedulerHour: currentUTCHour,
                    totalStoresInPlatform: allStoreIds.length,
                    totalStores: 0,
                    reason: 'no_stores_for_hour',
                });
            } catch { /* non-blocking */ }
            return;
        }

        logger.info(`Processing ${storeIds.length} of ${allStoreIds.length} stores (currentUTCHour=${currentUTCHour}, targetLocalHour=${TARGET_LOCAL_HOUR})`);

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
        const { aggregateCustomerAnalyticsForStoreDate } = await import('./aggregateCustomerAnalytics');
        const { aggregateOBPAnalyticsForStoreDate } = await import('./analytics/obpAnalyticsAggregation');
        const { resolveAnalyticsAiEntitlement } = await import('./analytics/analyticsAiEntitlements');

        // Infrastructure Compounding 10.3: Collect enrichment data during loop,
        // write once at end (replaces per-store writes — saves N-1 writes)
        const storeEnrichment: Record<string, { lastPublishedAt: any; projectCount: number }> = {};

        for (const sId of storeIds) {
            const storeInfo = storesSummary[sId];
            const tId = storeInfo.tId != null ? String(storeInfo.tId) : '';
            // Use businessCategory directly from storesSummary (derived at store creation/update)
            const businessCategory = storeInfo.businessCategory || 'specialty';

            // Skip inactive stores
            if (storeInfo.active === false) {
                logger.info(`Store ${sId}: Inactive, skipping`);
                results.skippedCount++;
                continue;
            }

            if (!tId) {
                logger.warn(`Store ${sId} has no tenantId, skipping`);
                results.skippedCount++;
                continue;
            }

            try {
                logger.info(`Processing store ${sId} (tenant ${tId})...`);

                const { projectEntries, activeProjectIds, source } = await loadActiveProjectsForScheduler(db, tId, sId);

                if (projectEntries.length === 0) {
                    logger.info(`  - Store ${sId}: No active projects found (${source}); analytics settlement still runs`);
                    results.skippedCount++;
                } else {
                    logger.info(`  Found ${projectEntries.length} active projects for store ${sId} (${source})`);
                }

                results.totalProjects += projectEntries.length;

                analyticsResults.storesAttempted++;
                try {
                    const settlementDates = await getPendingSettlementDates(db, tId, sId, analyticsRunAt, storeInfo.timeZone);
                    const knownAnalyticsProjectIds = Array.from(new Set([...activeProjectIds, 'customerApp']));

                    if (settlementDates.length === 0) {
                        logger.info(`  - Store ${sId}: Analytics already settled`);
                    }

                    for (const settlementDate of settlementDates) {
                        const lockRef = await acquireNightlyDateLock(db, tId, sId, settlementDate);
                        if (!lockRef) {
                            logger.info(`  - Store ${sId}: Settlement ${settlementDate} already locked or completed`);
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
                            );

                            analyticsResults.menuProjects += customerAggregation.totalProjects;
                            analyticsResults.menuErrors += customerAggregation.errors.length;
                            if (obpHadData) analyticsResults.obpStoresWithData++;

                            if (customerAggregation.errors.length > 0) {
                                logger.error(`  ✗ Store ${sId} analytics (${settlementDate}): ${customerAggregation.errors.length} project aggregation errors`);
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
                                },
                            });
                            await completeNightlyDateLock(lockRef, 'completed');
                        } catch (settlementError: any) {
                            const message = settlementError?.message || String(settlementError);
                            appLogger.error('[NightlyAnalytics] Store settlement failed', settlementError, {
                                tId,
                                sId,
                                settlementDate,
                                phase: 'analytics_settlement',
                            });
                            await updateNightlyState(db, tId, sId, settlementDate, 'failed', 'failed', message);
                            await completeNightlyDateLock(lockRef, 'failed', message);
                            throw settlementError;
                        }
                    }

                    analyticsResults.storesSucceeded++;
                } catch (analyticsError: any) {
                    analyticsResults.storesFailed++;
                    throw new Error(`Nightly analytics failed: ${analyticsError.message}`);
                }

                // Process EACH project
                for (const { projectId, data: projectData } of projectEntries) {
                    try {
                        // OPTIMIZATION: Fetch the scheduler-written 7-day
                        // intelligence snapshot once, reuse for both DI + CMI.
                        // Missing/stale snapshots are visible in ops and score
                        // as empty for the run instead of opening daily reads.
                        const analytics = await fetch7DayAnalytics(db, tId, sId, projectId, storeInfo.timeZone);
                        if (analytics.source === 'missing_or_stale') {
                            analyticsResults.intelligenceSnapshotMissing++;
                            appLogger.warn('[NightlyAnalytics] Missing or stale intelligence snapshot; scoring without analytics', {
                                tId,
                                sId,
                                projectId,
                                expectedLocalDate: addDaysToAnalyticsDateKey(getAnalyticsDateKey(analyticsRunAt, storeInfo.timeZone), -1),
                                lastSettledLocalDate: analytics.lastSettledLocalDate || null,
                            });
                        }

                        const blocks = await computeForProject(
                            db,
                            tId,
                            sId,
                            projectId,
                            projectData,
                            businessCategory,
                            analytics,
                            storeInfo.timeZone,
                        );

                        if (blocks) {
                            // Save to decisionBlocks collection with projectId in key
                            const docId = getDecisionBlocksDocId(tId, sId, projectId);
                            await db.collection(DB_COLLECTIONS.DECISION_BLOCKS).doc(docId).set(blocks, { merge: true });

                            logger.info(`    ✓ Project ${projectId}: Computed decision blocks`);
                            results.successCount++;

                            // Compute Menu Intelligence state (reuses same analytics)
                            try {
                                const items = extractActiveItems(projectData, analytics);

                                if (items.length > 0) {
                                    const currentIntelligence = await fetchCurrentIntelligence(
                                        db, tId, sId, projectId, DB_COLLECTIONS.MENU_INTELLIGENCE
                                    );
                                    // Set run context for enriched audit logs (Item 4)
                                    const runNumber = (currentIntelligence?.runCount || 0) + 1;
                                    setAuditLogRunContext(runNumber, 'nightly_job');

                                    const intelligence = computeIntelligenceState(
                                        items,
                                        analytics,
                                        currentIntelligence,
                                        { tId, sId, projectId }
                                    );

                                    const miDocId = getMenuIntelligenceDocId(tId, sId, projectId);
                                    await db.collection(DB_COLLECTIONS.MENU_INTELLIGENCE).doc(miDocId).set(intelligence, { merge: true });

                                    logger.info(`    ✓ Project ${projectId}: Computed menu intelligence`);
                                    results.intelligenceSuccess++;
                                }
                            } catch (intError: any) {
                                logger.error(`    ✗ Project ${projectId} intelligence: ${intError.message}`);
                                results.intelligenceFailed++;
                            }
                        } else {
                            logger.info(`    - Project ${projectId}: No items to score`);
                            results.skippedCount++;
                        }
                    } catch (error: any) {
                        logger.error(`    ✗ Project ${projectId}: ${error.message}`);
                        results.failedCount++;
                        results.errors.push({ tId, sId, projectId, error: error.message });
                    }
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
                    } catch {
                        // Non-blocking — enrichment failure should never block scoring
                    }
                }

            } catch (error: any) {
                logger.error(`  ✗ Store ${sId}: ${error.message}`);
                results.failedCount++;
                results.errors.push({ tId, sId, error: error.message });
            }
        }

        // Infrastructure Compounding 10.3: Single batch write for all store enrichment data
        // This replaces N per-store writes with 1 merge write — saves ~99 writes at 100 stores
        if (FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE && Object.keys(storeEnrichment).length > 0) {
            try {
                const enrichmentUpdate: Record<string, any> = {};
                for (const [enrichSId, enrichData] of Object.entries(storeEnrichment)) {
                    enrichmentUpdate[`stores.${enrichSId}.lastPublishedAt`] = enrichData.lastPublishedAt;
                    enrichmentUpdate[`stores.${enrichSId}.projectCount`] = enrichData.projectCount;
                }
                await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set(
                    enrichmentUpdate,
                    { merge: true }
                );
                logger.info(`[10.3] Enriched storesSummary with freshness data for ${Object.keys(storeEnrichment).length} stores (1 write)`);
            } catch (enrichError: any) {
                logger.warn('[10.3] storesSummary enrichment failed (non-blocking):', enrichError.message);
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
            status: results.intelligenceFailed > 0 ? (results.intelligenceSuccess > 0 ? 'success' : 'failed') : 'success',
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

        // Authority Maturation Analysis (Item 3: Expand Nightly Job Coverage)
        // Analyzes owner control usage patterns for Phase 1 → Phase 2 → Phase 3 progression
        try {
            const taskStart = Date.now();
            logger.info('=== Starting Authority Maturation Analysis ===');
            const maturationResult = await processAuthorityMaturationForAllStores();
            logger.info(`Authority Maturation: ${maturationResult.processed} stores analyzed`);
            logger.info(`  Phase 1 (Active): ${maturationResult.phase1Count}`);
            logger.info(`  Phase 2 (Passive): ${maturationResult.phase2Count}`);
            logger.info(`  Phase 3 (Dormant): ${maturationResult.phase3Count}`);
            taskResults.push({ name: 'authority_maturation', status: 'success', durationMs: Date.now() - taskStart, details: { processed: maturationResult.processed, phase1: maturationResult.phase1Count, phase2: maturationResult.phase2Count, phase3: maturationResult.phase3Count } });
        } catch (maturationError: any) {
            // Non-blocking - log but continue
            logger.error('Authority Maturation analysis failed:', maturationError.message);
            taskResults.push({ name: 'authority_maturation', status: 'failed', error: maturationError.message });
        }

        // MOL v0: Menu Drift Metrics (Category D & E of Internal Tracking System)
        // Computes 30-day rolling drift counters from menu change logs
        // @see __docs__/internal-tracking/MOL-V0-IMPLEMENTATION-PLAN.md
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
            taskResults.push({ name: 'menu_drift', status: driftResult.errors.length > 0 ? 'success' : 'success', durationMs: Date.now() - taskStart, details: { items: driftResult.itemsProcessed, stores: driftResult.storesProcessed, projects: driftResult.projectsProcessed, reads: driftResult.readsCount, writes: driftResult.writesCount, errors: driftResult.errors.length } });
        } catch (driftError: any) {
            // Non-blocking - log but continue
            logger.error('Menu Drift Metrics computation failed:', driftError.message);
            taskResults.push({ name: 'menu_drift', status: 'failed', error: driftError.message });
        }

        // Guest Feedback Retention (Internal Feedback System)
        // Deletes expired guest feedback documents (90-day retention)
        // @see __docs__/projects/internal-feedback-system/internal-feedback-system_spec.md
        if (FUNCTION_FLAGS.ENABLE_GUEST_FEEDBACK_RETENTION) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Guest Feedback Retention ===');
                const retentionResult = await processGuestFeedbackRetention();
                logger.info(`Guest Feedback Retention: ${retentionResult.deleted} documents deleted`);
                if (retentionResult.errors > 0) {
                    logger.warn(`  Errors: ${retentionResult.errors}`);
                }
                taskResults.push({ name: 'guest_feedback_retention', status: 'success', durationMs: Date.now() - taskStart, details: { deleted: retentionResult.deleted, errors: retentionResult.errors } });
            } catch (retentionError: any) {
                // Non-blocking - log but continue
                logger.error('Guest Feedback Retention failed:', retentionError.message);
                taskResults.push({ name: 'guest_feedback_retention', status: 'failed', error: retentionError.message });
            }
        } else {
            taskResults.push({ name: 'guest_feedback_retention', status: 'skipped' });
        }

        // Subscription Reconciliation (Razorpay ↔ Firestore sync)
        // Safety net for webhook failures — syncs status, cycle dates, paid count
        // @see __docs__/razorpay/ACTIVE_SUBSCRIPTION_FLOW.md
        if (FUNCTION_FLAGS.ENABLE_SUBSCRIPTION_RECONCILIATION) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Subscription Reconciliation ===');
                const reconcileResult = await reconcileSubscriptions();
                logger.info(`Subscription Reconciliation: ${reconcileResult.processed} checked, ${reconcileResult.synced} synced, ${reconcileResult.errors} errors (${reconcileResult.durationMs}ms)`);
                taskResults.push({ name: 'subscription_reconciliation', status: 'success', durationMs: Date.now() - taskStart, details: { processed: reconcileResult.processed, synced: reconcileResult.synced, errors: reconcileResult.errors } });
            } catch (reconcileError: any) {
                // Non-blocking - log but continue
                logger.error('Subscription Reconciliation failed:', reconcileError.message);
                taskResults.push({ name: 'subscription_reconciliation', status: 'failed', error: reconcileError.message });
            }
        } else {
            taskResults.push({ name: 'subscription_reconciliation', status: 'skipped' });
        }

        // Lifecycle Messaging — Renewal Reminders + Suspension Warnings
        // Scans subscriptions renewing in 3 days and past-due 7+ days
        // @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
        let messagingTasksOk = true;
        try {
            const taskStart = Date.now();
            logger.info('=== Starting Lifecycle Messaging Tasks ===');
            const { checkRenewalReminders, checkSuspensionWarnings, retryFailedMessages, getDailyMessageDigest } = await import('./messaging/messagingEngine');
            await checkRenewalReminders();
            await checkSuspensionWarnings();

            // Retry failed messages from last 24h (max 1 retry per message)
            // Industry best practice: transient SMTP failures should be retried
            let retryDetails = { retried: 0, succeeded: 0 };
            try {
                retryDetails = await retryFailedMessages();
                if (retryDetails.retried > 0) {
                    logger.info(`Message Retry: ${retryDetails.retried} retried, ${retryDetails.succeeded} succeeded`);
                }
            } catch { /* non-blocking */ }

            // Daily messaging digest — solo founder visibility
            let digestDetails = { sent: 0, failed: 0, total: 0 };
            try {
                digestDetails = await getDailyMessageDigest();
                if (digestDetails.total > 0) {
                    logger.info(`Messaging Digest: ${digestDetails.sent} sent, ${digestDetails.failed} failed, ${digestDetails.total} total`);
                }
            } catch { /* non-blocking */ }

            logger.info('Lifecycle Messaging tasks completed');
            taskResults.push({ name: 'lifecycle_messaging', status: 'success', durationMs: Date.now() - taskStart, details: { retry: retryDetails, digest: digestDetails } });
        } catch (msgError: any) {
            messagingTasksOk = false;
            // Non-blocking - log but continue
            logger.error('Lifecycle Messaging tasks failed:', msgError.message);
            taskResults.push({ name: 'lifecycle_messaging', status: 'failed', error: msgError.message });
        }

        // ═══════════════════════════════════════════════════════════════
        // SPECIAL MENU SWITCHING — Nightly Activation/Deactivation
        // Checks all stores for special menus that need to activate or expire.
        // @see __docs__/special-menu-switching/special-menu-switching_impl.md
        // ═══════════════════════════════════════════════════════════════
        if (FUNCTION_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Special Menu Switching Check ===');
                const smResult = { activated: 0, deactivated: 0, checked: 0, errors: 0 };
                const now = new Date();

                for (const sId of storeIds) {
                    const storeInfo = storesSummary[sId];
                    if (storeInfo.active === false) continue;

                    try {
                        // Read projectsSummary for this store
                        const summaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                            .doc(`projects_${sId}`).get();
                        if (!summaryDoc.exists) continue;

                        const projects = summaryDoc.data()?.projects || {};
                        const tId = storeInfo.tId != null ? String(storeInfo.tId) : '';

                        for (const [projectId, projData] of Object.entries(projects) as [string, any][]) {
                            if (!projData.isSpecialMenu) continue;
                            smResult.checked++;

                            const status = projData.specialMenuStatus;
                            const startsAt = projData.specialMenuStartsAt ? new Date(projData.specialMenuStartsAt) : null;
                            const endsAt = projData.specialMenuEndsAt ? new Date(projData.specialMenuEndsAt) : null;

                            // Activate: scheduled menu whose startsAt has passed
                            if (status === 'scheduled' && startsAt && startsAt <= now) {
                                try {
                                    const projectRef = db.collection(DB_COLLECTIONS.PROJECTS)
                                        .doc(tId).collection(sId).doc(projectId);
                                    await projectRef.update({
                                        '_specialMenu.status': 'active',
                                        '_specialMenu.activatedAt': now.toISOString(),
                                    });

                                    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(sId);
                                    const storeUpdate: Record<string, any> = {
                                        activeSpecialMenuId: projectId,
                                    };
                                    // Auto-set temp status banner
                                    if (FUNCTION_FLAGS.ENABLE_TEMP_STATUS) {
                                        storeUpdate.tempStatus = {
                                            type: 'special_menu',
                                            message: projData.specialMenuDisplayName || projData.name,
                                            expiresAt: projData.specialMenuEndsAt,
                                            createdAt: now.toISOString(),
                                        };
                                    }
                                    await storeRef.update(storeUpdate);

                                    // Update summary status
                                    await summaryDoc.ref.set({
                                        [`projects.${projectId}.specialMenuStatus`]: 'active',
                                    }, { merge: true });

                                    logger.info(`  ✓ Activated special menu "${projData.specialMenuDisplayName}" for store ${sId}`);
                                    smResult.activated++;
                                } catch (e: any) {
                                    logger.error(`  ✗ Failed to activate ${projectId}: ${e.message}`);
                                    smResult.errors++;
                                }
                            }

                            // Deactivate: active menu whose endsAt has passed
                            if (status === 'active' && endsAt && endsAt <= now) {
                                try {
                                    const projectRef = db.collection(DB_COLLECTIONS.PROJECTS)
                                        .doc(tId).collection(sId).doc(projectId);
                                    await projectRef.update({
                                        '_specialMenu.status': 'expired',
                                        '_specialMenu.deactivatedAt': now.toISOString(),
                                    });

                                    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(sId);
                                    const storeUpdate: Record<string, any> = {
                                        activeSpecialMenuId: FieldValue.delete(),
                                    };
                                    // Clear temp status if it was special_menu type
                                    const storeSnap = await storeRef.get();
                                    if (storeSnap.data()?.tempStatus?.type === 'special_menu') {
                                        storeUpdate.tempStatus = FieldValue.delete();
                                    }
                                    await storeRef.update(storeUpdate);

                                    // Update summary status
                                    await summaryDoc.ref.set({
                                        [`projects.${projectId}.specialMenuStatus`]: 'expired',
                                    }, { merge: true });

                                    logger.info(`  ✓ Deactivated special menu "${projData.specialMenuDisplayName}" for store ${sId}`);
                                    smResult.deactivated++;
                                } catch (e: any) {
                                    logger.error(`  ✗ Failed to deactivate ${projectId}: ${e.message}`);
                                    smResult.errors++;
                                }
                            }
                        }
                    } catch (e: any) {
                        logger.error(`  ✗ Special menu check for store ${sId} failed: ${e.message}`);
                        smResult.errors++;
                    }
                }

                logger.info(`Special Menu Switching: checked ${smResult.checked}, activated ${smResult.activated}, deactivated ${smResult.deactivated}, errors ${smResult.errors}`);
                taskResults.push({ name: 'special_menu_switching', status: 'success', durationMs: Date.now() - taskStart, details: smResult }); // Per-store errors tracked in details, not task-level failure
            } catch (smError: any) {
                logger.error('Special Menu Switching check failed:', smError.message);
                taskResults.push({ name: 'special_menu_switching', status: 'failed', error: smError.message });
            }
        } else {
            taskResults.push({ name: 'special_menu_switching', status: 'skipped' });
        }

        // ═══════════════════════════════════════════════════════════════
        // INFRASTRUCTURE COMPOUNDING — MenuList Truth Engine
        // 3 tasks that form a self-improving data quality loop.
        // Order matters: Learning → Truth Score → Staleness Check
        // @see __docs__/infrastructure-compounding/
        // ═══════════════════════════════════════════════════════════════

        // 10.2: Extraction Learning Loop — Aggregate owner corrections
        if (FUNCTION_FLAGS.ENABLE_EXTRACTION_LEARNING) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Extraction Learning Aggregation ===');
                const { processExtractionLearningForAllStores } = await import('./analytics/extractionLearning');
                const learningResult = await processExtractionLearningForAllStores();
                logger.info(`Extraction Learning: ${learningResult.totalCorrections} corrections aggregated from ${learningResult.storesWithCorrections} stores`);
                taskResults.push({ name: 'extraction_learning', status: 'success', durationMs: Date.now() - taskStart, details: { corrections: learningResult.totalCorrections, storesProcessed: learningResult.storesProcessed, storesWithCorrections: learningResult.storesWithCorrections, reads: learningResult.readsCount, writes: learningResult.writesCount } });
            } catch (learningError: any) {
                logger.error('Extraction Learning aggregation failed:', learningError.message);
                taskResults.push({ name: 'extraction_learning', status: 'failed', error: learningError.message });
            }
        } else {
            taskResults.push({ name: 'extraction_learning', status: 'skipped' });
        }

        // 10.3: Store Truth Confidence Score — Composite reliability per store
        if (FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Store Truth Confidence Computation ===');
                const { computeStoreTruthConfidenceForAllStores } = await import('./analytics/storeTruthConfidence');
                const truthResult = await computeStoreTruthConfidenceForAllStores();
                logger.info(`Store Truth Confidence: ${truthResult.processed} stores, avg score: ${truthResult.averageScore.toFixed(1)}, stale: ${truthResult.staleCount}`);
                taskResults.push({ name: 'store_truth_confidence', status: 'success', durationMs: Date.now() - taskStart, details: { processed: truthResult.processed, avgScore: truthResult.averageScore, staleCount: truthResult.staleCount, reads: truthResult.readsCount, writes: truthResult.writesCount } });
            } catch (truthError: any) {
                logger.error('Store Truth Confidence computation failed:', truthError.message);
                taskResults.push({ name: 'store_truth_confidence', status: 'failed', error: truthError.message });
            }
        } else {
            taskResults.push({ name: 'store_truth_confidence', status: 'skipped' });
        }

        // 10.4: Periodic Staleness Check — Detect stale stores for lifecycle messaging
        if (FUNCTION_FLAGS.ENABLE_STALENESS_CHECK) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Periodic Staleness Check ===');
                const { checkStalenessForAllStores } = await import('./analytics/stalenessCheck');
                const stalenessResult = await checkStalenessForAllStores();
                logger.info(`Staleness Check: ${stalenessResult.staleFound} stale, ${stalenessResult.newStalenessDetected} new detections, ${stalenessResult.skippedRecent} skipped (recent)`);
                taskResults.push({ name: 'staleness_check', status: 'success', durationMs: Date.now() - taskStart, details: { checked: stalenessResult.checked, staleFound: stalenessResult.staleFound, newDetections: stalenessResult.newStalenessDetected, skippedRecent: stalenessResult.skippedRecent, errors: stalenessResult.errors, reads: stalenessResult.readsCount, writes: stalenessResult.writesCount } });
            } catch (stalenessError: any) {
                logger.error('Staleness Check failed:', stalenessError.message);
                taskResults.push({ name: 'staleness_check', status: 'failed', error: stalenessError.message });
            }
        } else {
            taskResults.push({ name: 'staleness_check', status: 'skipped' });
        }

        // ═══════════════════════════════════════════════════════════════
        // RESELLER DASHBOARD — Manual License Expiry Check
        // Expires offline (billingMode:'manual') subscriptions past validUntil + 7-day grace.
        // @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §6
        // ═══════════════════════════════════════════════════════════════
        if (FUNCTION_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            try {
                const taskStart = Date.now();
                logger.info('=== Starting Reseller License Expiry Check ===');

                const gracePeriodDays = 7;
                const graceDate = new Date();
                graceDate.setDate(graceDate.getDate() - gracePeriodDays);

                const expiredSubs = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
                    .where('billingMode', '==', 'manual')
                    .where('status', '==', 'active')
                    .where('validUntil', '<=', Timestamp.fromDate(graceDate))
                    .get();

                let expiredCount = 0;
                for (const subDoc of expiredSubs.docs) {
                    try {
                        const subData = subDoc.data();
                        await subDoc.ref.update({
                            status: 'expired',
                            statuses: [
                                ...(subData.statuses || []),
                                {
                                    status: 'expired',
                                    timestamp: Timestamp.now(),
                                    amount: subData.amount || 0,
                                    currency: subData.currency || 'INR',
                                    remark: 'Manual license expired (auto-expiry after grace period)',
                                },
                            ],
                        });

                        // Decrement reseller's concurrent offline count
                        if (subData.resellerId) {
                            try {
                                const profileRef = db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(subData.resellerId);
                                await profileRef.update({
                                    currentActiveOfflineStores: FieldValue.increment(-1),
                                });
                            } catch { /* non-blocking */ }
                        }

                        expiredCount++;
                        logger.info(`  ✓ Expired manual subscription ${subDoc.id} (store ${subData.storeId})`);
                    } catch (e: any) {
                        logger.error(`  ✗ Failed to expire ${subDoc.id}: ${e.message}`);
                    }
                }

                logger.info(`Reseller License Expiry: ${expiredSubs.size} checked, ${expiredCount} expired`);
                taskResults.push({
                    name: 'reseller_license_expiry',
                    status: 'success',
                    durationMs: Date.now() - taskStart,
                    details: { checked: expiredSubs.size, expired: expiredCount },
                });
            } catch (resellerError: any) {
                logger.error('Reseller License Expiry check failed:', resellerError.message);
                taskResults.push({ name: 'reseller_license_expiry', status: 'failed', error: resellerError.message });
            }
        } else {
            taskResults.push({ name: 'reseller_license_expiry', status: 'skipped' });
        }

        // ═══════════════════════════════════════════════════════════════
        // AI INSIGHTS (Migrated from masterScheduler.ts)
        // Previously ran as separate CF at 2:00 AM UTC.
        // Now unified here to save 1 cold start + consistent run logging.
        // ═══════════════════════════════════════════════════════════════

        // Feedback Intelligence — AI analysis of owner feedback patterns
        try {
            const taskStart = Date.now();
            logger.info('=== Starting Feedback Intelligence ===');
            const { processFeedbackIntelligenceForAllStores } = await import('./analytics/feedbackIntelligence');
            await processFeedbackIntelligenceForAllStores();
            logger.info('Feedback Intelligence completed');
            taskResults.push({ name: 'feedback_intelligence', status: 'success', durationMs: Date.now() - taskStart });
        } catch (fiError: any) {
            logger.error('Feedback Intelligence failed:', fiError.message);
            taskResults.push({ name: 'feedback_intelligence', status: 'failed', error: fiError.message });
        }

        // KB Quality Analysis — Score article quality across all stores
        try {
            const taskStart = Date.now();
            logger.info('=== Starting KB Quality Analysis ===');
            const { processKBQualityForAllStores } = await import('./analytics/kbQuality');
            await processKBQualityForAllStores();
            logger.info('KB Quality Analysis completed');
            taskResults.push({ name: 'kb_quality', status: 'success', durationMs: Date.now() - taskStart });
        } catch (kbError: any) {
            logger.error('KB Quality Analysis failed:', kbError.message);
            taskResults.push({ name: 'kb_quality', status: 'failed', error: kbError.message });
        }

        // Weekly Narrative — AI digest (Sundays only)
        try {
            const today = new Date();
            if (today.getDay() === 0) { // Sunday
                const taskStart = Date.now();
                logger.info('=== Starting Weekly Narrative Generation ===');
                const { processWeeklyNarrativeForAllStores } = await import('./analytics/weeklyNarrative');
                await processWeeklyNarrativeForAllStores();
                logger.info('Weekly Narrative completed');
                taskResults.push({ name: 'weekly_narrative', status: 'success', durationMs: Date.now() - taskStart });
            } else {
                taskResults.push({ name: 'weekly_narrative', status: 'skipped', details: { reason: 'not_sunday' } });
            }
        } catch (wnError: any) {
            logger.error('Weekly Narrative failed:', wnError.message);
            taskResults.push({ name: 'weekly_narrative', status: 'failed', error: wnError.message });
        }

        // Health Signals — Trust/Loyalty/Risk computation (Sundays only)
        try {
            const today = new Date();
            if (today.getDay() === 0) { // Sunday
                const taskStart = Date.now();
                logger.info('=== Starting Health Signals Computation ===');
                const { processHealthSignalsForAllStores } = await import('./analytics/healthSignalsComputation');
                await processHealthSignalsForAllStores();
                logger.info('Health Signals completed');
                taskResults.push({ name: 'health_signals', status: 'success', durationMs: Date.now() - taskStart });
            } else {
                taskResults.push({ name: 'health_signals', status: 'skipped', details: { reason: 'not_sunday' } });
            }
        } catch (hsError: any) {
            logger.error('Health Signals failed:', hsError.message);
            taskResults.push({ name: 'health_signals', status: 'failed', error: hsError.message });
        }

        // ═══════════════════════════════════════════════════════════════
        // KB GENERATION — Job Timeout Watchdog
        // Auto-fails jobs stuck in 'processing' for >30 minutes.
        // Prevents orphaned jobs that never complete.
        // ═══════════════════════════════════════════════════════════════
        try {
            const taskStart = Date.now();
            const thirtyMinAgo = Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
            const stuckJobsSnap = await db
                .collection(DB_COLLECTIONS.KB_GENERATION_JOBS)
                .where('status', '==', 'processing')
                .where('modifiedOn', '<', thirtyMinAgo)
                .limit(10)
                .get();

            let timedOutCount = 0;
            for (const jobDoc of stuckJobsSnap.docs) {
                try {
                    await jobDoc.ref.update({
                        status: 'failed',
                        errorMessage: 'Job timed out — stuck in processing for >30 minutes. You can retry this job.',
                        modifiedOn: Timestamp.now(),
                    });
                    timedOutCount++;
                } catch { /* non-blocking */ }
            }

            if (timedOutCount > 0) {
                logger.info(`[KB Gen Watchdog] Timed out ${timedOutCount} stuck processing job(s).`);
            }
            taskResults.push({
                name: 'kb_generation_watchdog',
                status: 'success',
                durationMs: Date.now() - taskStart,
                details: { timedOut: timedOutCount },
            });
        } catch (watchdogError: any) {
            logger.error('KB Gen watchdog failed:', watchdogError.message);
            taskResults.push({ name: 'kb_generation_watchdog', status: 'failed', error: watchdogError.message });
        }

        // ═══════════════════════════════════════════════════════════════
        // CANONICA — MOVED TO SEPARATE FIREBASE PROJECT
        // Canonica nightly now runs independently in functions-canonica/
        // @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
        // @see __docs__/canonica/doctrine/08-product-separation-playbook.md
        // ═══════════════════════════════════════════════════════════════

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
            logger.error('[Scheduler] Failed to persist run log:', logError);
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
            });
        } catch { /* non-blocking — if this fails, UptimeRobot is the backstop */ }

    } catch (error: any) {
        logger.error('Fatal error in decision blocks scoring:', error);
        throw error;
    } finally {
        await flushSentry();
    }
});

/**
 * Manual trigger for testing/backfill (callable function)
 * 
 * Supports:
 * - { tId, sId, projectId } - Process single project
 * - { tId, sId } - Process all projects in a store
 * - {} - Process all projects in all stores
 */
export const triggerDecisionBlocksScoring = onCall({
    region: 'us-central1',
    timeoutSeconds: 540,
    secrets: [
        SECRETS.GEMINI_AI_KEY,
        SECRETS.GEMINI_AI_KEY_2,
        SECRETS.GEMINI_AI_KEY_3,
        SECRETS.GEMINI_AI_KEY_4,
        SECRETS.RAZORPAY_KEY_ID,
        SECRETS.RAZORPAY_KEY_SECRET,
        SECRETS.SENTRY_DSN,
    ],
}, async (request) => {
    initSentry();
    const logger = functions.logger;

    // Optional: restrict to admin users
    // if (!request.auth?.token?.admin) {
    //     throw new HttpsError('permission-denied', 'Admin access required');
    // }

    const { tId, sId, projectId } = request.data || {};
    const db = firestoreAdmin;

    // Case 1: Process single project
    if (tId && sId && projectId) {
        logger.info(`Manual trigger for project ${projectId} (store ${sId}, tenant ${tId})`);

        const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(sId).get();
        if (!storeDoc.exists) {
            throw new HttpsError('not-found', `Store ${sId} not found`);
        }

        const projectDoc = await db.collection(DB_COLLECTIONS.PROJECTS).doc(projectId).get();
        if (!projectDoc.exists) {
            throw new HttpsError('not-found', `Project ${projectId} not found`);
        }

        const storeData = storeDoc.data();
        const projectData = projectDoc.data()!;

        const blocks = await computeForProject(
            db,
            tId,
            sId,
            projectId,
            projectData,
            storeData?.businessType,
            undefined,
            storeData?.timeZone,
        );

        if (blocks) {
            const docId = getDecisionBlocksDocId(tId, sId, projectId);
            await db.collection(DB_COLLECTIONS.DECISION_BLOCKS).doc(docId).set(blocks, { merge: true });
            return { success: true, docId, blocks };
        }

        return { success: false, message: 'No items to score' };
    }

    // Case 2: Process all projects in a single store
    if (tId && sId) {
        logger.info(`Manual trigger for all projects in store ${sId} (tenant ${tId})`);

        const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(sId).get();
        if (!storeDoc.exists) {
            throw new HttpsError('not-found', `Store ${sId} not found`);
        }

        const storeData = storeDoc.data();

        // Fetch ALL projects for this store
        // Note: Projects use tId/sId field names, not tenantId/storeId
        const projectsQuery = await db.collection(DB_COLLECTIONS.PROJECTS)
            .where('tId', '==', parseInt(tId))
            .where('sId', '==', parseInt(sId))
            .get();

        if (projectsQuery.empty) {
            return { success: false, message: 'No projects found for this store' };
        }

        let successCount = 0;
        let failedCount = 0;
        const results: Array<{ projectId: string; docId: string }> = [];

        for (const projectDoc of projectsQuery.docs) {
            const projectData = projectDoc.data();
            const pId = projectData.projectId || projectDoc.id;

            // Skip inactive or deleted projects
            if (projectData.deleted === true || projectData.active === false) continue;

            try {
                const blocks = await computeForProject(
                    db,
                    tId,
                    sId,
                    pId,
                    projectData,
                    storeData?.businessType,
                    undefined,
                    storeData?.timeZone,
                );

                if (blocks) {
                    const docId = getDecisionBlocksDocId(tId, sId, pId);
                    await db.collection(DB_COLLECTIONS.DECISION_BLOCKS).doc(docId).set(blocks, { merge: true });
                    results.push({ projectId: pId, docId });
                    successCount++;
                }
            } catch (error) {
                failedCount++;
            }
        }

        return { success: true, successCount, failedCount, total: projectsQuery.size, results };
    }

    // Case 3: Process all projects in all stores (same as scheduler)
    logger.info('Manual trigger for all stores and projects');

    const storesSnapshot = await db.collection(DB_COLLECTIONS.STORES).get();
    let successCount = 0;
    let failedCount = 0;
    let totalProjects = 0;

    for (const storeDoc of storesSnapshot.docs) {
        const storeData = storeDoc.data();
        const storeSId = storeDoc.id;
        const storeTId = String(storeData.tenantId || storeData.tId);

        if (!storeTId) continue;

        // Fetch ALL projects for this store
        // Note: Projects use tId/sId field names, not tenantId/storeId
        const projectsQuery = await db.collection(DB_COLLECTIONS.PROJECTS)
            .where('tId', '==', parseInt(storeTId))
            .where('sId', '==', parseInt(storeSId))
            .get();

        totalProjects += projectsQuery.size;

        for (const projectDoc of projectsQuery.docs) {
            const projectData = projectDoc.data();
            const pId = projectData.projectId || projectDoc.id;

            // Skip inactive or deleted projects
            if (projectData.deleted === true || projectData.active === false) continue;

            try {
                const blocks = await computeForProject(
                    db,
                    storeTId,
                    storeSId,
                    pId,
                    projectData,
                    storeData.businessType,
                    undefined,
                    storeData.timeZone,
                );

                if (blocks) {
                    const docId = getDecisionBlocksDocId(storeTId, storeSId, pId);
                    await db.collection(DB_COLLECTIONS.DECISION_BLOCKS).doc(docId).set(blocks, { merge: true });
                    successCount++;
                }
            } catch (error) {
                failedCount++;
            }
        }
    }

    return {
        success: true,
        successCount,
        failedCount,
        totalStores: storesSnapshot.size,
        totalProjects
    };
});

/**
 * Answerlattice — Predictive Support Engine (Expansion Item #12)
 * 
 * Rule-based evaluation engine that determines if proactive help
 * should be shown to a user based on their current product context.
 * 
 * Pipeline:
 * 1. Load trigger rules from platformSummary (1 Firestore read, cached)
 * 2. Filter by page match
 * 3. Evaluate conditions against context (AND logic)
 * 4. Check cooldown via Upstash Redis
 * 5. Resolve from summary-backed suggestion, with canonical-answer fallback only for stale summaries
 * 6. Return suggestion payload
 * 
 * Design constraints:
 * - Deterministic (no ML, no probabilistic logic)
 * - No durable customer session state
 * - Bounded workspace summary reads and deterministic evaluation
 * - Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/answerlattice/predictive-support/predictive-support_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import {
    doesAnswerlatticePredictiveTriggerMatchContext,
    isAnswerlatticePredictiveTriggerWithinWindow,
    normalizeAnswerlatticePredictiveCondition,
    normalizeAnswerlatticePredictiveSuggestion,
} from '@lib/answerlattice/predictiveSupportContracts';
import { parseAnswerlatticePredictiveTriggerIndex } from '@lib/answerlattice/runtimeSummaryContracts';
import { parseAnswerlatticeRetrievalCanonicalAnswer } from '@lib/answerlattice/retrievalContracts';
import { PRODUCT_IDS } from '@constant/product';
import type {
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeContextPayload,
    AnswerlatticePredictiveSuggestion,
    AnswerlatticePredictiveTrigger,
    AnswerlatticePredictiveTriggerIndex,
    AnswerlatticeProcedure,
} from '@type/answerlattice';

// ═══════════════════════════════════════════════════════════════
// TRIGGER INDEX LOADING (platformSummary — 1 read)
// ═══════════════════════════════════════════════════════════════

const PLATFORM_SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;
const getAnswerlatticeAdminDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
};
const TRIGGER_INDEX_CACHE_TTL_MS = 60_000;
const EMPTY_TRIGGER_INDEX_CACHE_TTL_MS = 5 * 60_000;
const triggerIndexCache = new Map<string, {
    expiresAt: number;
    value: AnswerlatticePredictiveTriggerIndex | null;
}>();

const isTriggerWithinActiveWindow = (trigger: AnswerlatticePredictiveTrigger, now = Date.now()) => {
    if (trigger.kind !== 'known_issue') return true;
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWN_ISSUES) return false;
    return isAnswerlatticePredictiveTriggerWithinWindow(trigger, now);
};

/**
 * Load the cached trigger index for a tenant.
 * Single Firestore read. Returns null if not available.
 * 
 * Doc path: platformSummary/predictiveTriggers_{tId}_{sId}
 */
export async function loadTriggerIndex(
    tId: number,
    sId: number
): Promise<AnswerlatticePredictiveTriggerIndex | null> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) return null;
    if (
        !Number.isSafeInteger(tId)
        || tId <= 0
        || !Number.isSafeInteger(sId)
        || sId <= 0
    ) return null;

    const cacheKey = `${tId}:${sId}`;
    const cached = triggerIndexCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }
    if (cached) {
        triggerIndexCache.delete(cacheKey);
    }

    try {
        const snap = await getAnswerlatticeAdminDb()
            .collection(PLATFORM_SUMMARY_COLLECTION)
            .doc(`predictiveTriggers_${tId}_${sId}`)
            .get();
        const value = snap.exists
            ? parseAnswerlatticePredictiveTriggerIndex(snap.data(), { tId, sId })
            : null;
        const hasActiveTriggers = Number(value?.activeTriggerCount || 0) > 0
            || (value?.activeTriggerCount === undefined
                && value?.triggers
                && Object.values(value.triggers).some((trigger: any) => trigger?.status === 'active'));
        triggerIndexCache.set(cacheKey, {
            expiresAt: Date.now() + (hasActiveTriggers ? TRIGGER_INDEX_CACHE_TTL_MS : EMPTY_TRIGGER_INDEX_CACHE_TTL_MS),
            value,
        });
        return value;
    } catch {
        return null;
    }
}

async function getActiveAnswersForEntityServer(
    tId: number,
    sId: number,
    entityId: string,
): Promise<AnswerlatticeCanonicalAnswer[]> {
    const snapshot = await getAnswerlatticeAdminDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('scope.entityIds', 'array-contains', entityId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

    return snapshot.docs.flatMap((doc) => {
        try {
            return [parseAnswerlatticeRetrievalCanonicalAnswer({ ...doc.data(), id: doc.id }, { tId, sId })];
        } catch {
            return [];
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// CONDITION EVALUATION (deterministic, AND logic)
// ═══════════════════════════════════════════════════════════════

/**
 * Filter triggers that match the given page context.
 * A trigger matches if its page condition is undefined (wildcard)
 * or exactly matches the context page.
 */
function filterByPage(
    triggers: Record<string, AnswerlatticePredictiveTrigger>,
    page: string | undefined
): AnswerlatticePredictiveTrigger[] {
    const normalizedPage = normalizeAnswerlatticePredictiveCondition(page);
    if (!normalizedPage) return [];

    return Object.values(triggers).filter(t => {
        const triggerPage = normalizeAnswerlatticePredictiveCondition(t.conditions.page);
        if (!triggerPage) return false;
        return triggerPage === normalizedPage;
    });
}

// ═══════════════════════════════════════════════════════════════
// COOLDOWN (Upstash Redis)
// ═══════════════════════════════════════════════════════════════

const COOLDOWN_PREFIX = 'canon:ps:';
const isRedisConfigured = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

/**
 * Check if a trigger is on cooldown for a user.
 * Returns true if on cooldown (skip trigger), false if eligible.
 * Fail-closed: returns true (skip trigger) if Redis unavailable.
 */
async function checkCooldown(userId: string, triggerId: string, failClosed = true): Promise<boolean> {
    if (!isRedisConfigured()) {
        return failClosed;
    }

    try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || '',
            token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
        });
        const key = `${COOLDOWN_PREFIX}${userId}:${triggerId}`;
        const exists = await redis.exists(key);
        return exists === 1;
    } catch {
        // Fail closed to avoid repeated proactive prompts when cooldown storage is unavailable.
        return failClosed;
    }
}

/**
 * Set cooldown for a user+trigger combination.
 * Uses Redis TTL for automatic expiry — no cleanup needed.
 */
async function setCooldown(userId: string, triggerId: string, cooldownHours: number): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || '',
            token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
        });
        const key = `${COOLDOWN_PREFIX}${userId}:${triggerId}`;
        await redis.set(key, '1', { ex: cooldownHours * 3600 });
    } catch {
        // Fire-and-forget — cooldown failure never blocks suggestion
    }
}

// ═══════════════════════════════════════════════════════════════
// SUGGESTION RESOLUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve content for a trigger into a suggestion payload.
 * Fetches canonical answer if entityId is specified.
 * Returns null if content cannot be resolved.
 */
async function resolveSuggestion(
    trigger: AnswerlatticePredictiveTrigger,
    tId: number,
    sId: number
): Promise<AnswerlatticePredictiveSuggestion | null> {
    if (trigger.resolvedSuggestion?.title) {
        return normalizeAnswerlatticePredictiveSuggestion({
            triggerId: trigger.id,
            type: trigger.action.type,
            title: trigger.action.customTitle || trigger.resolvedSuggestion.title,
            summary: trigger.action.customSummary || trigger.resolvedSuggestion.summary || '',
            articles: trigger.resolvedSuggestion.articles,
            procedure: trigger.action.type === 'workflow_guide' ? trigger.resolvedSuggestion.procedure : undefined,
            ...(trigger.kind === 'known_issue' ? {
                knownIssue: {
                    severity: trigger.knownIssue?.severity || 'info',
                    ...(trigger.knownIssue?.statusPageUrl ? { statusPageUrl: trigger.knownIssue.statusPageUrl } : {}),
                },
            } : {}),
        });
    }

    let title = trigger.action.customTitle || trigger.name;
    let summary = trigger.action.customSummary || '';
    let procedure: AnswerlatticeProcedure | undefined;
    const articles: Array<{ id: string; title: string }> = [];

    // Resolve from entity → canonical answer
    if (trigger.action.entityId) {
        try {
            const answers = await getActiveAnswersForEntityServer(tId, sId, trigger.action.entityId);
            if (answers && answers.length > 0) {
                const best = answers[0];
                title = trigger.action.customTitle || best.title;
                summary = trigger.action.customSummary || best.content.structuredSummary;
                procedure = best.content.procedure;
                articles.push({ id: best.id, title: best.title });
            }
        } catch {
            // Answer resolution failure — continue with trigger defaults
        }
    }

    // Direct article link
    if (trigger.action.articleId) {
        articles.push({ id: trigger.action.articleId, title });
    }

    if (!title) return null;

    return normalizeAnswerlatticePredictiveSuggestion({
        triggerId: trigger.id,
        type: trigger.action.type,
        title,
        summary,
        articles: articles.length > 0 ? articles : undefined,
        procedure: trigger.action.type === 'workflow_guide' ? procedure : undefined,
        ...(trigger.kind === 'known_issue' ? {
            knownIssue: {
                severity: trigger.knownIssue?.severity || 'info',
                ...(trigger.knownIssue?.statusPageUrl ? { statusPageUrl: trigger.knownIssue.statusPageUrl } : {}),
            },
        } : {}),
    });
}

// ═══════════════════════════════════════════════════════════════
// MAIN EVALUATION PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate trigger rules against user context and return a proactive suggestion.
 * 
 * Returns null if:
 * - Feature flag is OFF
 * - No trigger index exists for this tenant
 * - No triggers match the context
 * - All matching triggers are on cooldown
 * - Content resolution fails for all matches
 * 
 * Called by: POST /api/answerlattice/predictive-help
 */
export async function evaluateTriggers(
    context: AnswerlatticeContextPayload,
    tId: number,
    sId: number,
    userId: string
): Promise<AnswerlatticePredictiveSuggestion | null> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) return null;

    try {
        // 1. Load trigger rules (platformSummary doc — 1 read)
        const triggerIndex = await loadTriggerIndex(tId, sId);
        if (!triggerIndex || triggerIndex.triggerCount === 0) return null;

        // 2. Filter triggers by page match
        const pageTriggers = filterByPage(triggerIndex.triggers, context.page);
        if (pageTriggers.length === 0) return null;

        // 3. Evaluate conditions + filter active only + sort by priority
        const matchedTriggers = pageTriggers
            .filter(t => t.status === 'active')
            .filter(t => isTriggerWithinActiveWindow(t))
            .filter(t => doesAnswerlatticePredictiveTriggerMatchContext(t, context))
            .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

        if (matchedTriggers.length === 0) return null;

        // 4. Check cooldown and resolve content for first eligible trigger
        for (const trigger of matchedTriggers) {
            const onCooldown = await checkCooldown(userId, trigger.id, trigger.kind !== 'known_issue');
            if (onCooldown) continue;

            // 5. Resolve content
            const suggestion = await resolveSuggestion(trigger, tId, sId);
            if (!suggestion) continue;

            // 6. Set cooldown (fire-and-forget)
            setCooldown(userId, trigger.id, trigger.cooldownHours);

            return suggestion;
        }

        return null; // All triggers on cooldown
    } catch {
        // Graceful degradation — predictive help failure never blocks product
        return null;
    }
}

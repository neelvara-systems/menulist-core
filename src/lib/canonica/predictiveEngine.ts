/**
 * Canonica — Predictive Support Engine (Expansion Item #12)
 * 
 * Rule-based evaluation engine that determines if proactive help
 * should be shown to a user based on their current product context.
 * 
 * Pipeline:
 * 1. Load trigger rules from platformSummary (1 Firestore read, cached)
 * 2. Filter by page match
 * 3. Evaluate conditions against context (AND logic)
 * 4. Check cooldown via Upstash Redis
 * 5. Resolve canonical answer / article content
 * 6. Return suggestion payload
 * 
 * Design constraints:
 * - Deterministic (no ML, no probabilistic logic)
 * - Stateless (no session memory)
 * - <50ms evaluation target
 * - Feature-flagged: ENABLE_CANONICA_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/canonica/predictive-support/predictive-support_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { getActiveAnswersForEntity } from '@database/canonica/canonicalAnswers';
import { doc, getDoc } from '@firebase/firestore';
import { canonicaFirebaseClient } from '@lib/firebase/canonicaFirebaseClient';
import type {
    CanonicaContextPayload,
    CanonicaPredictiveSuggestion,
    CanonicaPredictiveTrigger,
    CanonicaPredictiveTriggerIndex,
    CanonicaProcedure,
} from '@type/canonica';

// ═══════════════════════════════════════════════════════════════
// TRIGGER INDEX LOADING (platformSummary — 1 read)
// ═══════════════════════════════════════════════════════════════

const PLATFORM_SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

/**
 * Load the cached trigger index for a tenant.
 * Single Firestore read. Returns null if not available.
 * 
 * Doc path: platformSummary/predictiveTriggers_{tId}_{sId}
 */
export async function loadTriggerIndex(
    tId: number,
    sId: number
): Promise<CanonicaPredictiveTriggerIndex | null> {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) return null;

    try {
        const docRef = doc(
            canonicaFirebaseClient,
            PLATFORM_SUMMARY_COLLECTION,
            `predictiveTriggers_${tId}_${sId}`
        );
        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;
        return snap.data() as CanonicaPredictiveTriggerIndex;
    } catch {
        return null;
    }
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
    triggers: Record<string, CanonicaPredictiveTrigger>,
    page: string | undefined
): CanonicaPredictiveTrigger[] {
    if (!page) return [];

    return Object.values(triggers).filter(t => {
        if (!t.conditions.page) return false;
        return t.conditions.page === page;
    });
}

/**
 * Evaluate ALL conditions of a trigger against context.
 * Uses AND logic — all specified conditions must match.
 * Unspecified conditions in the trigger are treated as wildcards (always pass).
 */
function evaluateConditions(
    conditions: CanonicaPredictiveTrigger['conditions'],
    context: CanonicaContextPayload
): boolean {
    if (conditions.feature && context.feature !== conditions.feature) return false;
    if (conditions.workflow && context.workflow !== conditions.workflow) return false;
    if (conditions.plan && context.plan !== conditions.plan) return false;
    if (conditions.userRole && context.userRole !== conditions.userRole) return false;
    return true;
}

// ═══════════════════════════════════════════════════════════════
// COOLDOWN (Upstash Redis)
// ═══════════════════════════════════════════════════════════════

const COOLDOWN_PREFIX = 'canon:ps:';

/**
 * Check if a trigger is on cooldown for a user.
 * Returns true if on cooldown (skip trigger), false if eligible.
 * Graceful degradation: returns false (allow) if Redis unavailable.
 */
async function checkCooldown(userId: string, triggerId: string): Promise<boolean> {
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
        // Graceful degradation — if Redis unavailable, allow trigger
        return false;
    }
}

/**
 * Set cooldown for a user+trigger combination.
 * Uses Redis TTL for automatic expiry — no cleanup needed.
 */
async function setCooldown(userId: string, triggerId: string, cooldownHours: number): Promise<void> {
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
    trigger: CanonicaPredictiveTrigger,
    tId: number,
    sId: number
): Promise<CanonicaPredictiveSuggestion | null> {
    let title = trigger.action.customTitle || trigger.name;
    let summary = trigger.action.customSummary || '';
    let procedure: CanonicaProcedure | undefined;
    const articles: Array<{ id: string; title: string }> = [];

    // Resolve from entity → canonical answer
    if (trigger.action.entityId) {
        try {
            const answers = await getActiveAnswersForEntity(tId, sId, trigger.action.entityId);
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

    return {
        triggerId: trigger.id,
        type: trigger.action.type,
        title,
        summary,
        articles: articles.length > 0 ? articles : undefined,
        procedure: trigger.action.type === 'workflow_guide' ? procedure : undefined,
    };
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
 * Called by: POST /api/canonica/predictive-help
 */
export async function evaluateTriggers(
    context: CanonicaContextPayload,
    tId: number,
    sId: number,
    userId: string
): Promise<CanonicaPredictiveSuggestion | null> {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) return null;

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
            .filter(t => evaluateConditions(t.conditions, context))
            .sort((a, b) => b.priority - a.priority);

        if (matchedTriggers.length === 0) return null;

        // 4. Check cooldown and resolve content for first eligible trigger
        for (const trigger of matchedTriggers) {
            const onCooldown = await checkCooldown(userId, trigger.id);
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

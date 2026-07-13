/**
 * Answerlattice — Instant Response Cache (Upstash Redis)
 * 
 * Caches resolved canonical answers in Upstash Redis for sub-10ms responses.
 * Only deterministic canonical answers are cached (not RAG responses).
 * 
 * Cache key: canon:v2:{tId}:{sId}:e:{entityId}:v{version}:p:{plan}:r:{role}:s:{state}
 * Invalidation: Version-based (automatic). TTL: 24 hours.
 * 
 * Reuses existing Upstash instance (same as rate limiting in src/lib/rateLimit.ts).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_INSTANT_CACHE
 * @see __docs__/answerlattice/instant-response-infrastructure/
 */

import { Redis } from '@upstash/redis';
import { FEATURE_FLAGS } from '@config/features';
import { AnswerlatticeCanonicalAnswer } from '@type/answerlattice';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { isCachedCanonicalAnswerFresh } from './cacheFreshness';
import { CachedCanonicalAnswer, INSTANT_CACHE_DEFAULTS } from './instantCache.types';
import type { AnswerlatticeCacheSourceVersions } from './cacheVersionManifest';

const hasRedisConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN,
);

// Reuse existing Upstash connection pattern from rateLimit.ts. Missing Redis
// env must degrade to the live retrieval pipeline, never crash module import.
const redis = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE && hasRedisConfig
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

const getInstantCacheLogContext = (params: {
    answerId?: unknown;
    answerVersion?: unknown;
    matchedEntityCount?: number;
    planId?: unknown;
    roleId?: unknown;
    stateId?: unknown;
    sId?: unknown;
    tId?: unknown;
    topEntityId?: unknown;
}) => ({
    ...getBoundedRuntimeStringContext('answerId', params.answerId),
    ...getBoundedRuntimeStringContext('answerVersion', params.answerVersion),
    ...getBoundedRuntimeStringContext('planId', params.planId),
    ...getBoundedRuntimeStringContext('roleId', params.roleId),
    ...getBoundedRuntimeStringContext('stateId', params.stateId),
    ...getBoundedRuntimeStringContext('storeId', params.sId),
    ...getBoundedRuntimeStringContext('tenantId', params.tId),
    ...getBoundedRuntimeStringContext('topEntityId', params.topEntityId),
    matchedEntityCount: params.matchedEntityCount,
});

// ═══════════════════════════════════════════════════════════
// CACHE KEY GENERATION
// ═══════════════════════════════════════════════════════════

export function buildCacheKey(
    tId: number,
    sId: number,
    topEntityId: string,
    answerVersion: number,
    planId?: string,
    roleId?: string,
    stateId?: string,
): string {
    const plan = planId || '_';
    const role = roleId || '_';
    const state = stateId || '_';
    return `canon:v2:${tId}:${sId}:e:${topEntityId}:v${answerVersion}:p:${plan}:r:${role}:s:${state}`;
}

// ═══════════════════════════════════════════════════════════
// CACHE READ
// ═══════════════════════════════════════════════════════════

export async function instantCacheLookup(
    tId: number,
    sId: number,
    topEntityId: string,
    answerVersion: number,
    planId?: string,
    roleId?: string,
    stateId?: string,
    currentSourceVersions?: AnswerlatticeCacheSourceVersions,
): Promise<CachedCanonicalAnswer | null> {
    if (!redis || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE) return null;

    try {
        const key = buildCacheKey(tId, sId, topEntityId, answerVersion, planId, roleId, stateId);
        
        // Race against timeout
        const result = await Promise.race([
            redis.get<CachedCanonicalAnswer>(key),
            new Promise<null>((resolve) => 
                setTimeout(() => resolve(null), INSTANT_CACHE_DEFAULTS.timeoutMs)
            ),
        ]);

        if (!result) return null;

        const isFresh = await isCachedCanonicalAnswerFresh({
            canonicalAnswerId: result.canonicalAnswerId,
            tId,
            sId,
            cachedAtMs: result.cachedAt,
            answerVersion: result.answerVersion,
            sourceVersions: result.sourceVersions,
            currentSourceVersions,
        });

        if (!isFresh) {
            redis.del(key).catch((error) => {
                logRuntimeFailure('answerlattice_instant_cache_stale_delete_failed', error, getInstantCacheLogContext({
                    answerId: result.canonicalAnswerId,
                    answerVersion,
                    planId,
                    roleId,
                    stateId,
                    sId,
                    tId,
                    topEntityId,
                }));
            });
            return null;
        }

        return result;
    } catch (error) {
        logRuntimeFailure('answerlattice_instant_cache_lookup_failed', error, getInstantCacheLogContext({
            answerVersion,
            planId,
            roleId,
            stateId,
            sId,
            tId,
            topEntityId,
        }));
        // Graceful degradation — cache failure never blocks user
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// CACHE WRITE
// ═══════════════════════════════════════════════════════════

export async function instantCacheWrite(
    tId: number,
    sId: number,
    topEntityId: string,
    answer: AnswerlatticeCanonicalAnswer,
    matchedEntityIds: string[],
    planId?: string,
    roleId?: string,
    stateId?: string,
    sourceVersions?: AnswerlatticeCacheSourceVersions,
): Promise<void> {
    if (!redis || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE) return;

    // INV-1: Never cache drifted answers
    if (answer.governance.driftFlag) return;

    try {
        const answerVersion = answer.productBinding.lastValidatedInVersion;
        const key = buildCacheKey(tId, sId, topEntityId, answerVersion, planId, roleId, stateId);

        const payload: CachedCanonicalAnswer = {
            craftedAnswer: answer.content.detailedExplanation || answer.content.structuredSummary,
            canonicalAnswerId: answer.id,
            confidence: 'high',
            answerType: answer.answerType || 'explanation',
            matchedEntityIds,
            procedure: answer.answerType === 'procedure' ? answer.content.procedure || null : null,
            cachedAt: Date.now(),
            answerVersion,
            topEntityId,
            sourceVersions,
        };

        // Check payload size before writing
        const payloadStr = JSON.stringify(payload);
        if (payloadStr.length > INSTANT_CACHE_DEFAULTS.maxPayloadBytes) return;

        // Fire-and-forget — don't await in hot path
        redis.set(key, payload, { ex: INSTANT_CACHE_DEFAULTS.ttlSeconds }).catch((error) => {
            logRuntimeFailure('answerlattice_instant_cache_write_failed', error, getInstantCacheLogContext({
                answerId: answer.id,
                answerVersion,
                matchedEntityCount: matchedEntityIds.length,
                planId,
                roleId,
                stateId,
                sId,
                tId,
                topEntityId,
            }));
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_instant_cache_write_failed', error, getInstantCacheLogContext({
            answerId: answer.id,
            matchedEntityCount: matchedEntityIds.length,
            planId,
            roleId,
            stateId,
            sId,
            tId,
            topEntityId,
        }));
    }
}

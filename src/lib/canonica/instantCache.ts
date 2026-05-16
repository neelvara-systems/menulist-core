/**
 * Canonica — Instant Response Cache (Upstash Redis)
 * 
 * Caches resolved canonical answers in Upstash Redis for sub-10ms responses.
 * Only deterministic canonical answers are cached (not RAG responses).
 * 
 * Cache key: canon:{tId}:{sId}:e:{entityId}:v{version}:p:{plan}:r:{role}
 * Invalidation: Version-based (automatic). TTL: 24 hours.
 * 
 * Reuses existing Upstash instance (same as rate limiting in src/lib/rateLimit.ts).
 * 
 * Feature-flagged: ENABLE_CANONICA_INSTANT_CACHE
 * @see __docs__/canonica/instant-response-infrastructure/
 */

import { Redis } from '@upstash/redis';
import { FEATURE_FLAGS } from '@config/features';
import { CanonicaCanonicalAnswer } from '@type/canonica';
import { isCachedCanonicalAnswerFresh } from './cacheFreshness';
import { CachedCanonicalAnswer, INSTANT_CACHE_DEFAULTS } from './instantCache.types';
import type { CanonicaCacheSourceVersions } from './cacheVersionManifest';

// Reuse existing Upstash connection pattern from rateLimit.ts
const redis = FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

// ═══════════════════════════════════════════════════════════
// CACHE KEY GENERATION
// ═══════════════════════════════════════════════════════════

export function buildCacheKey(
    tId: number,
    sId: number,
    topEntityId: string,
    answerVersion: number,
    planId?: string,
    roleId?: string
): string {
    const plan = planId || '_';
    const role = roleId || '_';
    return `canon:${tId}:${sId}:e:${topEntityId}:v${answerVersion}:p:${plan}:r:${role}`;
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
    currentSourceVersions?: CanonicaCacheSourceVersions,
): Promise<CachedCanonicalAnswer | null> {
    if (!redis || !FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE) return null;

    try {
        const key = buildCacheKey(tId, sId, topEntityId, answerVersion, planId, roleId);
        
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
            redis.del(key).catch(() => {
                // Best-effort cleanup only. Retrieval falls back to the live pipeline.
            });
            return null;
        }

        return result;
    } catch {
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
    answer: CanonicaCanonicalAnswer,
    matchedEntityIds: string[],
    planId?: string,
    roleId?: string,
    sourceVersions?: CanonicaCacheSourceVersions,
): Promise<void> {
    if (!redis || !FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE) return;

    // INV-1: Never cache drifted answers
    if (answer.governance.driftFlag) return;

    try {
        const answerVersion = answer.productBinding.lastValidatedInVersion;
        const key = buildCacheKey(tId, sId, topEntityId, answerVersion, planId, roleId);

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
        redis.set(key, payload, { ex: INSTANT_CACHE_DEFAULTS.ttlSeconds }).catch(() => {
            // Silent failure — cache write is best-effort
        });
    } catch {
        // Silent failure
    }
}

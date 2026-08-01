/**
 * Answerlattice — Instant Response Cache (Upstash Redis)
 * 
 * Caches resolved canonical answers in Upstash Redis as an optional fast path.
 * Only deterministic canonical answers are cached (not RAG responses).
 * 
 * Cache key: canon:v5:{tId}:{sId}:e:{entityHash}:v{version}:q:{queryHash}:c:{contextHash}:p:{planHash}:r:{roleHash}:s:{stateHash}
 * Invalidation: Version-based (automatic). TTL: 24 hours.
 * 
 * Reuses existing Upstash instance (same as rate limiting in src/lib/rateLimit.ts).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_INSTANT_CACHE
 * @see __docs__/answerlattice/instant-response-infrastructure/
 */

import { Redis } from '@upstash/redis';
import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_ANSWER_TYPES, AnswerlatticeCanonicalAnswer } from '@type/answerlattice';
import { normalizeAnswerlatticePublicCitations } from '@lib/answerlattice/publicAnswerContracts';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { createHash } from 'crypto';
import { isCachedCanonicalAnswerFresh } from './cacheFreshness';
import { CachedCanonicalAnswer, INSTANT_CACHE_DEFAULTS } from './instantCache.types';
import {
    ANSWERLATTICE_CACHE_SOURCES,
    type AnswerlatticeCacheSourceVersions,
    normalizeCacheVersion,
} from './cacheVersionManifest';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeResolvedEntityId,
} from './governanceIdBoundary';
import { AnswerlatticeProcedureSchema } from './procedureValidation';

const hasRedisConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN,
);
const ANSWERLATTICE_ANSWER_TYPE_SET = new Set<string>(Object.values(ANSWERLATTICE_ANSWER_TYPES));

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
    query: string,
    contextToken: string,
    planId?: string,
    roleId?: string,
    stateId?: string,
): string {
    if (
        !Number.isSafeInteger(tId)
        || tId <= 0
        || !Number.isSafeInteger(sId)
        || sId <= 0
        || !Number.isSafeInteger(answerVersion)
        || answerVersion <= 0
    ) throw new Error('Invalid Answerlattice instant-cache scope or version.');
    const entityId = normalizeAnswerlatticeResolvedEntityId(topEntityId);
    if (!entityId) throw new Error('Invalid Answerlattice instant-cache entity.');
    const hashSegment = (value?: string) => value
        ? createHash('sha256').update(value).digest('base64url').slice(0, 22)
        : '_';
    const normalizedQuery = query.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!normalizedQuery || !contextToken.trim()) {
        throw new Error('Invalid Answerlattice instant-cache request identity.');
    }
    return `canon:v5:${tId}:${sId}:e:${hashSegment(entityId)}:v${answerVersion}:q:${hashSegment(normalizedQuery)}:c:${hashSegment(contextToken)}:p:${hashSegment(planId)}:r:${hashSegment(roleId)}:s:${hashSegment(stateId)}`;
}

export const normalizeCachedCanonicalAnswer = (
    value: unknown,
    expected: { topEntityId: string; answerVersion: number },
): CachedCanonicalAnswer | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    const canonicalAnswerId = normalizeAnswerlatticeCanonicalAnswerId(source.canonicalAnswerId);
    const topEntityId = normalizeAnswerlatticeResolvedEntityId(source.topEntityId);
    const expectedEntityId = normalizeAnswerlatticeResolvedEntityId(expected.topEntityId);
    const answerVersion = Number(source.answerVersion);
    const cachedAt = Number(source.cachedAt);
    if (
        !canonicalAnswerId
        || !topEntityId
        || !expectedEntityId
        || topEntityId !== expectedEntityId
        || !Number.isSafeInteger(answerVersion)
        || answerVersion <= 0
        || answerVersion !== expected.answerVersion
        || !Number.isSafeInteger(cachedAt)
        || cachedAt <= 0
        || cachedAt > Date.now() + 60_000
        || typeof source.craftedAnswer !== 'string'
        || !source.craftedAnswer.trim()
        || typeof source.answerType !== 'string'
        || !ANSWERLATTICE_ANSWER_TYPE_SET.has(source.answerType)
        || typeof source.confidence !== 'string'
        || !['high', 'medium', 'low'].includes(source.confidence)
        || !Array.isArray(source.matchedEntityIds)
        || source.matchedEntityIds.length > 50
    ) return null;

    const matchedEntityIds = Array.from(new Set(
        source.matchedEntityIds.map(normalizeAnswerlatticeResolvedEntityId).filter(Boolean),
    )) as string[];
    if (matchedEntityIds.length !== source.matchedEntityIds.length || !matchedEntityIds.includes(topEntityId)) return null;

    const procedure = source.answerType === ANSWERLATTICE_ANSWER_TYPES.PROCEDURE
        ? AnswerlatticeProcedureSchema.safeParse(source.procedure)
        : null;
    if (source.answerType === ANSWERLATTICE_ANSWER_TYPES.PROCEDURE && !procedure?.success) return null;
    if (source.answerType !== ANSWERLATTICE_ANSWER_TYPES.PROCEDURE && source.procedure != null) return null;

    let sourceVersions: AnswerlatticeCacheSourceVersions | undefined;
    if (source.sourceVersions !== undefined) {
        if (!source.sourceVersions || typeof source.sourceVersions !== 'object' || Array.isArray(source.sourceVersions)) return null;
        const rawSourceVersions = source.sourceVersions as Record<string, unknown>;
        sourceVersions = {};
        for (const sourceKey of Object.values(ANSWERLATTICE_CACHE_SOURCES)) {
            if (rawSourceVersions[sourceKey] === undefined) continue;
            const version = normalizeCacheVersion(rawSourceVersions[sourceKey]);
            if (!version) return null;
            sourceVersions[sourceKey] = version;
        }
    }

    const normalized: CachedCanonicalAnswer = {
        craftedAnswer: source.craftedAnswer,
        canonicalAnswerId,
        confidence: source.confidence as CachedCanonicalAnswer['confidence'],
        answerType: source.answerType as CachedCanonicalAnswer['answerType'],
        matchedEntityIds,
        citations: normalizeAnswerlatticePublicCitations(source.citations),
        procedure: procedure?.success ? procedure.data : null,
        cachedAt,
        answerVersion,
        topEntityId,
        sourceVersions,
    };
    return Buffer.byteLength(JSON.stringify(normalized), 'utf8') <= INSTANT_CACHE_DEFAULTS.maxPayloadBytes
        ? normalized
        : null;
};

// ═══════════════════════════════════════════════════════════
// CACHE READ
// ═══════════════════════════════════════════════════════════

export async function instantCacheLookup(
    tId: number,
    sId: number,
    topEntityId: string,
    answerVersion: number,
    query: string,
    contextToken: string,
    planId?: string,
    roleId?: string,
    stateId?: string,
    currentSourceVersions?: AnswerlatticeCacheSourceVersions,
): Promise<CachedCanonicalAnswer | null> {
    if (!redis || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE) return null;

    try {
        const key = buildCacheKey(tId, sId, topEntityId, answerVersion, query, contextToken, planId, roleId, stateId);
        
        // Race against timeout
        const result = await Promise.race([
            redis.get<CachedCanonicalAnswer>(key),
            new Promise<null>((resolve) => 
                setTimeout(() => resolve(null), INSTANT_CACHE_DEFAULTS.timeoutMs)
            ),
        ]);

        if (!result) return null;
        const normalizedResult = normalizeCachedCanonicalAnswer(result, { topEntityId, answerVersion });
        if (!normalizedResult) {
            redis.del(key).catch((error) => {
                logRuntimeFailure('answerlattice_instant_cache_invalid_delete_failed', error, getInstantCacheLogContext({
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

        const isFresh = await isCachedCanonicalAnswerFresh({
            canonicalAnswerId: normalizedResult.canonicalAnswerId,
            tId,
            sId,
            cachedAtMs: normalizedResult.cachedAt,
            answerVersion: normalizedResult.answerVersion,
            sourceVersions: normalizedResult.sourceVersions,
            currentSourceVersions,
        });

        if (!isFresh) {
            redis.del(key).catch((error) => {
                logRuntimeFailure('answerlattice_instant_cache_stale_delete_failed', error, getInstantCacheLogContext({
                    answerId: normalizedResult.canonicalAnswerId,
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

        return normalizedResult;
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
    confidence: 'high' | 'medium' | 'low',
    query: string,
    contextToken: string,
    planId?: string,
    roleId?: string,
    stateId?: string,
    sourceVersions?: AnswerlatticeCacheSourceVersions,
): Promise<void> {
    if (!redis || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE) return;

    // Only active, reviewer-cleared canonical truth may enter the fast path.
    if (
        answer.status !== 'active'
        || answer.governance.driftFlag
        || answer.governance.reviewRequired
    ) return;

    try {
        const canonicalAnswerId = normalizeAnswerlatticeCanonicalAnswerId(answer.id);
        const normalizedTopEntityId = normalizeAnswerlatticeResolvedEntityId(topEntityId);
        const answerVersion = Number(answer.productBinding.lastValidatedInVersion);
        const normalizedMatchedEntityIds = Array.from(new Set(
            matchedEntityIds.map(normalizeAnswerlatticeResolvedEntityId).filter(Boolean),
        )) as string[];
        if (
            !canonicalAnswerId
            || !normalizedTopEntityId
            || !Number.isSafeInteger(answerVersion)
            || answerVersion <= 0
            || normalizedMatchedEntityIds.length !== matchedEntityIds.length
            || !normalizedMatchedEntityIds.includes(normalizedTopEntityId)
        ) return;
        const key = buildCacheKey(tId, sId, normalizedTopEntityId, answerVersion, query, contextToken, planId, roleId, stateId);

        const payload: CachedCanonicalAnswer = {
            craftedAnswer: answer.content.detailedExplanation || answer.content.structuredSummary,
            canonicalAnswerId,
            confidence,
            answerType: answer.answerType || 'explanation',
            matchedEntityIds: normalizedMatchedEntityIds,
            citations: normalizeAnswerlatticePublicCitations(answer.evidence?.citations),
            procedure: answer.answerType === 'procedure' ? answer.content.procedure || null : null,
            cachedAt: Date.now(),
            answerVersion,
            topEntityId: normalizedTopEntityId,
            sourceVersions,
        };

        // Check payload size before writing
        const payloadStr = JSON.stringify(payload);
        if (Buffer.byteLength(payloadStr, 'utf8') > INSTANT_CACHE_DEFAULTS.maxPayloadBytes) return;

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

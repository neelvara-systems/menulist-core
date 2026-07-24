/**
 * Answerlattice — Instant Response Cache Types
 * 
 * Types for the Upstash Redis cache layer that stores resolved canonical answers.
 * Only deterministic canonical answers are cached (not RAG responses).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_INSTANT_CACHE
 * @see __docs__/answerlattice/instant-response-infrastructure/
 */

import type { AnswerlatticeAnswerType, AnswerlatticeProcedure, AnswerlatticePublicCitation } from '@type/answerlattice';
import type { AnswerlatticeCacheSourceVersions } from './cacheVersionManifest';

export interface CachedCanonicalAnswer {
    craftedAnswer: string;
    canonicalAnswerId: string;
    confidence: 'high' | 'medium' | 'low';
    answerType: AnswerlatticeAnswerType;
    matchedEntityIds: string[];
    citations?: AnswerlatticePublicCitation[];
    procedure?: AnswerlatticeProcedure | null;
    cachedAt: number;
    answerVersion: number;
    topEntityId: string;
    sourceVersions?: AnswerlatticeCacheSourceVersions;
}

export interface InstantCacheConfig {
    ttlSeconds: number;
    timeoutMs: number;
    maxPayloadBytes: number;
}

export const INSTANT_CACHE_DEFAULTS: InstantCacheConfig = {
    ttlSeconds: 86400,      // 24 hours
    timeoutMs: 50,          // 50ms timeout for Redis calls
    maxPayloadBytes: 10240, // 10KB max payload
};

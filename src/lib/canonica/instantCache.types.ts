/**
 * Canonica — Instant Response Cache Types
 * 
 * Types for the Upstash Redis cache layer that stores resolved canonical answers.
 * Only deterministic canonical answers are cached (not RAG responses).
 * 
 * Feature-flagged: ENABLE_CANONICA_INSTANT_CACHE
 * @see __docs__/canonica/instant-response-infrastructure/
 */

import { CanonicaProcedure } from '@type/canonica';
import type { CanonicaCacheSourceVersions } from './cacheVersionManifest';

export interface CachedCanonicalAnswer {
    craftedAnswer: string;
    canonicalAnswerId: string;
    confidence: 'high' | 'medium';
    answerType: string;
    matchedEntityIds: string[];
    procedure?: CanonicaProcedure | null;
    cachedAt: number;
    answerVersion: number;
    topEntityId: string;
    sourceVersions?: CanonicaCacheSourceVersions;
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

import { Redis } from '@upstash/redis';
import { FEATURE_FLAGS } from '@config/features';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { OWNER_BUSINESS_ASSISTANT_CACHE } from '../constants';
import type { OwnerBusinessAssistantContextPacket, OwnerBusinessAssistantPacketProfile } from '../types';

const hasRedisConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_UPSTASH_CONTEXT_CACHE && hasRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const CACHE_TIMEOUT_MS = 1200;
const MIN_CACHE_TTL_SECONDS = 60;
const MAX_INVALIDATION_SCAN_STEPS = 12;
const MAX_INVALIDATION_KEYS = 200;

export type CachedOwnerBusinessAssistantPacket = Omit<
  OwnerBusinessAssistantContextPacket,
  'clientContext' | 'cacheSource' | 'metrics'
>;

const isNotReadyFallbackPacket = (packet: CachedOwnerBusinessAssistantPacket) =>
  packet.health?.status === 'not_ready'
  && !packet.health.sourceRefs?.length
  && !packet.analytics?.sourceRefs?.length;

export const buildOwnerBusinessAssistantPacketCacheKey = (params: {
  tId: string | number;
  sId: string | number;
  projectId?: string;
  includeProjectInCacheKey?: boolean;
  packetProfile?: OwnerBusinessAssistantPacketProfile;
}) => {
  const project = params.includeProjectInCacheKey && params.projectId ? params.projectId : '_';
  const profile = params.packetProfile || 'answer';
  return `${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:${params.tId}:${params.sId}:p:${project}:profile:${profile}`;
};

const buildOwnerBusinessAssistantPacketCachePattern = (params: {
  tId?: string | number;
  sId: string | number;
  projectId?: string | number;
  packetProfile?: OwnerBusinessAssistantPacketProfile;
}) => {
  const tenant = params.tId == null ? '*' : String(params.tId);
  const project = params.projectId == null ? '*' : String(params.projectId);
  const profile = params.packetProfile || '*';
  return `${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:${tenant}:${params.sId}:p:${project}:profile:${profile}`;
};

const buildOwnerBusinessAssistantPacketIndexKey = (params: {
  tId: string | number;
  sId: string | number;
}) => `${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketIndexPrefix}:${params.tId}:${params.sId}`;

const getPacketProfileFromCacheKey = (cacheKey: string): string | undefined => {
  const match = cacheKey.match(/:profile:([a-z_]+)$/);
  return match?.[1];
};

const getPacketValidUntilMs = (packet: CachedOwnerBusinessAssistantPacket) => {
  const parsed = Date.parse(packet.validUntil || '');
  return Number.isFinite(parsed) ? parsed : null;
};

const getOwnerBusinessAssistantPacketCacheContext = (params: {
  cacheKey?: unknown;
  fallbackPolicy?: string;
  indexKey?: unknown;
  packetProfile?: unknown;
  projectId?: unknown;
  sId?: unknown;
  tId?: unknown;
}) => ({
  ...getBoundedRuntimeStringContext('cacheKey', params.cacheKey),
  ...getBoundedRuntimeStringContext('indexKey', params.indexKey),
  ...getBoundedRuntimeStringContext('packetProfile', params.packetProfile),
  ...getBoundedRuntimeStringContext('projectId', params.projectId),
  ...getBoundedRuntimeStringContext('storeId', params.sId),
  ...getBoundedRuntimeStringContext('tenantId', params.tId),
  fallbackPolicy: params.fallbackPolicy,
});

const resolvePacketTtlSeconds = (packet: CachedOwnerBusinessAssistantPacket) => {
  const validUntilMs = getPacketValidUntilMs(packet);
  if (!validUntilMs) return OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketTtlSeconds;

  const secondsUntilValidUntil = Math.floor((validUntilMs - Date.now()) / 1000);
  if (secondsUntilValidUntil <= 0) return 0;

  return Math.max(
    MIN_CACHE_TTL_SECONDS,
    Math.min(OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketTtlSeconds, secondsUntilValidUntil),
  );
};

const readIndexedPacketKeys = async (indexKey: string): Promise<string[]> => {
  if (!redis) return [];
  try {
    const result = await Promise.race([
      redis.smembers(indexKey),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), CACHE_TIMEOUT_MS)),
    ]);
    return Array.isArray(result) ? result.map(String) : [];
  } catch (error) {
    logRuntimeFailure('owner_business_assistant_packet_cache_index_read_failed', error, {
      ...getOwnerBusinessAssistantPacketCacheContext({
        fallbackPolicy: 'empty_index',
        indexKey,
      }),
    });
    return [];
  }
};

const deleteIndexedPacketKeys = async (params: {
  indexKey: string;
  packetProfile?: OwnerBusinessAssistantPacketProfile;
}) => {
  if (!redis) return 0;
  const indexedKeys = await readIndexedPacketKeys(params.indexKey);
  const keysToDelete = indexedKeys
    .filter((key) => key.startsWith(OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix))
    .filter((key) => (params.packetProfile ? key.endsWith(`:profile:${params.packetProfile}`) : true))
    .slice(0, MAX_INVALIDATION_KEYS);

  if (!keysToDelete.length) return 0;

  await redis.del(keysToDelete[0], ...keysToDelete.slice(1));
  if (params.packetProfile) {
    await redis.srem(params.indexKey, keysToDelete[0], ...keysToDelete.slice(1));
  } else {
    await redis.del(params.indexKey);
  }
  return keysToDelete.length;
};

export async function readOwnerBusinessAssistantPacketCache(
  cacheKey: string,
): Promise<CachedOwnerBusinessAssistantPacket | null> {
  if (!redis || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_CONTEXT_PACKET_CACHE) return null;

  try {
    const result = await Promise.race([
      redis.get<CachedOwnerBusinessAssistantPacket>(cacheKey),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), CACHE_TIMEOUT_MS)),
    ]);
    if (!result) return null;
    const validUntilMs = getPacketValidUntilMs(result);
    if (validUntilMs && validUntilMs <= Date.now()) return null;
    if (isNotReadyFallbackPacket(result)) return null;
    return result;
  } catch (error) {
    logRuntimeFailure('owner_business_assistant_packet_cache_read_failed', error, {
      ...getOwnerBusinessAssistantPacketCacheContext({
        cacheKey,
        fallbackPolicy: 'cache_miss',
      }),
    });
    return null;
  }
}

export async function writeOwnerBusinessAssistantPacketCache(
  cacheKey: string,
  packet: CachedOwnerBusinessAssistantPacket,
): Promise<void> {
  if (!redis || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_CONTEXT_PACKET_CACHE) return;
  if (isNotReadyFallbackPacket(packet)) return;

  let payloadLength = 0;
  let ttlSeconds = 0;
  try {
    const payload = JSON.stringify(packet);
    payloadLength = payload.length;
    if (payload.length > OWNER_BUSINESS_ASSISTANT_CACHE.maxServerPayloadBytes) return;
    ttlSeconds = resolvePacketTtlSeconds(packet);
    if (ttlSeconds <= 0) return;
    await redis.set(cacheKey, packet, { ex: ttlSeconds });
    await redis.sadd(buildOwnerBusinessAssistantPacketIndexKey({
      tId: packet.tId,
      sId: packet.sId,
    }), cacheKey);
    await redis.expire(buildOwnerBusinessAssistantPacketIndexKey({
      tId: packet.tId,
      sId: packet.sId,
    }), Math.max(ttlSeconds, MIN_CACHE_TTL_SECONDS));
  } catch (error) {
    logRuntimeFailure('owner_business_assistant_packet_cache_write_failed', error, {
      ...getOwnerBusinessAssistantPacketCacheContext({
        cacheKey,
        fallbackPolicy: 'skip_cache_write',
        packetProfile: getPacketProfileFromCacheKey(cacheKey),
        sId: packet.sId,
        tId: packet.tId,
      }),
      payloadLength,
      ttlSeconds,
    });
    // Cache is an optimization only. Answers fall back to Firestore-backed packets.
  }
}

export async function invalidateOwnerBusinessAssistantPacketCache(params: {
  tId?: string | number;
  sId?: string | number | null;
  projectId?: string | number | null;
  packetProfile?: OwnerBusinessAssistantPacketProfile;
}): Promise<{ attempted: boolean; keysDeleted: number; patterns: string[] }> {
  const sId = String(params.sId ?? '').trim();
  if (!redis || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_CONTEXT_PACKET_CACHE || !sId) {
    return { attempted: false, keysDeleted: 0, patterns: [] };
  }

  const patterns = [
    buildOwnerBusinessAssistantPacketCachePattern({
      tId: params.tId,
      sId,
      projectId: params.projectId || undefined,
      packetProfile: params.packetProfile,
    }),
  ];

  if (params.projectId) {
    patterns.push(buildOwnerBusinessAssistantPacketCachePattern({
      tId: params.tId,
      sId,
      packetProfile: params.packetProfile,
    }));
  }

  const uniquePatterns = Array.from(new Set(patterns));
  let keysDeleted = 0;

  try {
    if (params.tId) {
      keysDeleted += await deleteIndexedPacketKeys({
        indexKey: buildOwnerBusinessAssistantPacketIndexKey({
          tId: params.tId,
          sId,
        }),
        packetProfile: params.packetProfile,
      });
    }

    for (const pattern of uniquePatterns) {
      let cursor = '0';
      let scanSteps = 0;
      const keys = new Set<string>();

      do {
        const [nextCursor, matchedKeys] = await Promise.race([
          redis.scan(cursor, { match: pattern, count: 50 }),
          new Promise<[string, string[]]>((resolve) => setTimeout(() => resolve(['0', []]), CACHE_TIMEOUT_MS)),
        ]);
        cursor = String(nextCursor);
        matchedKeys.forEach((key) => {
          if (keys.size < MAX_INVALIDATION_KEYS) keys.add(key);
        });
        scanSteps++;
      } while (cursor !== '0' && scanSteps < MAX_INVALIDATION_SCAN_STEPS && keys.size < MAX_INVALIDATION_KEYS);

      const keysToDelete = Array.from(keys);
      if (keysToDelete.length) {
        await redis.del(keysToDelete[0], ...keysToDelete.slice(1));
        keysDeleted += keysToDelete.length;
      }
    }
  } catch (error) {
    logRuntimeFailure('owner_business_assistant_packet_cache_invalidate_failed', error, {
      ...getOwnerBusinessAssistantPacketCacheContext({
        fallbackPolicy: 'best_effort_invalidation',
        packetProfile: params.packetProfile,
        projectId: params.projectId,
        sId,
        tId: params.tId,
      }),
      keysDeleted,
      patternCount: uniquePatterns.length,
    });
    return { attempted: true, keysDeleted, patterns: uniquePatterns };
  }

  return { attempted: true, keysDeleted, patterns: uniquePatterns };
}

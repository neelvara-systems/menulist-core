import { Redis } from '@upstash/redis';
import { OWNER_BUSINESS_ASSISTANT_CACHE } from './constants';

const CACHE_TIMEOUT_MS = 1200;
const MAX_INVALIDATION_SCAN_STEPS = 12;
const MAX_INVALIDATION_KEYS = 200;

let redisClient: Redis | null | undefined;

const getRedisClient = () => {
  if (redisClient !== undefined) return redisClient;
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
};

const buildPattern = (params: {
  tId?: string | number;
  sId: string | number;
  projectId?: string | number;
}) => {
  const tenant = params.tId == null ? '*' : String(params.tId);
  const project = params.projectId == null ? '*' : String(params.projectId);
  return `${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:${tenant}:${params.sId}:p:${project}:profile:*`;
};

const buildPacketIndexKey = (params: {
  tId: string | number;
  sId: string | number;
}) => `${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketIndexPrefix}:${params.tId}:${params.sId}`;

const readIndexedPacketKeys = async (redis: Redis, indexKey: string): Promise<string[]> => {
  try {
    const result = await Promise.race([
      redis.smembers(indexKey),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), CACHE_TIMEOUT_MS)),
    ]);
    return Array.isArray(result) ? result.map(String) : [];
  } catch {
    return [];
  }
};

const deleteIndexedPacketKeys = async (redis: Redis, indexKey: string) => {
  const keysToDelete = (await readIndexedPacketKeys(redis, indexKey))
    .filter((key) => key.startsWith(OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix))
    .slice(0, MAX_INVALIDATION_KEYS);

  if (!keysToDelete.length) return 0;

  await redis.del(keysToDelete[0], ...keysToDelete.slice(1));
  await redis.del(indexKey);
  return keysToDelete.length;
};

export async function invalidateOwnerBusinessAssistantContextPackets(params: {
  tId?: string | number;
  sId: string | number;
  projectId?: string | number;
}): Promise<{ attempted: boolean; keysDeleted: number }> {
  const redis = getRedisClient();
  if (!redis) return { attempted: false, keysDeleted: 0 };

  const patterns = [
    buildPattern(params),
    ...(params.projectId ? [buildPattern({ tId: params.tId, sId: params.sId })] : []),
  ];
  let keysDeleted = 0;

  try {
    if (params.tId) {
      keysDeleted += await deleteIndexedPacketKeys(redis, buildPacketIndexKey({
        tId: params.tId,
        sId: params.sId,
      }));
    }

    for (const pattern of Array.from(new Set(patterns))) {
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
  } catch {
    return { attempted: true, keysDeleted };
  }

  return { attempted: true, keysDeleted };
}

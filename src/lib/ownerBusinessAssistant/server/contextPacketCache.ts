import { Redis } from '@upstash/redis';
import { FEATURE_FLAGS } from '@config/features';
import { OWNER_BUSINESS_ASSISTANT_CACHE } from '../constants';
import type { OwnerBusinessAssistantContextPacket } from '../types';

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

export type CachedOwnerBusinessAssistantPacket = Omit<
  OwnerBusinessAssistantContextPacket,
  'clientContext' | 'cacheSource'
>;

export const buildOwnerBusinessAssistantPacketCacheKey = (params: {
  tId: string | number;
  sId: string | number;
  projectId?: string;
  packetProfile?: string;
}) => {
  const project = params.projectId || '_';
  const profile = params.packetProfile || 'answer';
  return `${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:${params.tId}:${params.sId}:p:${project}:profile:${profile}`;
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
    return result || null;
  } catch {
    return null;
  }
}

export async function writeOwnerBusinessAssistantPacketCache(
  cacheKey: string,
  packet: CachedOwnerBusinessAssistantPacket,
): Promise<void> {
  if (!redis || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_CONTEXT_PACKET_CACHE) return;

  try {
    const payload = JSON.stringify(packet);
    if (payload.length > OWNER_BUSINESS_ASSISTANT_CACHE.maxServerPayloadBytes) return;
    await redis.set(cacheKey, packet, { ex: OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketTtlSeconds });
  } catch {
    // Cache is an optimization only. Answers fall back to Firestore-backed packets.
  }
}

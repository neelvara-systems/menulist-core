const IMAGE_PROMPT_CACHE_STORAGE_PREFIX = 'system/aiImagePromptCache/';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const timestampMillis = (value: unknown): number | null => {
  if (!isRecord(value) || typeof value.toMillis !== 'function') return null;
  const millis = Number(value.toMillis.call(value));
  return Number.isFinite(millis) ? millis : null;
};

export function isImagePromptCacheSourcePath(value: unknown, cacheKey: string): value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(cacheKey)) return false;
  return new RegExp(
    `^${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}v\\d+/${cacheKey}(?:/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})?\\.[a-z0-9]+$`,
  ).test(value);
}

export function shouldDeleteCurrentImagePromptCacheDocument(params: {
  claimedSourcePath: string;
  currentData: unknown;
  nowMillis: number;
}): boolean {
  if (!isRecord(params.currentData)) return false;
  const expiresAtMillis = timestampMillis(params.currentData.expiresAt);
  return params.currentData.sourcePath === params.claimedSourcePath
    && expiresAtMillis !== null
    && expiresAtMillis <= params.nowMillis;
}

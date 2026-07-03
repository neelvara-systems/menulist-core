const MAX_EVENT_METADATA_KEYS = 40;
const MAX_EVENT_METADATA_STRING_LENGTH = 96;

const SAFE_EVENT_METADATA_KEYS = new Set([
  "businessType",
  "correctionNumber",
  "hasNote",
  "issueCount",
  "metadataDroppedCount",
]);

const BOUNDED_EVENT_METADATA_KEYS = new Set([
  "businessName",
  "dashboardUrl",
  "projectId",
  "providerUserId",
  "publicUrl",
  "sessionId",
  "storeId",
  "tenantId",
]);

type SanitizedMessagingEventMetadataValue = boolean | number | string | null;

function getBoundedMessagingEventMetadataContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function isSafeMessagingEventMetadataKey(key: string): boolean {
  return SAFE_EVENT_METADATA_KEYS.has(key) || /^[A-Za-z][A-Za-z0-9]*(Present|Length)$/.test(key);
}

export function sanitizeMessagingOnboardingEventMetadata(
  metadata?: Record<string, unknown>,
): Record<string, SanitizedMessagingEventMetadataValue> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  const sanitized: Record<string, SanitizedMessagingEventMetadataValue> = {};
  let droppedCount = 0;

  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(sanitized).length >= MAX_EVENT_METADATA_KEYS) {
      droppedCount += 1;
      continue;
    }

    if (BOUNDED_EVENT_METADATA_KEYS.has(key)) {
      Object.assign(sanitized, getBoundedMessagingEventMetadataContext(key, value));
      continue;
    }

    if (!isSafeMessagingEventMetadataKey(key)) {
      droppedCount += 1;
      continue;
    }

    if (value === null) {
      sanitized[key] = null;
      continue;
    }

    if (typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, MAX_EVENT_METADATA_STRING_LENGTH);
      continue;
    }

    droppedCount += 1;
  }

  if (droppedCount > 0 && Object.keys(sanitized).length < MAX_EVENT_METADATA_KEYS) {
    sanitized.metadataDroppedCount = droppedCount;
  }

  return sanitized;
}

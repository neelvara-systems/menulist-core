import type { PublishedResult } from "../types/messagingOnboarding.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes("\0");
}

function safeHttpsUrl(value: unknown): value is string {
  if (!boundedString(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function normalizePublishedProjectScope(value: string): { tenantId: number; storeId: number } | null {
  const parts = value.split("-");
  if (parts.length < 3) return null;
  const tenantId = Number(parts[0]);
  const storeId = Number(parts[parts.length - 1]);
  return Number.isSafeInteger(tenantId)
    && tenantId > 0
    && String(tenantId) === parts[0]
    && Number.isSafeInteger(storeId)
    && storeId > 0
    && String(storeId) === parts[parts.length - 1]
    ? { tenantId, storeId }
    : null;
}

export function normalizeMessagingPublishedResult(value: unknown): PublishedResult | null {
  if (!isRecord(value)) return null;
  const tenantId = value.tenantId;
  const storeId = value.storeId;
  const projectScope = boundedString(value.projectId, 180)
    ? normalizePublishedProjectScope(value.projectId)
    : null;
  if (
    typeof tenantId !== "number"
    || !Number.isSafeInteger(tenantId)
    || tenantId <= 0
    || typeof storeId !== "number"
    || !Number.isSafeInteger(storeId)
    || storeId <= 0
    || !boundedString(value.projectId, 180)
    || !projectScope
    || projectScope.tenantId !== tenantId
    || projectScope.storeId !== storeId
    || !boundedString(value.userId, 180)
    || !safeHttpsUrl(value.publicUrl)
    || !safeHttpsUrl(value.dashboardUrl)
  ) return null;

  return {
    dashboardUrl: value.dashboardUrl,
    projectId: value.projectId,
    publicUrl: value.publicUrl,
    storeId,
    tenantId,
    userId: value.userId,
  };
}

const MAX_ANALYTICS_MAP_ENTRIES = 1_000;
const MAX_ANALYTICS_MAP_KEY_LENGTH = 180;
const MAX_ANALYTICS_LABEL_LENGTH = 500;
const UNSAFE_ANALYTICS_MAP_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export function readOwnerDashboardCounter(value: unknown): number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    ? value
    : 0;
}

export function readOwnerDashboardFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildOwnerDashboardDocumentPrefix(
  tenantId: unknown,
  storeId: unknown,
  projectId: unknown,
): string | null {
  const normalizedTenantId = normalizeAnalyticsScopeDocumentId(tenantId);
  const normalizedStoreId = normalizeAnalyticsScopeDocumentId(storeId);
  const normalizedProjectId = normalizeAnalyticsProjectId(projectId);
  return normalizedTenantId && normalizedStoreId && normalizedProjectId
    ? `${normalizedTenantId}_${normalizedStoreId}_${normalizedProjectId}`
    : null;
}

export function hasOwnerDashboardSummaryIdentity(
  value: unknown,
  expected: { projectId: string; sId: string; tId: string },
): value is Record<string, unknown> {
  return isRecord(value)
    && String(value.tId ?? '') === expected.tId
    && String(value.sId ?? '') === expected.sId
    && value.projectId === expected.projectId
    && value.kind === 'ownerDashboardSummary';
}

function isSafeAnalyticsMapKey(value: string): boolean {
  return Boolean(value)
    && value.length <= MAX_ANALYTICS_MAP_KEY_LENGTH
    && !UNSAFE_ANALYTICS_MAP_KEYS.has(value)
    && !/[\u0000-\u001f\u007f]/.test(value);
}

export function readOwnerDashboardMap(
  data: unknown,
  field: string,
  valueKind?: 'number',
): Record<string, number>;
export function readOwnerDashboardMap(
  data: unknown,
  field: string,
  valueKind: 'string',
): Record<string, string>;
export function readOwnerDashboardMap(
  data: unknown,
  field: string,
  valueKind: 'number' | 'string' = 'number',
): Record<string, number> | Record<string, string> {
  const record = isRecord(data) ? data : {};
  const nested = isRecord(record[field]) ? record[field] : {};
  const candidates = [
    ...Object.entries(nested),
    ...Object.entries(record)
      .filter(([key]) => key.startsWith(`${field}.`))
      .map(([key, value]) => [key.slice(field.length + 1), value] as const),
  ];
  if (valueKind === 'string') {
    const result: Record<string, string> = Object.create(null);
    for (const [key, value] of candidates.slice(0, MAX_ANALYTICS_MAP_ENTRIES)) {
      if (!isSafeAnalyticsMapKey(key)) continue;
      if (typeof value === 'string' && value.trim()) {
        result[key] = value.trim().slice(0, MAX_ANALYTICS_LABEL_LENGTH);
      }
    }
    return result;
  }

  const result: Record<string, number> = Object.create(null);
  for (const [key, value] of candidates.slice(0, MAX_ANALYTICS_MAP_ENTRIES)) {
    if (!isSafeAnalyticsMapKey(key)) continue;
    const counter = readOwnerDashboardCounter(value);
    if (counter > 0) result[key] = counter;
  }

  return result;
}
import {
  normalizeAnalyticsProjectId,
  normalizeAnalyticsScopeDocumentId,
} from './readBoundary';

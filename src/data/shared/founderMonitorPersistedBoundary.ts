export type FounderMonitorPersistedMovementKind =
  | 'new_mrr'
  | 'cash_collected'
  | 'failed_payment'
  | 'churn'
  | 'refund'
  | 'expansion_mrr'
  | 'downgrade_mrr';

export type FounderMonitorPersistedMovement = {
  occurredAt: string;
  tenantId: string;
  storeId: string;
  kind: FounderMonitorPersistedMovementKind;
  amountPaise: number;
  description: string;
};

const MOVEMENT_KINDS = new Set<FounderMonitorPersistedMovementKind>([
  'new_mrr',
  'cash_collected',
  'failed_payment',
  'churn',
  'refund',
  'expansion_mrr',
  'downgrade_mrr',
]);
const POSITIVE_ID = /^[1-9]\d*$/;
const BUSINESS_DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asCanonicalScopeId(value: unknown): string | null {
  if (typeof value !== 'string' || !POSITIVE_ID.test(value)) return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && String(numeric) === value ? value : null;
}

function asTimestampIso(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.toDate === 'function') {
    try {
      const date = record.toDate.call(value);
      return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
      return null;
    }
  }
  const seconds = record.seconds ?? record._seconds;
  if (typeof seconds !== 'number' || !Number.isSafeInteger(seconds)) return null;
  const date = new Date(seconds * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function asBoundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function readFounderMonitorPersistedInteger(
  value: unknown,
  field: string,
): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`Founder Monitor persisted ${field} is invalid.`);
  }
  return value;
}

export function projectFounderRevenueMovementRow(params: {
  data: unknown;
  documentId: string;
  expectedBusinessDayKey?: string;
}): FounderMonitorPersistedMovement | null {
  const data = asRecord(params.data);
  if (!data || typeof params.documentId !== 'string' || params.documentId.length === 0) return null;
  if (data.pId !== 'ML' || data.productId !== 'ML') return null;
  if (
    params.expectedBusinessDayKey !== undefined
    && (
      !BUSINESS_DAY_KEY.test(params.expectedBusinessDayKey)
      || data.businessDayKey !== params.expectedBusinessDayKey
    )
  ) {
    return null;
  }
  const kind = data.kind;
  const amountPaise = data.amountPaise;
  const occurredAt = asTimestampIso(data.occurredAt);
  const description = asBoundedText(data.description ?? data.eventName ?? data.kind, 220);
  if (
    typeof kind !== 'string'
    || !MOVEMENT_KINDS.has(kind as FounderMonitorPersistedMovementKind)
    || typeof amountPaise !== 'number'
    || !Number.isSafeInteger(amountPaise)
    || amountPaise < 0
    || !occurredAt
    || !description
  ) {
    return null;
  }

  const scopeValues = [data.tenantId, data.tId, data.storeId, data.sId];
  const hasScope = scopeValues.some((value) => value !== null && value !== undefined);
  let tenantId = '';
  let storeId = '';
  if (hasScope) {
    tenantId = asCanonicalScopeId(data.tenantId) || '';
    const compactTenantId = asCanonicalScopeId(data.tId);
    storeId = asCanonicalScopeId(data.storeId) || '';
    const compactStoreId = asCanonicalScopeId(data.sId);
    if (!tenantId || compactTenantId !== tenantId || !storeId || compactStoreId !== storeId) {
      return null;
    }
  }

  return {
    occurredAt,
    tenantId,
    storeId,
    kind: kind as FounderMonitorPersistedMovementKind,
    amountPaise,
    description,
  };
}

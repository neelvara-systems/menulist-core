import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export type SchedulerRecoveryResponse = {
  success: boolean;
  runLogId: string;
  status: 'success' | 'partial' | 'failed';
  totalStores: number;
  totalProjects: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  intelligenceSuccess: number;
  intelligenceFailed: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBoundedCount(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 100_000;
}

function readOwnValue(record: object, key: PropertyKey): unknown {
  try {
    return Object.prototype.hasOwnProperty.call(record, key)
      ? Reflect.get(record, key)
      : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeSchedulerRecoveryRunLogId(value: unknown): string | null {
  return typeof value === 'string'
    && value === value.trim()
    && value.length <= 240
    && isValidFirestoreDocumentId(value)
    ? value
    : null;
}

export function normalizeSchedulerRecoveryResponse(value: unknown): SchedulerRecoveryResponse | null {
  if (!isRecord(value)) return null;
  const status = readOwnValue(value, 'status');
  const success = readOwnValue(value, 'success');
  const runLogId = normalizeSchedulerRecoveryRunLogId(readOwnValue(value, 'runLogId'));
  const totalStores = readOwnValue(value, 'totalStores');
  const totalProjects = readOwnValue(value, 'totalProjects');
  const successCount = readOwnValue(value, 'successCount');
  const failedCount = readOwnValue(value, 'failedCount');
  const skippedCount = readOwnValue(value, 'skippedCount');
  const intelligenceSuccess = readOwnValue(value, 'intelligenceSuccess');
  const intelligenceFailed = readOwnValue(value, 'intelligenceFailed');
  if (
    (status !== 'success' && status !== 'partial' && status !== 'failed')
    || !runLogId
    || typeof success !== 'boolean'
    || success !== (status !== 'failed')
    || !isBoundedCount(totalStores)
    || totalStores !== 1
    || !isBoundedCount(totalProjects)
    || !isBoundedCount(successCount)
    || !isBoundedCount(failedCount)
    || !isBoundedCount(skippedCount)
    || !isBoundedCount(intelligenceSuccess)
    || !isBoundedCount(intelligenceFailed)
  ) {
    return null;
  }

  return {
    success,
    runLogId,
    status,
    totalStores,
    totalProjects,
    successCount,
    failedCount,
    skippedCount,
    intelligenceSuccess,
    intelligenceFailed,
  };
}

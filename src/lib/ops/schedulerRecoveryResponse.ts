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
  const status = value.status;
  const runLogId = normalizeSchedulerRecoveryRunLogId(value.runLogId);
  if (
    (status !== 'success' && status !== 'partial' && status !== 'failed')
    || !runLogId
    || typeof value.success !== 'boolean'
    || value.success !== (status !== 'failed')
    || !isBoundedCount(value.totalStores)
    || value.totalStores !== 1
    || !isBoundedCount(value.totalProjects)
    || !isBoundedCount(value.successCount)
    || !isBoundedCount(value.failedCount)
    || !isBoundedCount(value.skippedCount)
    || !isBoundedCount(value.intelligenceSuccess)
    || !isBoundedCount(value.intelligenceFailed)
  ) {
    return null;
  }

  return {
    success: value.success,
    runLogId,
    status,
    totalStores: value.totalStores,
    totalProjects: value.totalProjects,
    successCount: value.successCount,
    failedCount: value.failedCount,
    skippedCount: value.skippedCount,
    intelligenceSuccess: value.intelligenceSuccess,
    intelligenceFailed: value.intelligenceFailed,
  };
}

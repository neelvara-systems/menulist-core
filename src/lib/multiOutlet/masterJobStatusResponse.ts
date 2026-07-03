export const MASTER_JOB_STATUS_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

export const ACTIVE_MASTER_JOB_STATUSES = [
  'pending',
  'processing',
  'preview_ready',
] as const;

export type ActiveMasterJobStatus = typeof ACTIVE_MASTER_JOB_STATUSES[number];

export type MasterJobStatusResponse = {
  isMasterJobActive: boolean;
  masterJobStatus?: ActiveMasterJobStatus;
  masterJobId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const isActiveMasterJobStatus = (value: unknown): value is ActiveMasterJobStatus => (
  typeof value === 'string' && ACTIVE_MASTER_JOB_STATUSES.includes(value as ActiveMasterJobStatus)
);

export const isMasterJobStatusResponse = (value: unknown): value is MasterJobStatusResponse => {
  if (!isRecord(value) || typeof value.isMasterJobActive !== 'boolean') return false;

  if (value.isMasterJobActive === false) {
    return value.masterJobStatus === undefined && value.masterJobId === undefined;
  }

  return isActiveMasterJobStatus(value.masterJobStatus)
    && typeof value.masterJobId === 'string'
    && value.masterJobId.trim().length > 0;
};

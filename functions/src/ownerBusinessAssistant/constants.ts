export const OWNER_BUSINESS_ASSISTANT_VERSION = 1 as const;

export const OWNER_BUSINESS_ASSISTANT_CACHE = {
  serverPacketPrefix: 'owner-business-assistant:packet:v1',
  serverPacketIndexPrefix: 'owner-business-assistant:packet-index:v1',
} as const;

export const OWNER_BUSINESS_ASSISTANT_DOCS = {
  getCurrent: (tId: string | number, sId: string | number) =>
    `ownerBusinessHealthCurrent_${tId}_${sId}`,
  getSnapshot: (tId: string | number, sId: string | number, localDate: string) =>
    `ownerBusinessHealthSnapshot_${tId}_${sId}_${localDate}`,
  getAnalyticsIndex: (tId: string | number, sId: string | number) =>
    `ownerBusinessAnalyticsIndex_${tId}_${sId}`,
  getMultiLocation: (tId: string | number) =>
    `ownerBusinessHealthMultiLocation_${tId}`,
  getProjectsSummary: (sId: string | number) => `projects_${sId}`,
} as const;

export const OWNER_BUSINESS_ASSISTANT_SUPPORTED_PERIODS = [
  'today',
  'yesterday',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
  'last7Days',
  'last30Days',
  'overall',
] as const;

export const OWNER_BUSINESS_ASSISTANT_SNAPSHOT_RETENTION_DAYS = 45;
export const OWNER_BUSINESS_ASSISTANT_THREAD_RETENTION_DAYS = 30;
export const OWNER_BUSINESS_ASSISTANT_DRAFT_RETENTION_DAYS = 7;
export const OWNER_BUSINESS_ASSISTANT_ACTION_RETENTION_DAYS = 90;

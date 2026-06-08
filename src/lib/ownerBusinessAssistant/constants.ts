export const OWNER_BUSINESS_ASSISTANT_VERSION = 1 as const;

export const OWNER_BUSINESS_ASSISTANT_ENDPOINTS = {
  current: '/api/owner-business-assistant/current',
  analytics: '/api/owner-business-assistant/analytics',
  answer: '/api/owner-business-assistant/answer',
  action: '/api/owner-business-assistant/action',
  feedback: '/api/owner-business-assistant/feedback',
  thread: (threadId: string) => `/api/owner-business-assistant/thread/${encodeURIComponent(threadId)}`,
} as const;

export const OWNER_BUSINESS_HEALTH_STATUS_LABELS = {
  stable: 'Stable',
  watch: 'May need checking',
  needs_review: 'Needs review',
  insufficient_data: 'Not enough data',
  stale: 'Latest check delayed',
  not_ready: 'Not ready yet',
} as const;

export const OWNER_BUSINESS_ASSISTANT_COPY = {
  featureDisabled: 'Business Health is not available yet.',
  notReadyTitle: 'Latest check is not ready yet.',
  stableHeadline: 'Everything is running normally.',
  noActionNeeded: 'No action needed.',
  unsupported: 'MenuList does not have enough data for that yet.',
  stale: 'Latest check is delayed. Showing the last available check.',
} as const;

export const OWNER_BUSINESS_ASSISTANT_CACHE = {
  packetVersion: 'v1',
  browserCurrentPrefix: 'ownerBusinessAssistant-current',
  browserAnalyticsPrefix: 'ownerBusinessAssistant-analytics',
  browserPacketPrefix: 'ownerBusinessAssistant-packet',
  serverPacketPrefix: 'owner-business-assistant:packet:v1',
  todayOverlayTtlMs: 10 * 60 * 1000,
  serverPacketTtlSeconds: 24 * 60 * 60,
  maxServerPayloadBytes: 650_000,
} as const;

export const OWNER_BUSINESS_ASSISTANT_DOCS = {
  getCurrent: (tId: string | number, sId: string | number) =>
    `ownerBusinessHealthCurrent_${tId}_${sId}`,
  getSnapshot: (tId: string | number, sId: string | number, localDate: string) =>
    `ownerBusinessHealthSnapshot_${tId}_${sId}_${localDate}`,
  getAnalyticsIndex: (tId: string | number, sId: string | number) =>
    `ownerBusinessAnalyticsIndex_${tId}_${sId}`,
  getProjectsSummary: (sId: string | number) => `projects_${sId}`,
} as const;

export const OWNER_BUSINESS_ASSISTANT_COLLECTIONS = {
  threads: 'ownerBusinessAssistantThreads',
  actions: 'ownerBusinessAssistantActions',
  drafts: 'ownerBusinessAssistantDrafts',
  answerEvents: 'ownerBusinessAssistantAnswerEvents',
  feedback: 'ownerBusinessAssistantFeedback',
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

export const OWNER_BUSINESS_ASSISTANT_INTENTS = [
  'business_status',
  'item_attention',
  'analytics_period_summary',
  'analytics_period_compare',
  'item_needs_checking',
  'weekly_changes',
  'public_menu_status',
  'customer_interest',
  'feedback_pattern',
  'next_action',
  'outlet_attention',
  'account_status',
  'store_profile_status',
  'share_asset_status',
  'integration_status',
  'permission_status',
  'review_reply_prepare',
] as const;

export const OWNER_BUSINESS_ASSISTANT_DOMAINS = [
  'business_health',
  'analytics',
  'menu',
  'store_profile',
  'temporary_status',
  'public_links',
  'customer_app',
  'qr_share',
  'digital_screens',
  'feedback_reviews',
  'domains',
  'outlets',
  'billing',
  'users_permissions',
  'pos_integrations',
  'compliance',
  'external',
] as const;

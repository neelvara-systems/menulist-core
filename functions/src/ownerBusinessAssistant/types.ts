export type OwnerBusinessHealthStatus =
  | 'stable'
  | 'watch'
  | 'needs_review'
  | 'insufficient_data'
  | 'stale'
  | 'not_ready';

export type OwnerBusinessHealthBlockStatus = 'stable' | 'watch' | 'needs_review' | 'insufficient_data' | 'not_enabled';

export interface OwnerBusinessHealthSourceRef {
  id: string;
  source: string;
  docId?: string;
  generatedAt?: string;
  freshnessLabel?: string;
}

export interface OwnerBusinessHealthBlock {
  id: string;
  title: string;
  status: OwnerBusinessHealthBlockStatus;
  message: string;
  sourceFactIds: string[];
  actionType?: string;
}

export interface OwnerBusinessHealthCheck {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  status: OwnerBusinessHealthBlockStatus;
  actionType?: string;
  sourceFactIds: string[];
}

export interface OwnerBusinessHealthQuestion {
  id: string;
  label: string;
  question: string;
  intent: string;
  domain: string;
}

export interface OwnerBusinessAnalyticsPeriod {
  key: string;
  label: string;
  rangeLabel: string;
  scope?: 'store' | 'project';
  projectId?: string;
  projectName?: string;
  indexedProjectCount?: number;
  status: 'available' | 'partial' | 'not_available';
  metrics: {
    menuVisits?: number;
    itemClicks?: number;
    menuSessions?: number;
    engagedSessions?: number;
    actionSessions?: number;
    searches?: number;
    unavailableItemTaps?: number;
  };
  topItems?: Array<{ itemId: string; name?: string; projectId?: string; projectName?: string; value: number; signal: 'views' | 'clicks' | 'attention' }>;
  topCategories?: Array<{ categoryId: string; name?: string; projectId?: string; projectName?: string; value: number }>;
  topSearches?: Array<{ term: string; count: number }>;
  sourceQuality?: Array<{ source: string; visits: number; actionRate?: number }>;
  freshnessLabel: string;
  sourceFactIds: string[];
}

export interface OwnerBusinessProjectAnalyticsSummary {
  projectId: string;
  projectName?: string;
  isDefault?: boolean;
  active?: boolean;
  periods: Record<string, OwnerBusinessAnalyticsPeriod | undefined>;
  unsupportedPeriods: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
}

export interface OwnerBusinessAnalyticsIndexDoc {
  version: 1;
  tId: string;
  sId: string;
  localDate: string;
  generatedAt: string;
  lastSettledLocalDate?: string;
  projectScope?: {
    totalActiveProjects: number;
    indexedProjectCount: number;
    indexedProjectIds: string[];
    overflowProjectCount?: number;
    defaultProjectId?: string;
  };
  periods: Record<string, OwnerBusinessAnalyticsPeriod | undefined>;
  projectSummaries?: Record<string, OwnerBusinessProjectAnalyticsSummary>;
  unsupportedPeriods: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    hotPathReadCount: number;
  };
}

export type OwnerBusinessFeedbackThemeKey =
  | 'wrong_price'
  | 'hours'
  | 'unavailable_item'
  | 'service'
  | 'quality'
  | 'cleanliness'
  | 'delivery'
  | 'payment'
  | 'other';

export interface OwnerBusinessFeedbackPeriodSummary {
  key: string;
  label: string;
  rangeLabel: string;
  totalCount: number;
  needsAttentionCount: number;
  sourceFactIds: string[];
}

export interface OwnerBusinessFeedbackThemeSummary {
  key: OwnerBusinessFeedbackThemeKey;
  label: string;
  count: number;
}

export interface OwnerBusinessFeedbackItemSummary {
  feedbackId: string;
  projectId?: string;
  projectName?: string;
  rating: number;
  source?: 'menu_footer' | 'feedback_qr' | 'direct_link';
  snippet?: string;
  createdAt?: string;
  localDate?: string;
  sourceFactId: string;
}

export interface OwnerBusinessFeedbackProjectSummary {
  projectId: string;
  projectName?: string;
  totalCount: number;
  needsAttentionCount: number;
  latestFeedbackAt?: string;
  sourceFactIds: string[];
}

export interface OwnerBusinessFeedbackSummary {
  version: 1;
  status: OwnerBusinessHealthBlockStatus;
  localDate: string;
  generatedAt: string;
  windowDays: number;
  sampledCount: number;
  truncated: boolean;
  latestFeedbackAt?: string;
  latestNeedsAttentionAt?: string;
  periods: Record<string, OwnerBusinessFeedbackPeriodSummary | undefined>;
  topThemes: OwnerBusinessFeedbackThemeSummary[];
  latestNeedsAttention: OwnerBusinessFeedbackItemSummary[];
  latestFeedback: OwnerBusinessFeedbackItemSummary[];
  projectBreakdown: Record<string, OwnerBusinessFeedbackProjectSummary>;
  sourceFactIds: string[];
}

export interface OwnerBusinessHealthCurrentDoc {
  version: 1;
  tId: string;
  sId: string;
  localDate: string;
  generatedAt: string;
  validThrough?: string;
  sourceWindow: {
    today?: string;
    lastSettledDate?: string;
    last7Days?: { start: string; end: string };
    last30Days?: { start: string; end: string };
    timeZone?: string;
  };
  status: OwnerBusinessHealthStatus;
  summary: {
    headline: string;
    ownerMessage: string;
    noActionNeeded: boolean;
    actionCount: number;
  };
  analyticsTeaser?: {
    today?: { label: string; value: string; deltaLabel?: string; sourceFactId?: string };
    thisWeek?: { label: string; value: string; deltaLabel?: string; sourceFactId?: string };
    topItem?: { label: string; value: string; deltaLabel?: string; sourceFactId?: string };
    analyticsIndexDocId: string;
  };
  feedbackSummary?: OwnerBusinessFeedbackSummary;
  blocks: Record<string, OwnerBusinessHealthBlock | undefined>;
  suggestedChecks: OwnerBusinessHealthCheck[];
  suggestedQuestions: OwnerBusinessHealthQuestion[];
  supportedIntents: string[];
  supportedDomains?: Array<{ domain: string; status: 'supported' | 'summary_only' | 'unsupported'; reason?: string; sourceFactIds: string[] }>;
  unsupportedData: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    builderWriteCount: number;
    chatHotPathReadCount: number;
  };
}

export interface OwnerBusinessMultiLocationStoreSummary {
  sId: string;
  storeName?: string;
  status: OwnerBusinessHealthStatus;
  actionCount: number;
  lastCheckedAt: string;
  localDate: string;
  topReason?: string;
  sourceFactIds: string[];
}

export interface OwnerBusinessHealthBuildResult {
  enabled: boolean;
  currentDocId?: string;
  analyticsIndexDocId?: string;
  snapshotDocId?: string;
  builderReadCount: number;
  builderWriteCount: number;
  status?: OwnerBusinessHealthStatus;
}

export interface ActiveProjectEntry {
  projectId: string;
  data: FirebaseFirestore.DocumentData;
}

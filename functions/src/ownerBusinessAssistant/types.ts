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
  topItems?: Array<{ itemId: string; name?: string; value: number; signal: 'views' | 'clicks' | 'attention' }>;
  topCategories?: Array<{ categoryId: string; name?: string; value: number }>;
  topSearches?: Array<{ term: string; count: number }>;
  sourceQuality?: Array<{ source: string; visits: number; actionRate?: number }>;
  freshnessLabel: string;
  sourceFactIds: string[];
}

export interface OwnerBusinessAnalyticsIndexDoc {
  version: 1;
  tId: string;
  sId: string;
  localDate: string;
  generatedAt: string;
  lastSettledLocalDate?: string;
  periods: Record<string, OwnerBusinessAnalyticsPeriod | undefined>;
  unsupportedPeriods: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    hotPathReadCount: number;
  };
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

import {
  OWNER_BUSINESS_ASSISTANT_DOMAINS,
  OWNER_BUSINESS_ASSISTANT_INTENTS,
  OWNER_BUSINESS_ASSISTANT_SUPPORTED_PERIODS,
} from './constants';

export type OwnerBusinessHealthStatus =
  | 'stable'
  | 'watch'
  | 'needs_review'
  | 'insufficient_data'
  | 'stale'
  | 'not_ready';

export type OwnerBusinessAssistantIntent = typeof OWNER_BUSINESS_ASSISTANT_INTENTS[number];
export type OwnerBusinessAssistantDomain = typeof OWNER_BUSINESS_ASSISTANT_DOMAINS[number];
export type OwnerBusinessAnalyticsPeriodKey = typeof OWNER_BUSINESS_ASSISTANT_SUPPORTED_PERIODS[number];
export type OwnerBusinessAssistantPacketProfile =
  | 'health_card'
  | 'analytics_periods'
  | 'owner_question_basic'
  | 'owner_question_actionable'
  | 'multi_location_summary'
  | 'dashboard'
  | 'page'
  | 'answer';

export type OwnerBusinessHealthBlockStatus = 'stable' | 'watch' | 'needs_review' | 'insufficient_data' | 'not_enabled';

export type OwnerBusinessHealthBlock = {
  id: string;
  title: string;
  status: OwnerBusinessHealthBlockStatus;
  message: string;
  sourceFactIds: string[];
  actionType?: string;
};

export type OwnerBusinessHealthCheck = {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  status: OwnerBusinessHealthBlockStatus;
  actionType?: string;
  sourceFactIds: string[];
};

export type OwnerBusinessHealthQuestion = {
  id: string;
  label: string;
  question: string;
  intent: OwnerBusinessAssistantIntent;
  domain: OwnerBusinessAssistantDomain;
};

export type OwnerBusinessHealthSourceRef = {
  id: string;
  source: string;
  docId?: string;
  generatedAt?: string;
  freshnessLabel?: string;
};

export type OwnerBusinessAnalyticsTeaser = {
  label: string;
  value: string;
  deltaLabel?: string;
  sourceFactId?: string;
};

export type OwnerBusinessAnalyticsPeriod = {
  key: OwnerBusinessAnalyticsPeriodKey;
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
};

export type OwnerBusinessProjectAnalyticsSummary = {
  projectId: string;
  projectName?: string;
  isDefault?: boolean;
  active?: boolean;
  periods: Partial<Record<OwnerBusinessAnalyticsPeriodKey, OwnerBusinessAnalyticsPeriod>>;
  unsupportedPeriods: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
};

export type OwnerBusinessAnalyticsIndexDoc = {
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
  periods: Partial<Record<OwnerBusinessAnalyticsPeriodKey, OwnerBusinessAnalyticsPeriod>>;
  projectSummaries?: Record<string, OwnerBusinessProjectAnalyticsSummary>;
  unsupportedPeriods: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    hotPathReadCount: number;
  };
};

export type OwnerAssistantAnswerArtifact =
  | { type: 'text'; body: string }
  | { type: 'metric_row'; metrics: Array<{ label: string; value: string; deltaLabel?: string }> }
  | { type: 'compact_table'; columns: string[]; rows: string[][]; maxRows: number }
  | { type: 'trend_series'; label: string; points: Array<{ label: string; value: number }> }
  | { type: 'action_options'; actions: OwnerBusinessAssistantActionOption[] };

export type OwnerBusinessAssistantActionRisk = 'navigate' | 'draft' | 'confirmed_write' | 'public_truth' | 'blocked';
export type OwnerBusinessAssistantActionTargetKind =
  | 'project'
  | 'menu_item'
  | 'category'
  | 'store'
  | 'media'
  | 'feedback'
  | 'review'
  | 'outlet'
  | 'billing'
  | 'domain'
  | 'screen'
  | 'customer_app'
  | 'qr'
  | 'pos'
  | 'team'
  | 'compliance';

export type OwnerBusinessActionDefinition = {
  actionType: string;
  ownerLabel: string;
  riskLevel: OwnerBusinessAssistantActionRisk;
  requiredPermissions: string[];
  requiredFlags: string[];
  targetKinds: OwnerBusinessAssistantActionTargetKind[];
  resolver: 'summary' | 'project_doc' | 'store_doc' | 'existing_api' | 'screen_route';
  draftSchema?: string;
  executor: string;
  cacheImpact: 'none' | 'project_public' | 'store_public' | 'screen_public';
  aiCostAction?: string;
};

export type OwnerBusinessAssistantActionOption = {
  actionType: string;
  label: string;
  riskLevel: OwnerBusinessAssistantActionRisk;
  href?: string;
  targetKind?: OwnerBusinessAssistantActionTargetKind;
  targetId?: string;
  requiresConfirmation?: boolean;
  sourceFactIds?: string[];
};

export type OwnerBusinessDomainCapability = {
  domain: OwnerBusinessAssistantDomain;
  status: 'supported' | 'summary_only' | 'unsupported';
  reason?: string;
  sourceFactIds: string[];
};

export type OwnerBusinessAssistantRouteMetrics = {
  route?: string;
  packetProfile?: OwnerBusinessAssistantPacketProfile;
  cacheSource: 'browser' | 'server' | 'fresh_firestore';
  firestoreReadCount: number;
  firestoreWriteCount: number;
  packetAgeMinutes?: number;
  packetValidUntil?: string;
  sourceFactCount?: number;
  providerUsed?: boolean;
  answerEventWritten?: boolean;
  threadWritten?: boolean;
  unsupportedReason?: string;
  domainCoverage?: Array<Pick<OwnerBusinessDomainCapability, 'domain' | 'status' | 'reason'>>;
};

export type OwnerBusinessHealthCurrentDoc = {
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
    today?: OwnerBusinessAnalyticsTeaser;
    thisWeek?: OwnerBusinessAnalyticsTeaser;
    topItem?: OwnerBusinessAnalyticsTeaser;
    analyticsIndexDocId: string;
  };
  blocks: Record<string, OwnerBusinessHealthBlock | undefined>;
  suggestedChecks: OwnerBusinessHealthCheck[];
  suggestedQuestions: OwnerBusinessHealthQuestion[];
  supportedIntents: OwnerBusinessAssistantIntent[];
  supportedDomains?: OwnerBusinessDomainCapability[];
  answerArtifacts?: OwnerAssistantAnswerArtifact[];
  unsupportedData: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    builderWriteCount: number;
    chatHotPathReadCount: number;
  };
};

export type OwnerBusinessMultiLocationStoreSummary = {
  sId: string;
  storeName?: string;
  status: OwnerBusinessHealthStatus;
  actionCount: number;
  lastCheckedAt: string;
  localDate: string;
  topReason?: string;
  sourceFactIds: string[];
};

export type OwnerBusinessMultiLocationSummaryDoc = {
  version: 1;
  kind: 'ownerBusinessHealthMultiLocation';
  tId: string;
  generatedAt: string;
  updatedAt: string;
  stores: Record<string, OwnerBusinessMultiLocationStoreSummary>;
};

export type OwnerBusinessAssistantClientContext = {
  currentRoute?: string;
  mobileTab?: 'today' | 'menu' | 'share' | 'more';
  selectedProjectId?: string;
  selectedItemId?: string;
  selectedCategoryId?: string;
  selectedOutletId?: string;
  visibleEntityRefs?: Array<{
    kind: 'project' | 'menu_item' | 'category' | 'store' | 'screen' | 'feedback' | 'review';
    id: string;
    label: string;
  }>;
};

export type OwnerBusinessAssistantContextPacket = {
  version: 1;
  packetId: string;
  cacheKey: string;
  cacheSource: 'browser' | 'server' | 'fresh_firestore';
  tId: string;
  sId: string;
  projectId?: string;
  localBusinessDate: string;
  validUntil: string;
  generatedAt: string;
  sourceSignatures: {
    healthCurrent?: string;
    analyticsIndex?: string;
    todayOverlay?: string;
    publicProjection?: string;
    domainFacts?: string;
    actionCatalog?: string;
  };
  health: OwnerBusinessHealthCurrentDoc;
  analytics?: Pick<OwnerBusinessAnalyticsIndexDoc, 'periods' | 'unsupportedPeriods' | 'sourceRefs' | 'projectScope'>;
  todayOverlay?: OwnerBusinessAnalyticsPeriod;
  domainFacts?: Record<string, unknown>;
  clientContext?: OwnerBusinessAssistantClientContext;
  allowedActions: OwnerBusinessActionDefinition[];
  metrics?: OwnerBusinessAssistantRouteMetrics;
  answerRules: {
    refuseUnsupported: true;
    sourceFactIdsRequired: true;
    noRevenueProfitWithoutSource: true;
    noPublicMutationWithoutConfirmation: true;
  };
};

export type OwnerBusinessAssistantAnswerStatus = 'answered' | 'needs_more_data' | 'unsupported' | 'needs_confirmation';

export type OwnerBusinessAssistantAnswer = {
  answerId: string;
  threadId?: string;
  status: OwnerBusinessAssistantAnswerStatus;
  text: string;
  freshnessLabel: string;
  sourceFactIds: string[];
  artifacts?: OwnerAssistantAnswerArtifact[];
  cards?: Array<Record<string, unknown>>;
  actions?: OwnerBusinessAssistantActionOption[];
  suggestedQuestions?: OwnerBusinessHealthQuestion[];
  confidence: 'high' | 'medium' | 'low';
  cache?: {
    source: OwnerBusinessAssistantContextPacket['cacheSource'];
    cacheKey?: string;
    generatedAt?: string;
  };
  metrics?: OwnerBusinessAssistantRouteMetrics;
  remainingBalance?: unknown;
};

export type OwnerBusinessAssistantActionOperation =
  | 'navigate'
  | 'prepare'
  | 'confirm'
  | 'cancel'
  | 'mark_reviewed'
  | 'dismiss'
  | 'assign';

export type OwnerBusinessAssistantActionResult = {
  success: boolean;
  status: 'navigated' | 'draft_prepared' | 'confirmed' | 'cancelled' | 'reviewed' | 'dismissed' | 'blocked';
  message: string;
  actionId?: string;
  draftId?: string;
  href?: string;
  requiresConfirmation?: boolean;
  affectedSurface?: string;
  metrics?: OwnerBusinessAssistantRouteMetrics;
};

export type OwnerBusinessAssistantFeedbackPayload = {
  answerId: string;
  rating: 'helpful' | 'not_helpful';
  reason?: string;
};

export type FounderMonitorStatus = 'healthy' | 'watch' | 'action_required' | 'setup_required';

export type FounderMonitorSourceStatus = 'available' | 'empty' | 'error' | 'setup_required';

export type FounderMonitorRiskLevel = 'none' | 'watch' | 'action_required';

export interface FounderMonitorSourceCoverage {
  id: string;
  label: string;
  status: FounderMonitorSourceStatus;
  readLimit: number;
  documentsConsidered: number;
  detail: string;
}

export interface FounderMonitorScorecard {
  trustedLiveStores: number;
  activeStores: number;
  totalStores: number;
  newTenantsToday: number;
  newStoresToday: number;
  storesActivatedToday: number;
  onboardingStuckStores: number;
  staleOrBrokenStores: number;
  activeDistributionStores: number;
  criticalTickets: number;
  failedPaymentsToday: number;
  todayWindowLabel: string;
}

export interface FounderMonitorRevenueSummary {
  currentMrrPaise: number;
  netNewMrrPaise: number;
  newMrrPaise: number;
  churnedMrrPaise: number;
  expansionMrrPaise: number;
  downgradeMrrPaise: number;
  cashCollectedTodayPaise: number;
  failedPaymentAmountTodayPaise: number;
  pastDueMrrPaise: number;
  refundsTodayPaise: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  churnedSubscriptions: number;
  arpaPaise: number;
  arpsPaise: number;
  revenuePerTrustedLiveStorePaise: number;
}

export interface FounderMonitorStoreTruthSummary {
  averageScore: number;
  scoredStores: number;
  storesBelow70: number;
  payingStoresBelow70: number;
  staleStores: number;
  unscoredActiveStores: number;
}

export interface FounderMonitorOnboardingSummary {
  paidStoresNotLive: number;
  pendingSubscriptions: number;
  storesWithoutPublishedMenu: number;
  storesMissingDistributionSurface: number;
  averageTimeToLiveHours: number | null;
}

export interface FounderMonitorSupportSummary {
  openTickets: number;
  highPriorityOpenTickets: number;
  ticketsOpenedToday: number;
  storesWithRepeatedTickets: number;
}

export interface FounderMonitorDataGap {
  id: string;
  label: string;
  detail: string;
  severity: 'info' | 'watch' | 'action_required';
}

export interface FounderMonitorStoreRow {
  id: string;
  tenantId: string;
  tenantName: string;
  storeId: string;
  storeName: string;
  planName: string;
  subscriptionStatus: string;
  mrrPaise: number;
  stage: string;
  paymentStatus: string;
  menuStatus: string;
  distributionStatus: string;
  truthScore: number | null;
  lastPublishedAt: string | null;
  daysSincePublish: number | null;
  supportOpenTickets: number;
  riskLevel: FounderMonitorRiskLevel;
  riskReasons: string[];
}

export interface FounderMonitorRevenueMovementRow {
  id: string;
  occurredAt: string | null;
  tenantId: string;
  storeId: string;
  kind: 'new_mrr' | 'cash_collected' | 'failed_payment' | 'churn' | 'refund' | 'expansion_mrr' | 'downgrade_mrr';
  amountPaise: number;
  description: string;
}

export interface FounderMonitorData {
  generatedAt: string;
  periodDays: number;
  periodStart: string;
  status: FounderMonitorStatus;
  scorecard: FounderMonitorScorecard;
  revenue: FounderMonitorRevenueSummary;
  storeTruth: FounderMonitorStoreTruthSummary;
  onboarding: FounderMonitorOnboardingSummary;
  support: FounderMonitorSupportSummary;
  storeRows: FounderMonitorStoreRow[];
  revenueMovement: FounderMonitorRevenueMovementRow[];
  dataGaps: FounderMonitorDataGap[];
  sourceCoverage: FounderMonitorSourceCoverage[];
}

export interface FounderMonitorApiResponse {
  data: FounderMonitorData;
}

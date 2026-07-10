import type {
  FounderMonitorApiResponse,
  FounderMonitorData,
  FounderMonitorRiskLevel,
} from '@lib/ops/founderMonitorTypes';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const FOUNDER_MONITOR_LOAD_FAILED = 'Failed to load founder monitor';
const FOUNDER_MONITOR_RESPONSE_PARSE_FAILED = 'founder_monitor_response_parse_failed';
const FOUNDER_MONITOR_RESPONSE_INVALID = 'founder_monitor_response_invalid';
const FOUNDER_MONITOR_RESPONSE_REJECTED = 'founder_monitor_response_rejected';
export const FOUNDER_MONITOR_RESPONSE_JSON_MAX_BYTES = 512 * 1024;

const MONITOR_STATUSES = ['healthy', 'watch', 'action_required', 'setup_required'];
const SOURCE_STATUSES = ['available', 'empty', 'error', 'setup_required'];
const RISK_LEVELS: FounderMonitorRiskLevel[] = ['none', 'watch', 'action_required'];

function createFounderMonitorLoadError(status?: number): Error {
  const error = new Error(FOUNDER_MONITOR_LOAD_FAILED);
  if (typeof status === 'number') {
    (error as Error & { status?: number }).status = status;
  }
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isAllowedString(value: unknown, allowed: string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isScorecard(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.trustedLiveStores)
    && isFiniteNumber(value.activeStores)
    && isFiniteNumber(value.totalStores)
    && isFiniteNumber(value.newTenantsToday)
    && isFiniteNumber(value.newStoresToday)
    && isFiniteNumber(value.storesActivatedToday)
    && isFiniteNumber(value.onboardingStuckStores)
    && isFiniteNumber(value.staleOrBrokenStores)
    && isFiniteNumber(value.activeDistributionStores)
    && isFiniteNumber(value.criticalTickets)
    && isFiniteNumber(value.failedPaymentsToday)
    && typeof value.todayWindowLabel === 'string';
}

function isRevenueSummary(value: unknown): boolean {
  return isRecord(value)
    && [
      value.currentMrrPaise,
      value.netNewMrrPaise,
      value.newMrrPaise,
      value.churnedMrrPaise,
      value.expansionMrrPaise,
      value.downgradeMrrPaise,
      value.cashCollectedTodayPaise,
      value.failedPaymentAmountTodayPaise,
      value.pastDueMrrPaise,
      value.refundsTodayPaise,
      value.activeSubscriptions,
      value.pastDueSubscriptions,
      value.churnedSubscriptions,
      value.arpaPaise,
      value.arpsPaise,
      value.revenuePerTrustedLiveStorePaise,
    ].every(isFiniteNumber)
    && isRecord(value.churnReasons)
    && Object.values(value.churnReasons).every(isFiniteNumber);
}

function isGrowthSourceSummary(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.draftsCreated)
    && isFiniteNumber(value.businessesClaimed);
}

function isGrowthSummary(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.draftsCreated)
    && isFiniteNumber(value.businessesClaimed)
    && isFiniteNumber(value.draftToClaimRatePercent)
    && isRecord(value.bySource)
    && Object.values(value.bySource).every(isGrowthSourceSummary);
}

function isStoreTruthSummary(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.averageScore)
    && isFiniteNumber(value.scoredStores)
    && isFiniteNumber(value.storesBelow70)
    && isFiniteNumber(value.payingStoresBelow70)
    && isFiniteNumber(value.staleStores)
    && isFiniteNumber(value.unscoredActiveStores);
}

function isOnboardingSummary(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.paidStoresNotLive)
    && isFiniteNumber(value.pendingSubscriptions)
    && isFiniteNumber(value.storesWithoutPublishedMenu)
    && isFiniteNumber(value.storesMissingDistributionSurface)
    && (value.averageTimeToLiveHours === null || isFiniteNumber(value.averageTimeToLiveHours));
}

function isSupportSummary(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.openTickets)
    && isFiniteNumber(value.highPriorityOpenTickets)
    && isFiniteNumber(value.ticketsOpenedToday)
    && isFiniteNumber(value.storesWithRepeatedTickets);
}

function isStoreRow(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.tenantId === 'string'
    && typeof value.tenantName === 'string'
    && typeof value.storeId === 'string'
    && typeof value.storeName === 'string'
    && typeof value.planName === 'string'
    && typeof value.subscriptionStatus === 'string'
    && isFiniteNumber(value.mrrPaise)
    && typeof value.stage === 'string'
    && typeof value.paymentStatus === 'string'
    && typeof value.menuStatus === 'string'
    && typeof value.distributionStatus === 'string'
    && (value.truthScore === null || isFiniteNumber(value.truthScore))
    && isNullableString(value.lastPublishedAt)
    && (value.daysSincePublish === null || isFiniteNumber(value.daysSincePublish))
    && isFiniteNumber(value.supportOpenTickets)
    && isAllowedString(value.riskLevel, RISK_LEVELS)
    && isStringArray(value.riskReasons);
}

function isRevenueMovementRow(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && isNullableString(value.occurredAt)
    && typeof value.tenantId === 'string'
    && typeof value.storeId === 'string'
    && isAllowedString(value.kind, ['new_mrr', 'cash_collected', 'failed_payment', 'churn', 'refund', 'expansion_mrr', 'downgrade_mrr'])
    && isFiniteNumber(value.amountPaise)
    && typeof value.description === 'string';
}

function isDataGap(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.detail === 'string'
    && isAllowedString(value.severity, ['info', 'watch', 'action_required']);
}

function isSourceCoverage(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && isAllowedString(value.status, SOURCE_STATUSES)
    && isFiniteNumber(value.readLimit)
    && isFiniteNumber(value.documentsConsidered)
    && typeof value.detail === 'string';
}

function isFounderMonitorData(value: unknown): value is FounderMonitorData {
  return isRecord(value)
    && typeof value.generatedAt === 'string'
    && isFiniteNumber(value.periodDays)
    && typeof value.periodStart === 'string'
    && isAllowedString(value.status, MONITOR_STATUSES)
    && isScorecard(value.scorecard)
    && isRevenueSummary(value.revenue)
    && isGrowthSummary(value.growth)
    && isStoreTruthSummary(value.storeTruth)
    && isOnboardingSummary(value.onboarding)
    && isSupportSummary(value.support)
    && Array.isArray(value.storeRows)
    && value.storeRows.every(isStoreRow)
    && Array.isArray(value.revenueMovement)
    && value.revenueMovement.every(isRevenueMovementRow)
    && Array.isArray(value.dataGaps)
    && value.dataGaps.every(isDataGap)
    && Array.isArray(value.sourceCoverage)
    && value.sourceCoverage.every(isSourceCoverage);
}

function isFounderMonitorApiResponse(value: unknown): value is FounderMonitorApiResponse {
  return isRecord(value) && isFounderMonitorData(value.data);
}

function getFounderMonitorResponseContext(response: Response, days: number) {
  return {
    days,
    maxBytes: FOUNDER_MONITOR_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
  };
}

async function readFounderMonitorResponseJson(
  response: Response,
  days: number,
): Promise<unknown> {
  try {
    return await readJsonResponseWithLimit<unknown>(
      response,
      FOUNDER_MONITOR_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure(
      FOUNDER_MONITOR_RESPONSE_PARSE_FAILED,
      error,
      getFounderMonitorResponseContext(response, days),
    );
    return null;
  }
}

export async function getPlatformFounderMonitor(days = 30): Promise<FounderMonitorData> {
  const params = new URLSearchParams({ days: String(days) });
  const response = await fetch(`/api/platform/founder-monitor?${params.toString()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
  });
  const payload = await readFounderMonitorResponseJson(response, days);

  if (!response.ok) {
    const error = createFounderMonitorLoadError(response.status);
    logRuntimeFailure(
      FOUNDER_MONITOR_RESPONSE_REJECTED,
      error,
      getFounderMonitorResponseContext(response, days),
    );
    throw error;
  }

  if (!isFounderMonitorApiResponse(payload)) {
    const error = createFounderMonitorLoadError(response.status);
    logRuntimeFailure(
      FOUNDER_MONITOR_RESPONSE_INVALID,
      error,
      getFounderMonitorResponseContext(response, days),
    );
    throw error;
  }

  return payload.data;
}

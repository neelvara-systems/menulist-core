import type {
  ReportLeadOpsCost,
  ReportLeadOpsSnapshot,
  ReportLeadReportStatus,
  ReportLeadReportStatusFilter,
  ReportLeadRow,
} from '@lib/ops/reportLeadTypes';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const REPORT_LEAD_OPS_RESPONSE_JSON_MAX_BYTES = 192 * 1024;

const REPORT_LEAD_OPS_RESPONSE_PARSE_FAILED = 'report_lead_ops_response_parse_failed';
const REPORT_LEAD_OPS_RESPONSE_INVALID = 'report_lead_ops_response_invalid';
const REPORT_LEAD_OPS_RESPONSE_REJECTED = 'report_lead_ops_response_rejected';

const REPORT_STATUSES = ['ready', 'missing_basics', 'unclear', 'not_checked', 'manual_review_needed'];
const REPORT_STATUS_FILTERS = ['all', ...REPORT_STATUSES];

type ReportLeadOpsResponseLogContext = Record<string, boolean | number | string | null | undefined>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isReportStatus(value: unknown): value is ReportLeadReportStatus {
  return typeof value === 'string' && REPORT_STATUSES.includes(value);
}

function isReportStatusFilter(value: unknown): value is ReportLeadReportStatusFilter {
  return typeof value === 'string' && REPORT_STATUS_FILTERS.includes(value);
}

function isReportLeadRow(value: unknown): value is ReportLeadRow {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.status === 'string'
    && typeof value.sourceToolId === 'string'
    && isReportStatus(value.sourceReportStatus)
    && (value.sourcePrimaryNumber === null || isFiniteNumber(value.sourcePrimaryNumber))
    && isNullableString(value.businessName)
    && isNullableString(value.businessContext)
    && isNullableString(value.reportGeneratedAt)
    && isFiniteNumber(value.missingCount)
    && isFiniteNumber(value.unclearCount)
    && isFiniteNumber(value.notCheckedCount)
    && isNullableString(value.contactName)
    && isNullableString(value.workEmail)
    && isNullableString(value.phoneNumber)
    && isNullableString(value.helpTopic)
    && isNullableString(value.sourcePath)
    && typeof value.messagePreview === 'string'
    && typeof value.suggestedReply === 'string'
    && isNullableString(value.createdAt)
    && isNullableString(value.modifiedAt);
}

function isReportLeadOpsCost(value: unknown): value is ReportLeadOpsCost {
  return isRecord(value)
    && isFiniteNumber(value.enquiryReads)
    && value.writes === 0
    && isFiniteNumber(value.scanLimit)
    && typeof value.note === 'string';
}

function isReportLeadOpsSnapshot(value: unknown): value is ReportLeadOpsSnapshot {
  return isRecord(value)
    && typeof value.generatedAt === 'string'
    && isRecord(value.feature)
    && value.feature.dashboardEnabled === true
    && value.feature.accessModel === 'platform_role'
    && value.feature.realtimeListeners === false
    && isRecord(value.filters)
    && isReportStatusFilter(value.filters.reportStatus)
    && typeof value.filters.toolId === 'string'
    && isFiniteNumber(value.filters.limit)
    && isFiniteNumber(value.filters.scanLimit)
    && isRecord(value.counts)
    && isFiniteNumber(value.counts.scannedEnquiries)
    && isFiniteNumber(value.counts.reportLeadsInScan)
    && isFiniteNumber(value.counts.shown)
    && isFiniteNumber(value.counts.ready)
    && isFiniteNumber(value.counts.missingBasics)
    && isFiniteNumber(value.counts.unclear)
    && isFiniteNumber(value.counts.notChecked)
    && isFiniteNumber(value.counts.manualReviewNeeded)
    && Array.isArray(value.leads)
    && value.leads.every(isReportLeadRow)
    && isReportLeadOpsCost(value.cost);
}

export async function readReportLeadOpsSnapshotResponse(
  response: Response,
  context: ReportLeadOpsResponseLogContext = {},
): Promise<ReportLeadOpsSnapshot | null> {
  const logContext = {
    ...context,
    ...getBoundedRuntimeStringContext('endpoint', '/api/ops/report-leads'),
    maxBytes: REPORT_LEAD_OPS_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
  };

  let payload: unknown = null;

  try {
    payload = await readJsonResponseWithLimit<unknown>(
      response,
      REPORT_LEAD_OPS_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure(REPORT_LEAD_OPS_RESPONSE_PARSE_FAILED, error, logContext);
    return null;
  }

  if (!response.ok) {
    logRuntimeFailure(
      REPORT_LEAD_OPS_RESPONSE_REJECTED,
      new Error(REPORT_LEAD_OPS_RESPONSE_REJECTED),
      logContext,
    );
    return null;
  }

  if (!isReportLeadOpsSnapshot(payload)) {
    logRuntimeFailure(
      REPORT_LEAD_OPS_RESPONSE_INVALID,
      new Error(REPORT_LEAD_OPS_RESPONSE_INVALID),
      logContext,
    );
    return null;
  }

  return payload;
}

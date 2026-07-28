import type {
  WebsiteEnquiryKind,
  WebsiteEnquiryKindFilter,
  WebsiteEnquiryOpsCost,
  WebsiteEnquiryOpsSnapshot,
  WebsiteEnquiryRow,
  WebsiteEnquiryTopic,
  WebsiteEnquiryTopicFilter,
} from '@lib/ops/websiteEnquiryTypes';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const WEBSITE_ENQUIRY_OPS_RESPONSE_JSON_MAX_BYTES = 192 * 1024;

const KINDS = ['general', 'report'];
const KIND_FILTERS = ['all', ...KINDS];
const TOPICS = ['general', 'demo', 'multi-location', 'pricing', 'other'];
const TOPIC_FILTERS = ['all', ...TOPICS];

type WebsiteEnquiryResponseLogContext = Record<string, boolean | number | string | null | undefined>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isKind(value: unknown): value is WebsiteEnquiryKind {
  return typeof value === 'string' && KINDS.includes(value);
}

function isKindFilter(value: unknown): value is WebsiteEnquiryKindFilter {
  return typeof value === 'string' && KIND_FILTERS.includes(value);
}

function isTopic(value: unknown): value is WebsiteEnquiryTopic {
  return typeof value === 'string' && TOPICS.includes(value);
}

function isTopicFilter(value: unknown): value is WebsiteEnquiryTopicFilter {
  return typeof value === 'string' && TOPIC_FILTERS.includes(value);
}

function isWebsiteEnquiryRow(value: unknown): value is WebsiteEnquiryRow {
  return isRecord(value)
    && typeof value.id === 'string'
    && isKind(value.kind)
    && typeof value.status === 'string'
    && isNullableString(value.contactName)
    && isNullableString(value.workEmail)
    && isNullableString(value.phoneNumber)
    && isTopic(value.helpTopic)
    && isNullableString(value.sourcePath)
    && isNullableString(value.sourceToolId)
    && typeof value.message === 'string'
    && isNullableString(value.createdAt)
    && isNullableString(value.modifiedAt);
}

function isWebsiteEnquiryOpsCost(value: unknown): value is WebsiteEnquiryOpsCost {
  return isRecord(value)
    && value.authReads === 1
    && isFiniteNumber(value.enquiryReads)
    && value.writes === 0
    && isFiniteNumber(value.scanLimit)
    && typeof value.note === 'string';
}

function isWebsiteEnquiryOpsSnapshot(value: unknown): value is WebsiteEnquiryOpsSnapshot {
  return isRecord(value)
    && typeof value.generatedAt === 'string'
    && isRecord(value.feature)
    && value.feature.dashboardEnabled === true
    && value.feature.accessModel === 'platform_role'
    && value.feature.realtimeListeners === false
    && typeof value.feature.scanMayBeIncomplete === 'boolean'
    && isRecord(value.filters)
    && isKindFilter(value.filters.kind)
    && isTopicFilter(value.filters.topic)
    && isFiniteNumber(value.filters.limit)
    && isFiniteNumber(value.filters.scanLimit)
    && isRecord(value.counts)
    && isFiniteNumber(value.counts.scannedEnquiries)
    && isFiniteNumber(value.counts.menuListEnquiriesInScan)
    && isFiniteNumber(value.counts.shown)
    && isFiniteNumber(value.counts.new)
    && isFiniteNumber(value.counts.general)
    && isFiniteNumber(value.counts.report)
    && Array.isArray(value.enquiries)
    && value.enquiries.every(isWebsiteEnquiryRow)
    && isWebsiteEnquiryOpsCost(value.cost);
}

export async function readWebsiteEnquiryOpsSnapshotResponse(
  response: Response,
  context: WebsiteEnquiryResponseLogContext = {},
): Promise<WebsiteEnquiryOpsSnapshot | null> {
  const logContext = {
    ...context,
    ...getBoundedRuntimeStringContext('endpoint', '/api/ops/website-enquiries'),
    maxBytes: WEBSITE_ENQUIRY_OPS_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
  };

  let payload: unknown = null;
  try {
    payload = await readJsonResponseWithLimit<unknown>(
      response,
      WEBSITE_ENQUIRY_OPS_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure('website_enquiry_ops_response_parse_failed', error, logContext);
    return null;
  }

  if (!response.ok) {
    logRuntimeFailure(
      'website_enquiry_ops_response_rejected',
      new Error('website_enquiry_ops_response_rejected'),
      logContext,
    );
    return null;
  }

  if (!isWebsiteEnquiryOpsSnapshot(payload)) {
    logRuntimeFailure(
      'website_enquiry_ops_response_invalid',
      new Error('website_enquiry_ops_response_invalid'),
      logContext,
    );
    return null;
  }

  return payload;
}

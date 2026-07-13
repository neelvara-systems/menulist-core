import type {
  OwnerNotificationOpsActionResult,
  OwnerNotificationOpsCost,
  OwnerNotificationOpsDeliveryRow,
  OwnerNotificationOpsEventRow,
  OwnerNotificationOpsManualTemplate,
  OwnerNotificationOpsRecipient,
  OwnerNotificationOpsSnapshot,
} from '@lib/ops/ownerNotificationTypes';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const OWNER_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024;

const OWNER_NOTIFICATION_MONITOR_RESPONSE_PARSE_FAILED = 'owner_notification_monitor_response_parse_failed';
const OWNER_NOTIFICATION_MONITOR_RESPONSE_INVALID = 'owner_notification_monitor_response_invalid';
const OWNER_NOTIFICATION_MONITOR_RESPONSE_REJECTED = 'owner_notification_monitor_response_rejected';

type OwnerNotificationResponseKind = 'load' | 'action';
type OwnerNotificationResponseLogContext = Record<string, boolean | number | string | null | undefined>;

const PRODUCT_IDS = ['ML', 'AL'];
const PROCESS_STATUSES = ['pending', 'processing', 'delivered', 'partial', 'failed', 'skipped'];
const EVENT_STATUSES = [...PROCESS_STATUSES, 'invalid'];
const DELIVERY_STATUSES = ['sent', 'failed', 'skipped', 'rate_limited', 'invalid'];
const STATUS_FILTERS = ['all', ...EVENT_STATUSES];
const CHANNELS = ['email', 'whatsapp', 'invalid'];
const RECIPIENT_ROLES = ['primary_owner', 'billing_owner', 'support_owner', 'whatsapp_owner', 'invalid'];
const RESOLVED_RECIPIENT_ROLES = RECIPIENT_ROLES.filter((role) => role !== 'invalid');
const ACTIONS = ['retry', 'manualSend', 'manualHandoff'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isAllowedString(value: unknown, allowed: string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

function isMetadataPreviewValue(value: unknown): value is string | number | boolean | null {
  return value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || isFiniteNumber(value);
}

function isMetadataPreview(value: unknown): value is OwnerNotificationOpsEventRow['metadataPreview'] {
  return isRecord(value) && Object.values(value).every(isMetadataPreviewValue);
}

function isOwnerNotificationEventRow(value: unknown): value is OwnerNotificationOpsEventRow {
  return isRecord(value)
    && typeof value.id === 'string'
    && isAllowedString(value.productId, PRODUCT_IDS)
    && typeof value.triggerType === 'string'
    && typeof value.tenantId === 'string'
    && (value.storeId === undefined || typeof value.storeId === 'string')
    && (value.workspaceId === undefined || typeof value.workspaceId === 'string')
    && typeof value.referenceId === 'string'
    && isAllowedString(value.recipientRole, RECIPIENT_ROLES)
    && Array.isArray(value.requestedChannels)
    && value.requestedChannels.every((channel) => isAllowedString(channel, CHANNELS))
    && typeof value.priority === 'string'
    && isAllowedString(value.status, EVENT_STATUSES)
    && typeof value.sourcePath === 'string'
    && (value.error === undefined || isNullableString(value.error))
    && isNullableString(value.createdAt)
    && isNullableString(value.updatedAt)
    && isNullableString(value.processedAt)
    && (value.manualHandoffAt === undefined || isNullableString(value.manualHandoffAt))
    && (
      value.manualHandoffChannel === undefined
      || value.manualHandoffChannel === null
      || isAllowedString(value.manualHandoffChannel, CHANNELS)
    )
    && isMetadataPreview(value.metadataPreview);
}

function isOwnerNotificationDeliveryRow(value: unknown): value is OwnerNotificationOpsDeliveryRow {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.eventId === 'string'
    && isAllowedString(value.productId, PRODUCT_IDS)
    && typeof value.triggerType === 'string'
    && isAllowedString(value.channel, CHANNELS)
    && isAllowedString(value.recipientRole, RECIPIENT_ROLES)
    && typeof value.recipientMasked === 'string'
    && isAllowedString(value.status, DELIVERY_STATUSES)
    && (value.subject === undefined || isNullableString(value.subject))
    && typeof value.templateKey === 'string'
    && typeof value.templateVersion === 'string'
    && (value.providerMessageId === undefined || isNullableString(value.providerMessageId))
    && (value.error === undefined || isNullableString(value.error))
    && isNonNegativeSafeInteger(value.attempt)
    && value.attempt >= 1
    && isNullableString(value.createdAt)
    && isNullableString(value.sentAt)
    && (
      value.deliveryMode === undefined
      || value.deliveryMode === 'system'
      || value.deliveryMode === 'manual_handoff'
    );
}

function isOwnerNotificationRecipient(value: unknown): value is OwnerNotificationOpsRecipient {
  return isRecord(value)
    && isAllowedString(value.role, RESOLVED_RECIPIENT_ROLES)
    && (value.name === undefined || typeof value.name === 'string')
    && (value.email === undefined || typeof value.email === 'string')
    && (value.whatsappNumber === undefined || typeof value.whatsappNumber === 'string')
    && typeof value.whatsappConsent === 'boolean';
}

function isOwnerNotificationManualTemplate(value: unknown): value is OwnerNotificationOpsManualTemplate {
  return isRecord(value)
    && typeof value.subject === 'string'
    && typeof value.text === 'string'
    && typeof value.templateKey === 'string'
    && typeof value.templateVersion === 'string';
}

function isOwnerNotificationOpsCost(value: unknown): value is OwnerNotificationOpsCost {
  return isRecord(value)
    && isNonNegativeSafeInteger(value.authReads)
    && isNonNegativeSafeInteger(value.eventReads)
    && isNonNegativeSafeInteger(value.deliveryReads)
    && isNonNegativeSafeInteger(value.scopeReads)
    && isNonNegativeSafeInteger(value.countQueries)
    && isNonNegativeSafeInteger(value.writes)
    && isNonNegativeSafeInteger(value.scanLimit)
    && typeof value.note === 'string';
}

function isStatusCounts(value: unknown): value is OwnerNotificationOpsSnapshot['counts'] {
  return isRecord(value)
    && EVENT_STATUSES.every((status) => isNonNegativeSafeInteger(value[status]));
}

function isOwnerNotificationSnapshot(value: unknown): value is OwnerNotificationOpsSnapshot {
  return isRecord(value)
    && typeof value.generatedAt === 'string'
    && isRecord(value.feature)
    && typeof value.feature.dashboardEnabled === 'boolean'
    && value.feature.accessModel === 'current_persisted_platform_user'
    && value.feature.realtimeListeners === false
    && isAllowedString(value.feature.productId, PRODUCT_IDS)
    && isRecord(value.filters)
    && isAllowedString(value.filters.productId, PRODUCT_IDS)
    && isAllowedString(value.filters.status, STATUS_FILTERS)
    && isNonNegativeSafeInteger(value.filters.limit)
    && isNonNegativeSafeInteger(value.filters.scanLimit)
    && isStatusCounts(value.counts)
    && Array.isArray(value.events)
    && value.events.every(isOwnerNotificationEventRow)
    && (value.selectedEvent === undefined || isOwnerNotificationEventRow(value.selectedEvent))
    && (value.deliveries === undefined || (Array.isArray(value.deliveries) && value.deliveries.every(isOwnerNotificationDeliveryRow)))
    && (value.resolvedRecipient === undefined || isOwnerNotificationRecipient(value.resolvedRecipient))
    && (value.manualTemplate === undefined || isOwnerNotificationManualTemplate(value.manualTemplate))
    && (value.detailError === undefined || value.detailError === 'recipient_resolution_failed')
    && isOwnerNotificationOpsCost(value.cost);
}

function isOwnerNotificationActionResult(value: unknown): value is OwnerNotificationOpsActionResult {
  return isRecord(value)
    && value.ok === true
    && isAllowedString(value.action, ACTIONS)
    && typeof value.eventId === 'string'
    && (value.status === undefined || isAllowedString(value.status, PROCESS_STATUSES))
    && (value.sent === undefined || isNonNegativeSafeInteger(value.sent))
    && (value.failed === undefined || isNonNegativeSafeInteger(value.failed))
    && (value.skipped === undefined || isNonNegativeSafeInteger(value.skipped))
    && (value.manualEventId === undefined || typeof value.manualEventId === 'string')
    && (value.replayed === undefined || typeof value.replayed === 'boolean')
    && typeof value.message === 'string';
}

function getOwnerNotificationResponseContext(
  response: Response,
  kind: OwnerNotificationResponseKind,
  context: OwnerNotificationResponseLogContext = {},
): OwnerNotificationResponseLogContext {
  return {
    ...context,
    ...getBoundedRuntimeStringContext('responseKind', kind),
    maxBytes: OWNER_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
  };
}

async function readOwnerNotificationResponse<T>(
  response: Response,
  kind: OwnerNotificationResponseKind,
  isValid: (value: unknown) => value is T,
  context?: OwnerNotificationResponseLogContext,
): Promise<T | null> {
  const logContext = getOwnerNotificationResponseContext(response, kind, context);
  let payload: unknown = null;

  try {
    payload = await readJsonResponseWithLimit<unknown>(
      response,
      OWNER_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure(OWNER_NOTIFICATION_MONITOR_RESPONSE_PARSE_FAILED, error, logContext);
    return null;
  }

  if (!response.ok) {
    logRuntimeFailure(
      OWNER_NOTIFICATION_MONITOR_RESPONSE_REJECTED,
      new Error(OWNER_NOTIFICATION_MONITOR_RESPONSE_REJECTED),
      logContext,
    );
    return null;
  }

  if (!isValid(payload)) {
    logRuntimeFailure(
      OWNER_NOTIFICATION_MONITOR_RESPONSE_INVALID,
      new Error(OWNER_NOTIFICATION_MONITOR_RESPONSE_INVALID),
      logContext,
    );
    return null;
  }

  return payload;
}

export function readOwnerNotificationSnapshotResponse(
  response: Response,
  context?: OwnerNotificationResponseLogContext,
): Promise<OwnerNotificationOpsSnapshot | null> {
  return readOwnerNotificationResponse(response, 'load', isOwnerNotificationSnapshot, context);
}

export function readOwnerNotificationActionResponse(
  response: Response,
  context?: OwnerNotificationResponseLogContext,
): Promise<OwnerNotificationOpsActionResult | null> {
  return readOwnerNotificationResponse(response, 'action', isOwnerNotificationActionResult, context);
}

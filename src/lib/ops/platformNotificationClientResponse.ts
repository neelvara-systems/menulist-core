import type {
  PlatformNotificationActionResult,
  PlatformNotificationOpsCost,
  PlatformNotificationRow,
  PlatformNotificationSnapshot,
  PlatformNotificationSeverityFilter,
  PlatformNotificationStatusFilter,
} from '@lib/ops/platformNotificationTypes';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const PLATFORM_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024;

const PLATFORM_NOTIFICATION_MONITOR_RESPONSE_PARSE_FAILED = 'platform_notification_monitor_response_parse_failed';
const PLATFORM_NOTIFICATION_MONITOR_RESPONSE_INVALID = 'platform_notification_monitor_response_invalid';
const PLATFORM_NOTIFICATION_MONITOR_RESPONSE_REJECTED = 'platform_notification_monitor_response_rejected';

type PlatformNotificationResponseKind = 'load' | 'action';
type PlatformNotificationResponseLogContext = Record<string, boolean | number | string | null | undefined>;

const PRODUCT_IDS = ['PLATFORM', 'ML', 'AL', 'CC', 'MC'];
const CATEGORIES = [
  'cost',
  'security',
  'public_output',
  'scheduler',
  'payments',
  'owner_notifications',
  'ai',
  'extraction',
  'pos',
  'answerlattice',
  'manual',
  'system',
];
const SEVERITIES = ['info', 'warning', 'critical'];
const STATUS_FILTERS = ['active', 'acknowledged', 'all'];
const SEVERITY_FILTERS = ['all', ...SEVERITIES];
const CHANNELS = ['dashboard', 'telegram', 'email', 'whatsapp_web'];
const ACTIONS = ['acknowledge', 'manualHandoff', 'createManualAlert'];

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

function isMetadataPreviewValue(value: unknown): value is string | number | boolean | null {
  return value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || isFiniteNumber(value);
}

function isMetadataPreview(value: unknown): value is PlatformNotificationRow['metadataPreview'] {
  return isRecord(value) && Object.values(value).every(isMetadataPreviewValue);
}

function isPlatformNotificationRow(value: unknown): value is PlatformNotificationRow {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.triggerType === 'string'
    && isAllowedString(value.productId, PRODUCT_IDS)
    && isAllowedString(value.category, CATEGORIES)
    && isAllowedString(value.severity, SEVERITIES)
    && typeof value.title === 'string'
    && typeof value.message === 'string'
    && typeof value.tId === 'string'
    && typeof value.sId === 'string'
    && typeof value.acknowledged === 'boolean'
    && typeof value.actionRequired === 'boolean'
    && typeof value.actionTaken === 'boolean'
    && isNullableString(value.timestamp)
    && (value.acknowledgedAt === undefined || isNullableString(value.acknowledgedAt))
    && (value.acknowledgedBy === undefined || isNullableString(value.acknowledgedBy))
    && (value.manualHandoffAt === undefined || isNullableString(value.manualHandoffAt))
    && (
      value.manualHandoffChannel === undefined
      || value.manualHandoffChannel === null
      || isAllowedString(value.manualHandoffChannel, ['email', 'whatsapp_web'])
    )
    && isMetadataPreview(value.metadataPreview)
    && Array.isArray(value.channels)
    && value.channels.every((channel) => isAllowedString(channel, CHANNELS))
    && typeof value.runbook === 'string'
    && typeof value.immediate === 'boolean';
}

function isPlatformNotificationOpsCost(value: unknown): value is PlatformNotificationOpsCost {
  return isRecord(value)
    && isFiniteNumber(value.alertReads)
    && isFiniteNumber(value.countQueries)
    && isFiniteNumber(value.writes)
    && isFiniteNumber(value.scanLimit)
    && typeof value.note === 'string';
}

function isPlatformNotificationRegistryEntry(value: unknown): boolean {
  return isRecord(value)
    && typeof value.triggerType === 'string'
    && isAllowedString(value.productId, PRODUCT_IDS)
    && isAllowedString(value.category, CATEGORIES)
    && isAllowedString(value.severity, SEVERITIES)
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && Array.isArray(value.defaultChannels)
    && value.defaultChannels.every((channel) => isAllowedString(channel, CHANNELS))
    && typeof value.immediate === 'boolean'
    && typeof value.runbook === 'string';
}

function isPlatformNotificationSnapshot(value: unknown): value is PlatformNotificationSnapshot {
  return isRecord(value)
    && typeof value.generatedAt === 'string'
    && isRecord(value.feature)
    && typeof value.feature.dashboardEnabled === 'boolean'
    && value.feature.accessModel === 'platform_role'
    && value.feature.realtimeListeners === false
    && isRecord(value.filters)
    && isAllowedString(value.filters.status, STATUS_FILTERS)
    && isAllowedString(value.filters.severity, SEVERITY_FILTERS)
    && typeof value.filters.triggerType === 'string'
    && isFiniteNumber(value.filters.limit)
    && isFiniteNumber(value.filters.scanLimit)
    && isRecord(value.counts)
    && isFiniteNumber(value.counts.active)
    && isFiniteNumber(value.counts.acknowledged)
    && isFiniteNumber(value.counts.critical)
    && isFiniteNumber(value.counts.warning)
    && isFiniteNumber(value.counts.info)
    && Array.isArray(value.events)
    && value.events.every(isPlatformNotificationRow)
    && (value.selectedEvent === undefined || isPlatformNotificationRow(value.selectedEvent))
    && Array.isArray(value.registry)
    && value.registry.every(isPlatformNotificationRegistryEntry)
    && isPlatformNotificationOpsCost(value.cost);
}

function isPlatformNotificationActionResult(value: unknown): value is PlatformNotificationActionResult {
  return isRecord(value)
    && value.ok === true
    && isAllowedString(value.action, ACTIONS)
    && (value.eventId === undefined || typeof value.eventId === 'string')
    && typeof value.message === 'string';
}

function getPlatformNotificationResponseContext(
  response: Response,
  kind: PlatformNotificationResponseKind,
  context: PlatformNotificationResponseLogContext = {},
): PlatformNotificationResponseLogContext {
  return {
    ...context,
    ...getBoundedRuntimeStringContext('responseKind', kind),
    maxBytes: PLATFORM_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
  };
}

async function readPlatformNotificationResponse<T>(
  response: Response,
  kind: PlatformNotificationResponseKind,
  isValid: (value: unknown) => value is T,
  context?: PlatformNotificationResponseLogContext,
): Promise<T | null> {
  const logContext = getPlatformNotificationResponseContext(response, kind, context);
  let payload: unknown = null;

  try {
    payload = await readJsonResponseWithLimit<unknown>(
      response,
      PLATFORM_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure(PLATFORM_NOTIFICATION_MONITOR_RESPONSE_PARSE_FAILED, error, logContext);
    return null;
  }

  if (!response.ok) {
    logRuntimeFailure(
      PLATFORM_NOTIFICATION_MONITOR_RESPONSE_REJECTED,
      new Error(PLATFORM_NOTIFICATION_MONITOR_RESPONSE_REJECTED),
      logContext,
    );
    return null;
  }

  if (!isValid(payload)) {
    logRuntimeFailure(
      PLATFORM_NOTIFICATION_MONITOR_RESPONSE_INVALID,
      new Error(PLATFORM_NOTIFICATION_MONITOR_RESPONSE_INVALID),
      logContext,
    );
    return null;
  }

  return payload;
}

export function readPlatformNotificationSnapshotResponse(
  response: Response,
  context?: PlatformNotificationResponseLogContext,
): Promise<PlatformNotificationSnapshot | null> {
  return readPlatformNotificationResponse(response, 'load', isPlatformNotificationSnapshot, context);
}

export function readPlatformNotificationActionResponse(
  response: Response,
  context?: PlatformNotificationResponseLogContext,
): Promise<PlatformNotificationActionResult | null> {
  return readPlatformNotificationResponse(response, 'action', isPlatformNotificationActionResult, context);
}

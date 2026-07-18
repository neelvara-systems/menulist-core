import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type {
  MessagingOnboardingOpsAlert,
  MessagingOnboardingOpsEvent,
  MessagingOnboardingOpsHealth,
  MessagingOnboardingOpsSession,
  MessagingOnboardingOpsSnapshot,
  MessagingOnboardingOpsStatus,
} from '@lib/ops/messagingOnboardingTypes';

export const MESSAGING_ONBOARDING_HEALTH_ALERT_LIMIT = 8;
export const MESSAGING_ONBOARDING_RECENT_ALERT_LIMIT = 8;
export const MESSAGING_ONBOARDING_RECENT_EVENT_LIMIT = 12;
export const MESSAGING_ONBOARDING_RECENT_SESSION_LIMIT = 8;

const MAX_METADATA_KEYS = 40;
const MAX_METADATA_STRING_LENGTH = 96;
const MAX_METRIC_KEYS = 64;
const MAX_OPS_LABEL_LENGTH = 96;
const RUN_METRIC_KEYS = new Set(['inboundProcessed', 'processed', 'errors']);
const HEALTH_METRIC_KEYS = new Set([
  'sessionsStarted',
  'publishedSessions',
  'publishRate',
  'processingRuns',
  'failedEvents',
  'eventsByType',
]);
const HEALTH_COST_KEYS = new Set([
  'currency',
  'estimatedAiCostInr',
  'estimatedCostPerPublishInr',
  'targetCostPerPublishInr',
  'alertCostPerPublishInr',
]);
const HEALTH_RETENTION_KEYS = new Set([
  'publishedSourceBytesSampled',
  'liveSessionsSampled',
  'warnBytes',
  'criticalBytes',
]);

const SAFE_METADATA_KEYS = new Set([
  'attempts',
  'businessType',
  'categoryCount',
  'completeness',
  'confidence',
  'currentCount',
  'exhausted',
  'fileCount',
  'fileSize',
  'fromState',
  'hasMedia',
  'invalidCount',
  'itemCount',
  'maxSize',
  'menuCompleteness',
  'messageLength',
  'messageType',
  'metadataDroppedCount',
  'mimeType',
  'processingRuns',
  'processingTime',
  'qualityScore',
  'reason',
  'reportedSize',
  'runs',
  'targetPublishRate',
  'toState',
  'trigger',
  'uploadCount',
  'uploadIndex',
  'validCount',
]);

const BOUNDED_METADATA_KEYS = new Set([
  'businessName',
  'dashboardUrl',
  'extractionJobId',
  'imageUrl',
  'ip',
  'messageId',
  'path',
  'phone',
  'phoneNumber',
  'previewUrl',
  'projectId',
  'providerMessageId',
  'providerUserId',
  'publicUrl',
  'sessionId',
  'sha256',
  'storagePath',
  'storageUrl',
  'storeId',
  'tempProjectId',
  'tenantId',
]);

type OpsMetadataValue = boolean | number | string | null;
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength = MAX_OPS_LABEL_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function readOptionalNonNegativeFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= Number.MAX_SAFE_INTEGER
    ? value
    : undefined;
}

function readOptionalNonNegativeSafeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

export function isNonNegativeSafeInteger(value: unknown): value is number {
  return readOptionalNonNegativeSafeInteger(value) !== undefined;
}

function readOptionalRatio(value: unknown): number | undefined {
  const candidate = readOptionalNonNegativeFiniteNumber(value);
  return candidate !== undefined && candidate <= 1 ? candidate : undefined;
}

function setOptionalNumber(
  target: object,
  key: string,
  value: number | undefined,
): void {
  if (value !== undefined) Object.assign(target, { [key]: value });
}

function normalizeCounterRecord(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;
  const normalized: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, MAX_METRIC_KEYS)) {
    const key = cleanString(rawKey, 64);
    const count = readOptionalNonNegativeSafeInteger(rawValue);
    if (key && count !== undefined) normalized[key] = count;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeMessagingOnboardingTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  try {
    let date: Date | null = null;
    if (value instanceof Date) {
      date = value;
    } else if (isRecord(value) && typeof value.toDate === 'function') {
      const candidate = value.toDate.call(value);
      date = candidate instanceof Date ? candidate : null;
    } else if (isRecord(value) && typeof value.seconds === 'number' && Number.isFinite(value.seconds)) {
      date = new Date(value.seconds * 1000);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      date = new Date(value);
    } else if (typeof value === 'string' && value.length > 0 && value.trim() === value) {
      date = new Date(value);
    }
    return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

export function normalizeMessagingHealthSnapshotId(value: unknown): string | null {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > 160
    || value.trim() !== value
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }
  return isValidFirestoreDocumentId(value) ? value : null;
}

function normalizeStatus(value: unknown): MessagingOnboardingOpsStatus {
  return value === 'healthy' || value === 'degraded' || value === 'critical'
    ? value
    : 'unknown';
}

function getStoredTextContext(label: string, value: unknown): Record<string, boolean | number> {
  const text = typeof value === 'string' ? value : '';
  return {
    [`${label}Present`]: text.length > 0,
    [`${label}Length`]: text.length,
  };
}

function normalizeAlertSeverity(value: unknown): 'info' | 'warning' | 'critical' {
  const severity = cleanString(value, 40).toLowerCase();
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'info';
}

function buildAlertTitle(severity: 'info' | 'warning' | 'critical'): string {
  return `Messaging onboarding ${severity} alert`;
}

function buildAlertMessage(value: UnknownRecord): string {
  const context = {
    ...getStoredTextContext('key', value.key),
    ...getStoredTextContext('title', value.title),
    ...getStoredTextContext('message', value.message),
  };
  const parts = [
    context.keyPresent ? `key=${context.keyLength}` : null,
    context.titlePresent ? `title=${context.titleLength}` : null,
    context.messagePresent ? `message=${context.messageLength}` : null,
  ].filter(Boolean);
  return parts.length > 0
    ? `Stored alert text present (${parts.join(', ')} chars).`
    : 'No stored alert text.';
}

function normalizeHealthAlerts(value: unknown): MessagingOnboardingOpsHealth['alerts'] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MESSAGING_ONBOARDING_HEALTH_ALERT_LIMIT).map((alert, index) => {
    const source = isRecord(alert) ? alert : {};
    const severity = normalizeAlertSeverity(source.severity) === 'critical' ? 'critical' : 'warning';
    return {
      key: `health-alert-${index}`,
      severity,
      title: buildAlertTitle(severity),
      message: buildAlertMessage(source),
    };
  });
}

export function normalizeMessagingOnboardingOpsHealth(
  value: unknown,
  responseId: string | null,
): MessagingOnboardingOpsHealth {
  const source = isRecord(value) ? value : {};
  const runMetricsSource = isRecord(source.runMetrics) ? source.runMetrics : {};
  const metricsSource = isRecord(source.metrics) ? source.metrics : {};
  const costsSource = isRecord(source.costs) ? source.costs : {};
  const retentionSource = isRecord(source.retention) ? source.retention : {};

  const runMetrics: MessagingOnboardingOpsHealth['runMetrics'] = {};
  setOptionalNumber(runMetrics, 'inboundProcessed', readOptionalNonNegativeSafeInteger(runMetricsSource.inboundProcessed));
  setOptionalNumber(runMetrics, 'processed', readOptionalNonNegativeSafeInteger(runMetricsSource.processed));
  setOptionalNumber(runMetrics, 'errors', readOptionalNonNegativeSafeInteger(runMetricsSource.errors));

  const metrics: MessagingOnboardingOpsHealth['metrics'] = {};
  setOptionalNumber(metrics, 'sessionsStarted', readOptionalNonNegativeSafeInteger(metricsSource.sessionsStarted));
  setOptionalNumber(metrics, 'publishedSessions', readOptionalNonNegativeSafeInteger(metricsSource.publishedSessions));
  setOptionalNumber(metrics, 'publishRate', readOptionalRatio(metricsSource.publishRate));
  setOptionalNumber(metrics, 'processingRuns', readOptionalNonNegativeSafeInteger(metricsSource.processingRuns));
  setOptionalNumber(metrics, 'failedEvents', readOptionalNonNegativeSafeInteger(metricsSource.failedEvents));
  const eventsByType = normalizeCounterRecord(metricsSource.eventsByType);
  if (eventsByType) metrics.eventsByType = eventsByType;

  const costs: MessagingOnboardingOpsHealth['costs'] = {};
  if (costsSource.currency === 'INR') costs.currency = 'INR';
  setOptionalNumber(costs, 'estimatedAiCostInr', readOptionalNonNegativeFiniteNumber(costsSource.estimatedAiCostInr));
  setOptionalNumber(costs, 'estimatedCostPerPublishInr', readOptionalNonNegativeFiniteNumber(costsSource.estimatedCostPerPublishInr));
  setOptionalNumber(costs, 'targetCostPerPublishInr', readOptionalNonNegativeFiniteNumber(costsSource.targetCostPerPublishInr));
  setOptionalNumber(costs, 'alertCostPerPublishInr', readOptionalNonNegativeFiniteNumber(costsSource.alertCostPerPublishInr));

  const retention: MessagingOnboardingOpsHealth['retention'] = {};
  setOptionalNumber(retention, 'publishedSourceBytesSampled', readOptionalNonNegativeSafeInteger(retentionSource.publishedSourceBytesSampled));
  setOptionalNumber(retention, 'liveSessionsSampled', readOptionalNonNegativeSafeInteger(retentionSource.liveSessionsSampled));
  setOptionalNumber(retention, 'warnBytes', readOptionalNonNegativeSafeInteger(retentionSource.warnBytes));
  setOptionalNumber(retention, 'criticalBytes', readOptionalNonNegativeSafeInteger(retentionSource.criticalBytes));

  return {
    id: responseId,
    status: normalizeStatus(source.status),
    windowStart: normalizeMessagingOnboardingTimestamp(source.windowStart),
    windowEnd: normalizeMessagingOnboardingTimestamp(source.windowEnd),
    runMetrics,
    metrics,
    costs,
    retention,
    alerts: normalizeHealthAlerts(source.alerts),
  };
}

function isSafeMetadataKey(key: string): boolean {
  return SAFE_METADATA_KEYS.has(key) || /^[A-Za-z][A-Za-z0-9]*(Present|Length)$/.test(key);
}

function setMetadataValue(
  target: Record<string, OpsMetadataValue>,
  key: string,
  value: OpsMetadataValue,
): boolean {
  if (Object.keys(target).length >= MAX_METADATA_KEYS) return false;
  target[key] = value;
  return true;
}

export function sanitizeMessagingOnboardingOpsMetadata(value: unknown): Record<string, OpsMetadataValue> {
  if (!isRecord(value)) return {};
  const sanitized: Record<string, OpsMetadataValue> = {};
  let droppedCount = 0;

  for (const [key, entry] of Object.entries(value)) {
    if (BOUNDED_METADATA_KEYS.has(key)) {
      const context = getStoredTextContext(key, entry);
      const inserted = Object.entries(context).every(([contextKey, contextValue]) => (
        setMetadataValue(sanitized, contextKey, contextValue)
      ));
      if (!inserted) droppedCount += 1;
      continue;
    }
    if (!isSafeMetadataKey(key)) {
      droppedCount += 1;
      continue;
    }
    if (entry === null) {
      if (!setMetadataValue(sanitized, key, null)) droppedCount += 1;
      continue;
    }
    if (typeof entry === 'boolean') {
      if (!setMetadataValue(sanitized, key, entry)) droppedCount += 1;
      continue;
    }
    const numberValue = readOptionalNonNegativeFiniteNumber(entry);
    if (numberValue !== undefined) {
      if (!setMetadataValue(sanitized, key, numberValue)) droppedCount += 1;
      continue;
    }
    if (typeof entry === 'string') {
      const normalized = cleanString(entry, MAX_METADATA_STRING_LENGTH);
      if (!setMetadataValue(sanitized, key, normalized)) droppedCount += 1;
      continue;
    }
    droppedCount += 1;
  }

  if (droppedCount > 0 && Object.keys(sanitized).length < MAX_METADATA_KEYS) {
    sanitized.metadataDroppedCount = droppedCount;
  }
  return sanitized;
}

export function maskMessagingOnboardingOpsDisplayId(value: unknown): string {
  const normalized = cleanString(value, 160);
  return normalized ? `****${normalized.slice(-4)}` : '****';
}

export function normalizeMessagingOnboardingOpsEvent(
  value: unknown,
  responseId: string,
  sessionResponseId: string,
): MessagingOnboardingOpsEvent {
  const source = isRecord(value) ? value : {};
  const errorSource = isRecord(source.error) ? source.error : null;
  const errorCode = errorSource ? cleanString(errorSource.code, 64) : '';
  return {
    id: responseId,
    eventType: cleanString(source.eventType, 64) || 'UNKNOWN',
    provider: cleanString(source.provider, 32) || '-',
    sessionId: sessionResponseId,
    sessionState: cleanString(source.sessionState, 64) || '-',
    userIdMasked: maskMessagingOnboardingOpsDisplayId(source.userIdMasked),
    timestamp: normalizeMessagingOnboardingTimestamp(source.timestamp),
    metadata: sanitizeMessagingOnboardingOpsMetadata(source.metadata),
    ...(errorCode ? {
      error: {
        code: errorCode,
        ...(typeof errorSource?.retryable === 'boolean' ? { retryable: errorSource.retryable } : {}),
      },
    } : {}),
  };
}

export function normalizeMessagingOnboardingOpsSession(
  value: unknown,
  responseId: string,
): MessagingOnboardingOpsSession {
  const source = isRecord(value) ? value : {};
  return {
    id: responseId,
    provider: cleanString(source.provider, 32) || '-',
    state: cleanString(source.state, 64) || '-',
    providerDisplayIdMasked: maskMessagingOnboardingOpsDisplayId(source.providerDisplayId),
    uploadCount: Array.isArray(source.uploads) ? source.uploads.length : 0,
    processingRuns: readOptionalNonNegativeSafeInteger(source.processingRuns) ?? 0,
    updatedAt: normalizeMessagingOnboardingTimestamp(source.updatedAt),
    createdAt: normalizeMessagingOnboardingTimestamp(source.createdAt),
  };
}

export function normalizeMessagingOnboardingOpsAlert(
  value: unknown,
  responseId: string,
): MessagingOnboardingOpsAlert {
  const source = isRecord(value) ? value : {};
  const severity = normalizeAlertSeverity(source.severity);
  return {
    id: responseId,
    severity,
    title: buildAlertTitle(severity),
    message: buildAlertMessage(source),
    timestamp: normalizeMessagingOnboardingTimestamp(source.timestamp),
    acknowledged: source.acknowledged === true,
  };
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isNullableCanonicalIsoTimestamp(value: unknown): value is string | null {
  return value === null || isCanonicalIsoTimestamp(value);
}

function isBoundedString(value: unknown, maxLength = MAX_OPS_LABEL_LENGTH): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function hasOnlyKeys(value: UnknownRecord, allowed: Set<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isResponseId(value: unknown, prefix: 'alert' | 'event' | 'health' | 'session'): value is string {
  return typeof value === 'string' && new RegExp(`^${prefix}-[a-f0-9]{12}$`).test(value);
}

function isMaskedDisplayId(value: unknown): value is string {
  return typeof value === 'string' && /^\*{4}.{0,4}$/.test(value);
}

function isNumberRecord(value: unknown, maxEntries = MAX_METRIC_KEYS): value is Record<string, number> {
  return isRecord(value)
    && Object.keys(value).length <= maxEntries
    && Object.entries(value).every(([key, entry]) => (
      isBoundedString(key, 64) && isNonNegativeSafeInteger(entry)
    ));
}

function isOptionalNumberRecord(value: unknown, allowed: Set<string>): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, allowed)
    && Object.keys(value).length <= MAX_METRIC_KEYS
    && Object.values(value).every((entry) => (
      typeof entry === 'number'
      && Number.isFinite(entry)
      && entry >= 0
      && entry <= Number.MAX_SAFE_INTEGER
    ));
}

function isHealthMetricRecord(value: unknown): value is UnknownRecord {
  return isRecord(value)
    && hasOnlyKeys(value, HEALTH_METRIC_KEYS)
    && Object.keys(value).length <= MAX_METRIC_KEYS
    && Object.entries(value).every(([key, entry]) => (
      key === 'eventsByType'
        ? isNumberRecord(entry)
        : typeof entry === 'number'
          && Number.isFinite(entry)
          && entry >= 0
          && entry <= Number.MAX_SAFE_INTEGER
    ));
}

function isHealthCostRecord(value: unknown): value is UnknownRecord {
  return isRecord(value)
    && hasOnlyKeys(value, HEALTH_COST_KEYS)
    && Object.keys(value).length <= MAX_METRIC_KEYS
    && Object.entries(value).every(([key, entry]) => (
      key === 'currency'
        ? entry === 'INR'
        : typeof entry === 'number'
          && Number.isFinite(entry)
          && entry >= 0
          && entry <= Number.MAX_SAFE_INTEGER
    ));
}

function isOpsMetadata(value: unknown): boolean {
  return isRecord(value)
    && Object.keys(value).length <= MAX_METADATA_KEYS
    && Object.values(value).every((entry) => (
      entry === null
      || typeof entry === 'boolean'
      || typeof entry === 'number' && Number.isFinite(entry) && entry >= 0
      || typeof entry === 'string'
        && entry.length <= MAX_METADATA_STRING_LENGTH
        && cleanString(entry, MAX_METADATA_STRING_LENGTH) === entry
    ));
}

export function isMessagingOnboardingOpsSnapshotResponse(
  value: unknown,
): value is MessagingOnboardingOpsSnapshot {
  if (!isRecord(value) || !isCanonicalIsoTimestamp(value.generatedAt)) return false;
  if (
    !isRecord(value.feature)
    || value.feature.dashboardEnabled !== true
    || value.feature.providerMode !== 'official_cloud_api'
    || value.feature.accessModel !== 'current_persisted_platform_user'
  ) return false;
  if (!isRecord(value.health)) return false;
  if (
    !(value.health.id === null || isResponseId(value.health.id, 'health'))
    || !['healthy', 'degraded', 'critical', 'unknown'].includes(String(value.health.status))
    || !isNullableCanonicalIsoTimestamp(value.health.windowStart)
    || !isNullableCanonicalIsoTimestamp(value.health.windowEnd)
    || !isOptionalNumberRecord(value.health.runMetrics, RUN_METRIC_KEYS)
    || !isHealthMetricRecord(value.health.metrics)
    || !isHealthCostRecord(value.health.costs)
    || !isOptionalNumberRecord(value.health.retention, HEALTH_RETENTION_KEYS)
    || !Array.isArray(value.health.alerts)
    || value.health.alerts.length > MESSAGING_ONBOARDING_HEALTH_ALERT_LIMIT
    || !value.health.alerts.every((alert) => (
      isRecord(alert)
      && isBoundedString(alert.key, 64)
      && (alert.severity === 'warning' || alert.severity === 'critical')
      && isBoundedString(alert.title, 120)
      && isBoundedString(alert.message, 260)
    ))
  ) return false;
  const metrics = value.health.metrics;
  if (metrics.publishRate !== undefined && readOptionalRatio(metrics.publishRate) === undefined) return false;
  if (metrics.eventsByType !== undefined && !isNumberRecord(metrics.eventsByType)) return false;
  const costs = value.health.costs;
  if (costs.currency !== undefined && costs.currency !== 'INR') return false;
  if (!isRecord(value.webhookWindow) || ![
    'hours',
    'recentEventsShown',
    'invalidSignatures',
    'inboundQueued',
    'inboundProcessed',
    'inboundFailed',
    'messageSent',
    'messageSendFailed',
    'providerMediaDownloadFailed',
  ].every((key) => isNonNegativeSafeInteger(value.webhookWindow?.[key]))) return false;
  if (!isRecord(value.inboundQueue) || !['pending', 'processing', 'failed']
    .every((key) => isNonNegativeSafeInteger(value.inboundQueue?.[key]))) return false;
  if (!isNumberRecord(value.sessionsByState, 16)) return false;
  if (!Array.isArray(value.recentSessions) || value.recentSessions.length > MESSAGING_ONBOARDING_RECENT_SESSION_LIMIT) return false;
  if (!value.recentSessions.every((session) => (
    isRecord(session)
    && isResponseId(session.id, 'session')
    && isBoundedString(session.provider, 32)
    && isBoundedString(session.state, 64)
    && isMaskedDisplayId(session.providerDisplayIdMasked)
    && isNonNegativeSafeInteger(session.uploadCount)
    && isNonNegativeSafeInteger(session.processingRuns)
    && isNullableCanonicalIsoTimestamp(session.updatedAt)
    && isNullableCanonicalIsoTimestamp(session.createdAt)
  ))) return false;
  if (!Array.isArray(value.recentEvents) || value.recentEvents.length > MESSAGING_ONBOARDING_RECENT_EVENT_LIMIT) return false;
  if (!value.recentEvents.every((event) => (
    isRecord(event)
    && isResponseId(event.id, 'event')
    && isBoundedString(event.eventType, 64)
    && isBoundedString(event.provider, 32)
    && isResponseId(event.sessionId, 'session')
    && isBoundedString(event.sessionState, 64)
    && isMaskedDisplayId(event.userIdMasked)
    && isNullableCanonicalIsoTimestamp(event.timestamp)
    && isOpsMetadata(event.metadata)
    && (event.error === undefined || (
      isRecord(event.error)
      && (event.error.code === undefined || isBoundedString(event.error.code, 64))
      && (event.error.retryable === undefined || typeof event.error.retryable === 'boolean')
    ))
  ))) return false;
  if (!Array.isArray(value.recentAlerts) || value.recentAlerts.length > MESSAGING_ONBOARDING_RECENT_ALERT_LIMIT) return false;
  return value.recentAlerts.every((alert) => (
    isRecord(alert)
    && isResponseId(alert.id, 'alert')
    && ['info', 'warning', 'critical'].includes(String(alert.severity))
    && isBoundedString(alert.title, 120)
    && isBoundedString(alert.message, 260)
    && isNullableCanonicalIsoTimestamp(alert.timestamp)
    && typeof alert.acknowledged === 'boolean'
  ));
}

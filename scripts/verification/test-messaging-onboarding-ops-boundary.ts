import assert from 'node:assert/strict';
import {
  isMessagingOnboardingOpsSnapshotResponse,
  maskMessagingOnboardingOpsDisplayId,
  normalizeMessagingHealthSnapshotId,
  normalizeMessagingOnboardingOpsEvent,
  normalizeMessagingOnboardingOpsHealth,
  normalizeMessagingOnboardingOpsSession,
  sanitizeMessagingOnboardingOpsMetadata,
} from '../../src/lib/ops/messagingOnboardingOpsBoundary';
import type { MessagingOnboardingOpsSnapshot } from '../../src/lib/ops/messagingOnboardingTypes';

const timestamp = {
  toDate: () => new Date('2026-07-13T09:30:00.000Z'),
};

function createValidSnapshot(): MessagingOnboardingOpsSnapshot {
  return {
    generatedAt: '2026-07-13T09:30:00.000Z',
    feature: {
      dashboardEnabled: true,
      providerMode: 'official_cloud_api',
      accessModel: 'current_persisted_platform_user',
    },
    health: normalizeMessagingOnboardingOpsHealth({
      status: 'healthy',
      windowStart: { seconds: Date.parse('2026-07-12T09:30:00.000Z') / 1000 },
      windowEnd: timestamp,
      runMetrics: { inboundProcessed: 3, processed: 2, errors: 0 },
      metrics: {
        sessionsStarted: 4,
        publishedSessions: 2,
        publishRate: 0.5,
        processingRuns: 3,
        failedEvents: 0,
        eventsByType: { SESSION_CREATED: 4 },
        invalidSessionRecords: 1,
      },
      costs: {
        currency: 'INR',
        estimatedAiCostInr: 2.5,
        estimatedCostPerPublishInr: 1.25,
        targetCostPerPublishInr: 10,
        alertCostPerPublishInr: 15,
      },
      retention: {
        retainPublishedSourceFiles: true,
        reviewAfterDays: 90,
        publishedSourceBytesSampled: 1024,
        liveSessionsSampled: 2,
        invalidUploadRecords: 1,
        warnBytes: 2048,
        criticalBytes: 4096,
      },
      alerts: Array.from({ length: 20 }, (_, index) => ({
        key: `alert-${index}`,
        severity: index === 0 ? 'critical' : 'warning',
        title: 'stored title',
        message: 'stored message',
      })),
    }, 'health-abcdef123456'),
    webhookWindow: {
      hours: 24,
      recentEventsShown: 1,
      invalidSignatures: 0,
      inboundQueued: 1,
      inboundProcessed: 1,
      inboundFailed: 0,
      messageSent: 1,
      messageSendFailed: 0,
      providerMediaDownloadFailed: 0,
    },
    inboundQueue: { pending: 0, processing: 1, failed: 0 },
    sessionsByState: { COLLECTING_INPUT: 1 },
    recentSessions: [],
    recentEvents: [],
    recentAlerts: [],
  };
}

function testHealthProducerProjection(): void {
  const snapshot = createValidSnapshot();
  assert.equal(snapshot.health.retention.publishedSourceBytesSampled, 1024);
  assert.equal('retainPublishedSourceFiles' in snapshot.health.retention, false);
  assert.equal('reviewAfterDays' in snapshot.health.retention, false);
  assert.equal('invalidSessionRecords' in snapshot.health.metrics, false);
  assert.equal(snapshot.health.alerts.length, 8);
  assert.equal(snapshot.health.alerts[0].title, 'Messaging onboarding critical alert');
  assert.equal(snapshot.health.alerts[0].message.includes('stored title'), false);
  assert.equal(isMessagingOnboardingOpsSnapshotResponse(snapshot), true);
}

function testStrictStoredIdentifierBoundary(): void {
  assert.equal(normalizeMessagingHealthSnapshotId('messaging_onboarding_20260713_09'), 'messaging_onboarding_20260713_09');
  assert.equal(normalizeMessagingHealthSnapshotId(' messaging_onboarding_20260713_09'), null);
  assert.equal(normalizeMessagingHealthSnapshotId('messaging/onboarding'), null);
  assert.equal(normalizeMessagingHealthSnapshotId('__reserved__'), null);
  assert.equal(normalizeMessagingHealthSnapshotId('bad\u0000id'), null);
  assert.equal(normalizeMessagingHealthSnapshotId({ toString: () => 'valid-looking-id' }), null);
}

function testEventAndMetadataProjection(): void {
  const event = normalizeMessagingOnboardingOpsEvent({
    eventType: ' MESSAGE_SENT\u0000 ',
    provider: 'whatsapp',
    sessionState: 'LIVE',
    userIdMasked: 'raw-user-12345678',
    timestamp,
    metadata: {
      phoneNumber: '+91 99999 99999',
      reason: ' safe\u0000reason ',
      itemCount: 5,
      invalidCount: -1,
      secret: 'must not leave the server',
    },
    error: {
      code: ' SEND_FAILED\u0000 ',
      retryable: true,
      message: 'provider secret text',
    },
  }, 'event-123', 'session-123');

  assert.equal(event.eventType, 'MESSAGE_SENT');
  assert.equal(event.userIdMasked, '****5678');
  assert.deepEqual(event.metadata, {
    phoneNumberPresent: true,
    phoneNumberLength: 15,
    reason: 'safe reason',
    itemCount: 5,
    metadataDroppedCount: 2,
  });
  assert.deepEqual(event.error, { code: 'SEND_FAILED', retryable: true });
}

function testSessionProjectionDoesNotCoerceStoredValues(): void {
  const session = normalizeMessagingOnboardingOpsSession({
    provider: { value: 'whatsapp' },
    state: 'PROCESSING_MENU',
    providerDisplayId: 919999999999,
    processingRuns: '9',
    uploads: [{}, {}],
    updatedAt: ' 2026-07-13T09:30:00.000Z ',
  }, 'session-123');
  assert.equal(session.provider, '-');
  assert.equal(session.providerDisplayIdMasked, '****');
  assert.equal(session.processingRuns, 0);
  assert.equal(session.uploadCount, 2);
  assert.equal(session.updatedAt, null);
  assert.equal(maskMessagingOnboardingOpsDisplayId('1234567890'), '****7890');
}

function testMetadataCardinalityAndSnapshotRejection(): void {
  const metadata = sanitizeMessagingOnboardingOpsMetadata(Object.fromEntries(
    Array.from({ length: 80 }, (_, index) => [`safe${index}Present`, true]),
  ));
  assert.ok(Object.keys(metadata).length <= 40);

  const negativeCount = structuredClone(createValidSnapshot());
  negativeCount.inboundQueue.pending = -1;
  assert.equal(isMessagingOnboardingOpsSnapshotResponse(negativeCount), false);

  const nonCanonicalTime = structuredClone(createValidSnapshot());
  nonCanonicalTime.generatedAt = '2026-07-13T15:00:00+05:30';
  assert.equal(isMessagingOnboardingOpsSnapshotResponse(nonCanonicalTime), false);

  const leakedRetentionShape = structuredClone(createValidSnapshot()) as unknown as {
    health: { retention: Record<string, unknown> };
  };
  leakedRetentionShape.health.retention.retainPublishedSourceFiles = true;
  assert.equal(isMessagingOnboardingOpsSnapshotResponse(leakedRetentionShape), false);
}

testHealthProducerProjection();
testStrictStoredIdentifierBoundary();
testEventAndMetadataProjection();
testSessionProjectionDoesNotCoerceStoredValues();
testMetadataCardinalityAndSnapshotRejection();

console.log('Messaging onboarding ops boundary tests passed');

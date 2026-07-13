#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
  buildOwnerNotificationWindow,
  buildPlatformNotificationWindow,
} from '../../src/lib/ops/notificationOpsSnapshotBoundary';
import type { OwnerNotificationOpsEventRow } from '../../src/lib/ops/ownerNotificationTypes';
import type { PlatformNotificationRow } from '../../src/lib/ops/platformNotificationTypes';

const platformRow = (
  id: string,
  timestamp: string | null,
  acknowledged: boolean,
  severity: PlatformNotificationRow['severity'],
  triggerType = 'TEST_ALERT',
): PlatformNotificationRow => ({
  id,
  triggerType,
  productId: 'PLATFORM',
  category: 'system',
  severity,
  title: 'Test alert',
  message: 'Stored alert text present.',
  tId: 'system',
  sId: 'system',
  acknowledged,
  actionRequired: severity === 'critical',
  actionTaken: false,
  timestamp,
  metadataPreview: {},
  channels: ['dashboard'],
  runbook: 'Inspect the bounded test event.',
  immediate: false,
});

const platformWindow = buildPlatformNotificationWindow({
  rows: [
    platformRow('old-active', '2026-07-12T00:00:00.000Z', false, 'warning'),
    platformRow('new-acknowledged', '2026-07-13T00:00:00.000Z', true, 'critical'),
    platformRow('malformed-time', 'not-a-time', false, 'info', 'OTHER_ALERT'),
  ],
  status: 'all',
  severity: 'all',
  triggerType: 'all',
  limit: 2,
});

assert.deepEqual(platformWindow.counts, {
  active: 2,
  acknowledged: 1,
  critical: 1,
  warning: 1,
  info: 1,
});
assert.deepEqual(
  platformWindow.events.map((row) => row.id),
  ['new-acknowledged', 'old-active'],
  'platform rows must be newest-first and limited after filtering',
);
assert.deepEqual(
  buildPlatformNotificationWindow({
    rows: platformWindow.events,
    status: 'acknowledged',
    severity: 'critical',
    triggerType: 'TEST_ALERT',
    limit: 10,
  }).events.map((row) => row.id),
  ['new-acknowledged'],
);

const ownerRow = (
  id: string,
  productId: OwnerNotificationOpsEventRow['productId'],
  status: OwnerNotificationOpsEventRow['status'],
  updatedAt: string | null,
): OwnerNotificationOpsEventRow => ({
  id,
  productId,
  triggerType: 'PAYMENT_FAILED',
  tenantId: productId === 'ML' ? '10' : 'tenant-10',
  storeId: productId === 'ML' ? '20' : undefined,
  workspaceId: productId === 'AL' ? 'workspace-20' : undefined,
  referenceId: `reference-${id}`,
  recipientRole: 'billing_owner',
  requestedChannels: ['email'],
  priority: 'critical',
  status,
  sourcePath: 'test/notification-ops',
  createdAt: updatedAt,
  updatedAt,
  processedAt: updatedAt,
  metadataPreview: {},
});

const ownerRows = [
  ownerRow('ml-failed-old', 'ML', 'failed', '2026-07-12T00:00:00.000Z'),
  ownerRow('al-failed-new', 'AL', 'failed', '2026-07-13T02:00:00.000Z'),
  ownerRow('ml-delivered-new', 'ML', 'delivered', '2026-07-13T01:00:00.000Z'),
  ownerRow('ml-failed-new', 'ML', 'failed', '2026-07-13T03:00:00.000Z'),
  ownerRow('ml-invalid-newest', 'ML', 'invalid', '2026-07-13T04:00:00.000Z'),
];
const ownerWindow = buildOwnerNotificationWindow({
  rows: ownerRows,
  productId: 'ML',
  status: 'failed',
  limit: 10,
});

assert.equal(ownerWindow.counts.failed, 2);
assert.equal(ownerWindow.counts.delivered, 1);
assert.equal(ownerWindow.counts.invalid, 1);
assert.equal(
  Object.values(ownerWindow.counts).reduce((sum, count) => sum + count, 0),
  4,
  'owner counts must exclude rows for the other product',
);
assert.deepEqual(
  ownerWindow.events.map((row) => row.id),
  ['ml-failed-new', 'ml-failed-old'],
  'owner status filtering must happen after product isolation and deterministic time ordering',
);
assert.deepEqual(
  buildOwnerNotificationWindow({
    rows: ownerRows,
    productId: 'ML',
    status: 'invalid',
    limit: 10,
  }).events.map((row) => row.id),
  ['ml-invalid-newest'],
  'malformed persisted rows must remain explicitly invalid instead of being relabeled pending',
);

process.stdout.write('Notification ops snapshot boundary tests passed.\n');

import assert from 'node:assert/strict';
import { assertCurrentPlatformAccess } from '../../src/lib/auth/currentPlatformAccessClient';
import {
  normalizeSchedulerRunLog,
  normalizeSchedulerSettlementState,
} from '../../src/database/ops/scheduler';
import {
  normalizeSchedulerRecoveryResponse,
  normalizeSchedulerRecoveryRunLogId,
} from '../../src/lib/ops/schedulerRecoveryResponse';

const validRecovery = {
  success: true,
  runLogId: 'manual_store_1_2_1234567890',
  status: 'partial',
  totalStores: 1,
  totalProjects: 4,
  successCount: 3,
  failedCount: 1,
  skippedCount: 0,
  intelligenceSuccess: 3,
  intelligenceFailed: 1,
};

assert.deepEqual(normalizeSchedulerRecoveryResponse(validRecovery), validRecovery);
assert.equal(normalizeSchedulerRecoveryResponse({ ...validRecovery, success: false }), null);
assert.equal(normalizeSchedulerRecoveryResponse({ ...validRecovery, totalStores: 2 }), null);
assert.equal(normalizeSchedulerRecoveryResponse({ ...validRecovery, failedCount: '1' }), null);
assert.equal(normalizeSchedulerRecoveryResponse({ ...validRecovery, runLogId: '../private' }), null);
assert.equal(normalizeSchedulerRecoveryResponse({ ...validRecovery, status: 'finished' }), null);
assert.equal(normalizeSchedulerRecoveryRunLogId(' valid '), null);
assert.equal(normalizeSchedulerRecoveryRunLogId('manual_store_1_2_123'), 'manual_store_1_2_123');

const normalizedRun = normalizeSchedulerRunLog('manual_store_1_2_123', {
  trigger: 'manual',
  triggeredBy: 'operator-1',
  startedAt: { seconds: 1 },
  completedAt: { seconds: 2 },
  durationMs: 100,
  status: 'partial',
  totalStores: 1,
  totalProjects: 2,
  successCount: 1,
  failedCount: 1,
  skippedCount: 0,
  intelligenceSuccess: 1,
  intelligenceFailed: 1,
  tasks: [
    { name: 'decision_blocks', status: 'success', details: { secret: 'x'.repeat(500) } },
    { name: {}, status: 'failed' },
  ],
  errors: [{ tId: '1', sId: '2', error: 'provider secret text', phase: 'worker\u0000phase' }],
});
assert.ok(normalizedRun);
assert.equal(normalizedRun?.tasks.length, 1);
assert.equal(String(normalizedRun?.tasks[0]?.details?.secret).length, 240);
assert.equal(normalizedRun?.errors[0]?.phase, 'worker phase');
assert.equal(normalizeSchedulerRunLog('bad/run', { trigger: 'manual', status: 'success', startedAt: { seconds: 1 } }), null);
assert.equal(normalizeSchedulerRunLog('run-1', { trigger: 'manual', status: 'invented', startedAt: { seconds: 1 } }), null);

const settlement = normalizeSchedulerSettlementState('nightlyState_2', {
  tId: '1',
  sId: '2',
  status: 'failed',
  phase: 'settlement',
  lastAttemptedLocalDate: '2026-07-16',
  lastSettledLocalDate: '2026-02-31',
  error: 'stored error',
});
assert.equal(settlement?.lastAttemptedLocalDate, '2026-07-16');
assert.equal(settlement?.lastSettledLocalDate, undefined);
assert.equal(normalizeSchedulerSettlementState('other_2', {}), null);

async function main() {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      authorized: true,
      accessModel: 'current_persisted_platform_user',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await assert.doesNotReject(assertCurrentPlatformAccess());

    globalThis.fetch = async () => new Response(JSON.stringify({ authorized: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await assert.rejects(assertCurrentPlatformAccess(), /platform_current_access_rejected/);

    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
    await assert.rejects(assertCurrentPlatformAccess(), /platform_current_access_rejected/);
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('Internal ops runtime boundary tests passed.');
}

void main();

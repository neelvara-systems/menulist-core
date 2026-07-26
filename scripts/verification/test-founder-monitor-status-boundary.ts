import assert from 'node:assert/strict';
import { normalizeFounderMonitorStatus } from '../../src/lib/ops/founderMonitorTypes';

assert.equal(normalizeFounderMonitorStatus('healthy'), 'healthy');
assert.equal(normalizeFounderMonitorStatus('watch'), 'watch');
assert.equal(normalizeFounderMonitorStatus('action_required'), 'action_required');
assert.equal(normalizeFounderMonitorStatus('setup_required'), 'setup_required');

assert.equal(normalizeFounderMonitorStatus(undefined), 'setup_required');
assert.equal(normalizeFounderMonitorStatus(null), 'setup_required');
assert.equal(normalizeFounderMonitorStatus(''), 'setup_required');
assert.equal(normalizeFounderMonitorStatus('unknown'), 'setup_required');
assert.equal(normalizeFounderMonitorStatus({ status: 'healthy' }), 'setup_required');

console.log('Founder Monitor status boundary tests passed.');

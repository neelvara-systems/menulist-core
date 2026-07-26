import assert from 'node:assert/strict';
import { normalizeOwnerBusinessAssistantMonitorTimestamp } from '../../src/lib/ownerBusinessAssistant/monitorProjection';

const iso = '2026-07-26T06:30:00.000Z';
assert.equal(normalizeOwnerBusinessAssistantMonitorTimestamp(iso), iso);
assert.equal(normalizeOwnerBusinessAssistantMonitorTimestamp(new Date(iso)), iso);
assert.equal(
  normalizeOwnerBusinessAssistantMonitorTimestamp({ seconds: Date.parse(iso) / 1000 }),
  iso,
);
assert.equal(
  normalizeOwnerBusinessAssistantMonitorTimestamp({ toDate: () => new Date(iso) }),
  iso,
);

assert.equal(normalizeOwnerBusinessAssistantMonitorTimestamp('invalid'), null);
assert.equal(normalizeOwnerBusinessAssistantMonitorTimestamp({ seconds: 'bad' }), null);
assert.equal(normalizeOwnerBusinessAssistantMonitorTimestamp({ toDate: () => 'not-a-date' }), null);
assert.equal(normalizeOwnerBusinessAssistantMonitorTimestamp({
  toDate: () => {
    throw new Error('corrupt timestamp');
  },
}), null);

console.log('Owner Business Assistant monitor boundary tests passed.');

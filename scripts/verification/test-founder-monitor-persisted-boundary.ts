#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
  projectFounderRevenueMovementRow,
  readFounderMonitorPersistedInteger,
} from '../../src/lib/ops/founderMonitorPersistedBoundary';

const timestamp = { toDate: () => new Date('2026-07-27T00:00:00.000Z') };
const valid = {
  amountPaise: 49_900,
  businessDayKey: '2026-07-27',
  description: 'Collected payment.',
  kind: 'cash_collected',
  occurredAt: timestamp,
  pId: 'ML',
  productId: 'ML',
  sId: '22',
  storeId: '22',
  tId: '11',
  tenantId: '11',
};

assert.deepEqual(projectFounderRevenueMovementRow({ data: valid, documentId: 'cash:pay_1' }), {
  amountPaise: 49_900,
  description: 'Collected payment.',
  kind: 'cash_collected',
  occurredAt: '2026-07-27T00:00:00.000Z',
  storeId: '22',
  tenantId: '11',
});
assert.equal(projectFounderRevenueMovementRow({
  data: valid,
  documentId: 'cash:pay_1',
  expectedBusinessDayKey: '2026-07-27',
})?.amountPaise, 49_900, 'exact current business-day identity must be admitted');
assert.equal(projectFounderRevenueMovementRow({
  data: { ...valid, amountPaise: '49900' },
  documentId: 'cash:pay_1',
}), null, 'coercible financial amounts must fail closed');
assert.equal(projectFounderRevenueMovementRow({
  data: { ...valid, tId: '12' },
  documentId: 'cash:pay_1',
}), null, 'conflicting persisted scope aliases must fail closed');
assert.equal(projectFounderRevenueMovementRow({
  data: { ...valid, occurredAt: '2026-07-27T00:00:00.000Z' },
  documentId: 'cash:pay_1',
}), null, 'persisted timestamps must not accept arbitrary strings');
assert.equal(projectFounderRevenueMovementRow({
  data: { ...valid, productId: 'AL' },
  documentId: 'cash:pay_1',
}), null, 'conflicting product identity must fail closed');
assert.equal(projectFounderRevenueMovementRow({
  data: valid,
  documentId: 'cash:pay_1',
  expectedBusinessDayKey: '2026-07-26',
}), null, 'conflicting business-day identity must fail closed');
assert.equal(readFounderMonitorPersistedInteger(undefined, 'missing'), 0);
assert.equal(readFounderMonitorPersistedInteger(7, 'count'), 7);
assert.throws(
  () => readFounderMonitorPersistedInteger('7', 'count'),
  /persisted count is invalid/,
  'coercible summary counters must fail visibly',
);

process.stdout.write('Founder Monitor persisted boundary tests passed.\n');

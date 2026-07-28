import assert from 'node:assert/strict';

import {
  buildOwnerDashboardDocumentPrefix,
  hasOwnerDashboardSummaryIdentity,
  readOwnerDashboardCounter,
  readOwnerDashboardFiniteNumber,
  readOwnerDashboardMap,
} from '../../src/lib/analytics/ownerDashboardReadBoundary';

assert.equal(buildOwnerDashboardDocumentPrefix('1', '101', 'menu_project'), '1_101_menu_project');
assert.equal(buildOwnerDashboardDocumentPrefix('01', '101', 'menu_project'), null);
assert.equal(buildOwnerDashboardDocumentPrefix('1', '../101', 'menu_project'), null);
assert.equal(buildOwnerDashboardDocumentPrefix('1', '101', 'menu/project'), null);
assert.equal(hasOwnerDashboardSummaryIdentity({
  kind: 'ownerDashboardSummary',
  projectId: 'menu_project',
  sId: '101',
  tId: '1',
}, { projectId: 'menu_project', sId: '101', tId: '1' }), true);
assert.equal(hasOwnerDashboardSummaryIdentity({
  kind: 'ownerDashboardSummary',
  projectId: 'other_project',
  sId: '101',
  tId: '1',
}, { projectId: 'menu_project', sId: '101', tId: '1' }), false);

assert.equal(readOwnerDashboardCounter(7), 7);
for (const invalid of ['7', -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
  assert.equal(readOwnerDashboardCounter(invalid), 0);
}

assert.equal(readOwnerDashboardFiniteNumber(-12.5), -12.5);
assert.equal(readOwnerDashboardFiniteNumber(Number.NaN), null);
assert.equal(readOwnerDashboardFiniteNumber('12'), null);

const numeric = readOwnerDashboardMap({
  counts: {
    valid: 2,
    negative: -1,
    fractional: 1.5,
    stringCounter: '9',
    constructor: 8,
  },
  'counts.flat': 3,
  'counts.__proto__': 4,
  [`counts.${'x'.repeat(181)}`]: 5,
}, 'counts');
assert.deepEqual({ ...numeric }, { valid: 2, flat: 3 });
assert.equal(Object.getPrototypeOf(numeric), null);

const names = readOwnerDashboardMap({
  names: {
    valid: '  Masala dosa  ',
    blank: '   ',
    numeric: 42,
  },
  'names.flat': 'Flat label',
}, 'names', 'string');
assert.deepEqual({ ...names }, { valid: 'Masala dosa', flat: 'Flat label' });

const oversized = Object.fromEntries(
  Array.from({ length: 1_005 }, (_, index) => [`item-${index}`, 1]),
);
assert.equal(Object.keys(readOwnerDashboardMap({ oversized }, 'oversized')).length, 1_000);

console.log('Owner dashboard read boundary tests passed.');

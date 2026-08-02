import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDataTableSearchValue } from '../../src/components/analytics/DataTable';
import {
  convertAnalyticsRowsToCSV,
  normalizeAnalyticsExportFilename,
} from '../../src/components/analytics/ExportButton';
import { normalizeCategoryDistribution } from '../../src/components/analytics/CategoryDistributionChart';
import { filterDataByTimeRange } from '../../src/components/analytics/InteractiveTrendChart';
import { normalizeAnalyticsPercentage } from '../../src/components/analytics/analyticsPresentation';
import { normalizePeakHoursData } from '../../src/components/analytics/PeakHoursHeatmap';

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

const record = {
  customer: {
    profile: {
      name: 'Menu Owner',
    },
  },
  totals: [4, 8],
};

assert.equal(getDataTableSearchValue(record, ['customer', 'profile', 'name']), 'Menu Owner');
assert.equal(getDataTableSearchValue(record, ['totals', 1]), 8);
assert.equal(getDataTableSearchValue(record, ['customer', 'missing']), undefined);
assert.equal(getDataTableSearchValue(record, ['__proto__', 'polluted']), undefined);

assert.equal(
  convertAnalyticsRowsToCSV([{ first: 'one' }, { first: 'two', later: 'kept' }]),
  'first,later\none,N/A\ntwo,kept',
  'CSV export must preserve fields introduced after the first row',
);
assert.equal(normalizeAnalyticsExportFilename('../../ unsafe:name '), 'unsafe-name');
assert.equal(normalizeAnalyticsExportFilename('///'), 'export');
assert.deepEqual(
  normalizeCategoryDistribution([
    { name: 'Support', count: 2, percentage: 99 },
    { name: 'Sales', count: 1, percentage: 99 },
    { name: ' Support ', count: 1 },
    { name: 'Invalid', count: Number.NaN },
  ]),
  [
    { name: 'Support', count: 3, percentage: 75 },
    { name: 'Sales', count: 1, percentage: 25 },
  ],
  'category percentage truth must derive from valid merged counts',
);
assert.equal(normalizeAnalyticsPercentage(25, 100), 25);
assert.equal(normalizeAnalyticsPercentage(150, 100), 100);
assert.equal(normalizeAnalyticsPercentage(-10, 100), 0);
assert.equal(normalizeAnalyticsPercentage(10, 0), 0);
assert.equal(normalizeAnalyticsPercentage(Number.NaN, 100), 0);
const normalizedHours = normalizePeakHoursData([
  { hour: 9, count: 2, intensity: 1 },
  { hour: 9, count: 2, intensity: 99 },
  { hour: 10, count: 1 },
  { hour: 24, count: 100 },
  { hour: 11, count: -1 },
]);
assert.equal(normalizedHours.length, 24);
assert.deepEqual(normalizedHours[9], { hour: 9, count: 4, intensity: 100 });
assert.deepEqual(normalizedHours[10], { hour: 10, count: 1, intensity: 25 });
assert.equal(normalizePeakHoursData([]).every((item) => item.count === 0 && item.intensity === 0), true);
const fixedNow = Date.parse('2026-08-01T12:00:00.000Z');
const trendRows = [
  { date: '2026-07-25', value: 1 },
  { date: '2026-07-26', value: 2 },
  { date: '2026-08-01', value: 3 },
  { date: '2026-08-02', value: 4 },
  { date: 'not-a-date', value: 5 },
];
assert.deepEqual(
  filterDataByTimeRange(trendRows, '7d', fixedNow).map((item) => item.value),
  [2, 3],
  'seven-day analytics must include seven UTC calendar days and exclude future/invalid rows',
);
assert.deepEqual(
  filterDataByTimeRange(trendRows, 'all', fixedNow).map((item) => item.value),
  [1, 2, 3],
  'all-time analytics must retain valid historical rows but exclude invalid/future rows',
);

const dataTable = read('src/components/analytics/DataTable.tsx');
const metricCardGroup = read('src/components/analytics/MetricCardGroup.tsx');
const refreshButton = read('src/components/analytics/RefreshButton.tsx');
const exportButton = read('src/components/analytics/ExportButton.tsx');
const topicsGapsSection = read('src/components/analytics/TopicsGapsSection.tsx');
const systemHealthSection = read('src/components/analytics/SystemHealthSection.tsx');

assert.match(dataTable, /maxLength=\{500\}/, 'analytics table search must remain bounded');
assert.doesNotMatch(dataTable, /Record<string, any>/, 'analytics table contracts must not regress to any');
assert.match(metricCardGroup, /key=\{`\$\{metric\.title\}:\$\{index\}`\}/, 'metric cards must keep unique sibling keys');
assert.match(refreshButton, /if \(refreshInFlightRef\.current\) return;/, 'refresh activation must be single-flight');
assert.match(refreshButton, /finally \{\s*refreshInFlightRef\.current = false;/, 'refresh ownership must release on failure');
assert.match(exportButton, /if \(exportInFlightRef\.current\) return;/, 'export activation must be single-flight');
assert.match(exportButton, /finally \{\s*link\.remove\(\);\s*window\.URL\.revokeObjectURL\(url\);/, 'export resources must clean up on every path');
assert.match(topicsGapsSection, /onExport=\{onExport\}/, 'Topics and Gaps must pass the caller export contract to the export boundary');
assert.match(systemHealthSection, /key=\{`\$\{metric\.name\}:\$\{index\}`\}/, 'health metrics must keep unique sibling keys');

console.log('Analytics component boundary tests passed.');

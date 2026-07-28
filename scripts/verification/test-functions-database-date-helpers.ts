import assert from 'node:assert/strict';
import {
    getAnalyticsDocId,
    getWeekDateRange,
} from '../../functions/src/constants/database';

const cases = [
    { date: new Date(2021, 0, 1, 12), expected: '2020-W53' },
    { date: new Date(2021, 0, 4, 12), expected: '2021-W01' },
    { date: new Date(2018, 11, 31, 12), expected: '2019-W01' },
    { date: new Date(2020, 11, 31, 12), expected: '2020-W53' },
];

for (const { date, expected } of cases) {
    assert.equal(
        getWeekDateRange(date).weekStr,
        expected,
        `Weekly range identity must use the ISO week-year for ${date.toISOString()}.`,
    );
    assert.equal(
        getAnalyticsDocId.weekly('1', '2', 'project', date),
        `1_2_project_weekly_${expected}`,
        `Weekly analytics document identity must use the ISO week-year for ${date.toISOString()}.`,
    );
}

console.log('Functions database date-helper regressions passed.');

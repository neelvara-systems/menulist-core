import assert from 'node:assert/strict';
import * as appBusinessDay from '../../src/lib/analytics/businessDay';
import * as functionsBusinessDay from '../../functions/src/utils/businessDay';

const implementations = [
    ['app', appBusinessDay],
    ['functions', functionsBusinessDay],
] as const;

for (const [name, businessDay] of implementations) {
    assert.equal(businessDay.parseBusinessDayEndMinutes('23:00'), 23 * 60, `${name} parses valid time`);
    assert.equal(businessDay.parseBusinessDayEndMinutes(' 03:00 '), 3 * 60, `${name} preserves trimmed legacy time`);

    let coercionCalled = false;
    const coerciveValue = {
        toString: () => {
            coercionCalled = true;
            return '23:00';
        },
    };
    assert.equal(businessDay.parseBusinessDayEndMinutes(coerciveValue), null, `${name} rejects object time`);
    assert.equal(coercionCalled, false, `${name} must not execute time conversion hooks`);
    assert.equal(
        businessDay.normalizeBusinessDayEndTime('invalid', 'also-invalid'),
        businessDay.DEFAULT_FOOD_BUSINESS_DAY_END_TIME,
        `${name} must not emit an invalid fallback`,
    );

    assert.equal(
        businessDay.getLatestSettledBusinessDateKey(
            new Date('2026-07-11T01:29:00.000Z'),
            'UTC',
            '23:00',
        ),
        '2026-07-09',
        `${name} wrapped settlement remains on the prior completed cycle before cutoff`,
    );
    assert.equal(
        businessDay.getLatestSettledBusinessDateKey(
            new Date('2026-07-11T01:30:00.000Z'),
            'UTC',
            '23:00',
        ),
        '2026-07-10',
        `${name} wrapped settlement advances exactly one business date at cutoff`,
    );
    assert.equal(
        businessDay.getLatestSettledBusinessDateKey(
            new Date('2026-07-11T05:29:00.000Z'),
            'UTC',
            '03:00',
        ),
        '2026-07-09',
        `${name} normal settlement remains on the prior completed cycle before cutoff`,
    );
    assert.equal(
        businessDay.getLatestSettledBusinessDateKey(
            new Date('2026-07-11T05:30:00.000Z'),
            'UTC',
            '03:00',
        ),
        '2026-07-10',
        `${name} normal settlement advances exactly one business date at cutoff`,
    );
}

process.stdout.write('Analytics business-day boundary tests passed.\n');

import assert from 'node:assert/strict';
import {
    getMinutesUntilStoreStatusChange,
    getStoreDayKey,
    getStoreLocalDateKey,
    getStoreStatus,
    normalizeWorkingHoursValue,
    parseWorkingHoursRanges,
} from '@lib/hours/hoursEngine';
import {
    getUpcomingSpecialHours,
    normalizeSpecialHours,
    sortSpecialHoursEntriesForOwner,
} from '@lib/hours/specialHours';
import { getStoreOpenStatus } from '@lib/obp/hoursStatus';
import {
    buildEffectiveSpecialOpeningHours,
    buildOpeningHours,
    buildSpecialOpeningHours,
} from '@lib/schema';

const fridayAtElevenPm = new Date('2026-07-17T23:00:00.000Z');
const saturdayAtOneAm = new Date('2026-07-18T01:00:00.000Z');
const saturdayAtTwoAm = new Date('2026-07-18T02:00:00.000Z');

assert.equal(getStoreDayKey('UTC', fridayAtElevenPm), 'fri');
assert.equal(getStoreDayKey('UTC', saturdayAtOneAm), 'sat');

const legacyMissingTimeZone = { fri: '19:00-21:00' };
const fridayAtEightPm = new Date('2026-07-17T20:00:00.000Z');
assert.equal(getStoreDayKey(undefined, fridayAtEightPm), 'fri');
assert.equal(getStoreStatus(legacyMissingTimeZone, undefined, '24h', fridayAtEightPm).isOpen, true);
assert.equal(getStoreOpenStatus(legacyMissingTimeZone, undefined, fridayAtEightPm).isOpen, true);
assert.equal(getStoreDayKey('Invalid/Timezone', fridayAtEightPm), 'fri');
assert.equal(getStoreStatus(legacyMissingTimeZone, 'Invalid/Timezone', '24h', fridayAtEightPm).isOpen, true);
assert.equal(getStoreOpenStatus(legacyMissingTimeZone, 'Invalid/Timezone', fridayAtEightPm).isOpen, true);

const fridayOvernight = { fri: '22:00-02:00' };
assert.equal(getStoreStatus(fridayOvernight, 'UTC', '24h', fridayAtElevenPm).isOpen, true);
assert.equal(getStoreStatus(fridayOvernight, 'UTC', '24h', saturdayAtOneAm).isOpen, true);
assert.equal(getStoreStatus(fridayOvernight, 'UTC', '24h', saturdayAtOneAm).nextChange, 'Closes at 02:00 AM');
assert.equal(getStoreStatus(fridayOvernight, 'UTC', '24h', saturdayAtOneAm).currentDayHours, '10:00 PM - 02:00 AM');
assert.equal(getStoreOpenStatus(fridayOvernight, 'UTC', saturdayAtOneAm).statusText, 'Open now');
assert.equal(getStoreStatus(fridayOvernight, 'UTC', '24h', saturdayAtTwoAm).isOpen, false);
assert.equal(getMinutesUntilStoreStatusChange(fridayOvernight, 'UTC', saturdayAtOneAm), 60);
assert.equal(getMinutesUntilStoreStatusChange(fridayOvernight, 'UTC', saturdayAtTwoAm), null);

const saturdayOvernight = { sat: '22:00-02:00' };
assert.equal(getStoreStatus(saturdayOvernight, 'UTC', '24h', saturdayAtOneAm).isOpen, false);
assert.equal(getStoreStatus(saturdayOvernight, 'UTC', '24h', saturdayAtOneAm).nextChange, 'Opens at 10:00 PM');
assert.equal(getMinutesUntilStoreStatusChange(saturdayOvernight, 'UTC', saturdayAtOneAm), 21 * 60);

const splitSaturday = { sat: '09:00-11:00, 12:00-14:00' };
assert.equal(
    getStoreStatus(splitSaturday, 'UTC', '24h', new Date('2026-07-18T10:00:00.000Z')).isOpen,
    true,
);
assert.equal(
    getStoreStatus(splitSaturday, 'UTC', '24h', new Date('2026-07-18T11:00:00.000Z')).nextChange,
    'Opens at 12:00 PM',
);
assert.equal(
    getStoreStatus(splitSaturday, 'UTC', '24h', new Date('2026-07-18T12:00:00.000Z')).isOpen,
    true,
);
assert.equal(
    getStoreStatus(splitSaturday, 'UTC', '24h', new Date('2026-07-18T14:00:00.000Z')).isOpen,
    false,
);

const overlappingSaturday = { sat: '09:00-13:00, 12:00-16:00' };
assert.equal(
    getStoreStatus(overlappingSaturday, 'UTC', '24h', new Date('2026-07-18T12:30:00.000Z')).nextChange,
    'Closes at 04:00 PM',
);
assert.equal(
    getMinutesUntilStoreStatusChange(overlappingSaturday, 'UTC', new Date('2026-07-18T12:30:00.000Z')),
    210,
);

assert.equal(normalizeWorkingHoursValue(' 09:00 - 17:00 , 18:00-22:00 '), '09:00-17:00, 18:00-22:00');
assert.equal(normalizeWorkingHoursValue('closed'), '');
assert.equal(normalizeWorkingHoursValue('09:00-09:00'), null);
assert.equal(normalizeWorkingHoursValue('99:00-17:00'), null);
assert.equal(normalizeWorkingHoursValue('09:00-17:00, invalid'), null);
assert.deepEqual(parseWorkingHoursRanges('09:00-11:00, 12:00-14:00'), [
    { endMinutes: 660, endTime: '11:00', startMinutes: 540, startTime: '09:00' },
    { endMinutes: 840, endTime: '14:00', startMinutes: 720, startTime: '12:00' },
]);
assert.equal(getStoreStatus({ sat: '99:00-17:00' }, 'UTC', '24h', saturdayAtOneAm).statusText, 'Hours not available');
assert.equal(getStoreStatus(undefined, 'UTC', '24h', saturdayAtOneAm).statusText, 'Hours not available');
assert.deepEqual(buildOpeningHours({ workingHours: splitSaturday }), [
    {
        '@type': 'OpeningHoursSpecification',
        closes: '11:00',
        dayOfWeek: 'https://schema.org/Saturday',
        opens: '09:00',
    },
    {
        '@type': 'OpeningHoursSpecification',
        closes: '14:00',
        dayOfWeek: 'https://schema.org/Saturday',
        opens: '12:00',
    },
]);
assert.equal(buildOpeningHours({ workingHours: { sat: '99:00-17:00' } }), undefined);
assert.equal(buildOpeningHours({ workingHours: { someday: '09:00-17:00' } }), undefined);

const saturdaySpecialHours = {
    '2026-07-18': { hours: '10:00-12:00', label: 'Market day' },
};
assert.equal(getStoreLocalDateKey('UTC', saturdayAtOneAm), '2026-07-18');
assert.equal(
    getStoreLocalDateKey('Asia/Kolkata', new Date('2026-12-31T18:45:00.000Z')),
    '2027-01-01',
);
assert.equal(
    getStoreLocalDateKey('America/Los_Angeles', new Date('2027-01-01T07:30:00.000Z')),
    '2026-12-31',
);
assert.deepEqual(
    getStoreStatus(splitSaturday, 'UTC', '24h', new Date('2026-07-18T10:30:00.000Z'), saturdaySpecialHours),
    {
        currentDayHours: '10:00 AM - 12:00 PM',
        isSpecialHours: true,
        isOpen: true,
        localDate: '2026-07-18',
        nextChange: 'Closes at 12:00 PM',
        specialHoursLabel: 'Market day',
        statusText: 'Open',
    },
);
assert.equal(
    getStoreStatus(splitSaturday, 'UTC', '24h', new Date('2026-07-18T09:30:00.000Z'), saturdaySpecialHours).isOpen,
    false,
);
assert.equal(
    getMinutesUntilStoreStatusChange(
        splitSaturday,
        'UTC',
        new Date('2026-07-18T09:30:00.000Z'),
        saturdaySpecialHours,
    ),
    30,
);

const saturdayClosedOverride = {
    '2026-07-18': { hours: '', label: 'Private event' },
};
const closedOverrideStatus = getStoreStatus(
    splitSaturday,
    'UTC',
    '24h',
    new Date('2026-07-18T10:00:00.000Z'),
    saturdayClosedOverride,
);
assert.equal(closedOverrideStatus.isOpen, false);
assert.equal(closedOverrideStatus.isSpecialHours, true);
assert.equal(closedOverrideStatus.specialHoursLabel, 'Private event');
assert.equal(getMinutesUntilStoreStatusChange(
    splitSaturday,
    'UTC',
    new Date('2026-07-18T10:00:00.000Z'),
    saturdayClosedOverride,
), null);

const fridaySpecialOvernight = {
    '2026-07-17': { hours: '22:00-02:00', label: 'Late service' },
};
const activePreviousSpecialOvernight = getStoreStatus(
    undefined,
    'UTC',
    '24h',
    saturdayAtOneAm,
    fridaySpecialOvernight,
);
assert.equal(activePreviousSpecialOvernight.isOpen, true);
assert.equal(activePreviousSpecialOvernight.isSpecialHours, true);
assert.equal(activePreviousSpecialOvernight.specialHoursLabel, 'Late service');
assert.equal(
    getMinutesUntilStoreStatusChange(undefined, 'UTC', saturdayAtOneAm, fridaySpecialOvernight),
    60,
);
assert.equal(
    getStoreStatus(undefined, 'UTC', '24h', saturdayAtOneAm, {
        ...fridaySpecialOvernight,
        '2026-07-18': { hours: '', label: 'Closed Saturday' },
    }).isOpen,
    false,
);

assert.deepEqual(normalizeSpecialHours({
    '2026-12-25': { hours: ' 18:00 - 23:00 ', label: '  Christmas   Dinner  ' },
}), {
    '2026-12-25': { hours: '18:00-23:00', label: 'Christmas Dinner' },
});
assert.equal(normalizeSpecialHours({ '2026-02-30': { hours: '' } }), null);
assert.equal(normalizeSpecialHours({ '2026-12-25': { hours: '09:00-09:00' } }), null);
assert.equal(normalizeSpecialHours({ '2026-12-25': { hours: '', unexpected: true } }), null);
assert.equal(normalizeSpecialHours({ '2026-12-25': { hours: '', label: 'Invalid\u0000label' } }), null);
assert.equal(normalizeSpecialHours(Object.fromEntries(
    Array.from({ length: 65 }, (_, index) => [
        new Date(Date.UTC(2027, 0, index + 1)).toISOString().slice(0, 10),
        { hours: '' },
    ]),
)), null);
assert.deepEqual(
    getUpcomingSpecialHours({
        '2026-07-17': { hours: '', label: 'Past date' },
        '2026-07-18': { hours: '', label: 'Today' },
        '2026-07-19': { hours: '11:00-15:00', label: 'Tomorrow' },
        '2026-07-20': { hours: '12:00-16:00', label: 'Later' },
    }, 'UTC', new Date('2026-07-18T01:00:00.000Z'), 2),
    [
        { date: '2026-07-18', entry: { hours: '', label: 'Today' } },
        { date: '2026-07-19', entry: { hours: '11:00-15:00', label: 'Tomorrow' } },
    ],
);
assert.deepEqual(
    sortSpecialHoursEntriesForOwner({
        '2026-07-17': { hours: '', label: 'Older past date' },
        '2026-07-18': { hours: '', label: 'Latest past date' },
        '2026-07-19': { hours: '', label: 'Today' },
        '2026-07-21': { hours: '', label: 'Later' },
        '2026-07-20': { hours: '', label: 'Tomorrow' },
    }, '2026-07-19').map(([date]) => date),
    ['2026-07-19', '2026-07-20', '2026-07-21', '2026-07-18', '2026-07-17'],
);
assert.equal(
    getStoreStatus(
        undefined,
        'Asia/Kolkata',
        '24h',
        new Date('2026-12-31T18:45:00.000Z'),
        { '2027-01-01': { hours: '00:00-02:00', label: 'New Year service' } },
    ).specialHoursLabel,
    'New Year service',
);
assert.deepEqual(buildSpecialOpeningHours({ specialHours: saturdayClosedOverride }), [
    {
        '@type': 'OpeningHoursSpecification',
        validFrom: '2026-07-18',
        validThrough: '2026-07-18',
    },
]);
assert.deepEqual(buildSpecialOpeningHours({ specialHours: saturdaySpecialHours }), [
    {
        '@type': 'OpeningHoursSpecification',
        closes: '12:00',
        opens: '10:00',
        validFrom: '2026-07-18',
        validThrough: '2026-07-18',
    },
]);
assert.equal(buildSpecialOpeningHours({ specialHours: { invalid: { hours: '' } } }), undefined);
const activeTemporaryClosureExpiry = new Date('2026-07-18T23:00:00.000Z').toISOString();
assert.deepEqual(buildEffectiveSpecialOpeningHours({
    specialHours: {
        ...saturdaySpecialHours,
        '2026-07-19': { hours: '11:00-15:00', label: 'Sunday service' },
    },
    tempStatus: {
        expiresAt: activeTemporaryClosureExpiry,
        message: 'Closed for maintenance',
        type: 'closed_today',
    },
    timeZone: 'UTC',
}, new Date('2026-07-18T10:00:00.000Z')), [
    {
        '@type': 'OpeningHoursSpecification',
        closes: '15:00',
        opens: '11:00',
        validFrom: '2026-07-19',
        validThrough: '2026-07-19',
    },
    {
        '@type': 'OpeningHoursSpecification',
        closes: '00:00',
        description: 'Closed for maintenance',
        opens: '00:00',
        validFrom: '2026-07-18',
        validThrough: '2026-07-18',
    },
]);

console.log('Working-hours boundary tests passed.');

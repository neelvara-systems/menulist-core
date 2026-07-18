import assert from 'node:assert/strict';
import {
    getMinutesUntilStoreStatusChange,
    getStoreDayKey,
    getStoreStatus,
    normalizeWorkingHoursValue,
    parseWorkingHoursRanges,
} from '@lib/hours/hoursEngine';
import { getStoreOpenStatus } from '@lib/obp/hoursStatus';
import { buildOpeningHours } from '@lib/schema';

const fridayAtElevenPm = new Date('2026-07-17T23:00:00.000Z');
const saturdayAtOneAm = new Date('2026-07-18T01:00:00.000Z');
const saturdayAtTwoAm = new Date('2026-07-18T02:00:00.000Z');

assert.equal(getStoreDayKey('UTC', fridayAtElevenPm), 'fri');
assert.equal(getStoreDayKey('UTC', saturdayAtOneAm), 'sat');

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

console.log('Working-hours boundary tests passed.');

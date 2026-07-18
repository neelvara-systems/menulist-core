import assert from 'node:assert/strict';
import {
    defaultDateFormatString,
    defaultLocale,
    defaultTimeFormatString,
    defaultTimezone,
    getDateFormatOptions,
    getLocaleDirection,
    getTimeFormatOptions,
    isRtlLocale,
    normalizeDateFormatPreference,
    normalizeLocalePreference,
    normalizeTimeFormatPreference,
    normalizeTimeZone,
} from '../../src/lib/localization/config';
import {
    formatClockTime,
    fromNativeDateInputValue,
    fromNativeDateTimeInputValue,
    toDate,
} from '../../src/utils/dateTime';
import { timeAgo } from '../../src/utils/dateTime/timeAgo';
import { formatNumber } from '../../src/utils/formatters';

assert.equal(defaultTimezone, 'UTC', 'SSR timezone fallback must remain deterministic');
assert.equal(normalizeLocalePreference('en'), defaultLocale);
assert.equal(normalizeLocalePreference('pt_BR'), 'pt-BR');
assert.equal(normalizeLocalePreference('ar'), 'ar-SA');
assert.equal(normalizeLocalePreference('not-a-locale'), null);
assert.equal(normalizeLocalePreference('*'), null);

assert.equal(isRtlLocale('ar-SA'), true);
assert.equal(isRtlLocale('ur-IN'), true);
assert.equal(isRtlLocale('en-US'), false);
assert.equal(getLocaleDirection('he-IL'), 'rtl');
assert.equal(getLocaleDirection('fr-FR'), 'ltr');

assert.equal(normalizeTimeZone('Asia/Kolkata'), 'Asia/Kolkata');
assert.equal(normalizeTimeZone('Invalid/Timezone'), defaultTimezone);
assert.equal(normalizeTimeZone('x'.repeat(101)), defaultTimezone);

assert.equal(normalizeDateFormatPreference('2-digit|short|numeric'), '2-digit|short|numeric');
assert.equal(normalizeDateFormatPreference('day|month|year'), defaultDateFormatString);
assert.deepEqual(getDateFormatOptions('day|month|year'), getDateFormatOptions(defaultDateFormatString));
assert.equal(normalizeTimeFormatPreference('2-digit|2-digit|false'), '2-digit|2-digit|false');
assert.equal(normalizeTimeFormatPreference('hour|minute|maybe'), defaultTimeFormatString);
assert.deepEqual(getTimeFormatOptions('hour|minute|maybe'), getTimeFormatOptions(defaultTimeFormatString));

assert.equal(fromNativeDateInputValue('2026-02-29', 'UTC'), '');
assert.equal(fromNativeDateInputValue('2024-02-29', 'UTC'), '2024-02-29T00:00:00.000Z');
assert.equal(fromNativeDateTimeInputValue('2026-01-01T24:00', 'UTC'), '');
assert.equal(fromNativeDateTimeInputValue('2026-01-01T23:59', 'UTC'), '2026-01-01T23:59:00.000Z');
assert.equal(formatClockTime('25:00'), '25:00');
assert.equal(toDate(0).toISOString(), '1970-01-01T00:00:00.000Z');

assert.equal(formatNumber(1234567, {}, 'en-US'), '1,234,567');
assert.equal(formatNumber(1234567, {}, 'hi-IN'), '12,34,567');
assert.equal(timeAgo(new Date('2026-07-16T12:00:00.000Z'), 'en-US', Date.parse('2026-07-17T12:00:00.000Z')), 'yesterday');

console.log('Global localization boundary tests passed.');

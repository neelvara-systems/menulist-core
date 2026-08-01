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
    parseAcceptLanguageLocales,
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
import {
    formatCurrency,
    formatInrAmount,
    formatInrPaise,
    formatNumber,
    formatProcessingTime,
} from '../../src/utils/formatters';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
    getPublicCustomerLocale,
    getPublicSpiceLevelLabel,
} from '../../src/lib/localization/publicCustomerMessages';
import { localizePublicHoursText } from '../../src/lib/localization/publicHoursText';
import {
    buildCanonicalLanguageList,
    normalizeStoreLanguagePolicy,
} from '../../src/lib/localization/languagePolicy';
import { getStoreRenderLanguage } from '../../src/lib/localization/storeContent';
import {
    appendPublicLanguageParam,
    getNextIntlLocaleForPublicLanguage,
    normalizePublicLanguageCode,
    resolveStorePublicLanguage,
} from '../../src/lib/localization/publicRenderLanguage';

assert.equal(defaultTimezone, 'UTC', 'SSR timezone fallback must remain deterministic');
assert.equal(normalizeLocalePreference('en'), defaultLocale);
assert.equal(normalizeLocalePreference('pt_BR'), 'pt-BR');
assert.equal(normalizeLocalePreference('ar'), 'ar-SA');
assert.equal(normalizeLocalePreference('not-a-locale'), null);
assert.equal(normalizeLocalePreference('*'), null);
assert.deepEqual(
    parseAcceptLanguageLocales('fr-FR;q=0.4, hi-IN;q=0.9, en-US;q=0.8'),
    ['hi-IN', 'en-US', 'fr-FR'],
);
assert.deepEqual(
    parseAcceptLanguageLocales('*, invalid;q=1, ar;q=0, pt_BR;q=0.7, pt-BR;q=0.6'),
    ['pt-BR'],
);
assert.deepEqual(parseAcceptLanguageLocales('x'.repeat(8_193)), []);

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
assert.equal(
    fromNativeDateTimeInputValue('2026-03-08T02:30', 'America/New_York'),
    '',
    'nonexistent daylight-saving wall times must not be silently shifted',
);
assert.equal(formatClockTime('25:00'), '25:00');
assert.equal(toDate(0).toISOString(), '1970-01-01T00:00:00.000Z');
assert.equal(toDate({ seconds: 1, nanoseconds: 500_000_000 }).toISOString(), '1970-01-01T00:00:01.500Z');
assert.equal(Number.isNaN(toDate({ seconds: 1, nanoseconds: 1_000_000_000 }).getTime()), true);
assert.equal(Number.isNaN(toDate({ toDate: () => 'not a date' } as never).getTime()), true);
let timestampGetterExecuted = false;
assert.equal(Number.isNaN(toDate({
    get toDate() {
        timestampGetterExecuted = true;
        throw new Error('timestamp getter must not execute');
    },
} as never).getTime()), true);
assert.equal(timestampGetterExecuted, false);
assert.equal(Number.isNaN(toDate(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('timestamp descriptor lookup must remain contained');
    },
}) as never).getTime()), true);

assert.equal(formatNumber(1234567, {}, 'en-US'), '1,234,567');
assert.equal(formatNumber(1234567, {}, 'hi-IN'), '12,34,567');
assert.equal(formatCurrency(Number.NaN, 'USD', 'en-US'), '-');
assert.equal(formatCurrency(Number.POSITIVE_INFINITY, 'USD', 'en-US'), '-');
assert.equal(formatCurrency(100, 'not-a-currency', 'en-US'), '-');
assert.equal(formatInrAmount(Number.POSITIVE_INFINITY), '-');
assert.equal(formatInrPaise(Number.NaN), '-');
assert.equal(formatProcessingTime(Number.NaN), '-');
assert.equal(timeAgo(new Date('2026-07-16T12:00:00.000Z'), 'en-US', Date.parse('2026-07-17T12:00:00.000Z')), 'yesterday');

assert.equal(normalizePublicLanguageCode(' AR-sa '), 'ar');
assert.equal(normalizePublicLanguageCode(['ks-IN', 'en-US']), 'ks');
assert.equal(normalizePublicLanguageCode(''), null);
let publicLanguageCoercionAttempted = false;
assert.equal(normalizePublicLanguageCode({
    toString() {
        publicLanguageCoercionAttempted = true;
        throw new Error('public language coercion must not execute');
    },
} as unknown as string), null);
assert.equal(publicLanguageCoercionAttempted, false);
assert.equal(normalizePublicLanguageCode(new Proxy([], {
    get() {
        throw new Error('public language array access must remain contained');
    },
}) as string[]), null);
let storeDefaultLanguageCoercionAttempted = false;
assert.equal(getStoreRenderLanguage({
    activeLanguages: ['en', 'hi'],
    defaultLanguage: {
        toString() {
            storeDefaultLanguageCoercionAttempted = true;
            throw new Error('store default language coercion must not execute');
        },
    },
}), 'en');
assert.equal(storeDefaultLanguageCoercionAttempted, false);
assert.equal(getNextIntlLocaleForPublicLanguage('ks'), 'ks-IN');
assert.equal(getNextIntlLocaleForPublicLanguage('sat'), 'sat-IN');
assert.equal(getNextIntlLocaleForPublicLanguage('brx'), 'brx-IN');
assert.equal(getNextIntlLocaleForPublicLanguage('tl'), 'fil-PH');
assert.equal(getNextIntlLocaleForPublicLanguage('unsupported'), 'en-US');
assert.equal(getPublicCustomerLocale('ar'), 'ar-SA');
assert.equal(getPublicCustomerLocale('unsupported'), 'en-US');
assert.equal(getPublicCustomerLanguageDirection('ar'), 'rtl');
assert.equal(getPublicCustomerLanguageDirection('ks'), 'rtl');
assert.equal(getPublicCustomerLanguageDirection('hi'), 'ltr');
assert.deepEqual(buildCanonicalLanguageList(['hi', 42, 'ar']), ['en', 'hi', 'ar']);
assert.deepEqual(buildCanonicalLanguageList(new Proxy([], {
    get() {
        throw new Error('language list proxy must remain contained');
    },
})), ['en']);
assert.deepEqual(normalizeStoreLanguagePolicy({
    activeLanguages: [{ toString() { throw new Error('language coercion must not execute'); } }, 'hi'],
    defaultLanguage: 'hi',
}).activeLanguages, ['en', 'hi']);

const publicStorePolicy = {
    activeLanguages: ['hi', 'ar'],
    defaultLanguage: 'hi',
};
assert.equal(resolveStorePublicLanguage(publicStorePolicy, 'ar-SA'), 'ar');
assert.equal(resolveStorePublicLanguage(publicStorePolicy, 'fr'), 'hi');

const hindiPublicT = createPublicCustomerTranslator('hi');
const englishPublicT = createPublicCustomerTranslator('en');
assert.notEqual(
    hindiPublicT('feedback.submitFeedback'),
    englishPublicT('feedback.submitFeedback'),
    'Hindi fixed public chrome must resolve from the checked-in Hindi pack',
);
assert.equal(
    hindiPublicT('menu.redirectingIn', { count: 3 }),
    hindiPublicT('menu.redirectingIn', { count: '3' }),
    'public message interpolation must preserve number and string values consistently',
);
assert.equal(
    getPublicSpiceLevelLabel('very_hot', hindiPublicT),
    hindiPublicT('menu.spiceVeryHot'),
);
assert.equal(getPublicSpiceLevelLabel('chef_special', hindiPublicT), 'chef special');
assert.equal(getPublicSpiceLevelLabel('toString', hindiPublicT), 'toString');

assert.equal(
    appendPublicLanguageParam('/client/example?source=qr#menu', 'ar-SA'),
    '/client/example?source=qr&lang=ar#menu',
);
assert.equal(
    appendPublicLanguageParam('https://example.com/menu?source=qr#menu', 'ks'),
    'https://example.com/menu?source=qr&lang=ks#menu',
);
assert.equal(appendPublicLanguageParam('/client/example', null), '/client/example');

assert.equal(localizePublicHoursText('Closed', hindiPublicT), hindiPublicT('menu.closed'));
assert.equal(
    localizePublicHoursText('Opens next Monday at 10:00', hindiPublicT),
    hindiPublicT('menu.opensNextDayAt', {
        day: hindiPublicT('menu.days.Monday'),
        time: '10:00',
    }),
);
assert.equal(
    localizePublicHoursText('Owner-provided note', hindiPublicT),
    'Owner-provided note',
    'unrecognized owner-provided hours text must remain unchanged',
);

console.log('Global localization boundary tests passed.');

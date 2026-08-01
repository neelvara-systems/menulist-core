import assert from 'node:assert/strict';

import {
    addDaysToAnalyticsDateKey,
    ANALYTICS_DATE_RANGE_MAX_DAYS,
    getAnalyticsDateRange,
    parseAnalyticsDateKey,
} from '../../src/lib/analytics/dateKey';
import { getAnswerlatticeRetentionExpiry } from '../../src/lib/answerlattice/dataRetention';
import { buildCanonicalItemUrl } from '../../src/lib/menu/itemTruthUrls';
import { getAnswerlatticeArticleEmbeddingInput } from '../../src/lib/answerlattice/embeddingSourceBoundary';
import { mapWithConcurrency } from '../../src/lib/async/boundedConcurrency';
import { normalizeGeoCoordinateDraft } from '../../src/lib/businessIdentity/geoCoordinates';
import {
    getBrandName,
    getStoreContextName,
} from '../../src/lib/businessIdentity/names';
import { normalizeCategoryIconValue } from '../../src/lib/categoryIcons';
import {
    normalizeImageProviderOrientation,
    normalizeImageProviderPage,
    normalizeImageProviderQuery,
} from '../../src/lib/imageProviderRequests';
import {
    getLocalizedStringList,
    getLocalizedText,
    isLocalizedStringList,
    isLocalizedText,
    normalizeStringList,
} from '../../src/lib/localization/text';
import { localizePublicHoursText } from '../../src/lib/localization/publicHoursText';
import type { PublicCustomerTranslator } from '../../src/lib/localization/publicCustomerMessages';
import {
    hasAnyNonEmptyDescription,
    hasMeaningfulDescriptionsForLanguages,
} from '../../src/lib/menu/descriptionQuality';
import {
    normalizePublicMenuBackground,
    PUBLIC_MENU_BACKGROUND_DATA_PREVIEW_MAX_LENGTH,
} from '../../src/lib/menu/publicMenuBackground';
import {
    getPrimaryPublicMenuImage,
    normalizePublicMenuImages,
} from '../../src/lib/menu/publicMenuImages';
import {
    getBusinessCoverAltText,
    getMenuItemImageAltText,
} from '../../src/lib/media/altText';
import { getPublicMenuSpecialNote } from '../../src/lib/menu/publicMenuSpecialNote';
import {
    getPublicMenuFreshness,
    toPublicIsoDate,
} from '../../src/lib/menu/publicMenuStructuredData';
import { getTrustSignalFreshnessText } from '../../src/lib/menu/trustSignalFreshness';
import { removeCompensatedStoreFromMappings } from '../../src/lib/onboarding/compensatedStoreMappings';
import { formatOwnerBusinessHealthDateKey } from '../../src/lib/ownerBusinessAssistant/freshness';
import { buildAnalyticsPeriodArtifacts } from '../../src/lib/ownerBusinessAssistant/server/answerArtifacts';
import {
    isPosSyncTestResponse,
    isSuccessfulPosSyncTestResponse,
} from '../../src/lib/posSync/testResponse';
import { isPlatformEntityBlocked } from '../../src/lib/platform/entityBlock';
import {
    createRandomIdSegment,
    RUNTIME_RANDOM_ID_SEGMENT_MAX_LENGTH,
} from '../../src/lib/runtime/randomId';
import {
    removeDangerousKeys,
    removeKeys,
} from '../../src/lib/security/sanitizeObject';
import {
    normalizeMetaText,
    normalizeSeoKeywords,
} from '../../src/lib/seo/publicMetadata';
import {
    ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS,
    extractPlainTextFromEditorContent,
} from '../../src/lib/vectorEmbeddings/articleEmbeddings';
import { firstText } from '../../src/services/ai/businessCopy/utils';
import {
    getNormalizedNameFromObject,
    normalizeName,
} from '../../src/lib/extraction/normalize';
import { isIEDevice } from '../../src/utils/DetectUserAgent';
import {
    getGradientValue,
    getStyleValueAndType,
} from '../../src/utils/getColorsValue';
import {
    blobToBase64,
    getBase64Length,
    getNewIndex,
    removeObjRef,
    updateDeepPathValue,
} from '../../src/utils/utils';
import {
    extractUiErrorMessage,
    getSafeUiErrorMessage,
} from '../../src/lib/errors/uiErrorMessages';
import { findCurrentRoute } from '../../src/utils/navigation';
import {
    ValidateEmail,
    ValidateEmailPhone,
    ValidatePhone,
    ValidateWebsiteURLs,
} from '../../src/utils/validations';

assert.equal(firstText('  Direct name  '), 'Direct name');

const cloneSourceWithUnsafeKey = {
    nested: { value: 'preserved' },
    when: new Date('2026-07-29T00:00:00.000Z'),
};
Object.defineProperty(cloneSourceWithUnsafeKey, '__proto__', {
    enumerable: true,
    value: { polluted: true },
});
const safeClone = removeObjRef(cloneSourceWithUnsafeKey);
assert.equal(removeObjRef(null), null);
assert.equal(removeObjRef(undefined), undefined);
assert.notEqual(safeClone, cloneSourceWithUnsafeKey);
assert.deepEqual(safeClone.nested, { value: 'preserved' });
assert.notEqual(safeClone.nested, cloneSourceWithUnsafeKey.nested);
assert.equal(safeClone.when.toISOString(), '2026-07-29T00:00:00.000Z');
assert.notEqual(safeClone.when, cloneSourceWithUnsafeKey.when);
assert.equal(Object.hasOwn(safeClone, '__proto__'), false);
assert.equal(({} as { polluted?: boolean }).polluted, undefined);
assert.equal(getNewIndex([{ order: 7 }, { order: 2 }], 'order'), 8);
assert.equal(getNewIndex([{ order: '9' }, { order: Number.NaN }], 'order'), 0);
assert.deepEqual(updateDeepPathValue({}, 'profile.name', 'Owner'), {
    profile: { name: 'Owner' },
});
assert.throws(
    () => updateDeepPathValue({}, '__proto__.polluted', true),
    /Unsafe or empty object path segment/,
);
assert.equal(firstText({ en: '', hi: '  नमस्ते  ' }), 'नमस्ते');
assert.equal(firstText(['not', 'a', 'localized', 'map']), '');

const localizedWithThrowingGetter = Object.create(null) as Record<string, unknown>;
Object.defineProperty(localizedWithThrowingGetter, 'broken', {
    enumerable: true,
    get() {
        throw new Error('getter must remain contained');
    },
});
localizedWithThrowingGetter.en = '  Valid after broken  ';
assert.equal(firstText(localizedWithThrowingGetter), 'Valid after broken');
assert.equal(firstText(new Proxy({}, {
    ownKeys() {
        throw new Error('proxy enumeration must remain contained');
    },
})), '');
assert.equal(normalizeMetaText({
    get broken() {
        throw new Error('metadata getter must remain contained');
    },
    en: '  Public menu title  ',
}), 'Public menu title');
assert.equal(normalizeMetaText(new Proxy({}, {
    ownKeys() {
        throw new Error('metadata enumeration must remain contained');
    },
}), 'Fallback title'), 'Fallback title');
assert.deepEqual(normalizeSeoKeywords([' menu ', 42 as unknown as string, 'owner']), ['menu', 'owner']);
assert.deepEqual(normalizeSeoKeywords(new Proxy([], {
    get() {
        throw new Error('keyword list proxy must remain contained');
    },
})), []);
const publicHoursTranslator: PublicCustomerTranslator = (key) => key;
assert.equal(
    localizePublicHoursText('toString', publicHoursTranslator),
    'toString',
    'prototype property names must remain ordinary public hours text',
);
assert.equal(normalizeName(42), '');
assert.equal(getNormalizedNameFromObject({ en: 42, hi: '  नमस्ते!  ' }), 'नमस्ते');
assert.equal(getNormalizedNameFromObject(new Proxy({}, {
    ownKeys() {
        throw new Error('extracted name enumeration must remain contained');
    },
})), '');
assert.equal(parseAnalyticsDateKey('2026-02-28').toISOString(), '2026-02-28T00:00:00.000Z');
assert.throws(() => parseAnalyticsDateKey('2026-02-31'), RangeError);
assert.throws(() => parseAnalyticsDateKey('not-a-date'), RangeError);
assert.deepEqual(getAnalyticsDateRange('2026-02-28', '2026-03-02'), [
    '2026-02-28',
    '2026-03-01',
    '2026-03-02',
]);
assert.deepEqual(getAnalyticsDateRange('2026-03-02', '2026-02-28'), []);
assert.equal(ANALYTICS_DATE_RANGE_MAX_DAYS, 3_660);
assert.throws(() => getAnalyticsDateRange('2000-01-01', '2020-01-01'), RangeError);
assert.throws(() => addDaysToAnalyticsDateKey('2026-01-01', Number.POSITIVE_INFINITY), RangeError);
assert.equal(
    createRandomIdSegment(Number.MAX_SAFE_INTEGER).length <= RUNTIME_RANDOM_ID_SEGMENT_MAX_LENGTH,
    true,
);
assert.equal(extractUiErrorMessage(new Error('Owner-safe message')), 'Owner-safe message');
assert.equal(extractUiErrorMessage(Object.create({ message: 'inherited message' })), null);
assert.equal(extractUiErrorMessage({
    get message() {
        throw new Error('message getter must remain contained');
    },
}), null);
assert.equal(extractUiErrorMessage(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('message descriptor lookup must remain contained');
    },
})), null);
assert.equal(
    getSafeUiErrorMessage({
        get message() {
            throw new Error('UI message getter must remain contained');
        },
    }, 'Something went wrong', { allowTrustedPlainText: true }),
    'Something went wrong',
);

assert.equal(
    buildCanonicalItemUrl('HTTPS://example.menulist.ai/menu', 'item / 1', ' hi '),
    'https://example.menulist.ai/menu?item=item+%2F+1&lang=hi',
);
assert.equal(
    buildCanonicalItemUrl('/menu?existing=1#section', 'item-1'),
    '/menu?existing=1&item=item-1#section',
);
assert.equal(
    buildCanonicalItemUrl('https://[malformed', 'item-1'),
    'https://[malformed',
);
assert.equal(buildCanonicalItemUrl('/menu', null), '/menu');

assert.equal(
    normalizePublicMenuBackground('data:image/png;base64,AAAA', { allowDataPreview: true }),
    'data:image/png;base64,AAAA',
);
const oversizedDataPreviewPayloadLength = (
    PUBLIC_MENU_BACKGROUND_DATA_PREVIEW_MAX_LENGTH + 4
    - 'data:image/png;base64,'.length
);
assert.equal(
    normalizePublicMenuBackground(
        `data:image/png;base64,${'A'.repeat(oversizedDataPreviewPayloadLength)}`,
        { allowDataPreview: true },
    ),
    null,
);

const coerciveValidationInput = {
    toString() {
        throw new Error('validation coercion must not execute');
    },
};
assert.equal(ValidateEmail('owner@example.com'), true);
assert.equal(ValidatePhone('212-555-1234'), true);
assert.equal(ValidateEmailPhone(coerciveValidationInput), false);
assert.equal(ValidateWebsiteURLs(coerciveValidationInput), false);
assert.equal(getGradientValue({
    colors: [' #fff ', '#000'],
    props: { direction: 'to right', type: 'linear' },
    type: 'linear',
}), 'linear-gradient(to right, #fff, #000)');
assert.deepEqual(getStyleValueAndType(12), { value: 12, type: 'px' });
assert.deepEqual(getStyleValueAndType(' 50% '), { value: '50', type: '%' });
assert.deepEqual(getStyleValueAndType(coerciveValidationInput), { value: 0, type: 'px' });
const hostileStoreName = new Proxy({}, {
    get() {
        throw new Error('store identity getter must remain contained');
    },
});
assert.equal(getBrandName(hostileStoreName, 'Fallback Brand'), 'Fallback Brand');
assert.equal(getStoreContextName(hostileStoreName, 'Fallback Store'), 'Fallback Store');
assert.equal(normalizeCategoryIconValue(new Proxy({}, {
    get() {
        throw new Error('category icon getter must remain contained');
    },
})), '');
const hostileAltText = Object.create(null) as Record<string, unknown>;
Object.defineProperty(hostileAltText, 'broken', {
    enumerable: true,
    get() {
        throw new Error('alt-text getter must remain contained');
    },
});
hostileAltText.en = '  Lunch ';
assert.equal(getBusinessCoverAltText(hostileAltText), 'Lunch business cover');
assert.equal(getMenuItemImageAltText(new Proxy({}, {
    ownKeys() {
        throw new Error('alt-text enumeration must remain contained');
    },
})), 'Menu item image');
assert.equal(isPlatformEntityBlocked({ blocked: false, tenantBlocked: false }), false);
assert.equal(isPlatformEntityBlocked({ blockDetails: { blocked: true } }), true);
assert.equal(isPlatformEntityBlocked(new Proxy({}, {
    get() {
        throw new Error('block-state getter must fail closed');
    },
})), true);

const inheritedAuthData = Object.assign(
    Object.create({ platformRole: 'super_admin', pId: 'other-product' }),
    { email: 'owner@example.com' },
) as Record<string, unknown>;
assert.deepEqual(removeDangerousKeys(inheritedAuthData), { email: 'owner@example.com' });
const authDataWithDangerousOwnKey = Object.create(null) as Record<string, unknown>;
authDataWithDangerousOwnKey.email = 'owner@example.com';
Object.defineProperty(authDataWithDangerousOwnKey, '__proto__', {
    enumerable: true,
    value: { platformRole: 'super_admin' },
});
assert.deepEqual(removeKeys(authDataWithDangerousOwnKey, []), { email: 'owner@example.com' });
assert.deepEqual(removeDangerousKeys(new Proxy({}, {
    ownKeys() {
        throw new Error('auth object enumeration must remain contained');
    },
})), {});

assert.equal(isLocalizedText({ en: 'Menu' }), true);
assert.equal(isLocalizedText({ en: null }), false);
assert.equal(getLocalizedText({ en: null, hi: 'नाश्ता' }, 'en', 'en', 'Fallback'), 'नाश्ता');
assert.equal(isLocalizedStringList({ en: ['Cafe', 'Breakfast'] }), true);
assert.equal(isLocalizedStringList({ en: [coerciveValidationInput] }), false);
assert.deepEqual(normalizeStringList([' Cafe ', coerciveValidationInput, 7]), ['Cafe']);
const hostileLocalizedText = new Proxy({}, {
    ownKeys() {
        throw new Error('localized text enumeration must remain contained');
    },
});
assert.equal(getLocalizedText(hostileLocalizedText, 'en', 'en', 'Fallback'), 'Fallback');
assert.deepEqual(getLocalizedStringList(hostileLocalizedText, 'en', 'en', ['Fallback']), ['Fallback']);

const coerciveImageProviderInput = {
    toString() {
        throw new Error('image-provider string coercion must not execute');
    },
    valueOf() {
        throw new Error('image-provider numeric coercion must not execute');
    },
};
assert.equal(normalizeImageProviderPage(coerciveImageProviderInput), 1);
assert.equal(normalizeImageProviderOrientation(coerciveImageProviderInput), 'landscape');
assert.equal(normalizeImageProviderQuery(coerciveImageProviderInput), '');

const hostileFreshnessTimestamp = new Proxy({}, {
    get() {
        throw new Error('public freshness timestamp getter must remain contained');
    },
});
assert.equal(toPublicIsoDate(hostileFreshnessTimestamp), undefined);
assert.equal(toPublicIsoDate(new Proxy(new Date('2026-07-29T00:00:00.000Z'), {})), undefined);
assert.deepEqual(getPublicMenuFreshness(
    {
        lastPublishedAt: { seconds: 0 },
        menuVersion: coerciveValidationInput,
    },
    { modifiedOn: '2026-07-29T00:00:00.000Z' },
), {
    dateModified: '1970-01-01T00:00:00.000Z',
    lastPublishedAt: '1970-01-01T00:00:00.000Z',
    menuVersion: undefined,
});
assert.deepEqual(getPublicMenuFreshness(new Proxy({}, {
    get() {
        throw new Error('project freshness getter must remain contained');
    },
}), null), {
    dateModified: undefined,
    lastPublishedAt: undefined,
    menuVersion: undefined,
});

const publicImageWithHostilePrivateField = Object.create(null) as Record<string, unknown>;
publicImageWithHostilePrivateField.src = ' https://cdn.example/menu.jpg ';
publicImageWithHostilePrivateField.variants = {
    medium: ' https://cdn.example/menu-medium.jpg ',
    original: 7,
};
Object.defineProperty(publicImageWithHostilePrivateField, 'preparedMedia', {
    enumerable: true,
    get() {
        throw new Error('private image field must not be read');
    },
});
assert.deepEqual(normalizePublicMenuImages(publicImageWithHostilePrivateField), [{
    url: 'https://cdn.example/menu.jpg',
    variants: { medium: 'https://cdn.example/menu-medium.jpg' },
}]);
assert.equal(
    getPrimaryPublicMenuImage({ images: publicImageWithHostilePrivateField }),
    'https://cdn.example/menu-medium.jpg',
);
assert.deepEqual(normalizePublicMenuImages(new Proxy({}, {
    ownKeys() {
        throw new Error('image collection enumeration must remain contained');
    },
})), []);

assert.equal(getPublicMenuSpecialNote({
    language: 'en',
    primaryLanguage: 'en',
    projectData: new Proxy({}, {
        get() {
            throw new Error('public special note getter must remain contained');
        },
    }),
    storeDetails: {
        publicPresence: {
            specialNote: { en: '  Service charge applies. ' },
        },
    },
}), 'Service charge applies.');

assert.equal(
    getAnswerlatticeRetentionExpiry('ownerNotificationRateLimits', 0).toMillis(),
    2 * 24 * 60 * 60 * 1000,
);
assert.throws(
    () => getAnswerlatticeRetentionExpiry('ownerNotificationRateLimits', Number.NaN),
    /answerlattice_retention_from_invalid/,
);

assert.match(formatOwnerBusinessHealthDateKey('2026-02-28') || '', /2026/);
assert.equal(formatOwnerBusinessHealthDateKey('2026-02-31'), null);

assert.deepEqual(normalizeGeoCoordinateDraft(0, 0), {
    ok: true,
    geo: { latitude: 0, longitude: 0 },
});
assert.deepEqual(normalizeGeoCoordinateDraft(coerciveValidationInput, '10'), {
    ok: false,
    geo: null,
});

const hostileTrustTimestamp = new Proxy({}, {
    get() {
        throw new Error('trust timestamp getter must remain contained');
    },
});
assert.equal(
    getTrustSignalFreshnessText(hostileTrustTimestamp, new Date('2026-07-29T00:00:00.000Z')),
    null,
);

assert.equal(isPosSyncTestResponse({
    responseTime: -1,
    statusCode: 200,
    success: true,
}), false);
assert.equal(isSuccessfulPosSyncTestResponse({
    responseTime: 10,
    statusCode: 99,
    success: true,
}), false);
assert.equal(isPosSyncTestResponse({
    error: { private: true },
    responseTime: 10,
    statusCode: null,
    success: false,
}), false);

const hostileDescriptionMap = new Proxy({}, {
    ownKeys() {
        throw new Error('description enumeration must remain contained');
    },
});
assert.equal(hasAnyNonEmptyDescription(hostileDescriptionMap), false);
assert.equal(hasMeaningfulDescriptionsForLanguages(hostileDescriptionMap, ['en']), false);

const metricArtifacts = buildAnalyticsPeriodArtifacts({
    metrics: {
        actionSessions: Number.POSITIVE_INFINITY,
        itemClicks: Number.NaN,
        menuVisits: 12,
        searches: 3,
    },
    scope: 'project',
} as Parameters<typeof buildAnalyticsPeriodArtifacts>[0]);
assert.deepEqual(metricArtifacts[0], {
    type: 'metric_row',
    metrics: [
        { label: 'Menu visits', value: '12' },
        { label: 'Item clicks', value: '0' },
        { label: 'Searches', value: '3' },
        { label: 'Action sessions', value: '0' },
    ],
});

async function run(): Promise<void> {
    assert.equal(getBase64Length('data:image/png;base64,AQIDBA=='), 4);
    assert.equal(getBase64Length('data:image/jpeg;base64,AQID'), 3);
    assert.equal(getBase64Length('data:text/plain,hello%20world'), 11);
    assert.equal(getBase64Length('data:text/plain,hello world'), 11);
    assert.equal(getBase64Length(null), 0);

    const originalFileReaderDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
    class FailingFileReader {
        error = new Error('fixture read failure');
        onerror: (() => void) | null = null;
        onloadend: (() => void) | null = null;
        result: string | ArrayBuffer | null = null;

        readAsDataURL(): void {
            this.onerror?.();
        }
    }
    Object.defineProperty(globalThis, 'FileReader', {
        configurable: true,
        value: FailingFileReader,
    });
    await assert.rejects(() => blobToBase64(new Blob(['fixture'])), /fixture read failure/);
    if (originalFileReaderDescriptor) {
        Object.defineProperty(globalThis, 'FileReader', originalFileReaderDescriptor);
    } else {
        Reflect.deleteProperty(globalThis, 'FileReader');
    }

    const workerIndexes: number[] = [];
    const concurrencyResults = await mapWithConcurrency(
        ['a', 'b', 'c'],
        Number.NaN,
        async (value, index) => {
            workerIndexes.push(index);
            return `${index}:${value}`;
        },
    );
    assert.deepEqual(concurrencyResults, ['0:a', '1:b', '2:c']);
    assert.deepEqual(workerIndexes, [0, 1, 2]);

    const hostileStore = Object.create(null);
    Object.defineProperty(hostileStore, 'storeId', {
        enumerable: true,
        get() {
            throw new Error('compensation getter must remain contained');
        },
    });
    assert.deepEqual(
        removeCompensatedStoreFromMappings(
            [{ storeId: 7 }, hostileStore, { storeId: 8 }],
            7,
        ),
        [hostileStore, { storeId: 8 }],
    );

    const cyclicRoot: Record<string, unknown> = { type: 'doc', content: [] };
    (cyclicRoot.content as unknown[]).push(
        { type: 'text', text: 'First' },
        cyclicRoot,
        { type: 'image', attrs: { alt: 'Menu', title: 'photo' } },
        new Proxy({}, {
            get() {
                throw new Error('editor node proxy must remain contained');
            },
        }),
        { type: 'text', text: 'x'.repeat(ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS + 100) },
    );
    const extractedText = extractPlainTextFromEditorContent(cyclicRoot);
    assert.match(extractedText, /^First Menu photo /);
    assert.equal(extractedText.length, ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS);

    const embeddingInput = getAnswerlatticeArticleEmbeddingInput({
        content: {
            type: 'doc',
            content: [{ type: 'text', text: 'Fallback editor content remains long enough for embedding input.' }],
        },
        plainText: '   ',
        title: 'Embedding boundary',
    });
    assert.match(embeddingInput?.text || '', /Fallback editor content/);
    assert.equal(getAnswerlatticeArticleEmbeddingInput({
        content: {},
        plainText: {
            toString() {
                throw new Error('coercion must not execute');
            },
        },
        title: 'Embedding boundary',
    }), null);

    assert.equal(isIEDevice('Mozilla/5.0 Trident/7.0; rv:11.0'), true);
    assert.equal(isIEDevice('Mozilla/5.0 Chrome/140.0'), false);

    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { pathname: '/admin/settings' } },
    });
    const routeFixtures = [
        { icon: null as never, name: 'Root', url: '/' },
        { icon: null as never, name: 'Admin', url: '/admin' },
        { icon: null as never, name: 'Settings', url: '/admin/settings' },
    ];
    assert.equal(findCurrentRoute(routeFixtures)?.name, 'Settings');
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { pathname: '/' } },
    });
    assert.equal(findCurrentRoute(routeFixtures)?.name, 'Root');
    if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
        Reflect.deleteProperty(globalThis, 'window');
    }

    console.log('Small runtime contract tests passed.');
}

void run();

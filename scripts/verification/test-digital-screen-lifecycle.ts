#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { FEATURE_FLAGS } from '../../src/config/features';
import {
    getActiveScreenSlides,
    getOwnerUploadExpiry,
    isSlideExpired,
    isValidScreenToken,
    getScreenReloadGuardKey,
    guardedReloadWithJitter,
    shouldSuppressScreenReload,
} from '../../src/lib/screen/utils';
import type { ScreenSlide } from '../../src/types/campaigns';
import {
    DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR,
    getFittingScreenColumnAssignments,
    getLeastUsedFittingScreenColumn,
    getMenuBoardLayout,
    getSmallestFittingScreenColumnCount,
    shouldUseDigitalScreenOfflineCache,
} from '../../src/lib/screen/screenRuntime';
import { normalizePublicAccentColor } from '../../src/lib/obp/accentColor';
import { getDigitalScreenHealth } from '../../src/lib/screen/screenHealth';
import {
    getDigitalScreenManagementClientError,
    isDigitalScreenManagementResponse,
} from '../../src/lib/screen/screenManagementContracts';
import {
    extractScreenMenuItemsFromProject,
    normalizeCachedScreenMenuItems,
    normalizeCachedScreenSlides,
    normalizeScreenTags,
    resolveScreenText,
} from '../../src/lib/screen/screenContent';
import { generatePrivateScreenToken } from '../../src/lib/screen/privateScreenControl';
import { resolvePrivateScreenControlInput } from '../backfill-digital-screen-private-controls';

function slide(id: string, expiresAtMs: number): ScreenSlide {
    return {
        availabilityLinked: false,
        availabilityReliability: 'high',
        confidenceScore: 1,
        id,
        imageUrl: `https://example.com/${id}.webp`,
        source: 'pinned',
        type: 'owner_upload',
        validUntil: Timestamp.fromMillis(expiresAtMs),
    };
}

const now = Date.now();
const expired = slide('expired', now - 60_000);
const activeA = slide('active-a', now + 60_000);
const activeB = slide('active-b', now + 120_000);

const validManagementResponse = {
    screen: {
        contentVersion: 1,
        currentMinConfidence: 0.7,
        enabled: true,
        lastContentChangeAtMs: now,
        lastRefreshedMs: now,
        ownerOverrideEnabled: false,
        pinnedSlides: [{
            availabilityLinked: false,
            availabilityReliability: 'high',
            confidenceScore: 1,
            id: 'owner-slide',
            imageUrl: 'https://example.com/owner-slide.webp',
            source: 'pinned',
            type: 'owner_upload',
            validUntilMs: now + 60_000,
        }],
        screenToken: 'Ab12Cd34',
    },
    success: true,
};
assert.equal(
    isDigitalScreenManagementResponse(validManagementResponse),
    true,
    'Digital Screens must accept its exact bounded owner transport response',
);
assert.equal(
    isDigitalScreenManagementResponse({
        ...validManagementResponse,
        screen: {
            ...validManagementResponse.screen,
            pinnedSlides: { 0: validManagementResponse.screen.pinnedSlides[0], length: 1 },
        },
    }),
    false,
    'Digital Screens must reject array-like response slide collections before hydration',
);
assert.equal(
    isDigitalScreenManagementResponse({
        ...validManagementResponse,
        screen: {
            ...validManagementResponse.screen,
            lastRefreshedMs: Number.MAX_SAFE_INTEGER,
        },
    }),
    false,
    'Digital Screens must reject response timestamps outside the Firestore range',
);

assert.equal(
    DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR,
    '#f4b740',
    'Digital Screens must retain a stable fallback when no OBP accent is configured',
);
assert.equal(
    normalizePublicAccentColor(' #0F8 '),
    '#00ff88',
    'Digital Screens must inherit the canonical normalized OBP accent',
);
assert.equal(
    normalizePublicAccentColor('not-a-color'),
    null,
    'Digital Screens must reject malformed owner accent values',
);

assert.equal(isSlideExpired(expired), true, 'Past custom slide must be expired');
assert.equal(isSlideExpired(activeA), false, 'Future custom slide must remain active');
assert.deepEqual(
    getActiveScreenSlides([expired, activeA, activeB], 1).map((entry) => entry.id),
    ['active-a'],
    'Expired slides must not consume the configured active-slide cap',
);
assert.deepEqual(
    getActiveScreenSlides([activeA], 0),
    [],
    'Zero configured capacity must admit no active slides',
);

const beforeExpiry = Date.now();
const configuredExpiry = getOwnerUploadExpiry(FEATURE_FLAGS.DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS).toMillis();
const expectedDuration = FEATURE_FLAGS.DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
assert.ok(
    configuredExpiry >= beforeExpiry + expectedDuration
        && configuredExpiry <= Date.now() + expectedDuration + 1_000,
    'Owner-upload expiry must use the shared feature duration',
);

assert.equal(isValidScreenToken('Ab12Cd34'), true, 'Legacy valid screen token must remain supported');
assert.equal(isValidScreenToken('a1b2c3d4e5f6g7h8i9j0kl'), true, 'Current screen token must be supported');
assert.equal(isValidScreenToken('../screen-token'), false, 'Malformed screen token must fail closed');
assert.deepEqual(
    resolvePrivateScreenControlInput(
        '42',
        { screenToken: 'Ab12Cd34' },
        { sId: 42, storeId: '42', tId: 7, tenantId: '7' },
    ),
    { screenToken: 'Ab12Cd34', storeId: '42', tenantId: '7' },
    'private-control backfill input must correlate exact store and tenant aliases',
);
assert.equal(
    resolvePrivateScreenControlInput('42', undefined, { storeId: '42', tenantId: '7' }),
    null,
    'private-control backfill input must skip a missing legacy screen object',
);
assert.equal(
    resolvePrivateScreenControlInput(
        '42',
        { screenToken: 'Ab12Cd34' },
        { storeId: '43', tenantId: '7' },
    ),
    null,
    'private-control backfill input must reject a contradictory embedded store identity',
);
assert.equal(
    resolvePrivateScreenControlInput(
        '42',
        { screenToken: 'Ab12Cd34' },
        { storeId: '42', tenantId: '7', tId: '8' },
    ),
    null,
    'private-control backfill input must reject contradictory tenant aliases',
);
assert.equal(
    resolvePrivateScreenControlInput(
        '42',
        { screenToken: 'Ab12Cd34' },
        { storeId: '42', tenantId: '../tenant' },
    ),
    null,
    'private-control backfill input must reject a path-shaped tenant identity',
);
assert.equal(
    getScreenReloadGuardKey('screen', 'Ab12Cd34'),
    'menulist-screen-Ab12Cd34-last-reload',
    'reload throttling must be scoped to the exact screen token',
);
assert.notEqual(
    getScreenReloadGuardKey('screen', 'Ab12Cd34'),
    getScreenReloadGuardKey('screen', 'Ef56Gh78'),
    'one screen token must not suppress another screen token reload',
);
assert.equal(shouldSuppressScreenReload(String(now - 1_000), now), true);
assert.equal(
    shouldSuppressScreenReload(String(now + 86_400_000), now),
    false,
    'a corrupt future timestamp must not suppress screen recovery',
);
assert.equal(shouldSuppressScreenReload(`${now - 1_000}junk`, now), false);
assert.equal(shouldSuppressScreenReload('-1', now), false);

const normalizedCachedItems = normalizeCachedScreenMenuItems([
    {
        id: ' cached-item ',
        name: ' Cached item ',
        available: true,
        categoryName: 'Lunch',
        price: '12.50',
        tags: ['Vegetarian'],
        internalCost: 900,
        ownerNotes: 'private',
    },
    { id: 'missing-availability', name: 'Unsafe cached item' },
]);
assert.deepEqual(
    normalizedCachedItems.map((item) => item.id),
    ['cached-item'],
    'Offline Menu Board cache must project only complete safe item records',
);
assert.equal(
    'internalCost' in normalizedCachedItems[0] || 'ownerNotes' in normalizedCachedItems[0],
    false,
    'the public screen item projector must omit undeclared persisted fields',
);
assert.deepEqual(
    normalizeCachedScreenMenuItems({ length: 1, 0: normalizedCachedItems[0] }),
    [],
    'Array-like browser storage must not be trusted as a menu-item array',
);

const futureExpirySeconds = Math.floor((now + 120_000) / 1_000);
const expiredExpirySeconds = Math.floor((now - 120_000) / 1_000);
const normalizedCachedSlides = normalizeCachedScreenSlides([
    {
        availabilityLinked: false,
        availabilityReliability: 'high',
        confidenceScore: 1,
        id: 'future-owner-slide',
        imageUrl: 'https://example.com/future.webp',
        source: 'pinned',
        type: 'owner_upload',
        validUntil: { seconds: futureExpirySeconds },
    },
    {
        availabilityLinked: false,
        availabilityReliability: 'high',
        confidenceScore: 1,
        id: 'expired-owner-slide',
        imageUrl: 'https://example.com/expired.webp',
        source: 'pinned',
        type: 'owner_upload',
        validUntil: { seconds: expiredExpirySeconds },
    },
    {
        availabilityLinked: false,
        availabilityReliability: 'high',
        confidenceScore: 1,
        id: 'out-of-range-owner-slide',
        imageUrl: 'https://example.com/out-of-range.webp',
        source: 'pinned',
        type: 'owner_upload',
        validUntil: { seconds: 411_187_104_000 },
    },
    { length: 1 },
], now);
assert.deepEqual(
    normalizedCachedSlides.map((entry) => entry.id),
    ['future-owner-slide'],
    'Offline Highlights cache must omit expired, out-of-range, and malformed slide records',
);

const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalDateNow = Date.now;
const originalMathRandom = Math.random;
const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
);
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'window',
);
const scheduledReloads: Array<{ callback: () => void; delay: number }> = [];
const reloadStorage = new Map<string, string>();
let reloadCount = 0;
let reloadClock = now;
try {
    globalThis.setTimeout = ((callback: () => void, delay?: number) => {
        scheduledReloads.push({ callback, delay: delay || 0 });
        return scheduledReloads.length;
    }) as typeof setTimeout;
    globalThis.clearTimeout = (() => undefined) as typeof clearTimeout;
    Date.now = () => reloadClock;
    Math.random = () => 0;
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            getItem: (key: string) => reloadStorage.get(key) || null,
            setItem: (key: string, value: string) => reloadStorage.set(key, value),
        },
    });
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { reload: () => { reloadCount += 1; } } },
    });
    reloadStorage.set(
        'menulist-screen-Ab12Cd34-last-reload',
        String(reloadClock - 1_000),
    );

    const cancelReload = guardedReloadWithJitter('screen', 'Ab12Cd34');
    assert.equal(scheduledReloads.length, 1, 'Jitter must own one initial timer');
    scheduledReloads.shift()?.callback();
    assert.equal(reloadCount, 0, 'Active guard must suppress the first attempt');
    assert.equal(
        scheduledReloads[0]?.delay,
        30_000,
        'Suppressed content refresh must retain a bounded retry',
    );
    reloadClock += 30_001;
    scheduledReloads.shift()?.callback();
    assert.equal(reloadCount, 1, 'Content refresh must retry after guard expiry');
    cancelReload();
} finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
    if (originalLocalStorageDescriptor) {
        Object.defineProperty(
            globalThis,
            'localStorage',
            originalLocalStorageDescriptor,
        );
    } else {
        Reflect.deleteProperty(globalThis, 'localStorage');
    }
    if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
        Reflect.deleteProperty(globalThis, 'window');
    }
}

assert.equal(
    shouldUseDigitalScreenOfflineCache({
        cachedContentVersion: 3,
        cachedEntryCount: 12,
        initialContentVersion: 4,
        online: false,
    }),
    false,
    'An old offline payload must never override a newer canonical content version',
);
assert.equal(
    shouldUseDigitalScreenOfflineCache({
        cachedContentVersion: 4,
        cachedEntryCount: 12,
        initialContentVersion: 4,
        online: true,
    }),
    false,
    'An online display must render the current server payload instead of local cache',
);
assert.equal(
    shouldUseDigitalScreenOfflineCache({
        cachedContentVersion: 4,
        cachedEntryCount: 12,
        initialContentVersion: 4,
        online: false,
    }),
    true,
    'A version-matched payload may support an offline display',
);
assert.equal(
    shouldUseDigitalScreenOfflineCache({
        cachedContentVersion: { valueOf: () => { throw new Error('must not execute'); } },
        cachedEntryCount: 12,
        initialContentVersion: 4,
        online: false,
    }),
    false,
    'Offline cache admission must not execute unknown numeric coercion hooks',
);
assert.equal(
    shouldUseDigitalScreenOfflineCache({
        cachedContentVersion: '04',
        cachedEntryCount: true,
        initialContentVersion: 4,
        online: false,
    }),
    false,
    'Offline cache admission must reject non-canonical numeric scalars',
);

assert.deepEqual(
    getMenuBoardLayout(1280, 720),
    { columnCount: 2, itemsPerColumn: 11 },
    'A 720p landscape TV must use the compact two-column layout',
);
assert.deepEqual(
    getMenuBoardLayout(1920, 1080),
    { columnCount: 3, itemsPerColumn: 12 },
    'A 1080p TV must use the higher-capacity layout',
);
assert.deepEqual(
    getMenuBoardLayout(768, 1024),
    { columnCount: 1, itemsPerColumn: 12 },
    'Standard portrait screens must stay single-column while using their vertical capacity',
);
assert.deepEqual(
    getMenuBoardLayout(1080, 1920),
    { columnCount: 1, itemsPerColumn: 14 },
    'Tall portrait signage may use its additional vertical capacity',
);
assert.equal(
    getLeastUsedFittingScreenColumn([6, 6, 5], 5, 12),
    2,
    '1080p category placement must use the least-filled fitting column',
);
assert.equal(
    getLeastUsedFittingScreenColumn([6, 0], 6, 11),
    1,
    '720p category placement must balance both columns before stacking',
);
assert.equal(
    getSmallestFittingScreenColumnCount([6, 6, 5, 5], 12, 3, 2),
    2,
    'A sparse 1080p menu must prefer two balanced columns over a mostly empty third column',
);
assert.equal(
    getSmallestFittingScreenColumnCount([8, 8, 8], 12, 3, 2),
    3,
    'A dense 1080p menu must retain all three columns when two cannot fit',
);
assert.deepEqual(
    getFittingScreenColumnAssignments([6, 4, 4, 6], 10, 2),
    [0, 0, 1, 1],
    'Column fitting must find a valid two-column assignment that least-used greedy placement misses',
);
assert.equal(
    getSmallestFittingScreenColumnCount([6, 4, 4, 6], 10, 3, 2),
    2,
    'Content-aware layout must not add a third column because of greedy placement order',
);
assert.equal(
    getFittingScreenColumnAssignments([8, 8, 5], 10, 2),
    null,
    'Column fitting must reject content that exceeds the bounded screen capacity',
);

assert.equal(getDigitalScreenHealth(undefined, now).summary, 'Link ready');
assert.equal(
    getDigitalScreenHealth(Timestamp.fromMillis(now - 60_000), now).summary,
    'Seen recently',
);
assert.equal(
    getDigitalScreenHealth(Timestamp.fromMillis(now - 48 * 60 * 60 * 1000), now).summary,
    'Check TV',
);
assert.deepEqual(
    getDigitalScreenHealth(Timestamp.fromMillis(now + 60 * 60 * 1000), now),
    {
        detail: 'TV time needs checking',
        state: 'stale',
        summary: 'Check TV',
    },
    'A materially future-dated signal must not be presented as recent TV activity',
);
assert.deepEqual(
    getDigitalScreenManagementClientError(new Error('digital_screen_slide_invalid')),
    { error: 'Invalid request', status: 400 },
    'Invalid owner-slide input must remain a client error',
);
assert.deepEqual(
    getDigitalScreenManagementClientError(new Error('digital_screen_slide_limit_reached')),
    { error: 'Slide limit reached', status: 409 },
    'The transaction-current slide limit must remain a conflict',
);
assert.deepEqual(
    getDigitalScreenManagementClientError(new Error('digital_screen_slide_not_found')),
    { error: 'Digital Screen changed. Refresh and try again.', status: 409 },
    'A stale caption target must remain a conflict',
);
assert.deepEqual(
    getDigitalScreenManagementClientError(new Error('digital_screen_slide_id_conflict')),
    { error: 'Digital Screen changed. Refresh and try again.', status: 409 },
    'Reuse of a slide ID with different content must remain a conflict',
);
assert.equal(
    getDigitalScreenManagementClientError(new Error('digital_screen_state_invalid')),
    null,
    'Unexpected persisted-state failures must remain server errors',
);
assert.equal(
    getDigitalScreenManagementClientError({ message: 'digital_screen_slide_invalid' }),
    null,
    'Only real bounded server errors may select a client response',
);
for (let index = 0; index < 128; index += 1) {
    assert.equal(
        isValidScreenToken(generatePrivateScreenToken()),
        true,
        'Every generated private screen token must satisfy the canonical route/token validator',
    );
}

let localizedGetterCalls = 0;
const hostileLocalizedText = Object.create({ en: 'Inherited private text' });
Object.defineProperty(hostileLocalizedText, 'en', {
    enumerable: true,
    get() {
        localizedGetterCalls += 1;
        throw new Error('must not execute');
    },
});
assert.equal(resolveScreenText(hostileLocalizedText, 'Menu'), 'Menu');
assert.equal(localizedGetterCalls, 0, 'Screen text projection must not execute accessors');

let tagGetterCalls = 0;
const hostileTags: unknown[] = [];
Object.defineProperty(hostileTags, 0, {
    enumerable: true,
    get() {
        tagGetterCalls += 1;
        return 'Private';
    },
});
hostileTags.length = 1;
assert.equal(normalizeScreenTags(hostileTags), undefined);
assert.equal(tagGetterCalls, 0, 'Screen tag projection must not execute indexed accessors');

let orderCoercionCalls = 0;
const projectedItems = extractScreenMenuItemsFromProject({
    files: [{
        extractedData: {
            data: {
                categories: [{
                    id: '__proto__',
                    name: 'Chef picks',
                    orderIndex: {
                        valueOf() {
                            orderCoercionCalls += 1;
                            return 0;
                        },
                    },
                }],
                items: [{
                    id: 'dish-1',
                    name: { en: 'Paneer tikka' },
                    category: '__proto__',
                    available: 'false',
                    isBestSeller: 'true',
                    orderIndex: {
                        valueOf() {
                            orderCoercionCalls += 1;
                            return 0;
                        },
                    },
                    images: [{ url: 'https://example.com/paneer.jpg' }],
                }],
            },
        },
    }],
});
assert.deepEqual(projectedItems, [{
    id: 'dish-1',
    name: 'Paneer tikka',
    imageUrl: 'https://example.com/paneer.jpg',
    available: false,
    isBestSeller: false,
    categoryName: 'Chef picks',
    categoryOrderIndex: 0,
    orderIndex: 0,
}]);
assert.equal(orderCoercionCalls, 0, 'Screen project projection must not coerce unknown ordering values');
assert.deepEqual(
    extractScreenMenuItemsFromProject(new Proxy({}, {
        getOwnPropertyDescriptor() {
            throw new Error('invalid persisted project');
        },
    })),
    [],
    'Malformed project records must fail closed without aborting public screen rendering',
);

process.stdout.write('Digital Screens lifecycle tests passed.\n');

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
    shouldSuppressScreenReload,
} from '../../src/lib/screen/utils';
import type { ScreenSlide } from '../../src/types/campaigns';
import {
    getMenuBoardLayout,
    shouldUseDigitalScreenOfflineCache,
} from '../../src/lib/screen/screenRuntime';
import { getDigitalScreenHealth } from '../../src/lib/screen/screenHealth';

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

assert.deepEqual(
    getMenuBoardLayout(1280, 720),
    { columnCount: 2, itemsPerColumn: 8 },
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
    'Portrait screens must stay single-column',
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

process.stdout.write('Digital Screens lifecycle tests passed.\n');

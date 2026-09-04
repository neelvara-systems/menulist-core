import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    getImageGenPreferencesStorageKey,
    loadImageGenPreferences,
    parseImageGenPreferences,
    saveImageGenPreferences,
} from '../../src/lib/imageGenPreferences';
import { evaluatePublicTruthIndexability } from '../../src/lib/seo/publicTruthIndexing';
import {
    clearForceDesktopMode,
    setForceDesktopRoute,
    shouldForceDesktopForPath,
} from '../../src/lib/mobile/forceDesktopMode';
import { readPersistedErrorPageTheme } from '../../src/lib/runtime/errorPageTheme';
import {
    normalizeDeploymentDebugIdentity,
    parseDeploymentDebugIdentity,
} from '../../src/constants/deploymentDebug';
import { normalizeWebsiteThemePreference } from '../../src/lib/website/themePreference';
import {
    hasAcceptedPublicWebsiteAnalyticsConsent,
    setPublicWebsiteAnalyticsRuntimeConsent,
    trackGoogleMarketingEvent,
    trackPlausibleEvent,
} from '../../src/lib/website/plausible';
import { getPublicMenuLanguageStorageKey } from '../../src/lib/localization/publicMenuLanguagePreference';
import {
    getPublicMenuSessionStateKey,
    parsePublicMenuScrollY,
} from '../../src/lib/localization/publicMenuSessionState';
import {
    parsePublicCreateMenuLastClaimHandoff,
    serializePublicCreateMenuLastClaimHandoff,
} from '../../src/lib/publicCreateMenu/lastClaimHandoff';
import { parseChangelogLastViewedAt } from '../../src/lib/changelog/lastViewed';
import {
    EDITOR_ONBOARDING_MARKER,
    getEditorOnboardingStorageKeys,
    isEditorOnboardingMarker,
} from '../../src/lib/browserStorage/editorOnboarding';
import { getCreativeEditorDraftStorageKey } from '../../src/lib/browserStorage/creativeEditorDraft';
import {
    createEmptyImageSubjectProfileCache,
    getImageSubjectProfileCacheScopeKey,
} from '../../src/types/imageSubjectProfile';

assert.deepEqual(createEmptyImageSubjectProfileCache(), {
    includeWithdrawn: false,
    loadedAt: null,
    profiles: [],
    scopeKey: null,
});
assert.equal(
    getImageSubjectProfileCacheScopeKey(11, 22, false),
    JSON.stringify([11, 22, 'active']),
    'active-only saved-person cache must be scoped to the exact tenant and store',
);
assert.equal(
    getImageSubjectProfileCacheScopeKey(11, 22, true),
    JSON.stringify([11, 22, 'manager']),
    'manager saved-person cache must not share the active-only cache key',
);
assert.equal(getImageSubjectProfileCacheScopeKey(11, '22x', false), null);
assert.equal(getImageSubjectProfileCacheScopeKey(11, 0, false), null);

assert.deepEqual(
    normalizeDeploymentDebugIdentity({
        tenantId: 12,
        tenantName: '  Cafe One  ',
        storeId: 'outlet-4',
        storeName: ' Main counter ',
        ignored: 'not persisted',
    }),
    {
        tenantId: '12',
        tenantName: 'Cafe One',
        storeId: 'outlet-4',
        storeName: 'Main counter',
    },
    'deployment identity must project only bounded display fields',
);
assert.equal(
    normalizeDeploymentDebugIdentity({
        tenantId: Number.NaN,
        tenantName: 'Cafe One',
        storeId: 4,
        storeName: 'Main counter',
    }),
    null,
    'non-finite deployment identity IDs must fail closed',
);
assert.equal(
    parseDeploymentDebugIdentity(JSON.stringify({
        tenantId: 12,
        tenantName: 'x'.repeat(201),
        storeId: 4,
        storeName: 'Main counter',
    })),
    null,
    'unbounded session identity labels must not reach the deployment badge',
);
assert.equal(parseDeploymentDebugIdentity('{'), null);

assert.equal(normalizeWebsiteThemePreference('dark'), 'dark');
assert.equal(normalizeWebsiteThemePreference('system'), 'system');
assert.equal(
    normalizeWebsiteThemePreference('attacker-controlled-class'),
    null,
    'persisted website theme values must not become arbitrary document classes',
);

assert.equal(
    getPublicMenuLanguageStorageKey('12-menu-4'),
    'menulist_preferred_language_12-menu-4',
);
assert.equal(getPublicMenuLanguageStorageKey('12/menu/4'), null);
assert.equal(getPublicMenuLanguageStorageKey('x'.repeat(161)), null);
assert.equal(
    getPublicMenuSessionStateKey(11, 22, 'menu-1', 'activeLanguage'),
    'menulist_customerMenu_11_22_menu-1_activeLanguage',
);
assert.notEqual(
    getPublicMenuSessionStateKey(11, 22, 'menu-1', 'activeLanguage'),
    getPublicMenuSessionStateKey(12, 22, 'menu-1', 'activeLanguage'),
);
assert.notEqual(
    getPublicMenuSessionStateKey(11, 22, 'menu-1', 'activeLanguage'),
    getPublicMenuSessionStateKey(11, 22, 'menu-2', 'activeLanguage'),
);
assert.equal(getPublicMenuSessionStateKey('11 ', 22, 'menu-1', 'activeLanguage'), null);
assert.equal(getPublicMenuSessionStateKey(11, 22, '../menu', 'activeLanguage'), null);
assert.equal(parsePublicMenuScrollY('0'), 0);
assert.equal(parsePublicMenuScrollY('9999999'), 9_999_999);
assert.equal(parsePublicMenuScrollY('12junk'), null);
assert.equal(parsePublicMenuScrollY('01'), null);
assert.equal(parsePublicMenuScrollY('10000001'), null);

assert.equal(parseChangelogLastViewedAt('1700000000000', 1700000000001), 1700000000000);
assert.equal(parseChangelogLastViewedAt('1700000000000junk', 1700000000001), null);
assert.equal(parseChangelogLastViewedAt('1700000000002', 1700000000001), null);

assert.deepEqual(getEditorOnboardingStorageKeys(11, 22), {
    welcomeDismissed: 'editor_welcome_dismissed:11:22',
    outletSeen: 'editor_outlet_onboarding_seen:11:22',
});
assert.notDeepEqual(
    getEditorOnboardingStorageKeys(11, 22),
    getEditorOnboardingStorageKeys(11, 23),
    'editor onboarding state must not cross store boundaries',
);
assert.equal(getEditorOnboardingStorageKeys('01', 22), null);
assert.equal(isEditorOnboardingMarker(EDITOR_ONBOARDING_MARKER), true);
assert.equal(isEditorOnboardingMarker('true'), false);

assert.equal(
    getCreativeEditorDraftStorageKey({
        documentId: 'doc:1',
        productId: 'campaigncue',
        sourceLabel: 'Campaign editor',
        workspaceId: 'workspace:2',
    }),
    'creative-editor-draft:v2:campaigncue:workspace%3A2:Campaign%20editor:doc%3A1',
);
assert.notEqual(
    getCreativeEditorDraftStorageKey({
        documentId: 'd',
        productId: 'a:b',
        sourceLabel: 's',
        workspaceId: 'c',
    }),
    getCreativeEditorDraftStorageKey({
        documentId: 'd',
        productId: 'a',
        sourceLabel: 's',
        workspaceId: 'b:c',
    }),
    'creative editor draft scopes must remain unambiguous when IDs contain delimiters',
);
assert.equal(getCreativeEditorDraftStorageKey({
    documentId: ' doc ',
    productId: 'campaigncue',
    sourceLabel: 'Campaign editor',
}), null);

const serializedLastClaim = serializePublicCreateMenuLastClaimHandoff({
    tenantId: 11,
    storeId: 22,
    projectId: 33,
    subdomain: 'sample-cafe',
}, 1_000_000);
assert.ok(serializedLastClaim);
assert.deepEqual(parsePublicCreateMenuLastClaimHandoff(serializedLastClaim, 1_000_001), {
    version: 1,
    tenantId: 11,
    storeId: 22,
    projectId: 33,
    subdomain: 'sample-cafe',
    savedAt: 1_000_000,
});
assert.equal(parsePublicCreateMenuLastClaimHandoff(JSON.stringify({
    version: 1,
    tenantId: 11,
    storeId: 22,
    projectId: 33,
    subdomain: 'sample-cafe',
    savedAt: 1_000_000,
    role: 'admin',
}), 1_000_001), null);
assert.equal(serializePublicCreateMenuLastClaimHandoff({
    tenantId: 11,
    storeId: '22x',
    projectId: 33,
    subdomain: 'sample-cafe',
}, 1_000_000), null);
assert.equal(parsePublicCreateMenuLastClaimHandoff(serializedLastClaim, 1_000_000 + (24 * 60 * 60 * 1000) + 1), null);

assert.deepEqual(
    parseImageGenPreferences({
        stylesCategory: 'food',
        styles: ['editorial'],
        transparentBg: false,
        backgroundColor: null,
    }),
    {
        stylesCategory: 'food',
        styles: ['editorial'],
        aspectRatio: undefined,
        environments: undefined,
        lighting: undefined,
        colors: undefined,
        moods: undefined,
        compositions: undefined,
        backgroundColor: null,
        negativePrompt: undefined,
        transparentBg: false,
        foregroundColor: undefined,
        isMultiMode: undefined,
        savedAt: undefined,
        subjectProfileId: null,
        subjectProfileVersion: null,
    },
    'valid image preferences should retain their typed values',
);
assert.deepEqual(
    parseImageGenPreferences({
        stylesCategory: 'portrait',
        subjectProfileId: '123e4567-e89b-12d3-a456-426614174000',
        subjectProfileVersion: 2,
    })?.subjectProfileId,
    '123e4567-e89b-12d3-a456-426614174000',
    'valid saved-person preferences should retain their exact profile identity',
);
assert.equal(
    parseImageGenPreferences({
        stylesCategory: 'portrait',
        subjectProfileId: '123e4567-e89b-12d3-a456-426614174000',
    }),
    null,
    'partial saved-person preferences must fail closed',
);

assert.equal(
    parseImageGenPreferences({ stylesCategory: 'food', styles: ['editorial', 42] }),
    null,
    'malformed browser-storage arrays must not cross into typed consumers',
);
assert.equal(
    parseImageGenPreferences({ stylesCategory: 'food', transparentBg: 'false' }),
    null,
    'string boolean values must not be coerced into image-generation preferences',
);
assert.equal(
    parseImageGenPreferences({ stylesCategory: '' }),
    null,
    'an empty preference category is not a usable persisted contract',
);
assert.equal(
    parseImageGenPreferences({ stylesCategory: 'food', aspectRatio: '100:1' }),
    null,
    'unknown persisted image aspect ratios must fail closed',
);
assert.equal(
    parseImageGenPreferences({
        stylesCategory: 'food',
        styles: Array.from({ length: 21 }, () => 'editorial'),
    }),
    null,
    'persisted preference arrays must remain bounded to the API contract',
);
assert.equal(
    parseImageGenPreferences({
        stylesCategory: 'food',
        savedAt: new Date(Date.now() + 60_000).toISOString(),
    }),
    null,
    'future persisted preference timestamps must fail closed',
);
assert.equal(getImageGenPreferencesStorageKey(1, 10), 'imgGenPrefs_1_10');
assert.equal(getImageGenPreferencesStorageKey('01', 10), null);

class ImagePreferenceStorageMock {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

const imagePreferenceStorage = new ImagePreferenceStorageMock();
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
        localStorage: imagePreferenceStorage,
        location: {
            hostname: 'menulist.ai',
            pathname: '/resources',
        },
    },
});
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: imagePreferenceStorage,
});
saveImageGenPreferences(1, 10, { stylesCategory: 'food', styles: ['editorial'] });
assert.equal(loadImageGenPreferences(1, 10)?.styles?.[0], 'editorial');
imagePreferenceStorage.setItem('imgGenPrefs_1_10', JSON.stringify({
    stylesCategory: 'food',
    negativePrompt: 'x'.repeat(2_001),
}));
assert.equal(loadImageGenPreferences(1, 10), null);
assert.equal(imagePreferenceStorage.getItem('imgGenPrefs_1_10'), null);
imagePreferenceStorage.setItem('imgGenPrefs_1_10', '{');
assert.equal(loadImageGenPreferences(1, 10), null);
assert.equal(imagePreferenceStorage.getItem('imgGenPrefs_1_10'), null);

setForceDesktopRoute('/platform/cost-posture?from=mobile');
assert.equal(shouldForceDesktopForPath('/platform/cost-posture/details'), true);
assert.equal(shouldForceDesktopForPath('/platform/other'), false);
imagePreferenceStorage.setItem('forceDesktopMode', 'https://attacker.example/path');
assert.equal(shouldForceDesktopForPath('/platform/cost-posture'), false);
assert.equal(imagePreferenceStorage.getItem('forceDesktopMode'), null);
clearForceDesktopMode();

imagePreferenceStorage.setItem('persist:nextjs', JSON.stringify({
    clientThemeConfig: JSON.stringify({
        darkMode: false,
        lightColor: 'url(https://attacker.example/pixel)',
    }),
}));
assert.equal(
    readPersistedErrorPageTheme('global-error-boundary').primaryColor,
    '#1E40AF',
    'persisted error theme must reject non-hex CSS values',
);

let googleEventCount = 0;
let plausibleEventCount = 0;
Object.assign(globalThis.window, {
    gtag: (...args: unknown[]) => {
        if (args[0] === 'event') googleEventCount += 1;
    },
    plausible: () => {
        plausibleEventCount += 1;
    },
});
process.env.NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN = 'menulist.ai';
setPublicWebsiteAnalyticsRuntimeConsent('accepted');
assert.equal(hasAcceptedPublicWebsiteAnalyticsConsent(), true);
trackGoogleMarketingEvent('consented_event');
trackPlausibleEvent('consented_event');
assert.equal(googleEventCount, 1);
assert.equal(plausibleEventCount, 1);

setPublicWebsiteAnalyticsRuntimeConsent('declined');
assert.equal(hasAcceptedPublicWebsiteAnalyticsConsent(), false);
trackGoogleMarketingEvent('declined_event');
trackPlausibleEvent('declined_event');
assert.equal(googleEventCount, 1, 'Google events must stop immediately after consent is declined');
assert.equal(plausibleEventCount, 1, 'Plausible events must stop immediately after consent is declined');

const equatorPrimeMeridianStore = {
    active: true,
    name: 'Zero Point Cafe',
    geo: { latitude: 0, longitude: 0 },
    phoneNumber: '+233000000000',
};

assert.deepEqual(
    evaluatePublicTruthIndexability(equatorPrimeMeridianStore, { surface: 'obp' }),
    {
        index: true,
        follow: true,
        includeInSitemap: true,
        reason: 'indexable_public_truth',
    },
    'valid zero coordinates must count as a public location fact',
);

assert.equal(
    evaluatePublicTruthIndexability(
        { ...equatorPrimeMeridianStore, geo: { latitude: Number.NaN, longitude: 0 } },
        { surface: 'obp' },
    ).reason,
    'insufficient_public_facts',
    'non-finite coordinates must not count as a public location fact',
);
assert.equal(
    evaluatePublicTruthIndexability(
        { ...equatorPrimeMeridianStore, geo: { latitude: 91, longitude: 0 } },
        { surface: 'obp' },
    ).reason,
    'insufficient_public_facts',
    'out-of-range coordinates must not count as a public location fact',
);
assert.equal(
    evaluatePublicTruthIndexability(
        { ...equatorPrimeMeridianStore, geo: { latitude: '0', longitude: '0' } },
        { surface: 'obp' },
    ).index,
    true,
    'legacy finite numeric coordinate strings should remain compatible',
);

const facebookPixelSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/templates/website/clientWebsite/FacebookPixel.tsx'),
    'utf8',
);
assert.match(
    facebookPixelSource,
    /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/,
    'the Meta-owned loader must remain present',
);
assert.doesNotMatch(
    facebookPixelSource,
    /useEffect|window\.fbq\s*=(?!=)/,
    'component hydration must not pre-initialize fbq and short-circuit the Meta-owned loader',
);
assert.doesNotMatch(
    facebookPixelSource,
    /@ts-ignore|Record<string,\s*any>/,
    'the Meta Pixel contract must remain explicitly typed without suppressions',
);

console.log('Runtime storage and public indexing contract tests passed.');

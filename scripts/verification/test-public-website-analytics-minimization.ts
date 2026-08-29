import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeGoogleAnalyticsMeasurementId, normalizeGoogleSearchConsoleVerification, normalizeMetaPixelId } from '../../src/lib/analytics/preferences';
import {
    cleanPublicAnalyticsString,
    getPublicAnalyticsAttributionToken,
    getPublicAnalyticsPath,
    getPublicAnalyticsReferrerGroup,
    getPublicAnalyticsSessionEntryPage,
    getPublicAnalyticsUrl,
} from '../../src/lib/website/publicAnalyticsContext';
import {
    getBoundedMarketingEventParams,
    normalizePlausibleScriptSource,
} from '../../src/lib/website/plausible';

const sessionValues = new Map<string, string>();
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
        location: {
            href: 'https://answerlattice.com/resources/guide?email=owner@example.com#private',
            origin: 'https://answerlattice.com',
            pathname: '/resources/guide',
            search: '?email=owner@example.com&utm_source=founder_launch',
        },
        sessionStorage: {
            getItem: (key: string) => sessionValues.get(key) || null,
            setItem: (key: string, value: string) => sessionValues.set(key, value),
        },
    },
});

assert.equal(
    getPublicAnalyticsUrl(window.location.href),
    'https://answerlattice.com/resources/guide',
);
assert.equal(
    getPublicAnalyticsUrl('https://private.example.com/customer/acme?token=secret#case'),
    'https://private.example.com',
);
assert.equal(getPublicAnalyticsUrl('javascript:alert(1)'), undefined);
assert.equal(getPublicAnalyticsUrl('https://user:secret@example.com/path'), undefined);
assert.equal(getPublicAnalyticsSessionEntryPage('entry'), '/resources/guide');
sessionValues.set('entry', '/resources/guide?email=owner@example.com');
assert.equal(getPublicAnalyticsSessionEntryPage('entry'), '/resources/guide');
assert.equal(sessionValues.get('entry'), '/resources/guide');
assert.equal(getPublicAnalyticsPath('/resources/guide?email=owner@example.com#private'), '/resources/guide');
assert.equal(getPublicAnalyticsPath('https://private.example.com/customer/acme'), undefined);

const referrerGroups = [
    { group: 'chatgpt', hosts: ['chatgpt.com', 'chat.openai.com'] },
] as const;
assert.equal(
    getPublicAnalyticsReferrerGroup('https://chatgpt.com/c/secret-thread', referrerGroups),
    'chatgpt',
);
assert.equal(
    getPublicAnalyticsReferrerGroup('https://private.example.com/customer/acme', referrerGroups),
    undefined,
);

assert.equal(getPublicAnalyticsAttributionToken('founder_launch'), 'founder_launch');
assert.equal(getPublicAnalyticsAttributionToken('owner@example.com'), undefined);
assert.equal(getPublicAnalyticsAttributionToken('contains private words'), undefined);

let coercionReads = 0;
assert.equal(cleanPublicAnalyticsString({
    toString() {
        coercionReads += 1;
        return 'must not execute';
    },
}), undefined);
assert.equal(coercionReads, 0);

const desktopAnalyticsSource = readFileSync(
    resolve(process.cwd(), 'src/components/templates/main-app/businessSettings/tabs/AnalyticsTab.tsx'),
    'utf8',
);
const analyticsWizardSource = readFileSync(
    resolve(process.cwd(), 'src/components/templates/main-app/businessSettings/tabs/AnalyticsSetupWizard.tsx'),
    'utf8',
);
const analyticsGuideSource = readFileSync(
    resolve(process.cwd(), 'src/components/templates/main-app/businessSettings/tabs/AnalyticsGuideModal.tsx'),
    'utf8',
);
const mobileAnalyticsSource = readFileSync(
    resolve(process.cwd(), 'src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx'),
    'utf8',
);
const clientWebsiteSource = readFileSync(
    resolve(process.cwd(), 'src/components/templates/website/clientWebsite/index.tsx'),
    'utf8',
);
const facebookPixelSource = readFileSync(
    resolve(process.cwd(), 'src/components/templates/website/clientWebsite/FacebookPixel.tsx'),
    'utf8',
);
const googleAnalyticsSource = readFileSync(
    resolve(process.cwd(), 'src/components/templates/website/clientWebsite/GoogleAnalytics.tsx'),
    'utf8',
);
for (const source of [desktopAnalyticsSource, analyticsWizardSource, mobileAnalyticsSource]) {
    assert.ok(!source.includes("tAnalytics('enhancedEcommerce')"));
    assert.ok(!source.includes("t('enhancedEcommerce')"));
}
for (const source of [desktopAnalyticsSource, mobileAnalyticsSource]) {
    assert.ok(source.includes('normalizeGoogleAnalyticsMeasurementId'));
    assert.ok(source.includes('normalizeGoogleSearchConsoleVerification'));
    assert.ok(source.includes('normalizeMetaPixelId'));
}
assert.ok(mobileAnalyticsSource.includes('!areAnalyticsDraftsEqual(analyticsDraft, originalAnalyticsState)'));
assert.ok(!analyticsWizardSource.includes('Track Orders & Sales'));
assert.ok(!analyticsWizardSource.includes('See how much money you make'));
assert.ok(!analyticsWizardSource.includes('How much money you make'));
assert.ok(!analyticsWizardSource.includes('We never collect personal information'));
assert.ok(!analyticsWizardSource.includes('Watch Video'));
assert.ok(!analyticsWizardSource.includes('/images/analytics/'));
assert.ok(!analyticsWizardSource.includes('<Image'));
assert.ok(!analyticsWizardSource.includes('restaurant name'));
assert.ok(analyticsWizardSource.includes('Which customer actions happen after a menu visit'));
assert.ok(analyticsWizardSource.includes('does not collect customer names, emails, payment details, or exact GPS locations'));
assert.ok(analyticsWizardSource.includes('monitor its search presence'));
for (const source of [analyticsWizardSource, analyticsGuideSource]) {
    assert.ok(!source.includes('Enhanced E-commerce'));
    assert.ok(!source.includes('detailed order tracking'));
    assert.ok(!source.includes('cart adds'));
    assert.ok(!source.includes('Track views, cart adds, and purchases'));
    assert.ok(!source.includes('menulistai.com'));
}
assert.ok(analyticsGuideSource.includes('What MenuList Tracks'));
assert.ok(analyticsGuideSource.includes('never exact GPS'));
assert.ok(analyticsGuideSource.includes('does not collect customer names, emails, payment details, purchases, or exact GPS locations'));
assert.ok(!analyticsWizardSource.includes('start seeing data in about 24 hours'));
assert.ok(analyticsWizardSource.includes("const analytics = Form.useWatch('analytics', form) || {};"));
assert.ok(analyticsWizardSource.includes('if (open) setCurrentStep(0);'));
assert.ok(analyticsWizardSource.includes('save your changes'));
assert.ok(!clientWebsiteSource.includes('EnhancedEcommerce'));
assert.equal(
    existsSync(resolve(process.cwd(), 'src/components/templates/website/clientWebsite/EnhancedEcommerce.tsx')),
    false,
);
assert.ok(!facebookPixelSource.includes("trackFBEvent('AddToCart'"));
assert.ok(!facebookPixelSource.includes("trackFBEvent('InitiateCheckout'"));
assert.ok(!facebookPixelSource.includes("trackFBEvent('Purchase'"));
assert.ok(googleAnalyticsSource.includes('gtag: (...args: unknown[]) => void;'));
assert.ok(googleAnalyticsSource.includes('dataLayer: unknown[];'));
assert.ok(!googleAnalyticsSource.includes('any[]'));

assert.equal(normalizeGoogleAnalyticsMeasurementId(' g-test123 '), 'G-TEST123');
assert.equal(normalizeGoogleAnalyticsMeasurementId('UA-12345'), undefined);
assert.equal(normalizeGoogleAnalyticsMeasurementId('G-<script>'), undefined);
assert.equal(normalizeMetaPixelId(' 1234567890 '), '1234567890');
assert.equal(normalizeMetaPixelId('1234'), undefined);
assert.equal(normalizeMetaPixelId('12345abc'), undefined);
assert.equal(normalizeGoogleSearchConsoleVerification('abcDEF_123-xyz'), 'abcDEF_123-xyz');
assert.equal(
    normalizeGoogleSearchConsoleVerification('<meta name="google-site-verification" content="abcDEF_123-xyz" />'),
    'abcDEF_123-xyz',
);
assert.equal(
    normalizeGoogleSearchConsoleVerification("<meta content='abcDEF_123-xyz' name='google-site-verification'>"),
    'abcDEF_123-xyz',
);
assert.equal(normalizeGoogleSearchConsoleVerification('<meta name="other" content="abcDEF_123-xyz">'), undefined);
assert.equal(normalizeGoogleSearchConsoleVerification('<script>abcDEF_123-xyz</script>'), undefined);
assert.equal(normalizeGoogleSearchConsoleVerification('javascript:alert(1)'), undefined);

assert.deepEqual(
    getBoundedMarketingEventParams({
        destination: '/pricing?email=owner@example.com',
        entry_page: '/resources/guide?email=owner@example.com',
        link_url: 'https://wa.me/919999999999?text=private',
        page_path: '/resources/guide?private=1',
        referrer: 'https://private.example.com/customer/acme',
        referrer_host: 'private.example.com',
        target_url: window.location.href,
        utm_medium: 'contains private words',
        utm_source: 'founder_launch',
    }),
    {
        destination: 'https://answerlattice.com/pricing',
        entry_page: '/resources/guide',
        link_url: 'https://wa.me',
        page_path: '/resources/guide',
        target_url: 'https://answerlattice.com/resources/guide',
        utm_source: 'founder_launch',
    },
);

assert.equal(
    normalizePlausibleScriptSource('https://plausible.io/js/script.js'),
    'https://plausible.io/js/script.js',
);
assert.equal(normalizePlausibleScriptSource('/analytics/script.js?v=1'), '/analytics/script.js?v=1');
assert.equal(normalizePlausibleScriptSource('http://plausible.io/script.js'), undefined);
assert.equal(normalizePlausibleScriptSource('//evil.example/script.js'), undefined);
assert.equal(normalizePlausibleScriptSource('javascript:alert(1)'), undefined);
assert.equal(normalizePlausibleScriptSource({
    toString() {
        coercionReads += 1;
        return 'https://evil.example/script.js';
    },
}), undefined);
assert.equal(coercionReads, 0);

console.log('Public website analytics minimization tests passed.');

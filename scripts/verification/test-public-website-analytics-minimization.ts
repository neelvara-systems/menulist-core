import assert from 'node:assert/strict';
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

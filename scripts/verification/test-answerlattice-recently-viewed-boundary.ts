import assert from 'node:assert/strict';
import {
    getRecentlyViewedStorageKey,
    normalizeRecentlyViewedEnvelope,
    type RecentlyViewedStorageScope,
} from '../../src/lib/recentlyViewed';

const scope: RecentlyViewedStorageScope = { tId: 41, sId: 73 };
const userId = 'user-1';
const viewedAt = '2026-07-11T00:00:00.000Z';

const validArticle = {
    id: 'article-1',
    type: 'article',
    title: 'Reset a password',
    href: '/help-center/kb/articles/reset-a-password',
    viewedAt,
    meta: {
        categoryTitle: 'Accounts',
        sectionTitle: 'Security',
    },
};

const validEnvelope = {
    version: 1,
    pId: 'AL',
    tId: scope.tId,
    sId: scope.sId,
    userId,
    entries: [validArticle],
};

const normalized = normalizeRecentlyViewedEnvelope(validEnvelope, scope, userId);
assert.deepEqual(normalized, validEnvelope, 'exact scoped Recently Viewed envelope should normalize');

assert.equal(
    normalizeRecentlyViewedEnvelope(validEnvelope, { tId: scope.tId, sId: 74 }, userId),
    null,
    'a cache envelope from another store must be rejected',
);
assert.equal(
    normalizeRecentlyViewedEnvelope({ ...validEnvelope, userId: 'user-2' }, scope, userId),
    null,
    'a cache envelope from another user must be rejected',
);
assert.equal(
    normalizeRecentlyViewedEnvelope({ ...validEnvelope, unexpected: true }, scope, userId),
    null,
    'unknown envelope fields must be rejected',
);
assert.equal(
    normalizeRecentlyViewedEnvelope({
        ...validEnvelope,
        entries: [{ ...validArticle, meta: { ...validArticle.meta, fullArticle: { private: true } } }],
    }, scope, userId),
    null,
    'whole article payloads must not enter browser history',
);
assert.equal(
    normalizeRecentlyViewedEnvelope({
        ...validEnvelope,
        entries: [{
            id: 'release-1',
            type: 'changelog',
            title: 'Release',
            href: '/help-center/changelog/release-1',
            viewedAt,
            meta: { version: '1.0', originalItem: { createdBy: 'private-user' } },
        }],
    }, scope, userId),
    null,
    'whole changelog payloads must not enter browser history',
);
assert.equal(
    normalizeRecentlyViewedEnvelope({
        ...validEnvelope,
        entries: [{ ...validArticle, href: 'https://attacker.example/help-center/article-1' }],
    }, scope, userId),
    null,
    'external Recently Viewed destinations must be rejected',
);
assert.equal(
    normalizeRecentlyViewedEnvelope({
        ...validEnvelope,
        entries: [{ ...validArticle, viewedAt: 'not-a-date' }],
    }, scope, userId),
    null,
    'malformed view timestamps must be rejected',
);
assert.equal(
    normalizeRecentlyViewedEnvelope({ ...validEnvelope, entries: Array(11).fill(validArticle) }, scope, userId),
    null,
    'oversized Recently Viewed histories must be rejected',
);

assert.notEqual(
    getRecentlyViewedStorageKey(scope, userId),
    getRecentlyViewedStorageKey({ tId: scope.tId, sId: 74 }, userId),
    'storage keys must be store scoped',
);
assert.notEqual(
    getRecentlyViewedStorageKey(scope, userId),
    getRecentlyViewedStorageKey(scope, 'user-2'),
    'storage keys must be user scoped',
);

console.log('Answerlattice Recently Viewed boundary tests passed.');

import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH,
    normalizeAnswerlatticeKbArticleId,
} from '../../src/lib/answerlattice/kbArticleIdBoundary';

const maximumLengthArticleId = 'a'.repeat(ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH);

assert.equal(
    normalizeAnswerlatticeKbArticleId(maximumLengthArticleId),
    maximumLengthArticleId,
    'the authoritative maximum-length article ID must be accepted by every route contract',
);
assert.equal(
    normalizeAnswerlatticeKbArticleId(`${maximumLengthArticleId}a`),
    null,
    'article IDs above the authoritative length boundary must be rejected',
);
assert.equal(
    normalizeAnswerlatticeKbArticleId(' article-1 '),
    'article-1',
    'article IDs should normalize surrounding whitespace before persistence access',
);
assert.equal(
    normalizeAnswerlatticeKbArticleId('category/article-1'),
    null,
    'path-shaped article IDs must not become Firestore document references',
);
assert.equal(
    normalizeAnswerlatticeKbArticleId('.'),
    null,
    'reserved Firestore document IDs must be rejected',
);
assert.equal(normalizeAnswerlatticeKbArticleId(null), null, 'non-string article IDs must be rejected');

console.log('Answerlattice KB article ID boundary tests passed.');

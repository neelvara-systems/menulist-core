import assert from 'node:assert/strict';
import {
    assertBlogQueryWithinLimit,
    BLOG_QUERY_MAX_RESULTS,
    normalizeBlogDocumentId,
    normalizeBlogImageUrl,
    normalizeBlogStoreId,
} from '../../src/lib/blogs/blogBoundary';

assert.equal(normalizeBlogDocumentId('blog_1'), 'blog_1');
assert.equal(normalizeBlogDocumentId(42), '42');
for (const invalidId of ['', ' blog_1 ', '.', '..', 'a/b', '__reserved__']) {
    assert.throws(() => normalizeBlogDocumentId(invalidId), /blog_document_id_invalid/);
}

assert.equal(normalizeBlogStoreId(11), 11);
assert.equal(normalizeBlogStoreId('11'), '11');
for (const invalidStoreId of [0, -1, 1.5, '', ' 11 ', null]) {
    assert.throws(() => normalizeBlogStoreId(invalidStoreId), /blog_store_id_invalid/);
}

assert.doesNotThrow(() => assertBlogQueryWithinLimit(BLOG_QUERY_MAX_RESULTS));
assert.throws(
    () => assertBlogQueryWithinLimit(BLOG_QUERY_MAX_RESULTS + 1),
    /blog_query_limit_exceeded/,
);

assert.equal(normalizeBlogImageUrl('https://example.com/blog.webp'), 'https://example.com/blog.webp');
assert.equal(normalizeBlogImageUrl(undefined), undefined);
for (const invalidUrl of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '/relative.webp', ' https://example.com/a.webp ']) {
    assert.throws(() => normalizeBlogImageUrl(invalidUrl), /blog_image_url_invalid/);
}

process.stdout.write('Blog boundary tests passed.\n');

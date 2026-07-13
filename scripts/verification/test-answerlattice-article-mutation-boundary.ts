import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_ARTICLE_MUTATION_LIMIT,
    isAnswerlatticeArticleBulkStatus,
    normalizeAnswerlatticeArticleMutationIds,
    resolveSingleAnswerlatticeArticleScope,
} from '../../src/lib/answerlattice/articleMutationBoundary';

assert.deepEqual(normalizeAnswerlatticeArticleMutationIds(['article-1', 'article-2']), ['article-1', 'article-2']);
assert.equal(normalizeAnswerlatticeArticleMutationIds(['article-1', 'article-1']), null);
assert.equal(normalizeAnswerlatticeArticleMutationIds(['workspace/article-1']), null);
assert.equal(normalizeAnswerlatticeArticleMutationIds([]), null);
assert.equal(normalizeAnswerlatticeArticleMutationIds(Array.from({ length: ANSWERLATTICE_ARTICLE_MUTATION_LIMIT + 1 }, (_, index) => `article-${index}`)), null);

assert.equal(isAnswerlatticeArticleBulkStatus('published'), true);
assert.equal(isAnswerlatticeArticleBulkStatus('archived'), true);
assert.equal(isAnswerlatticeArticleBulkStatus('draft'), false);
assert.equal(isAnswerlatticeArticleBulkStatus(' published '), false);

assert.deepEqual(resolveSingleAnswerlatticeArticleScope([
    { pId: 'AL', tId: 11, sId: 22 },
    { pId: 'AL', tId: '11', sId: '22' },
]), { tId: 11, sId: 22 });
assert.equal(resolveSingleAnswerlatticeArticleScope([
    { pId: 'AL', tId: 11, sId: 22 },
    { pId: 'AL', tId: 11, sId: 23 },
]), null, 'bulk mutations must not span workspaces');
assert.equal(resolveSingleAnswerlatticeArticleScope([{ pId: 'ML', tId: 11, sId: 22 }]), null);
assert.equal(resolveSingleAnswerlatticeArticleScope([{ pId: 'AL', tId: '011', sId: 22 }]), null);

process.stdout.write('Answerlattice article mutation boundary tests passed.\n');

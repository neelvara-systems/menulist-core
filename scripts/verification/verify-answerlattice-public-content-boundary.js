#!/usr/bin/env node

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });
require('tsconfig-paths/register');

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const {
  normalizeAnswerlatticePublicArticle,
  normalizeAnswerlatticePublicCategories,
  normalizeAnswerlatticePublicChangelogPage,
  projectAnswerlatticePublicArticle,
  projectAnswerlatticePublicChangelogPage,
} = require(path.join(ROOT, 'src/lib/answerlattice/publicContentBoundary.ts'));

const article = {
  tId: 1, sId: 101, active: true, status: 'published', categoryId: 'cat-1', sectionId: 'section-1',
  categoryTitle: 'Start', sectionTitle: 'Setup', title: 'Publish an answer', index: 1, url: 'publish-answer',
  content: { type: 'doc', content: [] }, tags: ['publish'], modifiedOn: { seconds: 1_700_000_000, nanoseconds: 0 },
  likes: 3, dislikes: 1, createdBy: 'private-user', jobId: 'private-job', sources: [{ url: 'gs://private' }],
};
const projectedArticle = projectAnswerlatticePublicArticle(article, 'article-1', { tId: 1, sId: 101 });
assert(projectedArticle && !JSON.stringify(projectedArticle).includes('private'), 'article projection must strip writer/job/source data');
assert(projectedArticle.modifiedOn === '2023-11-14T22:13:20.000Z', 'article timestamp must serialize deterministically');
assert(projectAnswerlatticePublicArticle({ ...article, sId: 102 }, 'article-1', { tId: 1, sId: 101 }) === null, 'cross-store article must fail projection');
assert(normalizeAnswerlatticePublicArticle({ ...projectedArticle, createdBy: 'leak' }) === null, 'browser article DTO must reject unknown fields');

const categories = normalizeAnswerlatticePublicCategories({ categories: {
  'cat-1': { id: 'cat-1', title: 'Start', description: 'Begin here', icon: 'book', url: 'start', active: true, index: 1,
    createdOn: 'private-timestamp', articles: [{ id: 'article-1', title: 'Publish', url: 'publish', active: true, index: 1, private: true }], sections: [] },
} });
assert(categories && !JSON.stringify(categories).includes('private'), 'category projection must strip category/article metadata outside its allowlist');
assert(Object.getPrototypeOf(categories.categories) === null, 'category maps must not inherit an object prototype');

const changelogScope = { tId: 1, sId: 101 };
const changelog = projectAnswerlatticePublicChangelogPage({ pId: 'AL', ...changelogScope, pageNumber: 1, nextPageId: null, createdBy: 'private-page-user', entries: [{
  id: 'entry-1', title: 'Release', description: { type: 'doc', content: [] }, tags: ['fixed'],
  releasedOn: { seconds: 1_700_000_000, nanoseconds: 0 }, published: true, likes: 2, dislikes: 0,
  createdBy: 'private-entry-user', files: [{ name: 'image', url: 'https://example.com/image.png', preparedMedia: { private: true } }],
  kbSources: [{ categoryId: 'cat-1', articleId: 'article-1' }], youtubeLinks: [],
}] }, 'page-1', changelogScope);
assert(changelog && !JSON.stringify(changelog).includes('private'), 'changelog projection must strip page, entry and attachment internals');
assert(changelog.entries[0].releasedOn === '2023-11-14T22:13:20.000Z', 'changelog timestamp must serialize deterministically');
assert(normalizeAnswerlatticePublicChangelogPage({ ...changelog, createdBy: 'leak' }) === null, 'browser changelog page must reject unknown fields');
assert(projectAnswerlatticePublicChangelogPage({ pId: 'AL', tId: 1, sId: 102, pageNumber: 1, entries: [] }, 'page-1', changelogScope) === null, 'cross-store changelog pages must fail projection');
assert(projectAnswerlatticePublicChangelogPage({ pId: 'AL', ...changelogScope, pageNumber: 1, entries: [{
  id: 'draft-1', title: 'Draft', description: { type: 'doc', content: [] }, tags: [], releasedOn: { seconds: 1_700_000_000, nanoseconds: 0 }, published: false,
}] }, 'page-1', changelogScope)?.entries.length === 0, 'draft changelog entries must not enter public projection');
assert(projectAnswerlatticePublicChangelogPage({ pId: 'AL', ...changelogScope, pageNumber: 1, entries: [{
  id: 'unlinked-1', title: 'Unlinked', description: { type: 'doc', content: [] }, tags: [], releasedOn: { seconds: 1_700_000_000, nanoseconds: 0 }, published: true, version: '1.0.0',
}] }, 'page-1', changelogScope)?.entries.length === 0, 'unlinked versioned changelog entries must not enter public projection');

const cache = read('src/lib/answerlattice/publicContentCache.ts');
const client = read('src/lib/answerlattice/publicContentClient.ts');
const route = read('src/app/api/answerlattice/public-content/route.ts');
const categoryCache = read('src/hooks/useKBCategoriesCache.ts');
const articleCache = read('src/hooks/useArticleCache.ts');
const packageJson = JSON.parse(read('package.json'));
assert(cache.includes('projectAnswerlatticePublicArticle(snapshot.data(), snapshot.id, scope)'), 'Admin article reads must use the exact public projection');
assert(cache.includes('projectAnswerlatticePublicChangelogPage(doc.data(), doc.id, scope)'), 'Admin changelog reads must use the exact scoped public projection');
assert(cache.includes('.limit(PUBLIC_CHANGELOG_PAGE_SCAN_LIMIT)'), 'Admin changelog reads must scan past draft-only physical pages');
assert(cache.includes('normalizeAnswerlatticePublicCategories({ categories })'), 'Admin category reads must use the exact public projection');
assert(!cache.includes('...snapshot.data()'), 'public-content cache must not spread raw Admin documents');
assert(client.includes('normalizeAnswerlatticePublicArticle(data)'), 'browser article response must re-enter runtime validation');
assert(client.includes('normalizeAnswerlatticePublicCategories(data)'), 'browser category response must re-enter runtime validation');
assert(client.includes('normalizeAnswerlatticePublicChangelogPage(data)'), 'browser changelog response must re-enter runtime validation');
assert(route.includes('parsed.data.expectedTenantId !== scope.tId'), 'public-content route must reject an initiating/current tenant mismatch');
assert(route.includes('parsed.data.expectedStoreId !== scope.sId'), 'public-content route must reject an initiating/current workspace mismatch');
assert(route.includes('NextResponse.json({ data, scope })'), 'public-content route must acknowledge the exact admitted workspace');
assert(client.includes('value.scope.tId === expectedScope.tId'), 'public-content client must verify tenant acknowledgement');
assert(client.includes('value.scope.sId === expectedScope.sId'), 'public-content client must verify workspace acknowledgement');
assert(client.includes('expectedTenantId: expectedScope.tId'), 'public-content client must corroborate initiating tenant scope');
assert(client.includes('expectedStoreId: expectedScope.sId'), 'public-content client must corroborate initiating workspace scope');
assert(categoryCache.includes('currentScopeKeyRef.current !== scopeKey'), 'category cache must reject obsolete workspace settlement');
assert(articleCache.includes('currentScopeKeyRef.current !== scopeKey'), 'article cache must reject obsolete workspace settlement');
assert(packageJson.scripts['verify:answerlattice-public-content-boundary'] === 'node scripts/verification/verify-answerlattice-public-content-boundary.js', 'package must expose the public-content boundary verifier');

process.stdout.write('Answerlattice public-content boundary verification passed.\n');

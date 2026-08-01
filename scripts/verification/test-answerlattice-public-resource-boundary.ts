import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_RESOURCE_ARTICLES,
    getAnswerlatticeResourceArticle,
    getAnswerlatticeRelatedResourceArticles,
} from '../../src/content/answerlatticePublic/articles';

assert.equal(
    new Set(ANSWERLATTICE_RESOURCE_ARTICLES.map((article) => article.slug)).size,
    ANSWERLATTICE_RESOURCE_ARTICLES.length,
    'public resource slugs must remain unique',
);
assert.equal(
    new Set(ANSWERLATTICE_RESOURCE_ARTICLES.map((article) => article.path)).size,
    ANSWERLATTICE_RESOURCE_ARTICLES.length,
    'public resource paths must remain unique',
);
for (const article of ANSWERLATTICE_RESOURCE_ARTICLES) {
    assert.ok(
        article.relatedSlugs.every((slug) => getAnswerlatticeResourceArticle(slug) !== undefined),
        `${article.slug} related resource slugs must resolve`,
    );
}

const operatingGuide = getAnswerlatticeResourceArticle('answerlattice-operating-guide');
assert.ok(operatingGuide, 'the public Operating Guide must be registered');
const operatingGuideCopy = JSON.stringify(operatingGuide);
assert.match(operatingGuideCopy, /One product, three operating depths/);
assert.match(operatingGuideCopy, /They are not workspace modes, automatic scores, separate products, or required setup stages/);
assert.match(operatingGuideCopy, /A bounded product, support, and engineering group/);
assert.doesNotMatch(operatingGuideCopy, /workspaceMode|maturityScore|automaticProgression/);

const sourceArticle = ANSWERLATTICE_RESOURCE_ARTICLES[0];
assert.ok(sourceArticle, 'the public resource catalog must contain a source article');

const expectedRelated = sourceArticle.relatedSlugs.map((slug) => (
    ANSWERLATTICE_RESOURCE_ARTICLES.find((article) => article.slug === slug)
));
assert.ok(expectedRelated.every((article) => article !== undefined), 'catalog related slugs must resolve');

const resolved = getAnswerlatticeRelatedResourceArticles({
    ...sourceArticle,
    relatedSlugs: [
        sourceArticle.relatedSlugs[0],
        'missing-public-resource',
        ...sourceArticle.relatedSlugs.slice(1),
    ],
});

assert.deepEqual(
    resolved.map((article) => article.slug),
    sourceArticle.relatedSlugs,
    'missing related slugs must be omitted without changing the order of valid articles',
);
assert.ok(
    resolved.every((article) => typeof article.path === 'string' && article.path.startsWith('/resources/')),
    'the related-resource helper must return fully narrowed resource articles',
);

console.log('Answerlattice public resource boundary tests passed.');

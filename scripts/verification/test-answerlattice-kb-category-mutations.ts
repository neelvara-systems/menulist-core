import assert from 'node:assert/strict';
import {
    addKnowledgeBaseCategory,
    deleteKnowledgeBaseArticleMeta,
    deleteKnowledgeBaseCategory,
    deleteKnowledgeBaseSection,
    normalizeKnowledgeBaseArticleMetaInput,
    normalizeKnowledgeBaseCategoryInput,
    normalizeKnowledgeBaseSectionInput,
    removeKnowledgeBaseArticleMetaEverywhere,
    requireKnowledgeBaseNavigationId,
    resolveKnowledgeBaseArticlePlacement,
    updateKnowledgeBaseCategoryMetadata,
    upsertKnowledgeBaseArticleMeta,
    upsertKnowledgeBaseSection,
} from '../../src/lib/answerlattice/knowledgeBaseCategoryMutations';
import {
    deleteKnowledgeBaseReviewArticle,
    deleteKnowledgeBaseReviewCategory,
    deleteKnowledgeBaseReviewSection,
    toKnowledgeBaseReviewNavigation,
    updateKnowledgeBaseReviewCategory,
    updateKnowledgeBaseReviewSection,
    upsertKnowledgeBaseReviewArticle,
} from '../../src/lib/answerlattice/knowledgeBaseReviewMutations';
import type { IngestionJobCategoriesMap, KbCategoriesMap, KnowledgeBaseArticleMeta, KnowledgeBaseCategory, KnowledgeBaseSection } from '../../src/types/knowledgeBase';

const article = (id: string, title = id): KnowledgeBaseArticleMeta => ({
    id,
    title,
    active: true,
    index: 0,
    url: `/billing/${id}`,
});

const section = (id: string, articles: KnowledgeBaseArticleMeta[] = []): KnowledgeBaseSection => ({
    id,
    title: `Section ${id}`,
    description: `Description ${id}`,
    active: true,
    index: 0,
    url: `billing-${id}`,
    articles,
});

const category = (id: string): KnowledgeBaseCategory => ({
    id,
    title: `Category ${id}`,
    description: `Description ${id}`,
    icon: 'book',
    active: true,
    index: 0,
    url: id,
    articles: [article(`${id}-root`)],
    sections: [section(`${id}-section`, [article(`${id}-section-article`)])],
});

const base: KbCategoriesMap = {
    billing: category('billing'),
    account: category('account'),
};

assert.equal(requireKnowledgeBaseNavigationId('billing'), 'billing');
assert.throws(() => requireKnowledgeBaseNavigationId(' billing'));
assert.throws(() => requireKnowledgeBaseNavigationId('../billing'));
assert.throws(() => requireKnowledgeBaseNavigationId('__reserved__'));

assert.deepEqual(normalizeKnowledgeBaseCategoryInput({
    ...category('billing'),
    title: '  Billing help  ',
    tId: 999,
    injected: true,
}), {
    id: 'billing',
    title: 'Billing help',
    description: 'Description billing',
    icon: 'book',
    active: true,
    index: 0,
    url: 'billing',
}, 'category input must be bounded to owner-editable metadata');
assert.throws(() => normalizeKnowledgeBaseCategoryInput({ ...category('billing'), url: 'https://evil.example' }));
assert.throws(() => normalizeKnowledgeBaseCategoryInput({ ...category('billing'), index: Number.NaN }));
assert.throws(() => normalizeKnowledgeBaseCategoryInput({ ...category('billing'), active: 'true' }));
assert.throws(() => normalizeKnowledgeBaseCategoryInput({ ...category('billing'), title: ' '.repeat(10) }));

assert.deepEqual(normalizeKnowledgeBaseSectionInput({
    ...section('plans'),
    articles: [article('stale')],
    sourceContext: { tId: 999 },
}), {
    id: 'plans',
    title: 'Section plans',
    description: 'Description plans',
    active: true,
    index: 0,
    url: 'billing-plans',
}, 'section input must not carry stale article arrays or unrelated fields');
assert.throws(() => normalizeKnowledgeBaseSectionInput({ ...section('plans'), url: '//evil.example' }));

assert.deepEqual(normalizeKnowledgeBaseArticleMetaInput({
    ...article('article-1'),
    content: { type: 'doc' },
    embedding: [1, 2, 3],
}), article('article-1'), 'navigation metadata must not persist article content or embeddings');

const withNewCategory = addKnowledgeBaseCategory(base, category('orders'));
assert.deepEqual(Object.keys(withNewCategory), ['billing', 'account', 'orders']);
assert.throws(() => addKnowledgeBaseCategory(base, category('billing')));

const staleBillingEdit: KnowledgeBaseCategory = {
    ...category('billing'),
    title: 'Updated billing',
    articles: [article('stale-root')],
    sections: [section('stale-section')],
};
const metadataUpdated = updateKnowledgeBaseCategoryMetadata(base, staleBillingEdit);
assert.equal(metadataUpdated.billing.title, 'Updated billing');
assert.deepEqual(metadataUpdated.billing.articles, base.billing.articles);
assert.deepEqual(metadataUpdated.billing.sections, base.billing.sections);
assert.equal(metadataUpdated.account, base.account, 'unrelated categories must retain identity and data');
assert.equal(base.billing.title, 'Category billing', 'pure mutations must not alter caller state');

const concurrentArticle = article('concurrent-article');
const currentWithArticle = upsertKnowledgeBaseArticleMeta(base, 'billing', concurrentArticle, 'billing-section');
const staleSectionEdit = { ...section('billing-section'), title: 'Updated section', articles: [article('stale')] };
const sectionUpdated = upsertKnowledgeBaseSection(currentWithArticle, 'billing', staleSectionEdit);
assert.equal(sectionUpdated.billing.sections?.[0].title, 'Updated section');
assert.deepEqual(
    sectionUpdated.billing.sections?.[0].articles?.map((item) => item.id),
    ['billing-section-article', 'concurrent-article'],
    'section metadata updates must preserve transaction-current article links',
);

const twoArticleUpdates = upsertKnowledgeBaseArticleMeta(
    upsertKnowledgeBaseArticleMeta(base, 'billing', article('article-a'), 'billing-section'),
    'billing',
    article('article-b'),
    'billing-section',
);
assert.deepEqual(
    twoArticleUpdates.billing.sections?.[0].articles?.map((item) => item.id),
    ['billing-section-article', 'article-a', 'article-b'],
    'sequential transaction retries must preserve distinct article changes',
);

const movedArticle = upsertKnowledgeBaseArticleMeta(
    twoArticleUpdates,
    'account',
    article('article-a', 'Moved article'),
    'account-section',
);
assert.equal(
    movedArticle.billing.sections?.[0].articles?.some(item => item.id === 'article-a'),
    false,
    'moving an article must remove every stale navigation reference',
);
assert.equal(
    movedArticle.account.sections?.[0].articles?.filter(item => item.id === 'article-a').length,
    1,
    'moving an article must create one target navigation reference',
);
assert.deepEqual(resolveKnowledgeBaseArticlePlacement(movedArticle, 'account', 'account-section'), {
    categoryId: 'account',
    categoryTitle: 'Category account',
    sectionId: 'account-section',
    sectionTitle: 'Section account-section',
});
assert.deepEqual(resolveKnowledgeBaseArticlePlacement(movedArticle, 'account', null), {
    categoryId: 'account',
    categoryTitle: 'Category account',
    sectionId: null,
    sectionTitle: '',
});
assert.throws(() => resolveKnowledgeBaseArticlePlacement(movedArticle, 'account', 'missing'));
assert.equal(
    Object.values(removeKnowledgeBaseArticleMetaEverywhere(movedArticle, 'article-a'))
        .flatMap(item => [
            ...(item.articles || []),
            ...(item.sections || []).flatMap(sectionItem => sectionItem.articles || []),
        ])
        .some(item => item.id === 'article-a'),
    false,
);

const afterArticleDelete = deleteKnowledgeBaseArticleMeta(twoArticleUpdates, 'billing', 'article-a', 'billing-section');
assert.deepEqual(
    afterArticleDelete.billing.sections?.[0].articles?.map((item) => item.id),
    ['billing-section-article', 'article-b'],
);
assert.throws(() => upsertKnowledgeBaseArticleMeta(base, 'missing', article('x')));
assert.throws(() => upsertKnowledgeBaseArticleMeta(base, 'billing', article('x'), 'missing'));

assert.throws(
    () => deleteKnowledgeBaseSection(base, 'billing', 'billing-section'),
    /answerlattice_kb_section_not_empty/,
);
const emptyBillingSectionBase = {
    ...base,
    billing: {
        ...base.billing,
        sections: [section('billing-section')],
    },
};
const afterSectionDelete = deleteKnowledgeBaseSection(emptyBillingSectionBase, 'billing', 'billing-section');
assert.deepEqual(afterSectionDelete.billing.sections, []);
assert.throws(() => deleteKnowledgeBaseSection(base, 'billing', 'missing'));

assert.throws(
    () => deleteKnowledgeBaseCategory(base, 'billing'),
    /answerlattice_kb_category_not_empty/,
);
const emptyBillingCategoryBase = {
    ...base,
    billing: {
        ...base.billing,
        articles: [],
        sections: [section('billing-section')],
    },
};
const afterCategoryDelete = deleteKnowledgeBaseCategory(emptyBillingCategoryBase, 'billing');
assert.deepEqual(Object.keys(afterCategoryDelete), ['account']);
assert.throws(() => deleteKnowledgeBaseCategory(base, 'missing'));
assert.throws(() => updateKnowledgeBaseCategoryMetadata({ billing: 'corrupt' } as unknown as KbCategoriesMap, category('billing')));
assert.throws(() => upsertKnowledgeBaseSection({
    billing: { ...category('billing'), sections: 'corrupt' as unknown as KnowledgeBaseSection[] },
}, 'billing', section('new')));
assert.throws(() => upsertKnowledgeBaseArticleMeta({
    billing: { ...category('billing'), articles: 'corrupt' as unknown as KnowledgeBaseArticleMeta[] },
}, 'billing', article('new')));

const reviewBase: IngestionJobCategoriesMap = base;
const reviewWithConcurrentArticle = upsertKnowledgeBaseReviewArticle(
    reviewBase,
    'billing',
    article('review-concurrent'),
    'billing-section',
);
const reviewCategoryUpdated = updateKnowledgeBaseReviewCategory(reviewWithConcurrentArticle, {
    ...category('billing'),
    title: 'Review billing updated',
    sections: [section('stale')],
});
assert.equal(reviewCategoryUpdated.billing.title, 'Review billing updated');
assert.deepEqual(
    reviewCategoryUpdated.billing.sections?.[0].articles?.map((item) => [item.id, item.reEmbedding]),
    [['billing-section-article', true], ['review-concurrent', true]],
    'review category updates must preserve transaction-current links and mark them for embedding',
);

const reviewSectionUpdated = updateKnowledgeBaseReviewSection(reviewWithConcurrentArticle, 'billing', {
    ...section('billing-section'),
    title: 'Review section updated',
    articles: [article('stale')],
});
assert.equal(reviewSectionUpdated.billing.sections?.[0].title, 'Review section updated');
assert.deepEqual(
    reviewSectionUpdated.billing.sections?.[0].articles?.map((item) => item.id),
    ['billing-section-article', 'review-concurrent'],
);
assert.equal(reviewSectionUpdated.billing.sections?.[0].articles?.every((item) => item.reEmbedding === true), true);

assert.deepEqual(
    deleteKnowledgeBaseReviewArticle(reviewWithConcurrentArticle, 'billing', 'review-concurrent', 'billing-section')
        .billing.sections?.[0].articles?.map((item) => item.id),
    ['billing-section-article'],
);
assert.deepEqual(deleteKnowledgeBaseReviewSection(reviewBase, 'billing', 'billing-section').billing.sections, []);
assert.deepEqual(Object.keys(deleteKnowledgeBaseReviewCategory(reviewBase, 'billing')), ['account']);

const normalizedReview = toKnowledgeBaseReviewNavigation({
    billing: {
        id: 'billing',
        title: 'Billing',
        description: 'Billing help',
        active: true,
        sections: [{
            id: 'plans',
            title: 'Plans',
            description: 'Plan help',
            active: true,
            articles: [{ id: 'article-1', title: 'Article 1' }],
        }],
    },
});
assert.equal(normalizedReview.billing.icon, '');
assert.equal(normalizedReview.billing.index, 0);
assert.equal(normalizedReview.billing.sections?.[0].url, '');
assert.equal(normalizedReview.billing.sections?.[0].articles?.[0].active, true);

process.stdout.write('Answerlattice knowledge-base category mutation tests passed.\n');

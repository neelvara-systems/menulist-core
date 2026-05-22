import { DB_COLLECTIONS } from '@constant/database';
import { getCanonicaPublicCacheTags } from '@lib/actions/revalidateCanonicaPublicCache';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import type { ChangelogEntry, ChangelogPage } from '@type/changelog';
import { CANONICA_FAQ_STATUS, type CanonicaFaq } from '@type/canonica';
import { ARTICLE_STATUS, type KnowledgeBaseArticleType, type KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { unstable_cache } from 'next/cache';

const PUBLIC_CACHE_REVALIDATE_SECONDS = 60;
const PUBLIC_FAQ_LIMIT = 80;
const PUBLIC_ARTICLE_LIMIT = 500;

type Scope = {
    tId: number;
    sId: number;
};

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    return canonicaFirestoreAdmin;
};

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value._seconds === 'number') return value._seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const getKnowledgeBaseCategoriesDocId = (scope: Scope) => `categories_${scope.tId}_${scope.sId}`;

const sortFaqs = (faqs: CanonicaFaq[]) => [...faqs].sort((left, right) => (
    Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    || getTimestampMillis(right.modifiedOn) - getTimestampMillis(left.modifiedOn)
    || left.question.localeCompare(right.question)
));

const isPublishedArticle = (article: Partial<KnowledgeBaseArticleType>) => (
    article.active !== false
    && (!article.status || article.status === ARTICLE_STATUS.PUBLISHED)
);

const isScopedArticle = (article: Partial<KnowledgeBaseArticleType>, scope: Scope) => (
    Number(article.tId) === scope.tId
    && Number(article.sId) === scope.sId
);

const compactPublicArticle = (article: KnowledgeBaseArticleType): KnowledgeBaseArticleType => {
    const {
        embedding: _embedding,
        generatedFaqs: _generatedFaqs,
        similarityScore: _similarityScore,
        reconciliation: _reconciliation,
        ...publicArticle
    } = article;

    return {
        ...publicArticle,
        embedding: null,
        sources: Array.isArray(publicArticle.sources) ? publicArticle.sources.slice(0, 10) : publicArticle.sources,
    } as KnowledgeBaseArticleType;
};

const filterPublicCategories = (data: KnowledgeBaseCategoriesType | null): KnowledgeBaseCategoriesType | null => {
    if (!data?.categories || typeof data.categories !== 'object') {
        return null;
    }

    const categories = Object.fromEntries(
        Object.entries(data.categories)
            .filter(([, category]) => category?.active !== false)
            .map(([categoryId, category]) => {
                const sections = (category.sections || [])
                    .filter(section => section.active !== false)
                    .map(section => ({
                        ...section,
                        articles: (section.articles || []).filter(article => article.active !== false).slice(0, PUBLIC_ARTICLE_LIMIT),
                    }));

                return [categoryId, {
                    ...category,
                    articles: (category.articles || []).filter(article => article.active !== false).slice(0, PUBLIC_ARTICLE_LIMIT),
                    sections,
                }];
            }),
    );

    return { categories };
};

const filterPublishedChangelogEntries = (page: ChangelogPage): ChangelogPage => {
    const entries = (page.entries || [])
        .filter(entry => entry.published !== false)
        .sort((a, b) => getTimestampMillis(b.releasedOn) - getTimestampMillis(a.releasedOn));

    return {
        ...page,
        entries,
        entryIds: entries.map(entry => entry.id),
    };
};

const fetchPublishedFaqs = async (scope: Scope, maxResults: number): Promise<CanonicaFaq[]> => {
    const snapshot = await getCanonicaDb()
        .collection(DB_COLLECTIONS.CANONICA_FAQS)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('status', '==', CANONICA_FAQ_STATUS.PUBLISHED)
        .where('active', '==', true)
        .orderBy('sortOrder', 'asc')
        .orderBy('modifiedOn', 'desc')
        .limit(Math.min(Math.max(maxResults, 1), PUBLIC_FAQ_LIMIT))
        .get();

    return sortFaqs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CanonicaFaq)));
};

const fetchCategories = async (scope: Scope): Promise<KnowledgeBaseCategoriesType | null> => {
    const scopedDoc = await getCanonicaDb()
        .collection(DB_COLLECTIONS.KB_CATEGORIES)
        .doc(getKnowledgeBaseCategoriesDocId(scope))
        .get();

    if (!scopedDoc.exists) {
        return null;
    }

    return filterPublicCategories(scopedDoc.data() as KnowledgeBaseCategoriesType);
};

const fetchArticle = async (scope: Scope, articleId: string): Promise<KnowledgeBaseArticleType | null> => {
    const snapshot = await getCanonicaDb()
        .collection(DB_COLLECTIONS.KB_ARTICLES)
        .doc(articleId)
        .get();

    if (!snapshot.exists) {
        return null;
    }

    const article = { ...snapshot.data(), id: snapshot.id } as KnowledgeBaseArticleType;
    if (!isScopedArticle(article, scope) || !isPublishedArticle(article)) {
        return null;
    }

    return compactPublicArticle(article);
};

const fetchLatestChangelogPage = async (scope: Scope): Promise<ChangelogPage | null> => {
    const snapshot = await getCanonicaDb()
        .collection(`${DB_COLLECTIONS.CHANGELOG}/${scope.tId}/${scope.sId}`)
        .orderBy('pageNumber', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return filterPublishedChangelogEntries({ ...doc.data(), id: doc.id } as ChangelogPage);
};

const fetchOlderChangelogPage = async (scope: Scope, beforePageNumber: number): Promise<ChangelogPage | null> => {
    const snapshot = await getCanonicaDb()
        .collection(`${DB_COLLECTIONS.CHANGELOG}/${scope.tId}/${scope.sId}`)
        .where('pageNumber', '<', beforePageNumber)
        .orderBy('pageNumber', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return filterPublishedChangelogEntries({ ...doc.data(), id: doc.id } as ChangelogPage);
};

export const getCachedPublishedFaqs = async (
    scope: Scope,
    maxResults = PUBLIC_FAQ_LIMIT,
): Promise<CanonicaFaq[]> => {
    const cached = unstable_cache(
        () => fetchPublishedFaqs(scope, maxResults),
        ['canonica-public-faqs', String(scope.tId), String(scope.sId), String(maxResults)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getCanonicaPublicCacheTags(scope.tId, scope.sId, 'faqs'),
        },
    );

    return cached();
};

export const getCachedKnowledgeBaseCategories = async (
    scope: Scope,
): Promise<KnowledgeBaseCategoriesType | null> => {
    const cached = unstable_cache(
        () => fetchCategories(scope),
        ['canonica-public-kb-categories', String(scope.tId), String(scope.sId)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getCanonicaPublicCacheTags(scope.tId, scope.sId, 'kb'),
        },
    );

    return cached();
};

export const getCachedKnowledgeBaseArticle = async (
    scope: Scope,
    articleId: string,
): Promise<KnowledgeBaseArticleType | null> => {
    const normalizedArticleId = String(articleId || '').trim();
    if (!normalizedArticleId) return null;

    const cached = unstable_cache(
        () => fetchArticle(scope, normalizedArticleId),
        ['canonica-public-kb-article', String(scope.tId), String(scope.sId), normalizedArticleId],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getCanonicaPublicCacheTags(scope.tId, scope.sId, 'kb'),
        },
    );

    return cached();
};

export const getCachedLatestChangelogPage = async (
    scope: Scope,
): Promise<ChangelogPage | null> => {
    const cached = unstable_cache(
        () => fetchLatestChangelogPage(scope),
        ['canonica-public-changelog-latest', String(scope.tId), String(scope.sId)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getCanonicaPublicCacheTags(scope.tId, scope.sId, 'changelog'),
        },
    );

    return cached();
};

export const getCachedOlderChangelogPage = async (
    scope: Scope,
    beforePageNumber: number,
): Promise<ChangelogPage | null> => {
    const normalizedPageNumber = Number(beforePageNumber);
    if (!Number.isFinite(normalizedPageNumber) || normalizedPageNumber <= 1) return null;

    const cached = unstable_cache(
        () => fetchOlderChangelogPage(scope, normalizedPageNumber),
        ['canonica-public-changelog-before', String(scope.tId), String(scope.sId), String(normalizedPageNumber)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getCanonicaPublicCacheTags(scope.tId, scope.sId, 'changelog'),
        },
    );

    return cached();
};

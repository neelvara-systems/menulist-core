import { DB_COLLECTIONS } from '@constant/database';
import { getAnswerlatticePublicCacheTags } from '@lib/actions/revalidateAnswerlatticePublicCache';
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import { projectAnswerlatticePublicFaq } from '@lib/answerlattice/faqContent';
import {
    normalizeAnswerlatticePublicCategories,
    projectAnswerlatticePublicArticle,
    projectAnswerlatticePublicChangelogPage,
    type AnswerlatticePublicArticle,
    type AnswerlatticePublicChangelogPage,
} from '@lib/answerlattice/publicContentBoundary';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { ANSWERLATTICE_FAQ_STATUS, type AnswerlatticePublicFaq } from '@type/answerlattice';
import type { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { unstable_cache } from 'next/cache';

const PUBLIC_CACHE_REVALIDATE_SECONDS = 60;
const PUBLIC_FAQ_LIMIT = 80;
const PUBLIC_ARTICLE_LIMIT = 500;
const PUBLIC_CHANGELOG_PAGE_SCAN_LIMIT = 25;

type Scope = {
    tId: number;
    sId: number;
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
};

const getKnowledgeBaseCategoriesDocId = (scope: Scope) => `categories_${scope.tId}_${scope.sId}`;

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
                        articles: (section.articles || [])
                            .filter(article => article.active !== false)
                            .slice(0, PUBLIC_ARTICLE_LIMIT),
                    }));

                return [categoryId, {
                    ...category,
                    articles: (category.articles || []).filter(article => article.active !== false).slice(0, PUBLIC_ARTICLE_LIMIT),
                    sections,
                }];
            }),
    );

    return normalizeAnswerlatticePublicCategories({ categories });
};

const fetchPublishedFaqs = async (scope: Scope, maxResults: number): Promise<AnswerlatticePublicFaq[]> => {
    const snapshot = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('status', '==', ANSWERLATTICE_FAQ_STATUS.PUBLISHED)
        .where('active', '==', true)
        .orderBy('sortOrder', 'asc')
        .orderBy('modifiedOn', 'desc')
        .limit(Math.min(Math.max(maxResults, 1), PUBLIC_FAQ_LIMIT))
        .get();

    const projected = snapshot.docs.map(doc => projectAnswerlatticePublicFaq(doc.data(), doc.id, scope));
    const faqs = projected.filter((faq): faq is AnswerlatticePublicFaq => faq !== null);
    if (faqs.length !== projected.length) {
        logRuntimeFailure('answerlattice_public_faq_record_rejected', undefined, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tId),
            ...getBoundedRuntimeStringContext('storeId', scope.sId),
            rejectedCount: projected.length - faqs.length,
        });
    }
    return faqs;
};

const fetchCategories = async (scope: Scope): Promise<KnowledgeBaseCategoriesType | null> => {
    const scopedDoc = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.KB_CATEGORIES)
        .doc(getKnowledgeBaseCategoriesDocId(scope))
        .get();

    if (!scopedDoc.exists) {
        return null;
    }

    return filterPublicCategories(scopedDoc.data() as KnowledgeBaseCategoriesType);
};

const fetchArticle = async (scope: Scope, articleId: string): Promise<AnswerlatticePublicArticle | null> => {
    const snapshot = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.KB_ARTICLES)
        .doc(articleId)
        .get();

    if (!snapshot.exists) {
        return null;
    }

    return projectAnswerlatticePublicArticle(snapshot.data(), snapshot.id, scope);
};

const fetchLatestChangelogPage = async (scope: Scope): Promise<AnswerlatticePublicChangelogPage | null> => {
    const snapshot = await getAnswerlatticeDb()
        .collection(`${DB_COLLECTIONS.CHANGELOG}/${scope.tId}/${scope.sId}`)
        .orderBy('pageNumber', 'desc')
        .limit(PUBLIC_CHANGELOG_PAGE_SCAN_LIMIT)
        .get();

    if (snapshot.empty) {
        return null;
    }

    for (const doc of snapshot.docs) {
        const page = projectAnswerlatticePublicChangelogPage(doc.data(), doc.id, scope);
        if (page && page.entries.length > 0) return page;
    }
    return null;
};

const fetchOlderChangelogPage = async (scope: Scope, beforePageNumber: number): Promise<AnswerlatticePublicChangelogPage | null> => {
    const snapshot = await getAnswerlatticeDb()
        .collection(`${DB_COLLECTIONS.CHANGELOG}/${scope.tId}/${scope.sId}`)
        .where('pageNumber', '<', beforePageNumber)
        .orderBy('pageNumber', 'desc')
        .limit(PUBLIC_CHANGELOG_PAGE_SCAN_LIMIT)
        .get();

    if (snapshot.empty) {
        return null;
    }

    for (const doc of snapshot.docs) {
        const page = projectAnswerlatticePublicChangelogPage(doc.data(), doc.id, scope);
        if (page && page.entries.length > 0) return page;
    }
    return null;
};

export const getCachedPublishedFaqs = async (
    scope: Scope,
    maxResults = PUBLIC_FAQ_LIMIT,
): Promise<AnswerlatticePublicFaq[]> => {
    const cached = unstable_cache(
        () => fetchPublishedFaqs(scope, maxResults),
        ['answerlattice-public-faqs', String(scope.tId), String(scope.sId), String(maxResults)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getAnswerlatticePublicCacheTags(scope.tId, scope.sId, 'faqs'),
        },
    );

    return cached();
};

export const getCachedKnowledgeBaseCategories = async (
    scope: Scope,
): Promise<KnowledgeBaseCategoriesType | null> => {
    const cached = unstable_cache(
        () => fetchCategories(scope),
        ['answerlattice-public-kb-categories', String(scope.tId), String(scope.sId)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getAnswerlatticePublicCacheTags(scope.tId, scope.sId, 'kb'),
        },
    );

    return cached();
};

export const getCachedKnowledgeBaseArticle = async (
    scope: Scope,
    articleId: string,
): Promise<AnswerlatticePublicArticle | null> => {
    const normalizedArticleId = normalizeAnswerlatticeKbArticleId(articleId);
    if (!normalizedArticleId) return null;

    const cached = unstable_cache(
        () => fetchArticle(scope, normalizedArticleId),
        ['answerlattice-public-kb-article', String(scope.tId), String(scope.sId), normalizedArticleId],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getAnswerlatticePublicCacheTags(scope.tId, scope.sId, 'kb'),
        },
    );

    return cached();
};

export const getCachedLatestChangelogPage = async (
    scope: Scope,
): Promise<AnswerlatticePublicChangelogPage | null> => {
    const cached = unstable_cache(
        () => fetchLatestChangelogPage(scope),
        ['answerlattice-public-changelog-latest', String(scope.tId), String(scope.sId)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getAnswerlatticePublicCacheTags(scope.tId, scope.sId, 'changelog'),
        },
    );

    return cached();
};

export const getCachedOlderChangelogPage = async (
    scope: Scope,
    beforePageNumber: number,
): Promise<AnswerlatticePublicChangelogPage | null> => {
    const normalizedPageNumber = Number(beforePageNumber);
    if (!Number.isFinite(normalizedPageNumber) || normalizedPageNumber <= 1) return null;

    const cached = unstable_cache(
        () => fetchOlderChangelogPage(scope, normalizedPageNumber),
        ['answerlattice-public-changelog-before', String(scope.tId), String(scope.sId), String(normalizedPageNumber)],
        {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: getAnswerlatticePublicCacheTags(scope.tId, scope.sId, 'changelog'),
        },
    );

    return cached();
};

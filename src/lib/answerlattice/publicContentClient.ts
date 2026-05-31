import type { ChangelogPage } from '@type/changelog';
import type { AnswerlatticeFaq } from '@type/answerlattice';
import type { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';

type PublicContentType = 'faqs' | 'categories' | 'article' | 'changelog';

const buildUrl = (type: PublicContentType, params?: Record<string, string | number | null | undefined>) => {
    const searchParams = new URLSearchParams({ type });
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && String(value).trim()) {
            searchParams.set(key, String(value));
        }
    });
    return `/api/answerlattice/public-content?${searchParams.toString()}`;
};

async function fetchPublicContent<T>(
    type: PublicContentType,
    params?: Record<string, string | number | null | undefined>,
): Promise<T> {
    const response = await fetch(buildUrl(type, params), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Answerlattice public content request failed: ${response.status}`);
    }

    const payload = await response.json();
    return payload.data as T;
}

export const fetchAnswerlatticePublicFaqs = (maxResults?: number) => (
    fetchPublicContent<AnswerlatticeFaq[]>('faqs', { maxResults })
);

export const fetchAnswerlatticePublicCategories = () => (
    fetchPublicContent<KnowledgeBaseCategoriesType | null>('categories')
);

export const fetchAnswerlatticePublicArticle = (articleId: string) => (
    fetchPublicContent<KnowledgeBaseArticleType | null>('article', { articleId })
);

export const fetchAnswerlatticePublicChangelogPage = (options?: { beforePageNumber?: number }) => (
    fetchPublicContent<ChangelogPage | null>('changelog', {
        beforePageNumber: options?.beforePageNumber,
    })
);

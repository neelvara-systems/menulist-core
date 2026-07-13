import { ARTICLE_STATUS } from '@type/knowledgeBase';
import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId } from './sessionScope';

export const ANSWERLATTICE_ARTICLE_MUTATION_LIMIT = 100;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const normalizeAnswerlatticeArticleMutationIds = (value: unknown): string[] | null => {
    if (!Array.isArray(value) || value.length === 0 || value.length > ANSWERLATTICE_ARTICLE_MUTATION_LIMIT) return null;
    const ids = value.map(normalizeAnswerlatticeKbArticleId);
    if (ids.some(id => id === null)) return null;
    const normalized = ids as string[];
    return new Set(normalized).size === normalized.length ? normalized : null;
};

export const isAnswerlatticeArticleBulkStatus = (value: unknown): value is typeof ARTICLE_STATUS.PUBLISHED | typeof ARTICLE_STATUS.ARCHIVED => (
    value === ARTICLE_STATUS.PUBLISHED || value === ARTICLE_STATUS.ARCHIVED
);

export const resolveSingleAnswerlatticeArticleScope = (articles: readonly unknown[]): { tId: number; sId: number } | null => {
    if (articles.length === 0 || articles.length > ANSWERLATTICE_ARTICLE_MUTATION_LIMIT) return null;
    let scope: { tId: number; sId: number } | null = null;
    for (const article of articles) {
        if (!isRecord(article) || article.pId !== 'AL') return null;
        const tId = normalizeAnswerlatticeScopeDocumentId(article.tId);
        const sId = normalizeAnswerlatticeScopeDocumentId(article.sId);
        if (!tId || !sId) return null;
        if (scope && (scope.tId !== tId || scope.sId !== sId)) return null;
        scope = { tId, sId };
    }
    return scope;
};

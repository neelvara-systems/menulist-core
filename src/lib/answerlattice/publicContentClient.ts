import type { ChangelogPage } from '@type/changelog';
import type { AnswerlatticeFaq } from '@type/answerlattice';
import type { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

type PublicContentType = 'faqs' | 'categories' | 'article' | 'changelog';
const ANSWERLATTICE_PUBLIC_CONTENT_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;
const ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};
const ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_FAILED = 'Answerlattice public content request failed';

type PublicContentResponse<T> = {
    data: T;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPublicContentResponse = <T,>(value: unknown): value is PublicContentResponse<T> => (
    isRecord(value) && 'data' in value
);

const getPublicContentClientLogContext = (type: PublicContentType, response: Response) => ({
    ...getBoundedRuntimeStringContext('contentType', type),
    responseOk: response.ok,
    responseStatus: response.status,
});

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
        ...ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_POLICY,
        method: 'GET',
    });

    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_PUBLIC_CONTENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(
            'answerlattice_public_content_client_response_parse_failed',
            error,
            getPublicContentClientLogContext(type, response),
        );
        throw new Error(ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_FAILED);
    }

    if (!response.ok) {
        logRuntimeFailure(
            'answerlattice_public_content_client_response_rejected',
            undefined,
            getPublicContentClientLogContext(type, response),
        );
        throw new Error(ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_FAILED);
    }

    if (!isPublicContentResponse<T>(payload)) {
        logRuntimeFailure(
            'answerlattice_public_content_client_response_invalid',
            undefined,
            getPublicContentClientLogContext(type, response),
        );
        throw new Error(ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_FAILED);
    }

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

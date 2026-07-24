import type { AnswerlatticePublicFaq } from '@type/answerlattice';
import type { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { normalizeAnswerlatticePublicFaqList } from '@lib/answerlattice/faqContent';
import {
    normalizeAnswerlatticePublicArticle,
    normalizeAnswerlatticePublicCategories,
    normalizeAnswerlatticePublicChangelogPage,
    type AnswerlatticePublicArticle,
    type AnswerlatticePublicChangelogPage,
} from '@lib/answerlattice/publicContentBoundary';
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
    scope: AnswerlatticePublicContentRequestScope;
};

export type AnswerlatticePublicContentRequestScope = {
    tId: number;
    sId: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPublicContentResponse = <T,>(
    value: unknown,
    expectedScope: AnswerlatticePublicContentRequestScope,
): value is PublicContentResponse<T> => (
    isRecord(value)
    && 'data' in value
    && isRecord(value.scope)
    && value.scope.tId === expectedScope.tId
    && value.scope.sId === expectedScope.sId
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
    expectedScope: AnswerlatticePublicContentRequestScope,
    params?: Record<string, string | number | null | undefined>,
): Promise<T> {
    const response = await fetch(buildUrl(type, {
        ...params,
        expectedTenantId: expectedScope.tId,
        expectedStoreId: expectedScope.sId,
    }), {
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

    if (!isPublicContentResponse<T>(payload, expectedScope)) {
        logRuntimeFailure(
            'answerlattice_public_content_client_response_invalid',
            undefined,
            getPublicContentClientLogContext(type, response),
        );
        throw new Error(ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_FAILED);
    }

    return payload.data as T;
}

export const fetchAnswerlatticePublicFaqs = async (
    expectedScope: AnswerlatticePublicContentRequestScope,
    maxResults?: number,
): Promise<AnswerlatticePublicFaq[]> => {
    const data = await fetchPublicContent<unknown>('faqs', expectedScope, { maxResults });
    const faqs = normalizeAnswerlatticePublicFaqList(data);
    if (!faqs) {
        logRuntimeFailure('answerlattice_public_faq_client_payload_invalid', undefined, {
            itemCount: Array.isArray(data) ? data.length : null,
        });
        throw new Error(ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_FAILED);
    }
    return faqs;
};

const rejectInvalidPublicPayload = (type: PublicContentType, data: unknown): never => {
    logRuntimeFailure('answerlattice_public_content_client_payload_invalid', undefined, {
        ...getBoundedRuntimeStringContext('contentType', type),
        itemCount: Array.isArray(data) ? data.length : null,
    });
    throw new Error(ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_FAILED);
};

export const fetchAnswerlatticePublicCategories = async (
    expectedScope: AnswerlatticePublicContentRequestScope,
): Promise<KnowledgeBaseCategoriesType | null> => {
    const data = await fetchPublicContent<unknown>('categories', expectedScope);
    if (data === null) return null;
    return normalizeAnswerlatticePublicCategories(data) || rejectInvalidPublicPayload('categories', data);
};

export const fetchAnswerlatticePublicArticle = async (
    articleId: string,
    expectedScope: AnswerlatticePublicContentRequestScope,
): Promise<AnswerlatticePublicArticle | null> => {
    const data = await fetchPublicContent<unknown>('article', expectedScope, { articleId });
    if (data === null) return null;
    return normalizeAnswerlatticePublicArticle(data) || rejectInvalidPublicPayload('article', data);
};

export const fetchAnswerlatticePublicChangelogPage = async (
    expectedScope: AnswerlatticePublicContentRequestScope,
    options?: { beforePageNumber?: number },
): Promise<AnswerlatticePublicChangelogPage | null> => {
    const data = await fetchPublicContent<unknown>('changelog', expectedScope, {
        beforePageNumber: options?.beforePageNumber,
    });
    if (data === null) return null;
    return normalizeAnswerlatticePublicChangelogPage(data) || rejectInvalidPublicPayload('changelog', data);
};

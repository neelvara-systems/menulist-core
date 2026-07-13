import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';

export const HELP_CENTER_SEARCH_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;
export const HELP_CENTER_SEARCH_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};

export type HelpCenterSearchResponseSurface = 'help_chat' | 'ai_search_modal';

export type HelpCenterSearchResponse = {
    id?: string;
    craftedAnswer: string;
    references: KnowledgeBaseArticleType[];
    relatedContent?: unknown;
    suggestedQuestions?: string[];
    imageProcessed?: boolean;
    answerSource?: string;
    escalation?: {
        suggested?: boolean;
        type?: unknown;
        triggers?: unknown;
        context?: unknown;
    };
};

type HelpCenterSearchResponseLogContext = Record<string, boolean | number | string | undefined>;
type HelpCenterSearchClientError = Error & { code?: string; retryAfter?: number; status?: number };

const HELP_CENTER_SEARCH_FAILED_MESSAGE = 'Help center search request failed';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const SENSITIVE_RESPONSE_KEYS = new Set(['apiKey', 'embedding', 'embeddingV2', 'pId', 'sId', 'secret', 'tId', 'token', 'uId']);

const hasSensitiveResponseKey = (value: Record<string, unknown>): boolean => (
    Object.keys(value).some(key => SENSITIVE_RESPONSE_KEYS.has(key))
);

const isReferenceArticle = (value: unknown): value is KnowledgeBaseArticleType => (
    isRecord(value)
    && !hasSensitiveResponseKey(value)
    && typeof value.id === 'string'
    && value.id.length > 0
    && value.id.length <= 180
    && typeof value.categoryId === 'string'
    && value.categoryId.length <= 180
    && (value.sectionId === undefined || (typeof value.sectionId === 'string' && value.sectionId.length <= 180))
    && (value.title === undefined || (typeof value.title === 'string' && value.title.length <= 240))
    && (value.url === undefined || (typeof value.url === 'string' && value.url.length <= 500))
);

export const isHelpCenterSearchResponse = (value: unknown): value is HelpCenterSearchResponse => (
    isRecord(value)
    && !hasSensitiveResponseKey(value)
    && (value.id === undefined || (typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 180))
    && typeof value.craftedAnswer === 'string'
    && value.craftedAnswer.length > 0
    && value.craftedAnswer.length <= 12_000
    && Array.isArray(value.references)
    && value.references.length <= 8
    && value.references.every(isReferenceArticle)
    && (
        value.suggestedQuestions === undefined
        || (
            Array.isArray(value.suggestedQuestions)
            && value.suggestedQuestions.length <= 3
            && value.suggestedQuestions.every(question => typeof question === 'string' && question.length > 0 && question.length <= 240)
        )
    )
    && (value.imageProcessed === undefined || typeof value.imageProcessed === 'boolean')
    && (value.answerSource === undefined || typeof value.answerSource === 'string')
);

const getHelpCenterSearchResponseLogContext = (
    response: Response,
    surface: HelpCenterSearchResponseSurface,
): HelpCenterSearchResponseLogContext => ({
    maxBytes: HELP_CENTER_SEARCH_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
    surface,
});

const getRejectedResponseCode = (payload: unknown): string => {
    if (isRecord(payload) && typeof payload.code === 'string') {
        return payload.code;
    }
    return 'HELP_CENTER_SEARCH_REJECTED';
};

const getRetryAfter = (payload: unknown): number | undefined => {
    if (!isRecord(payload)) return undefined;
    const retryAfter = Number(payload.retryAfter);
    return Number.isFinite(retryAfter) ? retryAfter : undefined;
};

const createHelpCenterSearchClientError = (
    response: Response,
    code: string,
    retryAfter?: number,
): HelpCenterSearchClientError => {
    const error = new Error(HELP_CENTER_SEARCH_FAILED_MESSAGE) as HelpCenterSearchClientError;
    error.code = code.slice(0, 64);
    error.status = response.status;
    if (typeof retryAfter === 'number') {
        error.retryAfter = retryAfter;
    }
    return error;
};

export const getHelpCenterSearchClientFailureMessage = (
    error: unknown,
    fallbackMessage = 'Search failed. Please try again.',
): string => {
    const status = Number((error as HelpCenterSearchClientError | undefined)?.status);
    if (status !== 429) return fallbackMessage;

    const retryAfter = Number((error as HelpCenterSearchClientError | undefined)?.retryAfter || 60);
    return `You've reached the request limit. Please wait ${Number.isFinite(retryAfter) ? retryAfter : 60} seconds before trying again.`;
};

export const readHelpCenterSearchResponse = async (
    response: Response,
    surface: HelpCenterSearchResponseSurface,
): Promise<HelpCenterSearchResponse> => {
    let payload: unknown = null;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            HELP_CENTER_SEARCH_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(
            'help_center_search_response_parse_failed',
            error,
            getHelpCenterSearchResponseLogContext(response, surface),
        );
    }

    if (!response.ok) {
        throw createHelpCenterSearchClientError(
            response,
            getRejectedResponseCode(payload),
            getRetryAfter(payload),
        );
    }

    if (!isHelpCenterSearchResponse(payload)) {
        const error = createHelpCenterSearchClientError(
            response,
            'HELP_CENTER_SEARCH_RESPONSE_INVALID',
        );
        logRuntimeFailure(
            'help_center_search_response_invalid',
            error,
            getHelpCenterSearchResponseLogContext(response, surface),
        );
        throw error;
    }

    return payload;
};

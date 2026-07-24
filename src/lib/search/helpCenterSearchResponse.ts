import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { normalizeAnswerlatticePublicRelatedContent } from '@lib/answerlattice/productSurfaceContent';
import {
    normalizeAnswerlatticePublicCitation,
    normalizeAnswerlatticePublicCitations,
    normalizeAnswerlatticePublicFallbackReason,
    normalizeAnswerlatticeScopeClarification,
    type AnswerlatticePublicFallbackReason,
} from '@lib/answerlattice/publicAnswerContracts';
import type {
    AnswerlatticePublicCitation,
    AnswerlatticeScopeClarification,
    AnswerlatticeSurfaceContentItem,
} from '@type/answerlattice';
import type { EscalationTriggerType, EscalationType } from '@lib/answerlattice/escalationTypes';
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import type { AiSearchHistoryReference } from '@type/aiSearchHistory';
import type { CoreSearchReference, CoreSearchResult } from './types';

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
    references: AiSearchHistoryReference[];
    citations?: AnswerlatticePublicCitation[];
    relatedContent?: AnswerlatticeSurfaceContentItem;
    suggestedQuestions?: string[];
    imageProcessed?: boolean;
    answerSource?: 'canonical' | 'faq' | 'rag' | 'cache' | 'empty';
    fallbackReason?: AnswerlatticePublicFallbackReason;
    clarification?: AnswerlatticeScopeClarification;
    confidence?: 'high' | 'medium' | 'low' | 'none';
    escalation?: {
        suggested: true;
        type: EscalationType;
        triggers: EscalationTriggerType[];
    };
};

type HelpCenterSearchResponseLogContext = Record<string, boolean | number | string | undefined>;
type HelpCenterSearchClientError = Error & { code?: string; retryAfter?: number; status?: number };

const HELP_CENTER_SEARCH_FAILED_MESSAGE = 'Help center search request failed';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const SENSITIVE_RESPONSE_KEYS = new Set(['apiKey', 'embedding', 'embeddingV2', 'pId', 'sId', 'secret', 'tId', 'token', 'uId']);
const HELP_CENTER_SEARCH_RESPONSE_KEYS = new Set([
    'answerSource',
    'citations',
    'clarification',
    'confidence',
    'craftedAnswer',
    'escalation',
    'fallbackReason',
    'id',
    'imageProcessed',
    'references',
    'relatedContent',
    'suggestedQuestions',
]);
const HELP_CENTER_SEARCH_REFERENCE_KEYS = new Set([
    'categoryId',
    'categoryTitle',
    'id',
    'sectionId',
    'sectionTitle',
    'similarityScore',
    'title',
    'url',
]);
const ESCALATION_TRIGGER_TYPES = new Set<EscalationTriggerType>([
    'entity_resolution_failure',
    'explicit_user_request',
    'insufficient_answer_evidence',
    'rag_low_similarity',
]);

const hasSensitiveResponseKey = (value: Record<string, unknown>): boolean => (
    Object.keys(value).some(key => SENSITIVE_RESPONSE_KEYS.has(key))
);

const isReferenceArticle = (value: unknown): value is AiSearchHistoryReference => (
    isRecord(value)
    && !hasSensitiveResponseKey(value)
    && Object.keys(value).every(key => HELP_CENTER_SEARCH_REFERENCE_KEYS.has(key))
    && typeof value.id === 'string'
    && value.id.length > 0
    && value.id.length <= 180
    && (value.categoryId === undefined || (typeof value.categoryId === 'string' && value.categoryId.length <= 180))
    && (value.sectionId === undefined || (typeof value.sectionId === 'string' && value.sectionId.length <= 180))
    && (value.title === undefined || (typeof value.title === 'string' && value.title.length <= 240))
    && (value.url === undefined || (typeof value.url === 'string' && value.url.length <= 500))
    && (value.categoryTitle === undefined || (typeof value.categoryTitle === 'string' && value.categoryTitle.length <= 180))
    && (value.sectionTitle === undefined || (typeof value.sectionTitle === 'string' && value.sectionTitle.length <= 180))
    && (value.similarityScore === undefined || (typeof value.similarityScore === 'number' && Number.isFinite(value.similarityScore) && value.similarityScore >= 0 && value.similarityScore <= 1))
);

const cleanResponseString = (value: unknown, maxLength: number): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, maxLength) : undefined;
};

export const projectHelpCenterSearchReferences = (values: CoreSearchReference[]): AiSearchHistoryReference[] => (
    values.slice(0, 8).flatMap((value) => {
        const id = normalizeAnswerlatticeKbArticleId(value.id);
        const title = cleanResponseString(value.title, 240);
        if (!id || id !== value.id || !title) return [];
        const similarityScore = Number(value.similarityScore);
        return [{
            id,
            title,
            ...(cleanResponseString(value.categoryId, 180) ? { categoryId: cleanResponseString(value.categoryId, 180) } : {}),
            ...(cleanResponseString(value.sectionId, 180) ? { sectionId: cleanResponseString(value.sectionId, 180) } : {}),
            ...(cleanResponseString(value.categoryTitle, 180) ? { categoryTitle: cleanResponseString(value.categoryTitle, 180) } : {}),
            ...(cleanResponseString(value.sectionTitle, 180) ? { sectionTitle: cleanResponseString(value.sectionTitle, 180) } : {}),
            ...(Number.isFinite(similarityScore)
                ? { similarityScore: Math.max(0, Math.min(1, similarityScore)) }
                : {}),
        }];
    })
);

export const projectHelpCenterSearchResponse = (result: CoreSearchResult): HelpCenterSearchResponse => {
    const relatedContent = normalizeAnswerlatticePublicRelatedContent(result.relatedContent);
    const fallbackReason = normalizeAnswerlatticePublicFallbackReason(result.fallbackReason);
    const clarification = normalizeAnswerlatticeScopeClarification(result.clarification);
    const response: HelpCenterSearchResponse = {
        craftedAnswer: result.craftedAnswer,
        references: projectHelpCenterSearchReferences(result.references),
        citations: normalizeAnswerlatticePublicCitations(result.citations),
        suggestedQuestions: result.suggestedQuestions || [],
        id: result.searchHistoryId,
        imageProcessed: result.imageProcessed,
        answerSource: result.answerSource || (result.canonical ? 'canonical' : 'rag'),
        fallbackReason: fallbackReason || undefined,
        clarification: clarification || undefined,
        confidence: result.confidence,
    };
    if (relatedContent) response.relatedContent = relatedContent;
    if (result.escalation?.escalationSuggested) {
        response.escalation = {
            suggested: true,
            type: result.escalation.escalationType,
            triggers: result.escalation.triggerTypes,
        };
    }
    return response;
};

const isPublicEscalation = (value: unknown): value is NonNullable<HelpCenterSearchResponse['escalation']> => (
    isRecord(value)
    && Object.keys(value).every(key => ['suggested', 'triggers', 'type'].includes(key))
    && value.suggested === true
    && ['hard', 'none', 'soft'].includes(String(value.type))
    && Array.isArray(value.triggers)
    && value.triggers.length >= 1
    && value.triggers.length <= 4
    && value.triggers.every(trigger => ESCALATION_TRIGGER_TYPES.has(trigger as EscalationTriggerType))
);

const isPublicCitation = (value: unknown): value is AnswerlatticePublicCitation => (
    isRecord(value)
    && !hasSensitiveResponseKey(value)
    && Object.keys(value).every(key => ['id', 'title', 'url'].includes(key))
    && normalizeAnswerlatticePublicCitation(value) !== null
);

export const isHelpCenterSearchResponse = (value: unknown): value is HelpCenterSearchResponse => (
    isRecord(value)
    && !hasSensitiveResponseKey(value)
    && Object.keys(value).every(key => HELP_CENTER_SEARCH_RESPONSE_KEYS.has(key))
    && (value.id === undefined || (typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 180))
    && typeof value.craftedAnswer === 'string'
    && value.craftedAnswer.length > 0
    && value.craftedAnswer.length <= 12_000
    && Array.isArray(value.references)
    && value.references.length <= 8
    && value.references.every(isReferenceArticle)
    && (
        value.citations === undefined
        || (
            Array.isArray(value.citations)
            && value.citations.length <= 8
            && value.citations.every(isPublicCitation)
        )
    )
    && (
        value.suggestedQuestions === undefined
        || (
            Array.isArray(value.suggestedQuestions)
            && value.suggestedQuestions.length <= 3
            && value.suggestedQuestions.every(question => typeof question === 'string' && question.length > 0 && question.length <= 240)
        )
    )
    && (value.imageProcessed === undefined || typeof value.imageProcessed === 'boolean')
    && (value.answerSource === undefined || ['cache', 'canonical', 'empty', 'faq', 'rag'].includes(String(value.answerSource)))
    && (value.fallbackReason === undefined || value.fallbackReason === null || normalizeAnswerlatticePublicFallbackReason(value.fallbackReason) !== null)
    && (value.clarification === undefined || value.clarification === null || normalizeAnswerlatticeScopeClarification(value.clarification) !== null)
    && (value.confidence === undefined || ['high', 'medium', 'low', 'none'].includes(String(value.confidence)))
    && (
        value.relatedContent === undefined
        || normalizeAnswerlatticePublicRelatedContent(value.relatedContent) !== null
    )
    && (value.escalation === undefined || isPublicEscalation(value.escalation))
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

    const relatedContent = payload.relatedContent === undefined
        ? undefined
        : normalizeAnswerlatticePublicRelatedContent(payload.relatedContent) || undefined;
    const citations = normalizeAnswerlatticePublicCitations(payload.citations);
    const fallbackReason = normalizeAnswerlatticePublicFallbackReason(payload.fallbackReason);
    const clarification = normalizeAnswerlatticeScopeClarification(payload.clarification);

    return {
        ...payload,
        ...(citations.length > 0 ? { citations } : { citations: [] }),
        fallbackReason: fallbackReason || undefined,
        clarification: clarification || undefined,
        ...(relatedContent ? { relatedContent } : {}),
    };
};

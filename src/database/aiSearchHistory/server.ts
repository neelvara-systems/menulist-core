import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticeRetentionFields } from '@lib/answerlattice/dataRetention';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import {
    normalizeAnswerlatticePublicCitations,
    normalizeAnswerlatticeScopeClarification,
} from '@lib/answerlattice/publicAnswerContracts';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { createRuntimeId } from '@lib/runtime/randomId';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { AiSearchHistory, AiSearchHistoryReference } from '@type/aiSearchHistory';
import LoginUserType from '@type/loginUser';
import { createHash } from 'crypto';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;
const MAX_QUERY_CHARS = 500;
const MAX_ANSWER_CHARS = 12000;
const MAX_REFERENCE_COUNT = 8;
const MAX_CITATION_COUNT = 8;
const MAX_SUGGESTED_QUESTION_COUNT = 3;
const MAX_SUGGESTED_QUESTION_CHARS = 240;
const RESPONSE_CACHE_VERSION = 2 as const;
const ANSWER_SOURCES = new Set(['canonical', 'faq', 'rag', 'cache', 'empty']);
const ANSWER_TYPES = new Set(['explanation', 'navigation', 'procedure', 'faq']);
const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low', 'none']);
const MOUNT_CONTEXTS = new Set(['help_center', 'widget', 'api']);

type AiSearchHistoryWritePayload = Omit<AiSearchHistory, 'id'> & {
    pId: typeof PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    uId: string;
    modifiedOn: Date;
    createdOn: unknown;
    createdBy: string;
    traceId: string;
    requestId: string;
    expiresAt: unknown;
    retentionDays: number;
};

type AiSearchHistoryWriteInput = Omit<AiSearchHistory, 'id'> & {
    createdBy?: unknown;
    traceId?: unknown;
    requestId?: unknown;
};

type AiSearchHistoryScope = {
    tId: number;
    sId: number;
};

const createTraceId = () => createRuntimeId('al');

const getAiSearchHistoryScope = (source: { tId?: unknown; sId?: unknown } | null | undefined): AiSearchHistoryScope | null => {
    const tId = normalizeAnswerlatticeScopeDocumentId(source?.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(source?.sId);
    if (!tId || !sId) return null;
    return { tId, sId };
};

const truncateString = (value: unknown, maxLength: number): unknown => {
    if (typeof value !== 'string') return value;
    return value.length > maxLength ? value.slice(0, maxLength) : value;
};

const hashSearchCacheKey = (value: unknown): string => (
    createHash('sha256').update(String(value || '')).digest('hex')
);

const compactSearchReference = (value: unknown): AiSearchHistoryReference | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    const referenceId = normalizeAnswerlatticeKbArticleId(source.id);
    if (!referenceId || referenceId !== source.id) return null;
    const boundedString = (key: string, maxLength = 240): string | undefined => (
        typeof source[key] === 'string' ? (source[key] as string).slice(0, maxLength) : undefined
    );
    const title = boundedString('title');
    if (!title?.trim()) return null;
    const score = Number(source.similarityScore);
    return {
        id: referenceId,
        title,
        ...(boundedString('url', 500) !== undefined ? { url: boundedString('url', 500) } : {}),
        ...(boundedString('categoryId', 180) !== undefined ? { categoryId: boundedString('categoryId', 180) } : {}),
        ...(boundedString('sectionId', 180) !== undefined ? { sectionId: boundedString('sectionId', 180) } : {}),
        ...(boundedString('categoryTitle') !== undefined ? { categoryTitle: boundedString('categoryTitle') } : {}),
        ...(boundedString('sectionTitle') !== undefined ? { sectionTitle: boundedString('sectionTitle') } : {}),
        ...(Number.isFinite(score) ? { similarityScore: Math.max(0, Math.min(1, score)) } : {}),
    };
};

const compactAiSearchHistoryPayload = (
    data: AiSearchHistoryWriteInput
): Omit<AiSearchHistory, 'id'> => {
    const query = truncateString(data.query, MAX_QUERY_CHARS);
    const craftedAnswer = truncateString(data.craftedAnswer, MAX_ANSWER_CHARS);
    const generatedQueryFromImage = truncateString(data.generatedQueryFromImage, MAX_QUERY_CHARS);
    const imageUrl = truncateString(data.imageUrl, 1000);
    const payload: Omit<AiSearchHistory, 'id'> = {
        ...data,
        cacheKey: hashSearchCacheKey(data.cacheKey),
        query: typeof query === 'string' ? query : '',
        craftedAnswer: typeof craftedAnswer === 'string' ? craftedAnswer : '',
        references: Array.isArray(data.references) ? data.references : [],
        citations: Array.isArray(data.citations) ? data.citations : [],
        suggestedQuestions: Array.isArray(data.suggestedQuestions)
            ? data.suggestedQuestions
                .filter((question): question is string => typeof question === 'string')
                .map(question => question.trim().slice(0, MAX_SUGGESTED_QUESTION_CHARS))
                .filter(Boolean)
                .slice(0, MAX_SUGGESTED_QUESTION_COUNT)
            : [],
        responseCacheVersion: RESPONSE_CACHE_VERSION,
        ...(typeof generatedQueryFromImage === 'string' ? { generatedQueryFromImage } : {}),
        ...(typeof imageUrl === 'string' ? { imageUrl } : {}),
    };

    delete payload.guidedProcedure;
    if (data.guidedProcedure !== undefined) {
        const guidedProcedure = AnswerlatticeProcedureSchema.safeParse(data.guidedProcedure);
        if (guidedProcedure.success) payload.guidedProcedure = guidedProcedure.data;
    }

    if (Array.isArray(data.references)) {
        payload.references = data.references
            .slice(0, MAX_REFERENCE_COUNT)
            .map(compactSearchReference)
            .filter((reference): reference is AiSearchHistoryReference => Boolean(reference));
    }

    if (Array.isArray(data.citations)) {
        payload.citations = normalizeAnswerlatticePublicCitations(data.citations);
    }

    const clarification = normalizeAnswerlatticeScopeClarification(data.clarification);
    if (clarification) payload.clarification = clarification;

    if (Array.isArray(data.matchedEntityIds)) {
        payload.matchedEntityIds = data.matchedEntityIds
            .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))
            .slice(0, 50);
    }

    return payload;
};

const composeAiSearchHistory = (data: AiSearchHistoryWriteInput): AiSearchHistoryWritePayload => {
    const now = new Date();
    const traceId = typeof data.traceId === 'string'
        ? data.traceId
        : createTraceId();
    const compactData = compactAiSearchHistoryPayload(data);
    const scope = getAiSearchHistoryScope(data);
    if (!scope) {
        throw new Error('Answerlattice search history scope is not available.');
    }

    const writePayload: AiSearchHistoryWritePayload = {
        ...compactData,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        uId: data.uId || 'system',
        modifiedOn: now,
        createdOn: data.createdOn || now,
        createdBy: typeof data.createdBy === 'string'
            ? data.createdBy
            : data.uId || 'system',
        traceId,
        requestId: typeof data.requestId === 'string'
            ? data.requestId
            : traceId,
        ...getAnswerlatticeRetentionFields('aiSearchHistory', now),
    };

    return sanitizeForFirestore(writePayload);
};

export const addAiSearchHistoryServer = async (data: AiSearchHistoryWriteInput) => {
    const submitData = composeAiSearchHistory(data);
    const docRef = await firestoreAdmin.collection(COLLECTION).add(submitData);
    return { ...submitData, id: docRef.id } as AiSearchHistory;
};

export const findCachedSearchByCacheKeyServer = async (
    cacheKey: string,
    session: Pick<LoginUserType, 'tId' | 'sId'>,
): Promise<AiSearchHistory | null> => {
    const scope = getAiSearchHistoryScope(session);
    if (!scope) return null;

    const snapshot = await firestoreAdmin.collection(COLLECTION)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('cacheKey', '==', hashSearchCacheKey(cacheKey))
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .orderBy('createdOn', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data();
    const query = typeof data.query === 'string' ? data.query : '';
    const storedCacheKey = typeof data.cacheKey === 'string' ? data.cacheKey : '';
    const references = Array.isArray(data.references)
        ? data.references.map(compactSearchReference).filter((reference): reference is AiSearchHistoryReference => Boolean(reference))
        : [];
    const citations = normalizeAnswerlatticePublicCitations(data.citations);
    const clarification = normalizeAnswerlatticeScopeClarification(data.clarification);
    const guidedProcedure = AnswerlatticeProcedureSchema.safeParse(data.guidedProcedure);
    const suggestedQuestions = Array.isArray(data.suggestedQuestions)
        ? data.suggestedQuestions.filter((question: unknown): question is string => (
            typeof question === 'string'
            && Boolean(question.trim())
            && question.length <= MAX_SUGGESTED_QUESTION_CHARS
        ))
        : [];
    const answerSource = typeof data.answerSource === 'string' && ANSWER_SOURCES.has(data.answerSource)
        ? data.answerSource as AiSearchHistory['answerSource']
        : undefined;
    const persistedAnswerType = typeof data.answerType === 'string' && ANSWER_TYPES.has(data.answerType)
        ? data.answerType as AiSearchHistory['answerType']
        : undefined;
    const answerType = persistedAnswerType || (guidedProcedure.success ? 'procedure' : undefined);
    const confidence = typeof data.confidence === 'string' && CONFIDENCE_LEVELS.has(data.confidence)
        ? data.confidence as AiSearchHistory['confidence']
        : undefined;
    const mountContext = typeof data.mountContext === 'string' && MOUNT_CONTEXTS.has(data.mountContext)
        ? data.mountContext as AiSearchHistory['mountContext']
        : undefined;
    let expiresAtMs = 0;
    try {
        expiresAtMs = typeof data.expiresAt?.toMillis === 'function'
            ? Number(data.expiresAt.toMillis())
            : 0;
    } catch {
        expiresAtMs = 0;
    }
    if (
        data.pId !== PRODUCT_IDS.ANSWERLATTICE
        || data.responseCacheVersion !== RESPONSE_CACHE_VERSION
        || Number(data.tId) !== scope.tId
        || Number(data.sId) !== scope.sId
        || !query
        || query.length > MAX_QUERY_CHARS
        || !/^[a-f0-9]{64}$/.test(storedCacheKey)
        || typeof data.craftedAnswer !== 'string'
        || !data.craftedAnswer.trim()
        || data.craftedAnswer.length > MAX_ANSWER_CHARS
        || !Number.isFinite(expiresAtMs)
        || expiresAtMs <= Date.now()
        || !Array.isArray(data.references)
        || data.references.length > MAX_REFERENCE_COUNT
        || references.length !== data.references.length
        || !Array.isArray(data.suggestedQuestions)
        || data.suggestedQuestions.length > MAX_SUGGESTED_QUESTION_COUNT
        || suggestedQuestions.length !== data.suggestedQuestions.length
        || (data.citations !== undefined && (!Array.isArray(data.citations)
            || data.citations.length > MAX_CITATION_COUNT
            || citations.length !== data.citations.length))
        || (data.answerSource !== undefined && answerSource === undefined)
        || (data.answerType !== undefined && persistedAnswerType === undefined)
        || (data.confidence !== undefined && confidence === undefined)
        || (data.mountContext !== undefined && mountContext === undefined)
        || (data.drifted !== undefined && typeof data.drifted !== 'boolean')
        || (data.guidedProcedure !== undefined && !guidedProcedure.success)
        || (answerType === 'procedure' && !guidedProcedure.success)
    ) {
        return null;
    }

    return {
        id: docSnapshot.id,
        query,
        cacheKey: storedCacheKey,
        craftedAnswer: data.craftedAnswer,
        references,
        suggestedQuestions,
        responseCacheVersion: RESPONSE_CACHE_VERSION,
        ...(citations.length > 0 ? { citations } : {}),
        tId: scope.tId,
        sId: scope.sId,
        ...(typeof data.uId === 'string' ? { uId: data.uId } : {}),
        ...(data.createdOn ? { createdOn: data.createdOn } : {}),
        ...(data.modifiedOn ? { modifiedOn: data.modifiedOn } : {}),
        ...(typeof data.canonical === 'boolean' ? { canonical: data.canonical } : {}),
        ...(typeof data.canonicalAnswerId === 'string' ? { canonicalAnswerId: data.canonicalAnswerId } : {}),
        ...(guidedProcedure.success
            ? { guidedProcedure: guidedProcedure.data }
            : {}),
        ...(typeof data.faqAnswerId === 'string' ? { faqAnswerId: data.faqAnswerId } : {}),
        ...(answerSource ? { answerSource } : {}),
        ...(answerType ? { answerType } : {}),
        ...(typeof data.drifted === 'boolean' ? { drifted: data.drifted } : {}),
        ...(typeof data.fallbackReason === 'string' ? { fallbackReason: data.fallbackReason } : {}),
        ...(clarification ? { clarification } : {}),
        ...(confidence ? { confidence } : {}),
        ...(Array.isArray(data.matchedEntityIds)
            ? { matchedEntityIds: data.matchedEntityIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 50) }
            : {}),
        ...(data.sourceVersions && typeof data.sourceVersions === 'object' && !Array.isArray(data.sourceVersions)
            ? { sourceVersions: data.sourceVersions }
            : {}),
        ...(mountContext ? { mountContext } : {}),
    };
};

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeCacheVersion } from '@lib/answerlattice/cacheVersionManifest';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeResolvedEntityIds,
} from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeFaqId } from '@lib/answerlattice/faqIdBoundary';
import {
    normalizeAnswerlatticePublicCitations,
    normalizeAnswerlatticeScopeClarification,
} from '@lib/answerlattice/publicAnswerContracts';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { isAnswerlatticeSearchHistoryAvailableForInteraction } from '@lib/answerlattice/searchHistoryInteractionServer';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import {
    ANSWERLATTICE_ANSWER_TRACE_MAX_ANSWER_CHARS,
    ANSWERLATTICE_ANSWER_TRACE_RECENT_RESULT_LIMIT,
    ANSWERLATTICE_ANSWER_TRACE_RECENT_SCAN_LIMIT,
    AnswerlatticeAnswerTraceResponseSchema,
    AnswerlatticeAnswerTraceSchema,
    type AnswerlatticeAnswerTrace,
    type AnswerlatticeAnswerTraceResponse,
} from './answerTraceContracts';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;
const ANSWER_SOURCES = new Set(['canonical', 'faq', 'rag', 'cache', 'empty']);
const ANSWER_TYPES = new Set(['explanation', 'navigation', 'procedure', 'faq']);
const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low', 'none']);
const MOUNT_CONTEXTS = new Set(['help_center', 'widget', 'api']);
const TRACE_PROJECTED_FIELDS = [
    'pId',
    'tId',
    'sId',
    'expiresAt',
    'retentionDays',
    'createdOn',
    'query',
    'craftedAnswer',
    'answerSource',
    'answerType',
    'canonical',
    'canonicalAnswerId',
    'faqAnswerId',
    'matchedEntityIds',
    'citations',
    'fallbackReason',
    'confidence',
    'mountContext',
    'clarification',
    'sourceVersions',
    'isGood',
    'resolutionOutcome',
    'escalationTicketId',
    'drifted',
] as const;

type AnswerTraceScope = {
    tId: number;
    sId: number;
};

const timestampToIso = (value: unknown): string | null => {
    if (!value || typeof value !== 'object') return null;
    try {
        const toMillis = Reflect.get(value, 'toMillis');
        if (typeof toMillis !== 'function') return null;
        const millis = Reflect.apply(toMillis, value, []);
        return typeof millis === 'number' && Number.isFinite(millis)
            ? new Date(millis).toISOString()
            : null;
    } catch {
        return null;
    }
};

const boundedString = (value: unknown, maxLength: number): string | null => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized ? normalized.slice(0, maxLength) : null;
};

const getReviewSignals = (
    data: Record<string, unknown>,
    answerSource: AnswerlatticeAnswerTrace['answerSource'],
): AnswerlatticeAnswerTrace['reviewSignals'] => {
    const signals: AnswerlatticeAnswerTrace['reviewSignals'] = [];
    if (data.canonical === false || boundedString(data.fallbackReason, 240)) signals.push('canonical_miss');
    if (data.canonical !== true
        && (answerSource === 'faq' || answerSource === 'rag' || answerSource === 'cache')) {
        signals.push('fallback_used');
    }
    if (data.confidence === 'low' || data.confidence === 'none') signals.push('low_confidence');
    if (data.isGood === false) signals.push('negative_feedback');
    if (data.resolutionOutcome === 'not_resolved') signals.push('not_resolved');
    if (boundedString(data.escalationTicketId, 180)) signals.push('escalated');
    if (data.drifted === true) signals.push('drifted_answer');
    if (answerSource === 'empty') signals.push('no_answer');
    return Array.from(new Set(signals));
};

export const projectAnswerlatticeAnswerTrace = (
    documentId: unknown,
    value: unknown,
    scope: AnswerTraceScope,
): AnswerlatticeAnswerTrace | null => {
    const id = normalizeAnswerlatticeSearchHistoryId(documentId);
    if (!id || !value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    if (
        data.pId !== PRODUCT_IDS.ANSWERLATTICE
        || data.tId !== scope.tId
        || data.sId !== scope.sId
        || !isAnswerlatticeSearchHistoryAvailableForInteraction(data)
    ) return null;

    const createdAt = timestampToIso(data.createdOn);
    const question = boundedString(data.query, 500);
    if (!createdAt || !question) return null;

    const answerSource = typeof data.answerSource === 'string' && ANSWER_SOURCES.has(data.answerSource)
        ? data.answerSource as AnswerlatticeAnswerTrace['answerSource']
        : data.canonical === true ? 'canonical' : 'unknown';
    const answerType = typeof data.answerType === 'string' && ANSWER_TYPES.has(data.answerType)
        ? data.answerType as NonNullable<AnswerlatticeAnswerTrace['answerType']>
        : null;
    const confidence = typeof data.confidence === 'string' && CONFIDENCE_LEVELS.has(data.confidence)
        ? data.confidence as NonNullable<AnswerlatticeAnswerTrace['confidence']>
        : null;
    const mountContext = typeof data.mountContext === 'string' && MOUNT_CONTEXTS.has(data.mountContext)
        ? data.mountContext as NonNullable<AnswerlatticeAnswerTrace['mountContext']>
        : null;
    const clarification = normalizeAnswerlatticeScopeClarification(data.clarification);
    const canonicalVersion = normalizeCacheVersion((data.sourceVersions as Record<string, unknown> | undefined)?.canonical);
    const kbVersion = normalizeCacheVersion((data.sourceVersions as Record<string, unknown> | undefined)?.kb);
    const userFeedback = data.resolutionOutcome === 'not_resolved'
        ? 'not_resolved' as const
        : data.isGood === true
            ? 'good' as const
            : data.isGood === false
                ? 'bad' as const
                : null;
    const trace = {
        id,
        createdAt,
        question,
        answer: typeof data.craftedAnswer === 'string'
            ? data.craftedAnswer.slice(0, ANSWERLATTICE_ANSWER_TRACE_MAX_ANSWER_CHARS)
            : '',
        answerSource,
        answerType,
        canonical: data.canonical === true,
        canonicalAnswerId: normalizeAnswerlatticeCanonicalAnswerId(data.canonicalAnswerId),
        faqAnswerId: normalizeAnswerlatticeFaqId(data.faqAnswerId),
        matchedEntityIds: normalizeAnswerlatticeResolvedEntityIds(data.matchedEntityIds, 20),
        citations: normalizeAnswerlatticePublicCitations(data.citations),
        fallbackReason: boundedString(data.fallbackReason, 240),
        confidence,
        mountContext,
        clarificationRequired: clarification?.requiredContext || [],
        sourceVersions: {
            ...(canonicalVersion ? { canonical: canonicalVersion } : {}),
            ...(kbVersion ? { kb: kbVersion } : {}),
        },
        userFeedback,
        escalationTicketId: normalizeAnswerlatticeSearchHistoryId(data.escalationTicketId),
        drifted: data.drifted === true,
        reviewSignals: getReviewSignals(data, answerSource),
    };
    const parsed = AnswerlatticeAnswerTraceSchema.safeParse(trace);
    return parsed.success ? parsed.data : null;
};

const getScopedHistoryQuery = (scope: AnswerTraceScope) => (
    answerlatticeFirestoreAdmin.collection(COLLECTION)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
);

export const loadAnswerlatticeAnswerTraces = async (
    scope: AnswerTraceScope,
    searchHistoryId?: string | null,
): Promise<AnswerlatticeAnswerTraceResponse> => {
    const normalizedId = searchHistoryId
        ? normalizeAnswerlatticeSearchHistoryId(searchHistoryId)
        : null;
    if (searchHistoryId && !normalizedId) throw new Error('answer_trace_id_invalid');

    if (normalizedId) {
        const [snapshot] = await answerlatticeFirestoreAdmin.getAll(
            answerlatticeFirestoreAdmin.collection(COLLECTION).doc(normalizedId),
            { fieldMask: [...TRACE_PROJECTED_FIELDS] },
        );
        const trace = snapshot.exists
            ? projectAnswerlatticeAnswerTrace(snapshot.id, snapshot.data(), scope)
            : null;
        return AnswerlatticeAnswerTraceResponseSchema.parse({
            mode: 'exact',
            scannedCount: snapshot.exists ? 1 : 0,
            windowLimited: false,
            traces: trace ? [trace] : [],
        });
    }

    const snapshot = await getScopedHistoryQuery(scope)
        .orderBy('createdOn', 'desc')
        .limit(ANSWERLATTICE_ANSWER_TRACE_RECENT_SCAN_LIMIT)
        .select(...TRACE_PROJECTED_FIELDS)
        .get();
    const traces = snapshot.docs
        .map(document => projectAnswerlatticeAnswerTrace(document.id, document.data(), scope))
        .filter((trace): trace is AnswerlatticeAnswerTrace => Boolean(trace?.reviewSignals.length))
        .slice(0, ANSWERLATTICE_ANSWER_TRACE_RECENT_RESULT_LIMIT);
    return AnswerlatticeAnswerTraceResponseSchema.parse({
        mode: 'recent',
        scannedCount: snapshot.size,
        windowLimited: snapshot.size === ANSWERLATTICE_ANSWER_TRACE_RECENT_SCAN_LIMIT,
        traces,
    });
};

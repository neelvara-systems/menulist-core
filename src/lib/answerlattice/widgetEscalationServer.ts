import { createHash } from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { isAnswerlatticeSearchHistoryAvailableForInteraction } from '@lib/answerlattice/searchHistoryInteractionServer';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import {
    getAnswerlatticeSupportTicketDisplayId,
    parseAnswerlatticeSupportTicketDocument,
} from '@lib/answerlattice/supportTicketLifecycle';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { ANSWERLATTICE_SIGNAL_TYPE } from '@type/answerlattice';
import {
    SUPPORT_TICKET_CATEGORY,
    SUPPORT_TICKET_PRIORITY,
    SUPPORT_TICKET_STATUS,
} from '@type/supportTicket';
import { Timestamp } from 'firebase-admin/firestore';

const WIDGET_ESCALATION_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AnswerlatticeWidgetEscalationError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(code: string, status: number) {
        super(code);
        this.name = 'AnswerlatticeWidgetEscalationError';
        this.code = code;
        this.status = status;
    }
}

export type AnswerlatticeWidgetEscalationInput = {
    tId: number;
    sId: number;
    searchHistoryId: string;
    email: string;
    name?: string | null;
    details?: string | null;
};

export type AnswerlatticeWidgetEscalationResult = {
    success: true;
    ticketId: string;
    displayId: string;
    created: boolean;
};

const cleanText = (value: unknown, maxLength: number): string | null => {
    const text = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const cleanEmail = (value: unknown): string | null => {
    const email = cleanText(value, 254)?.toLowerCase() || null;
    return email && WIDGET_ESCALATION_EMAIL_PATTERN.test(email) ? email : null;
};

const normalizeConfidence = (value: unknown): 'high' | 'medium' | 'low' | 'none' => (
    value === 'high' || value === 'medium' || value === 'low' || value === 'none'
        ? value
        : 'none'
);

const normalizeStringList = (value: unknown, maxItems: number, maxLength: number): string[] => (
    Array.isArray(value)
        ? Array.from(new Set(value
            .map(item => cleanText(item, maxLength))
            .filter((item): item is string => Boolean(item))))
            .slice(0, maxItems)
        : []
);

export const buildAnswerlatticeWidgetEscalationTicketId = (params: {
    tId: number;
    sId: number;
    searchHistoryId: string;
}): string => `alwe_${createHash('sha256')
    .update(`${params.tId}:${params.sId}:${params.searchHistoryId}`)
    .digest('base64url')
    .slice(0, 32)}`;

const buildWidgetEscalationMessage = (query: string, details: string | null): string => (
    details
        ? `Question: ${query}\n\nAdditional details: ${details}`.slice(0, 2000)
        : query.slice(0, 2000)
);

const isWidgetHistoryInScope = (
    value: Record<string, any>,
    scope: { tId: number; sId: number },
): boolean => (
    value.pId === PRODUCT_IDS.ANSWERLATTICE
    && normalizeAnswerlatticeScopeDocumentId(value.tId) === scope.tId
    && normalizeAnswerlatticeScopeDocumentId(value.sId) === scope.sId
    && value.mountContext === 'widget'
);

export const executeAnswerlatticeWidgetEscalation = async (
    input: AnswerlatticeWidgetEscalationInput,
): Promise<AnswerlatticeWidgetEscalationResult> => {
    const tId = normalizeAnswerlatticeScopeDocumentId(input.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(input.sId);
    const searchHistoryId = normalizeAnswerlatticeSearchHistoryId(input.searchHistoryId);
    const email = cleanEmail(input.email);
    const submittedName = cleanText(input.name, 160);
    const details = cleanText(input.details, 1000);
    if (!tId || !sId || !searchHistoryId || !email) {
        throw new AnswerlatticeWidgetEscalationError('widget_escalation_input_invalid', 400);
    }

    const ticketId = buildAnswerlatticeWidgetEscalationTicketId({ tId, sId, searchHistoryId });
    const historyRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.AI_SEARCH_HISTORY).doc(searchHistoryId);
    const ticketRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.SUPPORT_TICKETS).doc(ticketId);

    const transactionResult = await answerlatticeFirestoreAdmin.runTransaction(async (transaction) => {
        const [historySnapshot, ticketSnapshot] = await Promise.all([
            transaction.get(historyRef),
            transaction.get(ticketRef),
        ]);
        const history = historySnapshot.exists ? historySnapshot.data() || null : null;
        if (!history || !isWidgetHistoryInScope(history, { tId, sId })) {
            throw new AnswerlatticeWidgetEscalationError('widget_search_record_not_found', 404);
        }
        if (!isAnswerlatticeSearchHistoryAvailableForInteraction(history)) {
            throw new AnswerlatticeWidgetEscalationError('widget_search_record_expired', 410);
        }
        if (history.resolutionOutcome === 'resolved' || history.isGood === true) {
            throw new AnswerlatticeWidgetEscalationError('widget_answer_already_marked_solved', 409);
        }
        if (history.escalationTicketId && history.escalationTicketId !== ticketId) {
            throw new AnswerlatticeWidgetEscalationError('widget_escalation_history_conflict', 409);
        }

        const query = cleanText(history.query, 500);
        if (!query) throw new AnswerlatticeWidgetEscalationError('widget_search_record_invalid', 409);
        const matchedEntityIds = normalizeStringList(history.matchedEntityIds, 10, 180);
        const references = Array.isArray(history.references)
            ? history.references.slice(0, 5).flatMap((reference: unknown) => {
                if (!reference || typeof reference !== 'object' || Array.isArray(reference)) return [];
                const ref = reference as Record<string, unknown>;
                const docId = cleanText(ref.id, 180);
                const title = cleanText(ref.title, 300);
                const similarityScore = typeof ref.similarityScore === 'number' && Number.isFinite(ref.similarityScore)
                    ? Math.max(0, Math.min(1, ref.similarityScore))
                    : 0;
                return docId && title ? [{ docId, title, similarityScore }] : [];
            })
            : [];
        const actorName = submittedName || cleanText(history.visitorName, 160) || email;
        const visitorId = cleanText(history.visitorId, 120);
        const actorId = visitorId || `widget_${createHash('sha256').update(email).digest('base64url').slice(0, 24)}`;
        const now = Timestamp.now();
        const message = buildWidgetEscalationMessage(query, details);
        const subject = `Support needed: ${query}`.slice(0, 300);
        const escalationContext = {
            triggerTypes: ['explicit_user_request'] as const,
            query,
            ...(cleanText(history.widgetSessionId, 120) ? { conversationId: cleanText(history.widgetSessionId, 120) as string } : {}),
            retrievalDebug: {
                canonicalResult: {
                    found: history.canonical === true,
                    confidence: normalizeConfidence(history.confidence),
                    ...(cleanText(history.fallbackReason, 180) ? { fallbackReason: cleanText(history.fallbackReason, 180) as string } : {}),
                    matchedEntityIds,
                },
                ...(references.length > 0 ? { ragResults: references } : {}),
                ...(cleanText(history.generatedQueryFromImage, 500) ? { effectiveQuery: cleanText(history.generatedQueryFromImage, 500) as string } : {}),
            },
            escalatedAt: now.toDate().toISOString(),
        };
        const ticket = sanitizeForFirestore({
            id: ticketId,
            displayId: getAnswerlatticeSupportTicketDisplayId(ticketId),
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId,
            sId,
            uId: actorId,
            subject,
            status: SUPPORT_TICKET_STATUS.OPEN,
            priority: SUPPORT_TICKET_PRIORITY.NORMAL,
            category: SUPPORT_TICKET_CATEGORY.GENERAL_QUESTION,
            message,
            documents: [],
            platformNotes: '',
            platformTags: ['Widget escalation'],
            deleted: false,
            statuses: [{
                status: SUPPORT_TICKET_STATUS.OPEN,
                timestamp: now,
                createdBy: { id: actorId, name: actorName, email },
                remark: 'Created after the user explicitly requested support from the embedded widget.',
            }],
            messages: [{
                id: `${ticketId}_message`,
                text: message,
                type: 'user',
                sender: { id: actorId, name: actorName, email },
                timestamp: now,
                attachments: [],
            }],
            clientDetails: {
                storeName: '',
                tenantName: '',
                email,
                phone: '',
            },
            source: 'ai_escalation',
            knowledgeCandidate: true,
            escalationContext,
            widgetEscalation: {
                searchHistoryId,
                replyEmail: email,
                ...(submittedName ? { submittedName } : {}),
                detailsProvided: Boolean(details),
            },
            createdOn: now,
            modifiedOn: now,
            createdBy: actorName,
            modifiedBy: actorName,
            traceId: ticketId,
            requestId: ticketId,
        });

        const created = !ticketSnapshot.exists;
        if (!created) {
            const existing = ticketSnapshot.data() || {};
            if (
                existing.pId !== PRODUCT_IDS.ANSWERLATTICE
                || normalizeAnswerlatticeScopeDocumentId(existing.tId) !== tId
                || normalizeAnswerlatticeScopeDocumentId(existing.sId) !== sId
                || existing.widgetEscalation?.searchHistoryId !== searchHistoryId
            ) {
                throw new AnswerlatticeWidgetEscalationError('widget_escalation_ticket_conflict', 409);
            }
        } else {
            if (!parseAnswerlatticeSupportTicketDocument({
                id: ticketId,
                value: ticket,
                scope: { tId, sId },
            })) {
                throw new AnswerlatticeWidgetEscalationError('widget_escalation_ticket_invalid', 500);
            }
            transaction.create(ticketRef, ticket);
        }

        const historyUpdate: Record<string, any> = {
            escalationTicketId: ticketId,
            escalationStatus: 'ticket_created',
            escalatedAt: now,
            modifiedOn: now,
        };
        if (typeof history.isGood !== 'boolean' && typeof history.submittedAt === 'undefined') {
            historyUpdate.isGood = false;
            historyUpdate.resolutionOutcome = 'not_resolved';
            historyUpdate.reasonsToImprove = [];
            historyUpdate.comments = '';
            historyUpdate.submittedAt = now;
        }
        transaction.set(historyRef, historyUpdate, { merge: true });

        const signalContext = {
            requestId: ticketId,
            ticketId,
            searchHistoryId,
            source: 'widget',
            subject,
            category: SUPPORT_TICKET_CATEGORY.GENERAL_QUESTION,
            priority: SUPPORT_TICKET_PRIORITY.NORMAL,
            query,
            matchedEntityIds,
            fallbackReason: cleanText(history.fallbackReason, 180),
            triggerTypes: ['explicit_user_request'],
            conversationId: cleanText(history.widgetSessionId, 120),
        };

        return { created, signalContext };
    });

    const { created, signalContext } = transactionResult;
    if (signalContext) {
        try {
            const { emitAnswerlatticeSignal } = await import('@lib/answerlattice/signalEmitterServer');
            const matchedEntityId = Array.isArray(signalContext.matchedEntityIds)
                ? signalContext.matchedEntityIds[0]
                : undefined;
            await emitAnswerlatticeSignal({
                type: ANSWERLATTICE_SIGNAL_TYPE.ESCALATION,
                entityId: matchedEntityId,
                tId,
                sId,
                metadata: signalContext,
            });
        } catch (error) {
            logRuntimeFailure('answerlattice_widget_escalation_signal_emit_failed', error, {
                ...getBoundedRuntimeStringContext('tenantId', tId),
                ...getBoundedRuntimeStringContext('storeId', sId),
                ...getBoundedRuntimeStringContext('searchHistoryId', searchHistoryId),
                ...getBoundedRuntimeStringContext('ticketId', ticketId),
            });
        }
    }

    return {
        success: true,
        ticketId,
        displayId: getAnswerlatticeSupportTicketDisplayId(ticketId),
        created,
    };
};

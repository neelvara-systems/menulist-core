import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT,
    normalizeAnswerlatticeChatMessagesForStorage,
    normalizeAnswerlatticeChatSessionId,
} from '@lib/answerlattice/chatSessionContracts';
import { requireAnswerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import type { CoreSearchResult } from '@lib/search/types';
import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';

type WidgetConversationVisitor = {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    verified: boolean;
};

type PersistWidgetConversationParams = {
    mode: 'qna' | 'assistant';
    query: string;
    requestId: string;
    result: CoreSearchResult;
    sId: number;
    sessionId?: string | null;
    tId: number;
    visitor: WidgetConversationVisitor;
};

const cleanText = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, maxLength) : null;
};

export const getAnswerlatticeWidgetConversationDocumentId = (tId: number, sId: number, sessionId: string): string => (
    `widget_${createHash('sha256').update(`${tId}:${sId}:${sessionId}`).digest('hex').slice(0, 40)}`
);

export const persistAnswerlatticeWidgetConversation = async (
    params: PersistWidgetConversationParams,
): Promise<string | null> => {
    const runtimeSessionId = normalizeAnswerlatticeChatSessionId(params.sessionId);
    const requestId = normalizeAnswerlatticeChatSessionId(params.requestId);
    const query = cleanText(params.query, 4_000);
    const craftedAnswer = cleanText(params.result.craftedAnswer, 12_000);
    if (!runtimeSessionId || !requestId || !query || !craftedAnswer) return null;

    const conversationId = getAnswerlatticeWidgetConversationDocumentId(params.tId, params.sId, runtimeSessionId);
    const assistantMessageId = normalizeAnswerlatticeChatSessionId(`${requestId}_answer`);
    if (!assistantMessageId) return null;

    const incomingMessages = normalizeAnswerlatticeChatMessagesForStorage([
        {
            id: requestId,
            role: 'user',
            content: query,
        },
        {
            id: assistantMessageId,
            role: 'assistant',
            craftedAnswer,
            searchHistoryId: params.result.searchHistoryId,
            references: params.result.references,
            citations: params.result.citations,
            answerSource: params.result.answerSource,
            confidence: params.result.confidence,
            fallbackReason: params.result.fallbackReason,
            clarification: params.result.clarification,
            suggestedQuestions: params.result.suggestedQuestions,
            escalation: params.result.escalation,
        },
    ]);
    const visitorId = cleanText(params.visitor.id, 180)
        || `widget_${createHash('sha256').update(runtimeSessionId).digest('hex').slice(0, 24)}`;
    const visitorName = cleanText(params.visitor.name, 200);
    const visitorEmail = cleanText(params.visitor.email, 180);
    const now = Timestamp.now();
    const db = requireAnswerlatticeFirestoreAdmin();
    const conversationRef = db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(conversationId);

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(conversationRef);
        const existing = snapshot.exists ? snapshot.data() || {} : {};
        if (snapshot.exists && (
            existing.pId !== PRODUCT_IDS.ANSWERLATTICE
            || existing.tId !== params.tId
            || existing.sId !== params.sId
            || existing.widgetSessionId !== runtimeSessionId
        )) {
            throw new Error('answerlattice_widget_conversation_scope_conflict');
        }

        const existingMessages = snapshot.exists
            ? normalizeAnswerlatticeChatMessagesForStorage(existing.messages)
            : [];
        if (existingMessages.some(message => message.id === requestId)) return;
        const messages = normalizeAnswerlatticeChatMessagesForStorage([
            ...existingMessages,
            ...incomingMessages,
        ]).slice(-ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT);

        transaction.set(conversationRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tId: params.tId,
            tenantId: params.tId,
            sId: params.sId,
            storeId: params.sId,
            uId: visitorId,
            widgetSessionId: runtimeSessionId,
            visitorVerified: params.visitor.verified,
            title: cleanText(existing.title, 160) || query.slice(0, 160),
            mode: params.mode,
            messages,
            userName: visitorName || cleanText(existing.userName, 200) || 'Anonymous visitor',
            ...(visitorEmail ? { userEmail: visitorEmail } : {}),
            adminStatus: cleanText(existing.adminStatus, 40) || 'new',
            priority: cleanText(existing.priority, 20) || 'normal',
            isUnread: true,
            createdOn: existing.createdOn || now,
            modifiedOn: now,
        }, { merge: snapshot.exists });
    });

    return conversationId;
};

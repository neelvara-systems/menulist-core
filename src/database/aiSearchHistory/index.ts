import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeChatFeedback } from '@lib/answerlattice/chatSessionContracts';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { AiSearchHistory } from '@type/aiSearchHistory';
import { doc, runTransaction, Timestamp } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;

const getDocRef = async (docId: string) => {
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, docId)
}

export type AiSearchHistoryFeedbackUpdateResult = {
    searchHistoryId: string;
    success: true;
    updatedFields: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isAiSearchHistoryFeedbackUpdateResult = (
    value: unknown
): value is AiSearchHistoryFeedbackUpdateResult => (
    isRecord(value)
    && value.success === true
    && typeof value.searchHistoryId === 'string'
    && Array.isArray(value.updatedFields)
);

export function assertAiSearchHistoryFeedbackUpdateSucceeded(
    result: unknown,
    expectedSearchHistoryId?: string,
    rejectionCode = 'ai_search_history_feedback_update_rejected',
): asserts result is AiSearchHistoryFeedbackUpdateResult {
    if (
        !isAiSearchHistoryFeedbackUpdateResult(result)
        || (expectedSearchHistoryId !== undefined && result.searchHistoryId !== expectedSearchHistoryId)
    ) {
        throw new Error(rejectionCode);
    }
}


export const updateAiSearchHistoryWithFeedback = async (data: Partial<AiSearchHistory>) => {
    return await apiCallComposer(
        async () => {
            const searchHistoryId = normalizeAnswerlatticeSearchHistoryId(data.id);
            if (!searchHistoryId) throw new Error('ai_search_history_feedback_missing_id');
            const session = await getActiveSession();
            const scope = resolveAnswerlatticeSessionScope(session);
            const actorId = String(session?.user?.id || session?.uId || '').trim();
            const actorName = String(session?.user?.name || session?.user?.email || '').trim();
            if (!scope || !actorId || actorId.length > 180 || !actorName) {
                throw new Error('ai_search_history_feedback_scope_missing');
            }
            const feedback = normalizeAnswerlatticeChatFeedback(data, Timestamp.now());
            const wrote = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const searchHistoryRef = await getDocRef(searchHistoryId);
                const snapshot = await transaction.get(searchHistoryRef);
                if (!snapshot.exists()) throw new Error('ai_search_history_not_found');
                const current = snapshot.data();
                if (
                    current.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || normalizeAnswerlatticeScopeDocumentId(current.tId) !== scope.tenantId
                    || normalizeAnswerlatticeScopeDocumentId(current.sId) !== scope.storeId
                ) throw new Error('ai_search_history_feedback_scope_invalid');
                if (current.uId !== actorId) throw new Error('ai_search_history_feedback_actor_invalid');
                if (typeof current.isGood === 'boolean') {
                    const existingComparable = {
                        isGood: current.isGood,
                        reasonsToImprove: Array.isArray(current.reasonsToImprove) ? current.reasonsToImprove : [],
                        comments: String(current.comments || ''),
                    };
                    const nextComparable = {
                        isGood: feedback.isGood,
                        reasonsToImprove: feedback.reasonsToImprove || [],
                        comments: feedback.comments || '',
                    };
                    if (JSON.stringify(existingComparable) !== JSON.stringify(nextComparable)) {
                        throw new Error('ai_search_history_feedback_already_submitted');
                    }
                    return false;
                }
                transaction.update(searchHistoryRef, {
                    ...feedback,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: scope.tenantId,
                    sId: scope.storeId,
                    modifiedBy: actorName,
                    modifiedOn: Timestamp.now(),
                });
                return true;
            });
            return {
                searchHistoryId,
                success: true,
                updatedFields: wrote ? ['isGood', 'reasonsToImprove', 'comments', 'submittedAt'] : [],
            } satisfies AiSearchHistoryFeedbackUpdateResult;
        },
        data,
        "updateAiSearchHistoryWithFeedback"
    );
}

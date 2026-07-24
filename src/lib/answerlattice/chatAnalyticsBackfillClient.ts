import { answerlatticeFunctions } from '@lib/firebase/answerlatticeFirebaseClient';
import { httpsCallable } from 'firebase/functions';
import {
    normalizeAnswerlatticeChatAnalyticsScopeId,
    parseAnswerlatticeChatAnalyticsBackfillResponse,
    type AnswerlatticeChatAnalyticsBackfillResponse,
} from './chatAnalyticsBackfillContracts';

export type {
    AnswerlatticeChatAnalyticsBackfillResponse,
    AnswerlatticeChatAnalyticsBackfillResult,
} from './chatAnalyticsBackfillContracts';

export async function backfillAnswerlatticeChatAnalytics(
    tId: number,
    sId: number,
    days: number,
): Promise<AnswerlatticeChatAnalyticsBackfillResponse> {
    if (
        !answerlatticeFunctions
        || normalizeAnswerlatticeChatAnalyticsScopeId(tId) !== tId
        || normalizeAnswerlatticeChatAnalyticsScopeId(sId) !== sId
        || !Number.isSafeInteger(days)
        || days < 1
        || days > 90
    ) {
        throw new Error('chat_analytics_backfill_request_invalid');
    }

    const callable = httpsCallable(answerlatticeFunctions, 'backfillChatAnalytics');
    const response = await callable({ tId, sId, days });
    return parseAnswerlatticeChatAnalyticsBackfillResponse(response.data, { tId, sId, days });
}

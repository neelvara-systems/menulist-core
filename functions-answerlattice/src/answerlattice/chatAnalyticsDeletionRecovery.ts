import { rebuildChatAnalyticsForDeletedSession } from './chatAnalyticsAggregation';
import {
    invalidateAnswerlatticeChatIntelligence,
    syncAnswerlatticeChatIntelligence,
    type AnswerlatticeChatIntelligenceResult,
} from './chatIntelligence';

const INTELLIGENCE_SOURCE_DAYS = 14;

const shiftUtcDateKey = (dateKey: string, days: number): string => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

export const recoverChatAnalyticsAfterDeletedSession = async (
    sessionId: string,
    deletedValue: unknown,
    now = new Date(),
): Promise<{
    aggregate: Awaited<ReturnType<typeof rebuildChatAnalyticsForDeletedSession>>;
    intelligence: AnswerlatticeChatIntelligenceResult | null;
    intelligenceInvalidated: boolean;
}> => {
    if (!Number.isFinite(now.getTime())) {
        throw new Error('answerlattice_chat_delete_recovery_time_invalid');
    }
    const aggregate = await rebuildChatAnalyticsForDeletedSession(sessionId, deletedValue);
    if (!aggregate || aggregate.skippedCurrentDay) {
        return { aggregate, intelligence: null, intelligenceInvalidated: false };
    }

    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const endDateKey = yesterday.toISOString().slice(0, 10);
    const startDateKey = shiftUtcDateKey(endDateKey, -(INTELLIGENCE_SOURCE_DAYS - 1));
    if (aggregate.date < startDateKey || aggregate.date > endDateKey) {
        return { aggregate, intelligence: null, intelligenceInvalidated: false };
    }

    // Run even when the aggregate source hash was already current. A prior
    // delivery may have committed the aggregate and failed before refreshing
    // its derived insight documents.
    const deletedRecord = deletedValue && typeof deletedValue === 'object' && !Array.isArray(deletedValue)
        ? deletedValue as Record<string, unknown>
        : {};
    const tId = deletedRecord.tId as number;
    const sId = deletedRecord.sId as number;
    try {
        const intelligence = await syncAnswerlatticeChatIntelligence(
            tId,
            sId,
            { generateWeekly: true, now },
        );
        return { aggregate, intelligence, intelligenceInvalidated: false };
    } catch (error) {
        if (
            !(error instanceof Error)
            || error.message !== 'answerlattice_chat_intelligence_source_invalid'
        ) throw error;
        await invalidateAnswerlatticeChatIntelligence(tId, sId);
        return { aggregate, intelligence: null, intelligenceInvalidated: true };
    }
};

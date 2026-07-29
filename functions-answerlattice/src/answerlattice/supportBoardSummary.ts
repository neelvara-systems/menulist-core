/**
 * Live Support Board count summary.
 *
 * Board cards are primarily changed by explicit owner/staff actions. Keeping
 * these four exact counts current makes the existing Founder Daily Brief useful
 * without enabling the higher-cost nightly source preparation path.
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';

const PRODUCT_ID = 'AL';
const RESOLVED_STATUS = 'resolved';
const NEEDS_ANSWER_STATUS = 'needs_answer';
const HIGH_PRIORITY = 'high';
const LIVE_SUMMARY_VERSION = 1;
const SUPPORT_BOARD_LIVE_SUMMARY_FAILED = 'ANSWERLATTICE_SUPPORT_BOARD_LIVE_SUMMARY_FAILED';

type SupportBoardRecord = Record<string, any> | null | undefined;

export interface SupportBoardCoreCounts {
    openCards: number;
    needsAnswerCards: number;
    highPriorityCards: number;
    totalRecentCards: number;
}

const getScope = (before: SupportBoardRecord, after: SupportBoardRecord) => {
    const record = after || before;
    const tId = Number(record?.tId);
    const sId = Number(record?.sId);
    if (
        record?.pId !== PRODUCT_ID
        || !Number.isSafeInteger(tId)
        || tId <= 0
        || !Number.isSafeInteger(sId)
        || sId <= 0
    ) return null;

    if (before && after && (
        before.pId !== after.pId
        || Number(before.tId) !== tId
        || Number(before.sId) !== sId
    )) return null;

    return { tId, sId };
};

const hasCountRelevantChange = (before: SupportBoardRecord, after: SupportBoardRecord) => {
    if (!before || !after) return true;
    return before.status !== after.status
        || before.priority !== after.priority;
};

const isNightlyManagedWrite = (before: SupportBoardRecord, after: SupportBoardRecord) => {
    const record = after || before;
    return record?.syncManaged === true
        && record?.modifiedBy === 'system:support_board_nightly';
};

export async function loadAnswerlatticeSupportBoardCoreCounts(
    tId: number,
    sId: number,
): Promise<SupportBoardCoreCounts> {
    const collection = db.collection(DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS);
    const scoped = collection
        .where('pId', '==', PRODUCT_ID)
        .where('tId', '==', tId)
        .where('sId', '==', sId);
    const [
        totalSnapshot,
        resolvedSnapshot,
        needsAnswerSnapshot,
        highPrioritySnapshot,
        resolvedHighPrioritySnapshot,
    ] = await Promise.all([
        scoped.count().get(),
        scoped.where('status', '==', RESOLVED_STATUS).count().get(),
        scoped.where('status', '==', NEEDS_ANSWER_STATUS).count().get(),
        scoped.where('priority', '==', HIGH_PRIORITY).count().get(),
        scoped
            .where('priority', '==', HIGH_PRIORITY)
            .where('status', '==', RESOLVED_STATUS)
            .count()
            .get(),
    ]);
    const totalRecentCards = totalSnapshot.data().count;
    const resolvedCards = resolvedSnapshot.data().count;
    const highPriorityCards = highPrioritySnapshot.data().count;
    const resolvedHighPriorityCards = resolvedHighPrioritySnapshot.data().count;

    return {
        openCards: Math.max(0, totalRecentCards - resolvedCards),
        needsAnswerCards: needsAnswerSnapshot.data().count,
        highPriorityCards: Math.max(0, highPriorityCards - resolvedHighPriorityCards),
        totalRecentCards,
    };
}

export async function refreshAnswerlatticeSupportBoardLiveSummary(params: {
    before: SupportBoardRecord;
    after: SupportBoardRecord;
    eventId: string;
    eventTime?: string;
}): Promise<{ written: boolean; reason: string }> {
    const scope = getScope(params.before, params.after);
    if (!scope) {
        logger.warn('[Answerlattice SupportBoard] Live summary skipped invalid scope', {
            failureCode: 'ANSWERLATTICE_SUPPORT_BOARD_LIVE_SUMMARY_SCOPE_INVALID',
            hasBefore: Boolean(params.before),
            hasAfter: Boolean(params.after),
        });
        return { written: false, reason: 'invalid_scope' };
    }
    if (!hasCountRelevantChange(params.before, params.after)) {
        return { written: false, reason: 'count_fields_unchanged' };
    }
    if (isNightlyManagedWrite(params.before, params.after)) {
        return { written: false, reason: 'nightly_sync_writes_summary' };
    }

    try {
        const counts = await loadAnswerlatticeSupportBoardCoreCounts(scope.tId, scope.sId);
        const parsedEventTime = new Date(params.eventTime || '');
        const eventTimestamp = Number.isNaN(parsedEventTime.getTime())
            ? Timestamp.now()
            : Timestamp.fromDate(parsedEventTime);
        const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`supportBoardSummary_${scope.tId}_${scope.sId}`);

        const written = await db.runTransaction(async (transaction) => {
            const current = await transaction.get(summaryRef);
            const currentEventAt = current.data()?.liveSummaryUpdatedAt;
            if (
                currentEventAt
                && typeof currentEventAt.toMillis === 'function'
                && currentEventAt.toMillis() > eventTimestamp.toMillis()
            ) return false;

            transaction.set(summaryRef, {
                schemaVersion: 1,
                pId: PRODUCT_ID,
                tId: scope.tId,
                sId: scope.sId,
                ...counts,
                liveSummaryVersion: LIVE_SUMMARY_VERSION,
                liveSummaryUpdatedAt: eventTimestamp,
                liveSummaryEventId: params.eventId,
                breakdownFresh: false,
                sourceHash: null,
                lastUpdated: Timestamp.now(),
            }, { merge: true });
            return true;
        });

        return { written, reason: written ? 'updated' : 'older_event' };
    } catch (error) {
        logger.error('[Answerlattice SupportBoard] Live summary refresh failed', {
            failureCode: SUPPORT_BOARD_LIVE_SUMMARY_FAILED,
            hasTenantScope: true,
            hasStoreScope: true,
            sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
        });
        throw error;
    }
}

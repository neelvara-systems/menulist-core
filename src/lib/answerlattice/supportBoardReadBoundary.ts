import {
    ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS,
    ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS,
    ANSWERLATTICE_SUPPORT_BOARD_PRIORITY,
    ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE,
    ANSWERLATTICE_SUPPORT_BOARD_STATUS,
    type AnswerlatticeSupportBoardCard,
    type AnswerlatticeSupportBoardNote,
    type AnswerlatticeSupportBoardSummary,
    type AnswerlatticeSupportBoardStatusEntry,
} from '@type/answerlattice';
import { normalizeAnswerlatticeSupportBoardCardId } from './supportBoardCardIdBoundary';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === 'object' && !Array.isArray(value))
);

const isTimestampLike = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    try {
        if (typeof value.toMillis === 'function') {
            const milliseconds = value.toMillis.call(value);
            return Number.isSafeInteger(milliseconds) && milliseconds > 0;
        }
        if (typeof value.toDate === 'function') {
            const date = value.toDate.call(value);
            return date instanceof Date && !Number.isNaN(date.getTime());
        }
        return false;
    } catch {
        return false;
    }
};

const isBoundedString = (
    value: unknown,
    maxLength: number,
    allowEmpty = false,
): value is string => (
    typeof value === 'string'
    && value.length <= maxLength
    && (allowEmpty || value.length > 0)
);

const isOptionalBoundedString = (
    value: unknown,
    maxLength: number,
): value is string | null | undefined => (
    value === undefined
    || value === null
    || isBoundedString(value, maxLength, true)
);

const isBoundedTextList = (value: unknown): value is string[] => (
    Array.isArray(value)
    && value.length <= ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TAGS_PER_CARD
    && value.every((entry) => isBoundedString(
        entry,
        ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TAG_LENGTH,
    ))
);

const isSupportBoardNote = (value: unknown): value is AnswerlatticeSupportBoardNote => {
    if (!isRecord(value)) return false;
    return isBoundedString(
        value.id,
        ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH,
    )
        && isBoundedString(
            value.text,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTE_LENGTH,
        )
        && Object.values(ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS).includes(
            value.status as AnswerlatticeSupportBoardNote['status'],
        )
        && isBoundedString(
            value.authorId,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_ID_LENGTH,
        )
        && isBoundedString(
            value.authorName,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH,
        )
        && isTimestampLike(value.createdAt);
};

const isSupportBoardStatusEntry = (
    value: unknown,
): value is AnswerlatticeSupportBoardStatusEntry => {
    if (!isRecord(value) || !isRecord(value.createdBy)) return false;
    return Object.values(ANSWERLATTICE_SUPPORT_BOARD_STATUS).includes(
        value.status as AnswerlatticeSupportBoardStatusEntry['status'],
    )
        && isTimestampLike(value.timestamp)
        && isBoundedString(
            value.createdBy.id,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_ID_LENGTH,
        )
        && isBoundedString(
            value.createdBy.name,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH,
        )
        && isBoundedString(
            value.createdBy.email,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_EMAIL_LENGTH,
        )
        && isBoundedString(
            value.remark,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_STATUS_REMARK_LENGTH,
            true,
        );
};

const OPTIONAL_REFERENCE_FIELDS = [
    'relatedTicketId',
    'relatedConversationId',
    'relatedAnswerId',
    'relatedProposalId',
    'relatedReleaseId',
    'relatedSurfaceId',
    'relatedEntityId',
] as const;

const OPTIONAL_SOURCE_FIELDS = [
    ['sourceCustomerName', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CUSTOMER_NAME_LENGTH],
    ['sourceCustomerEmail', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CUSTOMER_EMAIL_LENGTH],
    ['sourceCustomerPhone', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CUSTOMER_PHONE_LENGTH],
    ['sourceCustomerUserId', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_USER_ID_LENGTH],
    ['sourceOrigin', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_LOCATION_LENGTH],
    ['sourcePath', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_LOCATION_LENGTH],
    ['sourceSessionId', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_SESSION_ID_LENGTH],
    ['assigneeId', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_ID_LENGTH],
    ['assigneeName', ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH],
] as const;

export function projectAnswerlatticeSupportBoardCard(
    value: unknown,
    expected: { id: string; sId?: number; tId?: number },
): AnswerlatticeSupportBoardCard | null {
    if (!isRecord(value)) return null;
    const id = normalizeAnswerlatticeSupportBoardCardId(expected.id);
    if (
        !id
        || value.pId !== 'AL'
        || !Number.isSafeInteger(value.tId)
        || Number(value.tId) <= 0
        || !Number.isSafeInteger(value.sId)
        || Number(value.sId) <= 0
        || (expected.tId !== undefined && value.tId !== expected.tId)
        || (expected.sId !== undefined && value.sId !== expected.sId)
        || !isBoundedString(value.title, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH)
        || !isBoundedString(
            value.description,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH,
            true,
        )
        || !Object.values(ANSWERLATTICE_SUPPORT_BOARD_STATUS).includes(
            value.status as AnswerlatticeSupportBoardCard['status'],
        )
        || !Object.values(ANSWERLATTICE_SUPPORT_BOARD_PRIORITY).includes(
            value.priority as AnswerlatticeSupportBoardCard['priority'],
        )
        || !Object.values(ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE).includes(
            value.sourceType as AnswerlatticeSupportBoardCard['sourceType'],
        )
    ) return null;

    const sourceIsManual = value.sourceType === ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MANUAL;
    if (
        (sourceIsManual && value.sourceId !== null)
        || (!sourceIsManual && !isBoundedString(
            value.sourceId,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH,
        ))
        || OPTIONAL_REFERENCE_FIELDS.some((field) => !isOptionalBoundedString(
            value[field],
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH,
        ))
        || OPTIONAL_SOURCE_FIELDS.some(([field, maxLength]) => (
            !isOptionalBoundedString(value[field], maxLength)
        ))
        || !isOptionalBoundedString(
            value.dueDate,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_DUE_DATE_LENGTH,
        )
        || (typeof value.dueDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value.dueDate))
        || (value.tags !== undefined && !isBoundedTextList(value.tags))
        || (value.relatedContextKeys !== undefined && !isBoundedTextList(value.relatedContextKeys))
    ) return null;

    if (
        !Array.isArray(value.notes)
        || value.notes.length > ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTES_PER_CARD
        || !value.notes.every(isSupportBoardNote)
        || !Number.isSafeInteger(value.notesCount)
        || value.notesCount !== value.notes.length
        || !Array.isArray(value.statuses)
        || value.statuses.length === 0
        || value.statuses.length > ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_STATUS_HISTORY_PER_CARD
        || !value.statuses.every(isSupportBoardStatusEntry)
        || value.statuses[0].status !== value.status
        || (value.lastNoteAt !== null && !isTimestampLike(value.lastNoteAt))
    ) return null;

    const isResolved = value.status === ANSWERLATTICE_SUPPORT_BOARD_STATUS.RESOLVED;
    if (
        (isResolved && (
            !isTimestampLike(value.resolvedOn)
            || !isBoundedString(
                value.resolvedBy,
                ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH,
            )
        ))
        || (!isResolved && (value.resolvedOn !== null || value.resolvedBy !== null))
        || (value.sourceIdentityRedactedAt !== null
            && !isTimestampLike(value.sourceIdentityRedactedAt))
        || !isOptionalBoundedString(
            value.sourceIdentityRedactedBy,
            ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH,
        )
        || ((value.sourceIdentityRedactedAt === null)
            !== (value.sourceIdentityRedactedBy === null))
    ) return null;

    return { ...value, id } as AnswerlatticeSupportBoardCard;
}

const isSummaryCount = (value: unknown): value is number => (
    Number.isSafeInteger(value)
    && Number(value) >= 0
    && Number(value) <= 1_000_000
);

const isSummaryCountMap = (value: unknown): value is Record<string, number> => {
    if (!isRecord(value)) return false;
    const entries = Object.entries(value);
    return entries.length <= 50
        && entries.every(([key, count]) => (
            isBoundedString(key, 100)
            && isSummaryCount(count)
        ));
};

export function projectAnswerlatticeSupportBoardSummary(
    value: unknown,
    expected: { id?: string; sId: number; tId: number },
): AnswerlatticeSupportBoardSummary | null {
    if (
        !isRecord(value)
        || value.pId !== 'AL'
        || value.tId !== expected.tId
        || value.sId !== expected.sId
        || value.schemaVersion !== 1
        || !isSummaryCount(value.openCards)
        || !isSummaryCount(value.needsAnswerCards)
        || !isSummaryCount(value.highPriorityCards)
        || !isSummaryCount(value.totalRecentCards)
        || value.openCards > value.totalRecentCards
        || value.needsAnswerCards > value.openCards
        || value.highPriorityCards > value.openCards
        || !isTimestampLike(value.lastUpdated)
        || (value.breakdownFresh !== undefined && typeof value.breakdownFresh !== 'boolean')
        || (value.sourceWindowsSaturated !== undefined && typeof value.sourceWindowsSaturated !== 'boolean')
        || (value.liveSummaryVersion !== undefined && !isSummaryCount(value.liveSummaryVersion))
        || (value.liveSummaryUpdatedAt !== undefined && !isTimestampLike(value.liveSummaryUpdatedAt))
        || (value.statusCounts !== undefined && !isSummaryCountMap(value.statusCounts))
        || (value.priorityCounts !== undefined && !isSummaryCountMap(value.priorityCounts))
        || (value.sourceCounts !== undefined && !isSummaryCountMap(value.sourceCounts))
    ) return null;

    if (value.topSurfaces !== undefined) {
        if (
            !Array.isArray(value.topSurfaces)
            || value.topSurfaces.length > 20
            || !value.topSurfaces.every((entry) => (
                isRecord(entry)
                && isBoundedString(entry.surfaceId, 180)
                && isSummaryCount(entry.count)
            ))
        ) return null;
    }

    if (value.lastSync !== undefined) {
        if (
            !isRecord(value.lastSync)
            || !isSummaryCount(value.lastSync.candidatesAnalyzed)
            || !isSummaryCount(value.lastSync.cardsCreated)
            || !isSummaryCount(value.lastSync.cardsUpdated)
            || !isSummaryCount(value.lastSync.cardsSkippedResolved)
            || !isSummaryCount(value.lastSync.cardsSkippedUnchanged)
            || !isSummaryCount(value.lastSync.windowDays)
            || !isSummaryCount(value.lastSync.maxCardsCreatedOrUpdatedPerRun)
            || (
                value.lastSync.sourceWindowsSaturated !== undefined
                && typeof value.lastSync.sourceWindowsSaturated !== 'boolean'
            )
        ) return null;
    }

    return {
        ...value,
        ...(expected.id ? { id: expected.id } : {}),
    } as unknown as AnswerlatticeSupportBoardSummary;
}

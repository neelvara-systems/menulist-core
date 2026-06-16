/**
 * Answerlattice — Support Board DAL
 *
 * Private owner/staff support workboard. Keeps cards tenant-scoped and bounded.
 * Feature-flagged in UI through ENABLE_ANSWERLATTICE_SUPPORT_BOARD.
 *
 * @see __docs__/answerlattice/support-board/
 */

import { DB_COLLECTIONS } from '@constant/database';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, Timestamp, where, writeBatch } from '@firebase/firestore';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import {
    ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS,
    ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS,
    ANSWERLATTICE_SUPPORT_BOARD_PRIORITY,
    ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE,
    ANSWERLATTICE_SUPPORT_BOARD_STATUS,
    type AnswerlatticeSupportBoardCard,
    type AnswerlatticeSupportBoardNote,
    type AnswerlatticeSupportBoardStatusEntry,
    type AnswerlatticeSupportBoardSummary,
} from '@type/answerlattice';

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS;
const SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, COLLECTION, docId);
const getSummaryDocRef = (tId: number, sId: number) => doc(answerlatticeFirebaseClient, SUMMARY_COLLECTION, `supportBoardSummary_${tId}_${sId}`);
const clampBoardLimit = (value: number) => {
    const normalized = Math.floor(Number(value));
    if (!Number.isFinite(normalized) || normalized <= 0) {
        return ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CARDS_PER_LOAD;
    }
    return Math.min(normalized, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CARDS_PER_LOAD);
};

export type CreateAnswerlatticeSupportBoardCardInput = Pick<
    AnswerlatticeSupportBoardCard,
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'sourceType'
    | 'sourceId'
    | 'sourceCustomerName'
    | 'sourceCustomerEmail'
    | 'sourceCustomerPhone'
    | 'sourceCustomerUserId'
    | 'sourceOrigin'
    | 'sourcePath'
    | 'sourceSessionId'
    | 'assigneeId'
    | 'assigneeName'
    | 'dueDate'
    | 'tags'
    | 'relatedTicketId'
    | 'relatedConversationId'
    | 'relatedAnswerId'
    | 'relatedProposalId'
    | 'relatedReleaseId'
    | 'relatedSurfaceId'
    | 'relatedEntityId'
    | 'relatedContextKeys'
> & {
    tId: number;
    sId: number;
    statusActorId?: string | null;
    statusActorName?: string | null;
    statusActorEmail?: string | null;
    statusRemark?: string | null;
};

export type UpdateAnswerlatticeSupportBoardCardInput = Partial<Pick<
    AnswerlatticeSupportBoardCard,
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'sourceCustomerName'
    | 'sourceCustomerEmail'
    | 'sourceCustomerPhone'
    | 'sourceCustomerUserId'
    | 'sourceOrigin'
    | 'sourcePath'
    | 'sourceSessionId'
    | 'assigneeId'
    | 'assigneeName'
    | 'dueDate'
    | 'tags'
    | 'relatedTicketId'
    | 'relatedConversationId'
    | 'relatedAnswerId'
    | 'relatedProposalId'
    | 'relatedReleaseId'
    | 'relatedSurfaceId'
    | 'relatedEntityId'
    | 'relatedContextKeys'
    | 'resolvedOn'
    | 'resolvedBy'
>> & {
    statusActorId?: string | null;
    statusActorName?: string | null;
    statusActorEmail?: string | null;
    statusRemark?: string | null;
};

const makeLocalId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const cleanText = (value: unknown, maxLength: number) => (
    String(value || '').trim().slice(0, maxLength)
);

const cleanTags = (tags?: string[]) => (
    Array.from(new Set((tags || [])
        .map((tag) => cleanText(tag, 48))
        .filter(Boolean)))
        .slice(0, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TAGS_PER_CARD)
);

const cleanNullableText = (value: unknown, maxLength: number) => {
    const cleaned = cleanText(value, maxLength);
    return cleaned || null;
};

const normalizePriority = (priority?: string): AnswerlatticeSupportBoardCard['priority'] => {
    if (priority === ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH;
    if (priority === ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW;
    return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM;
};

const normalizeStatus = (status?: string): AnswerlatticeSupportBoardCard['status'] => {
    const values = Object.values(ANSWERLATTICE_SUPPORT_BOARD_STATUS);
    return values.includes(status as AnswerlatticeSupportBoardCard['status'])
        ? status as AnswerlatticeSupportBoardCard['status']
        : ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE;
};

const normalizeSourceType = (sourceType?: string): AnswerlatticeSupportBoardCard['sourceType'] => {
    const values = Object.values(ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE);
    return values.includes(sourceType as AnswerlatticeSupportBoardCard['sourceType'])
        ? sourceType as AnswerlatticeSupportBoardCard['sourceType']
        : ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MANUAL;
};

const buildStatusEntry = (
    status: AnswerlatticeSupportBoardCard['status'],
    meta: {
        statusActorId?: string | null;
        statusActorName?: string | null;
        statusActorEmail?: string | null;
        statusRemark?: string | null;
    } = {},
): AnswerlatticeSupportBoardStatusEntry => ({
    status,
    timestamp: Timestamp.now(),
    createdBy: {
        id: cleanText(meta.statusActorId, 100) || 'system',
        name: cleanText(meta.statusActorName, 100) || 'Answerlattice',
        email: cleanText(meta.statusActorEmail, 160) || 'system@answerlattice.internal',
    },
    remark: cleanText(meta.statusRemark, 240) || 'Status set',
});

const stripCreateMeta = (data: CreateAnswerlatticeSupportBoardCardInput) => {
    const {
        statusActorId,
        statusActorName,
        statusActorEmail,
        statusRemark,
        ...cardData
    } = data;
    return {
        cardData,
        statusMeta: {
            statusActorId,
            statusActorName,
            statusActorEmail,
            statusRemark,
        },
    };
};

const stripUpdateMeta = (patch: UpdateAnswerlatticeSupportBoardCardInput) => {
    const {
        statusActorId,
        statusActorName,
        statusActorEmail,
        statusRemark,
        ...cardPatch
    } = patch;
    return {
        cardPatch,
        statusMeta: {
            statusActorId,
            statusActorName,
            statusActorEmail,
            statusRemark,
        },
    };
};

const normalizeCardInput = (data: CreateAnswerlatticeSupportBoardCardInput) => {
    const { cardData, statusMeta } = stripCreateMeta(data);
    const status = normalizeStatus(cardData.status);

    return {
        ...cardData,
        title: cleanText(cardData.title, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH),
        description: cleanText(cardData.description, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
        status,
        priority: normalizePriority(cardData.priority),
        sourceType: normalizeSourceType(cardData.sourceType),
        sourceId: cardData.sourceId || null,
        sourceCustomerName: cleanNullableText(cardData.sourceCustomerName, 160),
        sourceCustomerEmail: cleanNullableText(cardData.sourceCustomerEmail, 180),
        sourceCustomerPhone: cleanNullableText(cardData.sourceCustomerPhone, 80),
        sourceCustomerUserId: cleanNullableText(cardData.sourceCustomerUserId, 120),
        sourceOrigin: cleanNullableText(cardData.sourceOrigin, 180),
        sourcePath: cleanNullableText(cardData.sourcePath, 180),
        sourceSessionId: cleanNullableText(cardData.sourceSessionId, 120),
        dueDate: cardData.dueDate || null,
        assigneeId: cleanNullableText(cardData.assigneeId, 100),
        assigneeName: cleanNullableText(cardData.assigneeName, 100),
        tags: cleanTags(cardData.tags),
        relatedTicketId: cardData.relatedTicketId || null,
        relatedConversationId: cardData.relatedConversationId || null,
        relatedAnswerId: cardData.relatedAnswerId || null,
        relatedProposalId: cardData.relatedProposalId || null,
        relatedReleaseId: cardData.relatedReleaseId || null,
        relatedSurfaceId: cardData.relatedSurfaceId || null,
        relatedEntityId: cardData.relatedEntityId || null,
        relatedContextKeys: cleanTags(cardData.relatedContextKeys),
        notes: [],
        notesCount: 0,
        lastNoteAt: null,
        statuses: [buildStatusEntry(status, {
            ...statusMeta,
            statusRemark: statusMeta.statusRemark || 'Card created',
        })],
        resolvedOn: null,
        resolvedBy: null,
    };
};

const normalizeUpdatePatch = (patch: UpdateAnswerlatticeSupportBoardCardInput) => {
    const { cardPatch, statusMeta } = stripUpdateMeta(patch);
    return {
        updatePatch: {
            ...cardPatch,
            ...(cardPatch.title !== undefined ? { title: cleanText(cardPatch.title, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH) } : {}),
            ...(cardPatch.description !== undefined ? { description: cleanText(cardPatch.description, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) } : {}),
            ...(cardPatch.status ? { status: normalizeStatus(cardPatch.status) } : {}),
            ...(cardPatch.priority ? { priority: normalizePriority(cardPatch.priority) } : {}),
            ...(cardPatch.sourceCustomerName !== undefined ? { sourceCustomerName: cleanNullableText(cardPatch.sourceCustomerName, 160) } : {}),
            ...(cardPatch.sourceCustomerEmail !== undefined ? { sourceCustomerEmail: cleanNullableText(cardPatch.sourceCustomerEmail, 180) } : {}),
            ...(cardPatch.sourceCustomerPhone !== undefined ? { sourceCustomerPhone: cleanNullableText(cardPatch.sourceCustomerPhone, 80) } : {}),
            ...(cardPatch.sourceCustomerUserId !== undefined ? { sourceCustomerUserId: cleanNullableText(cardPatch.sourceCustomerUserId, 120) } : {}),
            ...(cardPatch.sourceOrigin !== undefined ? { sourceOrigin: cleanNullableText(cardPatch.sourceOrigin, 180) } : {}),
            ...(cardPatch.sourcePath !== undefined ? { sourcePath: cleanNullableText(cardPatch.sourcePath, 180) } : {}),
            ...(cardPatch.sourceSessionId !== undefined ? { sourceSessionId: cleanNullableText(cardPatch.sourceSessionId, 120) } : {}),
            ...(cardPatch.assigneeId !== undefined ? { assigneeId: cleanNullableText(cardPatch.assigneeId, 100) } : {}),
            ...(cardPatch.assigneeName !== undefined ? { assigneeName: cleanNullableText(cardPatch.assigneeName, 100) } : {}),
            ...(cardPatch.dueDate !== undefined ? { dueDate: cardPatch.dueDate || null } : {}),
            ...(cardPatch.tags ? { tags: cleanTags(cardPatch.tags) } : {}),
            ...(cardPatch.relatedContextKeys ? { relatedContextKeys: cleanTags(cardPatch.relatedContextKeys) } : {}),
            ...(cardPatch.relatedTicketId !== undefined ? { relatedTicketId: cardPatch.relatedTicketId || null } : {}),
            ...(cardPatch.relatedConversationId !== undefined ? { relatedConversationId: cardPatch.relatedConversationId || null } : {}),
            ...(cardPatch.relatedAnswerId !== undefined ? { relatedAnswerId: cardPatch.relatedAnswerId || null } : {}),
            ...(cardPatch.relatedProposalId !== undefined ? { relatedProposalId: cardPatch.relatedProposalId || null } : {}),
            ...(cardPatch.relatedReleaseId !== undefined ? { relatedReleaseId: cardPatch.relatedReleaseId || null } : {}),
            ...(cardPatch.relatedSurfaceId !== undefined ? { relatedSurfaceId: cardPatch.relatedSurfaceId || null } : {}),
            ...(cardPatch.relatedEntityId !== undefined ? { relatedEntityId: cardPatch.relatedEntityId || null } : {}),
        },
        statusMeta,
    };
};

/**
 * Bounded board query. No realtime listener; callers refresh after writes.
 */
export const listAnswerlatticeSupportBoardCards = async (
    tId: number,
    sId: number,
    maxResults = ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CARDS_PER_LOAD,
) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('modifiedOn', 'desc'),
                limit(clampBoardLimit(maxResults)),
            );
            const snapshot = await getDocs(q);
            const cards: AnswerlatticeSupportBoardCard[] = [];
            snapshot.forEach((item) => {
                cards.push({ ...item.data(), id: item.id } as AnswerlatticeSupportBoardCard);
            });
            return cards;
        },
        { tId, sId, maxResults },
        'listAnswerlatticeSupportBoardCards',
    );
};

/**
 * Compact nightly summary written by the Answerlattice scheduler.
 * One Firestore read; safe for showing owner review workload without scanning logs.
 */
export const getAnswerlatticeSupportBoardSummary = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const snapshot = await getDoc(getSummaryDocRef(tId, sId));
            if (!snapshot.exists()) return null;
            return { ...snapshot.data(), id: snapshot.id } as AnswerlatticeSupportBoardSummary;
        },
        { tId, sId },
        'getAnswerlatticeSupportBoardSummary',
    );
};

export const createAnswerlatticeSupportBoardCard = async (data: CreateAnswerlatticeSupportBoardCardInput) => {
    return await apiCallComposer(
        async () => {
            const normalized = normalizeCardInput(data);
            if (!normalized.title) throw new Error('Support board card title is required');
            const submitData = await answerlatticeRequestBodyComposer(normalized);
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as AnswerlatticeSupportBoardCard;
        },
        data,
        'createAnswerlatticeSupportBoardCard',
    );
};

export const createAnswerlatticeSupportBoardCards = async (cards: CreateAnswerlatticeSupportBoardCardInput[]) => {
    return await apiCallComposer(
        async () => {
            const limitedCards = cards.slice(0, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_SYNC_ITEMS);
            if (limitedCards.length === 0) return [];

            const batch = writeBatch(answerlatticeFirebaseClient);
            const created: AnswerlatticeSupportBoardCard[] = [];

            for (const card of limitedCards) {
                const normalized = normalizeCardInput(card);
                if (!normalized.title) continue;
                const submitData = await answerlatticeRequestBodyComposer(normalized);
                const docRef = doc(getCollectionRef());
                batch.set(docRef, submitData);
                created.push({ ...submitData, id: docRef.id } as AnswerlatticeSupportBoardCard);
            }

            if (created.length === 0) return [];
            await batch.commit();
            return created;
        },
        { count: cards.length },
        'createAnswerlatticeSupportBoardCards',
    );
};

export const updateAnswerlatticeSupportBoardCard = async (
    cardId: string,
    patch: UpdateAnswerlatticeSupportBoardCardInput,
) => {
    return await apiCallComposer(
        async () => {
            const { updatePatch, statusMeta } = normalizeUpdatePatch(patch);

            if (updatePatch.status) {
                const cardRef = getDocRef(cardId);
                return await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                    const snapshot = await transaction.get(cardRef);
                    if (!snapshot.exists()) throw new Error('Support board card not found');

                    const card = snapshot.data() as AnswerlatticeSupportBoardCard;
                    const currentStatuses = Array.isArray(card.statuses) ? card.statuses : [];
                    const statusChanged = card.status !== updatePatch.status;
                    const nextStatuses = statusChanged
                        ? [
                            buildStatusEntry(updatePatch.status as AnswerlatticeSupportBoardCard['status'], {
                                ...statusMeta,
                                statusRemark: statusMeta.statusRemark || 'Status updated',
                            }),
                            ...currentStatuses,
                        ].slice(0, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_STATUS_HISTORY_PER_CARD)
                        : currentStatuses;

                    const updateData = await answerlatticeRequestBodyComposer({
                        ...updatePatch,
                        ...(statusChanged ? { statuses: nextStatuses } : {}),
                    });
                    transaction.set(cardRef, updateData, { merge: true });
                    return updateData;
                });
            }

            const updateData = await answerlatticeRequestBodyComposer(updatePatch);
            await setDoc(getDocRef(cardId), updateData, { merge: true });
            return updateData;
        },
        { cardId, patch },
        'updateAnswerlatticeSupportBoardCard',
    );
};

export const addAnswerlatticeSupportBoardNote = async (
    cardId: string,
    note: {
        text: string;
        authorId: string;
        authorName: string;
        status?: AnswerlatticeSupportBoardNote['status'];
    },
) => {
    return await apiCallComposer(
        async () => {
            const text = cleanText(note.text, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTE_LENGTH);
            if (!text) throw new Error('Note text is required');

            const createdAt = Timestamp.now();
            const nextNote: AnswerlatticeSupportBoardNote = {
                id: makeLocalId('note'),
                text,
                status: note.status || ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS.OPEN,
                authorId: note.authorId || 'unknown',
                authorName: cleanText(note.authorName, 100) || 'Team member',
                createdAt,
            };

            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const cardRef = getDocRef(cardId);
                const snapshot = await transaction.get(cardRef);
                if (!snapshot.exists()) throw new Error('Support board card not found');

                const card = snapshot.data() as AnswerlatticeSupportBoardCard;
                const currentNotes = Array.isArray(card.notes) ? card.notes : [];
                if (currentNotes.length >= ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTES_PER_CARD) {
                    throw new Error(`A support board card can hold up to ${ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTES_PER_CARD} notes`);
                }

                const notes = [nextNote, ...currentNotes].slice(0, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTES_PER_CARD);
                const updateData = await answerlatticeRequestBodyComposer({
                    notes,
                    notesCount: notes.length,
                    lastNoteAt: createdAt,
                });
                transaction.set(cardRef, updateData, { merge: true });
            });

            return nextNote;
        },
        { cardId, note: { ...note, text: '[redacted]' } },
        'addAnswerlatticeSupportBoardNote',
    );
};

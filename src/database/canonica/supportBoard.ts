/**
 * Canonica — Support Board DAL
 *
 * Private owner/staff support workboard. Keeps cards tenant-scoped and bounded.
 * Feature-flagged in UI through ENABLE_CANONICA_SUPPORT_BOARD.
 *
 * @see __docs__/canonica/support-board/
 */

import { DB_COLLECTIONS } from '@constant/database';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, Timestamp, where, writeBatch } from '@firebase/firestore';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { canonicaFirebaseClient } from '@lib/firebase/canonicaFirebaseClient';
import {
    CANONICA_SUPPORT_BOARD_CONSTRAINTS,
    CANONICA_SUPPORT_BOARD_NOTE_STATUS,
    CANONICA_SUPPORT_BOARD_PRIORITY,
    CANONICA_SUPPORT_BOARD_SOURCE_TYPE,
    CANONICA_SUPPORT_BOARD_STATUS,
    type CanonicaSupportBoardCard,
    type CanonicaSupportBoardNote,
    type CanonicaSupportBoardStatusEntry,
    type CanonicaSupportBoardSummary,
} from '@type/canonica';

const COLLECTION = DB_COLLECTIONS.CANONICA_SUPPORT_BOARD_CARDS;
const SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(canonicaFirebaseClient, COLLECTION, docId);
const getSummaryDocRef = (tId: number, sId: number) => doc(canonicaFirebaseClient, SUMMARY_COLLECTION, `supportBoardSummary_${tId}_${sId}`);
const clampBoardLimit = (value: number) => {
    const normalized = Math.floor(Number(value));
    if (!Number.isFinite(normalized) || normalized <= 0) {
        return CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_CARDS_PER_LOAD;
    }
    return Math.min(normalized, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_CARDS_PER_LOAD);
};

export type CreateCanonicaSupportBoardCardInput = Pick<
    CanonicaSupportBoardCard,
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'sourceType'
    | 'sourceId'
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

export type UpdateCanonicaSupportBoardCardInput = Partial<Pick<
    CanonicaSupportBoardCard,
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
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
        .slice(0, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_TAGS_PER_CARD)
);

const cleanNullableText = (value: unknown, maxLength: number) => {
    const cleaned = cleanText(value, maxLength);
    return cleaned || null;
};

const normalizePriority = (priority?: string): CanonicaSupportBoardCard['priority'] => {
    if (priority === CANONICA_SUPPORT_BOARD_PRIORITY.HIGH) return CANONICA_SUPPORT_BOARD_PRIORITY.HIGH;
    if (priority === CANONICA_SUPPORT_BOARD_PRIORITY.LOW) return CANONICA_SUPPORT_BOARD_PRIORITY.LOW;
    return CANONICA_SUPPORT_BOARD_PRIORITY.MEDIUM;
};

const normalizeStatus = (status?: string): CanonicaSupportBoardCard['status'] => {
    const values = Object.values(CANONICA_SUPPORT_BOARD_STATUS);
    return values.includes(status as CanonicaSupportBoardCard['status'])
        ? status as CanonicaSupportBoardCard['status']
        : CANONICA_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE;
};

const normalizeSourceType = (sourceType?: string): CanonicaSupportBoardCard['sourceType'] => {
    const values = Object.values(CANONICA_SUPPORT_BOARD_SOURCE_TYPE);
    return values.includes(sourceType as CanonicaSupportBoardCard['sourceType'])
        ? sourceType as CanonicaSupportBoardCard['sourceType']
        : CANONICA_SUPPORT_BOARD_SOURCE_TYPE.MANUAL;
};

const buildStatusEntry = (
    status: CanonicaSupportBoardCard['status'],
    meta: {
        statusActorId?: string | null;
        statusActorName?: string | null;
        statusActorEmail?: string | null;
        statusRemark?: string | null;
    } = {},
): CanonicaSupportBoardStatusEntry => ({
    status,
    timestamp: Timestamp.now(),
    createdBy: {
        id: cleanText(meta.statusActorId, 100) || 'system',
        name: cleanText(meta.statusActorName, 100) || 'Canonica',
        email: cleanText(meta.statusActorEmail, 160) || 'system@canonica.internal',
    },
    remark: cleanText(meta.statusRemark, 240) || 'Status set',
});

const stripCreateMeta = (data: CreateCanonicaSupportBoardCardInput) => {
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

const stripUpdateMeta = (patch: UpdateCanonicaSupportBoardCardInput) => {
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

const normalizeCardInput = (data: CreateCanonicaSupportBoardCardInput) => {
    const { cardData, statusMeta } = stripCreateMeta(data);
    const status = normalizeStatus(cardData.status);

    return {
        ...cardData,
        title: cleanText(cardData.title, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH),
        description: cleanText(cardData.description, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
        status,
        priority: normalizePriority(cardData.priority),
        sourceType: normalizeSourceType(cardData.sourceType),
        sourceId: cardData.sourceId || null,
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

const normalizeUpdatePatch = (patch: UpdateCanonicaSupportBoardCardInput) => {
    const { cardPatch, statusMeta } = stripUpdateMeta(patch);
    return {
        updatePatch: {
            ...cardPatch,
            ...(cardPatch.title !== undefined ? { title: cleanText(cardPatch.title, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH) } : {}),
            ...(cardPatch.description !== undefined ? { description: cleanText(cardPatch.description, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) } : {}),
            ...(cardPatch.status ? { status: normalizeStatus(cardPatch.status) } : {}),
            ...(cardPatch.priority ? { priority: normalizePriority(cardPatch.priority) } : {}),
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
export const listCanonicaSupportBoardCards = async (
    tId: number,
    sId: number,
    maxResults = CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_CARDS_PER_LOAD,
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
            const cards: CanonicaSupportBoardCard[] = [];
            snapshot.forEach((item) => {
                cards.push({ ...item.data(), id: item.id } as CanonicaSupportBoardCard);
            });
            return cards;
        },
        { tId, sId, maxResults },
        'listCanonicaSupportBoardCards',
    );
};

/**
 * Compact nightly summary written by the Canonica scheduler.
 * One Firestore read; safe for showing owner review workload without scanning logs.
 */
export const getCanonicaSupportBoardSummary = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const snapshot = await getDoc(getSummaryDocRef(tId, sId));
            if (!snapshot.exists()) return null;
            return { ...snapshot.data(), id: snapshot.id } as CanonicaSupportBoardSummary;
        },
        { tId, sId },
        'getCanonicaSupportBoardSummary',
    );
};

export const createCanonicaSupportBoardCard = async (data: CreateCanonicaSupportBoardCardInput) => {
    return await apiCallComposer(
        async () => {
            const normalized = normalizeCardInput(data);
            if (!normalized.title) throw new Error('Support board card title is required');
            const submitData = await canonicaRequestBodyComposer(normalized);
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as CanonicaSupportBoardCard;
        },
        data,
        'createCanonicaSupportBoardCard',
    );
};

export const createCanonicaSupportBoardCards = async (cards: CreateCanonicaSupportBoardCardInput[]) => {
    return await apiCallComposer(
        async () => {
            const limitedCards = cards.slice(0, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_SYNC_ITEMS);
            if (limitedCards.length === 0) return [];

            const batch = writeBatch(canonicaFirebaseClient);
            const created: CanonicaSupportBoardCard[] = [];

            for (const card of limitedCards) {
                const normalized = normalizeCardInput(card);
                if (!normalized.title) continue;
                const submitData = await canonicaRequestBodyComposer(normalized);
                const docRef = doc(getCollectionRef());
                batch.set(docRef, submitData);
                created.push({ ...submitData, id: docRef.id } as CanonicaSupportBoardCard);
            }

            if (created.length === 0) return [];
            await batch.commit();
            return created;
        },
        { count: cards.length },
        'createCanonicaSupportBoardCards',
    );
};

export const updateCanonicaSupportBoardCard = async (
    cardId: string,
    patch: UpdateCanonicaSupportBoardCardInput,
) => {
    return await apiCallComposer(
        async () => {
            const { updatePatch, statusMeta } = normalizeUpdatePatch(patch);

            if (updatePatch.status) {
                const cardRef = getDocRef(cardId);
                return await runTransaction(canonicaFirebaseClient, async (transaction) => {
                    const snapshot = await transaction.get(cardRef);
                    if (!snapshot.exists()) throw new Error('Support board card not found');

                    const card = snapshot.data() as CanonicaSupportBoardCard;
                    const currentStatuses = Array.isArray(card.statuses) ? card.statuses : [];
                    const statusChanged = card.status !== updatePatch.status;
                    const nextStatuses = statusChanged
                        ? [
                            buildStatusEntry(updatePatch.status as CanonicaSupportBoardCard['status'], {
                                ...statusMeta,
                                statusRemark: statusMeta.statusRemark || 'Status updated',
                            }),
                            ...currentStatuses,
                        ].slice(0, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_STATUS_HISTORY_PER_CARD)
                        : currentStatuses;

                    const updateData = await canonicaRequestBodyComposer({
                        ...updatePatch,
                        ...(statusChanged ? { statuses: nextStatuses } : {}),
                    });
                    transaction.set(cardRef, updateData, { merge: true });
                    return updateData;
                });
            }

            const updateData = await canonicaRequestBodyComposer(updatePatch);
            await setDoc(getDocRef(cardId), updateData, { merge: true });
            return updateData;
        },
        { cardId, patch },
        'updateCanonicaSupportBoardCard',
    );
};

export const addCanonicaSupportBoardNote = async (
    cardId: string,
    note: {
        text: string;
        authorId: string;
        authorName: string;
        status?: CanonicaSupportBoardNote['status'];
    },
) => {
    return await apiCallComposer(
        async () => {
            const text = cleanText(note.text, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTE_LENGTH);
            if (!text) throw new Error('Note text is required');

            const createdAt = Timestamp.now();
            const nextNote: CanonicaSupportBoardNote = {
                id: makeLocalId('note'),
                text,
                status: note.status || CANONICA_SUPPORT_BOARD_NOTE_STATUS.OPEN,
                authorId: note.authorId || 'unknown',
                authorName: cleanText(note.authorName, 100) || 'Team member',
                createdAt,
            };

            await runTransaction(canonicaFirebaseClient, async (transaction) => {
                const cardRef = getDocRef(cardId);
                const snapshot = await transaction.get(cardRef);
                if (!snapshot.exists()) throw new Error('Support board card not found');

                const card = snapshot.data() as CanonicaSupportBoardCard;
                const currentNotes = Array.isArray(card.notes) ? card.notes : [];
                if (currentNotes.length >= CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTES_PER_CARD) {
                    throw new Error(`A support board card can hold up to ${CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTES_PER_CARD} notes`);
                }

                const notes = [nextNote, ...currentNotes].slice(0, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_NOTES_PER_CARD);
                const updateData = await canonicaRequestBodyComposer({
                    notes,
                    notesCount: notes.length,
                    lastNoteAt: createdAt,
                });
                transaction.set(cardRef, updateData, { merge: true });
            });

            return nextNote;
        },
        { cardId, note: { ...note, text: '[redacted]' } },
        'addCanonicaSupportBoardNote',
    );
};

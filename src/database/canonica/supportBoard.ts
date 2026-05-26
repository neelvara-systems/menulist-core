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
} from '@type/canonica';

const COLLECTION = DB_COLLECTIONS.CANONICA_SUPPORT_BOARD_CARDS;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(canonicaFirebaseClient, COLLECTION, docId);

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
>>;

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

const normalizeCardInput = (data: CreateCanonicaSupportBoardCardInput) => ({
    ...data,
    title: cleanText(data.title, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH),
    description: cleanText(data.description, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
    status: normalizeStatus(data.status),
    priority: normalizePriority(data.priority),
    sourceType: normalizeSourceType(data.sourceType),
    sourceId: data.sourceId || null,
    dueDate: data.dueDate || null,
    assigneeId: data.assigneeId || null,
    assigneeName: cleanText(data.assigneeName, 100) || null,
    tags: cleanTags(data.tags),
    relatedTicketId: data.relatedTicketId || null,
    relatedConversationId: data.relatedConversationId || null,
    relatedAnswerId: data.relatedAnswerId || null,
    relatedProposalId: data.relatedProposalId || null,
    relatedReleaseId: data.relatedReleaseId || null,
    relatedSurfaceId: data.relatedSurfaceId || null,
    relatedEntityId: data.relatedEntityId || null,
    relatedContextKeys: cleanTags(data.relatedContextKeys),
    notes: [],
    notesCount: 0,
    lastNoteAt: null,
    resolvedOn: null,
    resolvedBy: null,
});

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
                limit(Math.min(maxResults, CANONICA_SUPPORT_BOARD_CONSTRAINTS.MAX_CARDS_PER_LOAD)),
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
            const updateData = await canonicaRequestBodyComposer({
                ...patch,
                ...(patch.status ? { status: normalizeStatus(patch.status) } : {}),
                ...(patch.priority ? { priority: normalizePriority(patch.priority) } : {}),
                ...(patch.tags ? { tags: cleanTags(patch.tags) } : {}),
                ...(patch.relatedContextKeys ? { relatedContextKeys: cleanTags(patch.relatedContextKeys) } : {}),
            });
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

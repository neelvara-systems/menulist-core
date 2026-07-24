/**
 * Answerlattice — Support Board DAL
 *
 * Private owner/staff support workboard. Keeps cards tenant-scoped and bounded.
 * Feature-flagged in UI through ENABLE_ANSWERLATTICE_SUPPORT_BOARD.
 *
 * @see __docs__/answerlattice/support-board/
 */

import { DB_COLLECTIONS } from '@constant/database';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, Timestamp, where } from '@firebase/firestore';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeSupportBoardCardId } from '@lib/answerlattice/supportBoardCardIdBoundary';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { createRuntimeId } from '@lib/runtime/randomId';
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
const getDocRef = (docId: string) => {
    const normalizedDocId = normalizeAnswerlatticeSupportBoardCardId(docId);
    if (!normalizedDocId) throw new Error('Invalid support board card id');
    return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);
};
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
>> & {
    statusActorId?: string | null;
    statusActorName?: string | null;
    statusActorEmail?: string | null;
    statusRemark?: string | null;
};

const makeLocalId = (prefix: string) => {
    return createRuntimeId(prefix);
};

const normalizeScopeId = (value: unknown, label: string) => {
    const normalized = Number(value);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) {
        throw new Error(`Invalid support board ${label}`);
    }
    return normalized;
};

const cleanText = (value: unknown, maxLength: number) => {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    return String(value).trim().slice(0, maxLength);
};

const cleanNullableText = (value: unknown, maxLength: number) => {
    const cleaned = cleanText(value, maxLength);
    return cleaned || null;
};

const cleanDueDate = (value: unknown) => {
    const cleaned = cleanText(value, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_DUE_DATE_LENGTH);
    return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : null;
};

const buildSourceCardDocumentId = async (
    tId: number,
    sId: number,
    sourceType: AnswerlatticeSupportBoardCard['sourceType'],
    sourceId?: string | null,
) => {
    const normalizedSourceId = cleanText(sourceId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH);
    if (sourceType === ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MANUAL || !normalizedSourceId) return null;
    if (!globalThis.crypto?.subtle) throw new Error('Secure source-card identity is unavailable');

    const input = JSON.stringify({ sId, sourceId: normalizedSourceId, sourceType, tId });
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    const hex = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
    return `sb_source_${tId}_${sId}_${hex.slice(0, 24)}`;
};

const cleanTags = (tags?: string[]) => (
    Array.from(new Set((tags || [])
        .map((tag) => cleanText(tag, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TAG_LENGTH))
        .filter(Boolean)))
        .slice(0, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TAGS_PER_CARD)
);

const cleanRelatedEntityId = (value: unknown) => normalizeAnswerlatticeResolvedEntityId(value);

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

const normalizeNoteStatus = (status?: string): AnswerlatticeSupportBoardNote['status'] => {
    const values = Object.values(ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS);
    return values.includes(status as AnswerlatticeSupportBoardNote['status'])
        ? status as AnswerlatticeSupportBoardNote['status']
        : ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS.OPEN;
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
        email: cleanText(meta.statusActorEmail, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_EMAIL_LENGTH) || 'system@answerlattice.internal',
    },
    remark: cleanText(meta.statusRemark, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_STATUS_REMARK_LENGTH) || 'Status set',
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
    const tId = normalizeScopeId(cardData.tId, 'tenant scope');
    const sId = normalizeScopeId(cardData.sId, 'workspace scope');
    const status = normalizeStatus(cardData.status);
    const sourceType = normalizeSourceType(cardData.sourceType);
    const sourceId = sourceType === ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MANUAL
        ? null
        : cleanNullableText(cardData.sourceId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH);
    if (!sourceId && sourceType !== ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MANUAL) {
        throw new Error('Support board source id is required');
    }
    const isResolved = status === ANSWERLATTICE_SUPPORT_BOARD_STATUS.RESOLVED;
    if (isResolved) {
        throw new Error('Create the support card before resolving it');
    }
    return {
        tId,
        sId,
        title: cleanText(cardData.title, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH),
        description: cleanText(cardData.description, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH),
        status,
        priority: normalizePriority(cardData.priority),
        sourceType,
        sourceId,
        sourceCustomerName: cleanNullableText(cardData.sourceCustomerName, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CUSTOMER_NAME_LENGTH),
        sourceCustomerEmail: cleanNullableText(cardData.sourceCustomerEmail, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CUSTOMER_EMAIL_LENGTH),
        sourceCustomerPhone: cleanNullableText(cardData.sourceCustomerPhone, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_CUSTOMER_PHONE_LENGTH),
        sourceCustomerUserId: cleanNullableText(cardData.sourceCustomerUserId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_USER_ID_LENGTH),
        sourceOrigin: cleanNullableText(cardData.sourceOrigin, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_LOCATION_LENGTH),
        sourcePath: cleanNullableText(cardData.sourcePath, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_LOCATION_LENGTH),
        sourceSessionId: cleanNullableText(cardData.sourceSessionId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_SOURCE_SESSION_ID_LENGTH),
        sourceIdentityRedactedAt: null,
        sourceIdentityRedactedBy: null,
        dueDate: cleanDueDate(cardData.dueDate),
        assigneeId: cleanNullableText(cardData.assigneeId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_ID_LENGTH),
        assigneeName: cleanNullableText(cardData.assigneeName, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH),
        tags: cleanTags(cardData.tags),
        relatedTicketId: cleanNullableText(cardData.relatedTicketId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH),
        relatedConversationId: cleanNullableText(cardData.relatedConversationId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH),
        relatedAnswerId: cleanNullableText(cardData.relatedAnswerId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH),
        relatedProposalId: cleanNullableText(cardData.relatedProposalId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH),
        relatedReleaseId: cleanNullableText(cardData.relatedReleaseId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH),
        relatedSurfaceId: cleanNullableText(cardData.relatedSurfaceId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH),
        relatedEntityId: cleanRelatedEntityId(cardData.relatedEntityId),
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
            ...(cardPatch.title !== undefined ? { title: cleanText(cardPatch.title, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_TITLE_LENGTH) } : {}),
            ...(cardPatch.description !== undefined ? { description: cleanText(cardPatch.description, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) } : {}),
            ...(cardPatch.status !== undefined ? { status: normalizeStatus(cardPatch.status) } : {}),
            ...(cardPatch.priority !== undefined ? { priority: normalizePriority(cardPatch.priority) } : {}),
            ...(cardPatch.assigneeId !== undefined ? { assigneeId: cleanNullableText(cardPatch.assigneeId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_ID_LENGTH) } : {}),
            ...(cardPatch.assigneeName !== undefined ? { assigneeName: cleanNullableText(cardPatch.assigneeName, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH) } : {}),
            ...(cardPatch.dueDate !== undefined ? { dueDate: cleanDueDate(cardPatch.dueDate) } : {}),
            ...(cardPatch.tags !== undefined ? { tags: cleanTags(cardPatch.tags) } : {}),
            ...(cardPatch.relatedContextKeys !== undefined ? { relatedContextKeys: cleanTags(cardPatch.relatedContextKeys) } : {}),
            ...(cardPatch.relatedTicketId !== undefined ? { relatedTicketId: cleanNullableText(cardPatch.relatedTicketId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH) } : {}),
            ...(cardPatch.relatedConversationId !== undefined ? { relatedConversationId: cleanNullableText(cardPatch.relatedConversationId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH) } : {}),
            ...(cardPatch.relatedAnswerId !== undefined ? { relatedAnswerId: cleanNullableText(cardPatch.relatedAnswerId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH) } : {}),
            ...(cardPatch.relatedProposalId !== undefined ? { relatedProposalId: cleanNullableText(cardPatch.relatedProposalId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH) } : {}),
            ...(cardPatch.relatedReleaseId !== undefined ? { relatedReleaseId: cleanNullableText(cardPatch.relatedReleaseId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH) } : {}),
            ...(cardPatch.relatedSurfaceId !== undefined ? { relatedSurfaceId: cleanNullableText(cardPatch.relatedSurfaceId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH) } : {}),
            ...(cardPatch.relatedEntityId !== undefined ? { relatedEntityId: cleanRelatedEntityId(cardPatch.relatedEntityId) } : {}),
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
            const normalizedTId = normalizeScopeId(tId, 'tenant scope');
            const normalizedSId = normalizeScopeId(sId, 'workspace scope');
            const q = query(
                getCollectionRef(),
                where('pId', '==', 'AL'),
                where('tId', '==', normalizedTId),
                where('sId', '==', normalizedSId),
                orderBy('modifiedOn', 'desc'),
                limit(clampBoardLimit(maxResults)),
            );
            const snapshot = await getDocs(q);
            const cards: AnswerlatticeSupportBoardCard[] = [];
            snapshot.forEach((item) => {
                const data = item.data();
                if (data.pId !== 'AL' || data.tId !== normalizedTId || data.sId !== normalizedSId) return;
                if (typeof data.title !== 'string' || !Object.values(ANSWERLATTICE_SUPPORT_BOARD_STATUS).includes(data.status)) return;
                cards.push({ ...data, id: item.id } as AnswerlatticeSupportBoardCard);
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
            const normalizedTId = normalizeScopeId(tId, 'tenant scope');
            const normalizedSId = normalizeScopeId(sId, 'workspace scope');
            const snapshot = await getDoc(getSummaryDocRef(normalizedTId, normalizedSId));
            if (!snapshot.exists()) return null;
            const data = snapshot.data();
            if (data.pId !== 'AL' || data.tId !== normalizedTId || data.sId !== normalizedSId) return null;
            const countFields = ['openCards', 'needsAnswerCards', 'highPriorityCards', 'totalRecentCards'] as const;
            if (countFields.some((field) => !Number.isFinite(data[field]) || data[field] < 0)) return null;
            return { ...data, id: snapshot.id } as AnswerlatticeSupportBoardSummary;
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
            const submitData = await answerlatticeRequestBodyComposer(normalized, { isNew: true });
            const deterministicId = await buildSourceCardDocumentId(
                normalized.tId,
                normalized.sId,
                normalized.sourceType,
                normalized.sourceId,
            );
            if (!deterministicId) {
                const docRef = await addDoc(getCollectionRef(), submitData);
                return { ...submitData, id: docRef.id } as AnswerlatticeSupportBoardCard;
            }

            const docRef = getDocRef(deterministicId);
            const stored = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshot = await transaction.get(docRef);
                if (snapshot.exists()) {
                    const existing = snapshot.data() as AnswerlatticeSupportBoardCard;
                    if (
                        existing.tId !== normalized.tId
                        || existing.sId !== normalized.sId
                        || existing.sourceType !== normalized.sourceType
                        || existing.sourceId !== normalized.sourceId
                    ) {
                        throw new Error('Support board source identity conflict');
                    }
                    return { ...existing, id: snapshot.id } as AnswerlatticeSupportBoardCard;
                }
                transaction.set(docRef, submitData);
                return { ...submitData, id: docRef.id } as AnswerlatticeSupportBoardCard;
            });
            return stored;
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

            const prepared: Array<{
                docRef: ReturnType<typeof doc>;
                sourceId: string | null;
                sourceType: AnswerlatticeSupportBoardCard['sourceType'];
                submitData: Record<string, unknown>;
                tId: number;
                sId: number;
            }> = [];
            const seenDocumentIds = new Set<string>();

            for (const card of limitedCards) {
                const normalized = normalizeCardInput(card);
                if (!normalized.title) continue;
                const submitData = await answerlatticeRequestBodyComposer(normalized, { isNew: true });
                const deterministicId = await buildSourceCardDocumentId(
                    normalized.tId,
                    normalized.sId,
                    normalized.sourceType,
                    normalized.sourceId,
                );
                const docRef = deterministicId ? getDocRef(deterministicId) : doc(getCollectionRef());
                if (seenDocumentIds.has(docRef.id)) continue;
                seenDocumentIds.add(docRef.id);
                prepared.push({
                    docRef,
                    sourceId: normalized.sourceId,
                    sourceType: normalized.sourceType,
                    submitData,
                    tId: normalized.tId,
                    sId: normalized.sId,
                });
            }

            if (prepared.length === 0) return [];
            return await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshots = await Promise.all(prepared.map(({ docRef }) => transaction.get(docRef)));
                const created: AnswerlatticeSupportBoardCard[] = [];

                prepared.forEach(({ docRef, sourceId, sourceType, submitData, tId, sId }, index) => {
                    const snapshot = snapshots[index];
                    if (snapshot.exists()) {
                        const existing = snapshot.data() as AnswerlatticeSupportBoardCard;
                        if (
                            existing.tId !== tId
                            || existing.sId !== sId
                            || existing.sourceType !== sourceType
                            || existing.sourceId !== sourceId
                        ) {
                            throw new Error('Support board source identity conflict');
                        }
                        return;
                    }
                    transaction.set(docRef, submitData);
                    created.push({ ...submitData, id: docRef.id } as unknown as AnswerlatticeSupportBoardCard);
                });

                return created;
            });
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
                    if (statusChanged && currentStatuses.length >= ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_STATUS_HISTORY_PER_CARD) {
                        throw new Error(`A support board card can hold up to ${ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_STATUS_HISTORY_PER_CARD} status changes`);
                    }
                    const nextStatuses = statusChanged
                        ? [
                            buildStatusEntry(updatePatch.status as AnswerlatticeSupportBoardCard['status'], {
                                ...statusMeta,
                                statusRemark: statusMeta.statusRemark || 'Status updated',
                            }),
                            ...currentStatuses,
                        ]
                        : currentStatuses;
                    const isResolved = updatePatch.status === ANSWERLATTICE_SUPPORT_BOARD_STATUS.RESOLVED;

                    const updateData = await answerlatticeRequestBodyComposer({
                        ...updatePatch,
                        ...(statusChanged ? { statuses: nextStatuses } : {}),
                        ...(statusChanged ? {
                            resolvedOn: isResolved ? Timestamp.now() : null,
                            resolvedBy: isResolved
                                ? cleanText(statusMeta.statusActorName || statusMeta.statusActorId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH) || 'Team member'
                                : null,
                        } : {}),
                    }, { isNew: false });
                    transaction.set(cardRef, updateData, { merge: true });
                    return updateData;
                });
            }

            const updateData = await answerlatticeRequestBodyComposer(updatePatch, { isNew: false });
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
                status: normalizeNoteStatus(note.status),
                authorId: cleanText(note.authorId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_ID_LENGTH) || 'unknown',
                authorName: cleanText(note.authorName, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH) || 'Team member',
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
                }, { isNew: false });
                transaction.set(cardRef, updateData, { merge: true });
            });

            return nextNote;
        },
        { cardId, note: { ...note, text: '[redacted]' } },
        'addAnswerlatticeSupportBoardNote',
    );
};

export const redactAnswerlatticeSupportBoardSourceIdentity = async (
    cardId: string,
    actor: { id: string; name: string },
) => {
    return await apiCallComposer(
        async () => {
            const cardRef = getDocRef(cardId);
            return await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshot = await transaction.get(cardRef);
                if (!snapshot.exists()) throw new Error('Support board card not found');
                const card = snapshot.data() as AnswerlatticeSupportBoardCard;
                const hasIdentity = Boolean(
                    card.sourceCustomerName
                    || card.sourceCustomerEmail
                    || card.sourceCustomerPhone
                    || card.sourceCustomerUserId
                    || card.sourceOrigin
                    || card.sourcePath
                    || card.sourceSessionId,
                );
                if (!hasIdentity) return false;

                const updateData = await answerlatticeRequestBodyComposer({
                    sourceCustomerName: null,
                    sourceCustomerEmail: null,
                    sourceCustomerPhone: null,
                    sourceCustomerUserId: null,
                    sourceOrigin: null,
                    sourcePath: null,
                    sourceSessionId: null,
                    sourceIdentityRedactedAt: Timestamp.now(),
                    sourceIdentityRedactedBy: cleanText(actor.name || actor.id, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_ACTOR_NAME_LENGTH) || 'Team member',
                }, { isNew: false });
                transaction.set(cardRef, updateData, { merge: true });
                return true;
            });
        },
        { cardId, actorIdPresent: Boolean(actor.id) },
        'redactAnswerlatticeSupportBoardSourceIdentity',
    );
};

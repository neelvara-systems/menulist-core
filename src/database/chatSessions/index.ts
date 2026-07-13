import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import uploadBase64ToStorage from '@database/storage/uploadBase64ToStorage';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    ANSWERLATTICE_CHAT_SESSION_BATCH_UPDATE_LIMIT,
    ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT,
    normalizeAnswerlatticeChatFeedback,
    normalizeAnswerlatticeChatMessageForStorage,
    normalizeAnswerlatticeChatMessagesForStorage,
    normalizeAnswerlatticeChatSessionId,
    normalizeAnswerlatticeInternalNote,
    parseAnswerlatticeChatMetadataMutation,
    parseAnswerlatticeChatSessionDocument,
} from '@lib/answerlattice/chatSessionContracts';
import {
    ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH,
    ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES,
    isAllowedAnswerlatticeChatImageMimeType,
    normalizeAnswerlatticeChatImageMimeType,
    stripDataUrlPrefix,
} from '@lib/answerlattice/chatImagePolicy';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { apiCallComposerClientWithoutLoader } from '@lib/apiHelper/apiCallComposerClientWithoutLoader';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient, answerlatticeStorage } from '@lib/firebase/answerlatticeFirebaseClient';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { createRandomIdSegment } from '@lib/runtime/randomId';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import { ChatSession } from '@type/chatSession';
import { UserUploadedFileType } from '@type/common';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, startAfter, Timestamp, where, writeBatch } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.CHAT_SESSIONS;
const SEARCH_HISTORY_COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;
const USER_CHAT_SESSION_LIMIT = 50;
const ADMIN_CHAT_SESSION_PAGE_SIZE_LIMIT = 100;
const ADMIN_CHAT_SESSION_SCAN_LIMIT = 500;
const CHAT_VOLUME_SESSION_LIMIT = 1000;
const MAX_CHAT_VOLUME_DAYS = 90;

export type ChatSessionUpdateResult = {
    sessionId: string;
    success: true;
    updatedFields: string[];
};

export type ChatMessageFeedbackUpdateResult = {
    sessionId: string;
    messageId: string;
    searchHistoryId: string;
    success: true;
};

export type ChatSessionBatchMetadataUpdateResult = {
    sessionIds: string[];
    success: true;
    updatedCount: number;
    updatedFields: string[];
};

export type ChatSessionInternalNoteUpdateResult = {
    sessionId: string;
    success: true;
    note: Record<string, unknown>;
};

export type ChatSessionDeleteResult = {
    sessionId: string;
    success: true;
    deleted: true;
    storageFilesDeleted: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isChatSessionRecord = (value: unknown): value is ChatSession => (
    isRecord(value)
    && typeof value.id === 'string'
    && Array.isArray(value.messages)
);

const isChatSessionUpdateResult = (value: unknown): value is ChatSessionUpdateResult => (
    isRecord(value)
    && value.success === true
    && typeof value.sessionId === 'string'
    && Array.isArray(value.updatedFields)
);

const isChatMessageFeedbackUpdateResult = (value: unknown): value is ChatMessageFeedbackUpdateResult => (
    isRecord(value)
    && value.success === true
    && typeof value.sessionId === 'string'
    && typeof value.messageId === 'string'
    && typeof value.searchHistoryId === 'string'
);

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
);

const isChatSessionBatchMetadataUpdateResult = (
    value: unknown
): value is ChatSessionBatchMetadataUpdateResult => (
    isRecord(value)
    && value.success === true
    && isStringArray(value.sessionIds)
    && typeof value.updatedCount === 'number'
    && isStringArray(value.updatedFields)
);

const isChatSessionInternalNoteUpdateResult = (
    value: unknown
): value is ChatSessionInternalNoteUpdateResult => (
    isRecord(value)
    && value.success === true
    && typeof value.sessionId === 'string'
    && isRecord(value.note)
);

const isChatSessionDeleteResult = (value: unknown): value is ChatSessionDeleteResult => (
    isRecord(value)
    && value.success === true
    && value.deleted === true
    && typeof value.sessionId === 'string'
    && typeof value.storageFilesDeleted === 'number'
);

export function assertChatSessionSaveSucceeded(
    result: unknown,
    rejectionCode = 'chat_session_save_rejected',
): asserts result is ChatSession {
    if (!isChatSessionRecord(result)) {
        throw new Error(rejectionCode);
    }
}

export function assertChatSessionUpdateSucceeded(
    result: unknown,
    expectedSessionId?: string,
    rejectionCode = 'chat_session_update_rejected',
): asserts result is ChatSessionUpdateResult {
    if (
        !isChatSessionUpdateResult(result)
        || (expectedSessionId !== undefined && result.sessionId !== expectedSessionId)
    ) {
        throw new Error(rejectionCode);
    }
}

export function assertChatMessageFeedbackUpdateSucceeded(
    result: unknown,
    expectedSessionId?: string,
    expectedMessageId?: string,
    rejectionCode = 'chat_message_feedback_update_rejected',
): asserts result is ChatMessageFeedbackUpdateResult {
    if (
        !isChatMessageFeedbackUpdateResult(result)
        || (expectedSessionId !== undefined && result.sessionId !== expectedSessionId)
        || (expectedMessageId !== undefined && result.messageId !== expectedMessageId)
    ) {
        throw new Error(rejectionCode);
    }
}

export function assertChatSessionBatchMetadataUpdateSucceeded(
    result: unknown,
    expectedSessionIds?: string[],
    rejectionCode = 'chat_session_batch_metadata_update_rejected',
): asserts result is ChatSessionBatchMetadataUpdateResult {
    if (
        !isChatSessionBatchMetadataUpdateResult(result)
        || (
            expectedSessionIds !== undefined
            && (
                result.updatedCount !== expectedSessionIds.length
                || expectedSessionIds.some((sessionId) => !result.sessionIds.includes(sessionId))
            )
        )
    ) {
        throw new Error(rejectionCode);
    }
}

export function assertChatSessionInternalNoteUpdateSucceeded(
    result: unknown,
    expectedSessionId?: string,
    rejectionCode = 'chat_session_internal_note_update_rejected',
): asserts result is ChatSessionInternalNoteUpdateResult {
    if (
        !isChatSessionInternalNoteUpdateResult(result)
        || (expectedSessionId !== undefined && result.sessionId !== expectedSessionId)
    ) {
        throw new Error(rejectionCode);
    }
}

export function assertChatSessionDeleteSucceeded(
    result: unknown,
    expectedSessionId?: string,
    rejectionCode = 'chat_session_delete_rejected',
): asserts result is ChatSessionDeleteResult {
    if (
        !isChatSessionDeleteResult(result)
        || (expectedSessionId !== undefined && result.sessionId !== expectedSessionId)
    ) {
        throw new Error(rejectionCode);
    }
}

const collectChatImageUrls = (session?: ChatSession | null): string[] => {
    const urls = new Set<string>();
    (session?.messages || []).forEach((message) => {
        const url = message.image?.url || message.image?.source;
        if (typeof url === 'string' && url && !url.includes('base64')) {
            urls.add(url);
        }
    });
    return Array.from(urls);
};

const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, `${COLLECTION}`, docId);

const getCollectionRef = () => collection(answerlatticeFirebaseClient, `${COLLECTION}`);

const normalizePositiveInteger = (value: unknown, fallback: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.min(Math.floor(parsed), max);
};

type AnswerlatticeChatSessionScope = {
    tId: number;
    sId: number;
};

const getChatSessionScope = (session: any): AnswerlatticeChatSessionScope | undefined => {
    const scope = resolveAnswerlatticeSessionScope(session);
    return scope ? { tId: scope.tenantId, sId: scope.storeId } : undefined;
};

const getRequiredChatMutationContext = async () => {
    const session = await getActiveSession();
    const scope = getChatSessionScope(session);
    if (!scope) throw new Error('answerlattice_chat_scope_missing');
    const userId = String(session?.user?.id || session?.uId || '').trim();
    const userName = String(session?.user?.name || session?.user?.email || '').trim();
    if (!userId || userId.length > 180 || !userName || userName.length > 200) {
        throw new Error('answerlattice_chat_actor_invalid');
    }
    return { scope, session, userId, userName };
};

const getRequiredChatReadContext = async () => {
    const session = await getActiveSession();
    const scope = getChatSessionScope(session);
    const userId = String(session?.user?.id || session?.uId || '').trim();
    if (!scope || !userId || userId.length > 180) {
        throw new Error('answerlattice_chat_read_scope_missing');
    }
    return { scope, session, userId };
};

const requirePersistedChatSession = (
    id: string,
    value: unknown,
    scope: AnswerlatticeChatSessionScope,
): ChatSession => {
    const session = parseAnswerlatticeChatSessionDocument({ id, value, scope });
    if (!session) throw new Error('answerlattice_chat_scope_or_schema_invalid');
    return session;
};

/**
 * Upload chat image to Firebase Storage with tenant/store isolation
 * Converts base64 images to storage URLs using tenant-scoped paths
 * 
 * @param image - UserUploadedFileType with base64 data
 * @param session - User session containing tId, sId, and user info
 * @returns UserUploadedFileType with storage URL
 * 
 * @example
 * ```typescript
 * const uploadedImage = await uploadChatImage(image, loggedInSession);
 * // File stored at: chatSessions/chatimages/{tId}/{sId}/{imageId}
 * ```
 */
export const uploadChatImage = async (
    image: UserUploadedFileType,
    _session: any
): Promise<UserUploadedFileType> => {
    return await apiCallComposer(
        async () => {
            // Check if image contains base64 data
            if (image.url?.includes('base64') || image.source?.includes('base64')) {
                const context = await getRequiredChatReadContext();
                const scopedSession = {
                    ...context.session,
                    tId: context.scope.tId,
                    sId: context.scope.sId,
                };

                const imageType = normalizeAnswerlatticeChatImageMimeType(image.type);
                if (!isAllowedAnswerlatticeChatImageMimeType(imageType)) {
                    throw new Error('Unsupported chat image type');
                }

                const randomId = createRandomIdSegment(16);
                const imageId = `${Date.now()}-${randomId}`;
                const base64String = image.url || image.source;
                if (!base64String || base64String.length > ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH) {
                    throw new Error('Chat image size exceeds the supported limit');
                }
                const dataUrlMatch = /^data:([^;,]+);base64,/i.exec(base64String);
                const declaredMimeType = normalizeAnswerlatticeChatImageMimeType(dataUrlMatch?.[1]);
                if (!dataUrlMatch || declaredMimeType !== imageType) {
                    throw new Error('Chat image data does not match its declared type');
                }
                const rawBase64 = stripDataUrlPrefix(base64String);
                if (!rawBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(rawBase64)) {
                    throw new Error('Chat image data is malformed');
                }
                const paddingBytes = rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0;
                const decodedBytes = Math.floor((rawBase64.length * 3) / 4) - paddingBytes;
                if (decodedBytes <= 0 || decodedBytes > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
                    throw new Error('Chat image size exceeds the supported limit');
                }

                // Generate tenant/store-scoped path for multi-tenancy isolation
                const path = generateStoragePath({
                    collection: COLLECTION,
                    fileType: 'chatimages',
                    session: scopedSession,
                    fileId: imageId,
                });

                // Upload to Firebase Storage
                const uploadedUrl = await uploadBase64ToStorage({
                    cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
                    customMetadata: {
                        product: 'answerlattice',
                        sourceUse: 'help_center_chat_image',
                        retentionPolicy: 'tied_to_chat_session',
                        sourceMetadataPolicy: 'source_file_may_include_image_metadata',
                    },
                    fileId: imageId,
                    storage: answerlatticeStorage,
                    url: base64String!,
                    path,
                    type: imageType as any
                }) as string;

                // Return image with storage URL
                return {
                    ...image,
                    url: uploadedUrl,
                    source: uploadedUrl, // Update source as well for preview
                    type: imageType,
                    size: decodedBytes,
                };
            }

            // Return original if not base64
            return image;
        },
        image,
        'uploadChatImage'
    );
};

/**
 * Save a new chat session to Firestore
 */
export const saveChatSession = async (data: Omit<ChatSession, 'id'>) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const context = await getRequiredChatMutationContext();
            const title = String(data.title || '').trim();
            if (!title || title.length > 160 || (data.mode !== 'qna' && data.mode !== 'assistant')) {
                throw new Error('answerlattice_chat_session_create_invalid');
            }
            const messages = normalizeAnswerlatticeChatMessagesForStorage(data.messages);
            if (messages.length === 0) throw new Error('answerlattice_chat_session_empty');
            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: context.scope.tId,
                sId: context.scope.sId,
                uId: context.userId,
                title,
                messages,
            }, { isNew: true });
            const sessionId = normalizeAnswerlatticeChatSessionId(messages[0]?.id);
            if (!sessionId) throw new Error('answerlattice_chat_session_request_id_invalid');
            let created: ChatSession | null = null;
            try {
                await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                    const sessionRef = getDocRef(sessionId);
                    const existing = await transaction.get(sessionRef);
                    if (existing.exists()) {
                        const persisted = requirePersistedChatSession(sessionId, existing.data(), context.scope);
                        if (
                            persisted.uId !== context.userId
                            || persisted.messages[0]?.id !== messages[0]?.id
                        ) throw new Error('answerlattice_chat_session_request_id_conflict');
                        created = persisted;
                        return;
                    }
                    transaction.set(sessionRef, submitData);
                    created = parseAnswerlatticeChatSessionDocument({
                        id: sessionId,
                        value: submitData,
                        scope: context.scope,
                    });
                });
            } catch (createError) {
                await Promise.allSettled(
                    collectChatImageUrls({ ...data, messages } as ChatSession)
                        .map((url) => deleteFileByUrl(url, answerlatticeStorage)),
                );
                throw createError;
            }
            if (!created) throw new Error('answerlattice_chat_session_create_response_invalid');
            return created;
        },
        data,
        'saveChatSession'
    );
};

/**
 * Batch update admin metadata (status/priority/tags) on multiple conversations.
 * Uses writeBatch for single-round-trip efficiency.
 */
export const batchUpdateSessionMetadata = async (
    sessionIds: string[],
    metadata: { adminStatus?: string; priority?: string; adminTags?: string[] }
) => {
    return await apiCallComposer(
        async () => {
            if (!sessionIds || sessionIds.length === 0) {
                return {
                    sessionIds: [],
                    success: true,
                    updatedCount: 0,
                    updatedFields: [],
                } satisfies ChatSessionBatchMetadataUpdateResult;
            }
            const context = await getRequiredChatMutationContext();
            const normalizedSessionIds = Array.from(new Set(sessionIds.map(normalizeAnswerlatticeChatSessionId)));
            if (
                normalizedSessionIds.some((id) => !id)
                || normalizedSessionIds.length !== sessionIds.length
                || normalizedSessionIds.length > ANSWERLATTICE_CHAT_SESSION_BATCH_UPDATE_LIMIT
            ) throw new Error('answerlattice_chat_batch_session_ids_invalid');
            const parsedMetadata = parseAnswerlatticeChatMetadataMutation(metadata);
            if (parsedMetadata.title !== undefined || parsedMetadata.mode !== undefined) {
                throw new Error('answerlattice_chat_batch_metadata_invalid');
            }
            const refs = normalizedSessionIds.map((id) => getDocRef(id!));
            const snapshots = await Promise.all(refs.map((ref) => getDoc(ref)));
            snapshots.forEach((snapshot, index) => {
                if (!snapshot.exists()) throw new Error('answerlattice_chat_session_not_found');
                requirePersistedChatSession(normalizedSessionIds[index]!, snapshot.data(), context.scope);
            });
            const batch = writeBatch(answerlatticeFirebaseClient);
            const updateData = {
                ...parsedMetadata,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: context.scope.tId,
                sId: context.scope.sId,
                modifiedBy: context.userName,
                modifiedOn: Timestamp.now(),
            };
            refs.forEach((ref) => batch.update(ref, updateData));
            await batch.commit();
            return {
                sessionIds: normalizedSessionIds as string[],
                success: true,
                updatedCount: normalizedSessionIds.length,
                updatedFields: Object.keys(parsedMetadata),
            } satisfies ChatSessionBatchMetadataUpdateResult;
        },
        { sessionIds, metadata },
        'batchUpdateSessionMetadata'
    );
};

/**
 * Update an existing chat session
 */
export const updateChatSession = async (sessionId: string, updates: Partial<ChatSession>) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const normalizedSessionId = normalizeAnswerlatticeChatSessionId(sessionId);
            if (!normalizedSessionId) throw new Error('answerlattice_chat_session_id_invalid');
            if (Object.prototype.hasOwnProperty.call(updates, 'messages')) {
                throw new Error('answerlattice_chat_messages_require_explicit_operation');
            }
            const context = await getRequiredChatMutationContext();
            const metadata = parseAnswerlatticeChatMetadataMutation(updates);
            const updatedFields = Object.keys(metadata);
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const sessionRef = getDocRef(normalizedSessionId);
                const sessionSnapshot = await transaction.get(sessionRef);
                if (!sessionSnapshot.exists()) throw new Error('answerlattice_chat_session_not_found');
                const current = requirePersistedChatSession(normalizedSessionId, sessionSnapshot.data(), context.scope);
                if (metadata.mode === 'qna' && current.mode === 'assistant' && current.messages.length > 0) {
                    throw new Error('answerlattice_chat_mode_transition_invalid');
                }
                const changed = updatedFields.some((field) => (
                    JSON.stringify((current as any)[field]) !== JSON.stringify((metadata as any)[field])
                ));
                if (!changed) return;
                transaction.update(sessionRef, {
                    ...metadata,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: context.scope.tId,
                    sId: context.scope.sId,
                    modifiedBy: context.userName,
                    modifiedOn: Timestamp.now(),
                });
            });
            return {
                sessionId: normalizedSessionId,
                success: true,
                updatedFields,
            } satisfies ChatSessionUpdateResult;
        },
        updates,
        'updateChatSession'
    );
};

export const appendChatSessionMessages = async (
    sessionId: string,
    messages: ChatSession['messages'],
    options?: { mode?: ChatSession['mode'] },
) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const normalizedSessionId = normalizeAnswerlatticeChatSessionId(sessionId);
            if (!normalizedSessionId) throw new Error('answerlattice_chat_session_id_invalid');
            if (!Array.isArray(messages) || messages.length < 1 || messages.length > 4) {
                throw new Error('answerlattice_chat_message_append_invalid');
            }
            const incomingMessages = messages.map(normalizeAnswerlatticeChatMessageForStorage);
            const context = await getRequiredChatMutationContext();
            let wrote = false;
            let removedImageUrls: string[] = [];
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const sessionRef = getDocRef(normalizedSessionId);
                const sessionSnapshot = await transaction.get(sessionRef);
                if (!sessionSnapshot.exists()) throw new Error('answerlattice_chat_session_not_found');
                const current = requirePersistedChatSession(normalizedSessionId, sessionSnapshot.data(), context.scope);
                const messagesById = new Map(current.messages.map((message) => [message.id, message]));
                const additions = incomingMessages.filter((message) => {
                    const existing = messagesById.get(message.id);
                    if (!existing) return true;
                    if (JSON.stringify(existing) !== JSON.stringify(message)) {
                        throw new Error('answerlattice_chat_message_id_conflict');
                    }
                    return false;
                });
                const nextMode = options?.mode || current.mode;
                if (nextMode !== 'qna' && nextMode !== 'assistant') {
                    throw new Error('answerlattice_chat_mode_invalid');
                }
                if (current.mode === 'assistant' && nextMode === 'qna') {
                    throw new Error('answerlattice_chat_mode_transition_invalid');
                }
                if (additions.length === 0 && nextMode === current.mode) return;
                const candidateMessages = [
                    ...current.messages,
                    ...additions,
                ];
                const nextMessages = normalizeAnswerlatticeChatMessagesForStorage(candidateMessages);
                const retainedIds = new Set(nextMessages.map((message) => message.id));
                removedImageUrls = collectChatImageUrls({
                    messages: candidateMessages.filter((message) => !retainedIds.has(message.id)),
                } as ChatSession);
                transaction.update(sessionRef, {
                    messages: nextMessages,
                    mode: nextMode,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: context.scope.tId,
                    sId: context.scope.sId,
                    modifiedBy: context.userName,
                    modifiedOn: Timestamp.now(),
                });
                wrote = true;
            });
            if (wrote && removedImageUrls.length > 0) {
                await Promise.allSettled(
                    removedImageUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)),
                );
            }
            return {
                sessionId: normalizedSessionId,
                success: true,
                updatedFields: wrote ? ['messages', ...(options?.mode ? ['mode'] : [])] : [],
            } satisfies ChatSessionUpdateResult;
        },
        { sessionId, messageCount: messages.length, mode: options?.mode },
        'appendChatSessionMessages',
    );
};

export const replaceChatSessionMessageBranch = async (
    sessionId: string,
    replacedMessageId: string,
    replacementMessage: ChatSession['messages'][number],
) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const normalizedSessionId = normalizeAnswerlatticeChatSessionId(sessionId);
            const normalizedReplacedMessageId = normalizeAnswerlatticeChatSessionId(replacedMessageId);
            if (!normalizedSessionId || !normalizedReplacedMessageId) {
                throw new Error('answerlattice_chat_session_or_message_id_invalid');
            }
            const replacement = normalizeAnswerlatticeChatMessageForStorage(replacementMessage);
            const context = await getRequiredChatMutationContext();
            let removedImageUrls: string[] = [];
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const sessionRef = getDocRef(normalizedSessionId);
                const sessionSnapshot = await transaction.get(sessionRef);
                if (!sessionSnapshot.exists()) throw new Error('answerlattice_chat_session_not_found');
                const current = requirePersistedChatSession(normalizedSessionId, sessionSnapshot.data(), context.scope);
                const replacedIndex = current.messages.findIndex((message) => message.id === normalizedReplacedMessageId);
                if (replacedIndex < 0) throw new Error('answerlattice_chat_replaced_message_not_found');
                removedImageUrls = collectChatImageUrls({
                    messages: current.messages.slice(replacedIndex),
                } as ChatSession).filter((url) => (
                    url !== replacement.image?.url && url !== replacement.image?.source
                ));
                const nextMessages = normalizeAnswerlatticeChatMessagesForStorage([
                    ...current.messages.slice(0, replacedIndex),
                    replacement,
                ]);
                transaction.update(sessionRef, {
                    messages: nextMessages,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: context.scope.tId,
                    sId: context.scope.sId,
                    modifiedBy: context.userName,
                    modifiedOn: Timestamp.now(),
                });
            });
            if (removedImageUrls.length > 0) {
                await Promise.allSettled(
                    removedImageUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)),
                );
            }
            return {
                sessionId: normalizedSessionId,
                success: true,
                updatedFields: ['messages'],
            } satisfies ChatSessionUpdateResult;
        },
        { sessionId, replacedMessageId, replacementMessageId: replacementMessage.id },
        'replaceChatSessionMessageBranch',
    );
};

/**
 * Delete a chat session from Firestore
 * Uses global loader to give clear visual feedback for this destructive action
 */
export const deleteChatSession = async (sessionId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedSessionId = normalizeAnswerlatticeChatSessionId(sessionId);
            if (!normalizedSessionId) throw new Error('answerlattice_chat_session_id_invalid');
            const context = await getRequiredChatMutationContext();
            let imageUrls: string[] = [];
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const sessionRef = getDocRef(normalizedSessionId);
                const sessionDoc = await transaction.get(sessionRef);
                if (!sessionDoc.exists()) throw new Error('answerlattice_chat_session_not_found');
                const current = requirePersistedChatSession(normalizedSessionId, sessionDoc.data(), context.scope);
                imageUrls = collectChatImageUrls(current);
                transaction.delete(sessionRef);
            });
            const cleanupResults = await Promise.allSettled(
                imageUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)),
            );
            return {
                sessionId: normalizedSessionId,
                success: true,
                deleted: true,
                storageFilesDeleted: cleanupResults.filter((result) => result.status === 'fulfilled').length,
            } satisfies ChatSessionDeleteResult;
        },
        { sessionId },
        'deleteChatSession'
    );
};

/**
 * Get all chat sessions for the current user's tenant
 * Sessions are ordered by modifiedOn in descending order (most recent first)
 */
export const getUserChatSessions = async (session: any) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const context = await getRequiredChatReadContext();
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', context.scope.tId),
                where('sId', '==', context.scope.sId),
                where('uId', '==', context.userId),
                orderBy('modifiedOn', 'desc'),
                limit(USER_CHAT_SESSION_LIMIT)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.flatMap((sessionDoc) => {
                const parsed = parseAnswerlatticeChatSessionDocument({
                    id: sessionDoc.id,
                    value: sessionDoc.data(),
                    scope: context.scope,
                });
                return parsed && parsed.uId === context.userId ? [parsed] : [];
            });
        },
        session,
        'getUserChatSessions'
    );
};

/**
 * Get a single chat session by ID (Admin/Owner view)
 * Cost: 1 read - cheap for viewing conversation details
 * 
 * @param sessionId - The chat session ID to fetch
 * @returns Complete ChatSession with all messages and metadata
 */
export const getChatSessionById = async (sessionId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedSessionId = normalizeAnswerlatticeChatSessionId(sessionId);
            if (!normalizedSessionId) throw new Error('answerlattice_chat_session_id_invalid');
            const context = await getRequiredChatMutationContext();
            const sessionRef = getDocRef(normalizedSessionId);
            const sessionDoc = await getDoc(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error('answerlattice_chat_session_not_found');
            }

            return requirePersistedChatSession(normalizedSessionId, sessionDoc.data(), context.scope);
        },
        { sessionId },
        'getChatSessionById'
    );
};

/**
 * Update feedback for a specific message in a chat session
 * This allows users to see their previous feedback when reopening chats
 */
export const updateMessageFeedback = async (
    sessionId: string,
    messageId: string,
    searchHistoryId: string,
    feedback: {
        isGood: boolean;
        reasonsToImprove?: Array<{ value: string; label: string; }>;
        comments?: string;
        submittedAt?: Timestamp;
    }
) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const normalizedSessionId = normalizeAnswerlatticeChatSessionId(sessionId);
            const normalizedMessageId = normalizeAnswerlatticeChatSessionId(messageId);
            const normalizedSearchHistoryId = normalizeAnswerlatticeSearchHistoryId(searchHistoryId);
            if (
                !normalizedSessionId
                || !normalizedMessageId
                || !normalizedSearchHistoryId
                || normalizedSearchHistoryId !== searchHistoryId
            ) {
                throw new Error('answerlattice_chat_feedback_ids_invalid');
            }
            const context = await getRequiredChatMutationContext();
            const normalizedFeedback = normalizeAnswerlatticeChatFeedback(feedback, Timestamp.now());
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const sessionRef = getDocRef(normalizedSessionId);
                const searchHistoryRef = doc(
                    answerlatticeFirebaseClient,
                    SEARCH_HISTORY_COLLECTION,
                    normalizedSearchHistoryId,
                );
                const [sessionDoc, searchHistoryDoc] = await Promise.all([
                    transaction.get(sessionRef),
                    transaction.get(searchHistoryRef),
                ]);
                if (!sessionDoc.exists() || !searchHistoryDoc.exists()) {
                    throw new Error('answerlattice_chat_feedback_source_not_found');
                }
                const current = requirePersistedChatSession(normalizedSessionId, sessionDoc.data(), context.scope);
                const searchHistory = searchHistoryDoc.data();
                if (
                    searchHistory.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || normalizeAnswerlatticeScopeDocumentId(searchHistory.tId) !== context.scope.tId
                    || normalizeAnswerlatticeScopeDocumentId(searchHistory.sId) !== context.scope.sId
                ) throw new Error('answerlattice_chat_feedback_search_scope_invalid');
                const messageIndex = current.messages.findIndex((message) => (
                    message.id === normalizedMessageId
                    && message.searchHistoryId === normalizedSearchHistoryId
                ));
                if (messageIndex < 0) throw new Error('answerlattice_chat_feedback_message_not_found');
                const existingFeedback = current.messages[messageIndex].feedback;
                const nextComparable = {
                    isGood: normalizedFeedback.isGood,
                    reasonsToImprove: normalizedFeedback.reasonsToImprove || [],
                    comments: normalizedFeedback.comments || '',
                };
                const searchHistoryHasFeedback = typeof searchHistory.isGood === 'boolean';
                if (searchHistoryHasFeedback) {
                    const searchComparable = {
                        isGood: searchHistory.isGood,
                        reasonsToImprove: Array.isArray(searchHistory.reasonsToImprove)
                            ? searchHistory.reasonsToImprove
                            : [],
                        comments: String(searchHistory.comments || ''),
                    };
                    if (JSON.stringify(searchComparable) !== JSON.stringify(nextComparable)) {
                        throw new Error('answerlattice_search_feedback_already_submitted');
                    }
                }
                if (existingFeedback) {
                    const existingComparable = {
                        isGood: existingFeedback.isGood,
                        reasonsToImprove: existingFeedback.reasonsToImprove || [],
                        comments: existingFeedback.comments || '',
                    };
                    if (JSON.stringify(existingComparable) !== JSON.stringify(nextComparable)) {
                        throw new Error('answerlattice_chat_feedback_already_submitted');
                    }
                    if (searchHistoryHasFeedback) return;
                    transaction.update(searchHistoryRef, {
                        ...normalizedFeedback,
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        tId: context.scope.tId,
                        sId: context.scope.sId,
                        modifiedBy: context.userName,
                        modifiedOn: Timestamp.now(),
                    });
                    return;
                }
                const updatedMessages = current.messages.map((message, index) => (
                    index === messageIndex ? { ...message, feedback: normalizedFeedback } : message
                ));
                transaction.update(sessionRef, {
                    messages: updatedMessages,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: context.scope.tId,
                    sId: context.scope.sId,
                    modifiedBy: context.userName,
                    modifiedOn: Timestamp.now(),
                });
                if (!searchHistoryHasFeedback) {
                    transaction.update(searchHistoryRef, {
                        ...normalizedFeedback,
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        tId: context.scope.tId,
                        sId: context.scope.sId,
                        modifiedBy: context.userName,
                        modifiedOn: Timestamp.now(),
                    });
                }
            });

            return {
                sessionId: normalizedSessionId,
                messageId: normalizedMessageId,
                searchHistoryId: normalizedSearchHistoryId,
                success: true,
            } satisfies ChatMessageFeedbackUpdateResult;
        },
        { sessionId, messageId, searchHistoryId, feedback },
        'updateMessageFeedback'
    );
};

/**
 * Add or update an internal note on a chat session (Admin/Owner only)
 * Internal notes are for team collaboration and are not visible to end users
 * Note: Currently uses hardcoded [0] index for simplicity. Array structure allows future multi-note support.
 * 
 * @param sessionId - The chat session ID
 * @param noteJson - The internal note as TipTap JSON
 * @param session - User session for tracking who edited the note
 * @returns Updated session
 */
export const updateSessionInternalNote = async (
    sessionId: string,
    noteJson: any,
    _session?: any
) => {
    return await apiCallComposer(
        async () => {
            const normalizedSessionId = normalizeAnswerlatticeChatSessionId(sessionId);
            if (!normalizedSessionId) throw new Error('answerlattice_chat_session_id_invalid');
            const content = normalizeAnswerlatticeInternalNote(noteJson);
            const context = await getRequiredChatMutationContext();
            let noteObject: Record<string, unknown> = {};
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const sessionRef = getDocRef(normalizedSessionId);
                const sessionDoc = await transaction.get(sessionRef);
                if (!sessionDoc.exists()) throw new Error('answerlattice_chat_session_not_found');
                const current = requirePersistedChatSession(normalizedSessionId, sessionDoc.data(), context.scope);
                const existingNote = current.internalNotes?.[0];
                const now = Timestamp.now();
                noteObject = {
                    id: 'note-0',
                    content,
                    createdBy: existingNote?.createdBy || context.userId,
                    createdByName: existingNote?.createdByName || context.userName,
                    createdOn: existingNote?.createdOn || now,
                    modifiedBy: context.userId,
                    modifiedByName: context.userName,
                    modifiedOn: now,
                };
                transaction.update(sessionRef, {
                    internalNotes: [noteObject],
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: context.scope.tId,
                    sId: context.scope.sId,
                    modifiedBy: context.userName,
                    modifiedOn: now,
                });
            });

            return {
                sessionId: normalizedSessionId,
                success: true,
                note: noteObject,
            } satisfies ChatSessionInternalNoteUpdateResult;
        },
        { sessionId, note: noteJson },
        'updateSessionInternalNote'
    );
};

// ═══════════════════════════════════════════════════════════════════════
// ADMIN/OWNER METHODS - Platform-wide chat management
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all chat sessions for admin/owner (tenant-wide view)
 * Supports filtering, searching, and pagination for managing customer conversations
 * 
 * @param session - User session containing tId for tenant isolation
 * @param filters - Optional filters for date range, mode, feedback, search, pagination
 * @returns Paginated list of chat sessions with metadata
 * 
 * @example
 * ```typescript
 * const result = await getAllChatSessionsForAdmin(session, {
 *   dateRange: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
 *   mode: 'qna',
 *   hasFeedback: true,
 *   searchQuery: 'password reset',
 *   pageSize: 20,
 *   lastDocId: 'session_123'
 * });
 * ```
 */
export const getAllChatSessionsForAdmin = async (
    session: any,
    filters?: {
        dateRange?: { start: Date; end: Date };
        mode?: 'qna' | 'assistant';
        hasFeedback?: boolean;
        searchQuery?: string;
        pageSize?: number;
        lastDocId?: string; // For pagination
        sortBy?: 'createdOn' | 'modifiedOn';
        sortOrder?: 'asc' | 'desc';
    }
) => {
    return await apiCallComposer(
        async () => {
            const { scope: sessionScope } = await getRequiredChatReadContext();

            const pageSize = normalizePositiveInteger(filters?.pageSize, 20, ADMIN_CHAT_SESSION_PAGE_SIZE_LIMIT);
            const sortBy = filters?.sortBy || 'modifiedOn';
            const sortOrder = filters?.sortOrder || 'desc';

            // Base query: all sessions for this Answerlattice store.
            let q = query(
                await getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', sessionScope.tId),
                where('sId', '==', sessionScope.sId),
                orderBy(sortBy, sortOrder),
                limit(pageSize + 1) // +1 to check if there's a next page
            );

            // Add date range filter
            if (filters?.dateRange) {
                const startTimestamp = Timestamp.fromDate(filters.dateRange.start);
                const endTimestamp = Timestamp.fromDate(filters.dateRange.end);
                q = query(q, where(sortBy, '>=', startTimestamp), where(sortBy, '<=', endTimestamp));
            }

            // Add mode filter
            if (filters?.mode) {
                q = query(q, where('mode', '==', filters.mode));
            }

            // Pagination: start after last document
            if (filters?.lastDocId) {
                const normalizedLastDocId = normalizeAnswerlatticeChatSessionId(filters.lastDocId);
                if (!normalizedLastDocId) throw new Error('answerlattice_chat_cursor_id_invalid');
                const lastDocRef = getDocRef(normalizedLastDocId);
                const lastDocSnap = await getDoc(lastDocRef);
                if (lastDocSnap.exists()) {
                    requirePersistedChatSession(normalizedLastDocId, lastDocSnap.data(), sessionScope);
                    q = query(q, startAfter(lastDocSnap));
                }
            }

            const querySnapshot = await getDocs(q);
            let sessions: ChatSession[] = [];

            querySnapshot.forEach((sessionDoc) => {
                sessions.push(requirePersistedChatSession(sessionDoc.id, sessionDoc.data(), sessionScope));
            });

            // Check if there's a next page
            const hasNextPage = sessions.length > pageSize;
            if (hasNextPage) {
                sessions = sessions.slice(0, pageSize);
            }

            // Client-side filters (for complex filters that Firestore doesn't support well)
            let filteredSessions = sessions;

            // Filter by feedback presence
            if (filters?.hasFeedback !== undefined) {
                filteredSessions = sessions.filter((session) => {
                    const hasFeedback = session.messages.some((msg) => msg.feedback !== undefined);
                    return filters.hasFeedback ? hasFeedback : !hasFeedback;
                });
            }

            // Search filter (searches in title and message content)
            if (filters?.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                filteredSessions = filteredSessions.filter((session) => {
                    // Search in title
                    if (session.title?.toLowerCase().includes(searchLower)) return true;

                    // Search in messages
                    return session.messages.some((msg) => {
                        const content = msg.content || msg.craftedAnswer || '';
                        return content.toLowerCase().includes(searchLower);
                    });
                });
            }

            return {
                sessions: filteredSessions,
                hasNextPage,
                total: filteredSessions.length
            };
        },
        { session, filters },
        'getAllChatSessionsForAdmin'
    );
};

/**
 * Get chat statistics for admin dashboard
 * Provides overview metrics: total chats, today's chats, average satisfaction, etc.
 * 
 * @param session - User session containing tId for tenant isolation
 * @param dateRange - Optional date range filter
 * @returns Statistics object with various metrics
 */
export const getChatStatistics = async (
    session: any,
    dateRange?: { start: Date; end: Date }
) => {
    return await apiCallComposer(
        async () => {
            const { scope: sessionScope } = await getRequiredChatReadContext();

            // Query sessions for this tenant (capped at 500 to prevent unbounded Firestore reads)
            let q = query(
                await getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', sessionScope.tId),
                where('sId', '==', sessionScope.sId),
                orderBy('createdOn', 'desc'),
                limit(ADMIN_CHAT_SESSION_SCAN_LIMIT)
            );

            // Add date range filter if provided
            if (dateRange) {
                const startTimestamp = Timestamp.fromDate(dateRange.start);
                const endTimestamp = Timestamp.fromDate(dateRange.end);
                q = query(q, where('createdOn', '>=', startTimestamp), where('createdOn', '<=', endTimestamp));
            }

            const querySnapshot = await getDocs(q);
            const sessions: ChatSession[] = [];

            querySnapshot.forEach((sessionDoc) => {
                sessions.push(requirePersistedChatSession(sessionDoc.id, sessionDoc.data(), sessionScope));
            });

            // Calculate statistics
            const totalChats = sessions.length;

            // Today's chats
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayChats = sessions.filter((s) => {
                const createdDate = s.createdOn?.toDate();
                return createdDate && createdDate >= todayStart;
            }).length;

            // Feedback statistics
            let totalFeedback = 0;
            let positiveFeedback = 0;
            let negativeFeedback = 0;

            sessions.forEach((session) => {
                session.messages.forEach((msg) => {
                    if (msg.feedback) {
                        totalFeedback++;
                        if (msg.feedback.isGood) {
                            positiveFeedback++;
                        } else {
                            negativeFeedback++;
                        }
                    }
                });
            });

            const satisfactionRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0;

            // Average messages per chat
            const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
            const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;

            // Mode breakdown
            const qnaChats = sessions.filter((s) => s.mode === 'qna').length;
            const assistantChats = sessions.filter((s) => s.mode === 'assistant').length;

            // Regeneration statistics
            let totalRegenerations = 0;
            sessions.forEach((session) => {
                session.messages.forEach((msg) => {
                    if (msg.generationMetadata?.isRetry && msg.generationMetadata.retryReason === 'regenerate') {
                        totalRegenerations++;
                    }
                });
            });

            const regenerationRate = totalMessages > 0 ? (totalRegenerations / totalMessages) * 100 : 0;

            return {
                totalChats,
                todayChats,
                satisfactionRate: Math.round(satisfactionRate),
                positiveFeedback,
                negativeFeedback,
                totalFeedback,
                avgMessagesPerChat: Math.round(avgMessagesPerChat * 10) / 10,
                qnaChats,
                assistantChats,
                regenerationRate: Math.round(regenerationRate),
                totalRegenerations
            };
        },
        { session, dateRange },
        'getChatStatistics'
    );
};

/**
 * Get top questions asked by users
 * Analyzes user messages to find most common questions
 * 
 * @param session - User session containing tId for tenant isolation
 * @param limitCount - Maximum number of top questions to return
 * @returns Array of top questions with count
 */
export const getTopQuestions = async (session: any, limitCount: number = 10) => {
    return await apiCallComposer(
        async () => {
            const { scope: sessionScope } = await getRequiredChatReadContext();

            // Get recent sessions (capped at 500 to prevent unbounded Firestore reads)
            const q = query(
                await getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', sessionScope.tId),
                where('sId', '==', sessionScope.sId),
                orderBy('createdOn', 'desc'),
                limit(ADMIN_CHAT_SESSION_SCAN_LIMIT)
            );

            const querySnapshot = await getDocs(q);
            const questionCounts = new Map<string, number>();

            querySnapshot.forEach((sessionDoc) => {
                const sessionData = requirePersistedChatSession(sessionDoc.id, sessionDoc.data(), sessionScope);
                sessionData.messages.forEach((msg) => {
                    if (msg.role === 'user' && msg.content) {
                        // Normalize question (lowercase, trim)
                        const question = msg.content.trim().toLowerCase();
                        questionCounts.set(question, (questionCounts.get(question) || 0) + 1);
                    }
                });
            });

            // Convert to array and sort by count
            const safeLimit = normalizePositiveInteger(limitCount, 10, 100);
            const topQuestions = Array.from(questionCounts.entries())
                .map(([question, count]) => ({ question, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, safeLimit);

            return topQuestions;
        },
        { session, limitCount },
        'getTopQuestions'
    );
};

/**
 * Get knowledge gaps - questions with negative feedback
 * Helps identify areas where KB content needs improvement
 * 
 * @param session - User session containing tId for tenant isolation
 * @returns Array of questions with negative feedback count
 */
export const getKnowledgeGaps = async (session: any) => {
    return await apiCallComposer(
        async () => {
            const { scope: sessionScope } = await getRequiredChatReadContext();

            // Get recent sessions (capped at 500 to prevent unbounded Firestore reads)
            const q = query(
                await getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', sessionScope.tId),
                where('sId', '==', sessionScope.sId),
                orderBy('createdOn', 'desc'),
                limit(ADMIN_CHAT_SESSION_SCAN_LIMIT)
            );

            const querySnapshot = await getDocs(q);
            const negativeQuestions = new Map<string, { question: string; count: number; examples: string[] }>();

            querySnapshot.forEach((sessionDoc) => {
                const sessionData = requirePersistedChatSession(sessionDoc.id, sessionDoc.data(), sessionScope);

                for (let i = 0; i < sessionData.messages.length; i++) {
                    const userMsg = sessionData.messages[i];
                    const aiMsg = sessionData.messages[i + 1];

                    // Check if AI message has negative feedback
                    if (
                        userMsg?.role === 'user' &&
                        aiMsg?.role === 'assistant' &&
                        aiMsg.feedback &&
                        !aiMsg.feedback.isGood
                    ) {
                        const question = userMsg.content || 'Untitled';
                        const normalizedQuestion = question.trim().toLowerCase();

                        if (!negativeQuestions.has(normalizedQuestion)) {
                            negativeQuestions.set(normalizedQuestion, {
                                question: question,
                                count: 0,
                                examples: []
                            });
                        }

                        const entry = negativeQuestions.get(normalizedQuestion)!;
                        entry.count++;

                        // Store feedback comments as examples
                        if (aiMsg.feedback.comments && entry.examples.length < 3) {
                            entry.examples.push(aiMsg.feedback.comments);
                        }
                    }
                }
            });

            // Convert to array and sort by count
            const knowledgeGaps = Array.from(negativeQuestions.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 20); // Top 20 problem areas

            return knowledgeGaps;
        },
        { session },
        'getKnowledgeGaps'
    );
};

/**
 * Get chat volume over time (for charts)
 * Returns daily chat counts for the specified period
 * 
 * @param session - User session containing tId for tenant isolation
 * @param days - Number of days to look back (default: 7)
 * @returns Array of date/count pairs
 */
export const getChatVolumeOverTime = async (session: any, days: number = 7) => {
    return await apiCallComposer(
        async () => {
            const { scope: sessionScope } = await getRequiredChatReadContext();

            const safeDays = normalizePositiveInteger(days, 7, MAX_CHAT_VOLUME_DAYS);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - safeDays);
            startDate.setHours(0, 0, 0, 0);

            const q = query(
                await getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', sessionScope.tId),
                where('sId', '==', sessionScope.sId),
                where('createdOn', '>=', Timestamp.fromDate(startDate)),
                where('createdOn', '<=', Timestamp.fromDate(endDate)),
                orderBy('createdOn', 'asc'),
                limit(CHAT_VOLUME_SESSION_LIMIT)
            );

            const querySnapshot = await getDocs(q);
            const dailyCounts: Record<string, number> = {};

            // Initialize all days with 0
            for (let i = 0; i < safeDays; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateKey = date.toISOString().split('T')[0];
                dailyCounts[dateKey] = 0;
            }

            // Count sessions per day
            querySnapshot.forEach((sessionDoc) => {
                const sessionData = requirePersistedChatSession(sessionDoc.id, sessionDoc.data(), sessionScope);
                if (sessionData.createdOn) {
                    const date = sessionData.createdOn.toDate();
                    const dateKey = date.toISOString().split('T')[0];
                    if (dailyCounts[dateKey] !== undefined) {
                        dailyCounts[dateKey]++;
                    }
                }
            });

            // Convert to array format for charts
            const chartData = Object.entries(dailyCounts).map(([date, count]) => ({
                date,
                count
            }));

            return chartData;
        },
        { session, days: normalizePositiveInteger(days, 7, MAX_CHAT_VOLUME_DAYS) },
        'getChatVolumeOverTime'
    );
};

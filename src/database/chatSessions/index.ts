import { DB_COLLECTIONS } from '@constant/database';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import uploadBase64ToStorage from '@database/storage/uploadBase64ToStorage';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES,
    isAllowedAnswerlatticeChatImageMimeType,
    normalizeAnswerlatticeChatImageMimeType,
} from '@lib/answerlattice/chatImagePolicy';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { apiCallComposerClientWithoutLoader } from '@lib/apiHelper/apiCallComposerClientWithoutLoader';
import { answerlatticeFirebaseClient, answerlatticeStorage } from '@lib/firebase/answerlatticeFirebaseClient';
import { createRandomIdSegment } from '@lib/runtime/randomId';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import { ChatSession } from '@type/chatSession';
import { UserUploadedFileType } from '@type/common';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, startAfter, Timestamp, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.CHAT_SESSIONS;
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

const getDocRef = async (docId: string) => {
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, docId);
};

const getCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`);
};

const normalizePositiveInteger = (value: unknown, fallback: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.min(Math.floor(parsed), max);
};

const hasValidStoreScope = (session: any) => (
    Number.isFinite(Number(session?.tId))
    && Number.isFinite(Number(session?.sId))
    && Number(session?.tId) > 0
    && Number(session?.sId) > 0
);

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
    session: any
): Promise<UserUploadedFileType> => {
    return await apiCallComposer(
        async () => {
            // Check if image contains base64 data
            if (image.url?.includes('base64') || image.source?.includes('base64')) {
                const tenantId = Number(session?.tId);
                const storeId = Number(session?.sId);
                if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
                    throw new Error('Missing Answerlattice workspace context for chat image upload');
                }

                const imageType = normalizeAnswerlatticeChatImageMimeType(image.type);
                if (!isAllowedAnswerlatticeChatImageMimeType(imageType)) {
                    throw new Error('Unsupported chat image type');
                }

                if (Number(image.size || 0) <= 0 || Number(image.size || 0) > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
                    throw new Error('Chat image size exceeds the supported limit');
                }

                const randomId = createRandomIdSegment(16);
                const imageId = `${Date.now()}-${randomId}`;
                const base64String = image.url || image.source;

                // Generate tenant/store-scoped path for multi-tenancy isolation
                const path = generateStoragePath({
                    collection: COLLECTION,
                    fileType: 'chatimages',
                    session,
                    fileId: imageId,
                    useDefaults: false
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
                    source: uploadedUrl // Update source as well for preview
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
            const submitData = await answerlatticeRequestBodyComposer(data);
            const docRef = await addDoc(await getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id };
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
            const { writeBatch } = await import('firebase/firestore');
            const batch = writeBatch(answerlatticeFirebaseClient);
            const composedData = await answerlatticeRequestBodyComposer(metadata);
            for (const id of sessionIds) {
                const ref = await getDocRef(id);
                batch.update(ref, composedData);
            }
            await batch.commit();
            return {
                sessionIds,
                success: true,
                updatedCount: sessionIds.length,
                updatedFields: Object.keys(composedData),
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
            const composedData = await answerlatticeRequestBodyComposer(updates);
            await setDoc(await getDocRef(sessionId), composedData, { merge: true });
            return {
                sessionId,
                success: true,
                updatedFields: Object.keys(composedData),
            } satisfies ChatSessionUpdateResult;
        },
        updates,
        'updateChatSession'
    );
};

/**
 * Delete a chat session from Firestore
 * Uses global loader to give clear visual feedback for this destructive action
 */
export const deleteChatSession = async (sessionId: string) => {
    return await apiCallComposer(
        async () => {
            const sessionRef = await getDocRef(sessionId);
            const sessionDoc = await getDoc(sessionRef);
            const imageUrls = sessionDoc.exists()
                ? collectChatImageUrls(sessionDoc.data() as ChatSession)
                : [];

            await Promise.allSettled(
                imageUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage))
            );
            await deleteDoc(sessionRef);
            return {
                sessionId,
                success: true,
                deleted: true,
                storageFilesDeleted: imageUrls.length,
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
            if (!session?.tId || !session?.sId || !session?.uId) return [];
            const q = query(
                await getCollectionRef(),
                where('tId', '==', session.tId),
                where('sId', '==', session.sId),
                where('uId', '==', session.uId),
                orderBy('modifiedOn', 'desc'),
                limit(USER_CHAT_SESSION_LIMIT)
            );
            const querySnapshot = await getDocs(q);
            const list: ChatSession[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as ChatSession);
            });
            return list;
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
            const sessionRef = await getDocRef(sessionId);
            const sessionDoc = await getDoc(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error('Chat session not found');
            }

            return { ...sessionDoc.data(), id: sessionDoc.id } as ChatSession;
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
    feedback: {
        isGood: boolean;
        reasonsToImprove?: Array<{ value: string; label: string; }>;
        comments?: string;
        submittedAt?: Timestamp;
    }
) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            // Get the session
            const sessionRef = await getDocRef(sessionId);
            const sessionDoc = await getDoc(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error('Session not found');
            }

            const sessionData = sessionDoc.data() as ChatSession;

            // Feedback is stored on the bounded session message array so the
            // original message shape and reopening behavior stay in one doc.
            const updatedMessages = sessionData.messages.map(msg => {
                if (msg.id === messageId) {
                    return { ...msg, feedback };
                }
                return msg;
            });

            const composedData = await answerlatticeRequestBodyComposer({ messages: updatedMessages });
            await setDoc(sessionRef, composedData, { merge: true });

            return {
                sessionId,
                messageId,
                success: true,
            } satisfies ChatMessageFeedbackUpdateResult;
        },
        { sessionId, messageId, feedback },
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
    session?: any
) => {
    return await apiCallComposer(
        async () => {
            const sessionRef = await getDocRef(sessionId);

            // Create note object with metadata
            const noteObject = {
                id: 'note-0', // Hardcoded for now - always index 0
                content: noteJson,
                createdBy: session?.uId || session?.user?.id || 'unknown',
                createdByName: session?.user?.name || session?.userName || 'Unknown User',
                createdOn: Timestamp.now(),
                modifiedBy: session?.uId || session?.user?.id || 'unknown',
                modifiedByName: session?.user?.name || session?.userName || 'Unknown User',
                modifiedOn: Timestamp.now()
            };

            // Always save as array with single element at index 0
            const updateData: any = {
                internalNotes: [noteObject]
            };

            const composedData = await answerlatticeRequestBodyComposer(updateData);
            await setDoc(sessionRef, composedData, { merge: true });

            return {
                sessionId,
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
            if (!hasValidStoreScope(session)) {
                return { sessions: [], hasNextPage: false, total: 0 };
            }

            const pageSize = normalizePositiveInteger(filters?.pageSize, 20, ADMIN_CHAT_SESSION_PAGE_SIZE_LIMIT);
            const sortBy = filters?.sortBy || 'modifiedOn';
            const sortOrder = filters?.sortOrder || 'desc';

            // Base query: all sessions for this Answerlattice store.
            let q = query(
                await getCollectionRef(),
                where('tId', '==', session.tId),
                where('sId', '==', session.sId),
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
                const lastDocRef = await getDocRef(filters.lastDocId);
                const lastDocSnap = await getDoc(lastDocRef);
                if (lastDocSnap.exists()) {
                    q = query(q, startAfter(lastDocSnap));
                }
            }

            const querySnapshot = await getDocs(q);
            let sessions: ChatSession[] = [];

            querySnapshot.forEach((doc) => {
                sessions.push({ ...doc.data(), id: doc.id } as ChatSession);
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
            if (!hasValidStoreScope(session)) {
                return {
                    totalChats: 0,
                    todayChats: 0,
                    satisfactionRate: 0,
                    positiveFeedback: 0,
                    negativeFeedback: 0,
                    totalFeedback: 0,
                    avgMessagesPerChat: 0,
                    qnaChats: 0,
                    assistantChats: 0,
                    regenerationRate: 0,
                    totalRegenerations: 0
                };
            }

            // Query sessions for this tenant (capped at 500 to prevent unbounded Firestore reads)
            let q = query(
                await getCollectionRef(),
                where('tId', '==', session.tId),
                where('sId', '==', session.sId),
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

            querySnapshot.forEach((doc) => {
                sessions.push({ ...doc.data(), id: doc.id } as ChatSession);
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
            if (!hasValidStoreScope(session)) {
                return [];
            }

            // Get recent sessions (capped at 500 to prevent unbounded Firestore reads)
            const q = query(
                await getCollectionRef(),
                where('tId', '==', session.tId),
                where('sId', '==', session.sId),
                orderBy('createdOn', 'desc'),
                limit(ADMIN_CHAT_SESSION_SCAN_LIMIT)
            );

            const querySnapshot = await getDocs(q);
            const questionCounts: Record<string, number> = {};

            querySnapshot.forEach((doc) => {
                const sessionData = doc.data() as ChatSession;
                sessionData.messages.forEach((msg) => {
                    if (msg.role === 'user' && msg.content) {
                        // Normalize question (lowercase, trim)
                        const question = msg.content.trim().toLowerCase();
                        questionCounts[question] = (questionCounts[question] || 0) + 1;
                    }
                });
            });

            // Convert to array and sort by count
            const topQuestions = Object.entries(questionCounts)
                .map(([question, count]) => ({ question, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limitCount);

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
            if (!hasValidStoreScope(session)) {
                return [];
            }

            // Get recent sessions (capped at 500 to prevent unbounded Firestore reads)
            const q = query(
                await getCollectionRef(),
                where('tId', '==', session.tId),
                where('sId', '==', session.sId),
                orderBy('createdOn', 'desc'),
                limit(ADMIN_CHAT_SESSION_SCAN_LIMIT)
            );

            const querySnapshot = await getDocs(q);
            const negativeQuestions: Record<string, { question: string; count: number; examples: string[] }> = {};

            querySnapshot.forEach((doc) => {
                const sessionData = doc.data() as ChatSession;

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

                        if (!negativeQuestions[normalizedQuestion]) {
                            negativeQuestions[normalizedQuestion] = {
                                question: question,
                                count: 0,
                                examples: []
                            };
                        }

                        negativeQuestions[normalizedQuestion].count++;

                        // Store feedback comments as examples
                        if (aiMsg.feedback.comments && negativeQuestions[normalizedQuestion].examples.length < 3) {
                            negativeQuestions[normalizedQuestion].examples.push(aiMsg.feedback.comments);
                        }
                    }
                }
            });

            // Convert to array and sort by count
            const knowledgeGaps = Object.values(negativeQuestions)
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
            if (!hasValidStoreScope(session)) {
                return [];
            }

            const safeDays = normalizePositiveInteger(days, 7, MAX_CHAT_VOLUME_DAYS);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - safeDays);
            startDate.setHours(0, 0, 0, 0);

            const q = query(
                await getCollectionRef(),
                where('tId', '==', session.tId),
                where('sId', '==', session.sId),
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
            querySnapshot.forEach((doc) => {
                const sessionData = doc.data() as ChatSession;
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

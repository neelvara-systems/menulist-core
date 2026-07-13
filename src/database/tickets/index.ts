import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { ECOMSAI_PLATFORM_SUPPORT_USER_ROLE, ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, Timestamp, where, type QueryConstraint } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    ANSWERLATTICE_TICKET_MESSAGE_LIMIT,
    ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT,
    isAnswerlatticeTicketStatusTransitionAllowed,
    normalizeAnswerlatticeSupportTicketId,
    parseAnswerlatticeSupportTicketDocument,
    parseAnswerlatticeTicketMessage,
    parseAnswerlatticeTicketMutation,
} from '@lib/answerlattice/supportTicketLifecycle';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { emitAnswerlatticeSignal } from "@lib/answerlattice/signalEmitter";
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirebaseClient, answerlatticeStorage } from "@lib/firebase/answerlatticeFirebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { clearCapturedLogs, getCapturedLogs, getClientDebugContext } from "@lib/localLogs/localLogsTracker";
import { triggerNotification } from "@lib/notifications/client";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { generateStoragePath } from "@lib/storage/pathGenerator";
import { ANSWERLATTICE_SIGNAL_TYPE } from "@type/answerlattice";
import { UserUploadedFileType } from "@type/common";
import { SUPPORT_TICKET_STATUS, SupportTicketType, TicketMessage } from "@type/supportTicket";
import { addDoc } from "firebase/firestore";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { createTimestampedRuntimeId } from '@lib/runtime/randomId';

const COLLECTION = DB_COLLECTIONS.SUPPORT_TICKETS;
const STORE_TICKETS_LIMIT = 100;
const PLATFORM_TICKETS_LIMIT = 500;
const SUPPORT_TICKET_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;

const getCollectionRef = () => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`)
}

const getDocRef = (docId: string) => {
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, docId)
}

const getDisplayId = (id: string) => id.slice(0, 6).toUpperCase()

export type SupportTicketCreateResult = SupportTicketType & {
    id: string;
    displayId: string;
    success: true;
};

export type SupportTicketMessageAddResult = {
    ticketId: string;
    messageId: string;
    success: true;
    messageCount: number;
    attachmentCount: number;
    message: TicketMessage;
};

export type SupportTicketStatusUpdateResult = {
    ticketId: string;
    success: true;
    status: string;
    statusCount: number;
    statusEntry: SupportTicketType['statuses'][number];
};

type SupportTicketMutationScope = {
    tId?: number | string | null;
    sId?: number | string | null;
};

type NormalizedSupportTicketScope = {
    tId: number;
    sId: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeSupportTicketScopeValue = (value: unknown): number | undefined => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (
        documentId !== raw
        || !SUPPORT_TICKET_SCOPE_DOCUMENT_ID_PATTERN.test(documentId)
        || !isValidFirestoreDocumentId(documentId)
    ) {
        return undefined;
    }

    const parsed = Number(documentId);
    return Number.isSafeInteger(parsed) && parsed > 0 && String(parsed) === documentId
        ? parsed
        : undefined;
};

const normalizeSupportTicketScope = (scope?: SupportTicketMutationScope): NormalizedSupportTicketScope | undefined => {
    const tId = normalizeSupportTicketScopeValue(scope?.tId);
    const sId = normalizeSupportTicketScopeValue(scope?.sId);

    if (tId === undefined || sId === undefined) return undefined;
    return { tId, sId };
};

const collectTicketAttachmentUrls = (ticket: Partial<SupportTicketType> = {}): string[] => {
    const urls = new Set<string>();

    (ticket.documents || []).forEach((document: any) => {
        if (typeof document?.url === 'string' && document.url) {
            urls.add(document.url);
        }
    });

    (ticket.messages || []).forEach((message) => {
        (message.attachments || []).forEach((attachment) => {
            if (typeof attachment?.url === 'string' && attachment.url) {
                urls.add(attachment.url);
            }
        });
    });

    return Array.from(urls);
};

const isPlatformTicketSession = (session: any): boolean => {
    const platformRole = String(
        session?.platformRole
        || session?.user?.platformRole
        || session?.role
        || session?.user?.role
        || ''
    ).toUpperCase();
    return platformRole === ECOMSAI_PLATFORM_USER_ROLE || platformRole === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE;
};

const getSessionSupportTicketScope = (session: any): NormalizedSupportTicketScope | undefined => {
    const scope = resolveAnswerlatticeSessionScope(session);
    return scope ? { tId: scope.tenantId, sId: scope.storeId } : undefined;
};

const getRequiredSessionSupportTicketScope = (session: any): NormalizedSupportTicketScope => {
    const sessionScope = getSessionSupportTicketScope(session);
    if (!sessionScope) {
        throw new Error('Missing Answerlattice ticket scope');
    }

    return sessionScope;
};

const requireSupportTicketMutationContext = async (
    scope: SupportTicketMutationScope | undefined,
    operationCode: string,
): Promise<{ scope: NormalizedSupportTicketScope; session: any }> => {
    const session = await getActiveSession();
    const ticketScope = normalizeSupportTicketScope(scope);

    if (isPlatformTicketSession(session)) {
        if (!ticketScope) throw new Error(`${operationCode}_ticket_scope_missing`);
        return { scope: ticketScope, session };
    }

    const sessionScope = getSessionSupportTicketScope(session);
    if (!sessionScope) {
        throw new Error(`${operationCode}_session_scope_missing`);
    }
    if (!ticketScope) {
        throw new Error(`${operationCode}_ticket_scope_missing`);
    }
    if (ticketScope.tId !== sessionScope.tId || ticketScope.sId !== sessionScope.sId) {
        throw new Error(`${operationCode}_ticket_scope_mismatch`);
    }

    return { scope: ticketScope, session };
};

const getRequiredTicketActor = (session: any) => {
    const id = String(session?.user?.id || session?.uId || '').trim();
    const name = String(session?.user?.name || session?.user?.email || '').trim();
    const email = String(session?.user?.email || '').trim().toLowerCase();
    if (!id || id.length > 180 || !name || name.length > 200 || email.length > 254) {
        throw new Error('answerlattice_ticket_actor_invalid');
    }
    return { id, name, email };
};

const requirePersistedTicket = (
    ticketId: string,
    value: unknown,
    scope: NormalizedSupportTicketScope,
): SupportTicketType => {
    const ticket = parseAnswerlatticeSupportTicketDocument({ id: ticketId, value, scope });
    if (!ticket) throw new Error('answerlattice_ticket_scope_or_schema_invalid');
    return ticket;
};

const getScopedTicketConstraints = (session: any): QueryConstraint[] => {
    if (isPlatformTicketSession(session)) return [where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)];

    const sessionScope = getRequiredSessionSupportTicketScope(session);

    return [
        where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
        where("tId", "==", sessionScope.tId),
        where("sId", "==", sessionScope.sId),
    ];
};

const buildSupportTicketsQuery = async (
    includeDeleted = false,
    maxResults = PLATFORM_TICKETS_LIMIT,
) => {
    const session = await getActiveSession();
    const constraints: QueryConstraint[] = [
        ...getScopedTicketConstraints(session),
    ];

    if (!includeDeleted) {
        constraints.push(where("deleted", "==", false));
    }

    const boundedMaxResults = isPlatformTicketSession(session)
        ? Math.max(1, Math.min(maxResults, PLATFORM_TICKETS_LIMIT))
        : Math.max(1, Math.min(maxResults, STORE_TICKETS_LIMIT));
    constraints.push(orderBy("createdOn", "desc"), limit(boundedMaxResults));
    return query(getCollectionRef(), ...constraints);
};

const buildDeletedSupportTicketsQuery = async (maxResults = 100) => {
    const session = await getActiveSession();
    const constraints: QueryConstraint[] = [
        ...getScopedTicketConstraints(session),
        where("deleted", "==", true),
        orderBy("createdOn", "desc"),
        limit(Math.max(1, Math.min(maxResults, isPlatformTicketSession(session) ? 100 : STORE_TICKETS_LIMIT))),
    ];

    return query(getCollectionRef(), ...constraints);
};

/**
 * Upload ticket file to Firebase Storage with tenant/store isolation
 * @param data - File data with base64 content
 * @param type - File category (e.g., 'documents', 'messages')
 */
const uploadImage = async (data: UserUploadedFileType, type = 'documents', stableId?: string) => {

    let uploadedUrl: any = '';
    const stablePrefix = String(stableId || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 120);
    const safeUid = String(data.uid || 'file').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80);
    const docId = stablePrefix
        ? `${stablePrefix}-${safeUid}`
        : `${new Date().getTime()}-${safeUid}`;

    if (data.url?.includes('base64')) {
        // Get fresh session for tenant-scoped storage paths
        const session = await getActiveSession();

        // Generate tenant/store-scoped path for multi-tenancy isolation
        const path = generateStoragePath({
            collection: COLLECTION,
            fileType: type,
            session,
            fileId: docId
        });

        // Upload to Firebase Storage
        uploadedUrl = await uploadBase64ToStorage({
            cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
            fileId: docId,
            storage: answerlatticeStorage,
            url: data.url,
            path,
            type: data.type
        })
    }
    return uploadedUrl || data.url;
}

export const addTicket = async (data: SupportTicketType) => {
    return await apiCallComposer(
        async () => {
            if (Array.isArray(data.documents) && data.documents.length > 20) {
                throw new Error('answerlattice_ticket_document_limit_reached');
            }
            const capturedLogs = getCapturedLogs();
            const clientDebugContext = getClientDebugContext();

            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                deleted: false,
                logs: capturedLogs,
                ...(clientDebugContext ? { clientDebugContext } : {}),
            }, { isNew: true });
            delete submitData.documents;
            const files = data.documents?.filter(doc => doc.url.includes('base64')) || [];
            const uploadedTicketUrls: string[] = [];
            let docRef: Awaited<ReturnType<typeof addDoc>>;
            try {
                if (files.length) {
                    submitData.documents = data.documents.map((document) => ({ ...document }));
                    for (let i = 0; i < data.documents.length; i++) {
                        const isNewUpload = data.documents[i].url.includes('base64');
                        submitData.documents[i].url = await uploadImage(data.documents[i], 'documents');
                        if (isNewUpload) uploadedTicketUrls.push(submitData.documents[i].url);
                    }
                }
                if (!parseAnswerlatticeSupportTicketDocument({
                    id: 'pending-ticket-validation',
                    value: submitData,
                    scope: {
                        tId: normalizeSupportTicketScopeValue(submitData.tId) || 0,
                        sId: normalizeSupportTicketScopeValue(submitData.sId) || 0,
                    },
                })) {
                    throw new Error('answerlattice_ticket_create_payload_invalid');
                }
                docRef = await addDoc(getCollectionRef(), submitData);
            } catch (createError) {
                await Promise.allSettled(uploadedTicketUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)));
                throw createError;
            }
            clearCapturedLogs(); // Clear only after the ticket is persisted successfully.
            const displayId = getDisplayId(docRef.id);

            // Answerlattice: emit ticket creation signal (fire-and-forget)
            // For AI escalation tickets, emit ESCALATION signal (3x severity weight)
            // For manual tickets, emit TICKET signal (1.5x weight)
            const signalType = data.source === 'ai_escalation'
                ? ANSWERLATTICE_SIGNAL_TYPE.ESCALATION
                : ANSWERLATTICE_SIGNAL_TYPE.TICKET;
            const escalationMatchedEntityIds = data.escalationContext?.retrievalDebug?.canonicalResult?.matchedEntityIds || [];
            const signalEntityId = escalationMatchedEntityIds.find((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()));

            void emitAnswerlatticeSignal({
                type: signalType,
                entityId: signalEntityId,
                tId: submitData.tId,
                sId: submitData.sId,
                metadata: {
                    ticketId: docRef.id,
                    subject: data.subject,
                    category: data.category,
                    contextKeys: data.contextKeys || [],
                    priority: data.priority,
                    ...(data.source === 'ai_escalation' && {
                        query: data.escalationContext?.query,
                        matchedEntityIds: escalationMatchedEntityIds,
                        fallbackReason: data.escalationContext?.retrievalDebug?.canonicalResult?.fallbackReason,
                        triggerTypes: data.escalationContext?.triggerTypes,
                        conversationId: data.escalationContext?.conversationId,
                    }),
                },
            }).catch((signalError) => {
                logRuntimeFailure('answerlattice_ticket_create_signal_emit_failed', signalError, {
                    ...getBoundedRuntimeStringContext('ticketId', docRef.id),
                    ...getBoundedRuntimeStringContext('tenantId', submitData.tId),
                    ...getBoundedRuntimeStringContext('storeId', submitData.sId),
                });
            });

            // Notification: ticket creation confirmation (fire-and-forget)
            if (data.clientDetails?.email) {
                triggerNotification({
                    eventType: 'TICKET_CREATED',
                    ticketId: docRef.id,
                });
            }

            return {
                ...submitData,
                id: docRef.id,
                displayId,
                success: true,
            } satisfies SupportTicketCreateResult;
        },
        data,
        "addTicket"
    );
}

export function assertSupportTicketCreateSucceeded(
    result: unknown,
    rejectionCode = 'support_ticket_create_rejected',
): asserts result is SupportTicketCreateResult {
    if (
        !isRecord(result)
        || result.success !== true
        || typeof result.id !== 'string'
        || typeof result.displayId !== 'string'
    ) {
        throw new Error(rejectionCode);
    }
}

export const updateTicket = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const ticketId = normalizeAnswerlatticeSupportTicketId(data?.id);
            if (!ticketId) throw new Error('answerlattice_ticket_id_invalid');
            const mutationContext = await requireSupportTicketMutationContext(data, 'support_ticket_update');
            const actor = getRequiredTicketActor(mutationContext.session);
            const mutation = parseAnswerlatticeTicketMutation(data);
            const changedAt = Timestamp.now();
            const statusMessageId = createTimestampedRuntimeId('ticket_status', 12);

            return runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const ticketRef = getDocRef(ticketId);
                const ticketSnapshot = await transaction.get(ticketRef);
                if (!ticketSnapshot.exists()) throw new Error('answerlattice_ticket_not_found');
                const currentTicket = requirePersistedTicket(
                    ticketId,
                    ticketSnapshot.data(),
                    mutationContext.scope,
                );

                const updateData: Record<string, any> = {
                    ...mutation,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: mutationContext.scope.tId,
                    sId: mutationContext.scope.sId,
                    modifiedBy: actor.name,
                    modifiedOn: changedAt,
                };

                if (mutation.status !== undefined) {
                    if (!isAnswerlatticeTicketStatusTransitionAllowed(currentTicket.status, mutation.status)) {
                        throw new Error('answerlattice_ticket_status_transition_invalid');
                    }
                    if (mutation.status !== currentTicket.status) {
                        const currentStatuses = Array.isArray(currentTicket.statuses) ? currentTicket.statuses : [];
                        const currentMessages = Array.isArray(currentTicket.messages) ? currentTicket.messages : [];
                        if (currentStatuses.length >= ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT) {
                            throw new Error('answerlattice_ticket_status_history_limit_reached');
                        }
                        if (currentMessages.length >= ANSWERLATTICE_TICKET_MESSAGE_LIMIT) {
                            throw new Error('answerlattice_ticket_message_limit_reached');
                        }
                        const remark = `Status changed from ${currentTicket.status} to ${mutation.status}`;
                        updateData.statuses = [...currentStatuses, {
                            status: mutation.status,
                            timestamp: changedAt,
                            createdBy: actor,
                            remark,
                        }];
                        updateData.messages = [...currentMessages, {
                            id: statusMessageId,
                            text: remark,
                            type: 'system',
                            sender: actor,
                            timestamp: changedAt,
                        }];
                    }
                }

                transaction.update(ticketRef, updateData);
                return {
                    ...currentTicket,
                    ...updateData,
                    id: ticketId,
                    displayId: getDisplayId(ticketId),
                } as SupportTicketType;
            });
        },
        data,
        "updateTicket"
    );
}

export function assertSupportTicketUpdateSucceeded(
    result: unknown,
    expectedTicketId: string,
    rejectionCode = 'support_ticket_update_rejected',
): asserts result is Partial<SupportTicketType> {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    const ticket = result as Partial<SupportTicketType>;
    if (ticket.id !== expectedTicketId) {
        throw new Error(rejectionCode);
    }
}

export function assertSupportTicketMessageAddSucceeded(
    result: unknown,
    expectedTicketId: string,
    expectedMessageId: string,
    rejectionCode = 'support_ticket_message_add_rejected',
): asserts result is SupportTicketMessageAddResult {
    if (
        !isRecord(result)
        || result.success !== true
        || result.ticketId !== expectedTicketId
        || result.messageId !== expectedMessageId
        || typeof result.messageCount !== 'number'
        || typeof result.attachmentCount !== 'number'
    ) {
        throw new Error(rejectionCode);
    }

    if (!isRecord(result.message) || result.message.id !== expectedMessageId) {
        throw new Error(rejectionCode);
    }
}

export function assertSupportTicketStatusUpdateSucceeded(
    result: unknown,
    expectedTicketId: string,
    expectedStatus: string,
    rejectionCode = 'support_ticket_status_update_rejected',
): asserts result is SupportTicketStatusUpdateResult {
    if (
        !isRecord(result)
        || result.success !== true
        || result.ticketId !== expectedTicketId
        || result.status !== expectedStatus
        || typeof result.statusCount !== 'number'
    ) {
        throw new Error(rejectionCode);
    }

    if (!isRecord(result.statusEntry) || result.statusEntry.status !== expectedStatus) {
        throw new Error(rejectionCode);
    }
}

export const addTicketMessage = async (
    ticketId: string,
    _currentMessages: TicketMessage[],
    message: TicketMessage,
    attachments?: any[],
    scope?: SupportTicketMutationScope,
) => {
    return await apiCallComposer(
        async () => {
            const normalizedTicketId = normalizeAnswerlatticeSupportTicketId(ticketId);
            if (!normalizedTicketId) throw new Error('answerlattice_ticket_id_invalid');
            const mutationContext = await requireSupportTicketMutationContext(scope, 'support_ticket_message');
            const actor = getRequiredTicketActor(mutationContext.session);
            const messageId = normalizeAnswerlatticeSupportTicketId(message?.id);
            if (!messageId) throw new Error('answerlattice_ticket_message_id_invalid');
            const uploadedAttachmentUrls: string[] = [];
            const persistedMessage: TicketMessage = parseAnswerlatticeTicketMessage({
                ...message,
                id: messageId,
                sender: actor,
                timestamp: Timestamp.now(),
                attachments: undefined,
            });

            // Handle file uploads for attachments (same pattern as ticket documents)
            if (attachments?.length) {
                if (attachments.length > 4) throw new Error('answerlattice_ticket_attachment_limit_reached');
                persistedMessage.attachments = [];
                try {
                    for (let i = 0; i < attachments.length; i++) {
                        const uploadedUrl = await uploadImage(
                            attachments[i],
                            'messages',
                            `${normalizedTicketId}-${messageId}`,
                        );
                        uploadedAttachmentUrls.push(uploadedUrl);
                        persistedMessage.attachments.push({
                            url: uploadedUrl,
                            name: String(attachments[i].name || '').slice(0, 300),
                            type: String(attachments[i].type || '').slice(0, 120),
                            size: Number(attachments[i].size || 0),
                        });
                    }
                    parseAnswerlatticeTicketMessage(persistedMessage);
                } catch (uploadError) {
                    await Promise.allSettled(uploadedAttachmentUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)));
                    throw uploadError;
                }
            }

            let inserted = false;
            let messageCount = 0;
            try {
                const transactionResult = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                    const ticketRef = getDocRef(normalizedTicketId);
                    const ticketSnapshot = await transaction.get(ticketRef);
                    if (!ticketSnapshot.exists()) throw new Error('answerlattice_ticket_not_found');
                    const currentTicket = requirePersistedTicket(
                        normalizedTicketId,
                        ticketSnapshot.data(),
                        mutationContext.scope,
                    );
                    if (currentTicket.deleted) throw new Error('answerlattice_ticket_deleted');
                    const currentMessages = Array.isArray(currentTicket.messages) ? currentTicket.messages : [];
                    const existingMessage = currentMessages.find((item) => item.id === messageId);
                    if (existingMessage) {
                        return { inserted: false, message: existingMessage, messageCount: currentMessages.length };
                    }
                    if (currentMessages.length >= ANSWERLATTICE_TICKET_MESSAGE_LIMIT) {
                        throw new Error('answerlattice_ticket_message_limit_reached');
                    }
                    const updatedMessages = [...currentMessages, persistedMessage];
                    transaction.update(ticketRef, {
                        messages: updatedMessages,
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        tId: mutationContext.scope.tId,
                        sId: mutationContext.scope.sId,
                        modifiedBy: actor.name,
                        modifiedOn: Timestamp.now(),
                    });
                    return { inserted: true, message: persistedMessage, messageCount: updatedMessages.length };
                });
                inserted = transactionResult.inserted;
                messageCount = transactionResult.messageCount;
                if (!inserted && uploadedAttachmentUrls.length > 0) {
                    const existingUrls = new Set((transactionResult.message.attachments || []).map((item) => item.url));
                    await Promise.allSettled(
                        uploadedAttachmentUrls
                            .filter((url) => !existingUrls.has(url))
                            .map((url) => deleteFileByUrl(url, answerlatticeStorage)),
                    );
                }
            } catch (transactionError) {
                await Promise.allSettled(uploadedAttachmentUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)));
                throw transactionError;
            }

            // Notification: ticket reply (fire-and-forget)
            // Only notify when the sender is NOT the ticket creator (i.e., support agent replied)
            if (inserted && persistedMessage.sender?.email && persistedMessage.type !== 'system') {
                triggerNotification({
                    eventType: 'TICKET_REPLY',
                    ticketId,
                    messageId: persistedMessage.id,
                });
            }

            return {
                ticketId: normalizedTicketId,
                messageId,
                success: true,
                messageCount,
                attachmentCount: persistedMessage.attachments?.length || 0,
                message: persistedMessage,
            } satisfies SupportTicketMessageAddResult;
        },
        { ticketId, currentMessages: _currentMessages, message, attachments },
        "addTicketMessage"
    );
}

export const updateTicketStatus = async (
    ticketId: string,
    _currentStatuses: any[],
    newStatus: string,
    remark: string = '',
    _changedBy: { id: string, name: string, email: string },
    scope?: SupportTicketMutationScope,
) => {
    return await apiCallComposer(
        async () => {
            const updatedTicket = await updateTicket({
                id: ticketId,
                status: newStatus,
                tId: scope?.tId,
                sId: scope?.sId,
            });
            const statuses = Array.isArray(updatedTicket.statuses) ? updatedTicket.statuses : [];
            const statusEntry = statuses[statuses.length - 1];
            if (!statusEntry || statusEntry.status !== newStatus) {
                throw new Error('answerlattice_ticket_status_update_missing_history');
            }

            // Notification: ticket status changed (fire-and-forget)
            // _notifyEmail is set by the calling component with the ticket creator's email
            triggerNotification({
                eventType: 'TICKET_STATUS_CHANGED',
                ticketId,
            });

            return {
                ticketId,
                success: true,
                status: newStatus,
                statusCount: statuses.length,
                statusEntry,
            } satisfies SupportTicketStatusUpdateResult;
        },
        { ticketId, currentStatuses: _currentStatuses, newStatus, remark, changedBy: _changedBy },
        "updateTicketStatus"
    );
}

export const deleteTicket = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const ticketId = normalizeAnswerlatticeSupportTicketId(data?.id);
            if (!ticketId) throw new Error('answerlattice_ticket_id_invalid');
            const mutationContext = await requireSupportTicketMutationContext(data, 'support_ticket_delete');
            if (!isPlatformTicketSession(mutationContext.session)) {
                throw new Error('answerlattice_ticket_hard_delete_forbidden');
            }
            let persistedTicket: SupportTicketType | null = null;
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const ticketRef = getDocRef(ticketId);
                const ticketSnapshot = await transaction.get(ticketRef);
                if (!ticketSnapshot.exists()) return;
                persistedTicket = requirePersistedTicket(ticketId, ticketSnapshot.data(), mutationContext.scope);
                transaction.delete(ticketRef);
            });
            const attachmentUrls = collectTicketAttachmentUrls(persistedTicket || {});
            await Promise.allSettled(
                attachmentUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage))
            );
            return null;
        },
        data,
        "deleteTicket"
    );
}

export const submitTicketSatisfaction = async (
    ticketId: string,
    rating: number,
    comment?: string,
    scope?: SupportTicketMutationScope,
) => {
    return await apiCallComposer(
        async () => {
            const normalizedTicketId = normalizeAnswerlatticeSupportTicketId(ticketId);
            if (!normalizedTicketId) throw new Error('answerlattice_ticket_id_invalid');
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                throw new Error('answerlattice_ticket_satisfaction_rating_invalid');
            }
            const cleanComment = String(comment || '').trim();
            if (cleanComment.length > 1000) throw new Error('answerlattice_ticket_satisfaction_comment_invalid');
            const session = await getActiveSession();
            const sessionScope = getSessionSupportTicketScope(session);
            const ticketScope = normalizeSupportTicketScope(scope) || sessionScope;
            if (!ticketScope || (!isPlatformTicketSession(session) && (
                !sessionScope
                || sessionScope.tId !== ticketScope.tId
                || sessionScope.sId !== ticketScope.sId
            ))) throw new Error('answerlattice_ticket_satisfaction_scope_invalid');
            const satisfaction = {
                rating,
                comment: cleanComment,
                submittedAt: Timestamp.now(),
            };
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const ticketRef = getDocRef(normalizedTicketId);
                const ticketSnapshot = await transaction.get(ticketRef);
                if (!ticketSnapshot.exists()) throw new Error('answerlattice_ticket_not_found');
                const currentTicket = requirePersistedTicket(normalizedTicketId, ticketSnapshot.data(), ticketScope);
                if (
                    currentTicket.status !== SUPPORT_TICKET_STATUS.RESOLVED
                    && currentTicket.status !== SUPPORT_TICKET_STATUS.CLOSED
                ) throw new Error('answerlattice_ticket_satisfaction_not_available');
                if (currentTicket.satisfaction?.submittedAt) {
                    throw new Error('answerlattice_ticket_satisfaction_already_submitted');
                }
                transaction.update(ticketRef, {
                    satisfaction,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: ticketScope.tId,
                    sId: ticketScope.sId,
                    modifiedOn: Timestamp.now(),
                });
            });
            return satisfaction;
        },
        { ticketId, rating, comment, scope },
        "submitTicketSatisfaction"
    );
};

export const restoreTicket = async (data: any) => {
    return await updateTicket({ ...data, deleted: false });
}

export const getTicketById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const ticketId = normalizeAnswerlatticeSupportTicketId(id);
            if (!ticketId) throw new Error('answerlattice_ticket_id_invalid');
            const session = await getActiveSession();
            const sessionScope = isPlatformTicketSession(session) ? undefined : getRequiredSessionSupportTicketScope(session);
            const docRef = getDocRef(ticketId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return parseAnswerlatticeSupportTicketDocument({
                    id: docSnap.id,
                    value: docSnap.data(),
                    scope: sessionScope,
                });
            }
            return null;
        },
        id,
        "getTicketById"
    );
}

export const subscribeTicketById = async (
    id: string,
    onUpdate: (ticket: SupportTicketType | null) => void,
    onError?: (error: Error) => void
) => {
    try {
        const ticketId = normalizeAnswerlatticeSupportTicketId(id);
        if (!ticketId) throw new Error('answerlattice_ticket_id_invalid');
        const session = await getActiveSession();
        const sessionScope = isPlatformTicketSession(session) ? undefined : getRequiredSessionSupportTicketScope(session);
        const unsubscribe = onSnapshot(
            getDocRef(ticketId),
            (docSnap) => {
                if (docSnap.exists()) {
                    onUpdate(parseAnswerlatticeSupportTicketDocument({
                        id: docSnap.id,
                        value: docSnap.data(),
                        scope: sessionScope,
                    }));
                    return;
                }
                onUpdate(null);
            },
            (error) => {
                onError?.(error);
            }
        );

        return unsubscribe;
    } catch (error) {
        onError?.(error as Error);
        return () => { };
    }
}

export const getStoresTickets = async (maxResults = STORE_TICKETS_LIMIT) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const sessionScope = getRequiredSessionSupportTicketScope(session);
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where("tId", "==", sessionScope.tId),
                where("sId", "==", sessionScope.sId),
                where("deleted", "==", false), // ✅ Filter at database level
                orderBy("createdOn", "desc"),
                limit(Math.max(1, Math.min(maxResults, STORE_TICKETS_LIMIT)))
            );

            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                const ticket = parseAnswerlatticeSupportTicketDocument({
                    id: doc.id,
                    value: doc.data(),
                    scope: sessionScope,
                });
                if (ticket) list.push(ticket);
            });
            return list;
        },
        { maxResults },
        "getStoresTickets"
    );
}

export const getSupportTickets = async (includeDeleted = false) => {
    return await apiCallComposer(
        async () => {
            const q = await buildSupportTicketsQuery(includeDeleted, PLATFORM_TICKETS_LIMIT);

            const querySnapshot = await getDocs(q);
            const session = await getActiveSession();
            const sessionScope = isPlatformTicketSession(session) ? undefined : getRequiredSessionSupportTicketScope(session);
            const list: SupportTicketType[] = [];
            querySnapshot.forEach((doc) => {
                const ticket = parseAnswerlatticeSupportTicketDocument({ id: doc.id, value: doc.data(), scope: sessionScope });
                if (ticket) list.push(ticket);
            });
            return list;
        },
        "getSupportTickets"
    );
}

export const getDeletedSupportTickets = async (maxResults = 100) => {
    return await apiCallComposer(
        async () => {
            const q = await buildDeletedSupportTicketsQuery(maxResults);

            const querySnapshot = await getDocs(q);
            const session = await getActiveSession();
            const sessionScope = isPlatformTicketSession(session) ? undefined : getRequiredSessionSupportTicketScope(session);
            const list: SupportTicketType[] = [];
            querySnapshot.forEach((doc) => {
                const ticket = parseAnswerlatticeSupportTicketDocument({ id: doc.id, value: doc.data(), scope: sessionScope });
                if (ticket) list.push(ticket);
            });
            return list;
        },
        { maxResults },
        "getDeletedSupportTickets"
    );
}

// Real-time listener for support tickets (admin view)
export const subscribeSupportTickets = async (
    onUpdate: (tickets: SupportTicketType[]) => void,
    onError?: (error: Error) => void,
    includeDeleted = false
) => {
    try {
        const session = await getActiveSession();
        const sessionScope = isPlatformTicketSession(session) ? undefined : getRequiredSessionSupportTicketScope(session);
        const q = await buildSupportTicketsQuery(includeDeleted, PLATFORM_TICKETS_LIMIT);

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const list: SupportTicketType[] = [];
                querySnapshot.forEach((doc) => {
                    const ticket = parseAnswerlatticeSupportTicketDocument({ id: doc.id, value: doc.data(), scope: sessionScope });
                    if (ticket) list.push(ticket);
                });
                onUpdate(list);
            },
            (error) => {
                onError?.(error);
            }
        );

        return unsubscribe;
    } catch (error) {
        onError?.(error as Error);
        return () => { }; // Return no-op unsubscribe
    }
}

// Real-time listener for store tickets (client view)
export const subscribeStoreTickets = async (
    onUpdate: (tickets: SupportTicketType[]) => void,
    onError?: (error: Error) => void,
    maxResults = STORE_TICKETS_LIMIT
) => {
    try {
        const session = await getActiveSession();
        const sessionScope = getRequiredSessionSupportTicketScope(session);
        const q = query(
            getCollectionRef(),
            where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
            where("tId", "==", sessionScope.tId),
            where("sId", "==", sessionScope.sId),
            where("deleted", "==", false), // ✅ Filter at database level
            orderBy("createdOn", "desc"),
            limit(Math.max(1, Math.min(maxResults, STORE_TICKETS_LIMIT)))
        );

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const list: SupportTicketType[] = [];
                querySnapshot.forEach((doc) => {
                    const ticket = parseAnswerlatticeSupportTicketDocument({
                        id: doc.id,
                        value: doc.data(),
                        scope: sessionScope,
                    });
                    if (ticket) list.push(ticket);
                });
                onUpdate(list);
            },
            (error) => {
                onError?.(error);
            }
        );

        return unsubscribe;
    } catch (error) {
        onError?.(error as Error);
        return () => { }; // Return no-op unsubscribe
    }
}

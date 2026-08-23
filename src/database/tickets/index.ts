import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { MENULIST_PLATFORM_SUPPORT_USER_ROLE, MENULIST_PLATFORM_USER_ROLE } from "@constant/user";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, Timestamp, where, type DocumentData, type QueryConstraint, type UpdateData } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    ANSWERLATTICE_TICKET_MESSAGE_LIMIT,
    ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT,
    getAnswerlatticeSupportTicketDisplayId,
    isAnswerlatticeTicketStatusTransitionAllowed,
    normalizeAnswerlatticeSupportTicketId,
    parseAnswerlatticeSupportTicketDocument,
    parseAnswerlatticeTicketMessage,
    prepareAnswerlatticeTicketMessageForPersistence,
    parseAnswerlatticeTicketMutation,
} from '@lib/answerlattice/supportTicketLifecycle';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import { emitAnswerlatticeSignal } from "@lib/answerlattice/signalEmitter";
import { resolveAnswerlatticeSupportTicketActor } from '@lib/answerlattice/supportTicketActor';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import {
    ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT,
    buildSupportTicketAttachmentFileId,
    isSupportTicketAttachmentStoragePath,
    parseSupportTicketAttachmentUpload,
    type SupportTicketAttachmentUpload,
} from '@lib/answerlattice/supportTicketAttachmentBoundary';
import { answerlatticeAuth, answerlatticeFirebaseClient, answerlatticeStorage } from "@lib/firebase/answerlatticeFirebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { clearCapturedLogs, getCapturedLogs, getClientDebugContext } from "@lib/localLogs/localLogsTracker";
import { isDataUrl } from "@lib/media/mediaStorage";
import { triggerNotification } from "@lib/notifications/client";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { generateStoragePath } from "@lib/storage/pathGenerator";
import { summarizeStorageCleanupResults } from '@lib/storage/storageCleanupResults';
import { ANSWERLATTICE_SIGNAL_TYPE } from "@type/answerlattice";
import { UserUploadedFileType } from "@type/common";
import LoginUserType from "@type/loginUser";
import {
    SUPPORT_TICKET_STATUS,
    SupportTicketType,
    TicketMessage,
    type SupportTicketDocument,
} from "@type/supportTicket";
import { addDoc } from "firebase/firestore";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { createRuntimeId, createTimestampedRuntimeId } from '@lib/runtime/randomId';
import { ref } from 'firebase/storage';

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

const getDisplayId = getAnswerlatticeSupportTicketDisplayId;

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

type SupportTicketMutationInput = SupportTicketMutationScope & {
    id?: unknown;
    [key: string]: unknown;
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

const isOwnedTicketAttachmentUrl = (url: string, scope: NormalizedSupportTicketScope): boolean => {
    try {
        return isSupportTicketAttachmentStoragePath({
            collection: COLLECTION,
            path: ref(answerlatticeStorage, url).fullPath,
            tId: scope.tId,
            sId: scope.sId,
        });
    } catch {
        return false;
    }
};

const collectTicketAttachmentUrls = (
    ticket: Partial<SupportTicketType> = {},
    scope: NormalizedSupportTicketScope,
): string[] => {
    const urls = new Set<string>();

    (ticket.documents || []).forEach((document: SupportTicketDocument) => {
        if (typeof document?.url === 'string' && isOwnedTicketAttachmentUrl(document.url, scope)) {
            urls.add(document.url);
        }
    });

    (ticket.messages || []).forEach((message) => {
        (message.attachments || []).forEach((attachment) => {
            if (typeof attachment?.url === 'string' && isOwnedTicketAttachmentUrl(attachment.url, scope)) {
                urls.add(attachment.url);
            }
        });
    });

    return Array.from(urls);
};

const cleanupTicketAttachmentUrls = async (
    urls: readonly string[],
    operation: 'create_pre_persist' | 'message_pre_persist' | 'message_duplicate' | 'ticket_delete',
) => {
    const uniqueUrls = Array.from(new Set(urls));
    const results = await Promise.allSettled(
        uniqueUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)),
    );
    const summary = summarizeStorageCleanupResults(results);
    if (summary.failed > 0) {
        logRuntimeFailure('answerlattice_ticket_attachment_storage_cleanup_failed', new Error('storage_cleanup_failed'), {
            operation,
            attemptedCleanupCount: summary.attempted,
            failedCleanupCount: summary.failed,
        });
    }
    return summary;
};

const logAmbiguousTicketAttachmentRetention = (
    operation: 'create' | 'message_append',
    fileCount: number,
) => {
    if (fileCount === 0) return;
    logRuntimeFailure(
        'answerlattice_ticket_ambiguous_persistence_attachments_retained',
        new Error('persistence_outcome_ambiguous'),
        { operation, fileCount },
    );
};

const isPlatformTicketSession = (session: LoginUserType | null): boolean => {
    const platformRole = String(
        session?.platformRole
        || session?.user?.platformRole
        || session?.role
        || session?.user?.role
        || ''
    ).toUpperCase();
    return platformRole === MENULIST_PLATFORM_USER_ROLE || platformRole === MENULIST_PLATFORM_SUPPORT_USER_ROLE;
};

const isPlatformTicketAdminSession = (session: LoginUserType | null): boolean => {
    const platformRole = String(
        session?.platformRole
        || session?.user?.platformRole
        || session?.role
        || session?.user?.role
        || ''
    ).toUpperCase();
    return platformRole === MENULIST_PLATFORM_USER_ROLE;
};

const getSessionSupportTicketScope = (session: LoginUserType | null): NormalizedSupportTicketScope | undefined => {
    const scope = resolveAnswerlatticeSessionScope(session);
    return scope ? { tId: scope.tenantId, sId: scope.storeId } : undefined;
};

const getRequiredSessionSupportTicketScope = (session: LoginUserType | null): NormalizedSupportTicketScope => {
    const sessionScope = getSessionSupportTicketScope(session);
    if (!sessionScope) {
        throw new Error('Missing Answerlattice ticket scope');
    }

    return sessionScope;
};

const requireSupportTicketMutationContext = async (
    scope: SupportTicketMutationScope | undefined,
    operationCode: string,
): Promise<{ scope: NormalizedSupportTicketScope; session: LoginUserType }> => {
    const session = await getActiveSession();
    if (!session) throw new Error(`${operationCode}_session_missing`);
    await ensureFirebaseAuthForSession(session);
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

const requirePersistedTicket = (
    ticketId: string,
    value: unknown,
    scope: NormalizedSupportTicketScope,
): SupportTicketType => {
    const ticket = parseAnswerlatticeSupportTicketDocument({ id: ticketId, value, scope });
    if (!ticket) throw new Error('answerlattice_ticket_scope_or_schema_invalid');
    return ticket;
};

const getScopedTicketConstraints = (session: LoginUserType | null): QueryConstraint[] => {
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
const uploadImage = async (
    data: SupportTicketAttachmentUpload,
    type: 'documents' | 'messages',
    scope: NormalizedSupportTicketScope,
    stableId?: string,
) => {

    const docId = buildSupportTicketAttachmentFileId({
        attemptId: createRuntimeId('upload'),
        stableId,
        uid: data.uid,
    });

    // Generate tenant/store-scoped path for multi-tenancy isolation
    const path = generateStoragePath({
        collection: COLLECTION,
        fileType: type,
        session: scope,
        fileId: docId
    });

    // Upload to Firebase Storage
    return await uploadBase64ToStorage({
        cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
        fileId: docId,
        storage: answerlatticeStorage,
        url: data.url,
        path,
        type: data.type,
    });
}

export const addTicket = async (data: SupportTicketType) => {
    return await apiCallComposer(
        async () => {
            if (
                data.source !== undefined
                || data.knowledgeCandidate !== undefined
                || data.escalationContext !== undefined
                || data.widgetEscalation !== undefined
            ) {
                throw new Error('answerlattice_ticket_server_escalation_fields_forbidden');
            }
            if (Array.isArray(data.documents) && data.documents.length > ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT) {
                throw new Error('answerlattice_ticket_document_limit_reached');
            }
            const session = await getActiveSession();
            if (!session) throw new Error('support_ticket_create_session_missing');
            const actor = resolveAnswerlatticeSupportTicketActor(session);
            const initialStatus = Array.isArray(data.statuses) ? data.statuses[0] : undefined;
            const capturedLogs = getCapturedLogs();
            const clientDebugContext = getClientDebugContext();

            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                createdBy: actor,
                statuses: initialStatus ? [{ ...initialStatus, createdBy: actor }] : data.statuses,
                deleted: false,
                logs: capturedLogs,
                ...(clientDebugContext ? { clientDebugContext } : {}),
            }, { isNew: true });
            submitData.documents = [];
            const ticketScope = normalizeSupportTicketScope({
                tId: submitData.tId,
                sId: submitData.sId,
            });
            if (!ticketScope) throw new Error('answerlattice_ticket_create_scope_invalid');
            const files = Array.isArray(data.documents)
                ? data.documents.map(parseSupportTicketAttachmentUpload)
                : [];
            const uploadedTicketUrls: string[] = [];
            let docRef: Awaited<ReturnType<typeof addDoc>>;
            let persistenceAttempted = false;
            try {
                if (files.length) {
                    submitData.documents = files.map((document) => ({ ...document }));
                    for (let i = 0; i < files.length; i++) {
                        submitData.documents[i].url = await uploadImage(
                            files[i],
                            'documents',
                            ticketScope,
                        );
                        uploadedTicketUrls.push(submitData.documents[i].url);
                    }
                }
                if (!parseAnswerlatticeSupportTicketDocument({
                    id: 'pending-ticket-validation',
                    value: submitData,
                    scope: ticketScope,
                })) {
                    throw new Error('answerlattice_ticket_create_payload_invalid');
                }
                persistenceAttempted = true;
                docRef = await addDoc(getCollectionRef(), submitData);
            } catch (createError) {
                if (persistenceAttempted) {
                    logAmbiguousTicketAttachmentRetention('create', uploadedTicketUrls.length);
                } else {
                    await cleanupTicketAttachmentUrls(uploadedTicketUrls, 'create_pre_persist');
                }
                throw createError;
            }
            clearCapturedLogs(); // Clear only after the ticket is persisted successfully.
            const displayId = getDisplayId(docRef.id);

            // Browser-created tickets are manual support evidence. Server-owned
            // escalation paths emit their own deterministic escalation signal.
            void emitAnswerlatticeSignal({
                type: ANSWERLATTICE_SIGNAL_TYPE.TICKET,
                tId: submitData.tId,
                sId: submitData.sId,
                metadata: {
                    ticketId: docRef.id,
                    subject: data.subject,
                    category: data.category,
                    contextKeys: data.contextKeys || [],
                    priority: data.priority,
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
                    tId: submitData.tId,
                    sId: submitData.sId,
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

export const updateTicket = async (data: SupportTicketMutationInput) => {
    return await apiCallComposer(
        async () => {
            const ticketId = normalizeAnswerlatticeSupportTicketId(data?.id);
            if (!ticketId) throw new Error('answerlattice_ticket_id_invalid');
            const mutationContext = await requireSupportTicketMutationContext(data, 'support_ticket_update');
            const actor = resolveAnswerlatticeSupportTicketActor(mutationContext.session);
            const mutation = parseAnswerlatticeTicketMutation(data);
            const changedAt = Timestamp.now();
            const statusMessageId = createTimestampedRuntimeId('ticket_status', 12);

            const transactionResult = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const ticketRef = getDocRef(ticketId);
                const ticketSnapshot = await transaction.get(ticketRef);
                if (!ticketSnapshot.exists()) throw new Error('answerlattice_ticket_not_found');
                const currentTicket = requirePersistedTicket(
                    ticketId,
                    ticketSnapshot.data(),
                    mutationContext.scope,
                );

                const updateData: UpdateData<DocumentData> = {
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
                    statusChanged: mutation.status !== undefined && mutation.status !== currentTicket.status,
                    ticket: {
                        ...currentTicket,
                        ...updateData,
                        id: ticketId,
                        displayId: getDisplayId(ticketId),
                    } as SupportTicketType,
                };
            });

            if (transactionResult.statusChanged) {
                triggerNotification({
                    eventType: 'TICKET_STATUS_CHANGED',
                    ticketId,
                    tId: mutationContext.scope.tId,
                    sId: mutationContext.scope.sId,
                });
            }

            return transactionResult.ticket;
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
    attachments?: readonly unknown[],
    scope?: SupportTicketMutationScope,
) => {
    return await apiCallComposer(
        async () => {
            const normalizedTicketId = normalizeAnswerlatticeSupportTicketId(ticketId);
            if (!normalizedTicketId) throw new Error('answerlattice_ticket_id_invalid');
            const mutationContext = await requireSupportTicketMutationContext(scope, 'support_ticket_message');
            const actor = resolveAnswerlatticeSupportTicketActor(mutationContext.session);
            const messageId = normalizeAnswerlatticeSupportTicketId(message?.id);
            if (!messageId) throw new Error('answerlattice_ticket_message_id_invalid');
            const uploadedAttachmentUrls: string[] = [];
            const persistedMessage: TicketMessage = prepareAnswerlatticeTicketMessageForPersistence({
                ...message,
                id: messageId,
                sender: actor,
                timestamp: Timestamp.now(),
                attachments: undefined,
            });

            // Handle file uploads for attachments (same pattern as ticket documents)
            if (attachments?.length) {
                if (attachments.length > ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT) throw new Error('answerlattice_ticket_attachment_limit_reached');
                persistedMessage.attachments = [];
                try {
                    const parsedAttachments = attachments.map(parseSupportTicketAttachmentUpload);
                    for (let i = 0; i < parsedAttachments.length; i++) {
                        const attachment = parsedAttachments[i];
                        const uploadedUrl = await uploadImage(
                            attachment,
                            'messages',
                            mutationContext.scope,
                            `${normalizedTicketId}-${messageId}`,
                        );
                        uploadedAttachmentUrls.push(uploadedUrl);
                        persistedMessage.attachments.push({
                            url: uploadedUrl,
                            name: attachment.name,
                            type: attachment.type,
                            size: attachment.size,
                        });
                    }
                    parseAnswerlatticeTicketMessage(persistedMessage);
                } catch (uploadError) {
                    await cleanupTicketAttachmentUrls(uploadedAttachmentUrls, 'message_pre_persist');
                    throw uploadError;
                }
            }

            let inserted = false;
            let messageCount = 0;
            let shouldNotify = false;
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
                        return {
                            inserted: false,
                            message: existingMessage,
                            messageCount: currentMessages.length,
                            shouldNotify: false,
                        };
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
                    const recipientEmail = String(currentTicket.clientDetails?.email || '').trim().toLowerCase();
                    return {
                        inserted: true,
                        message: persistedMessage,
                        messageCount: updatedMessages.length,
                        shouldNotify: Boolean(
                            recipientEmail
                            && actor.email
                            && recipientEmail !== actor.email
                            && persistedMessage.type !== 'system'
                        ),
                    };
                });
                inserted = transactionResult.inserted;
                messageCount = transactionResult.messageCount;
                shouldNotify = transactionResult.shouldNotify;
                if (!inserted && uploadedAttachmentUrls.length > 0) {
                    const existingUrls = new Set((transactionResult.message.attachments || []).map((item) => item.url));
                    await cleanupTicketAttachmentUrls(
                        uploadedAttachmentUrls.filter((url) => !existingUrls.has(url)),
                        'message_duplicate',
                    );
                }
            } catch (transactionError) {
                logAmbiguousTicketAttachmentRetention('message_append', uploadedAttachmentUrls.length);
                let authContext: Record<string, boolean | number> = {};
                try {
                    const currentUser = answerlatticeAuth?.currentUser;
                    const token = await currentUser?.getIdTokenResult();
                    authContext = {
                        authUserPresent: Boolean(currentUser),
                        actorMatchesAuthUid: currentUser?.uid === actor.id,
                        actorMatchesClaimUserId: String(token?.claims?.uId || '') === actor.id,
                        authProductMatches: token?.claims?.pId === PRODUCT_IDS.ANSWERLATTICE,
                        authStoreMatches: String(token?.claims?.storeId || '') === String(mutationContext.scope.sId),
                        authTenantMatches: String(token?.claims?.tenantId || '') === String(mutationContext.scope.tId),
                    };
                } catch {
                    authContext = { authContextReadable: false };
                }
                logRuntimeFailure('answerlattice_ticket_message_persist_failed', transactionError, {
                    ...authContext,
                    actorIdLength: actor.id.length,
                    attachmentCount: uploadedAttachmentUrls.length,
                    messageCountBeforeAppend: messageCount,
                    ticketIdLength: normalizedTicketId.length,
                }, { developmentOnly: true });
                throw transactionError;
            }

            // Notification: ticket reply (fire-and-forget)
            // Only notify when the sender is NOT the ticket creator (i.e., support agent replied)
            if (inserted && shouldNotify) {
                triggerNotification({
                    eventType: 'TICKET_REPLY',
                    ticketId,
                    messageId: persistedMessage.id,
                    tId: mutationContext.scope.tId,
                    sId: mutationContext.scope.sId,
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
    _currentStatuses: readonly unknown[],
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

export const deleteTicket = async (data: SupportTicketMutationInput) => {
    return await apiCallComposer(
        async (): Promise<null> => {
            const ticketId = normalizeAnswerlatticeSupportTicketId(data?.id);
            if (!ticketId) throw new Error('answerlattice_ticket_id_invalid');
            const mutationContext = await requireSupportTicketMutationContext(data, 'support_ticket_delete');
            if (!isPlatformTicketAdminSession(mutationContext.session)) {
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
            const attachmentUrls = collectTicketAttachmentUrls(persistedTicket || {}, mutationContext.scope);
            await cleanupTicketAttachmentUrls(attachmentUrls, 'ticket_delete');
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

export const restoreTicket = async (data: SupportTicketMutationInput) => {
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
            const list: SupportTicketType[] = [];
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

import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { ECOMSAI_PLATFORM_SUPPORT_USER_ROLE, ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, Timestamp, where, type QueryConstraint } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { emitAnswerlatticeSignal } from "@lib/answerlattice/signalEmitter";
import { answerlatticeFirebaseClient, answerlatticeStorage } from "@lib/firebase/answerlatticeFirebaseClient";
import { clearCapturedLogs, getCapturedLogs, getClientDebugContext } from "@lib/localLogs/localLogsTracker";
import { triggerNotification } from "@lib/notifications/client";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { generateStoragePath } from "@lib/storage/pathGenerator";
import { ANSWERLATTICE_SIGNAL_TYPE } from "@type/answerlattice";
import { UserUploadedFileType } from "@type/common";
import { SupportTicketType, TicketMessage } from "@type/supportTicket";
import { addDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.SUPPORT_TICKETS;
const STORE_TICKETS_LIMIT = 100;
const PLATFORM_TICKETS_LIMIT = 500;

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
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
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

const getSessionSupportTicketScope = (session: any): NormalizedSupportTicketScope | undefined => normalizeSupportTicketScope({
    tId: session?.tId ?? session?.user?.tenantId,
    sId: session?.sId ?? session?.user?.storeId,
});

const requireSupportTicketMutationScope = async (
    scope: SupportTicketMutationScope | undefined,
    operationCode: string,
): Promise<NormalizedSupportTicketScope | undefined> => {
    const session = await getActiveSession();
    const ticketScope = normalizeSupportTicketScope(scope);

    if (isPlatformTicketSession(session)) {
        return ticketScope;
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

    return ticketScope;
};

const applySupportTicketMutationScope = (
    updateData: Record<string, any>,
    scope: NormalizedSupportTicketScope | undefined,
) => {
    if (scope) {
        updateData.tId = scope.tId;
        updateData.sId = scope.sId;
        return updateData;
    }

    delete updateData.tId;
    delete updateData.sId;
    return updateData;
};

const getScopedTicketConstraints = (session: any): QueryConstraint[] => {
    if (isPlatformTicketSession(session)) return [];

    const tId = Number(session?.tId ?? session?.user?.tenantId);
    const sId = Number(session?.sId ?? session?.user?.storeId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId)) {
        throw new Error('Missing Answerlattice ticket scope');
    }

    return [
        where("tId", "==", tId),
        where("sId", "==", sId),
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

    constraints.push(orderBy("createdOn", "desc"), limit(maxResults));
    return query(getCollectionRef(), ...constraints);
};

const buildDeletedSupportTicketsQuery = async (maxResults = 100) => {
    const session = await getActiveSession();
    const constraints: QueryConstraint[] = [
        ...getScopedTicketConstraints(session),
        where("deleted", "==", true),
        orderBy("createdOn", "desc"),
        limit(maxResults),
    ];

    return query(getCollectionRef(), ...constraints);
};

/**
 * Upload ticket file to Firebase Storage with tenant/store isolation
 * @param data - File data with base64 content
 * @param type - File category (e.g., 'documents', 'messages')
 */
const uploadImage = async (data: UserUploadedFileType, type = 'documents') => {

    let uploadedUrl: any = '';
    const docId = `${new Date().getTime()}-${data.uid}`;

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
            const capturedLogs = getCapturedLogs();
            const clientDebugContext = getClientDebugContext();

            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                deleted: false,
                logs: capturedLogs,
                ...(clientDebugContext ? { clientDebugContext } : {}),
            });
            delete submitData.documents;
            const files = data.documents?.filter(doc => doc.url.includes('base64')) || [];
            if (files.length) {
                submitData.documents = data.documents;
                for (let i = 0; i < data.documents.length; i++) {
                    submitData.documents[i].url = await uploadImage(data.documents[i], 'documents')
                }
            }
            const docRef = await addDoc(getCollectionRef(), submitData);
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

            emitAnswerlatticeSignal({
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
            });

            // Notification: ticket creation confirmation (fire-and-forget)
            if (data.clientDetails?.email) {
                triggerNotification({
                    eventType: 'TICKET_CREATED',
                    recipientEmail: data.clientDetails.email,
                    recipientName: data.clientDetails.storeName || undefined,
                    referenceId: `ticket-created-${docRef.id}`,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    metadata: {
                        ticketId: docRef.id,
                        ticketDisplayId: displayId,
                        ticketSubject: data.subject,
                        category: data.category,
                        priority: data.priority,
                    },
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
            const mutationScope = await requireSupportTicketMutationScope(data, 'support_ticket_update');
            const updateData = await answerlatticeRequestBodyComposer(data);
            applySupportTicketMutationScope(updateData, mutationScope);

            const files = data.documents?.filter(doc => doc.url.includes('base64')) || [];
            if (files.length) {
                for (let i = 0; i < data.documents.length; i++) {
                    updateData.documents[i].url = await uploadImage(data.documents[i], 'documents')
                }
            }

            await setDoc(getDocRef(data.id), updateData, { merge: true });
            return updateData;
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
    currentMessages: TicketMessage[],
    message: TicketMessage,
    attachments?: any[],
    scope?: SupportTicketMutationScope,
) => {
    return await apiCallComposer(
        async () => {
            const mutationScope = await requireSupportTicketMutationScope(scope, 'support_ticket_message');

            // Handle file uploads for attachments (same pattern as ticket documents)
            if (attachments?.length) {
                message.attachments = [];
                for (let i = 0; i < attachments.length; i++) {
                    const uploadedUrl = await uploadImage(attachments[i], 'messages');
                    message.attachments.push({
                        url: uploadedUrl,
                        name: attachments[i].name,
                        type: attachments[i].type,
                        size: attachments[i].size
                    });
                }
            }

            // Guard: prevent unbounded message array growth (Firestore 1MB doc limit)
            const MAX_TICKET_MESSAGES = 500;
            if (currentMessages.length >= MAX_TICKET_MESSAGES) {
                throw new Error(`Ticket has reached maximum ${MAX_TICKET_MESSAGES} messages. Please create a new ticket.`);
            }

            // Add message to messages array (passed from parent, no DB read needed)
            const updatedMessages = [...currentMessages, message];

            // Update ticket with new message ONLY (requestBodyComposer adds timestamps)
            // No logs - only send logs on initial ticket creation
            const updateData = await answerlatticeRequestBodyComposer({
                messages: updatedMessages,
                ...(mutationScope ? mutationScope : {}),
            });
            applySupportTicketMutationScope(updateData, mutationScope);

            const ticketRef = getDocRef(ticketId);
            await setDoc(ticketRef, updateData, { merge: true });

            // Notification: ticket reply (fire-and-forget)
            // Only notify when the sender is NOT the ticket creator (i.e., support agent replied)
            const notifyEmail = (message as any)._notifyEmail;
            if (message.sender?.email && message.type !== 'system' && notifyEmail) {
                triggerNotification({
                    eventType: 'TICKET_REPLY',
                    recipientEmail: notifyEmail,
                    recipientName: (message as any)._notifyName || undefined,
                    referenceId: `ticket-reply-${ticketId}-${message.id}`,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    metadata: {
                        ticketId,
                        ticketSubject: (message as any)._ticketSubject || 'Support Request',
                        replyPreview: message.text?.slice(0, 300) || '',
                        replierName: message.sender.name,
                    },
                });
            }

            return {
                ticketId,
                messageId: message.id,
                success: true,
                messageCount: updatedMessages.length,
                attachmentCount: message.attachments?.length || 0,
                message,
            } satisfies SupportTicketMessageAddResult;
        },
        { ticketId, currentMessages, message, attachments },
        "addTicketMessage"
    );
}

export const updateTicketStatus = async (
    ticketId: string,
    currentStatuses: any[],
    newStatus: string,
    remark: string = '',
    changedBy: { id: string, name: string, email: string },
    scope?: SupportTicketMutationScope,
) => {
    return await apiCallComposer(
        async () => {
            const mutationScope = await requireSupportTicketMutationScope(scope, 'support_ticket_status');

            // Create new status entry for audit trail
            const newStatusEntry = {
                status: newStatus,
                timestamp: Timestamp.now(),
                createdBy: changedBy,
                remark: remark || `Status changed to ${newStatus}`
            };

            // Add to statuses array (passed from parent, no DB read needed)
            const updatedStatuses = [...currentStatuses, newStatusEntry];

            // Update both status field and statuses array (requestBodyComposer adds timestamps)
            // No logs - only send logs on initial ticket creation
            const updateData = await answerlatticeRequestBodyComposer({
                status: newStatus,
                statuses: updatedStatuses,
                ...(mutationScope ? mutationScope : {}),
            });
            applySupportTicketMutationScope(updateData, mutationScope);

            const ticketRef = getDocRef(ticketId);
            await setDoc(ticketRef, updateData, { merge: true });

            // Notification: ticket status changed (fire-and-forget)
            // _notifyEmail is set by the calling component with the ticket creator's email
            const notifyEmail = (changedBy as any)._notifyEmail;
            if (notifyEmail) {
                triggerNotification({
                    eventType: 'TICKET_STATUS_CHANGED',
                    recipientEmail: notifyEmail,
                    recipientName: (changedBy as any)._notifyName || undefined,
                    referenceId: `ticket-status-${ticketId}-${newStatus}-${Date.now()}`,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    skipDedup: true,
                    metadata: {
                        ticketId,
                        ticketSubject: (changedBy as any)._ticketSubject || 'Support Request',
                        newStatus,
                        remark,
                        changedByName: changedBy.name,
                    },
                });
            }

            return {
                ticketId,
                success: true,
                status: newStatus,
                statusCount: updatedStatuses.length,
                statusEntry: newStatusEntry,
            } satisfies SupportTicketStatusUpdateResult;
        },
        { ticketId, currentStatuses, newStatus, remark, changedBy },
        "updateTicketStatus"
    );
}

export const deleteTicket = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(data.id);
            const ticketSnap = await getDoc(docRef);
            const persistedTicket = ticketSnap.exists() ? ticketSnap.data() as Partial<SupportTicketType> : {};
            const attachmentUrls = collectTicketAttachmentUrls({
                ...persistedTicket,
                ...data,
                documents: data.documents || persistedTicket.documents,
                messages: data.messages || persistedTicket.messages,
            });
            await Promise.allSettled(
                attachmentUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage))
            );
            await deleteDoc(docRef);
            return null;
        },
        data,
        "deleteTicket"
    );
}

export const submitTicketSatisfaction = async (ticketId: string, rating: number, comment?: string) => {
    return await apiCallComposer(
        async () => {
            const satisfaction = {
                rating,
                comment: comment || '',
                submittedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
            };
            const updateData = await answerlatticeRequestBodyComposer({ satisfaction });
            const ticketRef = getDocRef(ticketId);
            await setDoc(ticketRef, updateData, { merge: true });
            return satisfaction;
        },
        { ticketId, rating, comment },
        "submitTicketSatisfaction"
    );
};

export const restoreTicket = async (data: any) => {
    return await updateTicket({ ...data, deleted: false });
}

export const getTicketById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id, displayId: getDisplayId(docSnap.id) };
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
        const unsubscribe = onSnapshot(
            getDocRef(id),
            (docSnap) => {
                if (docSnap.exists()) {
                    onUpdate({ ...docSnap.data(), id: docSnap.id, displayId: getDisplayId(docSnap.id) } as SupportTicketType);
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
            const q = query(
                getCollectionRef(),
                where("tId", "==", session.tId),
                where("sId", "==", session.sId),
                where("deleted", "==", false), // ✅ Filter at database level
                orderBy("createdOn", "desc"),
                limit(maxResults)
            );

            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data(), displayId: getDisplayId(doc.id) });
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
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data(), displayId: getDisplayId(doc.id) });
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
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data(), displayId: getDisplayId(doc.id) });
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
        const q = await buildSupportTicketsQuery(includeDeleted, PLATFORM_TICKETS_LIMIT);

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const list: SupportTicketType[] = [];
                querySnapshot.forEach((doc) => {
                    list.push({ id: doc.id, ...doc.data(), displayId: getDisplayId(doc.id) } as SupportTicketType);
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
        const q = query(
            getCollectionRef(),
            where("tId", "==", session.tId),
            where("sId", "==", session.sId),
            where("deleted", "==", false), // ✅ Filter at database level
            orderBy("createdOn", "desc"),
            limit(maxResults)
        );

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const list: SupportTicketType[] = [];
                querySnapshot.forEach((doc) => {
                    list.push({ id: doc.id, ...doc.data(), displayId: getDisplayId(doc.id) } as SupportTicketType);
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

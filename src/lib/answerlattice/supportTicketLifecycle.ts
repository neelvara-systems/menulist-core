import { PRODUCT_IDS } from '@constant/product';
import { parseAnswerlatticeEscalationContext } from '@lib/answerlattice/escalationTypes';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import {
    PLATFORM_SUPPORT_TICKET_TAG_OPTIONS,
    SUPPORT_TICKET_CATEGORY,
    SUPPORT_TICKET_PRIORITY,
    SUPPORT_TICKET_STATUS,
    type SupportTicketDocument,
    type SupportTicketType,
    type TicketMessage,
} from '@type/supportTicket';
import {
    ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT,
    ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES,
} from '@lib/answerlattice/supportTicketAttachmentBoundary';
import { z } from 'zod';

export const ANSWERLATTICE_TICKET_MESSAGE_LIMIT = 50;
export const ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT = 25;
export const ANSWERLATTICE_TICKET_DOCUMENT_LIMIT = ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT;

const TicketStatusSchema = z.enum([
    SUPPORT_TICKET_STATUS.OPEN,
    SUPPORT_TICKET_STATUS.IN_PROGRESS,
    SUPPORT_TICKET_STATUS.RESOLVED,
    SUPPORT_TICKET_STATUS.CLOSED,
    SUPPORT_TICKET_STATUS.RE_OPENED,
]);
const TicketPrioritySchema = z.enum([
    SUPPORT_TICKET_PRIORITY.LOW,
    SUPPORT_TICKET_PRIORITY.NORMAL,
    SUPPORT_TICKET_PRIORITY.HIGH,
]);
const TicketCategorySchema = z.enum([
    SUPPORT_TICKET_CATEGORY.TECHNICAL_ISSUE,
    SUPPORT_TICKET_CATEGORY.BILLING_INQUIRY,
    SUPPORT_TICKET_CATEGORY.GENERAL_QUESTION,
    SUPPORT_TICKET_CATEGORY.CONTENT_MENU_UPDATE,
    SUPPORT_TICKET_CATEGORY.FEATURE_SUGGESTION,
    SUPPORT_TICKET_CATEGORY.ACCOUNT_LOGIN_HELP,
    SUPPORT_TICKET_CATEGORY.OTHER,
]);

const TicketMutableFieldsSchema = z.object({
    status: TicketStatusSchema.optional(),
    priority: TicketPrioritySchema.optional(),
    category: TicketCategorySchema.optional(),
    platformNotes: z.string().max(4000).optional(),
    platformTags: z.array(z.enum(PLATFORM_SUPPORT_TICKET_TAG_OPTIONS)).max(20).optional(),
    contextKeys: z.array(z.string().trim().min(1).max(140).regex(/^[A-Za-z0-9_.:/-]+$/)).max(20).optional(),
    deleted: z.boolean().optional(),
}).strict();

const ALLOWED_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
    [SUPPORT_TICKET_STATUS.OPEN]: new Set([
        SUPPORT_TICKET_STATUS.IN_PROGRESS,
        SUPPORT_TICKET_STATUS.RESOLVED,
        SUPPORT_TICKET_STATUS.CLOSED,
    ]),
    [SUPPORT_TICKET_STATUS.IN_PROGRESS]: new Set([
        SUPPORT_TICKET_STATUS.OPEN,
        SUPPORT_TICKET_STATUS.RESOLVED,
        SUPPORT_TICKET_STATUS.CLOSED,
    ]),
    [SUPPORT_TICKET_STATUS.RESOLVED]: new Set([
        SUPPORT_TICKET_STATUS.RE_OPENED,
        SUPPORT_TICKET_STATUS.CLOSED,
    ]),
    [SUPPORT_TICKET_STATUS.CLOSED]: new Set([
        SUPPORT_TICKET_STATUS.RE_OPENED,
    ]),
    [SUPPORT_TICKET_STATUS.RE_OPENED]: new Set([
        SUPPORT_TICKET_STATUS.IN_PROGRESS,
        SUPPORT_TICKET_STATUS.RESOLVED,
        SUPPORT_TICKET_STATUS.CLOSED,
    ]),
};

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const normalizeAnswerlatticeSupportTicketId = (value: unknown): string | null => {
    const raw = typeof value === 'string' ? value : '';
    const ticketId = raw.trim();
    return ticketId === raw && ticketId.length <= 180 && isValidFirestoreDocumentId(ticketId)
        ? ticketId
        : null;
};

const ANSWERLATTICE_WIDGET_ESCALATION_TICKET_PREFIX = 'alwe_';

export const getAnswerlatticeSupportTicketDisplayId = (value: unknown): string => {
    const id = normalizeAnswerlatticeSupportTicketId(value);
    if (!id) return '';
    if (id.startsWith(ANSWERLATTICE_WIDGET_ESCALATION_TICKET_PREFIX)) {
        const hashReference = id.slice(
            ANSWERLATTICE_WIDGET_ESCALATION_TICKET_PREFIX.length,
            ANSWERLATTICE_WIDGET_ESCALATION_TICKET_PREFIX.length + 8,
        );
        if (hashReference.length === 8) return `WE-${hashReference.toUpperCase()}`;
    }
    return id.slice(0, 6).toUpperCase();
};

export const parseAnswerlatticeTicketMutation = (value: unknown): z.infer<typeof TicketMutableFieldsSchema> => {
    const input = isRecord(value) ? value : {};
    const projected: Record<string, unknown> = {};
    Object.keys(TicketMutableFieldsSchema.shape).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(input, key)) projected[key] = input[key];
    });
    const parsed = TicketMutableFieldsSchema.safeParse(projected);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
        throw new Error('answerlattice_ticket_mutation_invalid');
    }
    return parsed.data;
};

export const isAnswerlatticeTicketStatusTransitionAllowed = (
    currentStatus: unknown,
    nextStatus: unknown,
): boolean => {
    const current = TicketStatusSchema.safeParse(currentStatus);
    const next = TicketStatusSchema.safeParse(nextStatus);
    if (!current.success || !next.success) return false;
    return current.data === next.data || Boolean(ALLOWED_STATUS_TRANSITIONS[current.data]?.has(next.data));
};

export const isAnswerlatticeTicketInScope = (
    value: unknown,
    scope: { tId: number; sId: number },
): value is Record<string, any> => {
    if (!isRecord(value)) return false;
    return value.pId === PRODUCT_IDS.ANSWERLATTICE
        && normalizeAnswerlatticeScopeDocumentId(value.tId) === scope.tId
        && normalizeAnswerlatticeScopeDocumentId(value.sId) === scope.sId;
};

const isTicketMessage = (value: unknown): value is TicketMessage => {
    if (!isRecord(value) || !isRecord(value.sender)) return false;
    if (!normalizeAnswerlatticeSupportTicketId(value.id)) return false;
    if (typeof value.text !== 'string' || value.text.length > 2000) return false;
    if (value.type !== undefined && value.type !== 'user' && value.type !== 'system') return false;
    if (typeof value.sender.id !== 'string' || value.sender.id.length > 180) return false;
    if (typeof value.sender.name !== 'string' || value.sender.name.length > 200) return false;
    if (typeof value.sender.email !== 'string' || value.sender.email.length > 254) return false;
    if (!value.timestamp || typeof value.timestamp !== 'object') return false;
    if (value.attachments !== undefined) {
        if (!Array.isArray(value.attachments) || value.attachments.length > 4) return false;
        if (!value.attachments.every((attachment: unknown) => (
            isRecord(attachment)
            && typeof attachment.url === 'string'
            && attachment.url.length > 0
            && attachment.url.length <= 2000
            && typeof attachment.name === 'string'
            && attachment.name.length > 0
            && attachment.name.length <= 300
            && typeof attachment.type === 'string'
            && attachment.type.length > 0
            && attachment.type.length <= 120
            && typeof attachment.size === 'number'
            && Number.isSafeInteger(attachment.size)
            && attachment.size >= 0
            && attachment.size <= ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES
        ))) return false;
    }
    return true;
};

const isTicketStatusEntry = (value: unknown): value is SupportTicketType['statuses'][number] => (
    isRecord(value)
    && TicketStatusSchema.safeParse(value.status).success
    && Boolean(value.timestamp && typeof value.timestamp === 'object')
    && isRecord(value.createdBy)
    && typeof value.createdBy.id === 'string'
    && value.createdBy.id.length <= 180
    && typeof value.createdBy.name === 'string'
    && value.createdBy.name.length <= 200
    && typeof value.createdBy.email === 'string'
    && value.createdBy.email.length <= 254
    && typeof value.remark === 'string'
    && value.remark.length <= 2000
);

const isTicketDocument = (value: unknown): value is SupportTicketDocument => (
    isRecord(value)
    && typeof value.url === 'string'
    && value.url.length > 0
    && value.url.length <= 2000
    && typeof value.name === 'string'
    && value.name.length > 0
    && value.name.length <= 300
    && typeof value.type === 'string'
    && value.type.length > 0
    && value.type.length <= 120
    && typeof value.size === 'number'
    && Number.isSafeInteger(value.size)
    && value.size >= 0
    && value.size <= ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES
    && (
        value.uid === undefined
        || (typeof value.uid === 'string' && value.uid.length > 0 && value.uid.length <= 180)
    )
);

const isWidgetEscalationMetadata = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    const keys = Object.keys(value);
    return keys.every((key) => [
        'searchHistoryId',
        'replyEmail',
        'submittedName',
        'detailsProvided',
    ].includes(key))
        && typeof value.searchHistoryId === 'string'
        && value.searchHistoryId.length > 0
        && value.searchHistoryId.length <= 180
        && typeof value.replyEmail === 'string'
        && value.replyEmail.length > 0
        && value.replyEmail.length <= 254
        && value.replyEmail.includes('@')
        && (
            value.submittedName === undefined
            || (
                typeof value.submittedName === 'string'
                && value.submittedName.length > 0
                && value.submittedName.length <= 160
            )
        )
        && typeof value.detailsProvided === 'boolean';
};

export const parseAnswerlatticeTicketMessage = (value: unknown): TicketMessage => {
    if (!isTicketMessage(value)) throw new Error('answerlattice_ticket_message_invalid');
    return value;
};

export const parseAnswerlatticeSupportTicketDocument = (params: {
    id: string;
    value: unknown;
    scope?: { tId: number; sId: number };
}): SupportTicketType | null => {
    const id = normalizeAnswerlatticeSupportTicketId(params.id);
    if (!id || !isRecord(params.value)) return null;
    const tId = normalizeAnswerlatticeScopeDocumentId(params.value.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(params.value.sId);
    if (
        params.value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || !tId
        || !sId
        || (params.scope && (params.scope.tId !== tId || params.scope.sId !== sId))
        || typeof params.value.subject !== 'string'
        || params.value.subject.length > 300
        || !TicketStatusSchema.safeParse(params.value.status).success
        || !TicketPrioritySchema.safeParse(params.value.priority).success
        || !TicketCategorySchema.safeParse(params.value.category).success
    ) return null;

    const messages = Array.isArray(params.value.messages) ? params.value.messages : [];
    const statuses = Array.isArray(params.value.statuses) ? params.value.statuses : [];
    const documents = Array.isArray(params.value.documents) ? params.value.documents : [];
    const source = params.value.source;
    const escalationContext = parseAnswerlatticeEscalationContext(params.value.escalationContext);
    const hasServerEscalationFields = (
        params.value.escalationContext !== undefined
        || params.value.knowledgeCandidate !== undefined
        || params.value.widgetEscalation !== undefined
    );
    if (
        messages.length > ANSWERLATTICE_TICKET_MESSAGE_LIMIT
        || !messages.every(isTicketMessage)
        || statuses.length > ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT
        || !statuses.every(isTicketStatusEntry)
        || documents.length > ANSWERLATTICE_TICKET_DOCUMENT_LIMIT
        || !documents.every(isTicketDocument)
        || (source !== undefined && source !== 'manual' && source !== 'ai_escalation')
        || (
            source === 'ai_escalation'
            && (
                params.value.knowledgeCandidate !== true
                || !escalationContext
                || (
                    params.value.widgetEscalation !== undefined
                    && !isWidgetEscalationMetadata(params.value.widgetEscalation)
                )
            )
        )
        || (source !== 'ai_escalation' && hasServerEscalationFields)
    ) return null;

    return {
        ...params.value,
        id,
        displayId: getAnswerlatticeSupportTicketDisplayId(id),
        tId,
        sId,
        messages,
        statuses,
        documents,
        ...(source ? { source } : {}),
        ...(escalationContext ? { escalationContext } : {}),
        platformNotes: typeof params.value.platformNotes === 'string' ? params.value.platformNotes : '',
        platformTags: Array.isArray(params.value.platformTags) ? params.value.platformTags.slice(0, 20) : [],
    } as SupportTicketType;
};

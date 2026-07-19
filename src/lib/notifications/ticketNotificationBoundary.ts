import { PRODUCT_IDS } from '@constant/product';
import {
    getAnswerlatticeSupportTicketDisplayId,
    normalizeAnswerlatticeSupportTicketId,
} from '@lib/answerlattice/supportTicketLifecycle';
import type { NotificationPayload } from '@lib/notifications';
import type { SupportTicketType } from '@type/supportTicket';

export const CLIENT_TICKET_NOTIFICATION_EVENTS = [
    'TICKET_CREATED',
    'TICKET_REPLY',
    'TICKET_STATUS_CHANGED',
] as const;

export type ClientTicketNotificationEvent = typeof CLIENT_TICKET_NOTIFICATION_EVENTS[number];

const normalizeBoundedText = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
};

const normalizeRecipientEmail = (value: unknown): string | null => {
    const email = normalizeBoundedText(value, 254)?.toLowerCase() || null;
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

export type TicketNotificationProjectionResult =
    | { ok: true; payload: NotificationPayload }
    | { ok: false; reason: 'invalid_recipient' | 'invalid_ticket' | 'message_not_found' | 'message_required' | 'status_not_found' };

export function projectTicketNotification(params: {
    eventType: ClientTicketNotificationEvent;
    messageId?: string;
    ticket: SupportTicketType;
}): TicketNotificationProjectionResult {
    const ticketId = normalizeAnswerlatticeSupportTicketId(params.ticket.id);
    const recipientEmail = normalizeRecipientEmail(params.ticket.clientDetails?.email);
    const ticketSubject = normalizeBoundedText(params.ticket.subject, 300);
    if (!ticketId || !ticketSubject) return { ok: false, reason: 'invalid_ticket' };
    if (!recipientEmail) return { ok: false, reason: 'invalid_recipient' };

    const recipientName = normalizeBoundedText(params.ticket.clientDetails?.storeName, 120) || undefined;
    const baseMetadata = {
        ticketId,
        ticketDisplayId: getAnswerlatticeSupportTicketDisplayId(ticketId),
        ticketSubject,
    };

    if (params.eventType === 'TICKET_CREATED') {
        return {
            ok: true,
            payload: {
                eventType: params.eventType,
                recipientEmail,
                recipientName,
                referenceId: `ticket-created-${ticketId}`,
                productId: PRODUCT_IDS.ANSWERLATTICE,
                metadata: {
                    ...baseMetadata,
                    category: normalizeBoundedText(params.ticket.category, 120) || 'General',
                    priority: normalizeBoundedText(params.ticket.priority, 80) || 'Normal',
                },
            },
        };
    }

    if (params.eventType === 'TICKET_REPLY') {
        const messageId = normalizeAnswerlatticeSupportTicketId(params.messageId);
        if (!messageId) return { ok: false, reason: 'message_required' };
        const message = (params.ticket.messages || []).find((candidate) => candidate.id === messageId);
        const senderEmail = normalizeRecipientEmail(message?.sender?.email);
        if (!message || message.type === 'system' || senderEmail === recipientEmail) {
            return { ok: false, reason: 'message_not_found' };
        }
        return {
            ok: true,
            payload: {
                eventType: params.eventType,
                recipientEmail,
                recipientName,
                referenceId: `ticket-reply-${ticketId}-${messageId}`,
                productId: PRODUCT_IDS.ANSWERLATTICE,
                metadata: {
                    ...baseMetadata,
                    replyPreview: message.text.slice(0, 300),
                    replierName: normalizeBoundedText(message.sender?.name, 200) || 'Support',
                },
            },
        };
    }

    const statuses = Array.isArray(params.ticket.statuses) ? params.ticket.statuses : [];
    const status = statuses[statuses.length - 1];
    if (!status) return { ok: false, reason: 'status_not_found' };
    const newStatus = normalizeBoundedText(status.status, 80);
    if (!newStatus) return { ok: false, reason: 'status_not_found' };
    return {
        ok: true,
        payload: {
            eventType: params.eventType,
            recipientEmail,
            recipientName,
            referenceId: `ticket-status-${ticketId}-${statuses.length}-${newStatus}`,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            metadata: {
                ...baseMetadata,
                newStatus,
                remark: normalizeBoundedText(status.remark, 2_000) || '',
                changedByName: normalizeBoundedText(status.createdBy?.name, 200) || 'Support',
            },
        },
    };
}

/**
 * Canonica — Signal Emitter
 * 
 * Fire-and-forget helper for emitting friction signals from existing flows:
 * - Ticket creation → TICKET signal
 * - Chat negative feedback → CHAT_NEGATIVE signal
 * - Escalation events → ESCALATION signal
 * - Help Center feedback → FEEDBACK signal
 * 
 * RULES:
 * - Gated by ENABLE_CANONICA_SIGNAL_MUTATION feature flag
 * - Non-blocking: errors are logged, never thrown
 * - Uses dynamic import to avoid bundling Canonica DAL when flag is off
 * - entityId defaults to 'unresolved' (mutation engine resolves later)
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { CanonicaSignalType } from '@type/canonica';
import { TicketMessage } from '@type/supportTicket';
import { Timestamp } from 'firebase/firestore';

interface EmitSignalParams {
    type: CanonicaSignalType;
    entityId?: string;
    tId?: number;
    sId?: number;
    metadata?: Record<string, any>;
}

// Deduplication: prevent same signal from being emitted twice in the same page session.
// Key format: "{type}_{sessionId}_{messageId}" or "{type}_{ticketId}"
// Cleared on page reload (in-memory only — no persistence needed).
const emittedSignals = new Set<string>();

const createTraceId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `cn_${crypto.randomUUID()}`;
    }
    return `cn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const cleanSignalText = (value: unknown, maxLength = 500): string => (
    String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
);

const stringifySignalValue = (value: unknown): string => {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const sanitizeSignalMetadataValue = (value: unknown, depth = 0): any => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return cleanSignalText(value, 500);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (depth >= 3) return cleanSignalText(stringifySignalValue(value).slice(0, 500), 500);
    if (Array.isArray(value)) {
        return value
            .slice(0, 20)
            .map((item) => {
                if (typeof item === 'string') return cleanSignalText(item, 180);
                if (typeof item === 'number' || typeof item === 'boolean' || item === null) return item;
                return cleanSignalText(stringifySignalValue(item).slice(0, 500), 500);
            });
    }
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .slice(0, 12)
            .map(([key, nested]) => [cleanSignalText(key, 80), sanitizeSignalMetadataValue(nested, depth + 1)])
            .filter(([key]) => Boolean(key)));
    }
    return cleanSignalText(value, 200);
};

const sanitizeSignalMetadata = (metadata: unknown): Record<string, any> => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
    return Object.fromEntries(Object.entries(metadata as Record<string, unknown>)
        .slice(0, 30)
        .map(([key, value]) => [cleanSignalText(key, 80), sanitizeSignalMetadataValue(value)])
        .filter(([key]) => Boolean(key)));
};

const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, sanitizeForFirestore(nestedValue)])
        );
    }
    return value;
};

const emitServerSignalEvent = async (params: EmitSignalParams & { tId: number; sId: number }) => {
    const { canonicaFirestoreAdmin } = await import('@lib/firebase/canonicaFirebaseAdmin');
    if (!canonicaFirestoreAdmin || typeof canonicaFirestoreAdmin.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }

    const now = new Date();
    const traceId = createTraceId();
    const createdBy = cleanSignalText(params.metadata?.source || 'system:canonica_signal', 140) || 'system:canonica_signal';
    const uId = cleanSignalText(params.metadata?.userId || 'system', 140) || 'system';
    await canonicaFirestoreAdmin.collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS).add(sanitizeForFirestore({
        pId: PRODUCT_IDS.CANONICA,
        tId: params.tId,
        sId: params.sId,
        entityId: params.entityId || 'unresolved',
        type: params.type,
        timestamp: now,
        metadata: sanitizeSignalMetadata(params.metadata),
        createdOn: now,
        modifiedOn: now,
        createdBy,
        modifiedBy: createdBy,
        uId,
        traceId,
        requestId: traceId,
    }));
};

function getDeduplicationKey(params: EmitSignalParams): string | null {
    const meta = params.metadata;
    if (!meta) return null;

    if (params.type === 'chat_negative' && meta.sessionId && meta.messageId) {
        return `chat_${meta.sessionId}_${meta.messageId}`;
    }
    if (params.type === 'chat_negative' && meta.searchHistoryId) {
        return `chat_history_${meta.searchHistoryId}`;
    }
    if (params.type === 'ticket' && meta.ticketId) {
        if (meta.signalPurpose === 'ticket_resolution' || Array.isArray(meta.resolutionMessages)) {
            return `ticket_resolution_${meta.ticketId}`;
        }
        return `ticket_${meta.ticketId}`;
    }
    if (params.type === 'feedback' && meta.feedbackId) {
        return `feedback_${meta.feedbackId}`;
    }
    return null;
}

/**
 * Emit an enriched ticket resolution signal (fire-and-forget)
 * 
 * Called when a ticket status changes to Resolved or Closed.
 * Captures resolution messages for the Ticket → Knowledge Loop (Item #9).
 * Gated by ENABLE_CANONICA_TICKET_KNOWLEDGE (separate from base signal mutation).
 * 
 * @see __docs__/canonica/ticket-knowledge-loop/
 */
export const emitTicketResolutionSignal = async (params: {
    ticketId: string;
    subject: string;
    messages: TicketMessage[];
    category: string;
    entityId?: string;
    tId: number;
    sId: number;
    resolvedBy: string;
}): Promise<void> => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_TICKET_KNOWLEDGE) return;

    // Extract last 5 non-system messages as resolution context
    const resolutionMessages = params.messages
        .filter(m => m.type !== 'system')
        .slice(-5)
        .map(m => m.text);

    // Skip if resolution is too short (not substantive)
    const totalResolutionLength = resolutionMessages.join(' ').length;
    if (totalResolutionLength < 50) return;

    await emitCanonicaSignal({
        type: 'ticket',
        entityId: params.entityId || 'unresolved',
        tId: params.tId,
        sId: params.sId,
        metadata: {
            signalPurpose: 'ticket_resolution',
            ticketId: params.ticketId,
            subject: params.subject,
            resolutionMessages,
            conversationLength: params.messages.length,
            category: params.category,
            resolvedBy: params.resolvedBy,
            resolutionTimestamp: new Date().toISOString(),
        },
    });
};

/**
 * Emit a predictive support interaction signal (fire-and-forget)
 * 
 * Called by widget when proactive help is shown, clicked, or dismissed.
 * Gated by ENABLE_CANONICA_PREDICTIVE_SUPPORT.
 * 
 * @see __docs__/canonica/predictive-support/
 */
export const emitSuggestionSignal = async (params: {
    type: 'suggestion_shown' | 'suggestion_clicked' | 'suggestion_dismissed';
    triggerId: string;
    page: string;
    entityId?: string;
    tId: number;
    sId: number;
}): Promise<void> => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) return;

    await emitCanonicaSignal({
        type: params.type,
        entityId: params.entityId || 'unresolved',
        tId: params.tId,
        sId: params.sId,
        metadata: {
            triggerId: params.triggerId,
            page: params.page,
            actionType: 'predictive_support',
        },
    });
};

export const emitCanonicaSignal = async (params: EmitSignalParams): Promise<void> => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) return;

    const tId = Number(params.tId);
    const sId = Number(params.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        console.warn('[Canonica Signal] Skipped signal with invalid tenant context:', params.type);
        return;
    }

    // Deduplication check
    const dedupKey = getDeduplicationKey(params);
    if (dedupKey) {
        if (emittedSignals.has(dedupKey)) return; // Already emitted
        emittedSignals.add(dedupKey);
        // Cap set size to prevent memory leak in long-lived sessions
        if (emittedSignals.size > 1000) emittedSignals.clear();
    }

    try {
        if (typeof window === 'undefined') {
            await emitServerSignalEvent({ ...params, tId, sId });
            return;
        }

        const { addSignalEvent } = await import('@database/canonica/signalEvents');

        await addSignalEvent({
            tId,
            sId,
            entityId: params.entityId || 'unresolved',
            type: params.type,
            timestamp: Timestamp.now(),
            metadata: sanitizeSignalMetadata(params.metadata),
        });
    } catch (error) {
        // Fire-and-forget: log but never throw
        console.warn('[Canonica Signal] Failed to emit signal:', params.type, error);
    }
};

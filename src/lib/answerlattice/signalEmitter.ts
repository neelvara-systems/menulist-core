/**
 * Answerlattice — Signal Emitter
 * 
 * Fire-and-forget helper for emitting friction signals from existing flows:
 * - Ticket creation → TICKET signal
 * - Chat negative feedback → CHAT_NEGATIVE signal
 * - Escalation events → ESCALATION signal
 * - Help Center feedback → FEEDBACK signal
 * 
 * RULES:
 * - Gated by ENABLE_ANSWERLATTICE_SIGNAL_MUTATION feature flag
 * - Non-blocking: errors are logged, never thrown
 * - Uses dynamic import to avoid bundling Answerlattice DAL when flag is off
 * - entityId defaults to 'unresolved' (mutation engine resolves later)
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    getAnswerlatticeScopeLogContext,
    logAnswerlatticeDiagnostic,
    logAnswerlatticeFailure,
} from '@lib/answerlattice/diagnostics';
import { createRuntimeId } from '@lib/runtime/randomId';
import { AnswerlatticeSignalType } from '@type/answerlattice';
import { TicketMessage } from '@type/supportTicket';
import { Timestamp } from 'firebase/firestore';

interface EmitSignalParams {
    type: AnswerlatticeSignalType;
    entityId?: string;
    tId?: number;
    sId?: number;
    metadata?: Record<string, any>;
}

// Deduplication: prevent same signal from being emitted twice in the same page session.
// Key format: "{type}_{sessionId}_{messageId}" or "{type}_{ticketId}"
// Cleared on page reload (in-memory only — no persistence needed).
const emittedSignals = new Set<string>();

const createTraceId = () => createRuntimeId('al');

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
    const { answerlatticeFirestoreAdmin } = await import('@lib/firebase/answerlatticeFirebaseAdmin');
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }

    const now = new Date();
    const traceId = createTraceId();
    const persistentDedupKey = getPersistentDeduplicationKey(params);
    const createdBy = cleanSignalText(params.metadata?.source || 'system:answerlattice_signal', 140) || 'system:answerlattice_signal';
    const uId = cleanSignalText(params.metadata?.userId || 'system', 140) || 'system';
    const payload = sanitizeForFirestore({
        pId: PRODUCT_IDS.ANSWERLATTICE,
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
        requestId: persistentDedupKey || traceId,
        ...(persistentDedupKey ? { dedupKey: cleanSignalText(persistentDedupKey, 260) } : {}),
    });

    const collectionRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS);
    if (persistentDedupKey) {
        const docId = `sig_${hashSignalDocumentId(`${params.tId}:${params.sId}:${persistentDedupKey}`)}`;
        try {
            await collectionRef.doc(docId).create(payload);
        } catch (error) {
            if (isAlreadyExistsError(error)) return;
            throw error;
        }
        return;
    }

    await collectionRef.add(payload);
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

function getPersistentDeduplicationKey(params: EmitSignalParams): string | null {
    const sessionKey = getDeduplicationKey(params);
    if (sessionKey) return `${params.type}:${sessionKey}`;

    const metadata = params.metadata || {};
    const explicitKey = cleanSignalText(metadata.requestId || metadata.externalId || metadata.idempotencyKey, 180);
    return explicitKey ? `${params.type}:external:${explicitKey}` : null;
}

function hashSignalDocumentId(value: string): string {
    let hashA = 0x811c9dc5;
    let hashB = 0x01000193;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        hashA ^= code;
        hashA = Math.imul(hashA, 0x01000193);
        hashB = Math.imul(hashB ^ code, 0x85ebca6b);
    }
    return `${(hashA >>> 0).toString(36)}${(hashB >>> 0).toString(36)}`;
}

const isAlreadyExistsError = (error: any): boolean => (
    error?.code === 6
    || error?.code === 'already-exists'
    || String(error?.code || '').toUpperCase().includes('ALREADY_EXISTS')
);

/**
 * Emit an enriched ticket resolution signal (fire-and-forget)
 * 
 * Called when a ticket status changes to Resolved or Closed.
 * Captures resolution messages for the Ticket → Knowledge Loop (Item #9).
 * Gated by ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE (separate from base signal mutation).
 * 
 * @see __docs__/answerlattice/ticket-knowledge-loop/
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
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE) return;

    // Extract last 5 non-system messages as resolution context
    const resolutionMessages = params.messages
        .filter(m => m.type !== 'system')
        .slice(-5)
        .map(m => m.text);

    // Skip if resolution is too short (not substantive)
    const totalResolutionLength = resolutionMessages.join(' ').length;
    if (totalResolutionLength < 50) return;

    await emitAnswerlatticeSignal({
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
 * Gated by ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT.
 * 
 * @see __docs__/answerlattice/predictive-support/
 */
export const emitSuggestionSignal = async (params: {
    type: 'suggestion_shown' | 'suggestion_clicked' | 'suggestion_dismissed';
    triggerId: string;
    page: string;
    entityId?: string;
    tId: number;
    sId: number;
}): Promise<void> => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) return;

    await emitAnswerlatticeSignal({
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

export const emitAnswerlatticeSignal = async (params: EmitSignalParams): Promise<void> => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) return;

    const tId = Number(params.tId);
    const sId = Number(params.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        logAnswerlatticeDiagnostic('answerlattice_signal_invalid_scope_skipped', {
            ...getAnswerlatticeScopeLogContext({
                entityId: params.entityId,
                sId: params.sId,
                signalType: params.type,
                tId: params.tId,
            }),
        });
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

        const { addSignalEvent } = await import('@database/answerlattice/signalEvents');

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
        logAnswerlatticeFailure('answerlattice_signal_emit_failed', error, {
            ...getAnswerlatticeScopeLogContext({
                entityId: params.entityId,
                sId,
                signalType: params.type,
                tId,
            }),
            hasMetadata: Boolean(params.metadata),
            metadataKeyCount: params.metadata && typeof params.metadata === 'object'
                ? Object.keys(params.metadata).length
                : 0,
        });
    }
};

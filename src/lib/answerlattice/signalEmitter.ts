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
 * - Non-blocking by default; trusted request boundaries may opt into typed failure propagation
 * - Uses dynamic import to avoid bundling Answerlattice DAL when flag is off
 * - entityId defaults to 'unresolved' (mutation engine resolves later)
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { redactAnswerlatticeSupportEvidenceText } from '@data/shared/answerlatticeSupportEvidencePrivacy';
import {
    getAnswerlatticeScopeLogContext,
    logAnswerlatticeDiagnostic,
    logAnswerlatticeFailure,
} from '@lib/answerlattice/diagnostics';
import { normalizeAnswerlatticeEntityId } from '@lib/answerlattice/governanceIdBoundary';
import {
    buildAnswerlatticeSignalMemoryDedupKey,
    buildAnswerlatticeSignalPayloadFingerprint,
    normalizeExactAnswerlatticeSignalScopeId,
} from '@lib/answerlattice/signalIdentity';
import { AnswerlatticeSignalType } from '@type/answerlattice';
import { TicketMessage } from '@type/supportTicket';
import { Timestamp } from 'firebase/firestore';

export interface EmitSignalParams {
    type: AnswerlatticeSignalType;
    entityId?: string;
    tId?: number;
    sId?: number;
    metadata?: Record<string, unknown>;
    failureMode?: 'return_false' | 'throw';
}

export interface AnswerlatticeSignalPersistenceParams extends EmitSignalParams {
    entityId: string;
    tId: number;
    sId: number;
    metadata: Record<string, unknown>;
    persistentDedupKey: string | null;
    identityFingerprint?: string;
}

export type AnswerlatticeSignalPersistence = (
    params: AnswerlatticeSignalPersistenceParams,
) => Promise<void>;

export class AnswerlatticeSignalReplayConflictError extends Error {
    constructor() {
        super('answerlattice_signal_replay_conflict');
        this.name = 'AnswerlatticeSignalReplayConflictError';
    }
}

// Deduplication: prevent same signal from being emitted twice in the same page session.
// Key format: "{tId}:{sId}:{type-specific identity}"
// Cleared on page reload (in-memory only — no persistence needed).
const emittedSignals = new Map<string, string>();

const SIGNAL_UNRESOLVED_ENTITY_ID = 'unresolved';

const normalizeSignalEntityId = (value: unknown): string => (
    normalizeAnswerlatticeEntityId(value) || SIGNAL_UNRESOLVED_ENTITY_ID
);

const cleanSignalText = (value: unknown, maxLength = 500): string => (
    redactAnswerlatticeSupportEvidenceText(value, maxLength)
);

const stringifySignalValue = (value: unknown): string => {
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === 'string' ? serialized : '';
    } catch {
        return '';
    }
};

const sanitizeSignalMetadataValue = (value: unknown, depth = 0): unknown => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return cleanSignalText(value, 500);
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value;
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value.toISOString() : null;
    }
    if (depth >= 3) return cleanSignalText(stringifySignalValue(value).slice(0, 500), 500);
    if (Array.isArray(value)) {
        try {
            return value
                .slice(0, 20)
                .map((item) => {
                    if (typeof item === 'string') return cleanSignalText(item, 180);
                    if (typeof item === 'number') return Number.isFinite(item) ? item : null;
                    if (typeof item === 'boolean' || item === null) return item;
                    return cleanSignalText(stringifySignalValue(item).slice(0, 500), 500);
                });
        } catch {
            return null;
        }
    }
    if (typeof value === 'object') {
        try {
            return Object.fromEntries(Object.entries(value as Record<string, unknown>)
                .slice(0, 12)
                .map(([key, nested]) => [cleanSignalText(key, 80), sanitizeSignalMetadataValue(nested, depth + 1)])
                .filter(([key]) => Boolean(key)));
        } catch {
            return null;
        }
    }
    return cleanSignalText(value, 200);
};

export const sanitizeAnswerlatticeSignalMetadata = (metadata: unknown): Record<string, unknown> => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
    try {
        return Object.fromEntries(Object.entries(metadata as Record<string, unknown>)
            .slice(0, 30)
            .map(([key, value]) => [cleanSignalText(key, 80), sanitizeSignalMetadataValue(value)])
            .filter(([key]) => Boolean(key)));
    } catch {
        return {};
    }
};

const getSignalMetadataKeyCount = (metadata: unknown): number => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 0;
    try {
        return Object.keys(metadata).length;
    } catch {
        return 0;
    }
};

function getDeduplicationKey(params: EmitSignalParams): string | null {
    const meta = params.metadata;
    if (!meta) return null;

    const sessionId = cleanSignalText(meta.sessionId, 180);
    const messageId = cleanSignalText(meta.messageId, 180);
    const searchHistoryId = cleanSignalText(meta.searchHistoryId, 180);
    const ticketId = cleanSignalText(meta.ticketId, 180);
    const feedbackId = cleanSignalText(meta.feedbackId, 180);

    if (params.type === 'chat_negative' && sessionId && messageId) {
        return `chat_${sessionId}_${messageId}`;
    }
    if (params.type === 'chat_negative' && searchHistoryId) {
        return `chat_history_${searchHistoryId}`;
    }
    if (params.type === 'ticket' && ticketId) {
        if (meta.signalPurpose === 'ticket_resolution' || Array.isArray(meta.resolutionMessages)) {
            const resolutionEventId = cleanSignalText(meta.resolutionEventId, 80);
            return `ticket_resolution_${ticketId}${resolutionEventId ? `_${resolutionEventId}` : ''}`;
        }
        return `ticket_${ticketId}`;
    }
    if (params.type === 'feedback' && feedbackId) {
        return `feedback_${feedbackId}`;
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
    resolutionEventId: string;
}): Promise<void> => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE) return;

    // Extract last 5 non-system messages as resolution context
    const resolutionMessages = params.messages
        .filter(m => m.type !== 'system')
        .slice(-5)
        .map(m => redactAnswerlatticeSupportEvidenceText(m.text, 500))
        .filter(Boolean);

    // Skip if resolution is too short (not substantive)
    const totalResolutionLength = resolutionMessages.join(' ').length;
    if (totalResolutionLength < 50) return;

    await emitAnswerlatticeSignal({
        type: 'ticket',
        entityId: params.entityId,
        tId: params.tId,
        sId: params.sId,
        metadata: {
            signalPurpose: 'ticket_resolution',
            ticketId: params.ticketId,
            resolutionEventId: params.resolutionEventId,
            subject: redactAnswerlatticeSupportEvidenceText(params.subject, 200),
            resolutionMessages,
            conversationLength: params.messages.length,
            category: params.category,
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
    interactionId: string;
    sessionId: string;
    contextKey?: string;
    actionType: string;
    triggerKind: 'predictive_help' | 'known_issue';
    entityId?: string;
    tId: number;
    sId: number;
}): Promise<boolean> => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) return false;

    const idempotencyKey = `predictive:${params.triggerId}:${params.interactionId}:${params.type}`;

    return emitAnswerlatticeSignal({
        type: params.type,
        entityId: params.entityId,
        tId: params.tId,
        sId: params.sId,
        metadata: {
            source: 'widget:predictive_support',
            signalPurpose: 'predictive_support_interaction',
            requestId: idempotencyKey,
            idempotencyKey,
            triggerId: params.triggerId,
            page: params.page,
            interactionId: params.interactionId,
            sessionId: params.sessionId,
            contextKey: params.contextKey || null,
            actionType: params.actionType,
            triggerKind: params.triggerKind,
        },
    });
};

export const emitAnswerlatticeSignalWithPersistence = async (
    params: EmitSignalParams,
    persistSignal: AnswerlatticeSignalPersistence,
): Promise<boolean> => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) return false;

    const normalizedEntityId = normalizeSignalEntityId(params.entityId);
    const tId = normalizeExactAnswerlatticeSignalScopeId(params.tId);
    const sId = normalizeExactAnswerlatticeSignalScopeId(params.sId);
    if (tId === null || sId === null) {
        logAnswerlatticeDiagnostic('answerlattice_signal_invalid_scope_skipped', {
            ...getAnswerlatticeScopeLogContext({
                entityId: normalizedEntityId,
                sId: params.sId,
                signalType: params.type,
                tId: params.tId,
            }),
        });
        return false;
    }

    const sanitizedMetadata = sanitizeAnswerlatticeSignalMetadata(params.metadata);
    const persistentDedupKey = getPersistentDeduplicationKey({
        ...params,
        metadata: sanitizedMetadata,
    });
    const identityFingerprint = persistentDedupKey
        ? buildAnswerlatticeSignalPayloadFingerprint({
            type: params.type,
            entityId: normalizedEntityId,
            deduplicationKey: persistentDedupKey,
            metadata: sanitizedMetadata,
        })
        : undefined;

    // Deduplication check
    const sessionDedupKey = getDeduplicationKey({
        ...params,
        metadata: sanitizedMetadata,
    });
    const dedupKey = sessionDedupKey
        ? buildAnswerlatticeSignalMemoryDedupKey({ tId, sId, deduplicationKey: sessionDedupKey })
        : null;
    if (dedupKey) {
        const existingFingerprint = emittedSignals.get(dedupKey);
        if (existingFingerprint) {
            if (existingFingerprint === identityFingerprint) return true;
            logAnswerlatticeDiagnostic('answerlattice_signal_replay_conflict_skipped', {
                ...getAnswerlatticeScopeLogContext({
                    entityId: normalizedEntityId,
                    sId,
                    signalType: params.type,
                    tId,
                }),
            });
            return false;
        }
        emittedSignals.set(dedupKey, identityFingerprint || dedupKey);
        // Cap set size to prevent memory leak in long-lived sessions
        if (emittedSignals.size > 1000) {
            const oldest = emittedSignals.keys().next().value;
            if (oldest) emittedSignals.delete(oldest);
        }
    }

    try {
        await persistSignal({
            ...params,
            tId,
            sId,
            entityId: normalizedEntityId,
            metadata: sanitizedMetadata,
            persistentDedupKey,
            identityFingerprint,
        });
        return true;
    } catch (error) {
        if (dedupKey) emittedSignals.delete(dedupKey);
        const logContext = {
            ...getAnswerlatticeScopeLogContext({
                entityId: normalizedEntityId,
                sId,
                signalType: params.type,
                tId,
            }),
            hasMetadata: Boolean(params.metadata),
            metadataKeyCount: getSignalMetadataKeyCount(params.metadata),
        };
        if (error instanceof AnswerlatticeSignalReplayConflictError) {
            logAnswerlatticeDiagnostic('answerlattice_signal_replay_conflict_skipped', logContext);
        } else {
            logAnswerlatticeFailure('answerlattice_signal_emit_failed', error, logContext);
        }
        if (params.failureMode === 'throw') throw error;
        return false;
    }
};

export const emitAnswerlatticeSignal = async (params: EmitSignalParams): Promise<boolean> => (
    emitAnswerlatticeSignalWithPersistence(params, async (signal) => {
        const { addSignalEvent } = await import('@database/answerlattice/signalEvents');

        await addSignalEvent({
            tId: signal.tId,
            sId: signal.sId,
            entityId: signal.entityId,
            type: signal.type,
            timestamp: Timestamp.now(),
            metadata: signal.metadata,
            ...(signal.persistentDedupKey ? {
                requestId: signal.persistentDedupKey,
                dedupKey: signal.persistentDedupKey,
                identityFingerprint: signal.identityFingerprint,
            } : {}),
        });
    })
);

/**
 * Canonica — Signal Emitter
 * 
 * Fire-and-forget helper for emitting friction signals from existing flows:
 * - Ticket creation → TICKET signal
 * - Chat negative feedback → CHAT_NEGATIVE signal
 * - Escalation events → ESCALATION signal
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

function getDeduplicationKey(params: EmitSignalParams): string | null {
    const meta = params.metadata;
    if (!meta) return null;

    if (params.type === 'chat_negative' && meta.sessionId && meta.messageId) {
        return `chat_${meta.sessionId}_${meta.messageId}`;
    }
    if (params.type === 'ticket' && meta.ticketId) {
        return `ticket_${meta.ticketId}`;
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

    // Deduplication check
    const dedupKey = getDeduplicationKey(params);
    if (dedupKey) {
        if (emittedSignals.has(dedupKey)) return; // Already emitted
        emittedSignals.add(dedupKey);
        // Cap set size to prevent memory leak in long-lived sessions
        if (emittedSignals.size > 1000) emittedSignals.clear();
    }

    try {
        const { addSignalEvent } = await import('@database/canonica/signalEvents');

        await addSignalEvent({
            tId: params.tId || 0,
            sId: params.sId || 0,
            entityId: params.entityId || 'unresolved',
            type: params.type,
            timestamp: Timestamp.now(),
            metadata: params.metadata,
        });
    } catch (error) {
        // Fire-and-forget: log but never throw
        console.warn('[Canonica Signal] Failed to emit signal:', params.type, error);
    }
};

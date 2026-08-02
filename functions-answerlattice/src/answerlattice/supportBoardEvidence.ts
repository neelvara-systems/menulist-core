export type SupportBoardSearchEvidenceKind = 'unresolved' | 'approved_answer_gap';

export interface SupportBoardSearchEvidence {
    kind: SupportBoardSearchEvidenceKind;
    escalated: boolean;
    negativeFeedback: boolean;
}

const cleanSource = (value: unknown) => (
    typeof value === 'string' ? value.trim().toLowerCase().slice(0, 80) : ''
);

const hasClarification = (value: unknown): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const clarification = value as Record<string, unknown>;
    return clarification.type === 'scope_context'
        && Array.isArray(clarification.requiredContext)
        && clarification.requiredContext.some((item) => (
            item === 'plan' || item === 'role' || item === 'state'
        ));
};

const hasValidReference = (value: unknown): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const reference = value as Record<string, unknown>;
    return typeof reference.id === 'string'
        && Boolean(reference.id.trim())
        && reference.id.length <= 180
        && typeof reference.title === 'string'
        && Boolean(reference.title.trim())
        && reference.title.length <= 240;
};

/**
 * A canonical miss alone is not an unresolved support failure. FAQ hits are
 * skipped unless the customer explicitly reported failure. Source-backed RAG
 * answers become approved-answer coverage evidence, while empty, negatively
 * rated, clarified, or escalated results become unresolved evidence.
 */
export function classifySupportBoardSearchEvidence(
    data: Record<string, unknown>,
): SupportBoardSearchEvidence | null {
    const answerSource = cleanSource(data.answerSource);
    const negativeFeedback = data.isGood === false || data.resolutionOutcome === 'not_resolved';
    const escalated = typeof data.escalationTicketId === 'string' && data.escalationTicketId.trim().length > 0;
    const clarificationRequired = hasClarification(data.clarification);
    const explicitlyResolved = data.isGood === true || data.resolutionOutcome === 'resolved';
    const referenceCount = Array.isArray(data.references)
        ? data.references.filter(hasValidReference).length
        : 0;

    if (negativeFeedback || escalated || clarificationRequired) {
        return { kind: 'unresolved', escalated, negativeFeedback };
    }
    if (answerSource === 'canonical' || answerSource === 'faq') return null;
    if (!explicitlyResolved && answerSource === 'empty') {
        return { kind: 'unresolved', escalated: false, negativeFeedback: false };
    }
    if (answerSource === 'rag' || answerSource === 'cache') {
        if (referenceCount > 0) {
            return { kind: 'approved_answer_gap', escalated: false, negativeFeedback: false };
        }
        return explicitlyResolved
            ? null
            : { kind: 'unresolved', escalated: false, negativeFeedback: false };
    }
    if (referenceCount > 0) {
        return { kind: 'approved_answer_gap', escalated: false, negativeFeedback: false };
    }
    return null;
}

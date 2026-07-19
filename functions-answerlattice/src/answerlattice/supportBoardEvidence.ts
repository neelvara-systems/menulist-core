export type SupportBoardSearchEvidenceKind = 'unresolved' | 'approved_answer_gap';

export interface SupportBoardSearchEvidence {
    kind: SupportBoardSearchEvidenceKind;
    escalated: boolean;
    negativeFeedback: boolean;
}

const cleanSource = (value: unknown) => (
    typeof value === 'string' ? value.trim().toLowerCase().slice(0, 80) : ''
);

const hasClarification = (value: unknown) => (
    Boolean(value && typeof value === 'object' && !Array.isArray(value))
);

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
    const referenceCount = Array.isArray(data.references) ? data.references.length : 0;

    if (negativeFeedback || escalated || clarificationRequired) {
        return { kind: 'unresolved', escalated, negativeFeedback };
    }
    if (answerSource === 'faq') return null;
    if (!explicitlyResolved && (answerSource === 'empty' || referenceCount === 0)) {
        return { kind: 'unresolved', escalated: false, negativeFeedback: false };
    }
    if (answerSource === 'rag' || answerSource === 'cache' || referenceCount > 0) {
        return { kind: 'approved_answer_gap', escalated: false, negativeFeedback: false };
    }
    return null;
}

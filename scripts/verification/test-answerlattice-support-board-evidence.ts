#!/usr/bin/env ts-node

import { classifySupportBoardSearchEvidence } from '../../functions-answerlattice/src/answerlattice/supportBoardEvidence';

const assertKind = (
    label: string,
    input: Record<string, unknown>,
    expected: 'unresolved' | 'approved_answer_gap' | null,
) => {
    const result = classifySupportBoardSearchEvidence(input);
    if ((result?.kind || null) !== expected) {
        throw new Error(`${label}: expected ${expected}, received ${result?.kind || 'null'}`);
    }
    return result;
};

assertKind('successful FAQ is not a gap', {
    answerSource: 'faq',
    references: [{ id: 'faq-1' }],
}, null);

assertKind('negative FAQ is unresolved evidence', {
    answerSource: 'faq',
    isGood: false,
    references: [{ id: 'faq-1' }],
}, 'unresolved');

assertKind('source-backed RAG is an approved-answer gap', {
    answerSource: 'rag',
    resolutionOutcome: 'resolved',
    references: [{ id: 'article-1' }],
}, 'approved_answer_gap');

assertKind('empty result is unresolved evidence', {
    answerSource: 'empty',
    references: [],
}, 'unresolved');

assertKind('clarification request is unresolved evidence', {
    answerSource: 'empty',
    clarification: { field: 'plan' },
    references: [],
}, 'unresolved');

const escalated = assertKind('escalated result is unresolved evidence', {
    answerSource: 'rag',
    escalationTicketId: 'ticket-1',
    references: [{ id: 'article-1' }],
}, 'unresolved');
if (!escalated?.escalated) throw new Error('escalated result must retain escalation evidence');

const negative = assertKind('negative RAG result is unresolved evidence', {
    answerSource: 'rag',
    resolutionOutcome: 'not_resolved',
    references: [{ id: 'article-1' }],
}, 'unresolved');
if (!negative?.negativeFeedback) throw new Error('negative result must retain negative-feedback evidence');

console.log('Answerlattice Support Board evidence classification passed.');

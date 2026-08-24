#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assertIncludes = (source: string, fragment: string, label: string) => {
    if (!source.includes(fragment)) throw new Error(`${label}: missing ${fragment}`);
};
const assertNotIncludes = (source: string, fragment: string, label: string) => {
    if (source.includes(fragment)) throw new Error(`${label}: forbidden ${fragment}`);
};

const dal = read('src/database/answerlattice/supportBoard.ts');
const hook = read('src/hooks/answerlattice/useSupportBoard.ts');
const ui = read('src/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard.tsx');
const summary = read('functions-answerlattice/src/answerlattice/supportBoardSummary.ts');
const sync = read('functions-answerlattice/src/answerlattice/supportBoardSync.ts');
const evidence = read('functions-answerlattice/src/answerlattice/supportBoardEvidence.ts');
const functionsIndex = read('functions-answerlattice/src/index.ts');
const dedicatedRules = read('firestore-answerlattice.rules');
const sharedRules = read('firestore.rules');

assertIncludes(dal, 'const buildSourceCardDocumentId = async (', 'deterministic source-card identity');
assertIncludes(dal, "globalThis.crypto.subtle.digest('SHA-256'", 'source-card SHA-256 identity');
assertIncludes(dal, 'cleanNullableText(cardData.sourceId, ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS.MAX_REFERENCE_ID_LENGTH)', 'stored source identity bound');
assertIncludes(dal, "throw new Error('Create the support card before resolving it')", 'resolved create rejection');
assertIncludes(dal, 'return await runTransaction(answerlatticeFirebaseClient, async (transaction) => {', 'transactional source-card creation');
assertIncludes(dal, 'const compactSupportBoardCreateDocument = <T extends Record<string, unknown>>(data: T): T => {', 'compact optional create fields');
assertIncludes(dal, 'if (compact[field] == null) delete compact[field];', 'omit absent optional create fields');
assertIncludes(dal, 'const submitData = compactSupportBoardCreateDocument(', 'compact create document before Firestore write');
assertIncludes(dal, 'resolvedOn: isResolved ? Timestamp.now() : null', 'DAL-owned resolution timestamp');
assertNotIncludes(hook, 'resolvedOn: Timestamp.now()', 'hook must not control resolution timestamp');
assertIncludes(dal, 'export const redactAnswerlatticeSupportBoardSourceIdentity', 'one-way source identity redaction');
assertIncludes(ui, 'Remove source details', 'source identity redaction UI');
assertIncludes(ui, "maxHeight: 'calc(100dvh - 220px)'", 'short-viewport modal body bound');
assertIncludes(ui, 'styles={{ body: SUPPORT_BOARD_MODAL_BODY_STYLE }}', 'support-board modal scrolling contract');
assertIncludes(hook, 'answerlattice_support_board_proposal_note_add_failed', 'proposal note partial-failure diagnostic');
assertIncludes(hook, 'Answer proposal created; private board note was not added', 'truthful proposal partial-success copy');
assertIncludes(hook, 'status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.DRAFT_READY', 'proposal moves card to draft-ready review');
assertIncludes(hook, 'const scopeKeyRef = useRef(scopeKey);', 'workspace-owned browser settlement');
assertIncludes(hook, 'const latestRefreshRef = useRef(0);', 'latest refresh ownership');
assertIncludes(hook, 'scopeKeyRef.current !== requestScopeKey || latestRefreshRef.current !== requestId', 'stale refresh rejection');
assertIncludes(hook, 'const savingInFlightRef = useRef(false);', 'synchronous mutation duplicate guard');
assertIncludes(hook, 'const syncingInFlightRef = useRef(false);', 'synchronous sync duplicate guard');

assertIncludes(functionsIndex, 'answerlatticeSupportBoardSummaryOnWrite', 'live summary trigger export');
assertIncludes(summary, 'loadAnswerlatticeSupportBoardCoreCounts', 'exact live board counts');
assertIncludes(summary, 'resolvedHighPrioritySnapshot', 'resolved high-priority exclusion');
assertIncludes(summary, 'highPriorityCards - resolvedHighPriorityCards', 'open high-priority count');
assertIncludes(summary, ".where('pId', '==', PRODUCT_ID)", 'live count product partition');
assertIncludes(summary, "scoped.where('priority', '==', HIGH_PRIORITY).count().get()", 'high-priority aggregate count');
assertIncludes(summary, 'count_fields_unchanged', 'note-only summary skip');
assertIncludes(summary, 'nightly_sync_writes_summary', 'nightly card create summary skip');
assertIncludes(sync, 'sourceWindowsSaturated', 'nightly source saturation evidence');
assertIncludes(sync, 'breakdownFresh', 'bounded breakdown freshness evidence');
assertIncludes(
    sync,
    ".collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)\n            .where('pId', '==', PRODUCT_ID)",
    'nightly search-history product partition',
);
assertIncludes(
    sync,
    ".collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)\n            .where('pId', '==', PRODUCT_ID)",
    'nightly drift product partition',
);
assertIncludes(
    sync,
    ".collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES)\n        .where('pId', '==', PRODUCT_ID)",
    'nightly release product partition',
);
assertIncludes(
    sync,
    ".collection(DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS)\n        .where('pId', '==', PRODUCT_ID)",
    'nightly board product partition',
);
assertIncludes(sync, 'existing.pId !== PRODUCT_ID || existing.tId !== tId || existing.sId !== sId', 'deterministic card scope conflict guard');
assertIncludes(sync, 'support-board summary identity conflicts with an existing document scope', 'summary identity conflict guard');
assertIncludes(dal, "where('pId', '==', 'AL')", 'client board product partition');
assertIncludes(dal, 'projectAnswerlatticeSupportBoardCard(item.data(), {', 'persisted board list projection');
assertIncludes(dal, 'projectAnswerlatticeSupportBoardSummary(snapshot.data(), {', 'persisted board summary projection');
assertIncludes(dal, "throw new Error('Support board card state is invalid')", 'persisted mutation-state rejection');
assertNotIncludes(dal, 'snapshot.data() as AnswerlatticeSupportBoardCard', 'unchecked persisted board-card cast');
assertNotIncludes(dal, 'as AnswerlatticeSupportBoardSummary', 'unchecked persisted board-summary cast');
assertIncludes(sync, 'loadAnswerlatticeSupportBoardCoreCounts', 'nightly exact core counts');
assertIncludes(sync, 'sb_source_${tId}_${sId}_${digest}', 'shared deterministic source-card identity');
assertIncludes(evidence, "answerSource === 'faq'", 'successful FAQ exclusion');
assertIncludes(evidence, "kind: 'approved_answer_gap'", 'approved-answer gap classification');
assertIncludes(evidence, "kind: 'unresolved'", 'unresolved evidence classification');

for (const [label, rules] of [
    ['dedicated rules', dedicatedRules],
    ['shared rules', sharedRules],
]) {
    assertIncludes(rules, 'isValidAnswerlatticeSupportBoardClientCreate', `${label} strict create`);
    assertIncludes(rules, 'isValidAnswerlatticeSupportBoardClientUpdate', `${label} strict update`);
    assertIncludes(rules, 'isValidAnswerlatticeSupportBoardNoteUpdate', `${label} prepend-only note`);
    assertIncludes(rules, 'isValidAnswerlatticeSupportBoardStatusUpdate', `${label} status-history coupling`);
    assertIncludes(rules, 'isValidAnswerlatticeSupportBoardSourceRedaction', `${label} source redaction`);
    assertIncludes(rules, 'hasAnswerlatticeSupportBoardPermission', `${label} support-only board permission`);
    assertIncludes(rules, 'before.statuses.size() < 50', `${label} immutable bounded status history`);
    assertIncludes(rules, "&& data.status != 'resolved'", `${label} resolved-create rejection`);
    assertIncludes(rules, "|| hasAnswerlatticePermission('canManageGovernance')", `${label} proposal-link permission`);
}

for (const indexFile of ['firestore-answerlattice.indexes.json', 'firestore.indexes.json']) {
    const indexes = (JSON.parse(read(indexFile)) as { indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string }> }> }).indexes;
    const boardIndexes = indexes.filter((entry) => entry.collectionGroup === 'answerlattice_supportBoardCards');
    for (const required of [
        'pId,tId,sId,modifiedOn',
        'pId,tId,sId,priority',
        'pId,tId,sId,status,modifiedOn',
    ]) {
        if (!boardIndexes.some((entry) => entry.fields.map((field) => field.fieldPath).join(',') === required)) {
            throw new Error(`${indexFile}: missing product-scoped support-board index ${required}`);
        }
    }
    const canonicalIndexes = indexes.filter((entry) => entry.collectionGroup === 'answerlattice_canonicalAnswers');
    if (!canonicalIndexes.some((entry) => (
        entry.fields.map((field) => field.fieldPath).join(',') === 'pId,tId,sId,governance.driftFlag'
    ))) {
        throw new Error(`${indexFile}: missing product-scoped drift index`);
    }
}

console.log('Answerlattice Support Board contracts passed.');

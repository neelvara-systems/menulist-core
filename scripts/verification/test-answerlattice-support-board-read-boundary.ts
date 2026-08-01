#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import {
    projectAnswerlatticeSupportBoardCard,
    projectAnswerlatticeSupportBoardSummary,
} from '../../src/lib/answerlattice/supportBoardReadBoundary';

const now = Timestamp.now();
const validCard = {
    description: 'A customer question needs an approved answer.',
    lastNoteAt: null,
    notes: [],
    notesCount: 0,
    pId: 'AL',
    priority: 'medium',
    resolvedBy: null,
    resolvedOn: null,
    sId: 2,
    sourceId: 'ticket-1',
    sourceIdentityRedactedAt: null,
    sourceIdentityRedactedBy: null,
    sourceType: 'ticket',
    status: 'needs_triage',
    statuses: [{
        createdBy: {
            email: 'owner@example.com',
            id: 'owner-1',
            name: 'Owner',
        },
        remark: 'Card created',
        status: 'needs_triage',
        timestamp: now,
    }],
    tId: 1,
    title: 'Question needs review',
};

assert.ok(projectAnswerlatticeSupportBoardCard(validCard, {
    id: 'support-card-1',
    sId: 2,
    tId: 1,
}));
assert.equal(
    projectAnswerlatticeSupportBoardCard({ ...validCard, tId: '1' }, {
        id: 'support-card-1',
        sId: 2,
        tId: 1,
    }),
    null,
    'persisted support-board scope aliases must not be coerced',
);
assert.equal(
    projectAnswerlatticeSupportBoardCard({
        ...validCard,
        notes: { length: 0 },
    }, { id: 'support-card-1', sId: 2, tId: 1 }),
    null,
    'array-like persisted notes must fail closed',
);
assert.equal(
    projectAnswerlatticeSupportBoardCard({
        ...validCard,
        statuses: [{
            ...validCard.statuses[0],
            status: 'resolved',
        }],
    }, { id: 'support-card-1', sId: 2, tId: 1 }),
    null,
    'the newest persisted status-history entry must agree with card state',
);
assert.equal(
    projectAnswerlatticeSupportBoardCard({
        ...validCard,
        sourceId: null,
    }, { id: 'support-card-1', sId: 2, tId: 1 }),
    null,
    'non-manual persisted cards must retain an exact bounded source identity',
);
assert.equal(
    projectAnswerlatticeSupportBoardCard({
        ...validCard,
        sourceIdentityRedactedBy: 'Owner',
    }, { id: 'support-card-1', sId: 2, tId: 1 }),
    null,
    'persisted source-redaction actor and timestamp must remain coupled',
);

const validSummary = {
    pId: 'AL',
    tId: 1,
    sId: 2,
    schemaVersion: 1,
    openCards: 3,
    needsAnswerCards: 2,
    highPriorityCards: 1,
    totalRecentCards: 5,
    lastUpdated: now,
    statusCounts: { needs_triage: 3 },
    topSurfaces: [{ surfaceId: 'widget', count: 2 }],
    lastSync: {
        candidatesAnalyzed: 5,
        cardsCreated: 1,
        cardsUpdated: 1,
        cardsSkippedResolved: 1,
        cardsSkippedUnchanged: 2,
        windowDays: 30,
        maxCardsCreatedOrUpdatedPerRun: 20,
        sourceWindowsSaturated: false,
    },
};
assert.ok(projectAnswerlatticeSupportBoardSummary(validSummary, {
    id: 'supportBoardSummary_1_2',
    sId: 2,
    tId: 1,
}));
assert.equal(projectAnswerlatticeSupportBoardSummary({
    ...validSummary,
    openCards: 1.5,
}, { sId: 2, tId: 1 }), null, 'fractional persisted summary counts must fail closed');
assert.equal(projectAnswerlatticeSupportBoardSummary({
    ...validSummary,
    needsAnswerCards: 4,
}, { sId: 2, tId: 1 }), null, 'summary sub-counts cannot exceed open cards');
assert.equal(projectAnswerlatticeSupportBoardSummary({
    ...validSummary,
    statusCounts: { needs_triage: Number.NaN },
}, { sId: 2, tId: 1 }), null, 'malformed optional count maps must fail closed');
assert.equal(projectAnswerlatticeSupportBoardSummary({
    ...validSummary,
    lastSync: { ...validSummary.lastSync, cardsCreated: -1 },
}, { sId: 2, tId: 1 }), null, 'malformed optional sync metadata must fail closed');

console.log('Answerlattice Support Board read boundary passed.');

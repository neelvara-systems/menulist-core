import assert from 'node:assert/strict';

import {
    buildAiMenuManagerTimeline,
    getAiMenuManagerProjectStatusLine,
    shouldShowAiMenuManagerApprovalReason,
} from '../../src/lib/ai-menu-manager/presentation';

const throwingTimestamp = {};
Object.defineProperty(throwingTimestamp, 'toDate', {
    get() {
        throw new Error('timestamp access must be contained');
    },
});
assert.equal(
    getAiMenuManagerProjectStatusLine({
        active: true,
        modifiedOn: throwingTimestamp,
    } as never),
    'Active menu',
);

const throwingProject = new Proxy({}, {
    get() {
        throw new Error('project access must be contained');
    },
});
assert.equal(getAiMenuManagerProjectStatusLine(throwingProject as never), 'Active menu');

const throwingMessages = new Proxy([], {
    get() {
        throw new Error('message traversal must be contained');
    },
});
assert.deepEqual(buildAiMenuManagerTimeline({
    compactMessages: throwingMessages,
}), []);

assert.deepEqual(buildAiMenuManagerTimeline({
    activeCards: [{
        title: 'Current proposal',
        message: 'Review this.',
    } as never],
    compactMessages: [
        {
            messageId: 'duplicate',
            role: 'menu_manager',
            text: ' Review this. ',
        } as never,
        {
            kind: 'status',
            messageId: 'owner-status',
            role: 'owner',
            text: ' Saved locally. ',
        } as never,
        {
            messageId: '',
            role: 'owner',
            text: 'missing identity',
        } as never,
    ],
    receipts: [{
        message: 'Applied.',
        receiptId: 'receipt-1',
    } as never],
}), [
    {
        id: 'owner-status',
        kind: 'status',
        role: 'owner',
        text: 'Saved locally.',
    },
    {
        id: 'receipt-1_manager',
        kind: 'receipt',
        role: 'menu_manager',
        text: 'Applied.',
    },
]);

assert.equal(shouldShowAiMenuManagerApprovalReason(new Proxy({}, {
    get() {
        throw new Error('card access must be contained');
    },
}) as never), false);

console.log('AI Menu Manager presentation boundary tests passed.');

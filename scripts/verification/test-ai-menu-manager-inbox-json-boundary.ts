import assert from 'node:assert/strict';
import { serializeAiMenuManagerInboxForJson } from '../../src/lib/ai-menu-manager/inboxJsonBoundary';

const circular: Record<string, unknown> = { keep: 'value' };
circular.circular = circular;

assert.deepEqual(serializeAiMenuManagerInboxForJson({
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: {
        seconds: 1_775_123_400,
        nanoseconds: 123_000_000,
    },
    invalidNumber: Number.POSITIVE_INFINITY,
    unsupported: 1n,
    circular,
    array: [1, Number.NaN, 2n, 'ok'],
}), {
    createdAt: '2026-07-30T10:00:00.000Z',
    updatedAt: '2026-04-02T09:50:00.123Z',
    circular: { keep: 'value' },
    array: [1, null, null, 'ok'],
});

assert.equal(
    serializeAiMenuManagerInboxForJson({
        toDate() {
            throw new Error('provider getter failed');
        },
    }),
    null,
);

console.log('AI Menu Manager inbox JSON boundary tests passed.');

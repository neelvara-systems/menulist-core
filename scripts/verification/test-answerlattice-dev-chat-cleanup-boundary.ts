import assert from 'node:assert/strict';
import {
    DEV_CHAT_CLEANUP_MAX_SESSIONS,
    normalizeDevChatCleanupSessionIds,
    summarizeDevChatCleanupResults,
} from '../../src/lib/answerlattice/devChatCleanupBoundary';

const idA = 'chat_session_a1';
const idB = 'chat_session_b2';

assert.deepEqual(normalizeDevChatCleanupSessionIds([]), []);
assert.deepEqual(normalizeDevChatCleanupSessionIds([idA, idA, idB]), [idA, idB]);
assert.equal(normalizeDevChatCleanupSessionIds('not-an-array'), null);
assert.equal(normalizeDevChatCleanupSessionIds([' bad-id ']), null);
assert.equal(
    normalizeDevChatCleanupSessionIds(Array.from({ length: DEV_CHAT_CLEANUP_MAX_SESSIONS + 1 }, (_, index) => `chat_${index}_valid`)),
    null,
);

assert.deepEqual(summarizeDevChatCleanupResults(
    [idA, idB],
    [
        {
            status: 'fulfilled',
            value: {
                deleted: true,
                sessionId: idA,
                storageFilesDeleted: 2,
                success: true,
            },
        },
        { status: 'rejected', reason: new Error('network') },
    ],
), {
    deletedSessionIds: [idA],
    failedSessionIds: [idB],
    imagesDeleted: 2,
});

assert.deepEqual(summarizeDevChatCleanupResults(
    [idA],
    [{
        status: 'fulfilled',
        value: {
            deleted: true,
            sessionId: idB,
            storageFilesDeleted: 1,
            success: true,
        },
    }],
), {
    deletedSessionIds: [],
    failedSessionIds: [idA],
    imagesDeleted: 0,
});

assert.throws(
    () => summarizeDevChatCleanupResults([idA], []),
    /dev_chat_cleanup_result_count_mismatch/,
);

process.stdout.write('Answerlattice dev chat cleanup boundary tests passed.\n');

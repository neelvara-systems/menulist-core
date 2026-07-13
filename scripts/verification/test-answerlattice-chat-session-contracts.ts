import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT,
    normalizeAnswerlatticeChatMessagesForStorage,
    normalizeAnswerlatticeInternalNote,
    parseAnswerlatticeChatSessionDocument,
} from '../../src/lib/answerlattice/chatSessionContracts';
import { Timestamp } from 'firebase/firestore';

const message = (id: string, role: 'user' | 'assistant' = 'user') => ({
    id,
    role,
    ...(role === 'user' ? { content: `Question ${id}` } : { craftedAnswer: `Answer ${id}` }),
});

const validDocument = {
    pId: 'AL',
    tId: 71,
    sId: 701,
    title: 'Scoped conversation',
    mode: 'qna',
    messages: [message('message-1')],
};

const parsed = parseAnswerlatticeChatSessionDocument({
    id: 'session-1',
    value: validDocument,
    scope: { tId: 71, sId: 701 },
});
assert.equal(parsed?.id, 'session-1');
assert.equal(parsed?.messages.length, 1);

assert.equal(parseAnswerlatticeChatSessionDocument({
    id: 'session-1',
    value: { ...validDocument, pId: ' al ' },
    scope: { tId: 71, sId: 701 },
}), null, 'product identity must be exact');
assert.equal(parseAnswerlatticeChatSessionDocument({
    id: 'session-1',
    value: { ...validDocument, tId: 72 },
    scope: { tId: 71, sId: 701 },
}), null, 'cross-tenant rows must be rejected');
assert.equal(parseAnswerlatticeChatSessionDocument({
    id: 'session-1',
    value: { ...validDocument, sId: '0701' },
    scope: { tId: 71, sId: 701 },
}), null, 'non-canonical stored scope must be rejected');
assert.equal(parseAnswerlatticeChatSessionDocument({
    id: '../session-1',
    value: validDocument,
    scope: { tId: 71, sId: 701 },
}), null, 'path-shaped session IDs must be rejected');
assert.equal(parseAnswerlatticeChatSessionDocument({
    id: 'session-1',
    value: { ...validDocument, modifiedOn: { seconds: 1 } },
    scope: { tId: 71, sId: 701 },
}), null, 'malformed persisted timestamps must be rejected');

assert.throws(
    () => normalizeAnswerlatticeChatMessagesForStorage([message('duplicate'), message('duplicate')]),
    /message_id_duplicate/,
);
const cappedMessages = normalizeAnswerlatticeChatMessagesForStorage(
    Array.from({ length: ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT + 5 }, (_, index) => message(`message-${index + 1}`)),
);
assert.equal(cappedMessages.length, ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT);
assert.equal(cappedMessages[0].id, 'message-1', 'the initial user context must survive bounded compaction');
assert.equal(cappedMessages.at(-1)?.id, `message-${ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT + 5}`);
assert.equal(normalizeAnswerlatticeChatMessagesForStorage([{
    ...message('feedback-message', 'assistant'),
    feedback: { isGood: true, submittedAt: Timestamp.now() },
}])[0].feedback?.isGood, true);
assert.throws(() => normalizeAnswerlatticeChatMessagesForStorage([{
    ...message('feedback-message', 'assistant'),
    feedback: { isGood: true, submittedAt: { seconds: 1 } },
}]), /feedback_timestamp_invalid/);
assert.throws(() => normalizeAnswerlatticeChatMessagesForStorage([{
    ...message('message-with-time'),
    createdOn: '2026-07-11T00:00:00.000Z',
}]), /message_timestamp_invalid/);

assert.deepEqual(normalizeAnswerlatticeInternalNote({ type: 'doc', content: [] }), { type: 'doc', content: [] });
assert.equal(normalizeAnswerlatticeInternalNote('Legacy plain-text note'), 'Legacy plain-text note');
assert.throws(() => normalizeAnswerlatticeInternalNote('   '), /internal_note_invalid/);
assert.throws(() => normalizeAnswerlatticeInternalNote('x'.repeat(33 * 1024)), /internal_note_invalid/);

process.stdout.write('Answerlattice chat-session runtime contracts passed.\n');

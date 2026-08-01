import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT,
    getAnswerlatticeInternalNotePlainText,
    getAnswerlatticeChatSessionActorScope,
    getAnswerlatticeUserChatSessionsCacheKey,
    normalizeAnswerlatticeChatMessagesForStorage,
    normalizeAnswerlatticeInternalNote,
    parseAnswerlatticeChatSessionDocument,
} from '../../src/lib/answerlattice/chatSessionContracts';
import {
    collectAnswerlatticeChatImageUrls,
    filterUnreferencedAnswerlatticeChatImageUrls,
    isAnswerlatticeChatImageStoragePath,
} from '../../src/lib/answerlattice/chatMediaReferences';
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

const initiatingSession = {
    user: {
        id: 'owner-1',
        productAccounts: {
            AL: { tenantId: 71, storeId: 701 },
        },
    },
};
assert.deepEqual(
    getAnswerlatticeChatSessionActorScope(initiatingSession),
    { tId: 71, sId: 701, uId: 'owner-1' },
);
assert.deepEqual(
    getAnswerlatticeChatSessionActorScope({
        ...initiatingSession,
        user: {
            ...initiatingSession.user,
            productAccounts: { AL: { tenantId: 71, storeId: 702 } },
        },
    }),
    { tId: 71, sId: 702, uId: 'owner-1' },
);
assert.equal(getAnswerlatticeChatSessionActorScope({
    user: {
        productAccounts: { AL: { tenantId: 71, storeId: 701 } },
    },
}), null);

assert.deepEqual(
    getAnswerlatticeUserChatSessionsCacheKey(
        { tenantId: 71, storeId: 701 },
        ' owner-1 ',
    ),
    ['answerlattice-user-chat-sessions', 71, 701, 'owner-1'],
);
assert.notDeepEqual(
    getAnswerlatticeUserChatSessionsCacheKey({ tenantId: 71, storeId: 701 }, 'owner-1'),
    getAnswerlatticeUserChatSessionsCacheKey({ tenantId: 71, storeId: 702 }, 'owner-1'),
);
assert.equal(getAnswerlatticeUserChatSessionsCacheKey(null, 'owner-1'), null);
assert.equal(getAnswerlatticeUserChatSessionsCacheKey({ tenantId: 71, storeId: 701 }, ''), null);

const parsed = parseAnswerlatticeChatSessionDocument({
    id: 'session-1',
    value: validDocument,
    scope: { tId: 71, sId: 701 },
});
assert.equal(parsed?.id, 'session-1');
assert.equal(parsed?.messages.length, 1);
assert.deepEqual(parseAnswerlatticeChatSessionDocument({
    id: 'session-with-note',
    value: {
        ...validDocument,
        internalNotes: [{
            id: 'note-0',
            content: {
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Follow up privately.' }],
                }],
            },
            createdOn: Timestamp.now(),
        }],
    },
    scope: { tId: 71, sId: 701 },
})?.internalNotes?.[0]?.content, {
    type: 'doc',
    content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Follow up privately.' }],
    }],
}, 'persisted internal notes must pass the bounded TipTap projection');
assert.equal(parseAnswerlatticeChatSessionDocument({
    id: 'session-with-malformed-note',
    value: {
        ...validDocument,
        internalNotes: [{ content: { attackerControlled: true } }],
    },
    scope: { tId: 71, sId: 701 },
}), null, 'malformed persisted internal notes must reject the session');
assert.equal(parseAnswerlatticeChatSessionDocument({
    id: 'session-with-malformed-note-time',
    value: {
        ...validDocument,
        internalNotes: [{
            content: 'Legacy note',
            modifiedOn: { seconds: 1 },
        }],
    },
    scope: { tId: 71, sId: 701 },
}), null, 'malformed persisted internal-note timestamps must reject the session');

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
assert.throws(() => normalizeAnswerlatticeChatMessagesForStorage([{
    ...message('invalid-image-size'),
    image: { url: 'https://example.com/image.png', size: Number.NaN },
}]), /chat_image_invalid/);
assert.deepEqual(normalizeAnswerlatticeChatMessagesForStorage([{
    ...message('bounded-image'),
    image: { url: 'https://example.com/image.png', type: 'image/png' },
}])[0].image, {
    url: 'https://example.com/image.png',
    source: 'https://example.com/image.png',
    type: 'image/png',
});
assert.deepEqual(normalizeAnswerlatticeChatMessagesForStorage([{
    ...message('canonical-citation', 'assistant'),
    citations: [{
        id: 'citation-docs',
        title: 'Approved documentation',
        url: 'https://docs.example.com/support',
        sourceId: 'private-source-id',
    }],
    fallbackReason: 'canonical_scope_context_required',
    clarification: { type: 'scope_context', requiredContext: ['plan', 'plan', 'role'] },
    confidence: 'low',
}])[0], {
    ...message('canonical-citation', 'assistant'),
    citations: [{
        id: 'citation-docs',
        title: 'Approved documentation',
        url: 'https://docs.example.com/support',
    }],
    fallbackReason: 'canonical_scope_context_required',
    clarification: { type: 'scope_context', requiredContext: ['plan', 'role'] },
    confidence: 'low',
}, 'persisted chat messages must retain public answer metadata without private source IDs');

assert.deepEqual(normalizeAnswerlatticeInternalNote({ type: 'doc', content: [] }), { type: 'doc', content: [] });
assert.equal(normalizeAnswerlatticeInternalNote('Legacy plain-text note'), 'Legacy plain-text note');
assert.equal(getAnswerlatticeInternalNotePlainText({
    type: 'doc',
    content: [{
        type: 'paragraph',
        content: [
            { type: 'text', text: 'First' },
            { type: 'text', text: ' note' },
        ],
    }, {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second line' }],
    }],
}), 'First note\nSecond line', 'rich notes must export as their readable text rather than object coercion');
assert.throws(() => normalizeAnswerlatticeInternalNote('   '), /internal_note_invalid/);
assert.throws(() => normalizeAnswerlatticeInternalNote({ attackerControlled: true }), /internal_note_invalid/);
assert.throws(() => normalizeAnswerlatticeInternalNote('x'.repeat(33 * 1024)), /internal_note_invalid/);

const sharedImageUrl = 'https://firebasestorage.googleapis.com/v0/b/example/o/shared.png';
const removedImageUrl = 'https://firebasestorage.googleapis.com/v0/b/example/o/removed.png';
assert.deepEqual(collectAnswerlatticeChatImageUrls({
    messages: [
        { image: { url: sharedImageUrl, source: sharedImageUrl } },
        { image: { url: removedImageUrl, source: 'data:image/png;base64,AA==' } },
        { image: { url: '  ' } },
    ],
}), [sharedImageUrl, removedImageUrl]);
assert.deepEqual(filterUnreferencedAnswerlatticeChatImageUrls(
    [removedImageUrl, sharedImageUrl, removedImageUrl, 'data:image/png;base64,AA=='],
    { messages: [{ image: { source: sharedImageUrl } }] },
), [removedImageUrl], 'branch cleanup must preserve URLs retained by another message');
assert.deepEqual(collectAnswerlatticeChatImageUrls({
    messages: [{
        get image() {
            throw new Error('chat image getter must remain contained');
        },
    }],
}), []);
assert.deepEqual(collectAnswerlatticeChatImageUrls({
    messages: new Proxy([], {
        get() {
            throw new Error('chat message array access must remain contained');
        },
    }),
}), []);
assert.deepEqual(filterUnreferencedAnswerlatticeChatImageUrls(
    new Proxy([], {
        get() {
            throw new Error('chat cleanup candidate access must remain contained');
        },
    }),
    { messages: [] },
), []);
assert.equal(isAnswerlatticeChatImageStoragePath(
    'chatSessions/chatimages/71/701/upload.png',
    { tId: 71, sId: 701 },
), true);
assert.equal(isAnswerlatticeChatImageStoragePath(
    'chatSessions/chatimages/71/702/upload.png',
    { tId: 71, sId: 701 },
), false);
assert.equal(isAnswerlatticeChatImageStoragePath(
    'supportTickets/documents/71/701/upload.png',
    { tId: 71, sId: 701 },
), false);

const chatSessionDalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/database/chatSessions/index.ts'),
    'utf8',
);
assert.match(
    chatSessionDalSource,
    /const transactionResult = await runTransaction\(answerlatticeFirebaseClient,[\s\S]*?return \{ wrote: false, removedImageUrls: \[\] \};[\s\S]*?return \{ wrote: true, removedImageUrls \};/,
    'append compaction outcome and media cleanup must come from the committed transaction attempt',
);
assert.doesNotMatch(
    chatSessionDalSource,
    /let wrote = false;/,
    'append compaction must not retain a write flag from a transaction attempt that Firestore retries',
);

process.stdout.write('Answerlattice chat-session runtime contracts passed.\n');

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import type { CoreSearchResult } from '../../src/lib/search/types';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required.');
}

const scope = { tId: 79201, sId: 79301 };
const otherScope = { tId: 79201, sId: 79302 };
const sessionId = 'widget_conversation_emulator_session';
const result: CoreSearchResult = {
    craftedAnswer: 'Use the reviewed answer.',
    references: [],
    citations: [],
    suggestedQuestions: [],
    canonical: true,
    answerSource: 'canonical',
    confidence: 'high',
    imageProcessed: false,
    aiProviderUsed: false,
    aiProviderOperations: [],
    aiProviderTokenUsage: {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
        tokenCountSource: 'none',
    },
};

const run = async () => {
    const [conversationModule, firebaseModule] = await Promise.all([
        import('../../src/lib/answerlattice/widgetConversationServer'),
        import('../../src/lib/firebase/answerlatticeFirebaseAdmin'),
    ]);
    const {
        getAnswerlatticeWidgetConversationDocumentId,
        persistAnswerlatticeWidgetConversation,
    } = conversationModule;
    const db = firebaseModule.requireAnswerlatticeFirestoreAdmin();
    const conversationId = getAnswerlatticeWidgetConversationDocumentId(scope.tId, scope.sId, sessionId);
    const otherConversationId = getAnswerlatticeWidgetConversationDocumentId(otherScope.tId, otherScope.sId, sessionId);
    const persist = (requestId: string, query: string, targetScope = scope) => (
        persistAnswerlatticeWidgetConversation({
            ...targetScope,
            mode: requestId.endsWith('2') ? 'assistant' : 'qna',
            query,
            requestId,
            result,
            sessionId,
            visitor: {
                id: 'visitor-local-1',
                name: 'Local visitor',
                email: 'visitor@neelvara.com',
                verified: false,
            },
        })
    );

    try {
        await Promise.all([
            db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(conversationId).delete(),
            db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(otherConversationId).delete(),
        ]);

        assert.equal(await persist('widget_request_1', 'First question?'), conversationId);
        assert.equal(await persist('widget_request_1', 'First question?'), conversationId);
        let snapshot = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(conversationId).get();
        assert.equal(snapshot.data()?.messages?.length, 2, 'retry must not duplicate messages');
        assert.equal(snapshot.data()?.title, 'First question?');
        assert.equal(snapshot.data()?.pId, 'AL');
        assert.equal(snapshot.data()?.tId, scope.tId);
        assert.equal(snapshot.data()?.sId, scope.sId);

        assert.equal(await persist('widget_request_2', 'Follow-up question?'), conversationId);
        snapshot = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(conversationId).get();
        assert.equal(snapshot.data()?.messages?.length, 4);
        assert.equal(snapshot.data()?.mode, 'assistant');

        assert.equal(await persist('widget_request_3', 'Other workspace?', otherScope), otherConversationId);
        assert.notEqual(otherConversationId, conversationId, 'workspace scope must be part of the document ID');
        const otherSnapshot = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(otherConversationId).get();
        assert.equal(otherSnapshot.data()?.sId, otherScope.sId);

        process.stdout.write('Answerlattice widget conversation emulator verification passed.\n');
    } finally {
        await Promise.all([
            db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(conversationId).delete(),
            db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc(otherConversationId).delete(),
        ]);
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import {
    AnswerlatticeWidgetEscalationError,
    buildAnswerlatticeWidgetEscalationTicketId,
    executeAnswerlatticeWidgetEscalation,
} from '../../src/lib/answerlattice/widgetEscalationServer';
import {
    getAnswerlatticeSupportTicketDisplayId,
    parseAnswerlatticeSupportTicketDocument,
} from '../../src/lib/answerlattice/supportTicketLifecycle';

const scope = { tId: 1, sId: 101 };

const history = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: scope.tId,
    sId: scope.sId,
    uId: 'visitor-1',
    mountContext: 'widget',
    query: 'Why can I not connect Slack?',
    cacheKey: 'widget-test',
    craftedAnswer: 'Check the workspace permission and try again.',
    references: [{ id: 'article-1', title: 'Connect Slack', similarityScore: 0.62 }],
    citations: [],
    canonical: false,
    answerSource: 'rag',
    matchedEntityIds: ['integration_slack'],
    fallbackReason: 'entity_match_below_threshold',
    confidence: 'low',
    contextKey: 'settings.integrations.slack',
    surfaceFeature: 'integrations',
    surfacePage: 'slack',
    surfaceWorkflow: 'connect_slack',
    visitorId: 'visitor-1',
    visitorName: 'Test User',
    visitorEmail: 'user@example.com',
    widgetSessionId: 'widget-session-1',
    createdOn: Timestamp.now(),
    modifiedOn: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + (24 * 60 * 60 * 1000)),
    retentionDays: 90,
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    for (const collection of ['aiSearchHistory', 'supportTickets', 'answerlattice_signalEvents']) {
        await db.recursiveDelete(db.collection(collection));
    }

    await db.collection('aiSearchHistory').doc('history-1').set(history());
    const first = await executeAnswerlatticeWidgetEscalation({
        ...scope,
        searchHistoryId: 'history-1',
        email: 'user@example.com',
        name: 'Test User',
        details: 'OAuth returned a permission error.',
    });
    assert.equal(first.created, true);
    assert.equal(first.ticketId, buildAnswerlatticeWidgetEscalationTicketId({ ...scope, searchHistoryId: 'history-1' }));
    assert.equal(first.displayId, getAnswerlatticeSupportTicketDisplayId(first.ticketId));
    assert.match(first.displayId, /^WE-[A-Z0-9_-]{8}$/);
    assert.notEqual(
        first.displayId,
        getAnswerlatticeSupportTicketDisplayId(buildAnswerlatticeWidgetEscalationTicketId({ ...scope, searchHistoryId: 'history-2' })),
        'different widget search records must not collapse to the same constant-prefix display reference',
    );

    const ticketSnapshot = await db.collection('supportTickets').doc(first.ticketId).get();
    const ticket = parseAnswerlatticeSupportTicketDocument({
        id: first.ticketId,
        value: ticketSnapshot.data(),
        scope,
    });
    assert.ok(ticket, 'created ticket must satisfy the maintained ticket parser');
    assert.equal(ticket?.displayId, first.displayId);
    assert.equal(ticket?.source, 'ai_escalation');
    assert.equal(ticket?.widgetEscalation?.searchHistoryId, 'history-1');
    assert.equal(ticket?.widgetEscalation?.replyEmail, 'user@example.com');
    assert.deepEqual(ticket?.escalationContext?.triggerTypes, ['explicit_user_request']);
    assert.equal(ticket?.escalationContext?.query, 'Why can I not connect Slack?');
    assert.equal(
        ticket?.escalationContext?.productContext,
        undefined,
        'legacy search-history context must not be copied into a durable support ticket',
    );
    assert.equal(
        ticket?.contextKeys,
        undefined,
        'transient request context must not become a durable ticket classification',
    );
    assert.equal(ticket?.messages?.length, 1);

    const updatedHistory = (await db.collection('aiSearchHistory').doc('history-1').get()).data();
    assert.equal(updatedHistory?.escalationTicketId, first.ticketId);
    assert.equal(updatedHistory?.escalationStatus, 'ticket_created');
    assert.equal(updatedHistory?.resolutionOutcome, 'not_resolved');
    assert.equal(updatedHistory?.isGood, false);

    const replay = await executeAnswerlatticeWidgetEscalation({
        ...scope,
        searchHistoryId: 'history-1',
        email: 'user@example.com',
        name: 'Test User',
        details: 'OAuth returned a permission error.',
    });
    assert.equal(replay.ticketId, first.ticketId);
    assert.equal(replay.created, false);
    assert.equal((await db.collection('supportTickets').get()).size, 1, 'replay must not duplicate the support ticket');
    assert.equal((await db.collection('answerlattice_signalEvents').get()).size, 1, 'replay must not duplicate the escalation signal');
    const escalationSignal = (await db.collection('answerlattice_signalEvents').limit(1).get()).docs[0]?.data();
    assert.equal(
        escalationSignal?.metadata?.contextKey,
        undefined,
        'transient request context must not be copied into a durable escalation signal',
    );

    await db.collection('aiSearchHistory').doc('history-resolved').set(history({
        isGood: true,
        resolutionOutcome: 'resolved',
        submittedAt: Timestamp.now(),
    }));
    await assert.rejects(
        executeAnswerlatticeWidgetEscalation({
            ...scope,
            searchHistoryId: 'history-resolved',
            email: 'user@example.com',
        }),
        (error: unknown) => Number((error as AnswerlatticeWidgetEscalationError)?.status) === 409,
    );

    await db.collection('aiSearchHistory').doc('history-non-widget').set(history({ mountContext: 'help_center' }));
    await assert.rejects(
        executeAnswerlatticeWidgetEscalation({
            ...scope,
            searchHistoryId: 'history-non-widget',
            email: 'user@example.com',
        }),
        (error: unknown) => Number((error as AnswerlatticeWidgetEscalationError)?.status) === 404,
    );

    await db.collection('aiSearchHistory').doc('history-expired').set(history({
        expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    }));
    await assert.rejects(
        executeAnswerlatticeWidgetEscalation({
            ...scope,
            searchHistoryId: 'history-expired',
            email: 'user@example.com',
        }),
        (error: unknown) => Number((error as AnswerlatticeWidgetEscalationError)?.status) === 410,
    );

    await assert.rejects(
        executeAnswerlatticeWidgetEscalation({
            ...scope,
            searchHistoryId: 'history-1',
            email: 'not-an-email',
        }),
        (error: unknown) => Number((error as AnswerlatticeWidgetEscalationError)?.status) === 400,
    );
}

run()
    .then(() => process.stdout.write('Answerlattice widget escalation emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });

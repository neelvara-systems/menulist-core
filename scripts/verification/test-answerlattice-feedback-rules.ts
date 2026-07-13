#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    doc,
    getDoc,
    runTransaction,
    setDoc,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-feedback-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const feedback = (overrides: Record<string, unknown> = {}) => Object.fromEntries(Object.entries({
    type: 'general',
    rating: 5,
    comment: 'Clear and useful.',
    pId: 'AL',
    sourceContext: null,
    traceId: 'al_test_trace',
    requestId: 'al_test_trace',
    sId: 101,
    tId: 1,
    role: 'CUSTOMER',
    uId: 'user-1',
    modifiedBy: 'Feedback User',
    modifiedOn: NOW,
    createdOn: NOW,
    createdBy: 'Feedback User',
    ...overrides,
}).filter(([, value]) => value !== undefined));

const contentFeedbackItem = (overrides: Record<string, unknown> = {}) => ({
    comment: 'Useful note.',
    sentiment: 'like',
    action: 'added',
    createdOn: NOW,
    uId: 'support-1',
    userName: 'Feedback User',
    sourceContext: {
        uId: 'support-1',
        name: 'Feedback User',
        email: 'user@example.com',
    },
    ...overrides,
});

const contentFeedbackDocument = (
    list: Array<Record<string, unknown>>,
    overrides: Record<string, unknown> = {},
) => ({
    list,
    pId: 'AL',
    sourceContext: null,
    traceId: 'al_content_feedback_trace',
    requestId: 'al_content_feedback_trace',
    sId: 101,
    tId: 1,
    role: 'OWNER',
    uId: 'support-1',
    modifiedBy: 'Feedback User',
    modifiedOn: NOW,
    createdOn: NOW,
    createdBy: 'Feedback User',
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(
                path.join(ROOT, process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules'),
                'utf8',
            ),
        },
    });

    try {
        const selfDb = testEnv.authenticatedContext('user-1', {
            role: 'CUSTOMER',
            storeId: '101',
            tenantId: '1',
            uId: 'user-1',
        }).firestore();
        const supportDb = testEnv.authenticatedContext('support-1', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'support-1',
        }).firestore();
        const otherWorkspaceDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2',
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();

        await assertSucceeds(setDoc(doc(selfDb, 'feedback', 'general-1'), feedback()));
        await assertSucceeds(setDoc(doc(selfDb, 'feedback', 'feature-usage-1'), feedback({
            type: 'feature_usage',
            featureIssues: ['Account access'],
            rating: undefined,
            comment: undefined,
        })));
        await assertSucceeds(setDoc(doc(selfDb, 'feedback', 'feature-request-1'), feedback({
            type: 'feature_requests',
            featureRequest: 'Please add clearer setup guides.',
            rating: undefined,
            comment: undefined,
        })));
        await assertSucceeds(getDoc(doc(selfDb, 'feedback', 'general-1')));
        await assertSucceeds(getDoc(doc(supportDb, 'feedback', 'general-1')));
        await assertFails(getDoc(doc(otherWorkspaceDb, 'feedback', 'general-1')));
        await assertFails(getDoc(doc(publicDb, 'feedback', 'general-1')));

        await assertFails(setDoc(doc(selfDb, 'feedback', 'arbitrary-field'), feedback({ admin: true })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'oversized'), feedback({ comment: 'x'.repeat(1001) })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'invalid-rating'), feedback({ rating: 6 })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'empty-feature-usage'), feedback({
            type: 'feature_usage',
            rating: undefined,
            comment: undefined,
        })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'duplicate-votes'), feedback({
            type: 'feature_requests',
            rating: undefined,
            comment: undefined,
            votedPopularRequests: [
                { feature: 'Clearer setup guides', interested: true },
                { feature: 'Clearer setup guides', interested: false },
            ],
        })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'forged-user'), feedback({ uId: 'other-user' })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'cross-workspace'), feedback({ tId: 2, sId: 202 })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'bad-source-context'), feedback({
            sourceContext: {
                uId: 'user-1',
                name: 'Feedback User',
                email: 'user@example.com',
                secret: 'must not persist',
            },
        })));
        await assertFails(setDoc(doc(selfDb, 'feedback', 'bad-source-product'), feedback({
            sourceContext: {
                uId: 'user-1',
                name: 'Feedback User',
                email: 'user@example.com',
                pId: 'UNKNOWN',
            },
        })));

        await assertSucceeds(updateDoc(doc(supportDb, 'feedback', 'general-1'), {
            contextKey: 'billing.overview',
            surfaceId: 'billing',
            surfaceLabel: 'Billing',
            surfaceAssignedBy: 'support-1',
            surfaceAssignedAt: NOW,
            modifiedBy: 'Support Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(doc(supportDb, 'feedback', 'general-1'), {
            comment: 'Altered by support',
            modifiedBy: 'Support Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(doc(supportDb, 'feedback', 'general-1'), {
            uId: 'support-1',
            modifiedBy: 'Support Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(doc(supportDb, 'feedback', 'general-1'), {
            tId: 2,
            sId: 202,
            modifiedBy: 'Support Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(doc(selfDb, 'feedback', 'general-1'), {
            contextKey: 'account.access',
            surfaceId: 'account',
            surfaceLabel: 'Account',
            surfaceAssignedBy: 'user-1',
            surfaceAssignedAt: NOW,
            modifiedBy: 'Feedback User',
            modifiedOn: NOW,
        }));

        const directItem = contentFeedbackItem({ requestId: 'a'.repeat(24) });
        const directFeedbackRef = doc(supportDb, 'article_feedback', '1', '101', 'doc1_direct');
        await assertFails(setDoc(
            directFeedbackRef,
            contentFeedbackDocument([directItem]),
        ));
        const secondItem = contentFeedbackItem({ sentiment: 'dislike', comment: 'Needs work.' });
        await assertFails(updateDoc(directFeedbackRef, {
            list: [directItem, secondItem],
            modifiedBy: 'support-1',
            modifiedOn: NOW,
        }));
        await assertFails(setDoc(
            doc(supportDb, 'article_feedback', '1', '101', 'invalid-item'),
            contentFeedbackDocument([contentFeedbackItem({ secret: 'must not persist' })]),
        ));
        await assertFails(setDoc(
            doc(supportDb, 'article_feedback', '1', '101', 'multiple-create-items'),
            contentFeedbackDocument([directItem, secondItem]),
        ));
        await assertFails(setDoc(
            doc(otherWorkspaceDb, 'article_feedback', '1', '101', 'cross-workspace-content'),
            contentFeedbackDocument([contentFeedbackItem({ uId: 'owner-2' })]),
        ));

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'kb_articles', 'article-atomic'), {
                id: 'article-atomic',
                pId: 'AL',
                tId: 1,
                sId: 101,
                likes: 0,
                dislikes: 0,
            });
            await setDoc(doc(db, 'kb_articles', 'article-rollback'), {
                id: 'article-rollback',
                pId: 'AL',
                tId: 1,
                sId: 101,
                likes: 0,
                dislikes: 0,
            });
            await setDoc(
                doc(db, 'article_feedback', '1', '101', 'doc1_capped'),
                contentFeedbackDocument(Array.from({ length: 200 }, (_, index) => contentFeedbackItem({ comment: `Event ${index}` }))),
            );
            await setDoc(
                doc(db, 'article_feedback', '1', '101', 'doc1_direct'),
                contentFeedbackDocument([directItem]),
            );
            await setDoc(doc(db, 'changelog', '1', '101', 'page-1'), {
                pId: 'AL',
                tId: 1,
                sId: 101,
                entries: [],
            });
        });

        await assertSucceeds(getDoc(directFeedbackRef));
        await assertFails(getDoc(doc(otherWorkspaceDb, 'article_feedback', '1', '101', 'doc1_direct')));
        await assertFails(setDoc(doc(supportDb, 'changelog', '1', '101', 'page-2'), {
            pId: 'AL',
            tId: 1,
            sId: 101,
            entries: [],
        }));
        await assertFails(updateDoc(doc(supportDb, 'changelog', '1', '101', 'page-1'), { entries: [] }));

        await assertFails(runTransaction(supportDb, async (transaction) => {
            const articleRef = doc(supportDb, 'kb_articles', 'article-atomic');
            const auditRef = doc(supportDb, 'article_feedback', '1', '101', 'doc1_article-atomic');
            transaction.update(articleRef, { likes: 1 });
            transaction.set(auditRef, contentFeedbackDocument([directItem]));
        }));
        await assertFails(runTransaction(supportDb, async (transaction) => {
            const articleRef = doc(supportDb, 'kb_articles', 'article-rollback');
            const auditRef = doc(supportDb, 'article_feedback', '1', '101', 'doc1_article-rollback');
            transaction.update(articleRef, { likes: 1 });
            transaction.set(auditRef, contentFeedbackDocument([contentFeedbackItem({ unexpected: true })]));
        }));
        const rolledBackArticle = await assertSucceeds(getDoc(doc(supportDb, 'kb_articles', 'article-rollback')));
        if (rolledBackArticle.data()?.likes !== 0) throw new Error('Failed content audit write must roll back source counter');
        const atomicArticle = await assertSucceeds(getDoc(doc(supportDb, 'kb_articles', 'article-atomic')));
        if (atomicArticle.data()?.likes !== 0) throw new Error('Direct content feedback transaction must not mutate source counters');

        const cappedRef = doc(supportDb, 'article_feedback', '1', '101', 'doc1_capped');
        const cappedSnapshot = await assertSucceeds(getDoc(cappedRef));
        const cappedList = cappedSnapshot.data()?.list;
        if (!Array.isArray(cappedList)) throw new Error('Expected capped content feedback list');
        await assertFails(updateDoc(cappedRef, {
            list: [...cappedList.slice(1), directItem],
            modifiedBy: 'support-1',
            modifiedOn: NOW,
        }));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Answerlattice feedback Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});

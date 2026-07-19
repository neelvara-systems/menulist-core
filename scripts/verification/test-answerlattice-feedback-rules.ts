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

const faqDocument = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    pId: 'AL',
    tId: 1,
    sId: 101,
    question: 'How do I connect the integration?',
    answer: 'Open settings and follow the approved connection steps.',
    status: 'draft',
    source: 'manual',
    active: true,
    sortOrder: 100,
    tags: [],
    contextKeys: [],
    entityIds: [],
    likes: 0,
    dislikes: 0,
    role: 'OWNER',
    uId: 'knowledge-1',
    modifiedBy: 'Knowledge Owner',
    modifiedOn: NOW,
    createdOn: NOW,
    createdBy: 'Knowledge Owner',
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
        const knowledgeDb = testEnv.authenticatedContext('knowledge-1', {
            role: 'CUSTOM',
            storeId: '101',
            tenantId: '1',
            uId: 'knowledge-1',
            canManageKnowledge: true,
        }).firestore();
        const supportPermissionDb = testEnv.authenticatedContext('support-permission-1', {
            role: 'CUSTOM',
            storeId: '101',
            tenantId: '1',
            uId: 'support-permission-1',
            canManageSupport: true,
        }).firestore();
        const teamOnlyDb = testEnv.authenticatedContext('team-1', {
            role: 'CUSTOM',
            storeId: '101',
            tenantId: '1',
            uId: 'team-1',
            canManageTeam: true,
        }).firestore();
        const widgetOnlyDb = testEnv.authenticatedContext('widget-1', {
            role: 'CUSTOM',
            storeId: '101',
            tenantId: '1',
            uId: 'widget-1',
            canManageWidget: true,
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();

        await assertFails(setDoc(doc(selfDb, 'feedback', 'direct-client-create'), feedback()));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'feedback', 'general-1'), feedback());
            await setDoc(doc(db, 'feedback', 'general-2'), feedback({ uId: 'user-2' }));
            await setDoc(doc(db, 'feedback', 'feature-usage-1'), feedback({
                type: 'feature_usage',
                featureIssues: ['Account access'],
                rating: undefined,
                comment: undefined,
            }));
            await setDoc(doc(db, 'feedback', 'feature-request-1'), feedback({
                type: 'feature_requests',
                featureRequest: 'Please add clearer setup guides.',
                rating: undefined,
                comment: undefined,
            }));
        });
        await assertSucceeds(getDoc(doc(selfDb, 'feedback', 'general-1')));
        await assertFails(getDoc(doc(selfDb, 'feedback', 'general-2')));
        await assertSucceeds(getDoc(doc(supportDb, 'feedback', 'general-1')));
        await assertSucceeds(getDoc(doc(supportPermissionDb, 'feedback', 'general-1')));
        await assertFails(getDoc(doc(teamOnlyDb, 'feedback', 'general-1')));
        await assertFails(getDoc(doc(widgetOnlyDb, 'feedback', 'general-1')));
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

        await assertSucceeds(updateDoc(doc(supportPermissionDb, 'feedback', 'general-1'), {
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
        await assertFails(updateDoc(doc(widgetOnlyDb, 'feedback', 'general-1'), {
            contextKey: 'account.access',
            surfaceId: 'account',
            surfaceLabel: 'Account',
            surfaceAssignedBy: 'widget-1',
            surfaceAssignedAt: NOW,
            modifiedBy: 'Widget Manager',
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
        await assertFails(setDoc(
            doc(supportDb, 'faq_feedback', '1', '101', 'doc1_direct'),
            contentFeedbackDocument([directItem]),
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
            await setDoc(doc(db, 'kb_articles', 'faq-article'), {
                id: 'faq-article',
                pId: 'AL',
                tId: 1,
                sId: 101,
                title: 'Integration setup',
                active: true,
                status: 'published',
            });
            await setDoc(doc(db, 'kb_articles', 'faq-draft-article'), {
                id: 'faq-draft-article',
                pId: 'AL',
                tId: 1,
                sId: 101,
                title: 'Draft integration setup',
                active: false,
                status: 'draft',
            });
            await setDoc(doc(db, 'answerlattice_faqs', 'generated-faq'), faqDocument('generated-faq', {
                source: 'article',
                status: 'needs_review',
                active: false,
                articleId: 'faq-article',
                articleTitle: 'Integration setup',
                generatedFromArticleId: 'faq-article',
                jobId: 'job-1',
            }));
            await setDoc(
                doc(db, 'article_feedback', '1', '101', 'doc1_capped'),
                contentFeedbackDocument(Array.from({ length: 200 }, (_, index) => contentFeedbackItem({ comment: `Event ${index}` }))),
            );
            await setDoc(
                doc(db, 'article_feedback', '1', '101', 'doc1_direct'),
                contentFeedbackDocument([directItem]),
            );
            await setDoc(
                doc(db, 'article_feedback', '1', '101', 'state1_internal'),
                { pId: 'AL', tId: 1, sId: 101, actors: { ['a'.repeat(40)]: 'like' }, actorCount: 1 },
            );
            await setDoc(
                doc(db, 'faq_feedback', '1', '101', 'doc1_direct'),
                contentFeedbackDocument([directItem]),
            );
            await setDoc(doc(db, 'kb_categories', 'categories_1_101'), { categories: {} });
            await setDoc(doc(db, 'changelog', '1', '101', 'page-1'), {
                pId: 'AL',
                tId: 1,
                sId: 101,
                entries: [],
            });
        });

        await assertSucceeds(getDoc(directFeedbackRef));
        await assertSucceeds(getDoc(doc(knowledgeDb, 'article_feedback', '1', '101', 'doc1_direct')));
        await assertSucceeds(getDoc(doc(supportPermissionDb, 'article_feedback', '1', '101', 'doc1_direct')));
        await assertFails(getDoc(doc(teamOnlyDb, 'article_feedback', '1', '101', 'doc1_direct')));
        await assertFails(getDoc(doc(widgetOnlyDb, 'article_feedback', '1', '101', 'doc1_direct')));
        await assertFails(getDoc(doc(otherWorkspaceDb, 'article_feedback', '1', '101', 'doc1_direct')));
        await assertFails(getDoc(doc(knowledgeDb, 'article_feedback', '1', '101', 'state1_internal')));
        await assertSucceeds(getDoc(doc(knowledgeDb, 'faq_feedback', '1', '101', 'doc1_direct')));
        await assertSucceeds(getDoc(doc(supportPermissionDb, 'faq_feedback', '1', '101', 'doc1_direct')));
        await assertFails(getDoc(doc(teamOnlyDb, 'faq_feedback', '1', '101', 'doc1_direct')));
        await assertFails(getDoc(doc(otherWorkspaceDb, 'faq_feedback', '1', '101', 'doc1_direct')));

        await assertSucceeds(setDoc(
            doc(knowledgeDb, 'answerlattice_faqs', 'manual-faq'),
            faqDocument('manual-faq'),
        ));
        await assertSucceeds(setDoc(
            doc(knowledgeDb, 'answerlattice_faqs', 'linked-faq'),
            faqDocument('linked-faq', {
                articleId: 'faq-article',
                articleTitle: 'Integration setup',
            }),
        ));
        await assertFails(setDoc(
            doc(knowledgeDb, 'answerlattice_faqs', 'forged-source'),
            faqDocument('forged-source', { source: 'article' }),
        ));
        await assertFails(setDoc(
            doc(knowledgeDb, 'answerlattice_faqs', 'forged-lineage'),
            faqDocument('forged-lineage', { jobId: 'job-forged' }),
        ));
        await assertFails(setDoc(
            doc(knowledgeDb, 'answerlattice_faqs', 'forged-counter'),
            faqDocument('forged-counter', { likes: 1 }),
        ));
        await assertFails(setDoc(
            doc(knowledgeDb, 'answerlattice_faqs', 'wrong-article-title'),
            faqDocument('wrong-article-title', {
                articleId: 'faq-article',
                articleTitle: 'Forged article title',
            }),
        ));
        await assertFails(setDoc(
            doc(knowledgeDb, 'answerlattice_faqs', 'draft-linked-published'),
            faqDocument('draft-linked-published', {
                status: 'published',
                articleId: 'faq-draft-article',
                articleTitle: 'Draft integration setup',
            }),
        ));
        await assertSucceeds(updateDoc(doc(knowledgeDb, 'answerlattice_faqs', 'generated-faq'), {
            question: 'How do I connect this integration safely?',
            active: true,
            modifiedBy: 'Knowledge Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(doc(knowledgeDb, 'answerlattice_faqs', 'generated-faq'), {
            source: 'manual',
        }));
        await assertFails(updateDoc(doc(knowledgeDb, 'answerlattice_faqs', 'generated-faq'), {
            likes: 1,
        }));
        await assertSucceeds(updateDoc(doc(knowledgeDb, 'kb_categories', 'categories_1_101'), {
            categories: {
                docs: {
                    id: 'docs', title: 'Docs', description: 'Docs', icon: 'book', url: '/docs', active: true, index: 0,
                },
            },
        }));
        await assertFails(updateDoc(doc(teamOnlyDb, 'kb_categories', 'categories_1_101'), { categories: {} }));
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

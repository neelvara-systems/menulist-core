import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { AI_ACTIONS_TYPES } from '../../src/constants/common';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    analyzeKnowledgeIntakeJob,
    getKnowledgeIntakeBundle,
    publishKnowledgeIntakeJob,
    updateKnowledgeIntakeReviewItem,
} from '../../src/lib/answerlattice/knowledgeIntake';
import { generateAnswerlatticeProductStarterPack } from '../../src/lib/answerlattice/firstTrustedAnswerPackServer';
import { normalizeAnswerlatticeRetrievalFaq } from '../../src/lib/answerlattice/faqContent';
import { getBillingPeriodKey } from '../../src/lib/billing/billingPeriod';
import { reserveAnswerlatticeIntakeUsage } from '../../src/lib/answerlattice/intakeUsageLedger';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'node:crypto';

const scope = { tId: 1, sId: 101 };
const jobId = 'ABCDEFGHIJKLMNOPQRST';
const actor = { id: 'owner-1', email: 'owner@example.com', name: 'Owner' };

const buildPackCandidates = (sourceId: string, entityId: string) => ({
    candidates: Array.from({ length: 10 }, (_, index) => ({
        title: `Billing launch question ${index + 1}`,
        question: `How does the billing workflow handle launch case ${index + 1}?`,
        proposedAnswer: index === 9
            ? 'This model-generated text must be discarded because the candidate is explicitly marked no answer.'
            : `Use the documented billing workflow for launch case ${index + 1} and verify the current account state before continuing.`,
        sourceIds: [sourceId],
        entityIds: [entityId],
        missingEvidence: index === 9 ? ['The selected sources do not contain an approved answer.'] : [],
        reason: index === 9
            ? 'This launch question exposes a source gap that must stay unresolved.'
            : 'This question is supported by the selected billing launch source.',
        expectedSource: index === 9 ? 'no_answer' as const : 'canonical' as const,
        riskLevel: index === 0 ? 'critical' as const : 'standard' as const,
        requiresEscalation: false,
        applicability: {
            path: '/billing',
            feature: 'billing',
            workflow: `launch_case_${index + 1}`,
        },
    })),
});

async function seedPackBilling(): Promise<string> {
    const subscriptionId = 'al-subscription-intake-pack';
    const cycleStartDate = Timestamp.now();
    const billingPeriod = getBillingPeriodKey(cycleStartDate);
    assert.ok(billingPeriod);
    await Promise.all([
        db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId)).set({
            id: scope.sId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            answerlatticeSubscription: {
                id: subscriptionId,
                monthlyCredits: 5,
                topUpCredits: 0,
            },
        }),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({
            id: subscriptionId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            tenantId: scope.tId,
            storeId: scope.sId,
            status: 'active',
            cycleStartDate,
            cycleEndDate: Timestamp.fromMillis(Date.now() + 86_400_000),
            monthlyCreditsAllowance: 5,
            monthlyCredits: 5,
            topUpCredits: 0,
            creditsLastResetMonth: billingPeriod,
        }),
    ]);
    return subscriptionId;
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db || typeof (db as any).collection !== 'function') throw new Error('Answerlattice emulator Firestore is not configured');

    const createdOn = Timestamp.fromMillis(1_700_000_000_000);
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(jobId).set({
        id: jobId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        title: 'Billing knowledge',
        status: 'collecting',
        sourceCount: 1,
        readySourceCount: 1,
        reviewItemCount: 0,
        acceptedItemCount: 0,
        publishedItemCount: 0,
        rejectedItemCount: 0,
        usageUnitsConsumed: 0,
        usageSummary: {},
        createdOn,
        modifiedOn: createdOn,
    });
    const sourceId = `kis_${'c'.repeat(28)}`;
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(sourceId).set({
        id: sourceId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        jobId,
        type: 'faq',
        title: 'Billing failures',
        status: 'ready',
        contentText: 'Question: Why did my invoice fail?\nAnswer: Open Billing, inspect the failed invoice, and retry with an active payment method.',
        contentExcerpt: 'Question: Why did my invoice fail?',
        contentHash: 'b'.repeat(64),
        tags: ['billing'],
        contextKeys: ['billing'],
        entityIds: [],
        metadata: {},
        errorMessage: null,
        createdOn,
        modifiedOn: createdOn,
    });

    const first = await analyzeKnowledgeIntakeJob(scope, jobId, actor);
    assert.ok(first.created > 0, 'first analysis must create deterministic review drafts');

    const firstBundle = await getKnowledgeIntakeBundle(scope, jobId);
    assert.equal(firstBundle.reviewItems.length, first.created);
    const ownerEdited = firstBundle.reviewItems[0];
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS).doc(ownerEdited.id).set({
        status: 'accepted',
        title: 'Owner-approved billing answer',
        modifiedOn: Timestamp.now(),
    }, { merge: true });

    const corroboratingSourceId = `kis_${'e'.repeat(28)}`;
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(corroboratingSourceId).set({
            id: corroboratingSourceId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId,
            type: 'faq',
            title: 'Billing failures',
            status: 'ready',
            contentText: 'Question: Why did my invoice fail?\nAnswer: Open Billing, inspect the failed invoice, and retry with an active payment method.',
            contentExcerpt: 'Question: Why did my invoice fail?',
            contentHash: 'c'.repeat(64),
            tags: ['payments'],
            contextKeys: ['invoice'],
            entityIds: [],
            metadata: {},
            errorMessage: null,
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(jobId).set({
            sourceCount: 2,
            readySourceCount: 2,
            modifiedOn: Timestamp.now(),
        }, { merge: true }),
    ]);

    const second = await analyzeKnowledgeIntakeJob(scope, jobId, actor);
    assert.equal(second.created, 0, 're-analysis must not rewrite deterministic drafts');
    const secondBundle = await getKnowledgeIntakeBundle(scope, jobId);
    const preserved = secondBundle.reviewItems.find(item => item.id === ownerEdited.id);
    assert.equal(preserved?.status, 'accepted', 'owner review status must survive re-analysis');
    assert.equal(preserved?.title, 'Owner-approved billing answer', 'owner edits must survive re-analysis');
    assert.deepEqual(
        preserved?.sourceIds,
        [sourceId, corroboratingSourceId],
        're-analysis must add corroborating evidence without rewriting owner content',
    );
    assert.equal(secondBundle.job?.acceptedItemCount, 1, 'job counters must be rebuilt from current review state');

    const faqItem = secondBundle.reviewItems.find(item => item.target === 'faq');
    assert.ok(faqItem, 'the repeated question source must create a reviewable FAQ');
    const reviewBatch = db.batch();
    secondBundle.reviewItems.forEach((reviewItem) => {
        reviewBatch.set(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS).doc(reviewItem.id),
            { status: reviewItem.id === faqItem.id ? 'accepted' : 'rejected', modifiedOn: Timestamp.now() },
            { merge: true },
        );
    });
    await reviewBatch.commit();

    await assert.rejects(
        () => publishKnowledgeIntakeJob(scope, jobId, [], actor),
        /Select at least one review item/,
        'an explicit empty selection must not publish every accepted item',
    );
    const beforeSelectedPublish = await getKnowledgeIntakeBundle(scope, jobId);
    assert.equal(
        beforeSelectedPublish.reviewItems.find(item => item.id === faqItem.id)?.status,
        'accepted',
    );

    const publishResult = await publishKnowledgeIntakeJob(scope, jobId, undefined, actor);
    assert.equal(publishResult.published.length, 1, 'only the accepted FAQ should publish');
    assert.equal(publishResult.published[0]?.target, 'faq');
    const publishedFaq = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc(publishResult.published[0].id).get();
    assert.equal(publishedFaq.exists, true);
    assert.equal(publishedFaq.data()?.intakeReviewItemId, faqItem.id);
    assert.deepEqual(publishedFaq.data()?.intakeSourceIds, [sourceId, corroboratingSourceId]);
    assert.ok(
        normalizeAnswerlatticeRetrievalFaq(publishedFaq.data(), publishedFaq.id, scope),
        'intake-published FAQs must remain eligible for FAQ retrieval',
    );
    const publishedBundle = await getKnowledgeIntakeBundle(scope, jobId);
    assert.equal(publishedBundle.job?.status, 'published');
    assert.equal(
        publishedBundle.reviewItems.find(item => item.id === faqItem.id)?.status,
        'published',
        'review must become published after required destination freshness effects complete',
    );
    await assert.rejects(
        () => publishKnowledgeIntakeJob(scope, jobId, undefined, actor),
        /Accept at least one review item|can no longer publish/,
        'a terminal published job must not start a second publish run',
    );

    const resumedJobId = 'RESUMEABCDEFGHIJKLMN';
    const resumedItemId = `kii_${'f'.repeat(28)}`;
    const resumedFaqId = `intake_faq_${crypto
        .createHash('sha256')
        .update(`${scope.tId}:${scope.sId}:${resumedItemId}`)
        .digest('hex')
        .slice(0, 24)}`;
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(resumedJobId).set({
            id: resumedJobId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            title: 'Resumable FAQ publish',
            status: 'reviewing',
            sourceCount: 1,
            readySourceCount: 1,
            reviewItemCount: 1,
            acceptedItemCount: 1,
            publishedItemCount: 0,
            rejectedItemCount: 0,
            usageUnitsConsumed: 0,
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS).doc(resumedItemId).set({
            id: resumedItemId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId: resumedJobId,
            target: 'faq',
            status: 'accepted',
            title: 'How can a publish resume?',
            question: 'How can a publish resume?',
            answer: 'Retry the accepted item so required freshness effects complete before it becomes published.',
            sourceIds: [sourceId],
            publishTargetId: resumedFaqId,
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc(resumedFaqId).set({
            id: resumedFaqId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            question: 'How can a publish resume?',
            answer: 'Retry the accepted item so required freshness effects complete before it becomes published.',
            status: 'published',
            source: 'knowledge_intake',
            active: true,
            intakeJobId: resumedJobId,
            intakeReviewItemId: resumedItemId,
            intakeSourceIds: [sourceId],
            createdOn,
            modifiedOn: createdOn,
        }),
    ]);
    let contextSummaryAttempts = 0;
    await assert.rejects(
        () => publishKnowledgeIntakeJob(
            scope,
            resumedJobId,
            [resumedItemId],
            actor,
            {
                rebuildContextSummary: async () => {
                    contextSummaryAttempts += 1;
                    throw new Error('Injected context summary failure');
                },
            },
        ),
        /Injected context summary failure/,
        'a required context-summary failure must reject publication',
    );
    assert.equal(contextSummaryAttempts, 1);
    const interruptedBundle = await getKnowledgeIntakeBundle(scope, resumedJobId);
    assert.equal(
        interruptedBundle.reviewItems.find(item => item.id === resumedItemId)?.status,
        'accepted',
        'a required context-summary failure must leave the deterministic destination retryable',
    );
    assert.equal(
        interruptedBundle.reviewItems.find(item => item.id === resumedItemId)?.publishTargetId,
        resumedFaqId,
    );

    const resumedPublish = await publishKnowledgeIntakeJob(scope, resumedJobId, [resumedItemId], actor);
    assert.equal(resumedPublish.published.length, 1, 'a deterministic target from an interrupted publish must resume');
    const resumedBundle = await getKnowledgeIntakeBundle(scope, resumedJobId);
    assert.equal(
        resumedBundle.reviewItems.find(item => item.id === resumedItemId)?.status,
        'published',
        'a target marker must not bypass required freshness effects or final review settlement',
    );
    assert.equal(resumedBundle.job?.status, 'published');

    const packJobId = 'PACKABCDEFGHIJKLMNOP';
    const packSourceId = `kis_${'d'.repeat(28)}`;
    const packEntityId = 'entity_billing_launch';
    const subscriptionId = await seedPackBilling();
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({
        monthlyCredits: '5',
    }, { merge: true });
    await assert.rejects(
        () => reserveAnswerlatticeIntakeUsage(scope, {
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_PRODUCT_STARTER_PACK,
            actor,
            jobId: packJobId,
        }),
        /credit balance is invalid/,
        'String-coercible subscription credits must fail before intake provider work',
    );
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({
        monthlyCredits: 5,
    }, { merge: true });
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(packJobId).set({
        id: packJobId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        title: 'Product launch sources',
        description: 'Billing setup and launch support.',
        status: 'collecting',
        sourceCount: 1,
        readySourceCount: 1,
        reviewItemCount: 0,
        acceptedItemCount: 0,
        publishedItemCount: 0,
        rejectedItemCount: 0,
        usageUnitsConsumed: 0,
        createdOn,
        modifiedOn: createdOn,
    });
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(packSourceId).set({
        id: packSourceId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        jobId: packJobId,
        type: 'help_doc',
        title: 'Billing launch guide',
        status: 'ready',
        originUrl: 'https://example.com/billing',
        contentText: 'Billing setup is available at /billing. Review account state before retrying a payment or changing a plan.',
        contentExcerpt: 'Billing setup is available at /billing.',
        contentHash: 'd'.repeat(64),
        tags: ['billing'],
        contextKeys: ['billing'],
        entityIds: [packEntityId],
        metadata: {},
        createdOn,
        modifiedOn: createdOn,
    });

    let providerCalls = 0;
    const validProvider = async () => {
        providerCalls += 1;
        return {
            text: JSON.stringify(buildPackCandidates(packSourceId, packEntityId)),
            usageMetadata: {
                promptTokenCount: 300,
                candidatesTokenCount: 200,
                totalTokenCount: 500,
                tokenCountSource: 'provider' as const,
            },
        };
    };
    await assert.rejects(
        () => generateAnswerlatticeProductStarterPack(
            scope,
            packJobId,
            'bad',
            actor,
            { generateContent: validProvider },
        ),
        /request is invalid/,
        'direct product-pack calls must enforce the same bounded request identity as the API',
    );
    assert.equal(providerCalls, 0, 'an invalid product-pack request must fail before provider work');
    const generatedPack = await generateAnswerlatticeProductStarterPack(
        scope,
        packJobId,
        'pack_request_001',
        actor,
        { generateContent: validProvider },
    );
    assert.equal(generatedPack.cached, false);
    assert.equal(generatedPack.reviewItems.length, 10);
    assert.equal(generatedPack.cases.length, 10);
    assert.equal(generatedPack.usage.unitsConsumed, 1);
    assert.equal(providerCalls, 1);
    assert.ok(generatedPack.reviewItems.every(item => (
        item.status === 'draft'
        && item.sourceIds?.[0] === packSourceId
        && item.launchPack?.sourceIds[0] === packSourceId
    )));
    const unsupportedPackItem = generatedPack.reviewItems[9];
    assert.equal(unsupportedPackItem?.answer, undefined, 'missing evidence must not be stored as an answer');
    assert.equal(unsupportedPackItem?.body, undefined, 'missing evidence must not be stored in the canonical proposal body');
    assert.equal(generatedPack.cases[9]?.expected.source, 'no_answer', 'unsupported launch questions must remain explicit no-answer checks');
    assert.equal(
        unsupportedPackItem?.launchPack?.missingEvidence.some(value => value.includes('generated answer text was not retained')),
        true,
        'contradictory model answer text must be discarded and surfaced as review evidence',
    );
    await assert.rejects(
        () => updateKnowledgeIntakeReviewItem(scope, packJobId, unsupportedPackItem.id, {
            status: 'accepted',
        }, actor),
        /safe escalation or no answer/,
        'safe-fallback launch items must never enter the canonical proposal path',
    );
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 4);
    const generatedJob = (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(packJobId).get()).data();
    assert.equal(generatedJob?.reviewItemCount, 10);
    assert.equal(generatedJob?.launchPackRun?.status, 'completed');

    const cachedPack = await generateAnswerlatticeProductStarterPack(
        scope,
        packJobId,
        'pack_request_002',
        actor,
        { generateContent: validProvider },
    );
    assert.equal(cachedPack.cached, true);
    assert.equal(cachedPack.usage.unitsConsumed, 0);
    assert.equal(providerCalls, 1, 'unchanged sources must not call the provider again');
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 4);

    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(packJobId).set({
        targetAudience: 'Billing administrators preparing a production launch',
        modifiedOn: Timestamp.now(),
    }, { merge: true });
    const contextRefreshedPack = await generateAnswerlatticeProductStarterPack(
        scope,
        packJobId,
        'pack_request_003',
        actor,
        { generateContent: validProvider },
    );
    assert.equal(contextRefreshedPack.cached, false, 'changed prompt context must create a fresh product pack');
    assert.notEqual(contextRefreshedPack.sourceHash, generatedPack.sourceHash, 'the generation-input hash must cover intake context');
    assert.equal(providerCalls, 2, 'changed prompt context must call the provider once');
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 3);

    await assert.rejects(
        () => updateKnowledgeIntakeReviewItem(scope, packJobId, generatedPack.reviewItems[0].id, {
            status: 'accepted',
            answer: '',
            body: '',
        }, actor),
        /Add a supported answer/,
        'a generated canonical proposal must contain a supported answer before acceptance',
    );

    const callsBeforeCrossTenant = providerCalls;
    await assert.rejects(
        () => generateAnswerlatticeProductStarterPack(
            { tId: 2, sId: scope.sId },
            packJobId,
            'pack_wrong_scope_001',
            actor,
            { generateContent: validProvider },
        ),
        /not available|Invalid/,
    );
    assert.equal(providerCalls, callsBeforeCrossTenant, 'cross-tenant access must fail before provider work');

    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(packSourceId).set({
        contentText: 'Updated billing launch evidence.',
        contentHash: 'e'.repeat(64),
        modifiedOn: Timestamp.now(),
    }, { merge: true });
    await assert.rejects(
        () => generateAnswerlatticeProductStarterPack(
            scope,
            packJobId,
            'pack_invalid_evidence_001',
            actor,
            {
                generateContent: async () => {
                    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({ status: 'pending' }, { merge: true });
                    return {
                        text: JSON.stringify(buildPackCandidates(`kis_${'e'.repeat(28)}`, packEntityId)),
                    };
                },
            },
        ),
        /valid source evidence/,
    );
    const refundedSubscription = (await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data();
    assert.equal(refundedSubscription?.monthlyCredits, 3, 'invalid provider evidence must refund the exact reservation even if subscription status changes mid-operation');
    const usageLedgersAfterRefund = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .get();
    assert.equal(usageLedgersAfterRefund.docs.filter(doc => doc.data().status === 'failed_refunded').length, 1);
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({ status: 'active' }, { merge: true });

    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(packSourceId).set({
        contentText: 'Final billing launch evidence for concurrent generation.',
        contentHash: 'f'.repeat(64),
        modifiedOn: Timestamp.now(),
    }, { merge: true });
    let releaseProvider: (() => void) | null = null;
    let providerEntered: (() => void) | null = null;
    const providerEnteredPromise = new Promise<void>((resolve) => { providerEntered = resolve; });
    const providerReleasePromise = new Promise<void>((resolve) => { releaseProvider = resolve; });
    const runningGeneration = generateAnswerlatticeProductStarterPack(
        scope,
        packJobId,
        'pack_concurrent_001',
        actor,
        {
            generateContent: async () => {
                providerEntered?.();
                await providerReleasePromise;
                return { text: JSON.stringify(buildPackCandidates(packSourceId, packEntityId)) };
            },
        },
    );
    await providerEnteredPromise;
    await assert.rejects(
        () => generateAnswerlatticeProductStarterPack(
            scope,
            packJobId,
            'pack_concurrent_002',
            actor,
            { generateContent: validProvider },
        ),
        /already running/,
    );
    releaseProvider?.();
    const concurrentPack = await runningGeneration;
    assert.equal(concurrentPack.reviewItems.length, 10);
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 2);

    const canonicalPackItem = concurrentPack.reviewItems[0];
    await updateKnowledgeIntakeReviewItem(scope, packJobId, canonicalPackItem.id, {
        status: 'accepted',
    }, actor);
    const canonicalPublishResult = await publishKnowledgeIntakeJob(scope, packJobId, [canonicalPackItem.id], actor);
    assert.equal(canonicalPublishResult.published.length, 1);
    assert.equal(canonicalPublishResult.published[0]?.target, 'canonical_proposal');
    const canonicalProposal = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .doc(canonicalPublishResult.published[0].id)
        .get();
    assert.deepEqual(
        canonicalProposal.data()?.suggestedChange?.proposedEvidence,
        { sourceIds: [packSourceId], citations: [] },
        'canonical intake proposals must preserve private source evidence for governance review',
    );

    const wrongProductJobId = 'ZYXWVUTSRQPONMLKJIHG';
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(wrongProductJobId).set({
        id: wrongProductJobId,
        pId: PRODUCT_IDS.MENULIST,
        ...scope,
        title: 'Wrong product',
        status: 'collecting',
        sourceCount: 0,
        reviewItemCount: 0,
        acceptedItemCount: 0,
        publishedItemCount: 0,
        createdOn,
        modifiedOn: createdOn,
    });
    await assert.rejects(
        () => getKnowledgeIntakeBundle(scope, wrongProductJobId),
        /Invalid literal value|Invalid input/,
        'wrong-product intake documents must fail closed',
    );

    process.stdout.write('Answerlattice Knowledge Intake emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});

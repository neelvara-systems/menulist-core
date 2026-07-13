import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    AnswerlatticeSupportSearchCapacityError,
    createAnswerlatticeSupportSearchAccounting,
} from '../../src/lib/answerlattice/supportSearchAccounting';
import { getBillingPeriodKey } from '../../src/lib/billing/billingPeriod';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import type { CoreSearchResult } from '../../src/lib/search/types';
import { Timestamp } from 'firebase-admin/firestore';

const scope = { tId: 91, sId: 901 };
const subscriptionId = 'al-subscription-901';

const result = (aiProviderUsed: boolean): CoreSearchResult => ({
    craftedAnswer: aiProviderUsed ? 'Provider-backed answer.' : 'Approved answer.',
    references: [],
    suggestedQuestions: [],
    canonical: !aiProviderUsed,
    answerSource: aiProviderUsed ? 'rag' : 'canonical',
    imageProcessed: false,
    aiProviderUsed,
    aiProviderOperations: aiProviderUsed ? ['embedding_generation', 'answer_generation'] : [],
    aiProviderTokenUsage: aiProviderUsed
        ? { promptTokenCount: 100, candidatesTokenCount: 40, totalTokenCount: 140, tokenCountSource: 'provider' }
        : { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0, tokenCountSource: 'none' },
});

async function seedSubscription(monthlyCredits: number, pId: string = PRODUCT_IDS.ANSWERLATTICE): Promise<void> {
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
                monthlyCredits,
                topUpCredits: 0,
            },
        }),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({
            id: subscriptionId,
            pId,
            productId: pId,
            ...scope,
            tenantId: scope.tId,
            storeId: scope.sId,
            status: 'active',
            cycleStartDate,
            cycleEndDate: Timestamp.fromMillis(Date.now() + 86_400_000),
            monthlyCreditsAllowance: monthlyCredits,
            monthlyCredits,
            topUpCredits: 0,
            creditsLastResetMonth: billingPeriod,
        }),
    ]);
}

const createAccounting = (requestId: string) => createAnswerlatticeSupportSearchAccounting({
    actor: { id: 'owner-91', email: 'owner@example.com' },
    mountContext: 'help_center',
    requestId,
    scope,
});

async function operationCount(): Promise<number> {
    return (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(scope.tId))
        .collection(String(scope.sId))
        .get()).size;
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db || typeof (db as any).collection !== 'function') throw new Error('Answerlattice emulator Firestore is not configured');

    await seedSubscription(2);
    const deterministic = createAccounting('deterministic_001');
    await deterministic.settle(result(false), 12);
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 2);
    assert.equal(await operationCount(), 0, 'provider-free answers must not create billable operation rows');

    const paid = createAccounting('provider_001');
    await paid.beforeAiProviderCall();
    await paid.settle(result(true), 120);
    await paid.settle(result(true), 120);
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 1);
    const paidStore = (await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId)).get()).data();
    assert.equal(paidStore?.answerlatticeSubscription?.monthlyCredits, 1);
    assert.equal(paidStore?.['answerlatticeSubscription.monthlyCredits'], undefined, 'summary updates must not create literal dotted fields');
    assert.equal(await operationCount(), 1, 'an idempotent retry must reuse the operation row');

    await seedSubscription(1);
    const first = createAccounting('concurrent_001');
    const second = createAccounting('concurrent_002');
    await Promise.all([first.beforeAiProviderCall(), second.beforeAiProviderCall()]);
    const settlements = await Promise.allSettled([
        first.settle(result(true), 120),
        second.settle(result(true), 120),
    ]);
    assert.equal(settlements.filter(entry => entry.status === 'fulfilled').length, 1);
    const rejected = settlements.find(entry => entry.status === 'rejected');
    assert.ok(rejected && rejected.status === 'rejected' && rejected.reason instanceof AnswerlatticeSupportSearchCapacityError);
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 0);
    assert.equal(await operationCount(), 2, 'only the settled concurrent request may create a new operation row');

    await seedSubscription(1, PRODUCT_IDS.MENULIST);
    const crossProduct = createAccounting('wrong_product_001');
    await assert.rejects(
        () => crossProduct.beforeAiProviderCall(),
        AnswerlatticeSupportSearchCapacityError,
        'a shared-project subscription from another product must fail before provider use',
    );

    await seedSubscription(1);
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({ status: 'pending' }, { merge: true });
    const pending = createAccounting('pending_state_001');
    await assert.rejects(
        () => pending.beforeAiProviderCall(),
        AnswerlatticeSupportSearchCapacityError,
        'a pending subscription must fail before provider use',
    );

    process.stdout.write('Answerlattice support-search accounting emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});

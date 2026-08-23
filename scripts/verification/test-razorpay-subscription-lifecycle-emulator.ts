#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES,
    type RazorpayProviderSubscriptionStatus,
    type RazorpaySubscriptionWebhookEvent,
} from '../../src/data/shared/razorpaySubscriptionLifecycle';
import {
    applyProductSubscriptionPayment,
    applyProductSubscriptionWebhookEvent,
} from '../../src/lib/billing/productBillingServer';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc, PaymentStatus } from '../../src/types/razorpay';
import { Timestamp } from 'firebase-admin/firestore';

const baseSubscription = (
    id: string,
    status: PaymentStatus,
    providerStatus: RazorpayProviderSubscriptionStatus,
): FirestoreSubscriptionDoc => ({
    amount: 59_900,
    billingHistory: [],
    currency: 'INR',
    cycleEndDate: null,
    cycleStartDate: null,
    email: 'billing-lifecycle@example.test',
    lastWebhook: null,
    monthlyCredits: 7,
    monthlyCreditsAllowance: 20,
    name: 'Lifecycle Test Store',
    pId: PRODUCT_IDS.MENULIST,
    pastDueSinceAt: null,
    paymentMethod: null,
    paymentProvider: 'razorpay',
    planId: 'menulist_official',
    planName: 'Official',
    planType: 'MONTH',
    productId: PRODUCT_IDS.MENULIST,
    providerPlanId: 'plan_Lifecycle123',
    providerStatus,
    providerSubscriptionId: id,
    quantity: 1,
    renewsOn: null,
    sId: 9202,
    status,
    statuses: [],
    storeId: 9202,
    subscriptionEndDate: null,
    subscriptionStartDate: null,
    tId: 9101,
    tenantId: 9101,
    topUpCredits: 3,
    totalPaymentsMadeCount: 0,
    totalPaymentsNeededCount: 12,
    shortUrl: '',
    userId: 'billing-lifecycle-user',
    userType: 'B2C',
});

const subscriptionRef = (id: string) => (
    firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(id)
);

const seedSubscription = async (
    id: string,
    status: PaymentStatus,
    providerStatus: RazorpayProviderSubscriptionStatus,
): Promise<void> => {
    await subscriptionRef(id).set(baseSubscription(id, status, providerStatus));
};

const readSubscription = async (id: string): Promise<FirestoreSubscriptionDoc> => {
    const snapshot = await subscriptionRef(id).get();
    assert.equal(snapshot.exists, true, `${id} must exist`);
    return { ...(snapshot.data() as FirestoreSubscriptionDoc), id: snapshot.id };
};

const applyLifecycleEvent = async (params: {
    event: Exclude<RazorpaySubscriptionWebhookEvent, 'subscription.charged'>;
    expectedStatuses?: PaymentStatus[];
    id: string;
    providerStatus: RazorpayProviderSubscriptionStatus;
    quantity?: number;
}) => {
    const policy = RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES[params.event];
    return applyProductSubscriptionWebhookEvent(PRODUCT_IDS.MENULIST, {
        eventKey: `evt_${params.event.replaceAll('.', '_')}_${params.id}`,
        expectedStatuses: params.expectedStatuses,
        nextStatus: policy.nextStatus || undefined,
        statusEntry: {
            amount: 0,
            currency: 'INR',
            remark: `Emulator ${params.event}`,
            status: params.event,
            timestamp: Timestamp.now() as never,
        },
        subscriptionId: params.id,
        update: {
            lastWebhook: {
                event: params.event,
                timestamp: Timestamp.now() as never,
            },
            providerStatus: params.providerStatus,
            ...(params.quantity ? { quantity: params.quantity } : {}),
        },
    });
};

const assertEventApplied = async (params: {
    event: Exclude<RazorpaySubscriptionWebhookEvent, 'subscription.charged'>;
    expectedLocalStatus: PaymentStatus;
    initialLocalStatus: PaymentStatus;
    initialProviderStatus: RazorpayProviderSubscriptionStatus;
    providerStatus: RazorpayProviderSubscriptionStatus;
    quantity?: number;
}): Promise<void> => {
    const id = `sub_${params.event.replaceAll('.', '_')}`;
    await seedSubscription(id, params.initialLocalStatus, params.initialProviderStatus);
    const result = await applyLifecycleEvent({
        event: params.event,
        id,
        providerStatus: params.providerStatus,
        quantity: params.quantity,
    });
    assert.equal(result?.applied, true, `${params.event} must apply`);
    const subscription = await readSubscription(id);
    assert.equal(subscription.status, params.expectedLocalStatus, `${params.event} local status`);
    assert.equal(subscription.providerStatus, params.providerStatus, `${params.event} provider status`);
    assert.equal(subscription.billingHistory.length, 0, `${params.event} must not settle money`);
    assert.equal(subscription.monthlyCredits, 7, `${params.event} must not reset credits`);
    if (params.quantity) assert.equal(subscription.quantity, params.quantity);
};

const run = async (): Promise<void> => {
    assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
    const existing = await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).get();
    await Promise.all(existing.docs.map((snapshot) => snapshot.ref.delete()));

    const authenticatedId = 'sub_subscription_authenticated';
    await seedSubscription(authenticatedId, 'pending', 'created');
    const authenticated = await applyLifecycleEvent({
        event: 'subscription.authenticated',
        expectedStatuses: ['pending'],
        id: authenticatedId,
        providerStatus: 'authenticated',
    });
    assert.equal(authenticated?.applied, true);
    const authenticatedSubscription = await readSubscription(authenticatedId);
    assert.equal(authenticatedSubscription.status, 'pending');
    assert.equal(authenticatedSubscription.providerStatus, 'authenticated');
    assert.equal(authenticatedSubscription.billingHistory.length, 0);
    assert.equal(authenticatedSubscription.monthlyCredits, 7);
    const authenticatedReplay = await applyLifecycleEvent({
        event: 'subscription.authenticated',
        expectedStatuses: ['pending'],
        id: authenticatedId,
        providerStatus: 'authenticated',
    });
    assert.equal(authenticatedReplay?.duplicate, true);

    const outOfOrderId = 'sub_subscription_authenticated_out_of_order';
    await seedSubscription(outOfOrderId, 'active', 'active');
    const outOfOrder = await applyLifecycleEvent({
        event: 'subscription.authenticated',
        expectedStatuses: ['pending'],
        id: outOfOrderId,
        providerStatus: 'authenticated',
    });
    assert.equal(outOfOrder?.applied, false);
    assert.equal((await readSubscription(outOfOrderId)).providerStatus, 'active');

    await assertEventApplied({
        event: 'subscription.activated',
        expectedLocalStatus: 'pending',
        initialLocalStatus: 'pending',
        initialProviderStatus: 'authenticated',
        providerStatus: 'active',
    });

    const chargedId = 'sub_subscription_charged';
    await seedSubscription(chargedId, 'active', 'active');
    const charged = await applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST, {
        billingPeriod: 202608,
        paymentHistoryId: 'pay_SubscriptionCharged01',
        statusEntry: {
            amount: 49_900,
            currency: 'INR',
            remark: 'Emulator subscription.charged',
            status: 'subscription.charged',
            timestamp: Timestamp.now() as never,
        },
        subscriptionId: chargedId,
        update: {
            providerStatus: 'active',
            totalPaymentsMadeCount: 1,
        },
    });
    assert.equal(charged?.applied, true);
    const chargedSubscription = await readSubscription(chargedId);
    assert.deepEqual(chargedSubscription.billingHistory, ['pay_SubscriptionCharged01']);
    assert.equal(chargedSubscription.monthlyCredits, 20);
    await subscriptionRef(chargedId).update({ monthlyCredits: 17 });
    const chargedReplay = await applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST, {
        billingPeriod: 202608,
        paymentHistoryId: 'pay_SubscriptionCharged01',
        statusEntry: {
            amount: 49_900,
            currency: 'INR',
            remark: 'Replay subscription.charged',
            status: 'subscription.charged',
            timestamp: Timestamp.now() as never,
        },
        subscriptionId: chargedId,
        update: { providerStatus: 'active' },
    });
    assert.equal(chargedReplay?.duplicate, true);
    assert.equal((await readSubscription(chargedId)).monthlyCredits, 17);

    for (const terminalStatus of ['cancelled', 'completed'] as const) {
        const terminalPaymentId = terminalStatus === 'cancelled'
            ? 'pay_LateCancelled01'
            : 'pay_LateCompleted01';
        const terminalId = `sub_subscription_charged_after_${terminalStatus}`;
        await seedSubscription(terminalId, terminalStatus, terminalStatus);
        const terminalRecovery = await applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST, {
            billingPeriod: 202608,
            paymentHistoryId: terminalPaymentId,
            statusEntry: {
                amount: 49_900,
                currency: 'INR',
                remark: `Late subscription.charged after ${terminalStatus}`,
                status: 'subscription.charged',
                timestamp: Timestamp.now() as never,
            },
            subscriptionId: terminalId,
            terminalSettlementPaymentId: terminalPaymentId,
            update: {
                cycleEndDate: Timestamp.fromMillis(1_800_000_000_000) as never,
                lastWebhook: {
                    event: 'subscription.charged',
                    timestamp: Timestamp.now() as never,
                },
                paymentMethod: { type: 'upi', upiId: 'owner@example' },
                providerStatus: 'active',
                totalPaymentsMadeCount: 12,
            },
        });
        assert.equal(terminalRecovery?.applied, true);
        const recovered = await readSubscription(terminalId);
        assert.equal(recovered.status, terminalStatus, `late charge must preserve ${terminalStatus}`);
        assert.equal(recovered.providerStatus, terminalStatus, 'late charge must preserve provider truth');
        assert.equal(recovered.monthlyCredits, 7, 'late terminal settlement must not reset credits');
        assert.deepEqual(recovered.billingHistory, [terminalPaymentId]);
        assert.equal(recovered.paymentMethod?.type, 'upi');
    }

    await assertEventApplied({
        event: 'subscription.completed',
        expectedLocalStatus: 'completed',
        initialLocalStatus: 'active',
        initialProviderStatus: 'active',
        providerStatus: 'completed',
    });
    await assertEventApplied({
        event: 'subscription.updated',
        expectedLocalStatus: 'active',
        initialLocalStatus: 'active',
        initialProviderStatus: 'active',
        providerStatus: 'active',
        quantity: 3,
    });
    const updatedWithoutQuantityId = 'sub_subscription_updated_without_quantity';
    await seedSubscription(updatedWithoutQuantityId, 'active', 'active');
    const updatedWithoutQuantity = await applyLifecycleEvent({
        event: 'subscription.updated',
        id: updatedWithoutQuantityId,
        providerStatus: 'active',
    });
    assert.equal(updatedWithoutQuantity?.applied, true);
    const updatedWithoutQuantitySubscription = await readSubscription(updatedWithoutQuantityId);
    assert.equal(updatedWithoutQuantitySubscription.status, 'active');
    assert.equal(updatedWithoutQuantitySubscription.providerStatus, 'active');
    assert.equal(updatedWithoutQuantitySubscription.quantity, 1);
    assert.equal(updatedWithoutQuantitySubscription.billingHistory.length, 0);
    assert.equal(updatedWithoutQuantitySubscription.monthlyCredits, 7);
    await assertEventApplied({
        event: 'subscription.pending',
        expectedLocalStatus: 'past_due',
        initialLocalStatus: 'active',
        initialProviderStatus: 'active',
        providerStatus: 'pending',
    });
    await assertEventApplied({
        event: 'subscription.halted',
        expectedLocalStatus: 'past_due',
        initialLocalStatus: 'active',
        initialProviderStatus: 'active',
        providerStatus: 'halted',
    });
    await assertEventApplied({
        event: 'subscription.cancelled',
        expectedLocalStatus: 'cancelled',
        initialLocalStatus: 'active',
        initialProviderStatus: 'active',
        providerStatus: 'cancelled',
    });
    await assertEventApplied({
        event: 'subscription.paused',
        expectedLocalStatus: 'paused',
        initialLocalStatus: 'active',
        initialProviderStatus: 'active',
        providerStatus: 'paused',
    });
    await assertEventApplied({
        event: 'subscription.resumed',
        expectedLocalStatus: 'active',
        initialLocalStatus: 'paused',
        initialProviderStatus: 'paused',
        providerStatus: 'active',
    });

    console.log('Razorpay subscription lifecycle emulator tests passed (10/10 events + updated without quantity).');
};

void run();

#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { ANSWERLATTICE_ONBOARDING_STATUS } from '@lib/answerlattice/onboardingProvisioning';
import {
    answerlatticeProvisioningOwnershipMatches,
    compensateAnswerlatticeOnboardingProvisioning,
    markAnswerlatticeOnboardingProviderRecoveryPending,
    persistAnswerlatticePendingSubscription,
    type AnswerlatticeProvisioningScope,
} from '@lib/answerlattice/onboardingProvisioningServer';
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required.');
}

const scope: AnswerlatticeProvisioningScope = {
    attemptId: 'alo_contract_attempt',
    requestFingerprint: 'a'.repeat(64),
    storeId: 2801,
    tenantId: 28,
    userId: 'answerlattice-onboarding-owner',
};

const scopedDocument = {
    active: true,
    onboardingAttemptId: scope.attemptId,
    onboardingRequestFingerprint: scope.requestFingerprint,
    onboardingStartedAt: Timestamp.fromMillis(1_700_000_000_000),
    onboardingStatus: ANSWERLATTICE_ONBOARDING_STATUS.PROVISIONING,
    pId: PRODUCT_IDS.ANSWERLATTICE,
    productId: PRODUCT_IDS.ANSWERLATTICE,
    sId: scope.storeId,
    storeId: scope.storeId,
    tId: scope.tenantId,
    tenantId: scope.tenantId,
};

async function seedProvisioningScope(): Promise<void> {
    const db = answerlatticeFirestoreAdmin;
    await Promise.all([
        db.collection(DB_COLLECTIONS.TENANTS).doc(String(scope.tenantId)).set(scopedDocument),
        db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).set({
            ...scopedDocument,
            name: 'Contract product',
        }),
        db.collection(DB_COLLECTIONS.USERS).doc(scope.userId).set({
            ...scopedDocument,
            id: scope.userId,
            storeIds: [scope.storeId],
            stores: [{ name: 'Contract product', role: 'owner', storeId: scope.storeId }],
        }),
    ]);
}

async function run(): Promise<void> {
    const db = answerlatticeFirestoreAdmin;
    if (!db || typeof (db as any).collection !== 'function') {
        throw new Error('Answerlattice emulator Firestore is not configured.');
    }

    await seedProvisioningScope();
    assert.equal(
        answerlatticeProvisioningOwnershipMatches({ ...scopedDocument, productId: PRODUCT_IDS.MENULIST }, scope),
        false,
        'conflicting product aliases must not own an Answerlattice provisioning scope',
    );
    const missingProductAlias = { ...scopedDocument } as Record<string, unknown>;
    delete missingProductAlias.productId;
    assert.equal(
        answerlatticeProvisioningOwnershipMatches(missingProductAlias, scope),
        false,
        'incomplete product identity must not own an Answerlattice provisioning scope',
    );
    assert.equal(
        answerlatticeProvisioningOwnershipMatches({ ...scopedDocument, tenantId: scope.tenantId + 1 }, scope),
        false,
        'conflicting tenant aliases must not own an Answerlattice provisioning scope',
    );
    assert.equal(
        answerlatticeProvisioningOwnershipMatches({ ...scopedDocument, storeId: scope.storeId + 1 }, scope),
        false,
        'conflicting store aliases must not own an Answerlattice provisioning scope',
    );
    const missingScopeAlias = { ...scopedDocument } as Record<string, unknown>;
    delete missingScopeAlias.tenantId;
    assert.equal(
        answerlatticeProvisioningOwnershipMatches(missingScopeAlias, scope),
        false,
        'incomplete tenant identity must not own an Answerlattice provisioning scope',
    );
    const recoveryAvailableAtMillis = 1_700_000_900_000;
    await markAnswerlatticeOnboardingProviderRecoveryPending({
        db,
        providerSubscriptionId: null,
        reason: 'provider_result_unconfirmed',
        recoveryAvailableAtMillis,
        scope,
    });

    const [tenantRecovery, storeRecovery, userRecovery] = await Promise.all([
        db.collection(DB_COLLECTIONS.TENANTS).doc(String(scope.tenantId)).get(),
        db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get(),
        db.collection(DB_COLLECTIONS.USERS).doc(scope.userId).get(),
    ]);
    for (const snapshot of [tenantRecovery, storeRecovery, userRecovery]) {
        const data = snapshot.data() || {};
        assert.equal(data.active, true, 'provider recovery must preserve the provisional scope');
        assert.equal(data.onboardingStatus, ANSWERLATTICE_ONBOARDING_STATUS.PROVIDER_RECOVERY_PENDING);
        assert.equal(data.onboardingProviderSubscriptionId, null);
        assert.equal(data.onboardingProviderRecoveryAvailableAt.toMillis(), recoveryAvailableAtMillis);
        assert.equal(answerlatticeProvisioningOwnershipMatches(data, scope), true);
    }

    await assert.rejects(
        markAnswerlatticeOnboardingProviderRecoveryPending({
            db,
            providerSubscriptionId: 'sub_contract',
            reason: 'wrong_attempt',
            recoveryAvailableAtMillis,
            scope: { ...scope, requestFingerprint: 'b'.repeat(64) },
        }),
        /ownership_mismatch/,
        'a different request fingerprint must not claim the provisional scope',
    );

    const subscriptionId = 'sub_contract';
    await markAnswerlatticeOnboardingProviderRecoveryPending({
        db,
        providerSubscriptionId: subscriptionId,
        reason: 'provider_id_known',
        recoveryAvailableAtMillis,
        scope,
    });
    await persistAnswerlatticePendingSubscription({
        db,
        scope,
        storeSubscriptionSummary: {
            amount: 99900,
            currency: 'INR',
            id: subscriptionId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            planId: 'answerlattice_starter',
            planName: 'Starter',
            providerSubscriptionId: subscriptionId,
            sId: scope.storeId,
            shortUrl: 'https://rzp.io/rzp/contract',
            status: 'pending',
            tId: scope.tenantId,
        },
        subscriptionId,
        subscriptionPayload: {
            amount: 99900,
            currency: 'INR',
            email: 'owner@example.test',
            name: 'Contract Owner',
            paymentProvider: 'razorpay',
            planId: 'answerlattice_starter',
            planName: 'Starter',
            planType: 'MONTH',
            providerPlanId: 'plan_contract',
            providerSubscriptionId: subscriptionId,
            sId: scope.storeId,
            status: 'pending',
            storeId: scope.storeId,
            tId: scope.tenantId,
            tenantId: scope.tenantId,
            userId: scope.userId,
            userType: 'B2B',
        } as any,
        widgetApiState: { keyHashes: ['hash_contract'], keysByHash: {} },
    });

    const [tenantFinal, storeFinal, userFinal, subscriptionFinal] = await Promise.all([
        db.collection(DB_COLLECTIONS.TENANTS).doc(String(scope.tenantId)).get(),
        db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get(),
        db.collection(DB_COLLECTIONS.USERS).doc(scope.userId).get(),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get(),
    ]);
    for (const snapshot of [tenantFinal, storeFinal, userFinal]) {
        const data = snapshot.data() || {};
        assert.equal(data.active, true);
        assert.equal(data.onboardingStatus, ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PENDING);
        assert.equal(data.onboardingProviderRecoveryAvailableAt, null);
        assert.equal(data.onboardingProviderSubscriptionId, subscriptionId);
    }
    assert.equal(subscriptionFinal.data()?.pId, PRODUCT_IDS.ANSWERLATTICE);
    assert.equal(subscriptionFinal.data()?.tId, scope.tenantId);
    assert.equal(subscriptionFinal.data()?.sId, scope.storeId);
    assert.equal(storeFinal.data()?.answerlatticeSubscription?.id, subscriptionId);
    assert.deepEqual(storeFinal.data()?.answerlatticeWidgetApi?.keyHashes, ['hash_contract']);

    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({
        productId: PRODUCT_IDS.MENULIST,
    }, { merge: true });
    await assert.rejects(
        persistAnswerlatticePendingSubscription({
            db,
            scope,
            storeSubscriptionSummary: storeFinal.data()?.answerlatticeSubscription || {},
            subscriptionId,
            subscriptionPayload: subscriptionFinal.data() as any,
            widgetApiState: storeFinal.data()?.answerlatticeWidgetApi || {},
        }),
        /subscription_scope_conflict/,
        'a conflicting existing subscription must not be reclaimed by Answerlattice onboarding',
    );
    const conflictingSubscription = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();
    assert.equal(conflictingSubscription.data()?.pId, PRODUCT_IDS.ANSWERLATTICE);
    assert.equal(conflictingSubscription.data()?.productId, PRODUCT_IDS.MENULIST);
    assert.equal(conflictingSubscription.data()?.status, 'pending');

    await compensateAnswerlatticeOnboardingProvisioning({
        cancellationPending: false,
        db,
        providerSubscriptionId: subscriptionId,
        reason: 'conflicting_subscription_must_not_be_cancelled',
        scope,
    });
    const conflictingAfterCompensation = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();
    assert.equal(
        conflictingAfterCompensation.data()?.status,
        'pending',
        'compensation must not mutate a conflicting product subscription',
    );

    const failedScope: AnswerlatticeProvisioningScope = {
        attemptId: 'alo_before_provider',
        requestFingerprint: 'c'.repeat(64),
        storeId: 2802,
        tenantId: 29,
        userId: 'answerlattice-onboarding-before-provider',
    };
    const failedDocument = {
        ...scopedDocument,
        onboardingAttemptId: failedScope.attemptId,
        onboardingRequestFingerprint: failedScope.requestFingerprint,
        sId: failedScope.storeId,
        storeId: failedScope.storeId,
        tId: failedScope.tenantId,
        tenantId: failedScope.tenantId,
    };
    await Promise.all([
        db.collection(DB_COLLECTIONS.TENANTS).doc(String(failedScope.tenantId)).set(failedDocument),
        db.collection(DB_COLLECTIONS.STORES).doc(String(failedScope.storeId)).set(failedDocument),
        db.collection(DB_COLLECTIONS.USERS).doc(failedScope.userId).set({
            ...failedDocument,
            id: failedScope.userId,
            storeIds: [failedScope.storeId],
            stores: [{ name: 'Failed product', role: 'owner', storeId: failedScope.storeId }],
        }),
    ]);
    await compensateAnswerlatticeOnboardingProvisioning({
        cancellationPending: false,
        db,
        providerSubscriptionId: null,
        reason: 'failed_before_provider',
        scope: failedScope,
    });
    const [failedStore, failedUser] = await Promise.all([
        db.collection(DB_COLLECTIONS.STORES).doc(String(failedScope.storeId)).get(),
        db.collection(DB_COLLECTIONS.USERS).doc(failedScope.userId).get(),
    ]);
    assert.equal(failedStore.data()?.active, false);
    assert.equal(failedStore.data()?.onboardingStatus, ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PROVIDER_FAILED);
    assert.equal(failedUser.data()?.tenantId, null);
    assert.equal(failedUser.data()?.storeId, null);

    process.stdout.write('Answerlattice onboarding provisioning emulator tests passed.\n');
}

void run()
    .then(async () => {
        if (answerlatticeAdminApp) await answerlatticeAdminApp.delete();
    })
    .catch(async (error) => {
        console.error(error);
        if (answerlatticeAdminApp) await answerlatticeAdminApp.delete().catch(() => undefined);
        process.exit(1);
    });

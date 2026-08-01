#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    claimRazorpayWebhookEvent,
    completeRazorpayWebhookEvent,
    type RazorpayWebhookClaim,
} from '../../src/lib/billing/razorpayWebhookLease';

import { writeProductPaymentTransactionAudit } from '../../src/lib/billing/productBillingServer';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const processingClaimContract = {
    eventKey: 'compile-time-processing-claim',
    outcome: 'processing',
} satisfies Extract<RazorpayWebhookClaim, { outcome: 'processing' }>;
assert.equal(
    processingClaimContract.outcome,
    'processing',
    'processing webhook claims must remain a separately discriminated contract variant',
);

async function clearWebhookEvents(): Promise<void> {
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    await clearWebhookEvents();

    const concurrentEventKey = 'evt_webhook_concurrency_001';
    const claims = await Promise.all(Array.from({ length: 8 }, () => claimRazorpayWebhookEvent({
        eventId: concurrentEventKey,
        eventKey: concurrentEventKey,
        eventType: 'subscription.charged',
    })));
    const acquiredClaims = claims.filter((claim) => claim.outcome === 'acquired');
    assert.equal(acquiredClaims.length, 1, 'one webhook attempt must own concurrent processing');
    assert.equal(claims.filter((claim) => claim.outcome === 'processing').length, 7);
    const winningClaim = acquiredClaims[0];
    assert.equal(winningClaim.outcome, 'acquired');
    if (winningClaim.outcome !== 'acquired') throw new Error('webhook claim was not acquired');

    assert.equal(await completeRazorpayWebhookEvent({
        attemptId: winningClaim.attemptId,
        data: { productId: 'ML', transactionType: 'subscription' },
        eventKey: concurrentEventKey,
        status: 'processed',
    }), 'updated');
    assert.equal((await claimRazorpayWebhookEvent({
        eventId: concurrentEventKey,
        eventKey: concurrentEventKey,
        eventType: 'subscription.charged',
    })).outcome, 'processed');
    assert.equal(await completeRazorpayWebhookEvent({
        attemptId: 'stale-attempt',
        data: { failureCode: 'must_not_replace_success' },
        eventKey: concurrentEventKey,
        status: 'failed',
    }), 'already_processed');
    assert.equal(
        (await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(concurrentEventKey).get()).data()?.status,
        'processed',
    );

    const retryEventKey = 'evt_webhook_retry_002';
    const firstRetryClaim = await claimRazorpayWebhookEvent({
        eventId: retryEventKey,
        eventKey: retryEventKey,
        eventType: 'order.paid',
    });
    assert.equal(firstRetryClaim.outcome, 'acquired');
    if (firstRetryClaim.outcome !== 'acquired') throw new Error('first retry claim was not acquired');
    assert.equal(await completeRazorpayWebhookEvent({
        attemptId: firstRetryClaim.attemptId,
        data: { failureCode: 'retryable_failure', stalePrivateField: true },
        eventKey: retryEventKey,
        status: 'failed',
    }), 'updated');
    const secondRetryClaim = await claimRazorpayWebhookEvent({
        eventId: retryEventKey,
        eventKey: retryEventKey,
        eventType: 'order.paid',
    });
    assert.equal(secondRetryClaim.outcome, 'acquired');
    if (secondRetryClaim.outcome !== 'acquired') throw new Error('second retry claim was not acquired');
    assert.equal(await completeRazorpayWebhookEvent({
        attemptId: firstRetryClaim.attemptId,
        eventKey: retryEventKey,
        status: 'processed',
    }), 'ownership_lost', 'an older failed attempt cannot finish a newer retry');
    assert.equal(await completeRazorpayWebhookEvent({
        attemptId: secondRetryClaim.attemptId,
        data: { productId: 'ML', transactionType: 'topup' },
        eventKey: retryEventKey,
        status: 'processed',
    }), 'updated');
    const retryDocument = (
        await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(retryEventKey).get()
    ).data() || {};
    assert.equal(retryDocument.status, 'processed');
    assert.equal(retryDocument.retryCount, 1);
    assert.equal('failureCode' in retryDocument, false, 'successful retry must prune stale failure fields');
    assert.equal('stalePrivateField' in retryDocument, false, 'terminal replacement must be exact');
    assert.equal('processingExpiresAt' in retryDocument, false, 'terminal state must not retain a lease');

    const expiredEventKey = 'evt_webhook_expired_003';
    const expiredFirstClaim = await claimRazorpayWebhookEvent({
        eventKey: expiredEventKey,
        eventType: 'subscription.updated',
    });
    assert.equal(expiredFirstClaim.outcome, 'acquired');
    if (expiredFirstClaim.outcome !== 'acquired') throw new Error('expired first claim was not acquired');
    await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(expiredEventKey).set({
        processingExpiresAt: Timestamp.fromMillis(1),
    }, { merge: true });
    const expiredReplacementClaim = await claimRazorpayWebhookEvent({
        eventKey: expiredEventKey,
        eventType: 'subscription.updated',
    });
    assert.equal(expiredReplacementClaim.outcome, 'acquired');
    if (expiredReplacementClaim.outcome !== 'acquired') throw new Error('expired replacement was not acquired');
    assert.notEqual(expiredReplacementClaim.attemptId, expiredFirstClaim.attemptId);
    assert.equal(await completeRazorpayWebhookEvent({
        attemptId: expiredFirstClaim.attemptId,
        eventKey: expiredEventKey,
        status: 'failed',
    }), 'ownership_lost', 'expired owner cannot downgrade replacement work');

    const malformedEventKey = 'evt_webhook_malformed_004';
    await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(malformedEventKey).set({
        status: 'unexpected',
    });
    await assert.rejects(() => claimRazorpayWebhookEvent({
        eventKey: malformedEventKey,
        eventType: 'subscription.charged',
    }), /ledger state is invalid/);

    const malformedProcessedEventKey = 'evt_webhook_malformed_processed_005';
    await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(malformedProcessedEventKey).set({
        status: 'processed',
    });
    await assert.rejects(() => claimRazorpayWebhookEvent({
        eventKey: malformedProcessedEventKey,
        eventType: 'subscription.charged',
    }), /ledger state is invalid/, 'a status-only row must not suppress a signed payment event');

    const conflictingIdentityEventKey = 'evt_webhook_conflicting_identity_006';
    const conflictingIdentityClaim = await claimRazorpayWebhookEvent({
        eventKey: conflictingIdentityEventKey,
        eventType: 'subscription.charged',
    });
    assert.equal(conflictingIdentityClaim.outcome, 'acquired');
    await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(conflictingIdentityEventKey).set({
        eventKey: 'evt_webhook_other_identity',
    }, { merge: true });
    await assert.rejects(() => claimRazorpayWebhookEvent({
        eventKey: conflictingIdentityEventKey,
        eventType: 'subscription.charged',
    }), /ledger state is invalid/, 'embedded event identity must match the deterministic document key');

    const malformedRetryEventKey = 'evt_webhook_malformed_retry_007';
    const malformedRetryClaim = await claimRazorpayWebhookEvent({
        eventKey: malformedRetryEventKey,
        eventType: 'order.paid',
    });
    assert.equal(malformedRetryClaim.outcome, 'acquired');
    if (malformedRetryClaim.outcome !== 'acquired') throw new Error('malformed retry claim was not acquired');
    await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(malformedRetryEventKey).set({
        retryCount: -1,
    }, { merge: true });
    await assert.rejects(() => completeRazorpayWebhookEvent({
        attemptId: malformedRetryClaim.attemptId,
        eventKey: malformedRetryEventKey,
        status: 'processed',
    }), /ledger state is invalid/, 'malformed retry state must not become terminal payment truth');

    const auditEventKey = 'evt_webhook_audit_005';
    const auditRef = firestoreAdmin.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc(auditEventKey);
    await auditRef.delete();
    await writeProductPaymentTransactionAudit(PRODUCT_IDS.MENULIST, {
        event: 'order.paid',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        sId: 22,
        storeId: 22,
        tId: 11,
        tenantId: 11,
        transactionType: 'topup',
    }, auditEventKey);
    const firstAudit = (await auditRef.get()).data() || {};
    const firstCreatedOn = firstAudit.createdOn?.toMillis?.();
    assert.equal(typeof firstCreatedOn, 'number');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await writeProductPaymentTransactionAudit(PRODUCT_IDS.MENULIST, {
        event: 'order.paid',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        sId: 22,
        storeId: 22,
        tId: 11,
        tenantId: 11,
        transactionType: 'topup',
    }, auditEventKey);
    const replayedAudit = (await auditRef.get()).data() || {};
    assert.equal(replayedAudit.createdOn?.toMillis?.(), firstCreatedOn, 'webhook audit replay must preserve createdOn');
    assert.ok(replayedAudit.modifiedOn?.toMillis?.() >= firstCreatedOn);
    await assert.rejects(() => writeProductPaymentTransactionAudit(PRODUCT_IDS.MENULIST, {
        event: 'subscription.charged',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        sId: 22,
        storeId: 22,
        tId: 11,
        tenantId: 11,
        transactionType: 'subscription',
    }, auditEventKey), /audit document identity conflict/);
    assert.equal((await auditRef.get()).data()?.event, 'order.paid', 'event-key collision must not replace audit identity');
    await assert.rejects(() => writeProductPaymentTransactionAudit(PRODUCT_IDS.MENULIST, {
        event: 'order.paid',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        sId: 23,
        storeId: 23,
        tId: 11,
        tenantId: 11,
        transactionType: 'topup',
    }, auditEventKey), /audit document identity conflict/);
    assert.equal((await auditRef.get()).data()?.storeId, 22, 'webhook audit replay must not replace immutable workspace scope');
    await assert.rejects(() => writeProductPaymentTransactionAudit(PRODUCT_IDS.MENULIST, {
        event: 'order.paid',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        sId: '22',
        storeId: '22',
        tId: '11',
        tenantId: '11',
        transactionType: 'topup',
    }, 'evt_webhook_audit_malformed_scope_006'), /scope identity is invalid/);
    await auditRef.delete();

    await clearWebhookEvents();
    process.stdout.write('Razorpay webhook lease emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

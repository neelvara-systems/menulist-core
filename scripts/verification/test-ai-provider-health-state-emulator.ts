#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { admin, firestoreAdmin } from '../../functions/src/firebaseAdmin';
import { replaceAiProviderHealthState, type AiProviderHealthState } from '../../functions/src/schedulers/aiProviderHealth';

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const healthRef = firestoreAdmin.collection('_health').doc('aiProvider_gemini');
    await healthRef.set({
        failureCode: 'STALE_FAILURE',
        privateDiagnostic: 'must-be-pruned',
        sourceErrorCode: 'STALE_CODE',
        sourceErrorName: 'StaleError',
        sourceErrorStatus: 503,
        status: 'failed',
    });

    const checkedAt = admin.firestore.Timestamp.fromMillis(1_750_000_000_000);
    const recoveredState: AiProviderHealthState = {
        checkedAt,
        error: null,
        keyStats: {
            activeKeys: 1,
            coolingDownKeys: 0,
            currentKeyIndex: 0,
            keys: [{
                active: true,
                cooldownRemaining: 0,
                index: 0,
                totalRateLimits: 0,
                totalRequests: 1,
            }],
            totalKeys: 1,
        },
        latencyMs: 25,
        model: 'test-model',
        productId: 'ML',
        provider: 'gemini',
        sdkSurface: 'firebase-functions',
        source: 'menulistMaintenanceScheduler',
        status: 'ok',
        success: true,
        updatedAt: checkedAt,
    };

    await replaceAiProviderHealthState(recoveredState);

    const persisted = (await healthRef.get()).data();
    assert.deepEqual(Object.keys(persisted || {}).sort(), Object.keys(recoveredState).sort());
    assert.equal(persisted?.status, 'ok');
    assert.equal(persisted?.failureCode, undefined);
    assert.equal(persisted?.privateDiagnostic, undefined);
    assert.equal(persisted?.sourceErrorCode, undefined);
    assert.equal(persisted?.sourceErrorName, undefined);
    assert.equal(persisted?.sourceErrorStatus, undefined);

    process.stdout.write('AI provider health exact-state emulator passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});

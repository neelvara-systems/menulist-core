#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, runTransaction, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { buildDailySessionId } from '../../src/lib/ai-menu-manager/idempotency';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-ai-menu-manager-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const tId = '821';
const sId = '822';
const projectId = 'amm-rules-project';
const sessionDate = '2026-07-13';
const sessionId = buildDailySessionId({ tId, sId, projectId, sessionDate });

assert.throws(
    () => buildDailySessionId({ tId, sId, projectId, sessionDate: '2026-02-30' }),
    /Invalid session scope/,
);
assert.throws(
    () => buildDailySessionId({ tId: '0821', sId, projectId, sessionDate }),
    /Invalid session scope/,
);

function compactSession(id = sessionId) {
    return {
        sessionId: id,
        tId,
        sId,
        projectId,
        sessionDate,
        storageMode: 'daily_compact',
        status: 'active',
        compactMessages: [],
        pendingCardSummaries: [],
        pendingOperations: [],
        hasPendingOperations: false,
        pendingCount: 0,
        recentReceiptSummaries: [],
        counters: { commands: 0, proposalsCreated: 0, approvals: 0, executions: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    };
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-user', {
            role: 'owner',
            storeIds: [sId],
            tenantId: Number(tId),
        }).firestore();
        const foreignDb = testEnv.authenticatedContext('foreign-owner', {
            role: 'owner',
            storeIds: ['999'],
            tenantId: 998,
        }).firestore();

        assert.ok(sessionId.startsWith(`amm2_${tId}_${sId}_${sessionDate}_`));
        await assertSucceeds(setDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), compactSession()));
        await assertSucceeds(getDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId)));
        await assertSucceeds(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            hasPendingOperations: false,
            pendingCount: 1,
            updatedAt: Timestamp.now(),
        }));
        await assertSucceeds(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            pendingOperations: [{ operationId: 'metadata-operation' }],
            hasPendingOperations: true,
            pendingCount: 1,
            updatedAt: Timestamp.now(),
        }));
        await assertSucceeds(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            pendingOperations: [],
            hasPendingOperations: false,
            pendingCount: 0,
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            sessionDate: '2026-07-14',
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            projectId: 'other-project',
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            counters: { commands: '1' },
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            counters: { commands: -1 },
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            counters: { commands: 1, unknownCounter: 1 },
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            counters: { commands: 1_000_000_001 },
            updatedAt: Timestamp.now(),
        }));
        await assertSucceeds(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', sessionId), {
            counters: {
                commands: 1,
                proposalsCreated: 1,
                approvals: 0,
                executions: 0,
                compoundCommands: 1,
                deterministicRoutes: 1,
                plannerAttempts: 1,
                plannerAccepted: 0,
                plannerFallbacks: 1,
                clarifications: 0,
            },
            updatedAt: Timestamp.now(),
        }));

        const sessionRef = doc(ownerDb, 'aiMenuManagerSessions', sessionId);
        await Promise.all(['operation-a', 'operation-b'].map((operationId) => (
            runTransaction(ownerDb, async (transaction) => {
                const snapshot = await transaction.get(sessionRef);
                if (!snapshot.exists()) {
                    throw new Error('AI Menu Manager session must exist before the concurrency fixture runs');
                }
                const current = snapshot.data();
                const pendingOperations = [
                    { operationId },
                    ...(current.pendingOperations || []),
                ];
                transaction.update(sessionRef, {
                    pendingOperations,
                    hasPendingOperations: true,
                    pendingCount: pendingOperations.length,
                    counters: {
                        ...current.counters,
                        commands: (current.counters?.commands || 0) + 1,
                    },
                    updatedAt: Timestamp.now(),
                });
            })
        )));
        const concurrentSession = (await getDoc(sessionRef)).data();
        assert.deepEqual(
            new Set((concurrentSession?.pendingOperations || []).map((entry: { operationId: string }) => entry.operationId)),
            new Set(['operation-a', 'operation-b']),
            'transaction retries must preserve both concurrently prepared operations',
        );
        assert.equal(concurrentSession?.counters?.commands, 3);
        const arbitraryLegacyId = 'amm_aaaaaaaaaaaaaaaaaaaaaaaa';
        await assertFails(setDoc(
            doc(ownerDb, 'aiMenuManagerSessions', arbitraryLegacyId),
            compactSession(arbitraryLegacyId),
        ));

        const mismatchedV2Id = `amm2_${tId}_${sId}_${sessionDate}_other-project`;
        await assertFails(setDoc(
            doc(ownerDb, 'aiMenuManagerSessions', mismatchedV2Id),
            compactSession(mismatchedV2Id),
        ));
        await assertFails(setDoc(doc(foreignDb, 'aiMenuManagerSessions', sessionId), compactSession()));
        await assertFails(setDoc(doc(ownerDb, 'aiMenuManagerProposals', 'amm_prop_aaaaaaaaaaaaaaaaaaaaaaaaaaaa'), {
            proposalId: 'amm_prop_aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        }));
        await assertFails(setDoc(doc(ownerDb, 'aiMenuManagerRules', 'owner-rule'), {
            ruleId: 'owner-rule',
            tId,
            sId,
        }));
        await assertFails(getDoc(doc(ownerDb, 'aiMenuManagerRules', 'owner-rule')));

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(
                doc(context.firestore(), 'aiMenuManagerSessions', arbitraryLegacyId),
                compactSession(arbitraryLegacyId),
            );
        });
        await assertSucceeds(updateDoc(doc(ownerDb, 'aiMenuManagerSessions', arbitraryLegacyId), {
            updatedAt: Timestamp.now(),
        }));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('AI Menu Manager Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});

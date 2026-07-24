#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    deleteDoc,
    doc,
    setDoc,
    Timestamp,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-predictive-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const trigger = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: 1,
    sId: 101,
    name: 'Billing recovery help',
    description: 'Show approved recovery guidance on the billing page.',
    kind: 'predictive_help',
    conditions: { page: 'billing_settings' },
    action: {
        type: 'help_card',
        customTitle: 'Recover the failed payment',
        customSummary: 'Retry the payment with an active payment method.',
    },
    priority: 80,
    cooldownHours: 24,
    status: 'active',
    source: 'manual',
    createdOn: NOW,
    modifiedOn: NOW,
    createdBy: 'Owner',
    modifiedBy: 'Owner',
    role: 'OWNER',
    uId: 'owner-1',
    traceId: 'trace_predictive_1',
    requestId: 'trace_predictive_1',
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'owner-1',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2',
        }).firestore();

        await assertSucceeds(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_active'),
            trigger(),
        ));
        const triggerAuditBatch = writeBatch(ownerDb);
        triggerAuditBatch.set(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_batched_with_audit'),
            trigger({ name: 'Atomic trigger and audit' }),
        );
        triggerAuditBatch.set(
            doc(ownerDb, 'answerlattice_auditLogs', 'predictive_trigger_atomic_audit'),
            {
                pId: 'AL',
                tId: 1,
                sId: 101,
                action: 'predictive_trigger_created',
                entityType: 'predictiveTrigger',
                entityId: 'valid_batched_with_audit',
                newState: { source: 'manual' },
                performedBy: 'admin',
                timestamp: NOW,
                createdOn: NOW,
                modifiedOn: NOW,
                createdBy: 'Owner',
                modifiedBy: 'Owner',
                role: 'OWNER',
                uId: 'owner-1',
                traceId: 'trace_predictive_audit',
                requestId: 'trace_predictive_audit',
            },
        );
        await assertSucceeds(triggerAuditBatch.commit());
        await assertSucceeds(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_disabled'),
            trigger({ status: 'disabled', conditions: {} }),
        ));
        await assertSucceeds(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_issue'),
            trigger({
                kind: 'known_issue',
                action: { type: 'known_issue', customTitle: 'Payment retries are delayed' },
                knownIssue: {
                    severity: 'degraded',
                    startsAt: NOW,
                    endsAt: null,
                    statusPageUrl: 'https://status.example.com/incidents/payment-retries',
                },
            }),
        ));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            const { kind: _kind, ...legacyTrigger } = trigger({ status: 'disabled', conditions: {} });
            await setDoc(
                doc(adminDb, 'answerlattice_predictiveTriggers', 'legacy_without_kind'),
                legacyTrigger,
            );
        });

        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'active_without_page'),
            trigger({ conditions: {} }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'forged_source'),
            trigger({ source: 'friction_auto', status: 'suggested', conditions: {} }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'forged_projection'),
            trigger({ resolvedSuggestion: { title: 'Forged', summary: 'Unapproved output' } }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'forged_effectiveness'),
            trigger({ effectiveness: { impressions: 100, clicks: 100, dismissals: 0, score: 1 } }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'invalid_issue_pair'),
            trigger({ kind: 'known_issue', action: { type: 'help_card' }, knownIssue: { severity: 'outage' } }),
        ));
        await assertFails(setDoc(
            doc(otherDb, 'answerlattice_predictiveTriggers', 'cross_workspace'),
            trigger(),
        ));

        await assertSucceeds(updateDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_disabled'),
            { conditions: { page: 'billing_settings' }, status: 'active', modifiedOn: NOW },
        ));
        await assertSucceeds(updateDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'legacy_without_kind'),
            { kind: 'predictive_help', conditions: { page: 'billing_settings' }, status: 'active', modifiedOn: NOW },
        ));
        await assertFails(updateDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_active'),
            { source: 'system', modifiedOn: NOW },
        ));
        await assertFails(updateDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_active'),
            { kind: 'known_issue', modifiedOn: NOW },
        ));
        await assertFails(updateDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_active'),
            { effectiveness: { impressions: 1, clicks: 1, dismissals: 0, score: 1 }, modifiedOn: NOW },
        ));
        await assertSucceeds(deleteDoc(
            doc(ownerDb, 'answerlattice_predictiveTriggers', 'valid_issue'),
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write(`Answerlattice predictive Firestore rules passed (${RULES_FILE}).\n`);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});

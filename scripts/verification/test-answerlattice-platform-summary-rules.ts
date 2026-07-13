#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-platform-summary-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);
const scoped = (extra: Record<string, unknown>) => ({ pId: 'AL', tId: 1, sId: 101, ...extra });

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', storeId: '101', tenantId: '1', uId: 'owner-1',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', storeId: '202', tenantId: '2', uId: 'owner-2',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM', uId: 'platform-1',
        }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await setDoc(doc(adminDb, 'platformSummary', 'coverage_1_101'), scoped({
                coverage: { date: '2026-07-11', hits: 1, misses: 0, rate: 100, total: 1 },
                lastUpdated: NOW,
            }));
            await setDoc(doc(adminDb, 'platformSummary', 'knowledgeIntakeSummary_1_101'), scoped({
                activeJobs: 0,
                updatedAt: NOW,
            }));
        });

        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'coverage_1_101')));
        await assertFails(getDoc(doc(otherDb, 'platformSummary', 'coverage_1_101')));
        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'knowledgeIntakeSummary_1_101')));

        for (const [documentId, payload] of [
            ['coverage_1_101', { coverage: { rate: 0 }, lastUpdated: NOW }],
            ['friction_1_101', { insight: 'forged', lastUpdated: NOW }],
            ['trustMetrics_1_101', { readiness: 100, lastUpdated: NOW }],
            ['entityGraphIndex_1_101', { nodes: {}, lastUpdated: NOW }],
            ['interactionRules_1_101', { rules: [], lastUpdated: NOW }],
            ['contextContent_1_101', { surfaces: {}, lastUpdated: NOW }],
            ['knowledgeIntakeSummary_1_101', { activeJobs: 999, updatedAt: NOW }],
        ] as const) {
            await assertFails(setDoc(
                doc(ownerDb, 'platformSummary', documentId),
                scoped(payload),
                { merge: true },
            ));
        }

        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { companyName: 'Example', poweredByVisible: true, primaryColor: '#1677ff' },
        })));
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'predictiveTriggers_1_101'), scoped({
            activeTriggerCount: 0,
            lastUpdated: NOW,
            triggerCount: 0,
            triggers: {},
            version: 1,
        })));
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_1_101'), scoped({
            canonical: 1,
            schemaVersion: 1,
            updatedAt: NOW,
        })));
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'bundleManifest_1_101'), scoped({
            schemaVersion: 1,
            staleReason: 'canonical_changed',
            status: 'stale',
            updatedAt: NOW,
        })));

        await assertFails(setDoc(doc(otherDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { companyName: 'Cross tenant', poweredByVisible: true, primaryColor: '#000000' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_999_999'), scoped({
            branding: { companyName: 'Wrong document scope', poweredByVisible: true, primaryColor: '#000000' },
        })));
        await assertSucceeds(setDoc(doc(platformDb, 'platformSummary', 'coverage_1_101'), scoped({
            coverage: { rate: 50 },
            lastUpdated: NOW,
        })));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Answerlattice platform summary Firestore rules tests passed.\n');
}

void run();

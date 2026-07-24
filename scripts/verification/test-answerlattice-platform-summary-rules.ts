#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, increment, runTransaction, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import {
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
} from '@lib/answerlattice/invalidationControlPlane';

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
            await setDoc(doc(adminDb, 'platformSummary', 'answerTests_1_101'), scoped({
                id: 'answerTests_1_101',
                schemaVersion: 4,
                revision: 0,
                cases: [],
                runs: [],
                reservations: [],
                updatedAt: null,
                updatedBy: null,
            }));
        });

        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'coverage_1_101')));
        await assertFails(getDoc(doc(otherDb, 'platformSummary', 'coverage_1_101')));
        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_1_101')));
        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'bundleManifest_1_101')));
        await assertFails(getDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_2_202')));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'platformSummary', 'sourceVersions_1_101'), {
                pId: 'ML',
                tId: 1,
                sId: 101,
                privateMarker: 'must-not-be-readable',
            });
        });
        await assertFails(getDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_1_101')));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await deleteDoc(doc(context.firestore(), 'platformSummary', 'sourceVersions_1_101'));
            await setDoc(doc(context.firestore(), 'platformSummary', 'sourceVersions_1_101'), scoped({
                canonical: 1,
                schemaVersion: 1,
                updatedAt: NOW,
            }));
        });
        await assertSucceeds(runTransaction(ownerDb, async transaction => {
            const sourceRef = doc(ownerDb, 'platformSummary', 'sourceVersions_1_101');
            await transaction.get(sourceRef);
            transaction.set(sourceRef, {
                ...getAnswerlatticeMissingSourceVersionsBase({ tId: 1, sId: 101 }),
                canonical: increment(1),
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }));
        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_1_101')));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await deleteDoc(doc(context.firestore(), 'platformSummary', 'sourceVersions_1_101'));
        });
        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'knowledgeIntakeSummary_1_101')));
        await assertFails(getDoc(doc(ownerDb, 'platformSummary', 'answerTests_1_101')));
        await assertSucceeds(getDoc(doc(platformDb, 'platformSummary', 'answerTests_1_101')));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'answerTests_1_101'), scoped({
            id: 'answerTests_1_101',
            schemaVersion: 4,
            revision: 1,
            cases: [],
            runs: [],
            reservations: [],
            updatedAt: NOW,
            updatedBy: 'owner-1',
        })));

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

        const validBranding = {
            companyName: 'Example',
            poweredByVisible: true,
            primaryColor: '#1677ff',
            accentColor: '#22c55e',
            logoUrl: 'https://cdn.example.com/logo.png',
            supportEmail: 'support@example.com',
            privacyPolicyUrl: 'https://example.com/privacy',
        };
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: validBranding,
        })));
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, logoUrl: 'https://cdn.example.com/logo@2x.png?version=1' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, customCss: 'body { display: none; }' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, fontFamily: 'url(https://attacker.example/font)' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, logoUrl: 'http://example.com/logo.png' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, logoUrl: 'https://cdn.example.com/logo image.png' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, logoUrl: 'https://?x' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, logoUrl: 'https://cdn.example.com:invalid/logo.png' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, logoUrl: 'https://[::1/logo.png' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, supportEmail: 'a..b@example.com' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, supportEmail: 'a@b..example.com' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, primaryColor: 'red' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_1_101'), {
            ...scoped({ branding: validBranding }),
            unexpected: true,
        }));
        await assertSucceeds(setDoc(
            doc(ownerDb, 'platformSummary', 'branding_1_101'),
            scoped({ branding: { ...validBranding, companyName: 'Updated Example' } }),
            { merge: true },
        ));
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'predictiveTriggers_1_101'), scoped({
            activeTriggerCount: 0,
            lastUpdated: NOW,
            triggerCount: 0,
            triggers: {},
            version: 1,
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_1_101'), scoped({
            canonical: 1,
            schemaVersion: 1,
            updatedAt: NOW,
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'bundleManifest_1_101'), scoped({
            schemaVersion: 1,
            staleReason: 'canonical_changed',
            status: 'stale',
            updatedAt: NOW,
        })));
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_1_101'), {
            ...getAnswerlatticeMissingSourceVersionsBase({ tId: 1, sId: 101 }),
            canonical: 1,
            updatedAt: NOW,
        }));
        await assertSucceeds(setDoc(doc(ownerDb, 'platformSummary', 'bundleManifest_1_101'), {
            ...getAnswerlatticeMissingBundleManifestBase({ tId: 1, sId: 101 }),
            staleReason: 'canonical_changed',
            status: 'stale',
            updatedAt: NOW,
        }));
        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'sourceVersions_1_101')));
        await assertSucceeds(getDoc(doc(ownerDb, 'platformSummary', 'bundleManifest_1_101')));
        await assertFails(getDoc(doc(otherDb, 'platformSummary', 'sourceVersions_1_101')));
        await assertFails(getDoc(doc(otherDb, 'platformSummary', 'bundleManifest_1_101')));
        await assertFails(setDoc(
            doc(ownerDb, 'platformSummary', 'bundleManifest_1_101'),
            { activeVersion: 99, status: 'stale' },
            { merge: true },
        ));
        await assertSucceeds(setDoc(
            doc(ownerDb, 'platformSummary', 'sourceVersions_1_101'),
            { canonical: 2, updatedAt: NOW },
            { merge: true },
        ));

        const cacheVersionRef = doc(ownerDb, 'answerlattice_cacheVersions', 'canonical_1_101');
        await assertFails(setDoc(cacheVersionRef, scoped({
            source: 'kb',
            version: 1,
            modifiedOn: NOW,
        })));
        await assertFails(setDoc(cacheVersionRef, scoped({
            source: 'canonical',
            version: 2,
            modifiedOn: NOW,
        })));
        await assertSucceeds(setDoc(cacheVersionRef, scoped({
            source: 'canonical',
            version: 1,
            modifiedOn: NOW,
        })));
        await assertFails(setDoc(cacheVersionRef, { version: 3, modifiedOn: NOW }, { merge: true }));
        await assertFails(setDoc(cacheVersionRef, { source: 'kb', version: 2, modifiedOn: NOW }, { merge: true }));
        await assertSucceeds(setDoc(cacheVersionRef, { version: 2, modifiedOn: NOW }, { merge: true }));
        await assertSucceeds(runTransaction(ownerDb, async transaction => {
            const sourceRef = doc(ownerDb, 'platformSummary', 'sourceVersions_1_101');
            const manifestRef = doc(ownerDb, 'platformSummary', 'bundleManifest_1_101');
            await Promise.all([
                transaction.get(cacheVersionRef),
                transaction.get(sourceRef),
                transaction.get(manifestRef),
            ]);
            transaction.set(cacheVersionRef, {
                version: increment(1),
                modifiedOn: serverTimestamp(),
            }, { merge: true });
            transaction.set(sourceRef, {
                canonical: increment(1),
                updatedAt: serverTimestamp(),
            }, { merge: true });
            transaction.set(manifestRef, {
                status: 'stale',
                staleReason: 'transactional_canonical_change',
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }));

        await assertFails(setDoc(doc(otherDb, 'platformSummary', 'branding_1_101'), scoped({
            branding: { ...validBranding, companyName: 'Cross tenant' },
        })));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary', 'branding_999_999'), scoped({
            branding: { ...validBranding, companyName: 'Wrong document scope' },
        })));
        await assertSucceeds(setDoc(doc(platformDb, 'platformSummary', 'coverage_1_101'), scoped({
            coverage: { rate: 50 },
            lastUpdated: NOW,
        })));

        const surfaceId = '1_101_billing';
        const productSurface = scoped({
            key: 'billing',
            label: 'Billing',
            description: '',
            routePatterns: ['/billing', '/billing/*'],
            feature: 'billing',
            page: 'invoices',
            workflow: 'manage_subscription',
            entityHints: [],
            entityIds: [],
            tags: [],
            visibility: { helpWidget: true, helpCenter: true, changelog: true },
            active: true,
            priority: 100,
            createdOn: NOW,
            createdBy: 'Owner',
            modifiedOn: NOW,
            modifiedBy: 'Owner',
        });
        await assertSucceeds(setDoc(
            doc(ownerDb, 'answerlattice_productSurfaces', surfaceId),
            productSurface,
        ));
        await assertFails(setDoc(
            doc(otherDb, 'answerlattice_productSurfaces', surfaceId),
            productSurface,
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_productSurfaces', '1_101_private'),
            { ...productSurface, key: 'private', privateNote: 'not allowed' },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_productSurfaces', '1_101_imported'),
            { ...productSurface, key: 'imported', intakeJobId: 'job_1' },
        ));
        await assertSucceeds(setDoc(
            doc(ownerDb, 'answerlattice_productSurfaces', surfaceId),
            { label: 'Billing and invoices', routePatterns: ['/billing/*'], modifiedOn: NOW, modifiedBy: 'Owner' },
            { merge: true },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_productSurfaces', surfaceId),
            { key: 'renamed' },
            { merge: true },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_productSurfaces', surfaceId),
            { tId: 2 },
            { merge: true },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_productSurfaces', surfaceId),
            { intakeReviewItemId: 'review_1' },
            { merge: true },
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Answerlattice platform summary Firestore rules tests passed.\n');
}

void run();

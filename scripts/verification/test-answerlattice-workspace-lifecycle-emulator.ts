import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
    getAnswerlatticeBundleManifestDocId,
    getPrivateBundlePath,
    getPublicBundlePath,
} from '../../src/lib/answerlattice/compiledContext';
import {
    requireAnswerlatticeAuthAdmin,
    requireAnswerlatticeFirestoreAdmin,
    requireAnswerlatticeStorageAdmin,
} from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import {
    executeAnswerlatticeWorkspaceLifecycle,
} from '../../src/lib/answerlattice/workspaceLifecycleServer';
import { updateProductSubscription } from '../../src/lib/billing/productBillingServer';
import { getExpectedAnswerlatticePublicBundleId } from '../../src/lib/answerlattice/publicBundleIdentityServer';
import {
    getAnswerlatticeWorkspaceCloseConfirmation,
    getAnswerlatticeWorkspaceEraseConfirmation,
    getAnswerlatticeWorkspaceRecoverConfirmation,
} from '../../src/lib/answerlattice/workspaceLifecycleContracts';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const auth = requireAnswerlatticeAuthAdmin();
const db = requireAnswerlatticeFirestoreAdmin();
const storage = requireAnswerlatticeStorageAdmin();

const scope = { tId: 8701, sId: 87001 };
const actorId = 'platform_workspace_lifecycle_emulator';
const publicBundleId = getExpectedAnswerlatticePublicBundleId(scope.tId, scope.sId);
if (!publicBundleId) throw new Error('Workspace lifecycle emulator public bundle salt is missing');
const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));
const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(scope.tId));
const legacySiblingStoreRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId + 1));
const legacyStaffRef = db.collection(DB_COLLECTIONS.USERS).doc('legacy-lifecycle-staff');
const legacyStaffEmail = 'legacy-lifecycle-staff@example.test';
const multiWorkspaceStaffRef = db.collection(DB_COLLECTIONS.USERS).doc('multi-workspace-lifecycle-staff');
const multiWorkspaceStaffEmail = 'multi-workspace-lifecycle-staff@example.test';

const seedWorkspace = async (): Promise<void> => {
    const [legacyStaffAuth, multiWorkspaceStaffAuth] = await Promise.all([
        auth.createUser({
            displayName: 'Legacy Lifecycle Staff',
            email: legacyStaffEmail,
            emailVerified: true,
        }),
        auth.createUser({
            displayName: 'Multi-workspace Lifecycle Staff',
            email: multiWorkspaceStaffEmail,
            emailVerified: true,
        }),
    ]);
    await Promise.all([
        storeRef.set({
            active: true,
            answerlatticeWidgetApi: {
                keyHashes: ['a'.repeat(64)],
                keysByHash: {},
            },
            authDisabled: false,
            deleted: false,
            hostedHelpConfig: { domain: 'help.example.test' },
            hostedHelpConfigVersion: 1,
            id: scope.sId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            publicApi: { apiKeyHash: 'b'.repeat(64) },
            sId: scope.sId,
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        tenantRef.set({
            active: true,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        legacySiblingStoreRef.set({
            active: true,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: scope.sId + 1,
            storeId: scope.sId + 1,
            tId: scope.tId,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc('lifecycle-site').set({
            domain: 'help.example.test',
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: scope.sId,
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId))
            .set({
                activeVersion: 1,
                bundles: {},
                bundleVersion: 1,
                lastReadyVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                publicBundleId,
                sId: scope.sId,
                schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
                sourceVersions: null,
                status: 'ready',
                tId: scope.tId,
            }),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
            stores: {
                [scope.sId]: {
                    active: true,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    sId: scope.sId,
                    tId: scope.tId,
                },
            },
        }),
        legacyStaffRef.set({
            active: true,
            email: legacyStaffEmail,
            firebaseUid: legacyStaffAuth.uid,
            name: 'Legacy Lifecycle Staff',
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            role: 'OWNER',
            sId: scope.sId,
            tId: scope.tId,
        }),
        multiWorkspaceStaffRef.set({
            accessRevision: 1,
            active: true,
            email: multiWorkspaceStaffEmail,
            firebaseUid: multiWorkspaceStaffAuth.uid,
            name: 'Multi-workspace Lifecycle Staff',
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            role: 'OWNER',
            sId: scope.sId,
            storeId: scope.sId,
            storeIds: [scope.sId, scope.sId + 1],
            stores: [
                { name: 'Lifecycle workspace', role: 'OWNER', storeId: scope.sId },
                { name: 'Sibling workspace', role: 'OWNER', storeId: scope.sId + 1 },
            ],
            tId: scope.tId,
            tenantId: scope.tId,
        }),
    ]);

    const bucket = storage.bucket();
    await Promise.all([
        bucket.file(getPrivateBundlePath(scope.tId, scope.sId, 1, 'context.json'))
            .save(JSON.stringify({ private: true }), { contentType: 'application/json' }),
        bucket.file(getPublicBundlePath(publicBundleId, 1, 'widget-bootstrap.json'))
            .save(JSON.stringify({ public: true }), { contentType: 'application/json' }),
        ...Array.from({ length: 50 }, (_, index) => (
            bucket.file(getPrivateBundlePath(
                scope.tId,
                scope.sId,
                index + 2,
                `extra-${index}.json`,
            )).save('{}', { contentType: 'application/json' })
        )),
        ...Array.from({ length: 50 }, (_, index) => (
            bucket.file(getPublicBundlePath(
                publicBundleId,
                index + 2,
                `extra-${index}.json`,
            )).save('{}', { contentType: 'application/json' })
        )),
    ]);
};

const assertPrefixEmpty = async (prefix: string): Promise<void> => {
    const [files] = await storage.bucket().getFiles({ prefix });
    assert.equal(files.length, 0, `expected no objects under ${prefix}`);
};

const closeAndRecover = async (): Promise<void> => {
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId));
    await manifestRef.update({ pId: PRODUCT_IDS.MENULIST });
    await assert.rejects(
        () => executeAnswerlatticeWorkspaceLifecycle({
            actorId,
            request: {
                action: 'close',
                confirmation: getAnswerlatticeWorkspaceCloseConfirmation(scope),
                reason: 'Emulator malformed manifest closure verification.',
                ...scope,
            },
        }),
        (error: unknown) => (
            (error as { code?: unknown })?.code === 'CONTEXT_BUNDLE_MANIFEST_REVIEW_REQUIRED'
        ),
    );
    let deniedStore = (await storeRef.get()).data() || {};
    assert.equal(deniedStore.answerlatticeWorkspaceLifecycle?.state, 'closing');
    assert.equal(deniedStore.active, false, 'manifest review must not restore customer access');

    await manifestRef.update({ pId: PRODUCT_IDS.ANSWERLATTICE });
    const conflictingRegistryRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES)
        .doc('conflicting-lifecycle-site');
    await conflictingRegistryRef.set({
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        sId: scope.sId,
        storeId: scope.sId,
        tId: scope.tId,
        tenantId: scope.tId,
    });
    await assert.rejects(
        () => executeAnswerlatticeWorkspaceLifecycle({
            actorId,
            request: {
                action: 'close',
                confirmation: getAnswerlatticeWorkspaceCloseConfirmation(scope),
                reason: 'Emulator hosted registry scope verification.',
                ...scope,
            },
        }),
        (error: unknown) => (
            (error as { code?: unknown })?.code === 'HOSTED_HELP_REGISTRY_SCOPE_REVIEW_REQUIRED'
        ),
    );
    deniedStore = (await storeRef.get()).data() || {};
    assert.equal(deniedStore.answerlatticeWorkspaceLifecycle?.state, 'closing');
    assert.equal(deniedStore.active, false, 'registry review must not restore customer access');
    await conflictingRegistryRef.delete();

    const closeRequest = {
        action: 'close' as const,
        confirmation: getAnswerlatticeWorkspaceCloseConfirmation(scope),
        reason: 'Emulator lifecycle closure verification.',
        ...scope,
    };
    await assert.rejects(
        () => executeAnswerlatticeWorkspaceLifecycle({ actorId, request: closeRequest }),
        (error: unknown) => (
            (error as { code?: unknown })?.code === 'COMPILED_BUNDLE_CLEANUP_INCOMPLETE'
        ),
        'compiled bundle cleanup must stop after a bounded batch',
    );
    const partiallyCleanedStore = (await storeRef.get()).data() || {};
    assert.equal(partiallyCleanedStore.answerlatticeWorkspaceLifecycle?.state, 'closing');
    const closeResult = await executeAnswerlatticeWorkspaceLifecycle({
        actorId,
        request: closeRequest,
    });
    assert.equal(closeResult.action, 'close');
    assert.equal(closeResult.state, 'closed');
    assert.equal(closeResult.complete, true);

    const closedStore = (await storeRef.get()).data() || {};
    assert.equal(closedStore.active, false);
    assert.equal(closedStore.authDisabled, true);
    assert.equal(closedStore.deleted, true);
    assert.equal(closedStore.publicApi, undefined);
    assert.equal(closedStore.answerlatticeWidgetApi, undefined);
    assert.equal(closedStore.hostedHelpConfig, undefined);
    const closedStaffAuth = await auth.getUserByEmail(legacyStaffEmail);
    assert.equal(closedStaffAuth.disabled, true, 'legacy tId/sId-only staff access must be disabled');
    assert.deepEqual(
        closedStaffAuth.customClaims?.storeIds,
        [],
        'legacy staff claims must be revoked during closure',
    );
    const closedMultiWorkspaceAuth = await auth.getUserByEmail(multiWorkspaceStaffEmail);
    assert.equal(
        closedMultiWorkspaceAuth.disabled,
        false,
        'a staff identity with another active workspace must remain enabled',
    );
    assert.equal(closedMultiWorkspaceAuth.customClaims?.storeId, String(scope.sId + 1));
    assert.deepEqual(closedMultiWorkspaceAuth.customClaims?.storeIds, [String(scope.sId + 1)]);
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc('lifecycle-site').get()).exists,
        false,
    );
    await assertPrefixEmpty(`answerlattice-context/private/${scope.tId}/${scope.sId}/`);
    await assertPrefixEmpty(`answerlattice-context/public/${publicBundleId}/`);

    const recoverResult = await executeAnswerlatticeWorkspaceLifecycle({
        actorId,
        request: {
            action: 'recover',
            confirmation: getAnswerlatticeWorkspaceRecoverConfirmation(scope),
            reason: 'Emulator lifecycle recovery verification.',
            ...scope,
        },
    });
    assert.equal(recoverResult.action, 'recover');
    assert.equal(recoverResult.state, 'active');

    const recoveredStore = (await storeRef.get()).data() || {};
    assert.equal(recoveredStore.active, true);
    assert.equal(recoveredStore.authDisabled, false);
    assert.equal(recoveredStore.deleted, false);
    assert.equal(recoveredStore.publicApi, undefined, 'recovery must not restore revoked API credentials');
    assert.equal(recoveredStore.answerlatticeWidgetApi, undefined, 'recovery must not restore widget credentials');
    assert.equal(recoveredStore.hostedHelpConfig, undefined, 'recovery must not restore hosted-help publication');
    const recoveredStaffAuth = await auth.getUserByEmail(legacyStaffEmail);
    assert.equal(recoveredStaffAuth.disabled, false, 'recovery must refresh an exact legacy staff identity');
    assert.deepEqual(recoveredStaffAuth.customClaims?.storeIds, [String(scope.sId)]);
    await storeRef.update({
        'answerlatticeWorkspaceLifecycle.eraseAfter': Timestamp.fromMillis(Date.now() - 60_000),
    });
};

const seedErasureEvidence = async (): Promise<void> => {
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc('exact-answer').set({
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: scope.sId,
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc('foreign-answer').set({
            pId: PRODUCT_IDS.MENULIST,
            productId: PRODUCT_IDS.MENULIST,
            sId: scope.sId,
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc('exact-chat').set({
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: scope.sId,
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        db.collection(DB_COLLECTIONS.ARTICLE_FEEDBACK)
            .doc(String(scope.tId))
            .collection(String(scope.sId))
            .doc('state1_actor')
            .set({
                active: true,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                sId: scope.sId,
                tId: scope.tId,
                uId: 'customer-1',
            }),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('retained-subscription').set({
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            providerSubscriptionId: 'retained-subscription',
            sId: scope.sId,
            status: 'completed',
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        db.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc('retained-payment').set({
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: scope.sId,
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS).doc('retained-run-log').set({
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: scope.sId,
            storeId: scope.sId,
            tId: scope.tId,
            tenantId: scope.tId,
        }),
    ]);
};

const eraseWorkspace = async (): Promise<void> => {
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId));
    const unreferencedPublicObjectPath = getPublicBundlePath(
        publicBundleId,
        999,
        'partial-build-orphan.json',
    );
    await Promise.all([
        manifestRef.delete(),
        storeRef.update({
            'answerlatticeWorkspaceLifecycle.revokedPublicBundleId': FieldValue.delete(),
        }),
        storage.bucket().file(unreferencedPublicObjectPath).save('{}', {
            contentType: 'application/json',
        }),
    ]);
    await executeAnswerlatticeWorkspaceLifecycle({
        actorId,
        request: {
            action: 'close',
            confirmation: getAnswerlatticeWorkspaceCloseConfirmation(scope),
            reason: 'Emulator lifecycle final closure verification.',
            ...scope,
        },
    });
    assert.equal(
        (await storage.bucket().file(unreferencedPublicObjectPath).exists())[0],
        false,
        'closure must remove the deterministic public prefix even without a manifest pointer',
    );
    const reclosedStore = (await storeRef.get()).data() || {};
    assert.ok(
        reclosedStore.answerlatticeWorkspaceLifecycle?.eraseAfter?.toMillis() > Date.now(),
        'a new closure after recovery must start a fresh recovery window',
    );
    await storeRef.update({
        'answerlatticeWorkspaceLifecycle.eraseAfter': Timestamp.fromMillis(Date.now() - 60_000),
    });
    await seedErasureEvidence();

    let result = await executeAnswerlatticeWorkspaceLifecycle({
        actorId,
        request: {
            action: 'start_erasure',
            billingReview: 'resolved',
            confirmation: getAnswerlatticeWorkspaceEraseConfirmation(scope),
            exportDecision: 'waived',
            reason: 'Emulator lifecycle bounded erasure verification.',
            retainedEvidenceAcknowledged: true,
            ...scope,
        },
    });
    assert.equal(result.action, 'start_erasure');
    await assert.rejects(
        () => updateProductSubscription(
            PRODUCT_IDS.ANSWERLATTICE,
            'retained-subscription',
            { status: 'active' },
        ),
        /workspace billing activation is not allowed/,
        'an erasing workspace must fence a concurrent subscription activation',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('retained-subscription').get()).data()?.status,
        'completed',
        'rejected activation must leave retained billing evidence unchanged',
    );

    for (let attempt = 0; attempt < 80 && !result.complete; attempt += 1) {
        result = await executeAnswerlatticeWorkspaceLifecycle({
            actorId,
            request: {
                action: 'continue_erasure',
                confirmation: getAnswerlatticeWorkspaceEraseConfirmation(scope),
                ...scope,
            },
        });
    }
    assert.equal(result.complete, true, 'bounded erasure must reach a terminal state');
    assert.equal(result.state, 'erased');

    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc('exact-answer').get()).exists,
        false,
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.CHAT_SESSIONS).doc('exact-chat').get()).exists,
        false,
    );
    assert.equal(
        (
            await db.collection(DB_COLLECTIONS.ARTICLE_FEEDBACK)
                .doc(String(scope.tId))
                .collection(String(scope.sId))
                .doc('state1_actor')
                .get()
        ).exists,
        false,
        'nested content-feedback actor state must be erased',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc('foreign-answer').get()).exists,
        true,
        'a foreign-product record must never be deleted',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('retained-subscription').get()).exists,
        true,
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc('retained-payment').get()).exists,
        true,
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS).doc('retained-run-log').get()).exists,
        true,
    );
    assert.equal(
        (await tenantRef.get()).exists,
        true,
        'a tenant with a legacy tId-only sibling workspace must be retained',
    );
    assert.equal(
        (await legacySiblingStoreRef.get()).exists,
        true,
        'erasure must not modify another workspace in the tenant',
    );
    assert.equal(
        (await legacyStaffRef.get()).exists,
        false,
        'terminal erasure must delete an exact legacy tId/sId-only staff document',
    );
    await assert.rejects(
        () => auth.getUserByEmail(legacyStaffEmail),
        (error: unknown) => (error as { code?: unknown })?.code === 'auth/user-not-found',
        'terminal erasure must delete the separate-product Auth identity',
    );
    const retainedMultiWorkspaceStaff = (await multiWorkspaceStaffRef.get()).data() || {};
    assert.deepEqual(retainedMultiWorkspaceStaff.storeIds, [scope.sId + 1]);
    assert.deepEqual(
        retainedMultiWorkspaceStaff.stores?.map((membership: { storeId?: unknown }) => membership.storeId),
        [scope.sId + 1],
        'terminal erasure must remove only the erased workspace membership',
    );
    const retainedMultiWorkspaceAuth = await auth.getUserByEmail(multiWorkspaceStaffEmail);
    assert.equal(retainedMultiWorkspaceAuth.disabled, false);
    assert.equal(retainedMultiWorkspaceAuth.customClaims?.storeId, String(scope.sId + 1));
    assert.deepEqual(retainedMultiWorkspaceAuth.customClaims?.storeIds, [String(scope.sId + 1)]);

    const tombstone = (await storeRef.get()).data() || {};
    assert.equal(tombstone.answerlatticeWorkspaceLifecycle?.state, 'erased');
    assert.ok(tombstone.answerlatticeWorkspaceLifecycle?.certificateId);
    assert.equal(tombstone.publicApi, undefined);
    assert.equal(tombstone.answerlatticeWidgetApi, undefined);

    const replay = await executeAnswerlatticeWorkspaceLifecycle({
        actorId,
        request: {
            action: 'continue_erasure',
            confirmation: getAnswerlatticeWorkspaceEraseConfirmation(scope),
            ...scope,
        },
    });
    assert.equal(replay.complete, true);
    assert.equal(replay.state, 'erased');
};

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('FIREBASE_AUTH_EMULATOR_HOST is required');
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required');

    await seedWorkspace();
    await closeAndRecover();
    await eraseWorkspace();
    process.stdout.write('Answerlattice workspace lifecycle emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});

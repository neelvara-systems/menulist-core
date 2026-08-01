import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
    EMPTY_BUNDLE_STATS,
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeCompiledSourceVersions,
} from './compiledContext';
import { isAnswerlatticeStoreInScope } from './sessionScope';
import { appendAnswerlatticeTenantSummaryAdmin } from './tenantSummaryAdmin';
import {
    ANSWERLATTICE_WORKSPACE_PROFILE_REVISION_FIELD,
    type AnswerlatticeWorkspaceProfile,
    answerlatticeWorkspaceProfilesEqual,
    buildAnswerlatticeWorkspaceProfileFromStore,
    normalizeAnswerlatticeWorkspaceProfileInput,
    normalizeAnswerlatticeWorkspaceProfileRevision,
    parseAnswerlatticeWorkspaceProfile,
} from './workspaceProfileContracts';
import { FieldValue } from 'firebase-admin/firestore';

export type SaveAnswerlatticeWorkspaceProfileResult =
    | {
        status: 'saved';
        profile: AnswerlatticeWorkspaceProfile;
        revision: number;
    }
    | {
        status: 'unchanged';
        profile: AnswerlatticeWorkspaceProfile;
        revision: number;
    }
    | {
        status: 'conflict';
        revision: number;
    }
    | {
        status: 'forbidden';
    }
    | {
        status: 'not_found';
    };

export const saveAnswerlatticeWorkspaceProfileAdmin = async (params: {
    db: FirebaseFirestore.Firestore;
    expectedRevision: number;
    profile: AnswerlatticeWorkspaceProfile;
    storeId: number;
    tenantId: number;
}): Promise<SaveAnswerlatticeWorkspaceProfileResult> => {
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(params.storeId));
    const sourceVersionsRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(params.tenantId, params.storeId));
    const manifestRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(params.tenantId, params.storeId));
    const nextProfile = normalizeAnswerlatticeWorkspaceProfileInput(
        parseAnswerlatticeWorkspaceProfile(params.profile),
    );

    return params.db.runTransaction(async transaction => {
        const storeSnapshot = await transaction.get(storeRef);
        if (!storeSnapshot.exists) return { status: 'not_found' as const };

        const storeData = storeSnapshot.data() || {};
        if (!isAnswerlatticeStoreInScope(
            storeData,
            { tenantId: params.tenantId, storeId: params.storeId },
            storeSnapshot.id,
        )) {
            return { status: 'forbidden' as const };
        }

        const currentRevision = normalizeAnswerlatticeWorkspaceProfileRevision(
            storeData[ANSWERLATTICE_WORKSPACE_PROFILE_REVISION_FIELD],
        );
        if (currentRevision !== params.expectedRevision) {
            return {
                status: 'conflict' as const,
                revision: currentRevision,
            };
        }

        const currentProfile = buildAnswerlatticeWorkspaceProfileFromStore(storeData);
        if (answerlatticeWorkspaceProfilesEqual(currentProfile, nextProfile)) {
            return {
                status: 'unchanged' as const,
                profile: currentProfile,
                revision: currentRevision,
            };
        }

        if (currentRevision >= Number.MAX_SAFE_INTEGER) {
            throw new Error('Answerlattice workspace profile revision is exhausted.');
        }
        const [sourceVersionsSnapshot, manifestSnapshot] = await Promise.all([
            transaction.get(sourceVersionsRef),
            transaction.get(manifestRef),
        ]);
        const sourceVersionsData = sourceVersionsSnapshot.exists ? sourceVersionsSnapshot.data() || {} : null;
        const manifestData = manifestSnapshot.exists ? manifestSnapshot.data() || {} : null;
        if (sourceVersionsData && (
            sourceVersionsData.pId !== PRODUCT_IDS.ANSWERLATTICE
            || sourceVersionsData.tId !== params.tenantId
            || sourceVersionsData.sId !== params.storeId
            || !areAnswerlatticeCompiledSourceVersionsValid(sourceVersionsData)
        )) {
            throw new Error('Answerlattice compiled source versions are invalid for this workspace.');
        }
        if (manifestData && !isAnswerlatticeContextBundleManifestForScope(
            manifestData,
            params.tenantId,
            params.storeId,
        )) {
            throw new Error('Answerlattice compiled context manifest is invalid for this workspace.');
        }

        const currentSourceVersions = sourceVersionsData
            ? normalizeCompiledSourceVersions(sourceVersionsData)
            : manifestData
                ? normalizeCompiledSourceVersions(manifestData.sourceVersions)
                : normalizeCompiledSourceVersions({});
        const currentWorkspaceProfileVersion = currentSourceVersions.workspaceProfile ?? 0;
        if (currentWorkspaceProfileVersion >= Number.MAX_SAFE_INTEGER) {
            throw new Error('Answerlattice workspace profile source version is exhausted.');
        }
        const nextSourceVersions = {
            ...currentSourceVersions,
            workspaceProfile: currentWorkspaceProfileVersion + 1,
        };

        const revision = currentRevision + 1;
        const now = FieldValue.serverTimestamp();
        const currentLaunchProfile = storeData.answerlatticeLaunchProfile as Record<string, unknown> | null | undefined;
        const launchProfileCreatedAt = currentLaunchProfile
            && typeof currentLaunchProfile === 'object'
            && !Array.isArray(currentLaunchProfile)
            && currentLaunchProfile.createdAt
                ? currentLaunchProfile.createdAt
                : now;
        transaction.set(storeRef, {
            ...nextProfile,
            [ANSWERLATTICE_WORKSPACE_PROFILE_REVISION_FIELD]: revision,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            answerlatticeLaunchProfile: {
                ...nextProfile,
                createdAt: launchProfileCreatedAt,
                revision,
                updatedAt: now,
            },
            modifiedOn: now,
        }, { merge: true });

        const tenantSummaryAppend = appendAnswerlatticeTenantSummaryAdmin(transaction, {
            tId: params.tenantId,
            sId: params.storeId,
            source: 'workspace_profile_update',
            timeZone: nextProfile.timeZone,
            businessDayEndTime: nextProfile.businessDayEndTime,
        });
        if (tenantSummaryAppend.skipped) {
            throw new Error('Answerlattice tenant summary writer is unavailable.');
        }
        transaction.set(sourceVersionsRef, {
            schemaVersion: 1,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: params.tenantId,
            sId: params.storeId,
            ...nextSourceVersions,
            lastReason: 'workspace_profile_update',
            lastSourceId: String(params.storeId),
            lastSourceType: 'stores',
            updatedAt: now,
        }, { merge: true });
        if (manifestSnapshot.exists) {
            transaction.set(manifestRef, {
                schemaVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: params.tenantId,
                sId: params.storeId,
                status: 'stale',
                staleReason: 'workspace_profile_update',
                lastReason: 'workspace_profile_update',
                lastSourceId: String(params.storeId),
                lastSourceType: 'stores',
                updatedAt: now,
            }, { merge: true });
        } else {
            transaction.create(manifestRef, {
                schemaVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: params.tenantId,
                sId: params.storeId,
                publicBundleId: '',
                bundleVersion: 0,
                activeVersion: 0,
                lastReadyVersion: 0,
                status: 'stale',
                staleReason: 'workspace_profile_update',
                sourceVersions: currentSourceVersions,
                bundles: {},
                stats: EMPTY_BUNDLE_STATS,
                limits: ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
                generatedAt: null,
                lastBuildError: null,
                lastReason: 'workspace_profile_update',
                lastSourceId: String(params.storeId),
                lastSourceType: 'stores',
                updatedAt: now,
            });
        }

        return {
            status: 'saved' as const,
            profile: nextProfile,
            revision,
        };
    });
};

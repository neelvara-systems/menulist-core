import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    type AnswerlatticeCacheSource,
    getAnswerlatticeCacheVersionDocId,
    normalizeCacheVersion,
} from '@lib/answerlattice/cacheVersionManifest';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
} from '@lib/answerlattice/compiledContext';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
export {
    getAnswerlatticeInvalidationCacheSources,
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
} from './invalidationControlPlane';

type Scope = { tId: number; sId: number };

export type AnswerlatticeInvalidationOwnership = {
    cacheVersionRefs: Partial<Record<AnswerlatticeCacheSource, FirebaseFirestore.DocumentReference>>;
    manifestExists: boolean;
    manifestRef: FirebaseFirestore.DocumentReference;
    sourceVersionsExists: boolean;
    sourceVersionsRef: FirebaseFirestore.DocumentReference;
};

export class AnswerlatticeInvalidationOwnershipError extends Error {
    constructor(public readonly target: 'source_versions' | 'bundle_manifest' | 'cache_version') {
        super(`Answerlattice invalidation target ownership conflict: ${target}`);
        this.name = 'AnswerlatticeInvalidationOwnershipError';
        Object.setPrototypeOf(this, AnswerlatticeInvalidationOwnershipError.prototype);
    }
}

export const readAnswerlatticeInvalidationOwnership = async (params: {
    cacheSources?: AnswerlatticeCacheSource[];
    db: Firestore;
    scope: Scope;
    transaction: Transaction;
}): Promise<AnswerlatticeInvalidationOwnership> => {
    const { db, scope, transaction } = params;
    const sourceVersionsRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(scope.tId, scope.sId));
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId));
    const cacheSources = Array.from(new Set(params.cacheSources || []));
    const cacheVersionRefs = Object.fromEntries(cacheSources.map(source => [
        source,
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
            .doc(getAnswerlatticeCacheVersionDocId(source, scope.tId, scope.sId)),
    ])) as Partial<Record<AnswerlatticeCacheSource, FirebaseFirestore.DocumentReference>>;
    const [sourceVersionsSnapshot, manifestSnapshot, ...cacheSnapshots] = await Promise.all([
        transaction.get(sourceVersionsRef),
        transaction.get(manifestRef),
        ...cacheSources.map(source => transaction.get(cacheVersionRefs[source]!)),
    ]);

    if (sourceVersionsSnapshot.exists) {
        const data = sourceVersionsSnapshot.data() || {};
        if (
            data.pId !== PRODUCT_IDS.ANSWERLATTICE
            || data.tId !== scope.tId
            || data.sId !== scope.sId
            || !areAnswerlatticeCompiledSourceVersionsValid(data)
        ) throw new AnswerlatticeInvalidationOwnershipError('source_versions');
    }
    if (
        manifestSnapshot.exists
        && !isAnswerlatticeContextBundleManifestForScope(manifestSnapshot.data(), scope.tId, scope.sId)
    ) throw new AnswerlatticeInvalidationOwnershipError('bundle_manifest');

    cacheSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) return;
        const source = cacheSources[index];
        const data = snapshot.data() || {};
        if (
            data.pId !== PRODUCT_IDS.ANSWERLATTICE
            || data.tId !== scope.tId
            || data.sId !== scope.sId
            || data.source !== source
            || normalizeCacheVersion(data.version) === undefined
        ) throw new AnswerlatticeInvalidationOwnershipError('cache_version');
    });

    return {
        cacheVersionRefs,
        manifestExists: manifestSnapshot.exists,
        manifestRef,
        sourceVersionsExists: sourceVersionsSnapshot.exists,
        sourceVersionsRef,
    };
};

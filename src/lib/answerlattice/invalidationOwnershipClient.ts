import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    doc,
    type DocumentReference,
    type Transaction,
} from '@firebase/firestore';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import {
    type AnswerlatticeCacheSource,
    getAnswerlatticeCacheVersionDocId,
    normalizeCacheVersion,
} from './cacheVersionManifest';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeCompiledSourceVersions,
} from './compiledContext';
import type { AnswerlatticeCompiledSourceVersions } from '@type/answerlattice';

type Scope = { tId: number; sId: number };

export type AnswerlatticeClientInvalidationOwnership = {
    cacheVersionRefs: Partial<Record<AnswerlatticeCacheSource, DocumentReference>>;
    manifestExists: boolean;
    manifestRef: DocumentReference;
    sourceVersionsExists: boolean;
    sourceVersionsRef: DocumentReference;
    sourceVersions: AnswerlatticeCompiledSourceVersions;
};

export class AnswerlatticeClientInvalidationOwnershipError extends Error {
    constructor(public readonly target: 'source_versions' | 'bundle_manifest' | 'cache_version') {
        super(`Answerlattice invalidation target ownership conflict: ${target}`);
        this.name = 'AnswerlatticeClientInvalidationOwnershipError';
        Object.setPrototypeOf(this, AnswerlatticeClientInvalidationOwnershipError.prototype);
    }
}

export const readAnswerlatticeClientInvalidationOwnership = async (params: {
    cacheSources?: AnswerlatticeCacheSource[];
    scope: Scope;
    transaction: Transaction;
}): Promise<AnswerlatticeClientInvalidationOwnership> => {
    const { scope, transaction } = params;
    const sourceVersionsRef = doc(
        answerlatticeFirebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
        getAnswerlatticeSourceVersionsDocId(scope.tId, scope.sId),
    );
    const manifestRef = doc(
        answerlatticeFirebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
        getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId),
    );
    const cacheSources = Array.from(new Set(params.cacheSources || []));
    const cacheVersionRefs = Object.fromEntries(cacheSources.map(source => [
        source,
        doc(
            answerlatticeFirebaseClient,
            DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS,
            getAnswerlatticeCacheVersionDocId(source, scope.tId, scope.sId),
        ),
    ])) as Partial<Record<AnswerlatticeCacheSource, DocumentReference>>;
    const [sourceVersionsSnapshot, manifestSnapshot, ...cacheSnapshots] = await Promise.all([
        transaction.get(sourceVersionsRef),
        transaction.get(manifestRef),
        ...cacheSources.map(source => transaction.get(cacheVersionRefs[source]!)),
    ]);

    if (sourceVersionsSnapshot.exists()) {
        const data = sourceVersionsSnapshot.data();
        if (
            data.pId !== PRODUCT_IDS.ANSWERLATTICE
            || data.tId !== scope.tId
            || data.sId !== scope.sId
            || !areAnswerlatticeCompiledSourceVersionsValid(data)
        ) throw new AnswerlatticeClientInvalidationOwnershipError('source_versions');
    }
    if (
        manifestSnapshot.exists()
        && !isAnswerlatticeContextBundleManifestForScope(manifestSnapshot.data(), scope.tId, scope.sId)
    ) throw new AnswerlatticeClientInvalidationOwnershipError('bundle_manifest');

    cacheSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists()) return;
        const source = cacheSources[index];
        const data = snapshot.data();
        if (
            data.pId !== PRODUCT_IDS.ANSWERLATTICE
            || data.tId !== scope.tId
            || data.sId !== scope.sId
            || data.source !== source
            || normalizeCacheVersion(data.version) === undefined
        ) throw new AnswerlatticeClientInvalidationOwnershipError('cache_version');
    });

    return {
        cacheVersionRefs,
        manifestExists: manifestSnapshot.exists(),
        manifestRef,
        sourceVersionsExists: sourceVersionsSnapshot.exists(),
        sourceVersionsRef,
        sourceVersions: normalizeCompiledSourceVersions(
            sourceVersionsSnapshot.exists() ? sourceVersionsSnapshot.data() : null,
        ),
    };
};

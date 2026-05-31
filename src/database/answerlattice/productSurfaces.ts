import { DB_COLLECTIONS } from '@constant/database';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from '@firebase/firestore';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { markAnswerlatticeCompiledContextSourceChanged } from '@lib/answerlattice/compiledSourceVersionsClient';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    ANSWERLATTICE_PRODUCT_SURFACE_LIMIT,
    getContextContentSummaryDocId,
    normalizeSurfaceKey,
    parseProductSurfaceSaveInput,
} from '@lib/answerlattice/productSurfaceContent';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { AnswerlatticeProductSurface, AnswerlatticeSurfaceContentSummary } from '@type/answerlattice';

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES;
const SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, COLLECTION, docId);
const getSummaryDocRef = (tId: number, sId: number) =>
    doc(answerlatticeFirebaseClient, SUMMARY_COLLECTION, getContextContentSummaryDocId(tId, sId));

type ProductSurfaceScopeInput = {
    tId?: number;
    sId?: number;
};

const requireScope = async (scopeOverride?: ProductSurfaceScopeInput) => {
    const overrideTId = Number(scopeOverride?.tId);
    const overrideSId = Number(scopeOverride?.sId);
    if (Number.isFinite(overrideTId) && Number.isFinite(overrideSId) && overrideTId > 0 && overrideSId > 0) {
        return { tId: overrideTId, sId: overrideSId };
    }

    const session = await getActiveSession();
    const tId = Number(session?.tId);
    const sId = Number(session?.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        throw new Error('Answerlattice workspace is not available.');
    }
    return { tId, sId };
};

const buildProductSurfaceDocId = (tId: number, sId: number, key: string) =>
    `${tId}_${sId}_${normalizeSurfaceKey(key)}`;

export const getProductSurfacesForSession = async (scopeOverride?: ProductSurfaceScopeInput) => {
    const loadSurfaces = async () => {
        const scope = await requireScope(scopeOverride);
        const q = query(
            getCollectionRef(),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            limit(ANSWERLATTICE_PRODUCT_SURFACE_LIMIT),
        );
        const snapshot = await getDocs(q);
        const surfaces = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as AnswerlatticeProductSurface));
        return surfaces.sort((a, b) => {
            if (a.active !== b.active) return a.active ? -1 : 1;
            return Number(b.priority || 0) - Number(a.priority || 0) || a.label.localeCompare(b.label);
        });
    };

    return scopeOverride
        ? await apiCallComposer(loadSurfaces, scopeOverride, 'getProductSurfacesForSession')
        : await apiCallComposer(loadSurfaces, 'getProductSurfacesForSession');
};

export const saveProductSurface = async (input: unknown) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const parsed = parseProductSurfaceSaveInput(input, scope);
            const docId = parsed.id || buildProductSurfaceDocId(scope.tId, scope.sId, parsed.key);
            const composedData = await answerlatticeRequestBodyComposer(parsed);
            await setDoc(getDocRef(docId), composedData, { merge: true });
            await markAnswerlatticeCompiledContextSourceChanged('surfaces', scope.tId, scope.sId, {
                reason: 'product_surface_save',
                sourceId: docId,
                sourceType: COLLECTION,
            });
            return { ...composedData, id: docId } as AnswerlatticeProductSurface;
        },
        input,
        'saveProductSurface',
    );
};

export const archiveProductSurface = async (surface: Pick<AnswerlatticeProductSurface, 'id' | 'key'>) => {
    return await apiCallComposer(
        async () => {
            if (!surface.id) throw new Error('Surface ID is required.');
            const composedData = await answerlatticeRequestBodyComposer({ active: false });
            await setDoc(getDocRef(surface.id), composedData, { merge: true });
            const scope = await requireScope();
            await markAnswerlatticeCompiledContextSourceChanged('surfaces', scope.tId, scope.sId, {
                reason: 'product_surface_archive',
                sourceId: surface.id,
                sourceType: COLLECTION,
            });
            return { id: surface.id, ...composedData };
        },
        surface,
        'archiveProductSurface',
    );
};

export const getProductSurfaceById = async (surfaceId: string) => {
    return await apiCallComposer(
        async () => {
            const snap = await getDoc(getDocRef(surfaceId));
            return snap.exists() ? ({ ...snap.data(), id: snap.id } as AnswerlatticeProductSurface) : null;
        },
        surfaceId,
        'getProductSurfaceById',
    );
};

export const getProductSurfaceContentSummaryForSession = async () => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const snap = await getDoc(getSummaryDocRef(scope.tId, scope.sId));
            return snap.exists() ? ({ ...snap.data(), id: snap.id } as AnswerlatticeSurfaceContentSummary) : null;
        },
        'getProductSurfaceContentSummaryForSession',
    );
};

export const rebuildProductSurfaceContentSummary = async () => {
    return await apiCallComposer(
        async () => {
            const res = await fetch('/api/answerlattice/product-surfaces/rebuild-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'manual' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to rebuild product surface summary.');
            }
            return data.summary as AnswerlatticeSurfaceContentSummary;
        },
        'rebuildProductSurfaceContentSummary',
    );
};

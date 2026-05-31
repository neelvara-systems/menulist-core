import { DB_COLLECTIONS } from '@constant/database';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from '@firebase/firestore';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { markCanonicaCompiledContextSourceChanged } from '@lib/canonica/compiledSourceVersionsClient';
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import {
    CANONICA_PRODUCT_SURFACE_LIMIT,
    getContextContentSummaryDocId,
    normalizeSurfaceKey,
    parseProductSurfaceSaveInput,
} from '@lib/canonica/productSurfaceContent';
import getActiveSession from '@lib/auth/getActiveSession';
import { canonicaFirebaseClient } from '@lib/firebase/canonicaFirebaseClient';
import type { CanonicaProductSurface, CanonicaSurfaceContentSummary } from '@type/canonica';

const COLLECTION = DB_COLLECTIONS.CANONICA_PRODUCT_SURFACES;
const SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(canonicaFirebaseClient, COLLECTION, docId);
const getSummaryDocRef = (tId: number, sId: number) =>
    doc(canonicaFirebaseClient, SUMMARY_COLLECTION, getContextContentSummaryDocId(tId, sId));

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
        throw new Error('Canonica workspace is not available.');
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
            limit(CANONICA_PRODUCT_SURFACE_LIMIT),
        );
        const snapshot = await getDocs(q);
        const surfaces = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CanonicaProductSurface));
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
            const composedData = await canonicaRequestBodyComposer(parsed);
            await setDoc(getDocRef(docId), composedData, { merge: true });
            await markCanonicaCompiledContextSourceChanged('surfaces', scope.tId, scope.sId, {
                reason: 'product_surface_save',
                sourceId: docId,
                sourceType: COLLECTION,
            });
            return { ...composedData, id: docId } as CanonicaProductSurface;
        },
        input,
        'saveProductSurface',
    );
};

export const archiveProductSurface = async (surface: Pick<CanonicaProductSurface, 'id' | 'key'>) => {
    return await apiCallComposer(
        async () => {
            if (!surface.id) throw new Error('Surface ID is required.');
            const composedData = await canonicaRequestBodyComposer({ active: false });
            await setDoc(getDocRef(surface.id), composedData, { merge: true });
            const scope = await requireScope();
            await markCanonicaCompiledContextSourceChanged('surfaces', scope.tId, scope.sId, {
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
            return snap.exists() ? ({ ...snap.data(), id: snap.id } as CanonicaProductSurface) : null;
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
            return snap.exists() ? ({ ...snap.data(), id: snap.id } as CanonicaSurfaceContentSummary) : null;
        },
        'getProductSurfaceContentSummaryForSession',
    );
};

export const rebuildProductSurfaceContentSummary = async () => {
    return await apiCallComposer(
        async () => {
            const res = await fetch('/api/canonica/product-surfaces/rebuild-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'manual' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to rebuild product surface summary.');
            }
            return data.summary as CanonicaSurfaceContentSummary;
        },
        'rebuildProductSurfaceContentSummary',
    );
};

import { DB_COLLECTIONS } from '@constant/database';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from '@firebase/firestore';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { markAnswerlatticeCompiledContextSourceChanged } from '@lib/answerlattice/compiledSourceVersionsClient';
import { logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    ANSWERLATTICE_PRODUCT_SURFACE_LIMIT,
    getContextContentSummaryDocId,
    normalizeSurfaceKey,
    parseProductSurfaceSaveInput,
} from '@lib/answerlattice/productSurfaceContent';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type { AnswerlatticeProductSurface, AnswerlatticeSurfaceContentSummary } from '@type/answerlattice';

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES;
const SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;
const ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_FAILED = 'Failed to rebuild product surface summary.';
const PRODUCT_SURFACE_SUMMARY_REBUILD_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_REQUEST_POLICY: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, COLLECTION, docId);
const getSummaryDocRef = (tId: number, sId: number) =>
    doc(answerlatticeFirebaseClient, SUMMARY_COLLECTION, getContextContentSummaryDocId(tId, sId));

type ProductSurfaceScopeInput = {
    tId?: number;
    sId?: number;
};

type ProductSurfaceSummaryRefreshContext = Record<string, boolean | number | string | null | undefined>;

export type AnswerlatticeProductSurfaceWriteResult = AnswerlatticeProductSurface & {
    success: true;
    operation: 'create' | 'update';
    sourceChanged: true;
};

export type AnswerlatticeProductSurfaceArchiveResult = Partial<AnswerlatticeProductSurface> & {
    success: true;
    id: string;
    operation: 'archive';
    active: false;
    sourceChanged: true;
};

type ProductSurfaceSummaryRebuildResponse = {
    summary: AnswerlatticeSurfaceContentSummary;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isSurfaceContentSummary = (value: unknown): value is AnswerlatticeSurfaceContentSummary => (
    isRecord(value)
    && typeof value.tId === 'number'
    && typeof value.sId === 'number'
    && typeof value.surfaceCount === 'number'
    && typeof value.articleCount === 'number'
    && typeof value.changelogCount === 'number'
    && typeof value.ticketCount === 'number'
    && isRecord(value.surfaces)
);

export function assertAnswerlatticeProductSurfaceWriteSucceeded(
    result: unknown,
    expectedSurfaceId?: string | null,
    rejectionCode = 'answerlattice_product_surface_write_rejected',
): asserts result is AnswerlatticeProductSurfaceWriteResult {
    if (
        !isRecord(result)
        || result.success !== true
        || result.sourceChanged !== true
        || typeof result.id !== 'string'
        || result.id.length === 0
        || (expectedSurfaceId && result.id !== expectedSurfaceId)
        || (result.operation !== 'create' && result.operation !== 'update')
    ) {
        throw new Error(rejectionCode);
    }
}

export function assertAnswerlatticeProductSurfaceArchiveSucceeded(
    result: unknown,
    expectedSurfaceId: string,
    rejectionCode = 'answerlattice_product_surface_archive_rejected',
): asserts result is AnswerlatticeProductSurfaceArchiveResult {
    if (
        !isRecord(result)
        || result.success !== true
        || result.sourceChanged !== true
        || result.id !== expectedSurfaceId
        || result.operation !== 'archive'
        || result.active !== false
    ) {
        throw new Error(rejectionCode);
    }
}

const getSummaryRebuildResponseContext = (response: Response) => ({
    responseOk: response.ok,
    responseStatus: response.status,
});

const readProductSurfaceSummaryRebuildResponse = async (
    response: Response,
): Promise<AnswerlatticeSurfaceContentSummary> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            PRODUCT_SURFACE_SUMMARY_REBUILD_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_product_surface_summary_rebuild_response_parse_failed',
            error,
            getSummaryRebuildResponseContext(response),
        );
        throw new Error(ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_FAILED);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_product_surface_summary_rebuild_response_rejected',
            undefined,
            getSummaryRebuildResponseContext(response),
        );
        throw new Error(ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_FAILED);
    }

    if (!isRecord(payload) || !isSurfaceContentSummary(payload.summary)) {
        logAnswerlatticeFailure(
            'answerlattice_product_surface_summary_rebuild_response_invalid',
            undefined,
            getSummaryRebuildResponseContext(response),
        );
        throw new Error(ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_FAILED);
    }

    return (payload as ProductSurfaceSummaryRebuildResponse).summary;
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
            return {
                ...composedData,
                id: docId,
                success: true,
                operation: parsed.id ? 'update' : 'create',
                sourceChanged: true,
            } satisfies AnswerlatticeProductSurfaceWriteResult;
        },
        input,
        'saveProductSurface',
    );
};

export const archiveProductSurface = async (surface: Pick<AnswerlatticeProductSurface, 'id' | 'key'>) => {
    return await apiCallComposer(
        async () => {
            if (!surface.id) throw new Error('Surface ID is required.');
            const scope = await requireScope();
            const composedData = await answerlatticeRequestBodyComposer({ active: false });
            await setDoc(getDocRef(surface.id), composedData, { merge: true });
            await markAnswerlatticeCompiledContextSourceChanged('surfaces', scope.tId, scope.sId, {
                reason: 'product_surface_archive',
                sourceId: surface.id,
                sourceType: COLLECTION,
            });
            return {
                id: surface.id,
                ...composedData,
                success: true,
                operation: 'archive',
                active: false,
                sourceChanged: true,
            } satisfies AnswerlatticeProductSurfaceArchiveResult;
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
                ...ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'manual' }),
            });
            return await readProductSurfaceSummaryRebuildResponse(res);
        },
        'rebuildProductSurfaceContentSummary',
    );
};

export const rebuildProductSurfaceContentSummaryWithDiagnostics = async (params: {
    failureCode: string;
    context?: ProductSurfaceSummaryRefreshContext;
}) => {
    try {
        await rebuildProductSurfaceContentSummary();
        return true;
    } catch (error) {
        logAnswerlatticeFailure(params.failureCode, error, params.context || {});
        return false;
    }
};

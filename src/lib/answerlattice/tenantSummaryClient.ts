import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const ANSWERLATTICE_TENANT_SUMMARY_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const ANSWERLATTICE_TENANT_SUMMARY_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};
const ANSWERLATTICE_TENANT_SUMMARY_SYNC_FAILED = 'Answerlattice tenant summary sync failed';

type AnswerlatticeTenantSummarySource = 'entity_created' | 'candidate_promoted';

type AnswerlatticeTenantSummarySyncResponse = {
    success: true;
    skipped?: boolean;
};

export const normalizeAnswerlatticeTenantSummaryPositiveId = (
    value: number | string,
): number | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? value : null;
    }
    if (!/^[1-9]\d*$/.test(value)) return null;
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && String(numeric) === value ? numeric : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isTenantSummarySyncResponse = (value: unknown): value is AnswerlatticeTenantSummarySyncResponse => (
    isRecord(value)
    && value.success === true
    && (value.skipped === undefined || typeof value.skipped === 'boolean')
);

const getTenantSummaryResponseLogContext = (
    response: Response,
    tId: number,
    sId: number,
    source: AnswerlatticeTenantSummarySource,
) => ({
    ...getBoundedAnswerlatticeStringContext('tenantId', tId),
    ...getBoundedAnswerlatticeStringContext('storeId', sId),
    ...getBoundedAnswerlatticeStringContext('source', source),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readTenantSummarySyncResponse = async (
    response: Response,
    tId: number,
    sId: number,
    source: AnswerlatticeTenantSummarySource,
): Promise<AnswerlatticeTenantSummarySyncResponse> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_TENANT_SUMMARY_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_tenant_summary_client_response_parse_failed',
            error,
            getTenantSummaryResponseLogContext(response, tId, sId, source),
        );
        throw new Error(ANSWERLATTICE_TENANT_SUMMARY_SYNC_FAILED);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_tenant_summary_client_response_rejected',
            undefined,
            getTenantSummaryResponseLogContext(response, tId, sId, source),
        );
        throw new Error(ANSWERLATTICE_TENANT_SUMMARY_SYNC_FAILED);
    }

    if (!isTenantSummarySyncResponse(payload)) {
        logAnswerlatticeFailure(
            'answerlattice_tenant_summary_client_response_invalid',
            undefined,
            getTenantSummaryResponseLogContext(response, tId, sId, source),
        );
        throw new Error(ANSWERLATTICE_TENANT_SUMMARY_SYNC_FAILED);
    }

    return payload;
};

export async function markAnswerlatticeTenantHasEntities(
    tId: number | string,
    sId: number | string,
    source: AnswerlatticeTenantSummarySource = 'entity_created',
): Promise<void> {
    if (typeof window === 'undefined') return;
    const tenantId = normalizeAnswerlatticeTenantSummaryPositiveId(tId);
    const storeId = normalizeAnswerlatticeTenantSummaryPositiveId(sId);
    if (!tenantId || !storeId) return;

    const response = await fetch('/api/answerlattice/tenant-summary', {
        ...ANSWERLATTICE_TENANT_SUMMARY_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tId: tenantId,
            sId: storeId,
            hasEntities: true,
            source,
        }),
    });

    await readTenantSummarySyncResponse(response, tenantId, storeId, source);
}

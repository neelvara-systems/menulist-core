import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import {
    AiOperationHistoryRow,
    normalizeAiOperationHistoryPage,
} from '@lib/ai/operationHistoryClientContract';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import dayjs from 'dayjs';

export interface AnswerlatticeAiOperationPaginationOptions {
    action?: string | null;
    dateRange?: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
    lastVisibleDoc?: { id?: string } | null;
    pageNumber: number;
    pageSize: number;
}

export interface AnswerlatticeAiOperationsPaginatedResponse {
    data: AiOperationHistoryRow[];
    hasMore: boolean;
    lastVisibleDoc: { id: string } | null;
}

const EMPTY_PAGINATED_RESPONSE: AnswerlatticeAiOperationsPaginatedResponse = {
    data: [],
    hasMore: false,
    lastVisibleDoc: null,
};
const ANSWERLATTICE_AI_OPERATIONS_RESPONSE_JSON_MAX_BYTES = 512 * 1024;
const ANSWERLATTICE_AI_OPERATIONS_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};
const ANSWERLATTICE_AI_OPERATIONS_RESPONSE_PARSE_FAILED = 'answerlattice_ai_operations_client_response_parse_failed';
const ANSWERLATTICE_AI_OPERATIONS_RESPONSE_REJECTED = 'answerlattice_ai_operations_client_response_rejected';
const ANSWERLATTICE_AI_OPERATIONS_RESPONSE_INVALID = 'answerlattice_ai_operations_client_response_invalid';

const getAnswerlatticeAiOperationsResponseLogContext = (
    response: Response,
    options: AnswerlatticeAiOperationPaginationOptions,
) => ({
    ...getBoundedRuntimeStringContext('action', options.action),
    ...getBoundedRuntimeStringContext('cursorId', options.lastVisibleDoc?.id),
    hasDateRange: Boolean(options.dateRange?.[0] || options.dateRange?.[1]),
    pageNumber: options.pageNumber,
    pageSize: options.pageSize,
    product: 'answerlattice',
    responseOk: response.ok,
    responseStatus: response.status,
});

const readAnswerlatticeAiOperationsResponse = async (
    response: Response,
    options: AnswerlatticeAiOperationPaginationOptions,
): Promise<AnswerlatticeAiOperationsPaginatedResponse | null> => {
    const context = getAnswerlatticeAiOperationsResponseLogContext(response, options);

    if (!response.ok) {
        logRuntimeFailure(ANSWERLATTICE_AI_OPERATIONS_RESPONSE_REJECTED, undefined, context);
        return null;
    }

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_AI_OPERATIONS_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(ANSWERLATTICE_AI_OPERATIONS_RESPONSE_PARSE_FAILED, error, context);
        return null;
    }

    const normalized = normalizeAiOperationHistoryPage(payload, { requireManualContinuationField: false });
    if (!normalized) {
        logRuntimeFailure(ANSWERLATTICE_AI_OPERATIONS_RESPONSE_INVALID, undefined, context);
        return null;
    }

    return normalized;
};

const normalizePaginatedResponse = (response: unknown): AnswerlatticeAiOperationsPaginatedResponse => {
    const normalized = normalizeAiOperationHistoryPage(response, { requireManualContinuationField: false });
    if (normalized) return normalized;

    return EMPTY_PAGINATED_RESPONSE;
};

const buildOperationsQuery = (options: AnswerlatticeAiOperationPaginationOptions): string => {
    const params = new URLSearchParams();
    params.set('pageSize', String(options.pageSize));

    if (options.action) {
        params.set('action', options.action);
    }

    if (options.lastVisibleDoc?.id) {
        params.set('cursorId', String(options.lastVisibleDoc.id));
    }

    const [start, end] = options.dateRange || [];
    if (start) {
        params.set('startDate', start.startOf('day').toISOString());
    }
    if (end) {
        params.set('endDate', end.endOf('day').toISOString());
    }

    return params.toString();
};

export const getPaginatedAnswerlatticeAiOperations = async (
    options: AnswerlatticeAiOperationPaginationOptions,
): Promise<AnswerlatticeAiOperationsPaginatedResponse> => {
    const response = await apiCallComposer(
        async () => {
            const query = buildOperationsQuery(options);
            const result = await fetch(`/api/answerlattice/ai-operations${query ? `?${query}` : ''}`, {
                ...ANSWERLATTICE_AI_OPERATIONS_REQUEST_POLICY,
                method: 'GET',
            });

            const payload = await readAnswerlatticeAiOperationsResponse(result, options);
            if (!payload) {
                throw new Error('Failed to load Answerlattice AI operations');
            }

            return payload;
        },
        options,
        'getPaginatedAnswerlatticeAiOperations',
    );

    return normalizePaginatedResponse(response);
};

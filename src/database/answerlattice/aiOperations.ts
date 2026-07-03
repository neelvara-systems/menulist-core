import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
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
    data: any[];
    hasMore: boolean;
    lastVisibleDoc: { id?: string } | null;
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

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isValidCursor = (value: unknown): value is { id?: string } | null => (
    value === null
    || value === undefined
    || (isRecord(value) && (value.id === undefined || typeof value.id === 'string'))
);

const isPaginatedResponse = (response: unknown): response is AnswerlatticeAiOperationsPaginatedResponse => (
    isRecord(response)
    && Array.isArray(response.data)
    && typeof response.hasMore === 'boolean'
    && isValidCursor(response.lastVisibleDoc)
);

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

    if (!isPaginatedResponse(payload)) {
        logRuntimeFailure(ANSWERLATTICE_AI_OPERATIONS_RESPONSE_INVALID, undefined, context);
        return null;
    }

    return payload;
};

const normalizePaginatedResponse = (response: unknown): AnswerlatticeAiOperationsPaginatedResponse => {
    if (
        response
        && typeof response === 'object'
        && Array.isArray((response as AnswerlatticeAiOperationsPaginatedResponse).data)
    ) {
        return {
            data: (response as AnswerlatticeAiOperationsPaginatedResponse).data,
            hasMore: Boolean((response as AnswerlatticeAiOperationsPaginatedResponse).hasMore),
            lastVisibleDoc: (response as AnswerlatticeAiOperationsPaginatedResponse).lastVisibleDoc || null,
        };
    }

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

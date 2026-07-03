import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import dayjs from "dayjs";

interface PaginationOptions {
    pageSize: number;
    pageNumber: number;
    lastVisibleDoc?: { id?: string } | null;
    dateRange?: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
    action?: string | null;
}

interface PaginatedResponse {
    data: any[];
    lastVisibleDoc: { id?: string } | null;
    hasMore: boolean;
}

const EMPTY_PAGINATED_RESPONSE: PaginatedResponse = {
    data: [],
    lastVisibleDoc: null,
    hasMore: false,
};
const AI_OPERATIONS_RESPONSE_JSON_MAX_BYTES = 512 * 1024;
const AI_OPERATIONS_RESPONSE_PARSE_FAILED = 'ai_operations_client_response_parse_failed';
const AI_OPERATIONS_RESPONSE_REJECTED = 'ai_operations_client_response_rejected';
const AI_OPERATIONS_RESPONSE_INVALID = 'ai_operations_client_response_invalid';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isValidCursor = (value: unknown): value is { id?: string } | null => (
    value === null
    || value === undefined
    || (isRecord(value) && (value.id === undefined || typeof value.id === 'string'))
);

const isPaginatedResponse = (response: unknown): response is PaginatedResponse => (
    isRecord(response)
    && Array.isArray(response.data)
    && typeof response.hasMore === 'boolean'
    && isValidCursor(response.lastVisibleDoc)
);

const getAiOperationsResponseLogContext = (response: Response, options: PaginationOptions) => ({
    ...getBoundedRuntimeStringContext('action', options.action),
    ...getBoundedRuntimeStringContext('cursorId', options.lastVisibleDoc?.id),
    hasDateRange: Boolean(options.dateRange?.[0] || options.dateRange?.[1]),
    pageNumber: options.pageNumber,
    pageSize: options.pageSize,
    product: 'menulist',
    responseOk: response.ok,
    responseStatus: response.status,
});

const readAiOperationsResponse = async (
    response: Response,
    options: PaginationOptions,
): Promise<PaginatedResponse | null> => {
    const context = getAiOperationsResponseLogContext(response, options);

    if (!response.ok) {
        logRuntimeFailure(AI_OPERATIONS_RESPONSE_REJECTED, undefined, context);
        return null;
    }

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            AI_OPERATIONS_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(AI_OPERATIONS_RESPONSE_PARSE_FAILED, error, context);
        return null;
    }

    if (!isPaginatedResponse(payload)) {
        logRuntimeFailure(AI_OPERATIONS_RESPONSE_INVALID, undefined, context);
        return null;
    }

    return payload;
};

const normalizePaginatedResponse = (response: unknown): PaginatedResponse => {
    if (
        response
        && typeof response === 'object'
        && Array.isArray((response as PaginatedResponse).data)
    ) {
        return {
            data: (response as PaginatedResponse).data,
            lastVisibleDoc: (response as PaginatedResponse).lastVisibleDoc || null,
            hasMore: Boolean((response as PaginatedResponse).hasMore),
        };
    }

    return EMPTY_PAGINATED_RESPONSE;
};

const buildOperationsQuery = (options: PaginationOptions): string => {
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

export const getPaginatedAiOperations = async (options: PaginationOptions): Promise<PaginatedResponse> => {
    const response = await apiCallComposer(
        async () => {
            const query = buildOperationsQuery(options);
            const result = await fetch(`/api/ai-operations${query ? `?${query}` : ''}`, {
                method: 'GET',
            });

            const payload = await readAiOperationsResponse(result, options);
            if (!payload) {
                throw new Error('Failed to load AI operations');
            }

            return payload;
        },
        options,
        "getPaginatedAiOperations"
    );

    return normalizePaginatedResponse(response);
};

export const getAllAiOperations = async () => {
    const response = await getPaginatedAiOperations({
        pageNumber: 1,
        pageSize: 100,
    });
    return response.data;
};

export const getAiOperationsByStoreId = async (_storeId: string | number) => {
    const response = await getPaginatedAiOperations({
        pageNumber: 1,
        pageSize: 100,
    });
    return response.data;
};

export const getAiOperationById = async (id: string | number) => {
    const operations = await getAllAiOperations();
    return operations.find((operation) => String(operation.id) === String(id)) || null;
};

export const addAiOperation = async (_data: any) => {
    throw new Error("Client AI operation writes are disabled. Use src/lib/ai/accounting.finalizeAiOperationAccounting from server routes.");
}

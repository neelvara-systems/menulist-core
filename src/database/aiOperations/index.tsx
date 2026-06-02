import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
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

            if (!result.ok) {
                throw new Error('Failed to load AI operations');
            }

            return result.json();
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

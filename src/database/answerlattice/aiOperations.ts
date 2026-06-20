import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
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
                method: 'GET',
            });

            if (!result.ok) {
                throw new Error('Failed to load Answerlattice AI operations');
            }

            return result.json();
        },
        options,
        'getPaginatedAnswerlatticeAiOperations',
    );

    return normalizePaginatedResponse(response);
};

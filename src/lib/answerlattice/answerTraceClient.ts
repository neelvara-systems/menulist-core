import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    ANSWERLATTICE_ANSWER_TRACE_RESPONSE_MAX_BYTES,
    AnswerlatticeAnswerTraceResponseSchema,
    type AnswerlatticeAnswerTraceResponse,
} from './answerTraceContracts';

const ANSWER_TRACE_TIMEOUT_MS = 15_000;

const loadAnswerTraceResponse = async (searchHistoryId?: string): Promise<AnswerlatticeAnswerTraceResponse> => {
    const normalizedId = searchHistoryId
        ? normalizeAnswerlatticeSearchHistoryId(searchHistoryId)
        : null;
    if (searchHistoryId && !normalizedId) throw new Error('Invalid answer trace ID.');

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), ANSWER_TRACE_TIMEOUT_MS);
    try {
        const response = await fetch(
            `/api/answerlattice/answer-traces${normalizedId ? `?searchHistoryId=${encodeURIComponent(normalizedId)}` : ''}`,
            {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                signal: controller.signal,
            },
        );
        const payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_ANSWER_TRACE_RESPONSE_MAX_BYTES,
        )
            .catch((): null => null);
        if (!response.ok) {
            const message = payload && typeof payload === 'object' && !Array.isArray(payload)
                && typeof (payload as Record<string, unknown>).error === 'string'
                ? String((payload as Record<string, unknown>).error).slice(0, 240)
                : 'Could not load answer trace.';
            throw new Error(message);
        }
        const parsed = AnswerlatticeAnswerTraceResponseSchema.safeParse(payload);
        if (!parsed.success) throw new Error('Answer trace returned an invalid response.');
        return parsed.data;
    } finally {
        globalThis.clearTimeout(timeout);
    }
};

export const loadRecentAnswerlatticeAnswerTraces = () => loadAnswerTraceResponse();

export const loadAnswerlatticeAnswerTrace = async (searchHistoryId: string) => {
    const response = await loadAnswerTraceResponse(searchHistoryId);
    return response.traces[0] || null;
};

/**
 * AI Capacity Error
 *
 * Thrown when a 402 response is received from AI API routes,
 * indicating the store's AI capacity is exhausted or the system
 * is in maintenance mode.
 *
 * UI components catch this specific error type to show the
 * Enhancement Pack purchase CTA instead of a generic error.
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 */
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { logAiServiceFailure } from '@services/ai/aiServiceDiagnostics';

const AI_CAPACITY_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

type AiCapacityResponse = {
    code?: unknown;
};

export class AICapacityError extends Error {
    public code: string;

    constructor(message: string, code: string) {
        super(message);
        Object.setPrototypeOf(this, AICapacityError.prototype);
        this.name = "AICapacityError";
        this.code = code;
    }
}

export function isAICapacityError(error: unknown): error is AICapacityError {
    if (error instanceof AICapacityError) return true;
    if (!error || typeof error !== 'object') return false;

    try {
        const descriptor = Object.getOwnPropertyDescriptor(error, 'name');
        return descriptor?.value === 'AICapacityError';
    } catch {
        return false;
    }
}

/**
 * Check a fetch response for 402 capacity errors.
 * Call this before checking response.ok in AI service functions.
 *
 * @throws {AICapacityError} if the response is a 402 capacity error
 */
export async function checkCapacityResponse(response: Response): Promise<void> {
    if (response.status === 402) {
        let parsedData: AiCapacityResponse | null = null;
        try {
            parsedData = await readJsonResponseWithLimit<AiCapacityResponse>(
                response,
                AI_CAPACITY_RESPONSE_JSON_MAX_BYTES,
            );
        } catch (error) {
            logAiServiceFailure('ai_capacity_response_parse_failed', error, {
                maxBytes: AI_CAPACITY_RESPONSE_JSON_MAX_BYTES,
                responseStatus: response.status,
            });
        }

        const data = parsedData || {};
        const code = typeof data.code === 'string' && data.code.length > 0
            ? data.code.slice(0, 64)
            : "exhausted";
        throw new AICapacityError(
            "Additional AI enhancements needed for your menu.",
            code,
        );
    }
}

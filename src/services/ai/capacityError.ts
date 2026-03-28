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
export class AICapacityError extends Error {
    public code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = "AICapacityError";
        this.code = code;
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
        const data = await response.json().catch(() => ({}));
        throw new AICapacityError(
            data.error || "Additional AI enhancements needed for your menu.",
            data.code || "exhausted",
        );
    }
}

/**
 * Stable Gemini runtime contract shared by the Next.js server and Cloud Functions.
 *
 * Keep this file framework-free and byte-identical in:
 * - src/data/shared/geminiRuntime.ts
 * - functions/src/sharedData/geminiRuntime.ts
 * - functions-answerlattice/src/sharedData/geminiRuntime.ts
 */

export const GEMINI_STABLE_MODELS = {
    TEXT_HIGH_THROUGHPUT: 'gemini-3.5-flash-lite',
    TEXT_COMPLEX: 'gemini-3.6-flash',
    TEXT_BALANCED: 'gemini-3.5-flash',
    IMAGE_HIGH_THROUGHPUT: 'gemini-3.1-flash-lite-image',
    IMAGE_QUALITY: 'gemini-3.1-flash-image',
} as const;

export const GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES = {
    UNKNOWN_MODEL: 'GEMINI_REQUEST_UNKNOWN_MODEL',
    UNSTABLE_MODEL: 'GEMINI_REQUEST_UNSTABLE_MODEL',
    PREFILLED_MODEL_TURN: 'GEMINI_REQUEST_PREFILLED_MODEL_TURN',
    THINKING_BUDGET: 'GEMINI_REQUEST_THINKING_BUDGET_UNSUPPORTED',
    THINKING_LEVEL: 'GEMINI_REQUEST_THINKING_LEVEL_INVALID',
    FUNCTION_RESPONSE_IDENTITY: 'GEMINI_REQUEST_FUNCTION_RESPONSE_IDENTITY_MISSING',
    FUNCTION_RESPONSE_PAYLOAD: 'GEMINI_REQUEST_FUNCTION_RESPONSE_PAYLOAD_INVALID',
} as const;

export type GeminiRequestCompatibilityErrorCode =
    typeof GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES[keyof typeof GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES];

export class GeminiRequestCompatibilityError extends Error {
    readonly code: GeminiRequestCompatibilityErrorCode;

    constructor(code: GeminiRequestCompatibilityErrorCode) {
        super(code);
        this.name = 'GeminiRequestCompatibilityError';
        this.code = code;
    }
}

interface GeminiModelContract {
    removeDeprecatedSampling: boolean;
    removeCandidateCount: boolean;
    rejectPrefilledModelTurn: boolean;
    rejectThinkingBudget: boolean;
    requireFunctionResponseIdentity: boolean;
}

const STRICT_LATEST_MODEL_CONTRACT: GeminiModelContract = {
    removeDeprecatedSampling: true,
    removeCandidateCount: true,
    rejectPrefilledModelTurn: true,
    rejectThinkingBudget: true,
    requireFunctionResponseIdentity: true,
};

const GEMINI_3_MODEL_CONTRACT: GeminiModelContract = {
    removeDeprecatedSampling: true,
    removeCandidateCount: true,
    rejectPrefilledModelTurn: false,
    rejectThinkingBudget: true,
    requireFunctionResponseIdentity: true,
};

export const GEMINI_MODEL_CONTRACTS: Readonly<Record<string, GeminiModelContract>> = {
    [GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT]: STRICT_LATEST_MODEL_CONTRACT,
    [GEMINI_STABLE_MODELS.TEXT_COMPLEX]: STRICT_LATEST_MODEL_CONTRACT,
    [GEMINI_STABLE_MODELS.TEXT_BALANCED]: GEMINI_3_MODEL_CONTRACT,
    [GEMINI_STABLE_MODELS.IMAGE_HIGH_THROUGHPUT]: GEMINI_3_MODEL_CONTRACT,
    [GEMINI_STABLE_MODELS.IMAGE_QUALITY]: GEMINI_3_MODEL_CONTRACT,
};

export function isSupportedGeminiModel(model: unknown): model is string {
    return typeof model === 'string' && Boolean(GEMINI_MODEL_CONTRACTS[model.trim()]);
}

const ALLOWED_THINKING_LEVELS = new Set([
    'MINIMAL',
    'LOW',
    'MEDIUM',
    'HIGH',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNonEmptyPart(part: unknown): boolean {
    if (typeof part === 'string') return part.trim().length > 0;
    if (!isRecord(part)) return false;
    if (typeof part.text === 'string' && part.text.trim().length > 0) return true;

    return [
        'codeExecutionResult',
        'executableCode',
        'fileData',
        'functionCall',
        'functionResponse',
        'inlineData',
    ].some((key) => part[key] !== undefined && part[key] !== null);
}

function isNonEmptyContent(content: unknown): boolean {
    if (typeof content === 'string') return content.trim().length > 0;
    if (Array.isArray(content)) return content.some(hasNonEmptyPart);
    if (!isRecord(content)) return false;
    if (Array.isArray(content.parts)) return content.parts.some(hasNonEmptyPart);
    return hasNonEmptyPart(content);
}

function getLastNonEmptyContent(contents: unknown): Record<string, unknown> | undefined {
    if (!Array.isArray(contents)) return undefined;

    for (let index = contents.length - 1; index >= 0; index -= 1) {
        const content = contents[index];
        if (!isNonEmptyContent(content)) continue;
        return isRecord(content) ? content : undefined;
    }

    return undefined;
}

function validateThinkingConfig(config: Record<string, unknown>): void {
    if (!isRecord(config.thinkingConfig)) return;

    const thinkingConfig = config.thinkingConfig;
    if (
        thinkingConfig.thinkingBudget !== undefined
        || thinkingConfig.thinking_budget !== undefined
    ) {
        throw new GeminiRequestCompatibilityError(
            GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.THINKING_BUDGET,
        );
    }

    const thinkingLevel = thinkingConfig.thinkingLevel ?? thinkingConfig.thinking_level;
    if (
        thinkingLevel !== undefined
        && (
            typeof thinkingLevel !== 'string'
            || !ALLOWED_THINKING_LEVELS.has(thinkingLevel.toUpperCase())
        )
    ) {
        throw new GeminiRequestCompatibilityError(
            GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.THINKING_LEVEL,
        );
    }
}

function validateFunctionResponses(contents: unknown): void {
    if (!Array.isArray(contents)) return;

    for (const content of contents) {
        if (!isRecord(content) || !Array.isArray(content.parts)) continue;

        for (const part of content.parts) {
            if (!isRecord(part) || !isRecord(part.functionResponse)) continue;
            const functionResponse = part.functionResponse;

            if (
                typeof functionResponse.id !== 'string'
                || functionResponse.id.trim().length === 0
                || typeof functionResponse.name !== 'string'
                || functionResponse.name.trim().length === 0
            ) {
                throw new GeminiRequestCompatibilityError(
                    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.FUNCTION_RESPONSE_IDENTITY,
                );
            }

            if (!isRecord(functionResponse.response)) {
                throw new GeminiRequestCompatibilityError(
                    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.FUNCTION_RESPONSE_PAYLOAD,
                );
            }
        }
    }
}

function assertStableModelId(model: string): void {
    if (/(?:^|[-_.])(latest|preview|experimental|exp)(?:$|[-_.])/i.test(model)) {
        throw new GeminiRequestCompatibilityError(
            GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.UNSTABLE_MODEL,
        );
    }
}

/**
 * Compiles generateContent requests for the selected stable model.
 *
 * Unsupported sampling and candidate fields are removed only for models whose
 * published contract requires it. Ambiguous thinking-budget conversion and
 * incomplete tool responses fail before a billable provider request.
 */
export function compileGeminiGenerateContentRequest<T extends Record<string, unknown>>(
    request: T,
): T {
    const model = typeof request.model === 'string' ? request.model.trim() : '';
    assertStableModelId(model);

    const contract = GEMINI_MODEL_CONTRACTS[model];
    if (!contract) {
        throw new GeminiRequestCompatibilityError(
            GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.UNKNOWN_MODEL,
        );
    }

    const compiled = { ...request } as Record<string, unknown>;
    if (isRecord(request.config)) {
        const config = { ...request.config };

        if (contract.removeDeprecatedSampling) {
            delete config.temperature;
            delete config.topP;
            delete config.topK;
            delete config.top_p;
            delete config.top_k;
        }

        if (contract.removeCandidateCount) {
            delete config.candidateCount;
            delete config.candidate_count;
        }

        if (contract.rejectThinkingBudget) {
            validateThinkingConfig(config);
        }

        compiled.config = config;
    }

    if (contract.rejectPrefilledModelTurn) {
        const lastContent = getLastNonEmptyContent(request.contents);
        if (lastContent?.role === 'model') {
            throw new GeminiRequestCompatibilityError(
                GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.PREFILLED_MODEL_TURN,
            );
        }
    }

    if (contract.requireFunctionResponseIdentity) {
        validateFunctionResponses(request.contents);
    }

    return compiled as T;
}

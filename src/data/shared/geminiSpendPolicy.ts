/**
 * Gemini rolling-spend admission and pricing contract.
 *
 * Keep this file framework-free and byte-identical in:
 * - src/data/shared/geminiSpendPolicy.ts
 * - functions/src/sharedData/geminiSpendPolicy.ts
 * - functions-answerlattice/src/sharedData/geminiSpendPolicy.ts
 *
 * Pricing source: https://ai.google.dev/gemini-api/docs/pricing (August 2026)
 * Spend-limit source: https://ai.google.dev/gemini-api/docs/rate-limits
 */

export const GEMINI_SPEND_WINDOW_MINUTES = 10;
export const GEMINI_SPEND_DEFAULT_LIMIT_MICRO_USD = 8_000_000;
export const GEMINI_SPEND_WINDOW_COLLECTION = 'geminiSpendWindows';
export const GEMINI_SPEND_ADMISSION_ERROR_CODES = {
    LIMIT_REACHED: 'GEMINI_SPEND_ADMISSION_LIMIT_REACHED',
    STORE_UNAVAILABLE: 'GEMINI_SPEND_ADMISSION_STORE_UNAVAILABLE',
    CONFIG_INVALID: 'GEMINI_SPEND_ADMISSION_CONFIG_INVALID',
} as const;

const MICRO_USD_PER_USD = 1_000_000;
const TOKEN_PRICING_DIVISOR = 1_000_000;
const MINUTE_MS = 60_000;
// Eleven minute buckets conservatively cover every event in the provider's
// rolling ten-minute window despite minute-level bucket granularity.
const RETAINED_BUCKET_COUNT = GEMINI_SPEND_WINDOW_MINUTES + 1;
const DEFAULT_TEXT_OUTPUT_TOKEN_RESERVE = 8_192;
const MAX_ESTIMATED_INPUT_TOKENS = 2_000_000;
const MAX_ESTIMATED_OUTPUT_TOKENS = 65_536;
const UNKNOWN_GENERATION_RESERVE_MICRO_USD = 200_000;
const EMBEDDING_RESERVE_MICRO_USD = 2_000;
const GROUNDING_QUERY_RESERVE_MICRO_USD = 14_000;

export type GeminiSpendProduct = 'answerlattice' | 'menulist' | 'signaldesk';

export type GeminiModelPrice = {
    inputUsdPerMillionTokens: number;
    outputUsdPerMillionTokens: number;
};

export const GEMINI_STANDARD_MODEL_PRICING: Readonly<Record<string, GeminiModelPrice>> = {
    'gemini-3.6-flash': {
        inputUsdPerMillionTokens: 1.5,
        outputUsdPerMillionTokens: 7.5,
    },
    'gemini-3.5-flash': {
        inputUsdPerMillionTokens: 1.5,
        outputUsdPerMillionTokens: 9,
    },
    'gemini-3.5-flash-lite': {
        inputUsdPerMillionTokens: 0.3,
        outputUsdPerMillionTokens: 2.5,
    },
    'gemini-3.1-flash-image': {
        inputUsdPerMillionTokens: 0.5,
        outputUsdPerMillionTokens: 60,
    },
    'gemini-3.1-flash-lite-image': {
        inputUsdPerMillionTokens: 0.25,
        outputUsdPerMillionTokens: 30,
    },
};

export type GeminiSpendBucket = {
    minuteEpochMs: number;
    reservedMicroUsd: number;
    settledMicroUsd: number;
};

export type GeminiSpendWindowState = {
    buckets: GeminiSpendBucket[];
    version: 1;
    windowMinutes: typeof GEMINI_SPEND_WINDOW_MINUTES;
};

export type GeminiSpendReservation = {
    estimatedMicroUsd: number;
    minuteEpochMs: number;
    model: string;
};

export type GeminiSpendAdmissionController = {
    reserve(method: string, config: unknown): Promise<GeminiSpendReservation | null>;
    settle(reservation: GeminiSpendReservation, response?: unknown): Promise<void>;
};

type FirestoreDocumentSnapshotLike = {
    data(): unknown;
};

type FirestoreDocumentReferenceLike = unknown;

type FirestoreTransactionLike = {
    get(reference: FirestoreDocumentReferenceLike): Promise<FirestoreDocumentSnapshotLike>;
    set(reference: FirestoreDocumentReferenceLike, value: unknown): unknown;
};

type FirestoreLike = {
    collection(name: string): {
        doc(id: string): FirestoreDocumentReferenceLike;
    };
    runTransaction<T>(handler: (transaction: FirestoreTransactionLike) => Promise<T>): Promise<T>;
};

type CreateFirestoreGeminiSpendAdmissionInput = {
    getFirestore(): FirestoreLike | null;
    limitMicroUsd: number;
    product: GeminiSpendProduct;
};

export class GeminiSpendAdmissionError extends Error {
    readonly code: string;
    readonly retryAfterSeconds: number | null;

    constructor(code: string, retryAfterSeconds: number | null = null) {
        super(code);
        this.name = 'GeminiSpendAdmissionError';
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readNonNegativeSafeInteger(value: unknown): number | null {
    return typeof value === 'number'
        && Number.isSafeInteger(value)
        && value >= 0
        ? value
        : null;
}

function readPositiveFiniteNumber(value: unknown): number | null {
    const numberValue = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
            ? Number(value.trim())
            : Number.NaN;
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function getCurrentMinuteEpochMs(nowMs: number): number {
    return Math.floor(nowMs / MINUTE_MS) * MINUTE_MS;
}

function normalizeBucket(value: unknown): GeminiSpendBucket | null {
    if (!isRecord(value)) return null;
    const minuteEpochMs = readNonNegativeSafeInteger(value.minuteEpochMs);
    const reservedMicroUsd = readNonNegativeSafeInteger(value.reservedMicroUsd);
    const settledMicroUsd = readNonNegativeSafeInteger(value.settledMicroUsd);
    if (minuteEpochMs === null || reservedMicroUsd === null || settledMicroUsd === null) return null;
    if (minuteEpochMs % MINUTE_MS !== 0) return null;
    return { minuteEpochMs, reservedMicroUsd, settledMicroUsd };
}

export function normalizeGeminiSpendWindowState(value: unknown): GeminiSpendWindowState {
    const buckets = isRecord(value) && Array.isArray(value.buckets)
        ? value.buckets.map(normalizeBucket).filter((bucket): bucket is GeminiSpendBucket => Boolean(bucket))
        : [];
    const merged = new Map<number, GeminiSpendBucket>();
    for (const bucket of buckets) {
        const existing = merged.get(bucket.minuteEpochMs);
        merged.set(bucket.minuteEpochMs, existing
            ? {
                minuteEpochMs: bucket.minuteEpochMs,
                reservedMicroUsd: existing.reservedMicroUsd + bucket.reservedMicroUsd,
                settledMicroUsd: existing.settledMicroUsd + bucket.settledMicroUsd,
            }
            : bucket);
    }
    return {
        buckets: Array.from(merged.values()).sort((left, right) => left.minuteEpochMs - right.minuteEpochMs),
        version: 1,
        windowMinutes: GEMINI_SPEND_WINDOW_MINUTES,
    };
}

function pruneBuckets(state: GeminiSpendWindowState, nowMs: number): GeminiSpendBucket[] {
    const currentMinute = getCurrentMinuteEpochMs(nowMs);
    const earliestRetainedMinute = currentMinute - (RETAINED_BUCKET_COUNT - 1) * MINUTE_MS;
    return state.buckets.filter((bucket) => (
        bucket.minuteEpochMs >= earliestRetainedMinute
        && bucket.minuteEpochMs <= currentMinute
    ));
}

function getWindowTotalMicroUsd(buckets: GeminiSpendBucket[]): number {
    return buckets.reduce(
        (total, bucket) => total + bucket.reservedMicroUsd + bucket.settledMicroUsd,
        0,
    );
}

function upsertBucket(
    buckets: GeminiSpendBucket[],
    minuteEpochMs: number,
    update: (bucket: GeminiSpendBucket) => GeminiSpendBucket,
): GeminiSpendBucket[] {
    const index = buckets.findIndex((bucket) => bucket.minuteEpochMs === minuteEpochMs);
    const current = index >= 0
        ? buckets[index]
        : { minuteEpochMs, reservedMicroUsd: 0, settledMicroUsd: 0 };
    const nextBucket = update(current);
    if (index < 0) return [...buckets, nextBucket].sort((left, right) => left.minuteEpochMs - right.minuteEpochMs);
    return buckets.map((bucket, bucketIndex) => bucketIndex === index ? nextBucket : bucket);
}

export function reserveGeminiSpend(
    stateValue: unknown,
    input: {
        estimatedMicroUsd: number;
        limitMicroUsd: number;
        model: string;
        nowMs: number;
    },
): {
    allowed: boolean;
    reservation: GeminiSpendReservation | null;
    retryAfterSeconds: number | null;
    state: GeminiSpendWindowState;
    windowTotalMicroUsd: number;
} {
    const state = normalizeGeminiSpendWindowState(stateValue);
    const buckets = pruneBuckets(state, input.nowMs);
    const windowTotalMicroUsd = getWindowTotalMicroUsd(buckets);
    const estimatedMicroUsd = readNonNegativeSafeInteger(input.estimatedMicroUsd);
    const limitMicroUsd = readNonNegativeSafeInteger(input.limitMicroUsd);
    if (estimatedMicroUsd === null || estimatedMicroUsd === 0 || limitMicroUsd === null || limitMicroUsd === 0) {
        throw new GeminiSpendAdmissionError(GEMINI_SPEND_ADMISSION_ERROR_CODES.CONFIG_INVALID);
    }

    if (estimatedMicroUsd > limitMicroUsd || windowTotalMicroUsd + estimatedMicroUsd > limitMicroUsd) {
        const earliestBucket = buckets[0];
        const retryAfterMs = earliestBucket
            ? Math.max(MINUTE_MS, earliestBucket.minuteEpochMs + RETAINED_BUCKET_COUNT * MINUTE_MS - input.nowMs)
            : RETAINED_BUCKET_COUNT * MINUTE_MS;
        return {
            allowed: false,
            reservation: null,
            retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
            state: { ...state, buckets },
            windowTotalMicroUsd,
        };
    }

    const minuteEpochMs = getCurrentMinuteEpochMs(input.nowMs);
    const nextBuckets = upsertBucket(buckets, minuteEpochMs, (bucket) => ({
        ...bucket,
        reservedMicroUsd: bucket.reservedMicroUsd + estimatedMicroUsd,
    }));
    return {
        allowed: true,
        reservation: {
            estimatedMicroUsd,
            minuteEpochMs,
            model: input.model,
        },
        retryAfterSeconds: null,
        state: { ...state, buckets: nextBuckets },
        windowTotalMicroUsd: windowTotalMicroUsd + estimatedMicroUsd,
    };
}

export function settleGeminiSpend(
    stateValue: unknown,
    input: {
        actualMicroUsd: number;
        nowMs: number;
        reservation: GeminiSpendReservation;
    },
): GeminiSpendWindowState {
    const state = normalizeGeminiSpendWindowState(stateValue);
    let buckets = pruneBuckets(state, input.nowMs);
    const actualMicroUsd = readNonNegativeSafeInteger(input.actualMicroUsd);
    if (actualMicroUsd === null) {
        throw new GeminiSpendAdmissionError(GEMINI_SPEND_ADMISSION_ERROR_CODES.CONFIG_INVALID);
    }

    buckets = upsertBucket(buckets, input.reservation.minuteEpochMs, (bucket) => ({
        ...bucket,
        reservedMicroUsd: Math.max(0, bucket.reservedMicroUsd - input.reservation.estimatedMicroUsd),
    }));
    if (actualMicroUsd > 0) {
        const settlementMinute = getCurrentMinuteEpochMs(input.nowMs);
        buckets = upsertBucket(buckets, settlementMinute, (bucket) => ({
            ...bucket,
            settledMicroUsd: bucket.settledMicroUsd + actualMicroUsd,
        }));
    }

    return {
        ...state,
        buckets: buckets.filter((bucket) => bucket.reservedMicroUsd > 0 || bucket.settledMicroUsd > 0),
    };
}

function getBoundedCharacterEstimate(value: unknown, seen: Set<object>, depth = 0): number {
    if (depth > 12) return 0;
    if (typeof value === 'string') return Math.min(value.length, MAX_ESTIMATED_INPUT_TOKENS * 4);
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value).length;
    if (!value || typeof value !== 'object') return 0;
    if (seen.has(value)) return 0;
    seen.add(value);
    const entries = Array.isArray(value) ? value : Object.entries(value);
    let total = 0;
    for (const entry of entries) {
        if (total >= MAX_ESTIMATED_INPUT_TOKENS * 4) break;
        if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string') {
            total += entry[0].length + getBoundedCharacterEstimate(entry[1], seen, depth + 1);
        } else {
            total += getBoundedCharacterEstimate(entry, seen, depth + 1);
        }
    }
    return Math.min(total, MAX_ESTIMATED_INPUT_TOKENS * 4);
}

function estimateInputTokens(config: unknown): number {
    const characters = getBoundedCharacterEstimate(config, new Set<object>());
    return Math.max(1, Math.min(MAX_ESTIMATED_INPUT_TOKENS, Math.ceil(characters / 4)));
}

function readConfigRecord(config: unknown): Record<string, unknown> {
    return isRecord(config) && isRecord(config.config) ? config.config : {};
}

function getMaxOutputTokenReserve(config: unknown, model: string): number {
    const requestConfig = readConfigRecord(config);
    const configured = readPositiveFiniteNumber(requestConfig.maxOutputTokens ?? requestConfig.max_output_tokens);
    if (configured !== null) return Math.min(MAX_ESTIMATED_OUTPUT_TOKENS, Math.ceil(configured));
    return model.includes('-image') ? 2_048 : DEFAULT_TEXT_OUTPUT_TOKEN_RESERVE;
}

function hasGroundingTool(config: unknown): boolean {
    const requestConfig = readConfigRecord(config);
    const tools = Array.isArray(requestConfig.tools) ? requestConfig.tools : [];
    return tools.some((tool) => isRecord(tool) && (
        tool.googleSearch !== undefined
        || tool.google_search !== undefined
        || tool.googleMaps !== undefined
        || tool.google_maps !== undefined
    ));
}

function calculateTokenCostMicroUsd(model: string, inputTokens: number, outputTokens: number): number | null {
    const price = GEMINI_STANDARD_MODEL_PRICING[model];
    if (!price) return null;
    const inputCost = inputTokens * price.inputUsdPerMillionTokens * MICRO_USD_PER_USD / TOKEN_PRICING_DIVISOR;
    const outputCost = outputTokens * price.outputUsdPerMillionTokens * MICRO_USD_PER_USD / TOKEN_PRICING_DIVISOR;
    return Math.max(1, Math.ceil(inputCost + outputCost));
}

export function estimateGeminiRequestCostMicroUsd(method: string, config: unknown): number {
    if (method === 'fileUpload' || method === 'fileDelete') return 0;
    if (method === 'embedContent') return EMBEDDING_RESERVE_MICRO_USD;
    const model = isRecord(config) && typeof config.model === 'string' ? config.model.trim() : '';
    const price = GEMINI_STANDARD_MODEL_PRICING[model];
    if (!price) {
        if (method === 'generateImages') {
            const requestConfig = readConfigRecord(config);
            const count = readPositiveFiniteNumber(requestConfig.numberOfImages ?? requestConfig.number_of_images) ?? 1;
            return Math.ceil(Math.min(4, count) * UNKNOWN_GENERATION_RESERVE_MICRO_USD);
        }
        return UNKNOWN_GENERATION_RESERVE_MICRO_USD;
    }

    const tokenCost = calculateTokenCostMicroUsd(
        model,
        estimateInputTokens(config),
        getMaxOutputTokenReserve(config, model),
    ) ?? UNKNOWN_GENERATION_RESERVE_MICRO_USD;
    return tokenCost + (hasGroundingTool(config) ? GROUNDING_QUERY_RESERVE_MICRO_USD : 0);
}

function readUsageMetadata(response: unknown): Record<string, unknown> | null {
    if (!isRecord(response)) return null;
    if (isRecord(response.usageMetadata)) return response.usageMetadata;
    return isRecord(response.response) && isRecord(response.response.usageMetadata)
        ? response.response.usageMetadata
        : null;
}

function readUsageTokenCount(usage: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
        const value = readNonNegativeSafeInteger(usage[key]);
        if (value !== null) return value;
    }
    return 0;
}

export function calculateGeminiResponseCostMicroUsd(model: string, response: unknown): number | null {
    const usage = readUsageMetadata(response);
    if (!usage || !GEMINI_STANDARD_MODEL_PRICING[model]) return null;
    const inputTokens = readUsageTokenCount(usage, ['promptTokenCount', 'prompt_token_count']);
    const candidateTokens = readUsageTokenCount(usage, ['candidatesTokenCount', 'candidates_token_count']);
    const thoughtTokens = readUsageTokenCount(usage, ['thoughtsTokenCount', 'thoughts_token_count']);
    const toolTokens = readUsageTokenCount(usage, ['toolUsePromptTokenCount', 'tool_use_prompt_token_count']);
    const totalTokens = readUsageTokenCount(usage, ['totalTokenCount', 'total_token_count']);
    const outputTokens = Math.max(candidateTokens + thoughtTokens + toolTokens, totalTokens - inputTokens, 0);
    if (inputTokens === 0 && outputTokens === 0) return null;
    return calculateTokenCostMicroUsd(model, inputTokens, outputTokens);
}

export function getGeminiSpendLimitMicroUsd(
    product: GeminiSpendProduct,
    env: Record<string, string | undefined>,
): number {
    const envName = `${product.toUpperCase()}_GEMINI_SPEND_LIMIT_USD_10M`;
    const configured = env[envName];
    if (configured === undefined || configured.trim() === '') return GEMINI_SPEND_DEFAULT_LIMIT_MICRO_USD;
    const usd = readPositiveFiniteNumber(configured);
    if (usd === null || usd < 0.1 || usd > 190) {
        throw new GeminiSpendAdmissionError(GEMINI_SPEND_ADMISSION_ERROR_CODES.CONFIG_INVALID);
    }
    return Math.round(usd * MICRO_USD_PER_USD);
}

export function getFullJitterDelayMs(
    retryNumber: number,
    baseDelayMs: number,
    maxDelayMs: number,
    randomValue = Math.random(),
): number {
    const safeRetryNumber = Math.max(1, Math.min(30, Math.floor(retryNumber)));
    const ceiling = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, safeRetryNumber));
    const normalizedRandom = Number.isFinite(randomValue)
        ? Math.max(0, Math.min(1, randomValue))
        : 0.5;
    return Math.max(1, Math.floor(ceiling * normalizedRandom));
}

function normalizeRetryDelayMs(value: unknown): number | null {
    if (value === undefined || value === null) return null;
    const normalized = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? value.trim().match(/^(\d+(?:\.\d+)?)(ms|s)?$/i)
            : null;
    if (normalized === null) return null;
    const amount = typeof normalized === 'number' ? normalized : Number(normalized[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const unit = typeof normalized === 'number' ? 's' : (normalized[2] || 's').toLowerCase();
    return Math.ceil(unit === 'ms' ? amount : amount * 1000);
}

function readStructuredRetryDelayMs(value: unknown, depth = 0): number | null {
    if (depth > 4) return null;
    if (Array.isArray(value)) {
        for (const item of value.slice(0, 20)) {
            const retryAfterMs = readStructuredRetryDelayMs(item, depth + 1);
            if (retryAfterMs !== null) return retryAfterMs;
        }
        return null;
    }
    if (!isRecord(value)) return null;

    for (const key of ['retryAfterSeconds', 'retryAfter', 'retryDelaySeconds', 'retryDelay']) {
        const retryAfterMs = normalizeRetryDelayMs(value[key]);
        if (retryAfterMs !== null) return retryAfterMs;
    }

    const headers = value.headers;
    if (isRecord(headers)) {
        const retryAfterMs = normalizeRetryDelayMs(headers['retry-after'] ?? headers.retryAfter);
        if (retryAfterMs !== null) return retryAfterMs;
    }

    for (const key of ['error', 'details', 'response', 'cause']) {
        const retryAfterMs = readStructuredRetryDelayMs(value[key], depth + 1);
        if (retryAfterMs !== null) return retryAfterMs;
    }
    return null;
}

export function getGeminiRetryAfterMs(error: unknown): number | null {
    return readStructuredRetryDelayMs(error);
}

export function createFirestoreGeminiSpendAdmission(
    input: CreateFirestoreGeminiSpendAdmissionInput,
): GeminiSpendAdmissionController {
    if (!Number.isSafeInteger(input.limitMicroUsd) || input.limitMicroUsd <= 0) {
        throw new GeminiSpendAdmissionError(GEMINI_SPEND_ADMISSION_ERROR_CODES.CONFIG_INVALID);
    }

    const getDocumentReference = () => {
        const firestore = input.getFirestore();
        if (!firestore) {
            throw new GeminiSpendAdmissionError(GEMINI_SPEND_ADMISSION_ERROR_CODES.STORE_UNAVAILABLE);
        }
        return {
            firestore,
            reference: firestore.collection(GEMINI_SPEND_WINDOW_COLLECTION).doc(input.product),
        };
    };

    return {
        async reserve(method, config) {
            const estimatedMicroUsd = estimateGeminiRequestCostMicroUsd(method, config);
            if (estimatedMicroUsd <= 0) return null;
            const model = isRecord(config) && typeof config.model === 'string' ? config.model.trim() : '';
            try {
                const { firestore, reference } = getDocumentReference();
                const decision = await firestore.runTransaction(async (transaction) => {
                    const snapshot = await transaction.get(reference);
                    const nowMs = Date.now();
                    const next = reserveGeminiSpend(snapshot.data(), {
                        estimatedMicroUsd,
                        limitMicroUsd: input.limitMicroUsd,
                        model,
                        nowMs,
                    });
                    if (next.allowed) {
                        transaction.set(reference, {
                            ...next.state,
                            limitMicroUsd: input.limitMicroUsd,
                            product: input.product,
                            updatedAtMs: nowMs,
                        });
                    }
                    return next;
                });
                if (!decision.allowed || !decision.reservation) {
                    throw new GeminiSpendAdmissionError(
                        GEMINI_SPEND_ADMISSION_ERROR_CODES.LIMIT_REACHED,
                        decision.retryAfterSeconds,
                    );
                }
                return decision.reservation;
            } catch (error) {
                if (error instanceof GeminiSpendAdmissionError) throw error;
                throw new GeminiSpendAdmissionError(GEMINI_SPEND_ADMISSION_ERROR_CODES.STORE_UNAVAILABLE);
            }
        },

        async settle(reservation, response) {
            const actualMicroUsd = calculateGeminiResponseCostMicroUsd(reservation.model, response)
                ?? (response === undefined ? 0 : reservation.estimatedMicroUsd);
            try {
                const { firestore, reference } = getDocumentReference();
                await firestore.runTransaction(async (transaction) => {
                    const snapshot = await transaction.get(reference);
                    const nowMs = Date.now();
                    const state = settleGeminiSpend(snapshot.data(), {
                        actualMicroUsd,
                        nowMs,
                        reservation,
                    });
                    transaction.set(reference, {
                        ...state,
                        limitMicroUsd: input.limitMicroUsd,
                        product: input.product,
                        updatedAtMs: nowMs,
                    });
                });
            } catch (error) {
                if (error instanceof GeminiSpendAdmissionError) throw error;
                throw new GeminiSpendAdmissionError(GEMINI_SPEND_ADMISSION_ERROR_CODES.STORE_UNAVAILABLE);
            }
        },
    };
}

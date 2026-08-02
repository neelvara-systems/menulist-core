/**
 * AI Gateway — Transparent proxy for Gemini API with key rotation + retry
 * (Cloud Functions version)
 *
 * Wraps GoogleGenAI with rolling-spend admission, bounded key failover, and
 * jittered exponential backoff for transient failures. Drop-in replacement
 * for the raw GoogleGenAI client — same interface, zero call-site changes.
 *
 * Proxied methods:
 * - models.generateContent()
 * - models.embedContent()
 * - models.generateImages()
 * - files.upload()
 * - files.delete()
 *
 * Behavior:
 * - Before billable calls: reserve from the product/project rolling-spend window
 * - On 429 (rate limit): cool down the key, then retry with full jitter
 * - On 5xx (server error): full-jitter exponential backoff retry
 * - On 4xx (client error, non-429): fail immediately (no retry)
 * - All keys exhausted: throw the last error
 *
 * @see __docs__/ai-system-layer/README.md
 */

import * as functions from 'firebase-functions';
import { isSafeModeActive } from '../monitoring/safeMode';
import { AI_PROVIDER_CONFIG_MISSING_CODE, KeyManager } from "./keyManager";
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';
import { compileGeminiGenerateContentRequest } from '../sharedData/geminiRuntime';
import {
    GEMINI_SPEND_ADMISSION_ERROR_CODES,
    GeminiSpendAdmissionController,
    GeminiSpendReservation,
    getFullJitterDelayMs,
    getGeminiRetryAfterMs,
} from '../sharedData/geminiSpendPolicy';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Maximum retry attempts (including key rotations) */
const MAX_RETRY_ATTEMPTS = 6;

/** Base delay for exponential backoff (ms) */
const BASE_BACKOFF_DELAY_MS = 1000;

/** Max delay for exponential backoff (ms) */
const MAX_BACKOFF_DELAY_MS = 16_000;
export const AI_PROVIDER_SAFE_MODE_ACTIVE_CODE = 'AI_PROVIDER_SAFE_MODE_ACTIVE';

export class AIProviderSafeModeActiveError extends Error {
    readonly code = AI_PROVIDER_SAFE_MODE_ACTIVE_CODE;

    constructor() {
        super(AI_PROVIDER_SAFE_MODE_ACTIVE_CODE);
        this.name = 'AIProviderSafeModeActiveError';
    }
}
const PROVIDER_ERROR_INDICATOR_KEYS = new Set([
    'code',
    'domain',
    'name',
    'quotaId',
    'quotaLimit',
    'quotaMetric',
    'reason',
    'status',
    'statusCode',
    'type',
]);

function isProviderErrorIndicatorEntry(key: string, value: unknown): boolean {
    if (key.toLowerCase().includes('message')) return false;
    return (PROVIDER_ERROR_INDICATOR_KEYS.has(key) || /quota|limit/i.test(key)) &&
        (typeof value === 'string' || typeof value === 'number');
}

// ═══════════════════════════════════════════════════════════════
// ERROR DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if an error is a rate limit (429) error from Google.
 */
function isRateLimitError(error: any): boolean {
    if (!error) return false;

    if (error.status === 429 || error.httpStatusCode === 429) return true;

    const indicators = getErrorText(error);
    if (
        indicators.includes('429') ||
        indicators.includes('rate_limit') ||
        indicators.includes('resource_exhausted') ||
        indicators.includes('quota') ||
        indicators.includes('too_many_requests')
    ) {
        return true;
    }

    if (error.error?.code === 429) return true;
    if (error.errorDetails?.some?.((d: any) => d.reason === 'RATE_LIMIT_EXCEEDED')) return true;

    return false;
}

function getErrorText(error: any): string {
    return getProviderErrorStrings(error).filter(Boolean).join(' ').toLowerCase();
}

function getProviderErrorStrings(value: any, depth = 0): string[] {
    if (!value || depth > 3) return [];
    if (Array.isArray(value)) {
        return value.slice(0, 5).flatMap((entry) => getProviderErrorStrings(entry, depth + 1));
    }
    if (typeof value !== 'object') return [];

    const indicators = Object.entries(value as Record<string, unknown>)
        .filter(([key, entry]) => isProviderErrorIndicatorEntry(key, entry))
        .map(([, entry]) => String(entry));

    return [
        ...(value instanceof Error ? [getBoundedFunctionsErrorName(value) || 'Error'] : []),
        ...indicators,
        ...getProviderErrorStrings(value.error, depth + 1),
        ...getProviderErrorStrings(value.errorDetails, depth + 1),
        ...getProviderErrorStrings(value.details, depth + 1),
        ...getProviderErrorStrings(value.metadata, depth + 1),
        ...getProviderErrorStrings(value.cause, depth + 1),
    ];
}

/**
 * Hard quota errors are not transient. Retrying a single key wastes time and
 * quota attempts; only key rotation can recover if another key exists.
 */
function isHardQuotaError(error: any): boolean {
    const indicators = getErrorText(error);
    return indicators.includes('limit_0') ||
        (indicators.includes('quota') && indicators.includes('0')) ||
        indicators.includes('generaterequestsperday') ||
        indicators.includes('perdayperprojectpermodel');
}

/**
 * Detect if an error is a retryable server error (5xx or network).
 */
function isRetryableError(error: any): boolean {
    if (!error) return false;

    const status = error.status || error.httpStatusCode || 0;
    if (status >= 500 && status < 600) return true;

    const indicators = getErrorText(error);
    if (indicators.includes('timeout') || indicators.includes('deadline_exceeded') ||
        indicators.includes('network') || indicators.includes('econnreset') ||
        indicators.includes('econnrefused') || indicators.includes('aborted') ||
        indicators.includes('internal') || indicators.includes('unavailable')) {
        return true;
    }

    return false;
}

function getSafeDiagnosticValue(value: any): string | number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    return /^[a-zA-Z0-9_.:/-]{1,80}$/.test(trimmed) ? trimmed : 'present';
}

function getStatusCode(value: any): number | undefined {
    const statusCode = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
        ? statusCode
        : undefined;
}

function getProviderErrorLogContext(error: any) {
    const nestedError = error?.error && typeof error.error === 'object' ? error.error : undefined;
    const sourceStatus = typeof error?.status === 'string' ? error.status : nestedError?.status;

    return {
        sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
        sourceErrorCode: getSafeDiagnosticValue(error?.code ?? nestedError?.code),
        sourceStatus: getSafeDiagnosticValue(sourceStatus),
        sourceStatusCode: getStatusCode(error?.status)
            ?? getStatusCode(error?.httpStatusCode)
            ?? getStatusCode(nestedError?.code),
    };
}

// ═══════════════════════════════════════════════════════════════
// AI GATEWAY CLASS
// ═══════════════════════════════════════════════════════════════

export class AIGateway {
    private keyManager: KeyManager;
    private readonly logger = functions.logger;
    private readonly spendAdmission?: GeminiSpendAdmissionController;

    constructor(keyManager: KeyManager, spendAdmission?: GeminiSpendAdmissionController) {
        this.keyManager = keyManager;
        this.spendAdmission = spendAdmission;
    }

    /**
     * Proxy for `genAIClient.models` — same interface as GoogleGenAI.models
     */
    get models() {
        return {
            generateContent: (config: any) =>
                this.executeWithRetry(
                    'generateContent',
                    compileGeminiGenerateContentRequest(config),
                ),
            embedContent: (config: any) =>
                this.executeWithRetry('embedContent', config),
            generateImages: (config: any) =>
                this.executeWithRetry('generateImages', config),
        };
    }

    /**
     * Proxy for `genAIClient.files` — same interface as GoogleGenAI.files
     */
    get files() {
        return {
            upload: (config: any) =>
                this.executeWithRetry('fileUpload', config),
            delete: (config: any) =>
                this.executeWithRetry('fileDelete', config),
        };
    }

    /**
     * Core execution engine with key rotation + retry.
     *
     * Strategy:
     * 1. Try current key
     * 2. Reserve distributed rolling-spend capacity before provider I/O
     * 3. On 429 → cool down the key and retry with jittered backoff
     * 4. On 5xx → jittered exponential backoff
     * 4. On 4xx (non-429) → fail immediately
     * 5. After MAX_RETRY_ATTEMPTS → throw last error
     */
    private async executeWithRetry(method: string, config: any): Promise<any> {
        // Cleanup must remain available while provider generation is paused.
        if (method !== 'fileDelete' && await isSafeModeActive()) {
            const error = new AIProviderSafeModeActiveError();
            this.logger.warn('[AIGateway] Provider call blocked by SAFE_MODE', {
                failureCode: AI_PROVIDER_SAFE_MODE_ACTIVE_CODE,
                method,
            });
            throw error;
        }

        if (!this.keyManager.hasConfiguredKeys()) {
            const error = new Error(AI_PROVIDER_CONFIG_MISSING_CODE);
            error.name = AI_PROVIDER_CONFIG_MISSING_CODE;
            this.logger.error('[AIGateway] Gemini provider config missing', {
                method,
                configuredKeyCount: 0,
                sourceErrorName: error.name,
                sourceErrorCode: AI_PROVIDER_CONFIG_MISSING_CODE,
            });
            throw error;
        }

        let lastError: any;
        let backoffRetries = 0;

        for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
            const client = this.keyManager.getClient();
            const spendReservation = await this.reserveSpend(method, config);

            try {
                let result: any;

                if (method === 'fileUpload') {
                    result = await client.files.upload(config);
                } else if (method === 'fileDelete') {
                    result = await client.files.delete(config);
                } else {
                    result = await (client.models as any)[method](config);
                }

                await this.settleSpend(spendReservation, result, method);
                // Success — reset key health
                this.keyManager.markKeySuccess(client);
                return result;

            } catch (error: any) {
                lastError = error;
                await this.settleSpend(spendReservation, undefined, method);

                // ── Rate Limit (429) → Key cooldown + jittered backoff ──
                if (isRateLimitError(error)) {
                    const hardQuota = isHardQuotaError(error);
                    this.keyManager.markKeyRateLimited(client);

                    if (hardQuota) {
                        this.logger.warn(
                            '[AIGateway] Non-transient project quota hit; failing fast',
                            {
                                method,
                                attempt: attempt + 1,
                                maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                                totalKeys: this.keyManager.totalKeys,
                                ...getProviderErrorLogContext(error),
                            }
                        );
                        throw error;
                    }

                    const providerRetryAfterMs = getGeminiRetryAfterMs(error);
                    if (providerRetryAfterMs !== null && providerRetryAfterMs > MAX_BACKOFF_DELAY_MS) {
                        this.logger.warn('[AIGateway] Provider retry window exceeds inline retry budget; failing fast', {
                            method,
                            attempt: attempt + 1,
                            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                            retryAfterMs: providerRetryAfterMs,
                            ...getProviderErrorLogContext(error),
                        });
                        throw error;
                    }
                    if (attempt >= MAX_RETRY_ATTEMPTS - 1) throw error;
                    backoffRetries++;
                    const delay = Math.max(
                        providerRetryAfterMs ?? 0,
                        getFullJitterDelayMs(backoffRetries, BASE_BACKOFF_DELAY_MS, MAX_BACKOFF_DELAY_MS),
                    );
                    this.logger.warn('[AIGateway] Rate limit hit; retrying with jittered backoff', {
                        method,
                        attempt: attempt + 1,
                        maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                        delayMs: delay,
                        totalKeys: this.keyManager.totalKeys,
                        ...getProviderErrorLogContext(error),
                    });
                    await this.delay(delay);
                    continue;
                }

                // ── Retryable Server Error (5xx) → Backoff + retry ──
                if (isRetryableError(error)) {
                    backoffRetries++;
                    const delay = getFullJitterDelayMs(
                        backoffRetries,
                        BASE_BACKOFF_DELAY_MS,
                        MAX_BACKOFF_DELAY_MS,
                    );

                    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
                        this.logger.warn(
                            '[AIGateway] Retryable provider error; retrying with jittered backoff',
                            {
                                method,
                                attempt: attempt + 1,
                                maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                                delayMs: delay,
                                ...getProviderErrorLogContext(error),
                            }
                        );
                        await this.delay(delay);
                        continue;
                    }
                }

                // ── Client Error (4xx, non-429) → Fail immediately ──
                throw error;
            }
        }

        this.logger.error(
            '[AIGateway] Provider attempts exhausted',
            {
                method,
                maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                ...getProviderErrorLogContext(lastError),
            }
        );
        throw lastError;
    }

    /**
     * Get key manager stats for monitoring/debugging.
     */
    getKeyStats() {
        return this.keyManager.getStats();
    }

    private async reserveSpend(method: string, config: any): Promise<GeminiSpendReservation | null> {
        if (!this.spendAdmission) return null;
        try {
            return await this.spendAdmission.reserve(method, config);
        } catch (error: any) {
            this.logger.warn('[AIGateway] Gemini spend admission blocked provider call', {
                method,
                failureCode: typeof error?.code === 'string'
                    ? error.code
                    : GEMINI_SPEND_ADMISSION_ERROR_CODES.STORE_UNAVAILABLE,
                retryAfterSeconds: typeof error?.retryAfterSeconds === 'number'
                    ? error.retryAfterSeconds
                    : undefined,
            });
            throw error;
        }
    }

    private async settleSpend(
        reservation: GeminiSpendReservation | null,
        response: unknown,
        method: string,
    ): Promise<void> {
        if (!reservation || !this.spendAdmission) return;
        try {
            await this.spendAdmission.settle(reservation, response);
        } catch (error: any) {
            this.logger.error('[AIGateway] Gemini spend settlement failed; reservation remains conservative', {
                method,
                failureCode: typeof error?.code === 'string'
                    ? error.code
                    : GEMINI_SPEND_ADMISSION_ERROR_CODES.STORE_UNAVAILABLE,
            });
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════

/**
 * Create an AI Gateway instance with a Key Manager.
 */
export function createAIGateway(
    keyManager: KeyManager,
    spendAdmission?: GeminiSpendAdmissionController,
): AIGateway {
    return new AIGateway(keyManager, spendAdmission);
}

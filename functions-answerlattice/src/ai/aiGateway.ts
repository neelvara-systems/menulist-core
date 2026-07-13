/**
 * Answerlattice AI gateway.
 *
 * Provides the same API-key GenAI execution shape used by MenuList Functions:
 * key rotation on rate limits, bounded retries for transient failures, and one
 * provider client branch.
 */

import * as logger from 'firebase-functions/logger';
import { AI_PROVIDER_CONFIG_MISSING_CODE, KeyManager } from './keyManager';

const MAX_RETRY_ATTEMPTS = 6;
const BASE_BACKOFF_DELAY_MS = 1000;
const MAX_BACKOFF_DELAY_MS = 16_000;

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
        ...(value instanceof Error ? [value.name] : []),
        ...indicators,
        ...getProviderErrorStrings(value.error, depth + 1),
        ...getProviderErrorStrings(value.errorDetails, depth + 1),
        ...getProviderErrorStrings(value.details, depth + 1),
        ...getProviderErrorStrings(value.metadata, depth + 1),
        ...getProviderErrorStrings(value.cause, depth + 1),
    ];
}

function getErrorText(error: any): string {
    return getProviderErrorStrings(error).filter(Boolean).join(' ').toLowerCase();
}

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
    if (error.errorDetails?.some?.((detail: any) => detail.reason === 'RATE_LIMIT_EXCEEDED')) return true;

    return false;
}

function isHardQuotaError(error: any): boolean {
    const indicators = getErrorText(error);
    return indicators.includes('limit_0') ||
        (indicators.includes('quota') && indicators.includes('0')) ||
        indicators.includes('generaterequestsperday') ||
        indicators.includes('perdayperprojectpermodel');
}

function isRetryableError(error: any): boolean {
    if (!error) return false;

    const status = error.status || error.httpStatusCode || 0;
    if (status >= 500 && status < 600) return true;

    const indicators = getErrorText(error);
    return indicators.includes('timeout') ||
        indicators.includes('deadline_exceeded') ||
        indicators.includes('network') ||
        indicators.includes('econnreset') ||
        indicators.includes('econnrefused') ||
        indicators.includes('aborted') ||
        indicators.includes('internal') ||
        indicators.includes('unavailable');
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
        sourceErrorName: error instanceof Error ? error.name : typeof error,
        sourceErrorCode: getSafeDiagnosticValue(error?.code ?? nestedError?.code),
        sourceStatus: getSafeDiagnosticValue(sourceStatus),
        sourceStatusCode: getStatusCode(error?.status)
            ?? getStatusCode(error?.httpStatusCode)
            ?? getStatusCode(nestedError?.code),
    };
}

export class AIGateway {
    constructor(private readonly keyManager: KeyManager) { }

    get models() {
        return {
            generateContent: (config: any) => this.executeWithRetry('generateContent', config),
            embedContent: (config: any) => this.executeWithRetry('embedContent', config),
            generateImages: (config: any) => this.executeWithRetry('generateImages', config),
        };
    }

    get files() {
        return {
            upload: (config: any) => this.executeWithRetry('fileUpload', config),
            delete: (config: any) => this.executeWithRetry('fileDelete', config),
        };
    }

    private async executeWithRetry(method: string, config: any): Promise<any> {
        if (!this.keyManager.hasConfiguredKeys()) {
            const error = new Error(AI_PROVIDER_CONFIG_MISSING_CODE);
            error.name = AI_PROVIDER_CONFIG_MISSING_CODE;
            logger.error('[Answerlattice AIGateway] Gemini provider config missing', {
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

            try {
                const result = method === 'fileUpload'
                    ? await client.files.upload(config)
                    : method === 'fileDelete'
                        ? await client.files.delete(config)
                        : await (client.models as any)[method](config);

                this.keyManager.markCurrentKeySuccess();
                return result;
            } catch (error: any) {
                lastError = error;

                if (isRateLimitError(error)) {
                    const hardQuota = isHardQuotaError(error);
                    this.keyManager.markCurrentKeyRateLimited();

                    if (this.keyManager.totalKeys > 1) {
                        logger.warn('[Answerlattice AIGateway] Rate limit hit; rotating to next key', {
                            method,
                            attempt: attempt + 1,
                            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                            totalKeys: this.keyManager.totalKeys,
                            ...getProviderErrorLogContext(error),
                        });
                        continue;
                    }

                    if (hardQuota) {
                        logger.warn('[Answerlattice AIGateway] Hard quota hit in single key mode; failing fast', {
                            method,
                            attempt: attempt + 1,
                            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                            ...getProviderErrorLogContext(error),
                        });
                        throw error;
                    }

                    backoffRetries++;
                    const delay = Math.min(
                        BASE_BACKOFF_DELAY_MS * Math.pow(2, backoffRetries),
                        MAX_BACKOFF_DELAY_MS
                    );
                    logger.warn('[Answerlattice AIGateway] Rate limit hit in single key mode; retrying with backoff', {
                        method,
                        attempt: attempt + 1,
                        maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                        delayMs: delay,
                        ...getProviderErrorLogContext(error),
                    });
                    await this.delay(delay);
                    continue;
                }

                if (isRetryableError(error)) {
                    backoffRetries++;
                    const delay = Math.min(
                        BASE_BACKOFF_DELAY_MS * Math.pow(2, backoffRetries),
                        MAX_BACKOFF_DELAY_MS
                    );

                    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
                        logger.warn('[Answerlattice AIGateway] Retryable provider error; retrying with backoff', {
                            method,
                            attempt: attempt + 1,
                            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
                            delayMs: delay,
                            ...getProviderErrorLogContext(error),
                        });
                        await this.delay(delay);
                        continue;
                    }
                }

                throw error;
            }
        }

        logger.error('[Answerlattice AIGateway] Provider attempts exhausted', {
            method,
            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
            ...getProviderErrorLogContext(lastError),
        });
        throw lastError;
    }

    getKeyStats() {
        return this.keyManager.getStats();
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export function createAIGateway(keyManager: KeyManager): AIGateway {
    return new AIGateway(keyManager);
}

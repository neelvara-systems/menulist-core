/**
 * AI Gateway — Transparent proxy for Gemini API with key rotation + retry
 * 
 * Wraps GoogleGenAI with automatic key rotation on rate limits (429) and
 * exponential backoff retry for transient failures. Drop-in replacement
 * for the raw GoogleGenAI client — same interface, zero call-site changes.
 * 
 * Proxied methods:
 * - models.generateContent()
 * - models.embedContent()
 * - models.generateImages()
 * - files.upload()
 * 
 * Behavior:
 * - On 429 (rate limit): rotate to next key, retry immediately
 * - On 5xx (server error): exponential backoff retry
 * - On 4xx (client error, non-429): fail immediately (no retry)
 * - All keys exhausted: throw the last error
 * 
 * @see __docs__/ai-system-layer/README.md
 */

import { logger } from "@lib/monitoring/logger";
import { KeyManager } from "./keyManager";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Maximum retry attempts (including key rotations) */
const MAX_RETRY_ATTEMPTS = 6;

/** Base delay for exponential backoff (ms) */
const BASE_BACKOFF_DELAY_MS = 1000;

/** Max delay for exponential backoff (ms) */
const MAX_BACKOFF_DELAY_MS = 16_000;

// ═══════════════════════════════════════════════════════════════
// ERROR DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if an error is a rate limit (429) error from Google.
 * Google's API returns various error formats.
 */
function isRateLimitError(error: any): boolean {
    if (!error) return false;

    // HTTP status code check
    if (error.status === 429 || error.httpStatusCode === 429) return true;

    // Google AI SDK error patterns
    const message = (error.message || '').toLowerCase();
    if (message.includes('429') || message.includes('rate limit') || message.includes('resource exhausted') || message.includes('quota exceeded') || message.includes('too many requests')) {
        return true;
    }

    // Nested error check (Google wraps errors)
    if (error.error?.code === 429) return true;
    if (error.errorDetails?.some?.((d: any) => d.reason === 'RATE_LIMIT_EXCEEDED')) return true;

    return false;
}

function getErrorText(error: any): string {
    return [
        error?.message,
        error?.error?.message,
        JSON.stringify(error?.errorDetails || ''),
    ].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Hard quota errors are not transient. Retrying a single key wastes time and
 * quota attempts; only key rotation can recover if another key exists.
 */
function isHardQuotaError(error: any): boolean {
    const message = getErrorText(error);
    return message.includes('limit: 0') ||
        message.includes('generaterequestsperday') ||
        message.includes('perdayperprojectpermodel');
}

/**
 * Detect if an error is a retryable server error (5xx or network).
 */
function isRetryableError(error: any): boolean {
    if (!error) return false;

    // Server errors (5xx)
    const status = error.status || error.httpStatusCode || 0;
    if (status >= 500 && status < 600) return true;

    // Network/timeout errors
    const message = (error.message || '').toLowerCase();
    if (message.includes('timeout') || message.includes('network') ||
        message.includes('econnreset') || message.includes('econnrefused') ||
        message.includes('socket hang up') || message.includes('fetch failed') ||
        message.includes('internal error') || message.includes('service unavailable')) {
        return true;
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
// AI GATEWAY CLASS
// ═══════════════════════════════════════════════════════════════

export class AIGateway {
    private keyManager: KeyManager;

    constructor(keyManager: KeyManager) {
        this.keyManager = keyManager;
    }

    /**
     * Proxy for `genAIClient.models` — same interface as GoogleGenAI.models
     */
    get models() {
        return {
            generateContent: (config: any) =>
                this.executeWithRetry('generateContent', config),
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
        };
    }

    /**
     * Core execution engine with key rotation + retry.
     * 
     * Strategy:
     * 1. Try current key
     * 2. On 429 → rotate key, retry immediately (no backoff)
     * 3. On 5xx → exponential backoff, same key
     * 4. On 4xx (non-429) → fail immediately
     * 5. After MAX_RETRY_ATTEMPTS → throw last error
     */
    private async executeWithRetry(method: string, config: any): Promise<any> {
        let lastError: any;
        let backoffRetries = 0;

        for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
            const client = this.keyManager.getClient();

            try {
                let result: any;

                if (method === 'fileUpload') {
                    result = await client.files.upload(config);
                } else {
                    result = await (client.models as any)[method](config);
                }

                // Success — reset key health
                this.keyManager.markCurrentKeySuccess();
                return result;

            } catch (error: any) {
                lastError = error;

                // ── Rate Limit (429) → Rotate key, retry immediately ──
                if (isRateLimitError(error)) {
                    const hardQuota = isHardQuotaError(error);
                    this.keyManager.markCurrentKeyRateLimited();

                    if (this.keyManager.totalKeys > 1) {
                        logger.warn(
                            `[AIGateway] Rate limit hit on attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}. ` +
                            `Rotating to next key. Keys available: ${this.keyManager.totalKeys}`
                        );
                        // Immediate retry with next key (no backoff)
                        continue;
                    } else if (hardQuota) {
                        logger.warn(
                            `[AIGateway] Hard quota hit in single key mode for ${method}. ` +
                            `Failing fast without retry.`
                        );
                        throw error;
                    } else {
                        // Single key — apply backoff before retry
                        backoffRetries++;
                        const delay = Math.min(
                            BASE_BACKOFF_DELAY_MS * Math.pow(2, backoffRetries),
                            MAX_BACKOFF_DELAY_MS
                        );
                        logger.warn(
                            `[AIGateway] Rate limit hit (single key mode). ` +
                            `Backing off ${delay}ms before retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS}`
                        );
                        await this.delay(delay);
                        continue;
                    }
                }

                // ── Retryable Server Error (5xx) → Backoff + retry ──
                if (isRetryableError(error)) {
                    backoffRetries++;
                    const delay = Math.min(
                        BASE_BACKOFF_DELAY_MS * Math.pow(2, backoffRetries),
                        MAX_BACKOFF_DELAY_MS
                    );

                    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
                        logger.warn(
                            `[AIGateway] Retryable error on attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}: ` +
                            `${error.message || 'Unknown'}. Retrying in ${delay}ms`
                        );
                        await this.delay(delay);
                        continue;
                    }
                }

                // ── Client Error (4xx, non-429) → Fail immediately ──
                throw error;
            }
        }

        // All attempts exhausted
        logger.error(
            `[AIGateway] All ${MAX_RETRY_ATTEMPTS} attempts exhausted. ` +
            `Last error: ${lastError?.message || 'Unknown'}`
        );
        throw lastError;
    }

    /**
     * Get key manager stats for monitoring/debugging.
     */
    getKeyStats() {
        return this.keyManager.getStats();
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
 * Returns an object with the same interface as GoogleGenAI.
 */
export function createAIGateway(keyManager: KeyManager): AIGateway {
    return new AIGateway(keyManager);
}

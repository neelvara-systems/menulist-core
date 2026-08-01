/**
 * Generic Webhook Signature Validation
 * ═══════════════════════════════════════════════════════════════
 * 
 * Provides secure webhook signature verification for multiple providers
 * 
 * Security Features:
 * - HMAC-based signature verification
 * - Timing-safe comparison (prevents timing attacks)
 * - Configurable hashing algorithms
 * - Security event logging
 * 
 * OWASP Coverage:
 * - A02: Cryptographic Failures (secure signature verification)
 * - A04: Insecure Design (prevents webhook spoofing)
 * - A07: Authentication Failures (validates webhook source)
 * - A09: Logging Failures (comprehensive security logging)
 */

import { createHmac, timingSafeEqual } from 'crypto';
import {
    getBoundedSecurityStringContext,
    logSecurityDiagnostic,
    logSecurityFailure,
} from './securityDiagnostics';

/**
 * Supported hashing algorithms for webhook signatures
 */
export type HashAlgorithm = 'sha256' | 'sha512';

/**
 * Webhook signature verification options
 */
export interface WebhookValidationOptions {
    /** The hashing algorithm used (default: sha256) */
    algorithm?: HashAlgorithm;
    /** The encoding for the signature (default: hex) */
    encoding?: 'hex' | 'base64';
    /** The webhook provider name (for logging) */
    provider?: string;
    /** Optional prefix to remove from signature (e.g., 'sha256=') */
    signaturePrefix?: string;
}

/**
 * Validates a webhook signature using HMAC
 * 
 * This is a generic function that can be used for any webhook provider
 * that uses HMAC-based signatures (Stripe, GitHub, Shopify, etc.)
 * 
 * @param requestBody The raw request body string
 * @param receivedSignature The signature from the webhook headers
 * @param secret The webhook secret/key
 * @param options Optional configuration
 * @returns True if signature is valid, false otherwise
 * 
 * @example
 * ```typescript
 * // GitHub webhook
 * const isValid = validateWebhookSignature(
 *     requestBody,
 *     headers().get('x-hub-signature-256'),
 *     process.env.GITHUB_WEBHOOK_SECRET,
 *     { algorithm: 'sha256', signaturePrefix: 'sha256=' }
 * );
 * 
 * // Shopify webhook
 * const isValid = validateWebhookSignature(
 *     requestBody,
 *     headers().get('x-shopify-hmac-sha256'),
 *     process.env.SHOPIFY_WEBHOOK_SECRET,
 *     { algorithm: 'sha256', encoding: 'base64' }
 * );
 * ```
 */
export function validateWebhookSignature(
    requestBody: string,
    receivedSignature: string,
    secret: string,
    options: WebhookValidationOptions = {}
): boolean {
    try {
        // Default options
        const {
            algorithm = 'sha256',
            encoding = 'hex',
            provider = 'unknown',
            signaturePrefix = ''
        } = options;

        // Validate inputs
        if (!requestBody || !receivedSignature || !secret) {
            logSecurityDiagnostic('webhook_validator_missing_parameters', {
                hasBody: !!requestBody,
                hasSignature: !!receivedSignature,
                hasSecret: !!secret,
                ...getBoundedSecurityStringContext('provider', provider),
            });
            return false;
        }

        // Remove prefix from signature if provided
        if (signaturePrefix && !receivedSignature.startsWith(signaturePrefix)) {
            logSecurityDiagnostic('webhook_validator_signature_prefix_mismatch', {
                ...getBoundedSecurityStringContext('provider', provider),
            });
            return false;
        }
        const cleanSignature = signaturePrefix
            ? receivedSignature.substring(signaturePrefix.length)
            : receivedSignature;

        // Generate expected signature
        const hmac = createHmac(algorithm, secret);
        hmac.update(requestBody);
        const expectedSignature = hmac.digest(encoding);

        // Convert to buffers for timing-safe comparison
        const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
        const receivedBuffer = Buffer.from(cleanSignature, 'utf-8');

        // Lengths must match
        if (expectedBuffer.length !== receivedBuffer.length) {
            logSecurityDiagnostic('webhook_validator_signature_length_mismatch', {
                expectedLength: expectedBuffer.length,
                receivedLength: receivedBuffer.length,
                algorithm,
                encoding,
                ...getBoundedSecurityStringContext('provider', provider),
            });
            return false;
        }

        // Timing-safe comparison
        const isValid = timingSafeEqual(expectedBuffer, receivedBuffer);

        if (!isValid) {
            logSecurityDiagnostic('webhook_validator_invalid_signature', {
                algorithm,
                encoding,
                signatureLength: cleanSignature.length,
                ...getBoundedSecurityStringContext('provider', provider),
            });
        }

        return isValid;
    } catch (error) {
        logSecurityFailure('webhook_validator_validation_failed', error, {
            ...getBoundedSecurityStringContext('provider', options.provider || 'unknown'),
            ...getBoundedSecurityStringContext('algorithm', options.algorithm || 'sha256'),
            ...getBoundedSecurityStringContext('encoding', options.encoding || 'hex'),
        });
        return false;
    }
}

/**
 * Validates a Razorpay webhook signature
 * 
 * Razorpay uses HMAC-SHA256 with hex encoding
 * 
 * @param requestBody The raw request body string
 * @param signature The x-razorpay-signature header value
 * @param secret The RAZORPAY_WEBHOOK_SECRET from environment
 * @returns True if signature is valid
 */
export function validateRazorpayWebhook(
    requestBody: string,
    signature: string,
    secret: string
): boolean {
    return validateWebhookSignature(requestBody, signature, secret, {
        algorithm: 'sha256',
        encoding: 'hex',
        provider: 'razorpay'
    });
}

/**
 * Validates a GitHub webhook signature
 * 
 * GitHub uses HMAC-SHA256 with 'sha256=' prefix
 * 
 * @param requestBody The raw request body string
 * @param signature The x-hub-signature-256 header value
 * @param secret The GITHUB_WEBHOOK_SECRET from environment
 * @returns True if signature is valid
 */
export function validateGitHubWebhook(
    requestBody: string,
    signature: string,
    secret: string
): boolean {
    return validateWebhookSignature(requestBody, signature, secret, {
        algorithm: 'sha256',
        encoding: 'hex',
        provider: 'github',
        signaturePrefix: 'sha256='
    });
}

/**
 * Validates a Shopify webhook signature
 * 
 * Shopify uses HMAC-SHA256 with base64 encoding
 * 
 * @param requestBody The raw request body string
 * @param signature The x-shopify-hmac-sha256 header value
 * @param secret The SHOPIFY_WEBHOOK_SECRET from environment
 * @returns True if signature is valid
 */
export function validateShopifyWebhook(
    requestBody: string,
    signature: string,
    secret: string
): boolean {
    return validateWebhookSignature(requestBody, signature, secret, {
        algorithm: 'sha256',
        encoding: 'base64',
        provider: 'shopify'
    });
}

/**
 * Validates a custom webhook signature with SHA512
 * 
 * Use this for custom implementations that require stronger hashing
 * 
 * @param requestBody The raw request body string
 * @param signature The signature header value
 * @param secret The webhook secret from environment
 * @returns True if signature is valid
 */
export function validateCustomWebhookSHA512(
    requestBody: string,
    signature: string,
    secret: string
): boolean {
    return validateWebhookSignature(requestBody, signature, secret, {
        algorithm: 'sha512',
        encoding: 'hex',
        provider: 'custom'
    });
}

/**
 * Helper to extract webhook provider from request headers
 * 
 * @param headers Request headers
 * @returns Detected provider name or 'unknown'
 */
export function detectWebhookProvider(headers: Headers): string {
    if (headers.get('x-razorpay-signature')) return 'razorpay';
    if (headers.get('x-hub-signature-256')) return 'github';
    if (headers.get('x-shopify-hmac-sha256')) return 'shopify';
    return 'unknown';
}

/**
 * Validates webhook IP address against allowlist
 * 
 * Additional security layer: verify webhook comes from expected IP ranges
 * 
 * @param requestIP The IP address from the request
 * @param allowedIPs Array of allowed IP addresses or CIDR ranges
 * @param provider Provider name for logging
 * @returns True if IP is allowed
 * 
 * @example
 * ```typescript
 * const RAZORPAY_IPS = [
 *     '13.234.176.64/27',
 *     '13.234.176.96/27'
 * ];
 * 
 * const isAllowed = validateWebhookIP(
 *     request.headers.get('x-forwarded-for'),
 *     RAZORPAY_IPS,
 *     'razorpay'
 * );
 * ```
 */
export function validateWebhookIP(
    requestIP: string | null,
    allowedIPs: string[],
    provider: string = 'unknown'
): boolean {
    if (!requestIP) {
        logSecurityDiagnostic('webhook_ip_validator_missing_ip', {
            ...getBoundedSecurityStringContext('provider', provider),
        });
        return false;
    }

    const normalizedRequestIp = normalizeWebhookIp(requestIP);
    const isAllowed = normalizedRequestIp !== null && allowedIPs.some((entry) => (
        webhookIpAllowlistEntryMatches(normalizedRequestIp, entry)
    ));

    if (!isAllowed) {
        logSecurityDiagnostic('webhook_ip_validator_ip_not_allowed', {
            allowedCount: allowedIPs.length,
            ...getBoundedSecurityStringContext('requestIp', requestIP),
            ...getBoundedSecurityStringContext('provider', provider),
        });
    }

    return isAllowed;
}

function normalizeWebhookIp(value: string): string | null {
    const normalized = value.trim().toLowerCase().replace(/^\[(.*)\]$/, '$1');
    if (!normalized || normalized.includes(',') || /\s/.test(normalized)) return null;
    return normalized;
}

function parseWebhookIpv4(value: string): number | null {
    const parts = value.split('.');
    if (
        parts.length !== 4
        || parts.some((part) => !/^(?:0|[1-9]\d{0,2})$/.test(part))
    ) {
        return null;
    }
    const octets = parts.map(Number);
    if (octets.some((octet) => octet > 255)) return null;
    return (
        ((octets[0] << 24) >>> 0)
        + (octets[1] << 16)
        + (octets[2] << 8)
        + octets[3]
    ) >>> 0;
}

function webhookIpAllowlistEntryMatches(requestIp: string, rawEntry: string): boolean {
    const entry = normalizeWebhookIp(rawEntry);
    if (!entry) return false;
    if (!entry.includes('/')) return entry === requestIp;

    const [networkText, prefixText, ...extra] = entry.split('/');
    if (extra.length > 0 || !/^(?:[0-9]|[12]\d|3[0-2])$/.test(prefixText)) return false;
    const request = parseWebhookIpv4(requestIp);
    const network = parseWebhookIpv4(networkText);
    if (request === null || network === null) return false;
    const prefix = Number(prefixText);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (request & mask) === (network & mask);
}

/**
 * Webhook provider IP allowlists
 * Update these as providers change their IP ranges
 */
export const WEBHOOK_IP_ALLOWLISTS = {
    razorpay: [
        '13.234.176.64/27',
        '13.234.176.96/27',
        '13.234.99.0/27',
        '13.127.120.0/27'
    ],
    github: [
        // GitHub provides a meta API: https://api.github.com/meta
        // IPs change frequently, fetch dynamically or use signature validation
    ]
} as const;

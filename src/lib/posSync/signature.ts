/**
 * POS Webhook Sync — HMAC-SHA256 Signature Utilities
 *
 * Signs webhook payloads using HMAC-SHA256 (Stripe/GitHub model).
 * Signature covers timestamp + raw body to prevent replay attacks.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §2.5
 */

import crypto from 'crypto';

const SECRET_PREFIX = 'whsec_';

/**
 * Generate a new webhook signing secret
 * Format: whsec_{64 hex chars} (32 random bytes)
 */
export function generateWebhookSecret(): string {
    return `${SECRET_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Sign a webhook payload with HMAC-SHA256
 *
 * Signature input = "{timestamp}.{rawBody}" to prevent replay attacks.
 * POS should verify: HMAC(timestamp + "." + rawBody) matches signature header.
 *
 * @param rawBody - The raw JSON string body (NOT parsed+re-stringified)
 * @param secret - The webhook secret (whsec_...)
 * @param timestamp - Unix timestamp in seconds
 * @returns hex-encoded HMAC-SHA256 signature
 */
export function signPayload(rawBody: string, secret: string, timestamp: number): string {
    const signatureInput = `${timestamp}.${rawBody}`;
    return crypto
        .createHmac('sha256', secret)
        .update(signatureInput)
        .digest('hex');
}

/**
 * Verify a webhook signature (used in test webhook route)
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifySignature(
    rawBody: string,
    secret: string,
    timestamp: number,
    signature: string,
): boolean {
    const expected = signPayload(rawBody, secret, timestamp);
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected),
        );
    } catch {
        return false;
    }
}

/**
 * Generate a unique delivery ID
 * Format: del_{timestamp}_{random}
 */
export function generateDeliveryId(): string {
    const ts = Date.now().toString(36);
    const rand = crypto.randomBytes(6).toString('hex');
    return `del_${ts}_${rand}`;
}

import {
  getBoundedSecurityStringContext,
  logSecurityDiagnostic,
  logSecurityFailure,
} from '@lib/security/securityDiagnostics';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Validates the signature of a Razorpay webhook request using HMAC-SHA256
 * 
 * Security Features:
 * - HMAC-SHA256 signature verification
 * - Timing-safe comparison (prevents timing attacks)
 * - Security event logging
 * - Protection against webhook spoofing
 * 
 * OWASP Coverage:
 * - A02: Cryptographic Failures (secure signature verification)
 * - A04: Insecure Design (prevents webhook spoofing)
 * - A07: Authentication Failures (validates source)
 * 
 * @param requestBody The raw request body string from the webhook
 * @param signature The value of the 'x-razorpay-signature' header
 * @param secret The webhook secret from your Razorpay dashboard
 * @returns A promise that resolves to true if the signature is valid, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = await validateRazorpayWebhookSignature(
 *     requestBody,
 *     headers().get('x-razorpay-signature'),
 *     process.env.RAZORPAY_WEBHOOK_SECRET
 * );
 * 
 * if (!isValid) {
 *     return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
 * }
 * ```
 */
export async function validateRazorpayWebhookSignature(
  requestBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!requestBody || !signature || !secret) {
      logSecurityDiagnostic('razorpay_webhook_validator_missing_parameters', {
        hasBody: !!requestBody,
        hasSignature: !!signature,
        hasSecret: !!secret,
        ...getBoundedSecurityStringContext('provider', 'razorpay'),
      });
      return false;
    }

    // 1. Create an HMAC-SHA256 hash using the webhook secret
    const hmac = createHmac('sha256', secret);

    // 2. Update the HMAC with the raw request body
    hmac.update(requestBody);

    // 3. Generate the expected signature in hexadecimal format
    const generatedSignature = hmac.digest('hex');

    // 4. Compare signatures using timing-safe comparison
    // This prevents timing attacks where attackers measure response time
    // to guess the signature byte-by-byte
    const generatedBuffer = Buffer.from(generatedSignature, 'utf-8');
    const receivedBuffer = Buffer.from(signature, 'utf-8');

    // Lengths must match for timingSafeEqual
    if (generatedBuffer.length !== receivedBuffer.length) {
      logSecurityDiagnostic('razorpay_webhook_validator_signature_length_mismatch', {
        expectedLength: generatedBuffer.length,
        receivedLength: receivedBuffer.length,
        ...getBoundedSecurityStringContext('provider', 'razorpay'),
      });
      return false;
    }

    // Timing-safe comparison
    const isValid = timingSafeEqual(generatedBuffer, receivedBuffer);

    if (!isValid) {
      logSecurityDiagnostic('razorpay_webhook_validator_invalid_signature', {
        signatureLength: signature.length,
        ...getBoundedSecurityStringContext('provider', 'razorpay'),
      });
    }

    return isValid;
  } catch (error) {
    logSecurityFailure('razorpay_webhook_validator_validation_failed', error, {
      ...getBoundedSecurityStringContext('provider', 'razorpay'),
    });
    return false;
  }
}

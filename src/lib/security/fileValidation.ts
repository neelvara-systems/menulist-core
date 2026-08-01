/**
 * Server-Side File Upload Validation
 * ═══════════════════════════════════════════════════════════════
 * 
 * OWASP A04: Insecure Design
 * OWASP A08: Software and Data Integrity Failures
 * 
 * Validates file uploads by checking:
 * 1. Magic bytes (file signatures) - not just extension
 * 2. File size limits
 * 3. File type allowlist
 * 4. Prevents malicious file uploads
 * 
 * NEVER trust client-side validation alone!
 */

import {
    ALLOWED_MIME_TYPES,
    MAX_IMAGE_SIZE,
    MAX_PDF_SIZE
} from '@template/main-app/projects/constants';
import { FILE_SIGNATURES } from './fileSignatures';
import {
    getBoundedSecurityStringContext,
    logSecurityDiagnostic,
    logSecurityFailure,
} from './securityDiagnostics';

/**
 * Maximum file sizes (in bytes)
 * Uses constants from projects/constants.ts for consistency
 */
export const MAX_FILE_SIZES: Record<string, number> = {
    'image/jpeg': MAX_IMAGE_SIZE,  // 10MB
    'image/png': MAX_IMAGE_SIZE,   // 10MB
    'image/webp': MAX_IMAGE_SIZE,  // 10MB
    'image/gif': MAX_IMAGE_SIZE,   // 10MB
    'application/pdf': MAX_PDF_SIZE, // 50MB (matches client-side limit)
};

/**
 * Check if bytes match a signature pattern
 * Supports null as wildcard (matches any byte)
 */
function matchesSignature(bytes: Uint8Array, signature: readonly (number | null)[]): boolean {
    if (bytes.length < signature.length) return false;

    for (let i = 0; i < signature.length; i++) {
        const expected = signature[i];
        if (expected === null) continue; // Wildcard
        if (bytes[i] !== expected) return false;
    }

    return true;
}

/**
 * Detect file type from magic bytes
 * More reliable than checking file extension
 */
export function detectFileType(buffer: ArrayBuffer | Uint8Array): string | null {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

    // Check against known signatures
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
        if (mimeType === 'image/webp') {
            if (
                bytes.length >= 12
                && matchesSignature(bytes, signatures[0])
                && bytes[8] === 0x57
                && bytes[9] === 0x45
                && bytes[10] === 0x42
                && bytes[11] === 0x50
            ) {
                return mimeType;
            }
            continue;
        }
        for (const signature of signatures) {
            if (matchesSignature(bytes, signature)) {
                return mimeType;
            }
        }
    }

    return null;
}

/**
 * Validate file upload (server-side)
 * 
 * @param file - File buffer or Blob
 * @param claimedType - MIME type claimed by client
 * @param claimedSize - File size claimed by client
 * @returns Validation result with error message if invalid
 * 
 * @example
 * ```typescript
 * const result = await validateFileUpload(fileBuffer, 'image/jpeg', fileSize);
 * if (!result.valid) {
 *     return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * ```
 */
export async function validateFileUpload(
    file: ArrayBuffer | Uint8Array | Blob,
    claimedType: string,
    claimedSize: number
): Promise<{ valid: true } | { valid: false; error: string }> {
    try {
        // 1. Check if file type is allowed
        if (!ALLOWED_MIME_TYPES.includes(claimedType)) {
            logSecurityDiagnostic('file_validation_disallowed_type_blocked', {
                allowedTypeCount: ALLOWED_MIME_TYPES.length,
                ...getBoundedSecurityStringContext('claimedType', claimedType),
            });
            return {
                valid: false,
                error: `File type ${claimedType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
            };
        }

        // 2. Check file size
        const maxSize = MAX_FILE_SIZES[claimedType];
        if (!maxSize) {
            return { valid: false, error: 'Unknown file type' };
        }

        if (!Number.isSafeInteger(claimedSize) || claimedSize <= 0) {
            return { valid: false, error: 'Invalid file size' };
        }

        if (claimedSize > maxSize) {
            return {
                valid: false,
                error: `File size (${(claimedSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`
            };
        }

        // 3. Convert to ArrayBuffer if Blob
        let buffer: ArrayBuffer | Uint8Array;
        if (file instanceof Blob) {
            if (file.size !== claimedSize || file.size > maxSize) {
                return { valid: false, error: 'File size does not match uploaded content' };
            }
            buffer = await file.arrayBuffer();
        } else {
            buffer = file;
        }
        const actualSize = buffer.byteLength;
        if (actualSize !== claimedSize || actualSize <= 0 || actualSize > maxSize) {
            return { valid: false, error: 'File size does not match uploaded content' };
        }

        // 4. Verify magic bytes (file signature)
        const detectedType = detectFileType(buffer);

        if (!detectedType) {
            logSecurityDiagnostic('file_validation_magic_type_missing', {
                fileSize: claimedSize,
                ...getBoundedSecurityStringContext('claimedType', claimedType),
            });
            return {
                valid: false,
                error: 'Could not verify file type. File may be corrupted or invalid.'
            };
        }

        // 5. Verify claimed type matches actual type
        if (detectedType !== claimedType) {
            logSecurityDiagnostic('file_validation_type_mismatch', {
                severity: 'high', // Potential attack attempt
                ...getBoundedSecurityStringContext('claimedType', claimedType),
                ...getBoundedSecurityStringContext('detectedType', detectedType),
            });
            return {
                valid: false,
                error: `File type mismatch. Claimed: ${claimedType}, Detected: ${detectedType}`
            };
        }

        // 6. Additional checks for images (prevent SVG bombs, etc.)
        if (detectedType.startsWith('image/')) {
            const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

            // Check for embedded scripts in image metadata (basic check)
            const fileContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            if (fileContent.includes('<script') || fileContent.includes('javascript:')) {
                logSecurityDiagnostic('file_validation_embedded_script_blocked', {
                    severity: 'critical',
                    ...getBoundedSecurityStringContext('detectedType', detectedType),
                });
                return {
                    valid: false,
                    error: 'Image contains potentially malicious content'
                };
            }
        }

        // All checks passed
        return { valid: true };

    } catch (error) {
        logSecurityFailure('file_validation_failed', error, {
            claimedSize,
            ...getBoundedSecurityStringContext('claimedType', claimedType),
        });
        return {
            valid: false,
            error: 'File validation failed due to an internal error'
        };
    }
}

/**
 * Sanitize filename to prevent path traversal
 * 
 * @param filename - Original filename
 * @returns Safe filename
 * 
 * @example
 * ```typescript
 * const safeFilename = sanitizeFilename('../../etc/passwd.jpg');
 * // Returns: 'etcpasswd.jpg'
 * ```
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/\.\./g, '') // Remove path traversal
        .replace(/[/\\]/g, '') // Remove path separators
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
        .slice(0, 255); // Limit length
}

/**
 * Get safe file extension from filename
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1].toLowerCase();
}

/**
 * Validate that file extension matches MIME type
 */
export function validateFileExtension(filename: string, mimeType: string): boolean {
    const extension = getFileExtension(filename);

    const expectedExtensions: Record<string, string[]> = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/gif': ['gif'],
        'image/webp': ['webp'],
        'application/pdf': ['pdf'],
    };

    const expected = expectedExtensions[mimeType];
    if (!expected) return false;

    return expected.includes(extension);
}

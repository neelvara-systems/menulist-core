/**
 * Magic Bytes Validator
 * 
 * Validates file types by checking the actual file content (magic bytes/file signature)
 * instead of relying on file extension or MIME type, which can be easily spoofed.
 * 
 * This is a CRITICAL security layer for file uploads.
 * 
 * Used by: imageUploadInput component (base64 validation)
 * 
 * @see https://en.wikipedia.org/wiki/List_of_file_signatures
 */

import { FILE_SIGNATURES } from './fileSignatures';

/**
 * Convert base64 data URL to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

    // Decode base64 to binary string
    const binaryString = atob(base64Data);

    // Convert binary string to ArrayBuffer
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}

/**
 * Check if byte array matches one of the expected signatures
 */
function matchesSignature(bytes: Uint8Array, signatures: readonly (readonly number[])[]): boolean {
    return signatures.some(signature => {
        if (bytes.length < signature.length) return false;

        return signature.every((byte, index) => bytes[index] === byte);
    });
}

/**
 * Validate WebP file (requires special handling)
 * WebP files start with "RIFF" but need "WEBP" at offset 8
 */
function isValidWebP(bytes: Uint8Array): boolean {
    if (bytes.length < 12) return false;

    // Check RIFF header
    const riffMatch = [0x52, 0x49, 0x46, 0x46].every((byte, i) => bytes[i] === byte);

    // Check WEBP signature at offset 8
    const webpMatch = [0x57, 0x45, 0x42, 0x50].every((byte, i) => bytes[i + 8] === byte);

    return riffMatch && webpMatch;
}

/**
 * Validate file type by checking magic bytes
 * 
 * @param base64OrArrayBuffer - Base64 string or ArrayBuffer
 * @param expectedMimeType - Expected MIME type (e.g., "image/jpeg")
 * @returns Object with validation result and details
 * 
 * @example
 * ```typescript
 * const result = await validateMagicBytes(base64Data, 'image/jpeg');
 * if (!result.valid) {
 *     console.error(result.error);
 * }
 * ```
 */
export function validateMagicBytes(
    base64OrArrayBuffer: string | ArrayBuffer,
    expectedMimeType: string
): { valid: boolean; error?: string; detectedType?: string } {
    try {
        // Convert to ArrayBuffer if base64
        const arrayBuffer = typeof base64OrArrayBuffer === 'string'
            ? base64ToArrayBuffer(base64OrArrayBuffer)
            : base64OrArrayBuffer;

        const bytes = new Uint8Array(arrayBuffer);

        // Check if file is too small
        if (bytes.length < 4) {
            return {
                valid: false,
                error: 'File is too small to validate (corrupted or empty file)'
            };
        }

        // Normalize MIME type
        const mimeType = expectedMimeType.toLowerCase() as keyof typeof FILE_SIGNATURES;

        // Check if we support this MIME type
        if (!FILE_SIGNATURES[mimeType]) {
            return {
                valid: false,
                error: `Unsupported file type: ${expectedMimeType}. Only JPEG, PNG, WebP, and GIF are allowed.`
            };
        }

        // Special handling for WebP
        if (mimeType === 'image/webp') {
            if (isValidWebP(bytes)) {
                return { valid: true };
            } else {
                return {
                    valid: false,
                    error: 'File is not a valid WebP image (magic bytes mismatch)',
                    detectedType: 'unknown'
                };
            }
        }

        // Check if magic bytes match expected type
        const signatures = FILE_SIGNATURES[mimeType];
        if (matchesSignature(bytes, signatures)) {
            return { valid: true };
        }

        // Try to detect actual file type if mismatch
        let detectedType = 'unknown';
        for (const [type, sigs] of Object.entries(FILE_SIGNATURES)) {
            if (type === 'image/webp') {
                if (isValidWebP(bytes)) {
                    detectedType = type;
                    break;
                }
            } else if (matchesSignature(bytes, sigs)) {
                detectedType = type;
                break;
            }
        }

        return {
            valid: false,
            error: `File type mismatch! Expected ${expectedMimeType}, but file appears to be ${detectedType}. This could be a malicious file.`,
            detectedType
        };

    } catch (error) {
        console.error('Magic bytes validation error:', error);
        return {
            valid: false,
            error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Validate file size
 * 
 * @param sizeInBytes - File size in bytes
 * @param maxSizeInMB - Maximum allowed size in MB (default: 10MB)
 * @returns Object with validation result
 */
export function validateFileSize(
    sizeInBytes: number,
    maxSizeInMB: number = 10
): { valid: boolean; error?: string } {
    const maxBytes = maxSizeInMB * 1024 * 1024;

    if (sizeInBytes > maxBytes) {
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            error: `File too large: ${sizeInMB}MB. Maximum allowed: ${maxSizeInMB}MB.`
        };
    }

    if (sizeInBytes === 0) {
        return {
            valid: false,
            error: 'File is empty (0 bytes)'
        };
    }

    return { valid: true };
}

/**
 * Comprehensive file validation (magic bytes + size + MIME type)
 * 
 * @param file - File object from input or base64 data
 * @param options - Validation options
 * @returns Promise with validation result
 * 
 * @example
 * ```typescript
 * const result = await validateImageFile({
 *     base64: imageData,
 *     mimeType: 'image/jpeg',
 *     size: 5242880,
 *     maxSizeMB: 10
 * });
 * 
 * if (!result.valid) {
 *     alert(result.error);
 * }
 * ```
 */
export async function validateImageFile(options: {
    base64: string;
    mimeType: string;
    size: number;
    maxSizeMB?: number;
}): Promise<{ valid: boolean; error?: string }> {
    const { base64, mimeType, size, maxSizeMB = 10 } = options;

    // 1. Validate MIME type (whitelist)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType.toLowerCase())) {
        return {
            valid: false,
            error: `Invalid file type: ${mimeType}. Only JPEG, PNG, WebP, and GIF are allowed.`
        };
    }

    // 2. Validate file size
    const sizeValidation = validateFileSize(size, maxSizeMB);
    if (!sizeValidation.valid) {
        return sizeValidation;
    }

    // 3. Validate magic bytes (actual file content)
    const magicBytesValidation = validateMagicBytes(base64, mimeType);
    if (!magicBytesValidation.valid) {
        return magicBytesValidation;
    }

    return { valid: true };
}

/**
 * Get file size from base64 string
 */
export function getBase64FileSize(base64: string): number {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

    // Calculate size (base64 is ~1.37x original size)
    const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
    const sizeInBytes = (base64Data.length * 0.75) - padding;

    return Math.round(sizeInBytes);
}

/**
 * Validate image dimensions (optional, for UX)
 * 
 * @param base64 - Base64 image data
 * @returns Promise with dimensions and validation result
 */
export function validateImageDimensions(
    base64: string,
    options?: {
        maxWidth?: number;
        maxHeight?: number;
        minWidth?: number;
        minHeight?: number;
    }
): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            const { maxWidth, maxHeight, minWidth, minHeight } = options || {};

            // Check minimum dimensions
            if (minWidth && img.width < minWidth) {
                resolve({
                    valid: false,
                    error: `Image width too small: ${img.width}px. Minimum: ${minWidth}px.`,
                    width: img.width,
                    height: img.height
                });
                return;
            }

            if (minHeight && img.height < minHeight) {
                resolve({
                    valid: false,
                    error: `Image height too small: ${img.height}px. Minimum: ${minHeight}px.`,
                    width: img.width,
                    height: img.height
                });
                return;
            }

            // Check maximum dimensions
            if (maxWidth && img.width > maxWidth) {
                resolve({
                    valid: false,
                    error: `Image width too large: ${img.width}px. Maximum: ${maxWidth}px.`,
                    width: img.width,
                    height: img.height
                });
                return;
            }

            if (maxHeight && img.height > maxHeight) {
                resolve({
                    valid: false,
                    error: `Image height too large: ${img.height}px. Maximum: ${maxHeight}px.`,
                    width: img.width,
                    height: img.height
                });
                return;
            }

            resolve({
                valid: true,
                width: img.width,
                height: img.height
            });
        };

        img.onerror = () => {
            resolve({
                valid: false,
                error: 'Failed to load image (corrupted or invalid format)'
            });
        };

        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
}

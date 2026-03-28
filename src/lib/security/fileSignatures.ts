/**
 * File Signature Definitions (Magic Bytes)
 * 
 * Shared constants for file type validation across the application.
 * These are the first few bytes that identify the actual file type,
 * regardless of file extension or MIME type declaration.
 * 
 * @see https://en.wikipedia.org/wiki/List_of_file_signatures
 */

/**
 * Standard file signatures (no wildcards)
 * Used by most validation functions
 */
export const FILE_SIGNATURES = {
    'image/jpeg': [
        [0xFF, 0xD8, 0xFF, 0xE0], // JPEG JFIF
        [0xFF, 0xD8, 0xFF, 0xE1], // JPEG Exif
        [0xFF, 0xD8, 0xFF, 0xE2], // JPEG Canon
        [0xFF, 0xD8, 0xFF, 0xE3], // JPEG
        [0xFF, 0xD8, 0xFF, 0xDB], // JPEG Samsung
    ],
    'image/png': [
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG (full 8-byte signature)
    ],
    'image/webp': [
        [0x52, 0x49, 0x46, 0x46] // RIFF (WebP container, requires additional check at offset 8)
    ],
    'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
    ],
    'application/pdf': [
        [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF- (5-byte signature)
    ],
} as const;

/**
 * File signatures with wildcards (for FileReader-based validation)
 * Null values represent "any byte" - useful for RIFF container formats
 * 
 * Used by projects feature validation
 */
export const FILE_SIGNATURES_WITH_WILDCARDS: Record<string, (number | null)[][]> = {
    'image/jpeg': [
        [0xFF, 0xD8, 0xFF, 0xE0], // JPEG JFIF
        [0xFF, 0xD8, 0xFF, 0xE1], // JPEG Exif
        [0xFF, 0xD8, 0xFF, 0xE2], // JPEG
        [0xFF, 0xD8, 0xFF, 0xE3], // JPEG
    ],
    'image/png': [
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG (full 8-byte signature)
    ],
    'image/webp': [
        [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], // RIFF....WEBP (null = any byte)
    ],
    'application/pdf': [
        [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF- (5-byte signature)
    ],
} as const;

/**
 * Get file type description for error messages
 */
export function getFileTypeDescription(mimeType: string): string {
    const typeMap: Record<string, string> = {
        'image/jpeg': 'JPEG',
        'image/png': 'PNG',
        'image/webp': 'WebP',
        'image/gif': 'GIF',
        'application/pdf': 'PDF'
    };
    return typeMap[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
}

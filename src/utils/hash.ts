/**
 * DJB2 hash function for generating consistent string hashes
 * Used for creating unique cache keys from image URLs
 * 
 * This is a simple, fast, non-cryptographic hash function
 * suitable for generating cache keys and avoiding long URL strings
 * 
 * @param str - String to hash
 * @returns Hash as unsigned 32-bit integer string
 * 
 * @example
 * ```typescript
 * const hash = hashString('https://storage.googleapis.com/bucket/image.png');
 * console.log(hash); // "2847562934"
 * ```
 */
export function hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return String(hash >>> 0); // Convert to unsigned 32-bit integer string
}

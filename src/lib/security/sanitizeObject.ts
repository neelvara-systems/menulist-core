/**
 * Security: Sanitize objects to prevent prototype pollution
 * 
 * Removes dangerous keys that can cause prototype pollution attacks:
 * - __proto__
 * - constructor
 * - prototype
 */

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;

/**
 * Remove dangerous prototype pollution keys from an object
 * 
 * @param data - Object to sanitize
 * @returns New object with dangerous keys removed
 * 
 * @example
 * ```typescript
 * const dbData = doc.data();
 * const safe = removeDangerousKeys(dbData);
 * ```
 */
export function removeDangerousKeys<T extends Record<string, any>>(data: T): Partial<T> {
    const safeData: any = {};
    
    for (const key in data) {
        // Skip dangerous keys
        if (!DANGEROUS_KEYS.includes(key as any)) {
            safeData[key] = data[key];
        }
    }
    
    return safeData;
}

/**
 * Remove specific keys from an object (including dangerous keys)
 * 
 * @param data - Object to filter
 * @param excludeKeys - Array of keys to exclude
 * @returns New object with specified keys removed
 * 
 * @example
 * ```typescript
 * const filtered = removeKeys(userData, [
 *     'scope', 'providerAccountId', 'token_type',
 *     ...DANGEROUS_KEYS  // Always include these
 * ]);
 * ```
 */
export function removeKeys<T extends Record<string, any>>(
    data: T, 
    excludeKeys: readonly string[]
): Partial<T> {
    const excludeSet = new Set(excludeKeys);
    const safeData: any = {};
    
    for (const key in data) {
        if (!excludeSet.has(key)) {
            safeData[key] = data[key];
        }
    }
    
    return safeData;
}

// Export dangerous keys constant for reuse
export { DANGEROUS_KEYS };

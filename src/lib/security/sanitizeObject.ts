/**
 * Security: Sanitize objects to prevent prototype pollution
 * 
 * Removes dangerous keys that can cause prototype pollution attacks:
 * - __proto__
 * - constructor
 * - prototype
 */

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;
const DANGEROUS_KEY_SET = new Set<string>(DANGEROUS_KEYS);

const copyOwnSafeProperties = <T extends Record<string, unknown>>(
    data: T,
    excludedKeys: ReadonlySet<string>,
): Partial<T> => {
    const safeData: Partial<T> = {};
    let keys: string[];

    try {
        keys = Object.keys(data);
    } catch {
        return safeData;
    }

    for (const key of keys) {
        if (DANGEROUS_KEY_SET.has(key) || excludedKeys.has(key)) continue;

        try {
            Object.defineProperty(safeData, key, {
                configurable: true,
                enumerable: true,
                value: Reflect.get(data, key),
                writable: true,
            });
        } catch {
            // A malformed accessor must not break authentication/session reads.
        }
    }

    return safeData;
};

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
export function removeDangerousKeys<T extends Record<string, unknown>>(data: T): Partial<T> {
    return copyOwnSafeProperties(data, DANGEROUS_KEY_SET);
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
export function removeKeys<T extends Record<string, unknown>>(
    data: T, 
    excludeKeys: readonly string[]
): Partial<T> {
    return copyOwnSafeProperties(data, new Set(excludeKeys));
}

// Export dangerous keys constant for reuse
export { DANGEROUS_KEYS };

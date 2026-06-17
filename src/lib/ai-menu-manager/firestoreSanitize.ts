export function sanitizeAiMenuManagerFirestoreValue<T>(value: T): T {
    if (value === undefined) return undefined as T;
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        return value
            .map((entry) => sanitizeAiMenuManagerFirestoreValue(entry))
            .filter((entry) => entry !== undefined) as T;
    }

    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
        const sanitized = sanitizeAiMenuManagerFirestoreValue(entry);
        if (sanitized !== undefined) {
            result[key] = sanitized;
        }
    });
    return result as T;
}

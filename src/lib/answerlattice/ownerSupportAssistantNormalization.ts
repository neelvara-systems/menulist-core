export const normalizeAnswerlatticeOwnerAssistantTimestamp = (value: unknown): string | null => {
    try {
        if (typeof value === "string") {
            const millis = Date.parse(value);
            return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
        }
        if (value instanceof Date) {
            return Number.isFinite(value.getTime()) ? value.toISOString() : null;
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        const toDate = Reflect.get(value, "toDate");
        if (typeof toDate !== "function") return null;
        const date = Reflect.apply(toDate, value, []);
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

export const normalizeAnswerlatticeOwnerAssistantCount = (
    value: unknown,
    maximum: number = 1_000_000,
): number => {
    if (
        typeof value !== "number"
        || !Number.isSafeInteger(value)
        || value < 0
        || !Number.isSafeInteger(maximum)
        || maximum < 0
    ) return 0;
    return Math.min(maximum, value);
};

export function normalizeMobileMenuUpdatedAt(value: unknown): Date | undefined {
    try {
        let date: Date;
        if (value instanceof Date) {
            date = value;
        } else if (typeof value === 'string' || typeof value === 'number') {
            date = new Date(value);
        } else if (
            value !== null
            && typeof value === 'object'
            && 'toDate' in value
            && typeof value.toDate === 'function'
        ) {
            const converted = value.toDate();
            if (!(converted instanceof Date)) return undefined;
            date = converted;
        } else {
            return undefined;
        }

        return Number.isFinite(date.getTime()) ? date : undefined;
    } catch {
        return undefined;
    }
}

export function normalizeMobileMenuVersion(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : undefined;
}

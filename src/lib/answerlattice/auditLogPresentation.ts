const toValidDate = (value: unknown): Date | null => {
    try {
        if (value instanceof Date) {
            return Number.isFinite(value.getTime()) ? value : null;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            const date = new Date(value);
            return Number.isFinite(date.getTime()) ? date : null;
        }
        if (typeof value === 'string' && value.trim()) {
            const date = new Date(value);
            return Number.isFinite(date.getTime()) ? date : null;
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const toDate = (value as { toDate?: unknown }).toDate;
        if (typeof toDate !== 'function') return null;
        const converted = toDate.call(value) as unknown;
        return converted instanceof Date && Number.isFinite(converted.getTime())
            ? converted
            : null;
    } catch {
        return null;
    }
};

export function formatAnswerlatticeAuditTimestamp(value: unknown): string {
    const date = toValidDate(value);
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const getBoundedText = (value: unknown): string | null => (
    typeof value === 'string' && value.trim()
        ? value.trim().slice(0, 500)
        : null
);

export function getAnswerlatticeAuditStateSummary(value: unknown): string {
    try {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
        const state = value as Record<string, unknown>;
        const reason = getBoundedText(state.reason);
        if (reason) return reason;
        const driftReason = getBoundedText(state.driftReason);
        if (driftReason) return driftReason;
        if (Array.isArray(state.driftClasses)) {
            const classes = state.driftClasses
                .map(getBoundedText)
                .filter((entry): entry is string => Boolean(entry))
                .slice(0, 10);
            if (classes.length > 0) return `Classes: ${classes.join(', ')}`;
        }
        const mutationType = getBoundedText(state.mutationType);
        return mutationType ? `Type: ${mutationType}` : '';
    } catch {
        return '';
    }
}

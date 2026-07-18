function normalizeTrustSignalDate(value: any): Date | null {
    if (!value) return null;

    let date: Date;
    if (typeof value?.toDate === 'function') {
        date = value.toDate();
    } else if (typeof value?.seconds === 'number' && Number.isFinite(value.seconds)) {
        date = new Date(value.seconds * 1000);
    } else if (typeof value === 'string') {
        date = new Date(value);
    } else if (value instanceof Date) {
        date = value;
    } else {
        return null;
    }

    return Number.isFinite(date.getTime()) ? date : null;
}

export function getTrustSignalFreshnessText(
    lastPublishedAt: any,
    now: Date = new Date(),
): string | null {
    const date = normalizeTrustSignalDate(lastPublishedAt);
    if (!date || !Number.isFinite(now.getTime())) return null;

    const diffMs = now.getTime() - date.getTime();
    if (diffMs < -5 * 60 * 1000) return null;

    const diffDays = Math.floor(Math.max(0, diffMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'Updated today';
    if (diffDays <= 30) {
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        return `Updated ${month} ${date.getDate()}`;
    }
    return null;
}

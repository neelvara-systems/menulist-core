function normalizeTrustSignalDate(value: unknown): Date | null {
    if (!value) return null;

    try {
        let date: Date;
        if (value instanceof Date) {
            date = value;
        } else if (typeof value === 'string') {
            date = new Date(value);
        } else if (typeof value === 'object') {
            const toDate = Reflect.get(value, 'toDate');
            if (typeof toDate === 'function') {
                const projected = Reflect.apply(toDate, value, []);
                if (!(projected instanceof Date)) return null;
                date = projected;
            } else {
                const seconds = Reflect.get(value, 'seconds');
                if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
                date = new Date(seconds * 1000);
            }
        } else {
            return null;
        }

        return Number.isFinite(date.getTime()) ? date : null;
    } catch {
        return null;
    }
}

const normalizeTrustSignalLocationPart = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const withoutControls = Array.from(value.normalize('NFKC'), (character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint <= 31 || codePoint === 127 ? ' ' : character;
    }).join('');
    return withoutControls
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
        .trim();
};

export function getTrustSignalLocationText(area: unknown, city: unknown): string | null {
    const normalizedArea = normalizeTrustSignalLocationPart(area);
    const normalizedCity = normalizeTrustSignalLocationPart(city);
    if (
        normalizedArea
        && normalizedCity
        && normalizedArea.localeCompare(normalizedCity, undefined, { sensitivity: 'base' }) !== 0
    ) {
        return `${normalizedArea}, ${normalizedCity}`;
    }
    return normalizedArea || normalizedCity || null;
}

export function getTrustSignalFreshnessText(
    lastPublishedAt: unknown,
    now: Date = new Date(),
    options?: {
        locale?: string;
        updatedToday?: string;
        updatedOn?: (date: string) => string;
    },
): string | null {
    const date = normalizeTrustSignalDate(lastPublishedAt);
    if (!date || !Number.isFinite(now.getTime())) return null;

    const diffMs = now.getTime() - date.getTime();
    if (diffMs < -5 * 60 * 1000) return null;

    const diffDays = Math.floor(Math.max(0, diffMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return options?.updatedToday || 'Updated today';
    if (diffDays <= 30) {
        const formattedDate = date.toLocaleDateString(options?.locale || 'en-US', {
            day: 'numeric',
            month: 'short',
        });
        return options?.updatedOn
            ? options.updatedOn(formattedDate)
            : `Updated ${formattedDate}`;
    }
    return null;
}

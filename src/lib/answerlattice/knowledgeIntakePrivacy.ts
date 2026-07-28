type AnswerlatticeIntakeMetadataOptions = {
    maxDepth?: number;
    maxEntries?: number;
    maxStringLength?: number;
};

const cleanMetadataText = (value: unknown, maxLength: number) => {
    try {
        return String(value ?? '')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLength);
    } catch {
        return '';
    }
};

const stringifyMetadataValue = (value: unknown): string => {
    try {
        return JSON.stringify(value);
    } catch {
        return cleanMetadataText(value, 1_000);
    }
};

export const redactAnswerlatticeIntakeText = (value: unknown): { text: string; redactionCount: number } => {
    let text = String(value || '');
    let redactionCount = 0;

    const apply = (pattern: RegExp, replacement: string | ((substring: string, ...args: any[]) => string)) => {
        text = text.replace(pattern, (...args) => {
            redactionCount += 1;
            return typeof replacement === 'function' ? replacement(...args) : replacement;
        });
    };

    apply(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]');
    apply(/\b(?:\d[ -]*?){13,19}\b/g, '[redacted-card]');
    apply(/\b(?:sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,})\b/g, '[redacted-token]');
    apply(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[redacted-jwt]');
    apply(/\b(?:password|passcode|secret|client_secret|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization)\b\s*[:=]\s*["']?[^"'\s]{6,}/gi, (match: string) => {
        const label = match.split(/[:=]/)[0]?.trim() || 'secret';
        return `${label}: [redacted]`;
    });

    return { text, redactionCount };
};

export const sanitizeAnswerlatticeIntakeMetadata = (
    value: unknown,
    options: AnswerlatticeIntakeMetadataOptions = {},
): Record<string, any> => {
    const maxDepth = Math.min(Math.max(options.maxDepth ?? 2, 0), 4);
    const maxEntries = Math.min(Math.max(options.maxEntries ?? 20, 1), 40);
    const maxStringLength = Math.min(Math.max(options.maxStringLength ?? 500, 1), 1_000);

    const sanitizeValue = (nested: unknown, depth: number): any => {
        if (nested === undefined || nested === null) return null;
        if (typeof nested === 'string') {
            return cleanMetadataText(redactAnswerlatticeIntakeText(nested).text, maxStringLength);
        }
        if (typeof nested === 'number') return Number.isFinite(nested) ? nested : null;
        if (typeof nested === 'boolean') return nested;
        if (nested instanceof Date) {
            const millis = nested.getTime();
            return Number.isFinite(millis) ? nested.toISOString() : null;
        }
        if (depth >= maxDepth) {
            return cleanMetadataText(
                redactAnswerlatticeIntakeText(stringifyMetadataValue(nested)).text,
                maxStringLength,
            );
        }
        if (Array.isArray(nested)) {
            return nested.slice(0, maxEntries).map(item => sanitizeValue(item, depth + 1));
        }
        if (typeof nested === 'object') {
            try {
                return Object.fromEntries(Object.entries(nested as Record<string, unknown>)
                    .slice(0, maxEntries)
                    .map(([key, item]) => [cleanMetadataText(key, 80), sanitizeValue(item, depth + 1)])
                    .filter(([key]) => Boolean(key)));
            } catch {
                return null;
            }
        }
        return cleanMetadataText(redactAnswerlatticeIntakeText(nested).text, Math.min(maxStringLength, 200));
    };

    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    try {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .slice(0, maxEntries)
            .map(([key, nested]) => [cleanMetadataText(key, 80), sanitizeValue(nested, 0)])
            .filter(([key]) => Boolean(key)));
    } catch {
        return {};
    }
};

/**
 * Parse a stored price only when it represents one numeric value.
 *
 * Text prices ("Market Price") and ranges ("199-249") are valid display
 * values, but they must not participate in arithmetic or outlier detection.
 */
export function parseSingleMenuPrice(
    price: number | string | null | undefined,
): number | null {
    if (typeof price === 'number') {
        return Number.isFinite(price) ? price : null;
    }

    if (typeof price !== 'string') return null;

    const normalized = price.trim().replace(/[₹$€£¥,\s]/g, '');
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeMenuPrice(price: number | string | null | undefined): number {
    return parseSingleMenuPrice(price) ?? 0;
}

export function formatMenuPrice(
    price: number | string | null | undefined,
    currencySymbol = '₹',
    options?: { fractionDigits?: number }
): string {
    if (typeof price === 'string') {
        const rawPrice = price.trim();
        const normalizedSingleValue = rawPrice.replace(/[₹$€£¥,\s]/g, '');
        const isSingleNumericPrice = /^-?\d+(\.\d+)?$/.test(normalizedSingleValue);
        if (rawPrice && !isSingleNumericPrice) {
            const rangeCandidate = rawPrice.replace(/[₹$€£¥,]/g, '').trim();
            if (/^\d+(\.\d+)?\s*[-/–—]\s*\d+(\.\d+)?$/.test(rangeCandidate)) {
                return `${currencySymbol || ''}${rangeCandidate.replace(/\s*([-\/–—])\s*/g, '$1')}`;
            }
            return rawPrice;
        }
    }

    const normalized = normalizeMenuPrice(price);
    const symbol = currencySymbol || '';

    if (typeof options?.fractionDigits === 'number') {
        return `${symbol}${normalized.toFixed(options.fractionDigits)}`;
    }

    return `${symbol}${normalized}`;
}

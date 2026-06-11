export function normalizeMenuPrice(price: number | string | null | undefined): number {
    if (typeof price === 'number') {
        return Number.isFinite(price) ? price : 0;
    }

    if (typeof price === 'string') {
        const parsed = Number(price.trim().replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
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
            if (/^\d+(\.\d+)?\s*[-/]\s*\d+(\.\d+)?$/.test(rangeCandidate)) {
                return `${currencySymbol || ''}${rangeCandidate.replace(/\s*([-\/])\s*/g, '$1')}`;
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

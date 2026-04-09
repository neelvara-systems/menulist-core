export function normalizeMenuPrice(price: number | string | null | undefined): number {
    if (typeof price === 'number') {
        return Number.isFinite(price) ? price : 0;
    }

    if (typeof price === 'string') {
        const parsed = Number(price.trim());
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

export function formatMenuPrice(
    price: number | string | null | undefined,
    currencySymbol = '$',
    options?: { fractionDigits?: number }
): string {
    const normalized = normalizeMenuPrice(price);

    if (typeof options?.fractionDigits === 'number') {
        return `${currencySymbol}${normalized.toFixed(options.fractionDigits)}`;
    }

    return `${currencySymbol}${normalized}`;
}

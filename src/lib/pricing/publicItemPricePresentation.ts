import { formatMenuPrice, parseSingleMenuPrice } from './formatMenuPrice';
import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

export type ActivePublicItemPriceAttribute = {
    active?: boolean;
    id?: unknown;
    name?: unknown;
    price?: unknown;
};

function hasDisplayPrice(value: unknown): value is string | number {
    const result = normalizeOptionalMenuPrice(value);
    return result.success && Boolean(result.data);
}

export function getActivePublicItemPriceAttributes(item: unknown): ActivePublicItemPriceAttribute[] {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const attributes = (item as { attributes?: unknown }).attributes;
    if (!Array.isArray(attributes)) return [];

    return attributes.filter((attribute): attribute is ActivePublicItemPriceAttribute => (
        Boolean(attribute)
        && typeof attribute === 'object'
        && !Array.isArray(attribute)
        && (attribute as ActivePublicItemPriceAttribute).active !== false
        && hasDisplayPrice((attribute as ActivePublicItemPriceAttribute).price)
    ));
}

export function hasPublicItemDisplayPrice(item: unknown): boolean {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const itemRecord = item as { price?: unknown };
    return hasDisplayPrice(itemRecord.price) || getActivePublicItemPriceAttributes(item).length > 0;
}

export function getPublicItemListPriceLabel(
    item: unknown,
    currencySymbol = '₹',
): string | null {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const itemRecord = item as { price?: unknown };
    const pricedAttributes = getActivePublicItemPriceAttributes(item);

    if (pricedAttributes.length === 0) {
        return hasDisplayPrice(itemRecord.price)
            ? formatMenuPrice(itemRecord.price, currencySymbol, { fractionDigits: 2 })
            : null;
    }

    const numericPrices = pricedAttributes.map((attribute) => (
        parseSingleMenuPrice(attribute.price as string | number)
    ));
    if (numericPrices.every((price): price is number => price !== null)) {
        const minPrice = Math.min(...numericPrices);
        const maxPrice = Math.max(...numericPrices);
        const minLabel = formatMenuPrice(minPrice, currencySymbol, { fractionDigits: 2 });
        if (minPrice === maxPrice) return minLabel;
        return `${minLabel}–${formatMenuPrice(maxPrice, currencySymbol, { fractionDigits: 2 })}`;
    }

    const distinctLabels = Array.from(new Set(
        pricedAttributes.map((attribute) => (
            formatMenuPrice(attribute.price as string | number, currencySymbol, { fractionDigits: 2 })
        )),
    ));
    return distinctLabels.slice(0, 2).join(' / ') || null;
}

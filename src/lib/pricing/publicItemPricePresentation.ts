import { formatMenuPrice, parseSingleMenuPrice } from './formatMenuPrice';
import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

export type ActivePublicItemPriceAttribute = {
    active?: boolean;
    id?: unknown;
    name?: unknown;
    price: string | number;
};

function hasDisplayPrice(value: unknown): value is string | number {
    const result = normalizeOptionalMenuPrice(value);
    return result.success && Boolean(result.data);
}

function readOwnValue(record: object, key: PropertyKey): unknown {
    try {
        return Object.prototype.hasOwnProperty.call(record, key)
            ? Reflect.get(record, key)
            : undefined;
    } catch {
        return undefined;
    }
}

export function getActivePublicItemPriceAttributes(item: unknown): ActivePublicItemPriceAttribute[] {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const attributes = readOwnValue(item, 'attributes');
    if (!Array.isArray(attributes)) return [];

    const activeAttributes: ActivePublicItemPriceAttribute[] = [];
    try {
        for (const attribute of attributes) {
            if (!attribute || typeof attribute !== 'object' || Array.isArray(attribute)) continue;
            const active = readOwnValue(attribute, 'active');
            const price = readOwnValue(attribute, 'price');
            if (
                active !== false
                && hasDisplayPrice(price)
            ) {
                activeAttributes.push({
                    ...(typeof active === 'boolean' ? { active } : {}),
                    id: readOwnValue(attribute, 'id'),
                    name: readOwnValue(attribute, 'name'),
                    price,
                });
            }
        }
    } catch {
        return [];
    }
    return activeAttributes;
}

export function hasPublicItemDisplayPrice(item: unknown): boolean {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    return hasDisplayPrice(readOwnValue(item, 'price'))
        || getActivePublicItemPriceAttributes(item).length > 0;
}

export function getPublicItemListPriceLabel(
    item: unknown,
    currencySymbol = '₹',
): string | null {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const itemPrice = readOwnValue(item, 'price');
    const pricedAttributes = getActivePublicItemPriceAttributes(item);

    if (pricedAttributes.length === 0) {
        return hasDisplayPrice(itemPrice)
            ? formatMenuPrice(itemPrice, currencySymbol, { fractionDigits: 2 })
            : null;
    }

    const numericPrices = pricedAttributes.map((attribute) => (
        parseSingleMenuPrice(readOwnValue(attribute, 'price') as string | number)
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
            formatMenuPrice(
                readOwnValue(attribute, 'price') as string | number,
                currencySymbol,
                { fractionDigits: 2 },
            )
        )),
    ));
    return distinctLabels.slice(0, 2).join(' / ') || null;
}

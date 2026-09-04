import { formatMenuPrice, parseSingleMenuPrice } from './formatMenuPrice';
import { PUBLIC_MENU_DRAFT_DATA_LIMITS } from '@data/shared/publicMenuDraftData';
import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';

export type ActivePublicItemPriceAttribute = {
    active?: boolean;
    id?: unknown;
    name?: unknown;
    price: string | number;
};

export type PublicItemDisplayOption = {
    id?: unknown;
    name: string;
    priceLabel?: string;
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

/**
 * Projects every active, named item option into the same localized display
 * truth used by customer-facing and printable surfaces. An option remains
 * useful even when it has no separate price, so this deliberately does not
 * reuse the priced-option-only helper above.
 */
export function getPublicItemDisplayOptions(
    item: unknown,
    language = 'en',
    currencySymbol = '₹',
): PublicItemDisplayOption[] {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const attributes = readOwnValue(item, 'attributes');
    if (!Array.isArray(attributes)) return [];

    const options: PublicItemDisplayOption[] = [];
    try {
        const optionSnapshot = Array.from(attributes)
            .slice(0, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ATTRIBUTES_PER_ITEM);
        for (const attribute of optionSnapshot) {
            if (!attribute || typeof attribute !== 'object' || Array.isArray(attribute)) continue;
            if (readOwnValue(attribute, 'active') === false) continue;

            const rawName = readOwnValue(attribute, 'name');
            const name = getLocalizedText(
                rawName,
                language,
                getPrimaryLocalizedLanguage(rawName, language || 'en'),
                '',
            );
            if (!name) continue;

            const rawPrice = readOwnValue(attribute, 'price');
            const priceLabel = hasDisplayPrice(rawPrice)
                ? formatMenuPrice(rawPrice, currencySymbol, { fractionDigits: 2 })
                : undefined;
            options.push({
                id: readOwnValue(attribute, 'id'),
                name,
                ...(priceLabel ? { priceLabel } : {}),
            });
        }
    } catch {
        return [];
    }
    return options;
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

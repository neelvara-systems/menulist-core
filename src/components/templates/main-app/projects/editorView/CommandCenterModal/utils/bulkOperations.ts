/**
 * Bulk Operations — Pure utility functions for Menu Command Center
 *
 * All functions are pure (no side effects). They operate on deep-cloned Project data
 * and return new Project objects. No Firebase calls happen here.
 *
 * @see __docs__/menu-command-center/menu-command-center_impl.md
 */

import type { InheritanceState } from '@type/multiOutlet.types';
import { parseSingleMenuPrice } from '@lib/pricing/formatMenuPrice';
import { removeObjRef } from '@util/utils';
import type {
    Project
} from '../../../types';
import type {
    ActiveInactivePreview,
    ActiveInactiveTarget,
    AvailabilityPreview,
    AvailabilityTarget,
    ImpactSummary,
    MoveCategoryPreview,
    PriceChangePreview,
    PricingConfig,
    SelectedItemInfo,
    SelectionSummary,
} from '../../../types/commandCenter.types';
import { PRICING_GUARDRAILS, PRICING_WARNINGS } from '../../../types/commandCenter.types';

// ═══════════════════════════════════════════════════════════
// SELECTION BUILDERS
// ═══════════════════════════════════════════════════════════

export function buildSelectableItems(
    project: Project,
    activeLang: string,
    itemStates?: Record<string, InheritanceState>,
    isMasterLinked?: boolean
): SelectedItemInfo[] {
    const items: SelectedItemInfo[] = [];

    project.files?.forEach((file) => {
        if (!file.extractedData?.data) return;
        const categories = file.extractedData.data.categories || [];
        const catMap: Record<string, string> = {};
        const catActiveMap: Record<string, boolean> = {};
        categories.forEach((cat) => {
            catMap[cat.id] = cat.name?.[activeLang] || cat.name?.['en'] || 'Untitled';
            catActiveMap[cat.id] = cat.active !== false;
        });

        file.extractedData.data.items?.forEach((item) => {
            const isLocked = !!(isMasterLinked && itemStates?.[item.id] === 'inherited');
            const categoryActive = catActiveMap[item.category] !== false;
            items.push({
                id: item.id,
                name: item.name?.[activeLang] || item.name?.['en'] || 'Untitled',
                price: String(item.price ?? ''),
                category: item.category,
                categoryName: catMap[item.category] || 'Uncategorized',
                fileUid: file.uid,
                active: (item.active !== false) && categoryActive,
                available: item.available !== false,
                isLocked,
                attributes: item.attributes?.map((attr) => ({
                    id: attr.id,
                    name: attr.name?.[activeLang] || attr.name?.['en'] || 'Variant',
                    price: String(attr.price ?? ''),
                })),
            });
        });
    });

    return items;
}

export function buildSelectionSummary(
    selectedItems: SelectedItemInfo[],
    isMasterLinked: boolean,
    storeName?: string
): SelectionSummary {
    const categories = Array.from(new Set(selectedItems.map((i) => i.categoryName)));
    const editable = selectedItems.filter((i) => !i.isLocked);
    const locked = selectedItems.filter((i) => i.isLocked);
    const active = selectedItems.filter((i) => i.active);
    const inactive = selectedItems.filter((i) => !i.active);

    return {
        totalSelected: selectedItems.length,
        editableCount: editable.length,
        lockedCount: locked.length,
        activeCount: active.length,
        inactiveCount: inactive.length,
        categories,
        outletName: isMasterLinked ? (storeName || 'Outlet') : 'Master menu',
        isMasterMenu: !isMasterLinked,
    };
}

export function getAllCategories(
    project: Project,
    activeLang: string
): Array<{ id: string; name: string; fileUid: string; itemCount: number }> {
    const categories: Array<{ id: string; name: string; fileUid: string; itemCount: number }> = [];
    const seen = new Set<string>();

    project.files?.forEach((file) => {
        if (!file.extractedData?.data) return;
        file.extractedData.data.categories?.forEach((cat) => {
            if (seen.has(cat.id)) return;
            seen.add(cat.id);
            const itemCount = file.extractedData?.data?.items?.filter(
                (i) => i.category === cat.id
            ).length || 0;
            categories.push({
                id: cat.id,
                name: cat.name?.[activeLang] || cat.name?.['en'] || 'Untitled',
                fileUid: file.uid,
                itemCount,
            });
        });
    });

    return categories;
}

// ═══════════════════════════════════════════════════════════
// PRICING OPERATIONS
// ═══════════════════════════════════════════════════════════

export function roundPrice(price: number): number {
    return Math.round(price);
}

export function calculateNewPrice(currentPrice: number, config: PricingConfig): number {
    let newPrice: number;

    switch (config.method) {
        case 'increasePercent':
            newPrice = currentPrice * (1 + config.value / 100);
            break;
        case 'decreasePercent':
            newPrice = currentPrice * (1 - config.value / 100);
            break;
        case 'addFlat':
            newPrice = currentPrice + config.value;
            break;
        case 'reduceFlat':
            newPrice = currentPrice - config.value;
            break;
        case 'setFixed':
            newPrice = config.value;
            break;
        default:
            newPrice = currentPrice;
    }

    if (newPrice < PRICING_GUARDRAILS.MIN_PRICE) {
        newPrice = PRICING_GUARDRAILS.MIN_PRICE;
    }

    return roundPrice(newPrice);
}

export function validatePricingConfig(config: PricingConfig): {
    valid: boolean;
    error?: string;
} {
    if (!config.value || config.value <= 0) {
        return { valid: false, error: 'Please enter a value greater than 0.' };
    }

    if (config.method === 'increasePercent' && config.value > PRICING_GUARDRAILS.MAX_INCREASE_PERCENT) {
        return { valid: false, error: `Increase cannot exceed ${PRICING_GUARDRAILS.MAX_INCREASE_PERCENT}%.` };
    }

    if (config.method === 'decreasePercent' && config.value > PRICING_GUARDRAILS.MAX_DECREASE_PERCENT) {
        return { valid: false, error: `Decrease cannot exceed ${PRICING_GUARDRAILS.MAX_DECREASE_PERCENT}%.` };
    }

    if (config.method === 'setFixed' && config.value < PRICING_GUARDRAILS.MIN_PRICE) {
        return { valid: false, error: `Price must be at least ${PRICING_GUARDRAILS.MIN_PRICE}.` };
    }

    return { valid: true };
}

export function computePricingPreview(
    selectedItems: SelectedItemInfo[],
    config: PricingConfig
): ImpactSummary {
    const editableItems = selectedItems.filter((i) => !i.isLocked);
    const changes: PriceChangePreview[] = [];
    const warnings: string[] = [];
    let skipped = 0;

    editableItems.forEach((item) => {
        const currentPrice = parseSingleMenuPrice(item.price);
        const canForceFixedPrice = config.method === 'setFixed';
        if (!canForceFixedPrice && (currentPrice === null || currentPrice <= 0)) {
            skipped++;
            return;
        }

        const safeCurrentPrice = currentPrice === null || currentPrice < 0 ? 0 : currentPrice;
        const newPrice = calculateNewPrice(safeCurrentPrice, config);
        const changePercent = safeCurrentPrice > 0
            ? ((newPrice - safeCurrentPrice) / safeCurrentPrice) * 100
            : 0;

        changes.push({
            itemId: item.id,
            itemName: item.name,
            categoryName: item.categoryName,
            oldPrice: safeCurrentPrice,
            newPrice,
            changePercent,
        });

        // Also compute attribute price changes
        item.attributes?.forEach((attr) => {
            const attrPrice = parseSingleMenuPrice(attr.price);
            if (!canForceFixedPrice && (attrPrice === null || attrPrice <= 0)) return;
            const safeAttrPrice = attrPrice === null || attrPrice < 0 ? 0 : attrPrice;
            const newAttrPrice = calculateNewPrice(safeAttrPrice, config);
            changes.push({
                itemId: item.id,
                itemName: item.name,
                categoryName: item.categoryName,
                oldPrice: safeAttrPrice,
                newPrice: newAttrPrice,
                changePercent: safeAttrPrice > 0 ? ((newAttrPrice - safeAttrPrice) / safeAttrPrice) * 100 : 0,
                isAttribute: true,
                attributeName: attr.name,
            });
        });
    });

    // Compute averages (items only, not attributes)
    const itemChanges = changes.filter((c) => !c.isAttribute);
    const avgBefore = itemChanges.length > 0
        ? itemChanges.reduce((s, c) => s + c.oldPrice, 0) / itemChanges.length
        : 0;
    const avgAfter = itemChanges.length > 0
        ? itemChanges.reduce((s, c) => s + c.newPrice, 0) / itemChanges.length
        : 0;
    const netChange = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0;

    // Warnings
    if (config.method === 'increasePercent' && config.value > PRICING_WARNINGS.LARGE_INCREASE_THRESHOLD) {
        warnings.push(`Large increase detected (+${config.value}%). Please verify.`);
    }
    if (config.method === 'decreasePercent' && config.value > PRICING_WARNINGS.LARGE_DECREASE_THRESHOLD) {
        warnings.push(`Large decrease detected (-${config.value}%). Please verify.`);
    }
    if (selectedItems.filter((i) => i.isLocked).length > 0) {
        warnings.push(`${selectedItems.filter((i) => i.isLocked).length} locked items excluded.`);
    }
    if (skipped > 0) {
        warnings.push(`${skipped} items skipped (no price set).`);
    }

    return {
        itemsAffected: itemChanges.length,
        itemsSkipped: skipped + selectedItems.filter((i) => i.isLocked).length,
        avgPriceBefore: roundPrice(avgBefore),
        avgPriceAfter: roundPrice(avgAfter),
        netChangePercent: Math.round(netChange * 10) / 10,
        allChanges: changes, // Return all changes instead of sample
        warnings,
    };
}

export function applyBulkPricing(
    project: Project,
    selectedItemIds: Set<string>,
    config: PricingConfig
): Project {
    const updated: Project = removeObjRef(project);

    updated.files?.forEach((file) => {
        if (!file.extractedData?.data?.items) return;

        file.extractedData.data.items = file.extractedData.data.items.map((item) => {
            if (!selectedItemIds.has(item.id)) return item;

            const currentPrice = parseSingleMenuPrice(item.price);
            const canForceFixedPrice = config.method === 'setFixed';
            if (!canForceFixedPrice && (currentPrice === null || currentPrice <= 0)) return item;

            const safeCurrentPrice = currentPrice === null || currentPrice < 0 ? 0 : currentPrice;
            const newPrice = calculateNewPrice(safeCurrentPrice, config);
            const updatedItem = { ...item, price: String(newPrice) };

            // Also update attribute prices
            if (updatedItem.attributes) {
                updatedItem.attributes = updatedItem.attributes.map((attr) => {
                    const attrPrice = parseSingleMenuPrice(attr.price);
                    if (!canForceFixedPrice && (attrPrice === null || attrPrice <= 0)) return attr;
                    const safeAttrPrice = attrPrice === null || attrPrice < 0 ? 0 : attrPrice;
                    const newAttrPrice = calculateNewPrice(safeAttrPrice, config);
                    return { ...attr, price: String(newAttrPrice) };
                });
            }

            return updatedItem;
        });
    });

    return updated;
}

// ═══════════════════════════════════════════════════════════
// AVAILABILITY OPERATIONS
// ═══════════════════════════════════════════════════════════

export function computeAvailabilityPreview(
    selectedItems: SelectedItemInfo[],
    target: AvailabilityTarget
): AvailabilityPreview {
    const editableItems = selectedItems.filter((i) => !i.isLocked);
    const targetBool = target === 'available';
    const alreadyInState = editableItems.filter((i) => i.available === targetBool).length;

    return {
        itemsToChange: editableItems.length - alreadyInState,
        itemsAlreadyInState: alreadyInState,
    };
}

export function applyBulkAvailability(
    project: Project,
    selectedItemIds: Set<string>,
    target: AvailabilityTarget
): Project {
    const updated: Project = removeObjRef(project);
    const targetBool = target === 'available';

    updated.files?.forEach((file) => {
        if (!file.extractedData?.data?.items) return;

        file.extractedData.data.items = file.extractedData.data.items.map((item) => {
            if (!selectedItemIds.has(item.id)) return item;
            return { ...item, available: targetBool };
        });
    });

    return updated;
}

// ═══════════════════════════════════════════════════════════
// MOVE CATEGORY OPERATIONS
// ═══════════════════════════════════════════════════════════

export function computeMoveCategoryPreview(
    selectedItems: SelectedItemInfo[],
    destinationCategoryId: string,
    destinationCategoryName: string
): MoveCategoryPreview {
    const editableItems = selectedItems.filter((i) => !i.isLocked);
    const alreadyInDest = editableItems.filter((i) => i.category === destinationCategoryId).length;
    const sourceCategories = Array.from(new Set(editableItems.map((i) => i.categoryName)));

    return {
        itemsToMove: editableItems.length - alreadyInDest,
        sourceCategories,
        destinationCategory: destinationCategoryName,
    };
}

export function applyBulkMoveCategory(
    project: Project,
    selectedItemIds: Set<string>,
    destinationCategoryId: string
): Project {
    const updated: Project = removeObjRef(project);

    updated.files?.forEach((file) => {
        if (!file.extractedData?.data?.items) return;

        file.extractedData.data.items = file.extractedData.data.items.map((item) => {
            if (!selectedItemIds.has(item.id)) return item;
            if (item.category === destinationCategoryId) return item;
            return { ...item, category: destinationCategoryId };
        });
    });

    return updated;
}

// ═══════════════════════════════════════════════════════════
// ACTIVE/INACTIVE OPERATIONS (permanent show/hide)
// ═══════════════════════════════════════════════════════════

export function computeActiveInactivePreview(
    selectedItems: SelectedItemInfo[],
    target: ActiveInactiveTarget
): ActiveInactivePreview {
    const editableItems = selectedItems.filter((i) => !i.isLocked);
    const targetBool = target === 'show';
    const alreadyInState = editableItems.filter((i) => i.active === targetBool).length;

    return {
        itemsToChange: editableItems.length - alreadyInState,
        itemsAlreadyInState: alreadyInState,
    };
}

export function applyBulkActiveInactive(
    project: Project,
    selectedItemIds: Set<string>,
    target: ActiveInactiveTarget
): Project {
    const updated: Project = removeObjRef(project);
    const targetBool = target === 'show';
    const selectedCategoryIds = new Set<string>();

    updated.files?.forEach((file) => {
        if (!file.extractedData?.data?.items) return;

        file.extractedData.data.items = file.extractedData.data.items.map((item) => {
            if (!selectedItemIds.has(item.id)) return item;
            if (targetBool && item.category) {
                selectedCategoryIds.add(item.category);
            }
            return { ...item, active: targetBool };
        });
    });

    if (targetBool && selectedCategoryIds.size > 0) {
        updated.files?.forEach((file) => {
            if (!file.extractedData?.data?.categories) return;
            file.extractedData.data.categories = file.extractedData.data.categories.map((category) => {
                if (!selectedCategoryIds.has(category.id)) return category;
                return { ...category, active: true };
            });
        });
    }

    return updated;
}
